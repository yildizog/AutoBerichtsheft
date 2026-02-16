import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

test('Check for missing reports', async ({ page }) => {
    test.setTimeout(120 * 1000);

    const ihkUser = process.env.IHKUSER;
    const ihkPass = process.env.IHKPASS;

    if (!ihkUser || !ihkPass) {
        throw new Error('IHKUSER or IHKPASS environment variables are missing.');
    }

    console.log("Starting missing reports check...");

    // 1. Login
    await page.goto('https://www.bildung-ihk-nordwestfalen.de/tibrosBB/BB_auszubildende.jsp');
    const azubiInput = page.getByRole('textbox', { name: 'Azubinummer' });
    await azubiInput.waitFor({ state: 'visible', timeout: 20000 });
    await azubiInput.fill(ihkUser);
    await page.getByRole('textbox', { name: 'Passwort' }).fill(ihkPass);
    await page.getByRole('button', { name: 'Login' }).click();

    // 2. Navigate to "Ausbildungsnachweise"
    console.log("Navigating to Ausbildungsnachweise...");
    await page.getByRole('link', { name: 'Ausbildungsnachweise', exact: true }).click();

    // Wait for content to load
    await page.waitForTimeout(5000);

    // 3. Scrape existing reports
    const parseDate = (dateStr: string) => {
        const [day, month, year] = dateStr.split('.').map(Number);
        return new Date(year, month - 1, day);
    };

    const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const approvedWeeks = new Set<string>();

    // Pattern: DD.MM.YYYY - DD.MM.YYYY
    const datePattern = /(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/;

    const candidates = page.locator('div');
    const count = await candidates.count();
    console.log(`Scanning divs for reports... (Total divs: ${count})`);

    let earliestDate: Date | null = null;
    let foundReports = 0;

    // Track unapproved weeks (weeks that exist but are not "Nachweis genehmigt")
    const pendingApprovalWeeks: string[] = [];

    // Filter by text pattern first to reduce calls
    const rangeLocators = page.getByText(datePattern);
    const rangeCount = await rangeLocators.count();
    console.log(`Found ${rangeCount} elements matching date range pattern.`);

    for (let i = 0; i < rangeCount; i++) {
        const loc = rangeLocators.nth(i);
        const text = await loc.innerText();
        const match = text.match(datePattern);

        if (match) {
            foundReports++;
            const startDateStr = match[1];
            const startDate = parseDate(startDateStr);

            // Normalize to Monday
            const dayOfWeek = startDate.getDay() || 7;
            startDate.setDate(startDate.getDate() - (dayOfWeek - 1));
            const weekKey = formatDate(startDate);

            // Avoid duplicates (if selector matches multiple elements for same date)
            if (approvedWeeks.has(weekKey) || pendingApprovalWeeks.includes(weekKey)) {
                continue;
            }

            if (!earliestDate || startDate < earliestDate) {
                earliestDate = startDate;
            }

            let isApproved = false;

            // Check for "Nachweis genehmigt"
            // Strategy 1: Check if parent text contains it (if they are in same row container)
            const parent = loc.locator('..');
            const parentText = await parent.innerText();
            if (parentText.includes('Nachweis genehmigt')) {
                isApproved = true;
            } else {
                // Strategy 2: Check nearby sibling text
                const grandParent = parent.locator('..');
                const grandParentText = await grandParent.innerText();
                if (grandParentText.includes(match[0]) && grandParentText.includes('Nachweis genehmigt')) {
                    isApproved = true;
                }
            }

            if (isApproved) {
                approvedWeeks.add(weekKey);
                console.log(`Week ${weekKey}: Approved`);
            } else {
                pendingApprovalWeeks.push(weekKey);
                console.log(`Week ${weekKey}: Not yet approved`);
            }
        }
    }

    console.log(`Found ${foundReports} total date ranges.`);
    console.log(`Approved weeks: ${Array.from(approvedWeeks).sort().join(', ')}`);

    if (!earliestDate) {
        console.warn("No existing reports found. Defaulting to 4 weeks ago.");
        earliestDate = new Date();
        earliestDate.setDate(earliestDate.getDate() - 28);
    }

    // 4. Calculate truly missing weeks (gaps)
    const missingWeeks: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(earliestDate);
    // Ensure Monday
    const startDay = checkDate.getDay() || 7;
    checkDate.setDate(checkDate.getDate() - (startDay - 1));

    while (checkDate < today) {
        const checkStr = formatDate(checkDate);

        // If we didn't find this week in the existing reports (approved or pending), it's missing
        // Note: We need a way to track if a week exists AT ALL.
        // The current logic only tracked approvedWeeks. We need to track all found weeks to determine missing ones.
        // Actually, if it's in pendingApprovalWeeks, it's not "missing" (red), it's "pending" (yellow).
        // If it's not in approvedWeeks AND not in pendingApprovalWeeks, it's missing (red).

        const isApproved = approvedWeeks.has(checkStr);
        const isPending = pendingApprovalWeeks.includes(checkStr);

        if (!isApproved && !isPending) {
            missingWeeks.push(checkStr);
        }

        checkDate.setDate(checkDate.getDate() + 7);
    }

    // --- DETERMINE STATUS ---
    // GREEN: All weeks are approved (no missing, no pending).
    // YELLOW: Some weeks are pending approval, but none are completely missing.
    // RED: Some weeks are completely missing (gaps).

    let status = "green";
    let message = "Alles aktuell & genehmigt";

    if (missingWeeks.length > 0) {
        status = "red";
        message = `${missingWeeks.length} Berichte fehlen!`;
    } else if (pendingApprovalWeeks.length > 0) {
        status = "yellow";
        message = `${pendingApprovalWeeks.length} Berichte warten auf Genehmigung`;
    }

    const output = {
        status: status,
        lastChecked: new Date().toISOString(),
        missingCount: missingWeeks.length,
        pendingCount: pendingApprovalWeeks.length,
        message: message,
        details: {
            missing: missingWeeks,
            pending: pendingApprovalWeeks
        }
    };

    // Save to Firebase Database
    const firebaseURL = process.env.FIREBASE_URL;
    const firebaseKey = process.env.FIREBASE_KEY;

    if (firebaseURL && firebaseKey) {
        // Remove trailing slash if present
        const cleanUrl = firebaseURL.endsWith('/') ? firebaseURL.slice(0, -1) : firebaseURL;
        const statusUrl = `${cleanUrl}/status.json?auth=${firebaseKey}`;

        // Debug logging for URL (mask key)
        const maskedUrl = statusUrl.replace(firebaseKey, '***KEY***');
        console.log(`Debug: Sending PUT request to: '${maskedUrl}'`);

        try {
            console.log("Saving status to Firebase...");
            const response = await fetch(statusUrl, {
                method: 'PUT',
                body: JSON.stringify(output),
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                console.log("Status successfully saved to Firebase.");
            } else {
                console.error(`Failed to save to Firebase: ${response.status} ${response.statusText}`);
                const errText = await response.text();
                console.error("Firebase response:", errText);
            }
        } catch (err) {
            console.error("Error saving to Firebase:", err);
        }
    } else {
        console.warn("FIREBASE_URL or FIREBASE_KEY missing in .env. Skipping Firebase update.");

        // Fallback: Still save locally for debugging/legacy reasons if needed, or just log
        // Fix: __dirname is not available in ES modules/Playwright context sometimes, use process.cwd()
        const outputPath = path.resolve(process.cwd(), 'docs/status.json');
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        console.log(`(Fallback) Status saved to ${outputPath}`);
    }

    // 5. Send Alert if RED (Missing Reports)
    if (missingWeeks.length > 0) {
        const msg = `Found ${missingWeeks.length} MISSING reports: ${missingWeeks.join(', ')}`;
        console.error(msg);

        // CHECK IF TODAY IS LAST TUESDAY OF THE MONTH
        const todayFn = new Date();
        const currentMonth = todayFn.getMonth();
        // Check next week (add 7 days)
        const nextWeek = new Date(todayFn);
        nextWeek.setDate(todayFn.getDate() + 7);

        // If next week is in a different month, and today is Tuesday (Day 2), then it is the last Tuesday.
        // Or if user wants specifically "Last Tuesday logic":
        const isTuesday = todayFn.getDay() === 2;
        const isNextWeekNextMonth = nextWeek.getMonth() !== currentMonth;

        // Allow manual override via env var for testing
        const forceMail = process.env.FORCE_MAIL === 'true';

        if ((isTuesday && isNextWeekNextMonth) || forceMail) {
            console.log("Today is the last Tuesday of the month (or FORCE_MAIL is set). Sending alert...");
            await sendAlertEmail(missingWeeks);
        } else {
            console.log("Today is NOT the last Tuesday of the month. Skipping email alert (Status Lamp will still be RED).");
        }

    } else {
        console.log("No missing reports (Red status blocked).");
    }
});

async function sendAlertEmail(missingWeeks: string[]) {
    const host = process.env.EMAIL_HOST;
    const port = parseInt(process.env.EMAIL_PORT || '465');
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const to = process.env.EMAIL_TO || user;

    if (!host || !user || !pass) {
        console.warn("Email configuration missing. Skipping email alert.");
        return;
    }

    console.log(`Sending email alert to ${to}...`);

    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465,
        auth: { user, pass },
    });

    const subject = `⚠️ ALARM: ${missingWeeks.length} Berichtshefte fehlen komplett!`;
    const text = `Achtung!
    
Es wurden ${missingWeeks.length} Wochen gefunden, für die gar kein Berichtsheft-Eintrag existiert.

Betroffene Wochen (Startdatum Montag):
${missingWeeks.map(w => `- ${w}`).join('\n')}

Bitte dringend nachtragen!
    `;

    try {
        await transporter.sendMail({ from: `"Berichtsheft Bot" <${user}>`, to, subject, text });
        console.log("Email sent.");
    } catch (error) {
        console.error("Error sending email:", error);
    }
}
