import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';

dotenv.config();

test.use({
    viewport: { width: 1920, height: 1080 }, // Full HD simulieren
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // Als echter Chrome tarnen
    locale: 'de-DE', // Deutsch erzwingen
    timezoneId: 'Europe/Berlin' // Deutsche Zeit erzwingen
});

// Konfiguration des E-Mail-Transporters (Globale Konfiguration)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: true, // true für Port 465, false für andere
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

test('Berichtsheft Automatisierung', async ({ page }) => {

    // --- Variablen Setup ---
    const unitsuser = process.env.UNITSUSER || ''; 
    const unitspass = process.env.UNITSPASS || '';
    const ihk = process.env.IHKUSER || '';
    const ihkpass = process.env.IHKPASS || '';
    const ausbildermail = process.env.AUSBILDERMAIL || '';
    const abteilung = process.env.ABTEILUNG || '';
    const emailTo = process.env.EMAIL_TO || '';
    
    // Speicher für die Inhalte
    let EVP_val = '', DE_val = '', STDM_val = '', Kryp_val = '', GID_val = '', EN_val = '', EVP2_val = '';
    let finalInhalt = '';
    
    // Status-Tracking für den Report
    let testStatus = 'ERFOLGREICH';
    let errorMessage = '';
    let emptySubjectsWarnings = []; // Hier sammeln wir die Fächer ohne Inhalt

    try {
        console.log("--- Start: WebUntis Login ---");

        // --- WebUntis Login ---
        await page.goto('https://webuntis.com/#/basic/login');
        await page.getByText('Search for School Name, City or Address').click();
        await page.getByRole('combobox').fill('Ludwig-Erhard-Berufskolleg Münster');
        await page.getByRole('combobox').press('Enter');
        await page.goto('https://le-bk-muenster.webuntis.com/WebUntis/?school=le-bk-muenster#/basic/login');
        await page.getByRole('textbox', { name: 'Benutzername' }).fill(unitsuser); 
        await page.getByRole('textbox', { name: 'Passwort' }).fill(unitspass);
        await page.getByRole('button', { name: 'Login' }).click();

        // --- Stundenplan Navigation ---
        await page.getByRole('link', { name: 'Mein Stundenplan' }).click();
        await page.getByTestId('date-picker-with-arrows-previous').click(); 
        await page.getByRole('link', { name: 'Mein Stundenplan' }).click(); 

        // Stabilisierung: Warten bis Karten geladen sind
        await page.getByTestId('lesson-card-row').first().waitFor({ state: 'visible', timeout: 45000 }); 
        
        // --- M O N T A G ---
        
        // EVP
        await page.getByTestId('lesson-card-row').nth(2).click();
        try {
            EVP_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
            if (!EVP_val.trim()) EVP_val = 'KEIN INHALT BEI FACH EVP';
        } catch (error) {
            console.log('Fehler/Timeout bei EVP');
            EVP_val = 'KEIN INHALT BEI FACH EVP (Skript-Timeout)';
        }
        await page.getByRole('button', { name: 'Close' }).click();

        // DEUTSCH
        await page.getByText('D', { exact: true }).click(); 
        try {
            DE_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
            if (!DE_val.trim()) DE_val = 'KEIN INHALT BEI FACH DEUTSCH';
        } catch (error) {
            console.log('Fehler/Timeout bei Deutsch');
            DE_val = 'KEIN INHALT BEI FACH DEUTSCH (Skript-Timeout)';
        }
        await page.getByRole('button', { name: 'Close' }).click();

        // STDM
        await page.locator('div').filter({ hasText: /^STDM$/ }).first().click();
        try {
            STDM_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
            if (!STDM_val.trim()) STDM_val = 'KEIN INHALT BEI FACH STDM';
        } catch (error) {
            console.log('Fehler/Timeout bei STDM');
            STDM_val = 'KEIN INHALT BEI FACH STDM (Skript-Timeout)';
        }
        await page.getByRole('button', { name: 'Close' }).click();

        // D-KRYPT
        await page.locator('[data-testid="lesson-card-subject"]', { hasText: 'D-KRYPT' }).click();
        try {
            Kryp_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
            if (!Kryp_val.trim()) Kryp_val = 'KEIN INHALT BEI FACH KRYPTOLOGIE';
        } catch (error) {
            console.log('Fehler/Timeout bei Kryptologie');
            Kryp_val = 'KEIN INHALT BEI FACH KRYPTOLOGIE (Skript-Timeout)';
        }
        await page.getByRole('button', { name: 'Close' }).click();


        // --- F R E I T A G ---
        
        // GID
        await page.locator('div').filter({ hasText: /^GID$/ }).first().click();
        try {
            GID_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
            if (!GID_val.trim()) GID_val = 'KEIN INHALT BEI FACH GID';
        } catch (error) {
            console.log('Fehler/Timeout bei GID');
            GID_val = 'KEIN INHALT BEI FACH GID (Skript-Timeout)';
        }
        await page.getByRole('button', { name: 'Close' }).click();

        // ENGLISCH
        await page.getByText('E', { exact: true }).click();
        try {
            EN_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
            if (!EN_val.trim()) EN_val = 'KEIN INHALT BEI FACH ENGLISCH';
        } catch (error) {
            console.log('Fehler/Timeout bei Englisch');
            EN_val = 'KEIN INHALT BEI FACH ENGLISCH (Skript-Timeout)';
        }
        await page.getByRole('button', { name: 'Close' }).click();

        // EVP2
        await page.locator('div').filter({ hasText: /^EVP$/ }).nth(3).click();
        try {
            EVP2_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
            if (!EVP2_val.trim()) EVP2_val = 'KEIN INHALT BEI FACH EVP';
        } catch (error) {
            console.log('Fehler/Timeout bei EVP2');
            EVP2_val = 'KEIN INHALT BEI FACH EVP (Skript-Timeout)';
        }
        await page.getByRole('button', { name: 'Close' }).click();


        // --- Zusammenfassung ---
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
        
        console.log("Inhalt erfolgreich generiert.");


        // --- IHK Eintrag ---
        console.log("Start: IHK Eintragung");
        await page.goto('https://www.bildung-ihk-nordwestfalen.de/tibrosBB/BB_auszubildende.jsp');
        await page.getByRole('textbox', { name: 'Azubinummer' }).fill(ihk);
        await page.getByRole('textbox', { name: 'Passwort' }).fill(ihkpass);
        await page.getByRole('button', { name: 'Login' }).click();
        await page.getByRole('link', { name: 'Ausbildungsnachweise', exact: true }).click();
        await page.getByRole('button', { name: 'Neuer Eintrag' }).first().click();
        await page.getByRole('textbox').nth(2).fill(abteilung);
        await page.locator('input[name="ausbMail"]').fill(ausbildermail);
        await page.locator('input[name="ausbMail2"]').fill(ausbildermail);
        
        await page.locator('textarea[name="ausbinhalt3"]').click();
        await page.locator('textarea[name="ausbinhalt3"]').fill(finalInhalt); 
        
        await page.getByRole('button', { name: 'Speichern', exact: true }).click();
        console.log("IHK Formular ausgefüllt.");

    } catch (error) {
        // Fehler fangen, damit wir trotzdem mailen können
        console.error("KRITISCHER FEHLER:", error);
        testStatus = 'FEHLGESCHLAGEN';
        errorMessage = error.message;
    
    } finally {
        console.log("Erstelle E-Mail Report...");

        // --- Analyse: Wo fehlte Inhalt? ---
        // Wir prüfen alle Variablen, ob "KEIN INHALT" drin steht
        const allVals = [EVP_val, DE_val, STDM_val, Kryp_val, GID_val, EN_val, EVP2_val];
        const subjects = ["EVP (Mo)", "Deutsch", "STDM", "Kryptologie", "GID", "Englisch", "EVP (Fr)"];
        
        allVals.forEach((val, index) => {
            if (val && val.includes('KEIN INHALT')) {
                emptySubjectsWarnings.push(subjects[index]);
            }
        });

        // --- HTML E-Mail Bauen ---
        let statusColor = testStatus === 'ERFOLGREICH' ? '#28a745' : '#dc3545';
        
        let htmlBody = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
                <h2 style="color: ${statusColor};">Berichtsheft-Bot Status: ${testStatus}</h2>
        `;

        // 1. Kritischer Fehlerblock (falls Skript abgestürzt)
        if (testStatus === 'FEHLGESCHLAGEN') {
            htmlBody += `
                <div style="background-color: #f8d7da; color: #721c24; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
                    <strong>❌ Das Skript ist abgestürzt!</strong><br>
                    Fehler: ${errorMessage}
                </div>
            `;
        }

        // 2. Warnungen über leere Fächer (Deine "Timeouts")
        if (emptySubjectsWarnings.length > 0) {
            htmlBody += `
                <div style="background-color: #fff3cd; color: #856404; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
                    <strong>⚠️ Folgende Fächer hatten keinen Inhalt:</strong>
                    <ul>
                        ${emptySubjectsWarnings.map(fach => `<li>${fach}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            htmlBody += `
                <div style="background-color: #d4edda; color: #155724; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
                    ✅ Alle Fächer hatten Inhalt.
                </div>
            `;
        }

        // 3. Der Report Inhalt
        if (finalInhalt) {
            htmlBody += `
                <h3>Hinzugefügter Report:</h3>
                <pre style="background: #f8f9fa; padding: 15px; border: 1px solid #ccc; white-space: pre-wrap;">${finalInhalt}</pre>
            `;
        } else {
            htmlBody += `<p><em>Kein Report generiert (Aufgrund von Fehler).</em></p>`;
        }

        htmlBody += `</div>`; // Close Main Div

        // --- E-Mail Senden ---
        try {
            await transporter.sendMail({
                from: `"Berichtsheft Bot" <${process.env.EMAIL_USER}>`,
                to: emailTo,
                subject: `Berichtsheft ${testStatus} ${emptySubjectsWarnings.length > 0 ? '(mit leeren Fächern)' : ''}`,
                html: htmlBody,
            });
            console.log("E-Mail erfolgreich versendet.");
        } catch (emailError) {
            console.error("Fehler beim Senden der E-Mail:", emailError);
        }

        // Wenn der Test fehlgeschlagen war, lassen wir Playwright jetzt rot werden
        if (testStatus === 'FEHLGESCHLAGEN') {
            throw new Error(`Skript wurde nach Mailversand abgebrochen: ${errorMessage}`);
        }
    }
});