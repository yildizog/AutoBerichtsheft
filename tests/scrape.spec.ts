import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

/**
 * KONFIGURATION
 */
const getAutoTargetDate = () => {
    if (process.env.TARGET_DATE) return process.env.TARGET_DATE;
    const d = new Date();
    d.setDate(d.getDate() - 7); // Eine Woche zurück
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const TARGET_DATE = getAutoTargetDate();
// WICHTIG: Datum muss im Format YYYY-MM-DD bleiben
const targetUrl = `https://le-bk-muenster.webuntis.com/timetable/my-student?date=${TARGET_DATE}`;

test('Teil 1: Scrape WebUntis & Update Firebase - High Performance', async ({ page }) => {

    // 1. RADIKALES BLOCKING
    await page.route('**/*', (route) => {
        const url = route.request().url();
        const type = route.request().resourceType();
        if (type === 'image' || type === 'font' || url.includes('matomo') || url.includes('google-analytics')) {
            route.abort();
        } else {
            route.continue();
        }
    });

    test.setTimeout(150 * 1000);
    const unitsuser = process.env.UNITSUSER || '';
    const unitspass = process.env.UNITSPASS || '';

    let subjects = {
        evp1: '', deutsch: '', stdm: '', kryp: '', gid: '', englisch: '', evp2: ''
    };

    // --- OPTIMIERTE HILFSFUNKTIONEN ---

    async function safeClose() {
        try {
            // Erst versuchen mit Escape (schnellster Weg in WebUntis)
            await page.keyboard.press('Escape');
            // Warten bis das Modal wirklich verschwunden ist (verhindert Klick-Blockaden)
            const modal = page.locator('.ant-modal-content, .un-modal').first();
            await modal.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => { });
        } catch (e) { /* Ignorieren */ }
    }

    async function getText() {
        try {
            // Sucht nach der Textarea (deckt verschiedene WebUntis-Versionen ab)
            const textarea = page.locator('textarea.ant-input, .un-lesson-details-content textarea').first();

            // Warten, bis das Feld sichtbar ist (wichtiger als ein fester Timeout)
            await textarea.waitFor({ state: 'visible', timeout: 7000 });

            const text = await textarea.inputValue();
            return text.trim();
        } catch (e) {
            return '';
        }
    }
    async function scrapeSubjectContent(pattern: string | RegExp, index: number) {
        try {
            // Locator basierend auf Text/Regex erstellen
            const locator = page.getByText(pattern).nth(index);

            if (await locator.count() > 0) {
                // Scrollen stellt sicher, dass das Element im Viewport ist
                await locator.scrollIntoViewIfNeeded();
                await locator.click({ timeout: 5000 });

                const content = await getText();
                await safeClose();

                // Kurze Pause damit die UI Zeit hat sich zu beruhigen
                await page.waitForTimeout(300);
                return content;
            }
            return '';
        } catch (e) {
            console.warn(`[DEBUG] Fach '${pattern.toString()}' (Index: ${index}) konnte nicht gelesen werden.`);
            await safeClose();
            return '';
        }
    }

    // --- TEST ABLAUF ---
    try {
        console.log("--- Start: Login-Vorgang ---");
        await page.goto('https://le-bk-muenster.webuntis.com/WebUntis/?school=le-bk-muenster#/basic/login');
        await page.getByRole('textbox', { name: /Benutzername|Username/i }).fill(unitsuser);
        await page.getByRole('textbox', { name: /Passwort|Password/i }).fill(unitspass);
        await page.getByRole('button', { name: 'Login' }).click();

        // 1. Warten auf stabilen Login
        await page.waitForURL('**/today**', { waitUntil: 'networkidle', timeout: 30000 });
        await page.getByRole('link', { name: 'Mein Stundenplan' }).click();

        // 2. Navigation zum Ziel-Datum
        console.log(`Navigiere zu Ziel-Datum: ${targetUrl}`);
        await page.goto(targetUrl);

        // Warten bis der Plan wirklich da ist
        await page.waitForSelector('[data-testid^="lesson-card"]', { timeout: 20000 });
        await page.waitForTimeout(1000); // Sicherheits-Puffer für SPA Rendering

        console.log("Starte Daten-Extraktion...");

        // Fächer abgreifen mit optimierter Logik
        subjects.evp1 = await scrapeSubjectContent('EVP', 0);
        subjects.deutsch = await scrapeSubjectContent(/^D$/, 0); // RegEx für exaktes "D"
        subjects.stdm = await scrapeSubjectContent('STDM', 0);
        subjects.kryp = await scrapeSubjectContent('KRYP', 0);
        subjects.gid = await scrapeSubjectContent('GID', 0);
        subjects.englisch = await scrapeSubjectContent(/^E$/, 0); // RegEx für exaktes "E"
        subjects.evp2 = await scrapeSubjectContent('EVP', 1);

        console.log("Extraktion beendet:", subjects);

        // Firebase-Logik
        const isDuplicate = await checkAndCleanupDuplicates(subjects);
        if (isDuplicate) {
            console.log("Duplikat erkannt. Kein Update nötig.");
        } else {
            await updateFirebase('waiting', 'Inhalte geladen.', subjects);
            console.log("Firebase erfolgreich aktualisiert.");
        }

    } catch (error) {
        console.error("KRITISCHER FEHLER:", error.message);
        // Screenshot bei Fehler
        await page.screenshot({ path: 'error_debug.png' });
        throw error;
    }
});

// Hilfsfunktionen für Firebase bleiben gleich...
async function checkAndCleanupDuplicates(subjects: any) {
    console.log('[MOCK] checkAndCleanupDuplicates called with:', subjects);
    return false;
}

async function updateFirebase(status: string, message: string, data: any) {
    console.log(`[MOCK] updateFirebase: ${status} - ${message}`, data);
}