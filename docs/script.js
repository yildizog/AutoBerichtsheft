if (!CONFIG || !CONFIG.FIREBASE) alert("Config fehlt!");
firebase.initializeApp(CONFIG.FIREBASE);
const db = firebase.database();

let currentReportId = null;
let allReports = {};

// --- 1. AUTH ---
document.addEventListener('DOMContentLoaded', () => {
    const gh = localStorage.getItem('gh_token');
    const ai = localStorage.getItem('gemini_token');
    if (gh && ai) { showApp(); } else { document.getElementById('authSection').classList.remove('hidden'); }
});

function saveTokenAndLogin() {
    const gh = document.getElementById('ghTokenInput').value;
    const ai = document.getElementById('geminiTokenInput').value;
    if (!gh || !ai) return showToast("Keys fehlen!", "error");
    localStorage.setItem('gh_token', gh);
    localStorage.setItem('gemini_token', ai);
    location.reload();
}

function logout() {
    localStorage.clear();
    location.reload();
}

function showApp() {
    document.getElementById('appContent').classList.remove('hidden');
    listenToReports();
}

// --- 2. FIREBASE ---
function listenToReports() {
    db.ref('reports').orderByChild('createdAt').on('value', (snapshot) => {
        const listEl = document.getElementById('reportList');
        listEl.innerHTML = '';
        allReports = {};
        if (!snapshot.exists()) return listEl.innerHTML = '<li>Keine Berichte gefunden.</li>';

        let reportsArr = [];
        snapshot.forEach(child => { reportsArr.push({ id: child.key, ...child.val() }); });
        reportsArr.reverse();

        reportsArr.forEach(report => {
            allReports[report.id] = report;
            const li = document.createElement('li');
            li.className = 'process-item';
            li.onclick = () => openDetail(report.id);
            li.innerHTML = `<div><h3>📄 ${report.dateLabel || report.id}</h3><small>${report.createdAt}</small></div><span class="badge">${report.status}</span>`;
            listEl.appendChild(li);
        });
    });
}

// --- 3. NAVIGATION ---
function showList() {
    document.getElementById('view-detail').classList.add('hidden');
    document.getElementById('view-list').classList.remove('hidden');
}

function openDetail(id) {
    currentReportId = id;
    const data = allReports[id];
    document.getElementById('view-list').classList.add('hidden');
    document.getElementById('view-detail').classList.remove('hidden');
    
    document.getElementById('detailTitle').innerText = data.dateLabel || id;
    const fields = ['evp1','deutsch','stdm','kryp','gid','englisch','evp2'];
    fields.forEach(f => {
        document.getElementById(f).value = data.content ? data.content[f] || '' : '';
    });
    document.getElementById('workActivities').value = data.content?.workActivities || '';
}

// --- 4. KI FUNKTIONEN ---
async function refineSchoolWithAI() {
    const geminiKey = localStorage.getItem('gemini_token');
    const btn = document.getElementById('btnAISchool');
    const selectedIds = Array.from(document.querySelectorAll('.subject-select:checked')).map(cb => cb.getAttribute('data-id'));

    if (selectedIds.length === 0) return showToast("Wähle ein Fach!", "error");
    
    const dataToRefine = {};
    selectedIds.forEach(id => { dataToRefine[id] = document.getElementById(id).value; });

    btn.innerHTML = "⏳ Läuft...";
    btn.disabled = true;

    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();
        const activeModel = listData.models.find(m => m.name.includes('gemini-1.5-flash'))?.name || "models/gemini-pro";

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${activeModel}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Korrigiere professionell für IHK-Berichtsheft (Antworte NUR mit JSON): ${JSON.stringify(dataToRefine)}` }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        const resData = await response.json();
        if(!resData.candidates) throw new Error("Keine Antwort von KI");
        
        let cleanedText = resData.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
        const corrected = JSON.parse(cleanedText);
        
        Object.keys(corrected).forEach(id => {
            if(document.getElementById(id)) document.getElementById(id).value = corrected[id];
        });
        showToast("Schule korrigiert!", "success");
    } catch (e) {
        showToast("KI Fehler: " + e.message, "error");
    } finally {
        btn.innerHTML = "🪄 KI Korrektur";
        btn.disabled = false;
    }
}

async function refineWithAI() {
    const area = document.getElementById('workActivities');
    const btn = document.getElementById('btnAI');
    const geminiKey = localStorage.getItem('gemini_token');
    if (!area.value) return showToast("Stichpunkte eingeben!", "error");

    btn.innerHTML = "⏳...";
    btn.disabled = true;

    try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
        const listData = await listRes.json();
        const model = listData.models.find(m => m.name.includes('gemini-1.5-flash'))?.name || "models/gemini-pro";

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Formuliere professionell in Stichpunkten für Berichtsheft: ${area.value}` }] }]
            })
        });
        const data = await res.json();
        area.value = data.candidates[0].content.parts[0].text.trim();
        showToast("Betrieb korrigiert!", "success");
    } catch (e) {
        showToast("Fehler!", "error");
    } finally {
        btn.innerHTML = "🪄 KI Überarbeiten";
        btn.disabled = false;
    }
}

// --- 5. GITHUB & MISC ---
function toggleAllSubjects(checked) {
    document.querySelectorAll('.subject-select').forEach(cb => cb.checked = checked);
}

function triggerScrape() {
    const token = localStorage.getItem('gh_token');
    showToast("Scraper startet...", "info");
    fetch(`https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/workflows/scrape_schedule.yml/dispatches`, {
        method: 'POST',
        headers: { 'Authorization': `token ${token}` },
        body: JSON.stringify({ ref: 'master' }) 
    }).then(r => r.ok ? showToast("Läuft!", "success") : showToast("Fehler!", "error"));
}

function triggerUpload() {
    if(!currentReportId) return;
    const content = {
        evp1: document.getElementById('evp1').value,
        deutsch: document.getElementById('deutsch').value,
        stdm: document.getElementById('stdm').value,
        kryp: document.getElementById('kryp').value,
        gid: document.getElementById('gid').value,
        englisch: document.getElementById('englisch').value,
        evp2: document.getElementById('evp2').value,
        workActivities: document.getElementById('workActivities').value 
    };
    sendGithubDispatch('trigger-ihk-upload', { text: JSON.stringify(content), reportId: currentReportId });
}

async function sendGithubDispatch(type, payload) {
    const token = localStorage.getItem('gh_token');
    const url = `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/dispatches`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify({ event_type: type, client_payload: payload })
    });
    res.ok ? showToast("Gesendet!", "success") : showToast("Fehler!", "error");
}

function showToast(msg, type) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}