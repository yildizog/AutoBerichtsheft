import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

/**
 * KONFIGURATION
 */
const TARGET_DATE = process.env.TARGET_DATE || '2026-01-12';
// WICHTIG: WebUntis nutzt oft das Format ohne Bindestriche in der URL für den State
const formattedDate = TARGET_DATE.replace(/-/g, '');
const targetUrl = `https://le-bk-muenster.webuntis.com/WebUntis/?school=le-bk-muenster#/basic/timetable/my-student?date=${formattedDate}`;

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
    async function scrapeSubjectContent(locator, label) {
        try {
            if (await locator.count() > 0) {
                const element = locator.first();
                // Scrollen stellt sicher, dass das Element im Viewport ist
                await element.scrollIntoViewIfNeeded();
                await element.click({ timeout: 5000 });

                const content = await getText();
                await safeClose();

                // Kurze Pause damit die UI Zeit hat sich zu beruhigen
                await page.waitForTimeout(300);
                return content;
            }
            return '';
        } catch (e) {
            console.warn(`[DEBUG] Fach '${label}' konnte nicht gelesen werden.`);
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