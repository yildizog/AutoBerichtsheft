import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

// Wichtig: dotenv.config() sollte idealerweise in playwright.config.ts stehen!
// Ich lasse es hier, da es im Originalcode stand.
dotenv.config();

test('test', async ({ page }) => {

    const unitsuser = process.env.UNITSUSER || ''; // units wurde in unitsuser umbenannt zur Klarheit
    const unitspass = process.env.UNITSPASS || '';
    const ihk = process.env.IHKUSER || '';
    const ihkpass = process.env.IHKPASS || '';
    const ausbildermail = process.env.AUSBILDERMAIL || '';
    const abteilung = process.env.ABTEILUNG || '';
  

    // --- WebUntis Login ---
    await page.goto('https://webuntis.com/#/basic/login');
    await page.getByText('Search for School Name, City or Address').click();
    await page.getByRole('combobox').fill('Ludwig-Erhard-Berufskolleg Münster');
    await page.getByRole('combobox').press('Enter');
    await page.goto('https://niobe.webuntis.com/WebUntis/?school=le-bk-muenster#/basic/login');
    await page.getByRole('textbox', { name: 'Benutzername' }).click();
    await page.getByRole('textbox', { name: 'Benutzername' }).fill(unitsuser); // Geändert von 'units' zu 'unitsuser'
    await page.getByRole('textbox', { name: 'Passwort' }).click();
    await page.getByRole('textbox', { name: 'Passwort' }).fill(unitspass);
    await page.getByRole('button', { name: 'Login' }).click();

    // --- Stundenplan auslesen ---
    await page.getByRole('link', { name: 'Mein Stundenplan' }).click();
    // Navigiere zwei Wochen zurück (ein Klick fehlt im Originalcode für eine zweite Woche)
    await page.getByTestId('date-picker-with-arrows-previous').click(); 
    await page.getByRole('link', { name: 'Mein Stundenplan' }).click(); // Erneutes Klicken, um das Laden zu erzwingen

    const locator = page.locator('textarea.ant-input');

    // M O N T A G
    await page.getByTestId('lesson-card-row').nth(2).click();
    const EVP_val = await locator.inputValue();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.locator('div').filter({ hasText: /^D$/ }).nth(1).click();
    const DE_val = await locator.inputValue();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.locator('div').filter({ hasText: /^STDM$/ }).first().click();
    const STDM_val = await locator.inputValue();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.locator('div').filter({ hasText: /^D-KRYPT$/ }).nth(3).click();
    const Kryp_val = await locator.inputValue();
    await page.getByRole('button', { name: 'Close' }).click();


    // F R E I T A G
    await page.locator('div').filter({ hasText: /^GID$/ }).first().click();
    const GID_val = await locator.inputValue();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.locator('div').filter({ hasText: /^E$/ }).nth(3).click();
    const EN_val = await locator.inputValue();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.locator('div').filter({ hasText: /^EVP$/ }).nth(3).click();
    const EVP2_val = await locator.inputValue();
    await page.getByRole('button', { name: 'Close' }).click();


    // --- Daten für das Log/IHK zusammenfassen (HIER IST DIE LÖSUNG) ---
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
    await page.getByRole('textbox', { name: 'Azubinummer' }).click();
    await page.getByRole('textbox', { name: 'Azubinummer' }).fill(ihk);
    await page.getByRole('textbox', { name: 'Passwort' }).click();
    await page.getByRole('textbox', { name: 'Passwort' }).fill(ihkpass);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('link', { name: 'Ausbildungsnachweise', exact: true }).click();
    await page.getByRole('button', { name: 'Neuer Eintrag' }).first().click();
    await page.getByRole('textbox').nth(2).click();
    await page.getByRole('textbox').nth(2).fill(abteilung);
    await page.locator('input[name="ausbMail"]').dblclick();
    await page.locator('input[name="ausbMail"]').dblclick();
    await page.locator('input[name="ausbMail"]').press('ControlOrMeta+a');
    await page.locator('input[name="ausbMail"]').fill(ausbildermail);
    await page.locator('input[name="ausbMail2"]').click();
    await page.locator('input[name="ausbMail2"]').fill(ausbildermail);
    
    await page.locator('textarea[name="ausbinhalt3"]').click();
    await page.locator('textarea[name="ausbinhalt3"]').fill(inhalt); // Variable inhalt wird hier verwendet
    
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();
});