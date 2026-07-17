import { test } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

test('Teil 2: IHK Upload', async ({ page }) => {
    test.setTimeout(120 * 1000);

    // Wir brauchen die ID, um den Status zu updaten
    const reportId = process.env.REPORT_ID;

    // Status auf "running" setzen
    if (reportId) await updateStatus(reportId, 'running', 'Upload gestartet...');

    // Objekt initialisieren (inkl. workActivities, sickDays und absences)
    let contentObj = {
        stdm: '', deutsch: '', evp: '', sport: '', wbl: '', englisch: '', dkrypt: '',
        workActivities: '',
        sickDays: { montag: false, freitag: false }, // Veraltet (nur alte Berichte)
        absences: { montag: null, freitag: null } as { montag: string | null; freitag: string | null }
    };

    try {
        if (process.env.INPUT_TEXT) {
            const parsed = JSON.parse(process.env.INPUT_TEXT);
            contentObj = { ...contentObj, ...parsed }; // Merge um sicherzugehen
        }
    } catch (e) {
        console.error("Fehler beim Parsen des Inputs:", e);
    }

    // --- LOGIK FÜR SCHULINHALTE (Abwesenheits-Handling) ---
    // Montag: STDM, EVP, Sport
    let montagContent = `Montag:\nSoftwaretechnologie und Datenmanagment: ${contentObj.stdm}\nEntwicklung Vernetzter Prozesse: ${contentObj.evp}\nSport: ${contentObj.sport}`;

    // Freitag: WBL, Englisch, Deutsch, D-Krypt
    let freitagContent = `Freitag:\nWBL: ${contentObj.wbl}\nEnglisch: ${contentObj.englisch}\nDeutsch: ${contentObj.deutsch}\nD-KRYPT: ${contentObj.dkrypt}`;

    // Abwesenheit pro Tag: 'krank' | 'urlaub' | 'frei' | 'feiertag' (neu über absences,
    // alte Berichte haben nur sickDays mit boolean = krank).
    const absenceLabels: Record<string, string> = {
        krank: 'Krank', urlaub: 'Urlaub', frei: 'Frei', feiertag: 'Feiertag'
    };
    const getAbsence = (day: 'montag' | 'freitag'): string | null => {
        const fromAbsences = contentObj.absences && contentObj.absences[day];
        if (fromAbsences && absenceLabels[fromAbsences]) return absenceLabels[fromAbsences];
        if (contentObj.sickDays && contentObj.sickDays[day]) return 'Krank';
        return null;
    };

    const montagAbsence = getAbsence('montag');
    if (montagAbsence) {
        montagContent = `Montag:\n${montagAbsence}`;
    }

    const freitagAbsence = getAbsence('freitag');
    if (freitagAbsence) {
        freitagContent = `Freitag:\n${freitagAbsence}`;
    }

    const schoolInhalt = `${montagContent}\n\n${freitagContent}`;

    // Die betrieblichen Tätigkeiten (ausbinhalt1)
    const betrieblicheTaetigkeiten = contentObj.workActivities || '';

    try {
        console.log("IHK Login...");
        await page.goto('https://www.bildung-ihk-nordwestfalen.de/tibrosBB/BB_auszubildende.jsp');

        const azubiInput = page.getByRole('textbox', { name: 'Azubinummer' });
        await azubiInput.waitFor({ state: 'visible', timeout: 20000 });

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
        if (reportId) await updateStatus(reportId, 'success', 'Erfolgreich hochgeladen!');

    } catch (error) {
        console.error("Fehler beim Upload:", error);
        if (reportId) await updateStatus(reportId, 'failed', `Fehler: ${error.message}`);
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