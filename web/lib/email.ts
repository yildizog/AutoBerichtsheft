import nodemailer from 'nodemailer';

// Nutzt bewusst dieselben EMAIL_* Variablen wie tests/check_missing_reports.spec.ts,
// damit nur ein SMTP-Zugang gepflegt werden muss. Diese Datei ist komplett neu und
// unabhängig von der Playwright-Testdatei (die bleibt unverändert).
export function isEmailConfigured() {
  return Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '465', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error('E-Mail ist nicht konfiguriert (EMAIL_HOST/EMAIL_USER/EMAIL_PASS fehlen).');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Berichtsheft Bot" <${user}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}
