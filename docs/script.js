firebase.initializeApp(CONFIG.FIREBASE);
const db = firebase.database();
let currentReportId = null;
let allReports = {};

document.addEventListener('DOMContentLoaded', () => {
    const gh = localStorage.getItem('gh_token'), ai = localStorage.getItem('gemini_token');
    if (gh && ai) { showApp(); } else { document.getElementById('authSection').classList.remove('hidden'); }
});

function showApp() {
    document.getElementById('appContent').classList.remove('hidden');
    listenToReports();
    fetchGithubRuns();
    setInterval(fetchGithubRuns, 30000); // Alle 30 Sek. aktualisieren
}

// --- GITHUB RUNS ABFRAGEN ---
// Intervall auf 10 Sekunden verkürzen für mehr "Realtime"-Feeling
setInterval(fetchGithubRuns, 10000); 

async function fetchGithubRuns() {
    const token = localStorage.getItem('gh_token');
    const container = document.getElementById('gh-run-status');
    const url = `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/runs?per_page=3`;

    try {
        const res = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
        const data = await res.json();
        container.innerHTML = '';

        for (const run of data.workflow_runs) {
            const card = document.createElement('div');
            card.className = `run-card ${run.status}`;
            
            let jobInfo = "";
            // Wenn der Run läuft, holen wir die Details der Schritte
            if (run.status === "in_progress" || run.status === "queued") {
                jobInfo = await fetchJobDetails(run.id, token);
            }

            const time = new Date(run.created_at).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit' });
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--accent);">${run.name}</strong>
                    <span class="badge ${run.status}">${run.status}</span>
                </div>
                <div class="job-steps">${jobInfo}</div>
                <div style="color:var(--text-muted); font-size:10px; margin-top:8px;">Start: ${time} Uhr</div>
            `;
            container.appendChild(card);
        }
    } catch (e) { console.error("Status-Fehler:", e); }
}

// Neue Hilfsfunktion für die einzelnen Schritte
async function fetchJobDetails(runId, token) {
    try {
        const res = await fetch(`https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/runs/${runId}/jobs`, {
            headers: { 'Authorization': `token ${token}` }
        });
        const data = await res.json();
        if (!data.jobs) return "";

        return data.jobs.map(job => {
            // Finde den Schritt, der gerade läuft
            const currentStep = job.steps.find(s => s.status === "in_progress") || job.steps.reverse().find(s => s.status === "completed");
            const stepName = currentStep ? `➔ ${currentStep.name}` : "Warten...";
            return `<div class="live-step"><span class="pulse-dot"></span> ${stepName}</div>`;
        }).join("");
    } catch (e) { return "Details nicht verfügbar"; }
}

// --- FIREBASE LOGIK ---
function listenToReports() {
    db.ref('reports').orderByChild('createdAt').on('value', snapshot => {
        const list = document.getElementById('reportList');
        list.innerHTML = '';
        if (!snapshot.exists()) return;
        let reports = [];
        snapshot.forEach(c => reports.push({ id: c.key, ...c.val() }));
        reports.reverse().forEach(r => {
            allReports[r.id] = r;
            const li = document.createElement('li');
            li.className = 'process-item';
            li.onclick = () => openDetail(r.id);
            li.innerHTML = `<div><div style="font-weight:bold;">📄 ${r.dateLabel || r.id}</div><small>${r.createdAt}</small></div><span class="badge ${r.status}">${r.status}</span>`;
            list.appendChild(li);
        });
    });
}

function openDetail(id) {
    currentReportId = id;
    const d = allReports[id];
    document.getElementById('view-list').classList.add('hidden');
    document.getElementById('view-detail').classList.remove('hidden');
    document.getElementById('detailTitle').innerText = d.dateLabel || id;
    const fields = ['evp1','deutsch','stdm','kryp','gid','englisch','evp2'];
    fields.forEach(f => document.getElementById(f).value = d.content ? d.content[f] || '' : '');
    document.getElementById('workActivities').value = d.content?.workActivities || '';
}

function showList() { document.getElementById('view-detail').classList.add('hidden'); document.getElementById('view-list').classList.remove('hidden'); }

// --- KI KORREKTUR (FIX 404 & Embedding Fehler) ---
async function refineSchoolWithAI() {
    const key = localStorage.getItem('gemini_token');
    const btn = document.getElementById('btnAISchool');
    const ids = Array.from(document.querySelectorAll('.subject-select:checked')).map(cb => cb.getAttribute('data-id'));
    if (!ids.length) return alert("Nichts ausgewählt!");

    const data = {}; ids.forEach(id => data[id] = document.getElementById(id).value);
    btn.innerHTML = "⏳ Läuft...";

    try {
        const list = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)).json();
        // FILTER: Nur Modelle, die "generateContent" unterstützen und KEINE Embeddings sind
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
        Object.keys(corrected).forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = corrected[id]; });
        alert("Fertig!");
    } catch (e) { alert("KI Fehler: " + e.message); }
    finally { btn.innerHTML = "🪄 KI Korrektur"; }
}

// RESTLICHE FUNKTIONEN (Trigger Scrape/Upload/Auth...)
function saveTokenAndLogin() {
    localStorage.setItem('gh_token', document.getElementById('ghTokenInput').value);
    localStorage.setItem('gemini_token', document.getElementById('geminiTokenInput').value);
    location.reload();
}

function logout() { localStorage.clear(); location.reload(); }
function toggleAllSubjects(c) { document.querySelectorAll('.subject-select').forEach(cb => cb.checked = c); }

function triggerScrape() {
    const token = localStorage.getItem('gh_token');
    fetch(`https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/workflows/scrape_schedule.yml/dispatches`, {
        method: 'POST', headers: { 'Authorization': `token ${token}` }, body: JSON.stringify({ ref: 'master' }) 
    }).then(() => { alert("Scraper gestartet!"); setTimeout(fetchGithubRuns, 2000); });
}

function triggerUpload() {
    if(!currentReportId) return;
    const token = localStorage.getItem('gh_token');
    const content = {
        evp1: document.getElementById('evp1').value, deutsch: document.getElementById('deutsch').value,
        stdm: document.getElementById('stdm').value, kryp: document.getElementById('kryp').value,
        gid: document.getElementById('gid').value, englisch: document.getElementById('englisch').value,
        evp2: document.getElementById('evp2').value, workActivities: document.getElementById('workActivities').value 
    };
    const url = `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/dispatches`;
    fetch(url, {
        method: 'POST', 
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify({ event_type: 'trigger-ihk-upload', client_payload: { text: JSON.stringify(content), reportId: currentReportId } })
    }).then(() => { alert("Upload-Action gesendet!"); setTimeout(fetchGithubRuns, 2000); });
}

function setSick(day) {
    // Erzeugt aus "montag" -> "Montag"
    const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
    
    // Sicherheitsabfrage
    if (!confirm(`${dayLabel} auf "Krank" setzen?`)) return;

    const mapping = {
        'montag': ['evp1', 'deutsch', 'stdm', 'kryp'],
        'freitag': ['gid', 'englisch', 'evp2']
    };

    const subjects = mapping[day];

    subjects.forEach(id => {
        const field = document.getElementById(id);
        const checkbox = document.querySelector(`.subject-select[data-id="${id}"]`);
        
        if (field) {
            // Setzt den Text auf z.B. "Montag Krank" statt nur "Krank"
            field.value = `${dayLabel} Krank`; 
        }
        
        if (checkbox) {
            // Checkbox abwählen, damit die KI-Korrektur diese Felder ignoriert
            checkbox.checked = false; 
        }
    });
    
    console.log(`${dayLabel} wurde als krank markiert.`);
}