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

    // Hilfsfunktionen
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

        // Scrape Logik
        try { await page.getByTestId('lesson-card-row').nth(2).click(); subjects.evp1 = await getText(); await safeClose(); } catch(e){}
        try { await page.getByText('D', { exact: true }).click(); subjects.deutsch = await getText(); await safeClose(); } catch(e){}
        try { await page.locator('div').filter({ hasText: /^STDM$/ }).first().click(); subjects.stdm = await getText(); await safeClose(); } catch(e){}
        try { await page.locator('[data-testid="lesson-card-subject"]', { hasText: 'D-KRYPT' }).click(); subjects.kryp = await getText(); await safeClose(); } catch(e){}
        try { await page.locator('div').filter({ hasText: /^GID$/ }).first().click(); subjects.gid = await getText(); await safeClose(); } catch(e){}
        try { await page.getByText('E', { exact: true }).click(); subjects.englisch = await getText(); await safeClose(); } catch(e){}
        try { await page.locator('div').filter({ hasText: /^EVP$/ }).nth(3).click(); subjects.evp2 = await getText(); await safeClose(); } catch(e){}

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

/**
 * Holt alle Berichte aus Firebase, vergleicht den Inhalt 
 * und löscht ggf. ältere Dubletten.
 * Gibt true zurück, wenn der aktuelle Inhalt bereits existiert.
 */
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
                // Optional: Hier könnte man den alten Report löschen, 
                // aber meistens will man den neuen einfach nicht anlegen.
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
    // ID Format: 2025-12-24_20-45 (Besser sortierbar in Firebase)
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