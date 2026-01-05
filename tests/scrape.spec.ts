import { test } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

test('Teil 1: Scrape WebUntis & Update Firebase', async ({ page }) => {
    test.setTimeout(120 * 1000); 

    const unitsuser = process.env.UNITSUSER || ''; 
    const unitspass = process.env.UNITSPASS || '';
    
    let subjects = {
        evp1: '', deutsch: '', stdm: '', kryp: '', gid: '', englisch: '', evp2: ''
    };

    // --- HILFSFUNKTIONEN ---

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

    async function getText() {
        try {
            await page.waitForTimeout(500);
            const text = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            return text.trim();
        } catch (e) { return ''; }
    }

    async function scrapeSubjectContent(locator) {
        try {
            // Prüfen, ob das Element überhaupt existiert, bevor wir klicken
            if (await locator.count() > 0) {
                await locator.first().click({ timeout: 5000 });
                const content = await getText();
                await safeClose();
                return content;
            }
            return ''; 
        } catch (e) {
            console.warn(`Ein Fach konnte nicht gelesen werden (evtl. nicht vorhanden).`);
            await safeClose();
            return '';
        }
    }

    // --- TEST ABLAUF ---

    try {
        console.log("--- Start: WebUntis Login ---");
        await page.goto('https://le-bk-muenster.webuntis.com/WebUntis/?school=le-bk-muenster#/basic/login');
        
        await page.getByRole('textbox', { name: 'Benutzername' }).fill(unitsuser); 
        await page.getByRole('textbox', { name: 'Passwort' }).fill(unitspass);
        await page.getByRole('button', { name: 'Login' }).click();
        
        // Warten bis Dashboard geladen ist
        await page.getByRole('link', { name: 'Mein Stundenplan' }).first().waitFor({ timeout: 30000 });
        await page.getByRole('link', { name: 'Mein Stundenplan' }).click();
        
        // Warten auf den Stundenplan-Container statt auf eine feste Zeit
        await page.waitForLoadState('networkidle');
        
        console.log("Navigiere zur Vorwoche...");
        await page.getByTestId('date-picker-with-arrows-previous').click(); 
        
        // WICHTIG: Hier fangen wir den Timeout ab, falls die Woche leer ist
        try {
            await page.locator('[data-testid="lesson-card-row"]').first().waitFor({ state: 'visible', timeout: 15000 });
        } catch (e) {
            console.log("Hinweis: Keine Unterrichtskarten in dieser Woche gefunden (evtl. Ferien?).");
        }

        console.log("Lese Fächer aus...");

        // Scrape Logik mit Sicherheitscheck
        subjects.evp1 = await scrapeSubjectContent(page.getByTestId('lesson-card-row').nth(2));
        subjects.deutsch = await scrapeSubjectContent(page.getByText('D', { exact: true }));
        subjects.stdm = await scrapeSubjectContent(page.locator('div').filter({ hasText: /^STDM$/ }));
        subjects.kryp = await scrapeSubjectContent(page.locator('[data-testid="lesson-card-subject"]', { hasText: 'D-KRYPT' }));
        subjects.gid = await scrapeSubjectContent(page.locator('div').filter({ hasText: /^GID$/ }));
        subjects.englisch = await scrapeSubjectContent(page.getByText('E', { exact: true }));
        subjects.evp2 = await scrapeSubjectContent(page.locator('div').filter({ hasText: /^EVP$/ }).nth(3));

        console.log("Scraping fertig. Prüfe auf Duplikate...");
        
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

// --- FIREBASE FUNKTIONEN (unverändert) ---

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
                foundDuplicate = true;
            }
        }
        return foundDuplicate;
    } catch (e) { return false; }
}

async function updateFirebase(status, msg, content) {
    if (!process.env.FIREBASE_URL || !process.env.FIREBASE_SECRET) return;
    const now = new Date();
    const reportId = now.toISOString().split('T')[0] + '_' + now.getHours() + '-' + now.getMinutes();
    const dateLabel = now.toLocaleDateString('de-DE') + ' ' + now.toLocaleTimeString('de-DE');
    const url = `${process.env.FIREBASE_URL}/reports/${reportId}.json?auth=${process.env.FIREBASE_SECRET}`;
    const data = { status, createdAt: dateLabel, dateLabel, message: msg, content };
    await fetch(url, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
}