import { test } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

test('Scrape WebUntis & Update Firebase', async ({ page }) => {
    test.setTimeout(120 * 1000); 
    const unitsuser = process.env.UNITSUSER || ''; 
    const unitspass = process.env.UNITSPASS || '';
    
    let subjects = { evp1:'', deutsch:'', stdm:'', kryp:'', gid:'', englisch:'', evp2:'' };
    async function safeClose() { try { if (await page.getByRole('button', { name: 'Close' }).isVisible()) await page.getByRole('button', { name: 'Close' }).click(); else await page.keyboard.press('Escape'); } catch (e) {} }
    async function getText() { try { await page.waitForTimeout(500); return await page.locator('textarea.ant-input').inputValue({ timeout: 5000 }); } catch (e) { return ''; } }

    try {
        console.log("Login WebUntis...");
        await page.goto('https://le-bk-muenster.webuntis.com/WebUntis/?school=le-bk-muenster#/basic/login');
        await page.getByRole('textbox', { name: 'Benutzername' }).fill(unitsuser); 
        await page.getByRole('textbox', { name: 'Passwort' }).fill(unitspass);
        await page.getByRole('button', { name: 'Login' }).click();
        
        await page.getByRole('link', { name: 'Mein Stundenplan' }).first().waitFor();
        await page.getByRole('link', { name: 'Mein Stundenplan' }).click();
        await page.waitForTimeout(3000); 
        await page.getByTestId('date-picker-with-arrows-previous').click(); // Letzte Woche
        await page.getByTestId('lesson-card-row').first().waitFor(); 

        // Fächer Logik (angepasst an deinen Selektor)
        try { await page.getByTestId('lesson-card-row').nth(2).click(); subjects.evp1 = await getText(); await safeClose(); } catch(e){}
        try { await page.getByText('D', { exact: true }).click(); subjects.deutsch = await getText(); await safeClose(); } catch(e){}
        try { await page.locator('div').filter({ hasText: /^STDM$/ }).first().click(); subjects.stdm = await getText(); await safeClose(); } catch(e){}
        try { await page.locator('[data-testid="lesson-card-subject"]', { hasText: 'D-KRYPT' }).click(); subjects.kryp = await getText(); await safeClose(); } catch(e){}
        try { await page.locator('div').filter({ hasText: /^GID$/ }).first().click(); subjects.gid = await getText(); await safeClose(); } catch(e){}
        try { await page.getByText('E', { exact: true }).click(); subjects.englisch = await getText(); await safeClose(); } catch(e){}
        try { await page.locator('div').filter({ hasText: /^EVP$/ }).nth(3).click(); subjects.evp2 = await getText(); await safeClose(); } catch(e){}

        // Success Update
        await updateFirebase('waiting', 'Inhalte geladen. Bitte prüfen.', subjects);

    } catch (error) {
        console.error(error);
        await updateFirebase('failed', `Fehler: ${error.message}`, null);
        throw error;
    }
});

async function updateFirebase(status, msg, content) {
    const data = { status, lastRun: new Date().toLocaleString('de-DE'), message: msg, content };
    await fetch(`${process.env.FIREBASE_URL}/status.json?auth=${process.env.FIREBASE_SECRET}`, {
        method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' }
    });
}