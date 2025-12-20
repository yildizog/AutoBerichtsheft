import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';

dotenv.config();

// --- BROWSER KONFIGURATION ---
test.use({
    viewport: { width: 1920, height: 1080 },
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    video: 'on-first-retry',
});

// E-Mail Transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

test('Berichtsheft Automatisierung', async ({ page }) => {
    // -----------------------------------------------------------
    // WICHTIG: Zeitlimit auf 5 Minuten (300 Sekunden) setzen!
    // Dein letzter Fehler war "120000ms exceeded" (2 Minuten).
    // -----------------------------------------------------------
    test.setTimeout(300 * 1000); 

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
            const closeBtn = page.getByRole('button', { name: 'Close' });
            if (await closeBtn.isVisible({ timeout: 2000 })) {
                await closeBtn.click();
            } else {
                await page.keyboard.press('Escape');
            }
        } catch (e) {
            console.log("Fenster schließen übersprungen.");
        }
    }

    try {
        console.log("--- Start: WebUntis Login ---");
        
        // --- DIREKTER LOGIN (Suche überspringen!) ---
        await page.goto('https://le-bk-muenster.webuntis.com/WebUntis/?school=le-bk-muenster#/basic/login');
        
        // Warten bis Seite geladen
        await page.waitForLoadState('domcontentloaded');

        // Cookie Banner wegklicken (falls vorhanden)
        try {
            const cookieBtn = page.getByRole('button', { name: 'Alles akzeptieren' });
            if (await cookieBtn.isVisible({ timeout: 5000 })) {
                await cookieBtn.click();
                console.log("Cookies akzeptiert.");
            }
        } catch (e) { /* Kein Banner */ }

        console.log("Warte auf Login-Felder...");
        const userField = page.getByRole('textbox', { name: 'Benutzername' });
        await userField.waitFor({ state: 'visible', timeout: 30000 });
        
        await userField.fill(unitsuser); 
        await page.getByRole('textbox', { name: 'Passwort' }).fill(unitspass);
        await page.getByRole('button', { name: 'Login' }).click();
        
        console.log("Login abgeschickt. Warte auf Dashboard...");

        // --- Stundenplan ---
        await page.getByRole('link', { name: 'Mein Stundenplan' }).first().waitFor({ state: 'visible', timeout: 30000 });
        await page.getByRole('link', { name: 'Mein Stundenplan' }).click();
        
        await page.waitForTimeout(3000); 
        await page.getByTestId('date-picker-with-arrows-previous').click(); 
        
        console.log("Woche gewechselt. Warte auf Karten...");
        await page.getByTestId('lesson-card-row').first().waitFor({ state: 'visible', timeout: 60000 }); 
        
        // --- Fächer Logik ---
        
        // EVP (Montag)
        try {
            await page.getByTestId('lesson-card-row').nth(2).click({ timeout: 5000 });
            await page.waitForTimeout(500);
            EVP_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!EVP_val.trim()) EVP_val = 'KEIN INHALT BEI FACH EVP';
        } catch (error) { EVP_val = 'KEIN INHALT BEI FACH EVP (Fehler/Timeout)'; }
        await safeClose();

        // DEUTSCH
        try {
            await page.getByText('D', { exact: true }).click({ timeout: 5000 }); 
            await page.waitForTimeout(500);
            DE_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!DE_val.trim()) DE_val = 'KEIN INHALT BEI FACH DEUTSCH';
        } catch (error) { DE_val = 'KEIN INHALT BEI FACH DEUTSCH (Fehler/Timeout)'; }
        await safeClose();

        // STDM
        try {
            await page.locator('div').filter({ hasText: /^STDM$/ }).first().click({ timeout: 5000 });
            await page.waitForTimeout(500);
            STDM_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!STDM_val.trim()) STDM_val = 'KEIN INHALT BEI FACH STDM';
        } catch (error) { STDM_val = 'KEIN INHALT BEI FACH STDM (Fehler/Timeout)'; }
        await safeClose();

        // KRYPTOLOGIE
        try {
            await page.locator('[data-testid="lesson-card-subject"]', { hasText: 'D-KRYPT' }).click({ timeout: 5000 });
            await page.waitForTimeout(500);
            Kryp_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!Kryp_val.trim()) Kryp_val = 'KEIN INHALT BEI FACH KRYPTOLOGIE';
        } catch (error) { Kryp_val = 'KEIN INHALT BEI FACH KRYPTOLOGIE (Fehler/Timeout)'; }
        await safeClose();

        // GID (Freitag)
        try {
            await page.locator('div').filter({ hasText: /^GID$/ }).first().click({ timeout: 5000 });
            await page.waitForTimeout(500);
            GID_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!GID_val.trim()) GID_val = 'KEIN INHALT BEI FACH GID';
        } catch (error) { GID_val = 'KEIN INHALT BEI FACH GID (Fehler/Timeout)'; }
        await safeClose();

        // ENGLISCH
        try {
            await page.getByText('E', { exact: true }).click({ timeout: 5000 });
            await page.waitForTimeout(500);
            EN_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!EN_val.trim()) EN_val = 'KEIN INHALT BEI FACH ENGLISCH';
        } catch (error) { EN_val = 'KEIN INHALT BEI FACH ENGLISCH (Fehler/Timeout)'; }
        await safeClose();

        // EVP2
        try {
            await page.locator('div').filter({ hasText: /^EVP$/ }).nth(3).click({ timeout: 5000 });
            await page.waitForTimeout(500);
            EVP2_val = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            if (!EVP2_val.trim()) EVP2_val = 'KEIN INHALT BEI FACH EVP';
        } catch (error) { EVP2_val = 'KEIN INHALT BEI FACH EVP (Fehler/Timeout)'; }
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
        
        const azubiInput = page.getByRole('textbox', { name: 'Azubinummer' });
        await azubiInput.waitFor({state: 'visible', timeout: 20000});
        
        await azubiInput.fill(ihk);
        await page.getByRole('textbox', { name: 'Passwort' }).fill(ihkpass);
        await page.getByRole('button', { name: 'Login' }).click();
        
        // IHK Navigation
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
        
        if (!process.env.EMAIL_HOST) {
            console.error("ACHTUNG: EMAIL_HOST Secret fehlt. E-Mail kann nicht gesendet werden.");
        } else {
            try {
                // Wir warten explizit auf den Versand
                await transporter.sendMail({
                    from: `"Berichtsheft Bot" <${process.env.EMAIL_USER}>`,
                    to: emailTo,
                    subject: `Berichtsheft: ${testStatus}`,
                    html: htmlBody,
                });
                console.log("Mail erfolgreich gesendet!");
            } catch (e) {
                console.error("Mail konnte nicht gesendet werden:", e);
            }
        }

        if (testStatus === 'FEHLGESCHLAGEN') {
            throw new Error(`Test fehlgeschlagen: ${errorMessage}`);
        }
    }
});