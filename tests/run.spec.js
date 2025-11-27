import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

test('test', async ({ page }) => {

    const unitsuser = process.env.UNITSUSER || ''; 
    const unitspass = process.env.UNITSPASS || '';
    const ihk = process.env.IHKUSER || '';
    const ihkpass = process.env.IHKPASS || '';
    const ausbildermail = process.env.AUSBILDERMAIL || '';
    const abteilung = process.env.ABTEILUNG || '';
    
    // Deklaration der Variablen mit 'let', da sie neu zugewiesen werden
    let EVP_val = '';
    let DE_val = '';
    let STDM_val = '';
    let Kryp_val = '';
    let GID_val = '';
    let EN_val = '';
    let EVP2_val = '';
    

    // --- WebUntis Login ---
    await page.goto('https://webuntis.com/#/basic/login');
    await page.getByText('Search for School Name, City or Address').click();
    await page.getByRole('combobox').fill('Ludwig-Erhard-Berufskolleg Münster');
    await page.getByRole('combobox').press('Enter');
    await page.goto('https://niobe.webuntis.com/WebUntis/?school=le-bk-muenster#/basic/login');
    await page.getByRole('textbox', { name: 'Benutzername' }).fill(unitsuser); 
    await page.getByRole('textbox', { name: 'Passwort' }).fill(unitspass);
    await page.getByRole('button', { name: 'Login' }).click();

    // --- Stundenplan auslesen ---
    await page.getByRole('link', { name: 'Mein Stundenplan' }).click();
    await page.getByTestId('date-picker-with-arrows-previous').click(); 
    await page.getByRole('link', { name: 'Mein Stundenplan' }).click(); 

    // **STABILITÄTSFIX FÜR ACTIONS:** Warte explizit, bis die Stundenplan-Karten geladen sind.
    // Timeout auf 45s gesetzt, falls die GitHub Actions VM langsam ist.
    await page.getByTestId('lesson-card-row').first().waitFor({ state: 'visible', timeout: 45000 }); 
    
    
    // M O N T A G -----------------------------------------------------------------
    
    // EVP (3. Zeile im Stundenplan)
    await page.getByTestId('lesson-card-row').nth(2).click();
    try {
        EVP_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
        if (!EVP_val.trim()) {
            EVP_val = 'KEIN INHALT BEI FACH EVP';
        }
    } catch (error) {
        console.log('Timeout beim Auslesen von EVP. Überspringe.');
        EVP_val = 'KEIN INHALT BEI FACH EVP (Timeout)';
    }
    await page.getByRole('button', { name: 'Close' }).click();

    // DEUTSCH (D) - Jetzt mit exaktem Locator
    await page.getByText('D', { exact: true }).click(); 
    try {
        DE_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
        if (!DE_val.trim()) {
            DE_val = 'KEIN INHALT BEI FACH DEUTSCH';
        }
    } catch (error) {
        console.log('Timeout beim Auslesen von DEUTSCH. Überspringe.');
        DE_val = 'KEIN INHALT BEI FACH DEUTSCH (Timeout)';
    }
    await page.getByRole('button', { name: 'Close' }).click();

    // STDM
    await page.locator('div').filter({ hasText: /^STDM$/ }).first().click();
    try {
        STDM_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
        if (!STDM_val.trim()) {
            STDM_val = 'KEIN INHALT BEI FACH STDM';
        }
    } catch (error) {
        console.log('Timeout beim Auslesen von STDM. Überspringe.');
        STDM_val = 'KEIN INHALT BEI FACH STDM (Timeout)';
    }
    await page.getByRole('button', { name: 'Close' }).click();

    // D-KRYPT
    await page.locator('[data-testid="lesson-card-subject"]', { hasText: 'D-KRYPT' }).click();
    try {
        Kryp_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
        if (!Kryp_val.trim()) {
            Kryp_val = 'KEIN INHALT BEI FACH KRYPTOLOGIE';
        }
    } catch (error) {
        console.log('Timeout beim Auslesen von KRYPTOLOGIE. Überspringe.');
        Kryp_val = 'KEIN INHALT BEI FACH KRYPTOLOGIE (Timeout)';
    }
    await page.getByRole('button', { name: 'Close' }).click();


    // F R E I T A G ---------------------------------------------------------------
    
    // GID
    await page.locator('div').filter({ hasText: /^GID$/ }).first().click();
    try {
        GID_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
        if (!GID_val.trim()) {
            GID_val = 'KEIN INHALT BEI FACH GID';
        }
    } catch (error) {
        console.log('Timeout beim Auslesen von GID. Überspringe.');
        GID_val = 'KEIN INHALT BEI FACH GID (Timeout)';
    }
    await page.getByRole('button', { name: 'Close' }).click();

    // ENGLISCH (E) - Jetzt mit exaktem Locator
    await page.getByText('E', { exact: true }).click();
    try {
        EN_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
        if (!EN_val.trim()) {
            EN_val = 'KEIN INHALT BEI FACH ENGLISCH';
        }
    } catch (error) {
        console.log('Timeout beim Auslesen von ENGLISCH. Überspringe.');
        EN_val = 'KEIN INHALT BEI FACH ENGLISCH (Timeout)';
    }
    await page.getByRole('button', { name: 'Close' }).click();

    // EVP2
    await page.locator('div').filter({ hasText: /^EVP$/ }).nth(3).click();
    try {
        EVP2_val = await page.locator('textarea.ant-input').inputValue({ timeout: 10000 });
        if (!EVP2_val.trim()) {
            EVP2_val = 'KEIN INHALT BEI FACH EVP';
        }
    } catch (error) {
        console.log('Timeout beim Auslesen von EVP2. Überspringe.');
        EVP2_val = 'KEIN INHALT BEI FACH EVP (Timeout)';
    }
    await page.getByRole('button', { name: 'Close' }).click();


    // --- Daten für das Log/IHK zusammenfassen ---
    const inhalt = 
        `Montag:\n` +
        `Entwicklung Vernetzter Prozesse:\n${EVP_val}\n` +
        `\nDeutsch:\n${DE_val}\n` +
        `\nSoftwaretechnologie und Datenmanagement:\n${STDM_val}\n` +
        `\nKryptologie:\n${Kryp_val}\n\n` +
        `Freitag:\n` +
        `\nGestaltung IT Dienstleistungen:\n${GID_val}\n` +
        `\nEnglisch:\n${EN_val}\n` +
        `\nEntwicklung Vernetzter Prozesse:\n${EVP2_val}`;
    
    // Optional: Logge den finalen Inhalt zur Überprüfung
    console.log("--- FINALER IHK INHALT ---");
    console.log(inhalt); 
    console.log("--------------------------");


    // --- IHK-Login und Eintrag ---
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
    await page.locator('textarea[name="ausbinhalt3"]').fill(inhalt); 
    
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();
});