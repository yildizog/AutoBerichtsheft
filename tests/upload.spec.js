import { test } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

test('IHK Upload', async ({ page }) => {
    test.setTimeout(120 * 1000); 
    let contentObj = { evp1:'', deutsch:'', stdm:'', kryp:'', gid:'', englisch:'', evp2:'' };
    try { if(process.env.INPUT_TEXT) contentObj = JSON.parse(process.env.INPUT_TEXT); } catch(e) {}

    const finalInhalt = `Montag:\nEVP: ${contentObj.evp1}\nDeutsch: ${contentObj.deutsch}\nSTDM: ${contentObj.stdm}\nKryp: ${contentObj.kryp}\n\nFreitag:\nGID: ${contentObj.gid}\nEnglisch: ${contentObj.englisch}\nEVP: ${contentObj.evp2}`;

    try {
        console.log("IHK Login...");
        await page.goto('https://www.bildung-ihk-nordwestfalen.de/tibrosBB/BB_auszubildende.jsp');
        const azubiInput = page.getByRole('textbox', { name: 'Azubinummer' });
        await azubiInput.waitFor({state: 'visible', timeout: 20000});
        await azubiInput.fill(process.env.IHKUSER || '');
        await page.getByRole('textbox', { name: 'Passwort' }).fill(process.env.IHKPASS || '');
        await page.getByRole('button', { name: 'Login' }).click();
        
        await page.getByRole('link', { name: 'Ausbildungsnachweise', exact: true }).click();
        await page.getByRole('button', { name: 'Neuer Eintrag' }).first().click();
        await page.getByRole('textbox').nth(2).fill(process.env.ABTEILUNG || '');
        await page.locator('input[name="ausbMail"]').fill(process.env.AUSBILDERMAIL || '');
        await page.locator('input[name="ausbMail2"]').fill(process.env.AUSBILDERMAIL || '');
        await page.locator('textarea[name="ausbinhalt3"]').click();
        await page.locator('textarea[name="ausbinhalt3"]').fill(finalInhalt); 
        
        // await page.getByRole('button', { name: 'Speichern', exact: true }).click(); // Einkommentieren wenn fertig
        
        await fetch(`${process.env.FIREBASE_URL}/status.json?auth=${process.env.FIREBASE_SECRET}`, {
            method: 'PATCH', body: JSON.stringify({ status: 'success', message: 'Eingetragen um ' + new Date().toLocaleTimeString() })
        });

    } catch (error) {
        await fetch(`${process.env.FIREBASE_URL}/status.json?auth=${process.env.FIREBASE_SECRET}`, {
            method: 'PATCH', body: JSON.stringify({ status: 'failed', message: error.message })
        });
        throw error;
    }
});