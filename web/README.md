# Berichtsheft – Web-Dashboard

Natives iOS-Look Dashboard für [AutoBerichtsheft](../README.md), gebaut mit Next.js
und gedacht für ein Deployment auf [Vercel](https://vercel.com). Löst das alte,
unsichere GitHub-Pages-Frontend (`../docs/`) ab, bei dem GitHub- und Gemini-Tokens
im Browser-`localStorage` lagen.

## Warum ein Rewrite?

Das alte Dashboard lief als reine statische Seite: Der Nutzer trug seinen
GitHub Personal Access Token und Gemini API Key direkt im Browser ein, von wo
aus sie bei jedem Request offen im `Authorization`-Header bzw. in der URL
verschickt wurden. Wer Zugriff auf den Browser (oder eine XSS-Lücke) hatte,
hatte damit vollen Schreibzugriff auf das GitHub-Repo.

Diese App verschiebt alle Geheimnisse auf den Server:

- **Keine Tokens im Browser.** GitHub-, Firebase- und Gemini-Zugriffe laufen
  über Next.js API-Routes (`app/api/**`), die Secrets ausschließlich aus
  Vercel Environment Variables lesen.
- **Passwort-Gate statt Token-Eingabe.** Ein App-Passwort schützt die App per
  signiertem, 30 Tage gültigem Session-Cookie (siehe `middleware.ts`), damit
  sie öffentlich auf Vercel erreichbar sein kann, ohne dass jeder Besucher
  Aktionen auslösen kann. Das Passwort liegt nur als **scrypt-Hash** in
  Firebase (`auth/passwordHash`); `APP_PASSWORD` aus den Environment Variables
  dient lediglich als Erst-Passwort und wird beim ersten erfolgreichen Login
  automatisch als Hash migriert. Ändern lässt es sich in den Einstellungen
  („Sicherheit" → Passwort ändern) – einsehen kann man es nirgends.
- **Secrets ändern = Vercel Dashboard, nicht die App.** Rotation von Tokens
  gehört in die Vercel-Projekteinstellungen (verschlüsselt, versioniert,
  auditierbar) statt in ein In-App-Formular, das wieder Secrets durch den
  Browser schicken müsste.

## Funktionsumfang (Feature-Parität zum alten Dashboard)

- Live-Status der GitHub-Actions-Workflows (Scrape / Upload) inkl. Job-Steps
- Berichts-Archiv mit Krank-Toggle, KI-Korrektur (Gemini) pro Fach und für die
  betrieblichen Tätigkeiten, IHK-Upload-Trigger
- "Neue Woche holen"-Trigger mit optionalem Zieldatum

## Neue Features

- **Installierbar wie eine native App**: Manifest + generierte Icons, per
  "Zum Home-Bildschirm hinzufügen" auf iOS wie eine echte App nutzbar.
- **Serien-Anzeige ("Streak")**: zeigt, wie viele Wochen am Stück lückenlos
  eingetragen wurden – kleiner Motivationsschub im Dashboard.
- **Wöchentlicher Digest per Mail** (`app/api/cron/weekly-digest`, per Vercel
  Cron): freiwillige, in den Einstellungen aktivierbare Zusammenfassung
  ("X Wochen Serie, Y ausstehend"). Ergänzt den bestehenden
  "fehlende Berichte"-Alarm aus `tests/check_missing_reports.spec.ts`,
  der unverändert und unabhängig davon weiterläuft.
- **Passwortgeschützter Zugriff**, damit die App gefahrlos öffentlich auf
  Vercel gehostet werden kann.

## Deployment auf Vercel

1. Repository zu GitHub pushen (falls noch nicht geschehen).
2. In Vercel: "Add New… → Project" → dieses Repo auswählen.
3. **Root Directory auf `web` setzen** (wichtig – sonst versucht Vercel das
   Playwright-Projekt im Repo-Root zu bauen).
4. Environment Variables eintragen (siehe `.env.example` in diesem Ordner):
   `APP_PASSWORD`, `GITHUB_TOKEN`, `GITHUB_USER`, `GITHUB_REPO`,
   `FIREBASE_URL`, `FIREBASE_SECRET`, optional `GEMINI_API_KEY`,
   `EMAIL_HOST`/`EMAIL_PORT`/`EMAIL_USER`/`EMAIL_PASS`, `CRON_SECRET`.
5. Deploy. Der Cron-Job für den Wochen-Digest wird automatisch über
   `vercel.json` eingerichtet.

### GitHub Token Rechte

Ein Fine-grained PAT auf genau dieses Repo mit:

- **Actions**: Read & Write (für `workflow_dispatch` und `repository_dispatch`)
- **Contents**: Read

reicht aus.

## Lokale Entwicklung

```bash
cd web
npm install
cp .env.example .env.local   # Werte eintragen
npm run dev
```

## Ordnerstruktur

```
web/
  app/                  App Router: Seiten + API-Routes
    api/                Serverseitige Proxys zu GitHub/Firebase/Gemini/E-Mail
    report/[id]/        Berichts-Editor
    settings/           Integrationsstatus + Digest-Einstellungen
  components/           UI-Bausteine im iOS-Stil
  lib/                  Server- und Client-Hilfsfunktionen
```
