import { test } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

test('Teil 2: IHK Upload', async ({ page }) => {
    test.setTimeout(120 * 1000); 

    // Wir brauchen die ID, um den Status zu updaten
    const reportId = process.env.REPORT_ID;
    
    // Status auf "running" setzen
    if(reportId) await updateStatus(reportId, 'running', 'Upload gestartet...');

    // Objekt initialisieren (inkl. dem neuen Feld workActivities)
    let contentObj = { 
        evp1:'', deutsch:'', stdm:'', kryp:'', gid:'', englisch:'', evp2:'',
        workActivities: '' // NEU
    };

    try { 
        if(process.env.INPUT_TEXT) {
            contentObj = JSON.parse(process.env.INPUT_TEXT); 
        }
    } catch(e) {
        console.error("Fehler beim Parsen des Inputs:", e);
    }

    // Formatierung für das Schulfeld (ausbinhalt3)
    const schoolInhalt = `Montag:\nEVP: ${contentObj.evp1}\nDeutsch: ${contentObj.deutsch}\nSTDM: ${contentObj.stdm}\nKryp: ${contentObj.kryp}\n\nFreitag:\nGID: ${contentObj.gid}\nEnglisch: ${contentObj.englisch}\nEVP: ${contentObj.evp2}`;

    // Die betrieblichen Tätigkeiten (ausbinhalt1)
    const betrieblicheTaetigkeiten = contentObj.workActivities || '';

    try {
        console.log("IHK Login...");
        await page.goto('https://www.bildung-ihk-nordwestfalen.de/tibrosBB/BB_auszubildende.jsp');
        
        const azubiInput = page.getByRole('textbox', { name: 'Azubinummer' });
        await azubiInput.waitFor({state: 'visible', timeout: 20000});
        
        await azubiInput.fill(process.env.IHKUSER || '');
        await page.getByRole('textbox', { name: 'Passwort' }).fill(process.env.IHKPASS || '');
        await page.getByRole('button', { name: 'Login' }).click();
        
        console.log("Navigiere zu Ausbildungsnachweisen...");
        await page.getByRole('link', { name: 'Ausbildungsnachweise', exact: true }).click();
        await page.getByRole('button', { name: 'Neuer Eintrag' }).first().click();
        
        // Allgemeine Infos
        await page.getByRole('textbox').nth(2).fill(process.env.ABTEILUNG || '');
        await page.locator('input[name="ausbMail"]').fill(process.env.AUSBILDERMAIL || '');
        await page.locator('input[name="ausbMail2"]').fill(process.env.AUSBILDERMAIL || '');

        // --- NEU: Betriebliche Tätigkeiten (ausbinhalt1) ---
        console.log("Fülle betriebliche Tätigkeiten aus...");
        const fieldTaetigkeiten = page.locator('textarea[name="ausbinhalt1"]');
        await fieldTaetigkeiten.waitFor({ state: 'visible' });
        await fieldTaetigkeiten.fill(betrieblicheTaetigkeiten);

        // --- Schulzeiten / Unterweisungen (ausbinhalt3) ---
        console.log("Fülle Schulzeiten aus...");
        const fieldSchule = page.locator('textarea[name="ausbinhalt3"]');
        await fieldSchule.fill(schoolInhalt); 
        
        // Speichern Button (auskommentiert zum Testen)
        await page.getByRole('button', { name: 'Speichern', exact: true }).click();
        
        console.log("Upload erfolgreich beendet.");
        if(reportId) await updateStatus(reportId, 'success', 'Erfolgreich hochgeladen!');

    } catch (error) {
        console.error("Fehler beim Upload:", error);
        if(reportId) await updateStatus(reportId, 'failed', `Fehler: ${error.message}`);
        throw error;
    }
});

async function updateStatus(id, status, msg) {
    if (!process.env.FIREBASE_URL || !process.env.FIREBASE_SECRET) return;
    await fetch(`${process.env.FIREBASE_URL}/reports/${id}.json?auth=${process.env.FIREBASE_SECRET}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: status, message: msg }),
        headers: { 'Content-Type': 'application/json' }
    });
}