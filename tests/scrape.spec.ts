import { test } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

test('Teil 1: Scrape WebUntis & Update Firebase', async ({ page }) => {
    // 2 Minuten Timeout, falls WebUntis langsam ist
    test.setTimeout(120 * 1000); 

    const unitsuser = process.env.UNITSUSER || ''; 
    const unitspass = process.env.UNITSPASS || '';
    
    // Objekt für die einzelnen Fächer
    let subjects = {
        evp1: '', deutsch: '', stdm: '', kryp: '', gid: '', englisch: '', evp2: ''
    };

    // Hilfsfunktion: Popups schließen
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

    // Hilfsfunktion: Text auslesen
    async function getText() {
        try {
            await page.waitForTimeout(500); // Kurz warten für Animation
            const text = await page.locator('textarea.ant-input').inputValue({ timeout: 5000 });
            return text.trim();
        } catch (e) { 
            return ''; // Kein Text gefunden
        }
    }

    try {
        console.log("--- Start: WebUntis Login ---");
        
        // Login Seite
        await page.goto('https://le-bk-muenster.webuntis.com/WebUntis/?school=le-bk-muenster#/basic/login');
        
        // Login durchführen
        await page.getByRole('textbox', { name: 'Benutzername' }).fill(unitsuser); 
        await page.getByRole('textbox', { name: 'Passwort' }).fill(unitspass);
        await page.getByRole('button', { name: 'Login' }).click();
        
        // Navigation zum Stundenplan
        console.log("Navigiere zum Stundenplan...");
        await page.getByRole('link', { name: 'Mein Stundenplan' }).first().waitFor({ timeout: 30000 });
        await page.getByRole('link', { name: 'Mein Stundenplan' }).click();
        
        await page.waitForTimeout(3000); 
        // Eine Woche zurück (für Berichtsheft der letzten Woche)
        await page.getByTestId('date-picker-with-arrows-previous').click(); 
        await page.getByTestId('lesson-card-row').first().waitFor({ timeout: 30000 }); 

        console.log("Lese Fächer aus...");

        // --- Fächer auslesen (mit try/catch damit einer nicht alles stoppt) ---
        
        // EVP (Montag)
        try { await page.getByTestId('lesson-card-row').nth(2).click(); subjects.evp1 = await getText(); await safeClose(); } catch(e){}

        // Deutsch
        try { await page.getByText('D', { exact: true }).click(); subjects.deutsch = await getText(); await safeClose(); } catch(e){}

        // STDM
        try { await page.locator('div').filter({ hasText: /^STDM$/ }).first().click(); subjects.stdm = await getText(); await safeClose(); } catch(e){}

        // Kryptologie
        try { await page.locator('[data-testid="lesson-card-subject"]', { hasText: 'D-KRYPT' }).click(); subjects.kryp = await getText(); await safeClose(); } catch(e){}

        // GID (Freitag)
        try { await page.locator('div').filter({ hasText: /^GID$/ }).first().click(); subjects.gid = await getText(); await safeClose(); } catch(e){}

        // Englisch
        try { await page.getByText('E', { exact: true }).click(); subjects.englisch = await getText(); await safeClose(); } catch(e){}

        // EVP (Freitag)
        try { await page.locator('div').filter({ hasText: /^EVP$/ }).nth(3).click(); subjects.evp2 = await getText(); await safeClose(); } catch(e){}

        console.log("Fertig. Sende an Firebase...");
        
        // STATUS: WAITING (Gelb) -> Daten sind da, warten auf User-Prüfung
        await updateFirebase('waiting', 'Inhalte geladen. Bitte prüfen.', subjects);

    } catch (error) {
        console.error("Fehler im Test:", error);
        // STATUS: FAILED (Rot)
        await updateFirebase('failed', `Scraper Fehler: ${error.message}`, null);
        throw error; // Damit der GitHub Action Run auch als "failed" markiert wird
    }
});

// Funktion zum Senden an Firebase
async function updateFirebase(status, msg, content) {
    if (!process.env.FIREBASE_URL || !process.env.FIREBASE_SECRET) return;

    // Wir erstellen eine ID basierend auf dem Datum, z.B. "2025-12-21_18-30"
    const now = new Date();
    const reportId = now.toISOString().replace(/[:.]/g, '-'); // Sichere ID
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