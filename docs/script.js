// script.js
if (!CONFIG || !CONFIG.FIREBASE) alert("Config fehlt!");
firebase.initializeApp(CONFIG.FIREBASE);
const db = firebase.database();

// Globale Variablen
let currentReportId = null; // Welche Woche schauen wir gerade an?
let allReports = {}; // Lokaler Speicher für die Daten

// --- 1. AUTH LOGIK ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('gh_token');
    if (token) {
        showApp();
    } else {
        document.getElementById('authSection').classList.remove('hidden');
    }
});

function saveTokenAndLogin() {
    const token = document.getElementById('ghTokenInput').value;
    if (!token) return alert("Bitte Token eingeben");
    localStorage.setItem('gh_token', token);
    document.getElementById('authSection').classList.add('hidden');
    showApp();
}

function logout() {
    localStorage.removeItem('gh_token');
    location.reload();
}

function showApp() {
    document.getElementById('appContent').classList.remove('hidden');
    // Start Listener für Liste
    listenToReports();
}

// --- 2. FIREBASE LISTENER & RENDER ---
function listenToReports() {
    // Wir hören jetzt auf 'reports' statt 'status'
    db.ref('reports').orderByChild('createdAt').on('value', (snapshot) => {
        const listEl = document.getElementById('reportList');
        listEl.innerHTML = ''; // Liste leeren
        allReports = {};

        if (!snapshot.exists()) {
            listEl.innerHTML = '<li style="text-align:center; padding:20px;">Keine Berichte gefunden. Starte einen neuen Run!</li>';
            return;
        }

        // Firebase liefert Objekte, wir machen ein Array draus und sortieren es (neuste zuerst)
        const reportsArr = [];
        snapshot.forEach(child => {
            reportsArr.push({ id: child.key, ...child.val() });
        });
        reportsArr.reverse(); // Neuste oben

        reportsArr.forEach(report => {
            allReports[report.id] = report; // Speichern für Detailansicht

            const li = document.createElement('li');
            li.className = 'process-item';
            li.onclick = () => openDetail(report.id);
            
            // Status Farben Logik
            let badgeClass = 'draft';
            let statusText = report.status;
            if (report.status === 'waiting') { badgeClass = 'waiting'; statusText = '⚠️ Prüfung nötig'; }
            if (report.status === 'success') { badgeClass = 'success'; statusText = '✅ Eingetragen'; }
            if (report.status === 'failed') { badgeClass = 'failed'; statusText = '❌ Fehler'; }

            li.innerHTML = `
                <div class="process-info">
                    <h3>📄 Bericht: ${report.dateLabel || report.id}</h3>
                    <div class="process-date">Erstellt am: ${report.createdAt}</div>
                </div>
                <span class="badge ${badgeClass}">${statusText}</span>
            `;
            listEl.appendChild(li);
        });

        // Falls wir gerade im Detail-View sind, update auch die Felder live
        if (currentReportId && allReports[currentReportId]) {
            fillDetailView(allReports[currentReportId]);
        }
    });
}

// --- 3. VIEW NAVIGATION ---
function showList() {
    document.getElementById('view-detail').classList.add('hidden');
    document.getElementById('view-list').classList.remove('hidden');
    currentReportId = null;
}

function openDetail(id) {
    currentReportId = id;
    const data = allReports[id];
    
    document.getElementById('view-list').classList.add('hidden');
    document.getElementById('view-detail').classList.remove('hidden');
    
    fillDetailView(data);
}

function fillDetailView(data) {
    document.getElementById('detailTitle').innerText = data.dateLabel || data.id;
    document.getElementById('detailStatus').innerText = data.status.toUpperCase();
    document.getElementById('detailStatus').className = `badge ${data.status}`;
    document.getElementById('detailLog').innerText = data.message || '';

    // Felder füllen
    const fields = ['evp1','deutsch','stdm','kryp','gid','englisch','evp2'];
    const content = data.content || {};
    fields.forEach(key => {
        const el = document.getElementById(key);
        // Nur updaten wenn User nicht tippt
        if (document.activeElement !== el) {
            el.value = content[key] || '';
        }
    });
}

// --- 4. ACTIONS (GITHUB TRIGGER) ---
async function sendGithubDispatch(eventType, payload) {
    const token = localStorage.getItem('gh_token');
    if(!token) return alert("Token fehlt! Bitte ausloggen und neu eingeben.");

    const url = `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/dispatches`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Authorization': `token ${token}`, 
                'Accept': 'application/vnd.github.v3+json' 
            },
            body: JSON.stringify({
                event_type: eventType,
                client_payload: payload
            })
        });
        if(!res.ok) throw new Error(`Fehler ${res.status}`);
        alert("Befehl gesendet!");
    } catch(e) {
        alert("Fehler beim Senden: " + e.message);
    }
}

// Button: Neuer Bericht (Run 1)
function triggerScrape() {
    if(!confirm("Möchtest du WebUntis scrapen und einen neuen Bericht anlegen?")) return;
    // Wir senden 'trigger-scrape', die YAML muss darauf reagieren (siehe unten)
    // ODER wir nutzen den vorhandenen Workflow.
    // Einfachheitshalber nutzen wir den bestehenden Schedule Workflow manuell:
    const token = localStorage.getItem('gh_token');
    fetch(`https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/workflows/scrape_schedule.yml/dispatches`, {
        method: 'POST',
        headers: { 'Authorization': `token ${token}` },
        body: JSON.stringify({ ref: 'master' }) // WICHTIG: Branch prüfen!
    }).then(r => {
        if(r.ok) alert("Scraper gestartet! Warte auf neuen Eintrag in der Liste...");
        else alert("Fehler beim Starten");
    });
}

// Button: Upload (Run 2)
function triggerUpload() {
    if(!currentReportId) return;
    
    const content = {
        evp1: document.getElementById('evp1').value,
        deutsch: document.getElementById('deutsch').value,
        stdm: document.getElementById('stdm').value,
        kryp: document.getElementById('kryp').value,
        gid: document.getElementById('gid').value,
        englisch: document.getElementById('englisch').value,
        evp2: document.getElementById('evp2').value
    };

    // WICHTIG: Wir senden jetzt auch die ID mit, damit der Uploader weiß, 
    // welchen Status er in Firebase updaten muss!
    sendGithubDispatch('trigger-ihk-upload', {
        text: JSON.stringify(content),
        reportId: currentReportId
    });
}