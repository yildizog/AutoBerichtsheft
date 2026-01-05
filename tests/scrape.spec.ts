import { test } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

test('Teil 1: Scrape WebUntis & Update Firebase', async ({ page }) => {
    // Globales Timeout für den gesamten Test
    test.setTimeout(120 * 1000); 

    const unitsuser = process.env.UNITSUSER || ''; 
    const unitspass = process.env.UNITSPASS || '';
    
    let subjects = {
        evp1: '', deutsch: '', stdm: '', kryp: '', gid: '', englisch: '', evp2: ''
    };

    // --- HILFSFUNKTIONEN ---

    // Schließt den Dialog (entweder via Button oder Escape)
    async function safeClose() {
        try {
            const closeBtn = page.getByRole('button', { name: 'Close' });
            if (await closeBtn.isVisible({ timeout: 2000 })) {
                await closeBtn.click();
            } else {
                await page.keyboard.press('Escape');
            }
        } catch (e) { /* Ignorieren */ }
    }

    // Extrahiert den Text aus dem Textfeld
    async function getText() {
        try {
            await page.waitForTimeout(500);
            const text = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            return text.trim();
        } catch (e) { return ''; }
    }

    // NEU: Versucht eine Karte zu klicken. Falls Timeout (5s), wird '' zurückgegeben.
    async function scrapeSubjectContent(locator) {
        try {
            // Versuche das Fach anzuklicken (Timeout 5 Sekunden)
            await locator.click({ timeout: 5000 });
            
            // Text auslesen
            const content = await getText();
            
            // Dialog wieder schließen
            await safeClose();
            
            return content;
        } catch (e) {
            console.warn(`Hinweis: Ein Fach konnte nicht geöffnet werden oder war nicht klickbar. Überspringe...`);
            await safeClose(); // Sicherstellen, dass alles zu ist für das nächste Fach
            return ''; // Falls Fehler, bleibt das Fach leer
        }
    }

    // --- TEST ABLAUF ---

    try {
        console.log("--- Start: WebUntis Login ---");
        await page.goto('https://le-bk-muenster.webuntis.com/WebUntis/?school=le-bk-muenster#/basic/login');
        
        await page.getByRole('textbox', { name: 'Benutzername' }).fill(unitsuser); 
        await page.getByRole('textbox', { name: 'Passwort' }).fill(unitspass);
        await page.getByRole('button', { name: 'Login' }).click();
        
        await page.getByRole('link', { name: 'Mein Stundenplan' }).first().waitFor({ timeout: 30000 });
        await page.getByRole('link', { name: 'Mein Stundenplan' }).click();
        
        await page.waitForTimeout(3000); 
        await page.getByTestId('date-picker-with-arrows-previous').click(); 
        await page.getByTestId('lesson-card-row').first().waitFor({ timeout: 30000 }); 

        console.log("Lese Fächer aus...");

        // Einzelne Fächer mit der neuen Sicherheitsfunktion abrufen
        subjects.evp1 = await scrapeSubjectContent(page.getByTestId('lesson-card-row').nth(2));
        subjects.deutsch = await scrapeSubjectContent(page.getByText('D', { exact: true }));
        subjects.stdm = await scrapeSubjectContent(page.locator('div').filter({ hasText: /^STDM$/ }).first());
        subjects.kryp = await scrapeSubjectContent(page.locator('[data-testid="lesson-card-subject"]', { hasText: 'D-KRYPT' }));
        subjects.gid = await scrapeSubjectContent(page.locator('div').filter({ hasText: /^GID$/ }).first());
        subjects.englisch = await scrapeSubjectContent(page.getByText('E', { exact: true }));
        subjects.evp2 = await scrapeSubjectContent(page.locator('div').filter({ hasText: /^EVP$/ }).nth(3));

        console.log("Scraping fertig. Prüfe auf Duplikate...");
        
        // --- DUPLIKAT PRÜFUNG & UPDATE ---
        const isDuplicate = await checkAndCleanupDuplicates(subjects);
        
        if (isDuplicate) {
            console.log("Abbruch: Ein exakt gleicher Bericht existiert bereits.");
        } else {
            await updateFirebase('waiting', 'Inhalte geladen. Bitte prüfen.', subjects);
            console.log("Neuer Bericht erfolgreich angelegt.");
        }

    } catch (error) {
        console.error("Fehler im Test:", error);
        await updateFirebase('failed', `Scraper Fehler: ${error.message}`, null);
        throw error;
    }
});

// --- FIREBASE FUNKTIONEN ---

async function checkAndCleanupDuplicates(newContent) {
    if (!process.env.FIREBASE_URL || !process.env.FIREBASE_SECRET) return false;

    try {
        const response = await fetch(`${process.env.FIREBASE_URL}/reports.json?auth=${process.env.FIREBASE_SECRET}`);
        const data = await response.json();

        if (!data) return false;

        const newFingerprint = JSON.stringify(newContent);
        let foundDuplicate = false;

        for (const [id, report] of Object.entries(data)) {
            const existingFingerprint = JSON.stringify(report.content);

            if (newFingerprint === existingFingerprint) {
                console.log(`Duplikat gefunden: ID ${id} hat denselben Inhalt.`);
                foundDuplicate = true;
            }
        }
        return foundDuplicate;
    } catch (e) {
        console.error("Fehler bei Duplikat-Prüfung:", e);
        return false;
    }
}

async function updateFirebase(status, msg, content) {
    if (!process.env.FIREBASE_URL || !process.env.FIREBASE_SECRET) return;

    const now = new Date();
    const reportId = now.toISOString().split('T')[0] + '_' + now.getHours() + '-' + now.getMinutes();
    const dateLabel = now.toLocaleDateString('de-DE') + ' ' + now.toLocaleTimeString('de-DE');

    const url = `${process.env.FIREBASE_URL}/reports/${reportId}.json?auth=${process.env.FIREBASE_SECRET}`;
    
    const data = {
        status: status,
        createdAt: dateLabel,
        dateLabel: dateLabel,
        message: msg,
        content: content
    };

    await fetch(url, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    });
}