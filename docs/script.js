// --- GLOBALE STATS ---
let currentReportId = null;
let allReports = {}; // Key: ID, Value: Report Data
let sortedReportsList = []; // Array for rendering
let pendingWeeks = []; // List of IDs (dates) that are pending approval
let sickDays = { montag: false, freitag: false };

document.addEventListener('DOMContentLoaded', () => {
    const gh = localStorage.getItem('gh_token'), ai = localStorage.getItem('gemini_token');
    if (gh && ai) { showApp(); } else { document.getElementById('authSection').classList.remove('hidden'); }
});

// Initialisiere Firebase (Sollte nach config.js, aber vor deinem Haupt-Code stehen)
firebase.initializeApp({
    databaseURL: CONFIG.FIREBASE.databaseURL
});

// Das ist die Variable 'db', die dein Skript überall aufruft
const db = firebase.database();

function showApp() {
    document.getElementById('appContent').classList.remove('hidden');
    listenToReports();
    fetchGithubRuns();
    fetchStatus(); // Check status on load
    setInterval(fetchGithubRuns, 10000); // Update GitHub runs
}

// --- STATUS LAMP LOGIK ---
async function fetchStatus() {
    const statusSubmitted = document.getElementById('statusSubmitted');
    const statusApproved = document.getElementById('statusApproved');

    // Use Firebase Realtime Database listener
    db.ref('status').on('value', (snapshot) => {
        const data = snapshot.val();

        // Reset classes
        statusSubmitted.className = 'status-pill';
        statusApproved.className = 'status-pill';

        if (data) {
            // Update Global Pending List
            pendingWeeks = (data.details && data.details.pending) ? data.details.pending : [];

            // Re-render list to update card statuses
            renderReportList();

            // Logic 1: Submitted Status
            if (data.missingCount > 0) {
                statusSubmitted.classList.add('red');
                statusSubmitted.title = `${data.missingCount} Berichte fehlen!`;
            } else {
                statusSubmitted.classList.add('green');
                statusSubmitted.title = "Alle Berichte sind eingetragen.";
            }

            // Logic 2: Approved Status
            if (data.pendingCount > 0) {
                statusApproved.classList.add('yellow');
                statusApproved.title = `${data.pendingCount} Berichte warten auf Genehmigung.`;
            } else {
                statusApproved.classList.add('green');
                statusApproved.title = "Alle Berichte genehmigt.";
            }

        } else {
            statusSubmitted.title = "Status unbekannt";
            statusApproved.title = "Status unbekannt";
        }
    }, (error) => {
        console.warn("Could not fetch status from Firebase:", error);
    });
}


// --- GITHUB RUNS ABFRAGEN (Timeline Style) ---
async function fetchGithubRuns() {
    const token = localStorage.getItem('gh_token');
    const container = document.getElementById('gh-run-status');
    const url = `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/runs?per_page=1`;

    try {
        const res = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
        const data = await res.json();

        if (!data.workflow_runs || data.workflow_runs.length === 0) {
            container.innerHTML = '<p class="placeholder">Keine aktiven Jobs</p>';
            return;
        }

        const run = data.workflow_runs[0];
        container.innerHTML = '';

        const card = document.createElement('div');
        card.className = `run-card ${run.status}`;

        let jobInfo = "";
        if (run.status === "in_progress" || run.status === "queued") {
            jobInfo = await fetchJobDetails(run.id, token);
        } else {
            const iconId = run.conclusion === 'success' ? 'i-check' : 'i-x';
            const cls = run.conclusion === 'success' ? 'completed' : 'failed';
            jobInfo = `<div class="timeline-item ${cls}"><span class="timeline-icon"><svg class="icon icon-sm"><use href="#${iconId}"/></svg></span><div class="timeline-content"><span class="step-name">Job beendet: ${run.conclusion}</span></div></div>`;
        }

        const time = new Date(run.created_at).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit' });

        card.innerHTML = `
            <div class="run-header">
                <div>
                    <strong>${run.name}</strong>
                    <div class="run-meta">Gestartet um ${time} Uhr</div>
                </div>
                <span class="badge ${run.status}">${run.status}</span>
            </div>
            <div class="timeline-container">
                ${jobInfo}
            </div>
        `;
        container.appendChild(card);

    } catch (e) { console.error("Status-Fehler:", e); }
}

async function fetchJobDetails(runId, token) {
    try {
        const res = await fetch(`https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/runs/${runId}/jobs`, {
            headers: { 'Authorization': `token ${token}` }
        });
        const data = await res.json();
        if (!data.jobs) return "";

        let html = "";
        data.jobs.forEach(job => {
            html += `<div class="timeline-job-title">${job.name}</div>`;
            job.steps.forEach(step => {
                let iconId = 'i-circle';
                let statusClass = 'pending';
                if (step.status === 'completed') {
                    iconId = 'i-check';
                    statusClass = 'completed';
                    if (step.conclusion === 'failure') { iconId = 'i-x'; statusClass = 'failed'; }
                } else if (step.status === 'in_progress') {
                    iconId = 'i-loader';
                    statusClass = 'running';
                }
                html += `
                    <div class="timeline-item ${statusClass}">
                        <span class="timeline-icon"><svg class="icon icon-sm"><use href="#${iconId}"/></svg></span>
                        <div class="timeline-content">
                            <span class="step-name">${step.name}</span>
                        </div>
                    </div>
                `;
            });
        });
        return html;
    } catch (e) { return "Details nicht verfügbar"; }
}

// --- FIREBASE LOGIK ---
function listenToReports() {
    db.ref('reports').orderByChild('createdAt').on('value', snapshot => {
        if (!snapshot.exists()) {
            sortedReportsList = [];
            renderReportList();
            return;
        }

        let reports = [];
        snapshot.forEach(c => {
            reports.push({ id: c.key, ...c.val() });
        });

        sortedReportsList = reports.reverse();
        sortedReportsList.forEach(r => allReports[r.id] = r);

        renderReportList();
    });
}

function renderReportList() {
    const list = document.getElementById('reportList');
    list.innerHTML = '';

    sortedReportsList.forEach(r => {
        const li = document.createElement('li');
        li.className = 'process-item';
        li.classList.add('status-' + (r.status || 'waiting'));
        li.onclick = () => openDetail(r.id);

        let statusLabel = r.status;
        let badgeClass = r.status || 'waiting';

        if (pendingWeeks.includes(r.id)) {
            statusLabel = "Ausstehend";
            badgeClass = "pending-approval";
            li.classList.add('is-pending');
        } else {
            if (r.status === 'success') statusLabel = 'Erledigt';
            if (r.status === 'waiting') statusLabel = 'In Bearbeitung';
        }

        const kwMatch = (r.dateLabel || '').match(/KW\s*(\d+)/i);
        const kwLabel = kwMatch ? `KW ${kwMatch[1].padStart(2, '0')}` : (r.id || '');
        const title = r.dateLabel || `Woche ${r.id}`;

        li.innerHTML = `
            <div class="item-header">
                <div>
                    <div class="item-title">${title}</div>
                    <div class="item-kw">${kwLabel}</div>
                </div>
                <span class="badge ${badgeClass}">${statusLabel}</span>
            </div>
            <div class="item-meta">
                <svg class="icon"><use href="#i-calendar"/></svg>
                ${r.createdAt || '—'}
            </div>
            <div class="item-footer">Bearbeiten →</div>
        `;
        list.appendChild(li);
    });
}

function openDetail(id) {
    currentReportId = id;
    const d = allReports[id];
    document.getElementById('view-list').classList.add('hidden');
    document.getElementById('view-detail').classList.remove('hidden');
    document.getElementById('detailTitle').innerText = d.dateLabel || id;

    // Reset Sick State
    sickDays = { montag: false, freitag: false };
    updateSickUI('montag');
    updateSickUI('freitag');

    // Felder füllen
    const fields = ['stdm', 'evp', 'sport', 'wbl', 'englisch', 'deutsch', 'dkrypt'];
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = d.content ? d.content[f] || '' : '';
    });
    document.getElementById('workActivities').value = d.content?.workActivities || '';
}

function showList() {
    document.getElementById('view-detail').classList.add('hidden');
    document.getElementById('view-list').classList.remove('hidden');
}

// --- KI KORREKTUR ---
async function refineSchoolWithAI() {
    const key = localStorage.getItem('gemini_token');
    if (!key) return alert("Kein API Key!");

    const btn = document.getElementById('btnAISchool');

    // Nur Felder nehmen, die sichtbar (nicht krank) und angehakt sind
    const ids = Array.from(document.querySelectorAll('.subject-select:checked')).map(cb => cb.getAttribute('data-id'))
        .filter(id => {
            // Filter raus wenn Tag krank
            if (sickDays.montag && ['stdm', 'evp', 'sport'].includes(id)) return false;
            if (sickDays.freitag && ['wbl', 'englisch', 'deutsch', 'dkrypt'].includes(id)) return false;
            return true;
        });

    if (!ids.length) return alert("Nichts zum Korrigieren ausgewählt (oder Tage sind als 'Krank' markiert).");

    const data = {};
    ids.forEach(id => data[id] = document.getElementById(id).value);

    btn.innerHTML = `<svg class="icon icon-sm"><use href="#i-loader"/></svg> Läuft…`;

    try {
        const list = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)).json();
        const model = list.models.find(m => m.supportedGenerationMethods.includes('generateContent') && !m.name.includes('embedding'))?.name || "models/gemini-pro";

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${key}`, {
            method: 'POST',
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Überarbeite professionell für IHK-Bericht (NUR JSON zurückgeben): ${JSON.stringify(data)}` }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        const resData = await res.json();
        const corrected = JSON.parse(resData.candidates[0].content.parts[0].text.replace(/```json|```/g, ""));
        Object.keys(corrected).forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = corrected[id]; });
        alert("Fertig!");
    } catch (e) { alert("KI Fehler: " + e.message); }
    finally { btn.innerHTML = `<svg class="icon icon-sm"><use href="#i-sparkles"/></svg> KI Korrektur`; }
}

// RESTLICHE FUNKTIONEN
function saveTokenAndLogin() {
    localStorage.setItem('gh_token', document.getElementById('ghTokenInput').value);
    localStorage.setItem('gemini_token', document.getElementById('geminiTokenInput').value);
    location.reload();
}

function logout() { localStorage.clear(); location.reload(); }
function toggleAllSubjects(c) { document.querySelectorAll('.subject-select').forEach(cb => cb.checked = c); }

function triggerScrape() {
    const token = localStorage.getItem('gh_token');
    const dateInput = document.getElementById('scrapeDateInput').value;

    // Payload bauen
    let payload = { ref: 'master' };
    if (dateInput) {
        payload.inputs = { target_date: dateInput };
    }

    fetch(`https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/workflows/scrape_schedule.yml/dispatches`, {
        method: 'POST',
        headers: { 'Authorization': `token ${token}` },
        body: JSON.stringify(payload)
    }).then(() => {
        alert(dateInput ? `Scraper für ${dateInput} gestartet!` : "Scraper gestartet (Standard-Datum)!");
        setTimeout(fetchGithubRuns, 2000);
    });
}

function triggerUpload() {
    if (!currentReportId) return;
    const token = localStorage.getItem('gh_token');

    const content = {
        stdm: document.getElementById('stdm').value,
        evp: document.getElementById('evp').value,
        sport: document.getElementById('sport').value,
        wbl: document.getElementById('wbl').value,
        englisch: document.getElementById('englisch').value,
        deutsch: document.getElementById('deutsch').value,
        dkrypt: document.getElementById('dkrypt').value,
        workActivities: document.getElementById('workActivities').value,
        sickDays: sickDays // NEU: Krank-Status mitsenden
    };

    const url = `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/dispatches`;
    fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify({ event_type: 'trigger-ihk-upload', client_payload: { text: JSON.stringify(content), reportId: currentReportId } })
    }).then(() => { alert("Upload-Action gesendet!"); setTimeout(fetchGithubRuns, 2000); });
}

// --- NEUE SICK LOGIK ---

function setSick(day) {
    if (day === 'montag') sickDays.montag = !sickDays.montag;
    if (day === 'freitag') sickDays.freitag = !sickDays.freitag;

    updateSickUI(day);
}

function updateSickUI(day) {
    const isSick = sickDays[day];
    const mapping = {
        'montag': ['stdm', 'evp', 'sport'],
        'freitag': ['wbl', 'englisch', 'deutsch', 'dkrypt']
    };

    // UI Anpassungen
    const btn = document.querySelector(`button[onclick="setSick('${day}')"]`);
    if (btn) {
        if (isSick) {
            btn.innerHTML = `<svg class="icon icon-sm"><use href="#i-check"/></svg><span class="btn-sick-label">Als Krank markiert</span>`;
            btn.classList.add('active-sick');
        } else {
            btn.innerHTML = `<svg class="icon icon-sm"><use href="#i-thermometer"/></svg><span class="btn-sick-label">Krank</span>`;
            btn.classList.remove('active-sick');
        }
    }

    // Felder deaktivieren/ausgrauen
    mapping[day].forEach(id => {
        const field = document.getElementById(id);
        const box = field.closest('.subject-box');
        if (isSick) {
            box.style.opacity = '0.3';
            box.style.pointerEvents = 'none';
        } else {
            box.style.opacity = '1';
            box.style.pointerEvents = 'all';
        }
    });
}
