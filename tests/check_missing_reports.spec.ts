import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';

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

    // Get all divs that might contain the date
    // User snippet: <div class="col-md-8">19.01.2026 - 25.01.2026</div>
    const candidates = page.locator('div');
    const count = await candidates.count();
    console.log(`Scanning divs for reports... (Total divs: ${count})`);

    let earliestDate: Date | null = null;
    let foundReports = 0;

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

            if (!earliestDate || startDate < earliestDate) {
                earliestDate = startDate;
            }

            // Check for "Nachweis genehmigt"
            // Strategy 1: Check if parent text contains it (if they are in same row container)
            const parent = loc.locator('..');
            const parentText = await parent.innerText();
            if (parentText.includes('Nachweis genehmigt')) {
                approvedWeeks.add(weekKey);
                console.log(`Week ${weekKey}: Approved (found in parent block)`);
                continue;
            }

            // Strategy 2: Check nearby sibling text (Scanning nearby text content)
            // Retrieve text content of the parent's parent (grandparent usually covers the row)
            // CAUTION: This might capture too much, but if "Nachweis genehmigt" is unique to this row, it's fine.
            const grandParent = parent.locator('..');
            const grandParentText = await grandParent.innerText();
            if (grandParentText.includes(match[0]) && grandParentText.includes('Nachweis genehmigt')) {
                approvedWeeks.add(weekKey);
                console.log(`Week ${weekKey}: Approved (found in grandparent block)`);
                continue;
            }

            console.log(`Week ${weekKey}: Status NOT approved or 'Nachweis genehmigt' not found nearby.`);
        }
    }

    console.log(`Found ${foundReports} total date ranges.`);
    console.log(`Approved weeks: ${Array.from(approvedWeeks).sort().join(', ')}`);

    if (!earliestDate) {
        console.warn("No existing reports found. Defaulting to 4 weeks ago.");
        earliestDate = new Date();
        earliestDate.setDate(earliestDate.getDate() - 28);
    }

    // 4. Calculate missing/unapproved weeks
    const missingWeeks: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(earliestDate);
    // Ensure Monday
    const startDay = checkDate.getDay() || 7;
    checkDate.setDate(checkDate.getDate() - (startDay - 1));

    while (checkDate < today) {

        // We include all weeks that have started before today.
        // Even if the week is currently ongoing (e.g. checked on Wednesday for Monday),
        // if it's not approved, we might want to know (or at least if user wants to check 26.01 on 01.02).

        const checkStr = formatDate(checkDate);
        if (!approvedWeeks.has(checkStr)) {
            missingWeeks.push(checkStr);
        }

        checkDate.setDate(checkDate.getDate() + 7);
    }

    // 5. Send Alert and Report results
    if (missingWeeks.length > 0) {
        const msg = `Found ${missingWeeks.length} reports that are NOT 'Nachweis genehmigt' (Missing or Open): ${missingWeeks.join(', ')}`;
        console.error(msg);

        // Send Email Alert
        await sendAlertEmail(missingWeeks);

        console.warn("Missing reports found but not failing the test (email alert sent).");
    } else {
        console.log("All past reports are approved ('Nachweis genehmigt').");
    }
});

async function sendAlertEmail(missingWeeks: string[]) {
    const host = process.env.EMAIL_HOST;
    const port = parseInt(process.env.EMAIL_PORT || '465');
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const to = process.env.EMAIL_TO || user; // Default to self

    if (!host || !user || !pass) {
        console.warn("Email configuration missing. Skipping email alert.");
        return;
    }

    console.log(`Sending email alert to ${to}...`);

    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
            user: user,
            pass: pass,
        },
    });

    const subject = `⚠️ ALARM: ${missingWeeks.length} Berichtshefte fehlen/nicht genehmigt!`;
    const text = `Achtung!
    
Es wurden ${missingWeeks.length} Einträge gefunden, die NICHT den Status "Nachweis genehmigt" haben.

Betroffene Wochen (Startdatum Montag):
${missingWeeks.map(w => `- ${w}`).join('\n')}

Bitte dringend prüfen!
    `;

    try {
        const info = await transporter.sendMail({
            from: `"Berichtsheft Bot" <${user}>`,
            to: to,
            subject: subject,
            text: text,
        });
        console.log("Email sent: %s", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
    }
}
