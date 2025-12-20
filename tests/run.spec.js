import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';

dotenv.config();

// --- BROWSER KONFIGURATION ---
test.use({
    viewport: { width: 1920, height: 1080 }, // Großer Bildschirm
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    video: 'on-first-retry', // Video aufnehmen bei Fehler
});

// E-Mail Transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com', // Fallback, falls Variable fehlt
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

test('Berichtsheft Automatisierung', async ({ page }) => {
    // 1. ZEITLIMIT ERHÖHEN (WICHTIG!)
    test.setTimeout(120 * 1000); // 2 Minuten Zeit geben

    const unitsuser = process.env.UNITSUSER || ''; 
    const unitspass = process.env.UNITSPASS || '';
    const ihk = process.env.IHKUSER || '';
    const ihkpass = process.env.IHKPASS || '';
    const ausbildermail = process.env.AUSBILDERMAIL || '';
    const abteilung = process.env.ABTEILUNG || '';
    const emailTo = process.env.EMAIL_TO || '';
    
    let EVP_val = '', DE_val = '', STDM_val = '', Kryp_val = '', GID_val = '', EN_val = '', EVP2_val = '';
    let finalInhalt = '';
    let testStatus = 'ERFOLGREICH';
    let errorMessage = '';
    let emptySubjectsWarnings = [];

    // Hilfsfunktion: Fenster sicher schließen
    async function safeClose() {
        try {
            // Versuche Close Button zu finden
            const closeBtn = page.getByRole('button', { name: 'Close' });
            if (await closeBtn.isVisible({ timeout: 2000 })) {
                await closeBtn.click();
            } else {
                // Fallback: Manchmal heißt der Button "Schließen" oder ist ein X icon
                await page.keyboard.press('Escape');
            }
        } catch (e) {
            console.log("Fenster schließen übersprungen.");
        }
    }

    try {
        console.log("--- Start: WebUntis Login ---");
        
        // --- LOGIN FIX FÜR GITHUB ACTIONS ---
        await page.goto('https://webuntis.com/#/basic/login');
        
        // Warte kurz, bis die Seite "da" ist
        await page.waitForLoadState('networkidle');

        // Cookie Banner wegklicken (falls vorhanden)
        try {
            await page.getByRole('button', { name: 'Alles akzeptieren' }).click({ timeout: 3000 });
        } catch (e) { /* Kein Banner, egal */ }

        console.log("Suche Schule...");
        
        // Statt auf Text zu klicken, direkt das Eingabefeld suchen
        // Wir suchen das Feld generischer, das ist stabiler
        const searchInput = page.getByRole('combobox'); 
        await searchInput.first().waitFor({ state: 'visible', timeout: 10000 });
        await searchInput.first().fill('Ludwig-Erhard-Berufskolleg Münster');
        await page.waitForTimeout(1000); // Kurz warten für Dropdown
        await page.keyboard.press('Enter');

        console.log("Schule gewählt. Login Daten eingeben...");

        // Weiter zum Login
        await page.waitForURL(/.*school=le-bk-muenster.*/, { timeout: 20000 });
        
        // Login Formular
        await page.getByRole('textbox', { name: 'Benutzername' }).fill(unitsuser); 
        await page.getByRole('textbox', { name: 'Passwort' }).fill(unitspass);
        await page.getByRole('button', { name: 'Login' }).click();
        
        console.log("Login Klick ausgeführt.");

        // --- Stundenplan ---
        // Warte bis Dashboard geladen ist
        await page.waitForURL(/.*today.*/, { timeout: 30000 });
        console.log("Dashboard geladen.");

        await page.getByRole('link', { name: 'Mein Stundenplan' }).click();
        
        // Manchmal muss man zwei mal klicken oder warten
        await page.waitForTimeout(2000);
        
        await page.getByTestId('date-picker-with-arrows-previous').click(); 
        
        // Sicherstellen, dass wir wirklich im Stundenplan sind
        await page.waitForLoadState('networkidle');

        // Warte EXTREM geduldig auf die erste Karte (bis zu 45s)
        console.log("Warte auf Stundenplan-Karten...");
        await page.getByTestId('lesson-card-row').first().waitFor({ state: 'visible', timeout: 45000 }); 
        
        // --- Fächer Logik (Unverändert aber mit Timeout Schutz) ---
        
        // EVP (Montag)
        try {
            await page.getByTestId('lesson-card-row').nth(2).click({ timeout: 5000 });
            EVP_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!EVP_val.trim()) EVP_val = 'KEIN INHALT BEI FACH EVP';
        } catch (error) { EVP_val = 'KEIN INHALT BEI FACH EVP (Fehler)'; }
        await safeClose();

        // DEUTSCH
        try {
            await page.getByText('D', { exact: true }).click({ timeout: 5000 }); 
            DE_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!DE_val.trim()) DE_val = 'KEIN INHALT BEI FACH DEUTSCH';
        } catch (error) { DE_val = 'KEIN INHALT BEI FACH DEUTSCH (Fehler)'; }
        await safeClose();

        // STDM
        try {
            await page.locator('div').filter({ hasText: /^STDM$/ }).first().click({ timeout: 5000 });
            STDM_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!STDM_val.trim()) STDM_val = 'KEIN INHALT BEI FACH STDM';
        } catch (error) { STDM_val = 'KEIN INHALT BEI FACH STDM (Fehler)'; }
        await safeClose();

        // KRYPTOLOGIE
        try {
            await page.locator('[data-testid="lesson-card-subject"]', { hasText: 'D-KRYPT' }).click({ timeout: 5000 });
            Kryp_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!Kryp_val.trim()) Kryp_val = 'KEIN INHALT BEI FACH KRYPTOLOGIE';
        } catch (error) { Kryp_val = 'KEIN INHALT BEI FACH KRYPTOLOGIE (Fehler)'; }
        await safeClose();

        // GID (Freitag)
        try {
            await page.locator('div').filter({ hasText: /^GID$/ }).first().click({ timeout: 5000 });
            GID_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!GID_val.trim()) GID_val = 'KEIN INHALT BEI FACH GID';
        } catch (error) { GID_val = 'KEIN INHALT BEI FACH GID (Fehler)'; }
        await safeClose();

        // ENGLISCH
        try {
            await page.getByText('E', { exact: true }).click({ timeout: 5000 });
            EN_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!EN_val.trim()) EN_val = 'KEIN INHALT BEI FACH ENGLISCH';
        } catch (error) { EN_val = 'KEIN INHALT BEI FACH ENGLISCH (Fehler)'; }
        await safeClose();

        // EVP2
        try {
            await page.locator('div').filter({ hasText: /^EVP$/ }).nth(3).click({ timeout: 5000 });
            EVP2_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!EVP2_val.trim()) EVP2_val = 'KEIN INHALT BEI FACH EVP';
        } catch (error) { EVP2_val = 'KEIN INHALT BEI FACH EVP (Fehler)'; }
        await safeClose();


        // --- ZUSAMMENFASSUNG ---
        finalInhalt = 
            `Montag:\n` +
            `Entwicklung Vernetzter Prozesse:\n${EVP_val}\n` +
            `\nDeutsch:\n${DE_val}\n` +
            `\nSoftwaretechnologie und Datenmanagement:\n${STDM_val}\n` +
            `\nKryptologie:\n${Kryp_val}\n\n` +
            `Freitag:\n` +
            `\nGestaltung IT Dienstleistungen:\n${GID_val}\n` +
            `\nEnglisch:\n${EN_val}\n` +
            `\nEntwicklung Vernetzter Prozesse:\n${EVP2_val}`;
        
        console.log("Inhalt generiert.");

        // --- IHK Eintrag ---
        console.log("Start: IHK Login");
        await page.goto('https://www.bildung-ihk-nordwestfalen.de/tibrosBB/BB_auszubildende.jsp');
        await page.getByRole('textbox', { name: 'Azubinummer' }).fill(ihk);
        await page.getByRole('textbox', { name: 'Passwort' }).fill(ihkpass);
        await page.getByRole('button', { name: 'Login' }).click();
        
        await page.getByRole('link', { name: 'Ausbildungsnachweise', exact: true }).click();
        await page.getByRole('button', { name: 'Neuer Eintrag' }).first().click();
        
        // Formular füllen
        await page.getByRole('textbox').nth(2).fill(abteilung);
        await page.locator('input[name="ausbMail"]').fill(ausbildermail);
        await page.locator('input[name="ausbMail2"]').fill(ausbildermail);
        
        await page.locator('textarea[name="ausbinhalt3"]').click();
        await page.locator('textarea[name="ausbinhalt3"]').fill(finalInhalt); 
        
        // await page.getByRole('button', { name: 'Speichern', exact: true }).click();
        console.log("IHK fertig.");

    } catch (error) {
        testStatus = 'FEHLGESCHLAGEN';
        errorMessage = error.message;
        console.error("Test abgebrochen:", error);
    } finally {
        
        // --- MAIL SENDEN ---
        const allVals = [EVP_val, DE_val, STDM_val, Kryp_val, GID_val, EN_val, EVP2_val];
        const subjects = ["EVP (Mo)", "Deutsch", "STDM", "Kryptologie", "GID", "Englisch", "EVP (Fr)"];
        
        allVals.forEach((val, index) => {
            if (val && (val.includes('KEIN INHALT') || val.includes('Fehler'))) {
                emptySubjectsWarnings.push(subjects[index]);
            }
        });

        let statusColor = testStatus === 'ERFOLGREICH' ? '#28a745' : '#dc3545';
        let htmlBody = `<div style="font-family: Arial; padding: 20px;">
            <h2 style="color: ${statusColor};">Status: ${testStatus}</h2>`;

        if (testStatus === 'FEHLGESCHLAGEN') {
            htmlBody += `<p style="color: red; background: #fee;">❌ Fehler: ${errorMessage}</p>`;
        }
        if (emptySubjectsWarnings.length > 0) {
            htmlBody += `<p style="color: orange;">⚠️ Probleme/Leer: ${emptySubjectsWarnings.join(', ')}</p>`;
        }
        if (finalInhalt) {
            htmlBody += `<pre style="background: #eee; padding: 10px;">${finalInhalt}</pre>`;
        }
        htmlBody += `</div>`;

        console.log("Sende Mail an:", emailTo);
        
        // Schutz gegen fehlenden Host
        if (!process.env.EMAIL_HOST) {
            console.error("FEHLER: EMAIL_HOST Secret fehlt in GitHub Actions!");
        } else {
            try {
                await transporter.sendMail({
                    from: `"Berichtsheft Bot" <${process.env.EMAIL_USER}>`,
                    to: emailTo,
                    subject: `Berichtsheft: ${testStatus}`,
                    html: htmlBody,
                });
                console.log("Mail gesendet.");
            } catch (e) {
                console.error("Mail konnte nicht gesendet werden:", e);
            }
        }

        if (testStatus === 'FEHLGESCHLAGEN') {
            throw new Error(`Test fehlgeschlagen: ${errorMessage}`);
        }
    }
});