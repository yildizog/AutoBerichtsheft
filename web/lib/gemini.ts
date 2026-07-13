function getKey() {
  return process.env.GEMINI_API_KEY || '';
}

export function isGeminiConfigured() {
  return Boolean(getKey());
}

async function pickModel(key: string): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const list = await res.json();
  const model = list.models?.find(
    (m: { supportedGenerationMethods?: string[]; name?: string }) =>
      m.supportedGenerationMethods?.includes('generateContent') && !m.name?.includes('embedding')
  )?.name;
  return model || 'models/gemini-1.5-flash';
}

async function generate(key: string, prompt: string, forceJson: boolean): Promise<string> {
  const model = await pickModel(key);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      ...(forceJson ? { generationConfig: { response_mime_type: 'application/json' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Gemini-Anfrage fehlgeschlagen: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini hat keine Antwort geliefert.');
  return text;
}

export async function refineSchoolFields(fields: Record<string, string>): Promise<Record<string, string>> {
  const key = getKey();
  if (!key) throw new Error('Gemini ist nicht konfiguriert (GEMINI_API_KEY fehlt).');

  const raw = await generate(
    key,
    `Überarbeite professionell für IHK-Bericht (NUR JSON zurückgeben, gleiche Keys): ${JSON.stringify(fields)}`,
    true
  );
  return JSON.parse(raw.replace(/```json|```/g, ''));
}

export async function refineWorkActivities(text: string): Promise<string> {
  const key = getKey();
  if (!key) throw new Error('Gemini ist nicht konfiguriert (GEMINI_API_KEY fehlt).');

  const prompt = `Du bist ein erfahrener Ausbilder. Überarbeite die folgenden stichpunktartigen betrieblichen Tätigkeiten eines Auszubildenden für das IHK-Berichtsheft.
Formuliere sie professionell, präzise und im IHK-konformen Stil (Stichpunkte, sachlich, in der Vergangenheitsform oder als Nomenklatur, z.B. "Implementierung von...", "Fehlerbehebung bei...").
Gib NUR den überarbeiteten Text zurück, keine Erklärungen oder Einleitungen.

Tätigkeiten:
${text}`;

  const raw = await generate(key, prompt, false);
  return raw.trim();
}
