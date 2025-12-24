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
    const ghToken = document.getElementById('ghTokenInput').value;
    const geminiToken = document.getElementById('geminiTokenInput').value;

    if (!ghToken || !geminiToken) {
        return showToast("Bitte beide Keys eingeben!", "error");
    }

    localStorage.setItem('gh_token', ghToken);
    localStorage.setItem('gemini_token', geminiToken);
    
    document.getElementById('authSection').classList.add('hidden');
    showApp();
    showToast("Erfolgreich eingeloggt", "success");
}

function logout() {
    localStorage.removeItem('gh_token');
    localStorage.removeItem('gemini_token');
    location.reload();
}

// Beim Laden prüfen, ob beide Tokens da sind
document.addEventListener('DOMContentLoaded', () => {
    const ghToken = localStorage.getItem('gh_token');
    const geminiToken = localStorage.getItem('gemini_token');
    
    if (ghToken && geminiToken) {
        showApp();
    } else {
        document.getElementById('authSection').classList.remove('hidden');
    }
});

function showApp() {
    document.getElementById('appContent').classList.remove('hidden');
    // Start Listener für Liste
    listenToReports();
}

// --- 2. FIREBASE LISTENER & RENDER ---
function listenToReports() {
    db.ref('reports').orderByChild('createdAt').on('value', (snapshot) => {
        const listEl = document.getElementById('reportList');
        listEl.innerHTML = ''; 
        allReports = {};

        // Blacklist laden
        const hiddenReports = JSON.parse(localStorage.getItem('hidden_reports') || '[]');

        if (!snapshot.exists()) {
            listEl.innerHTML = '<li>Keine Berichte gefunden.</li>';
            return;
        }

        const reportsArr = [];
        snapshot.forEach(child => {
            // NUR hinzufügen, wenn die ID NICHT in hiddenReports ist
            if (!hiddenReports.includes(child.key)) {
                reportsArr.push({ id: child.key, ...child.val() });
            }
        });
        reportsArr.reverse(); // Neuste oben

        reportsArr.forEach(report => {
    allReports[report.id] = report;

    const li = document.createElement('li');
    li.className = 'process-item';
    li.onclick = () => openDetail(report.id);
    
    let badgeClass = 'draft';
    let statusText = report.status;
    if (report.status === 'waiting') { badgeClass = 'waiting'; statusText = '⚠️ Prüfung'; }
    if (report.status === 'success') { badgeClass = 'success'; statusText = '✅ Fertig'; }
    if (report.status === 'failed') { badgeClass = 'failed'; statusText = '❌ Fehler'; }

    li.innerHTML = `
        <div class="process-info">
            <div class="process-title-row">
                <h3>📄 ${report.dateLabel || report.id}</h3>
                <span class="badge ${badgeClass}">${statusText}</span>
            </div>
            <div class="process-date">Erstellt: ${report.createdAt}</div>
        </div>
        <button class="delete-btn" onclick="deleteReport('${report.id}', event)" title="Löschen">
            🗑️
        </button>
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

function deleteReport(id, event) {
    if (event) event.stopPropagation();
    
    // 1. Bestehende Blacklist aus LocalStorage laden
    let hiddenReports = JSON.parse(localStorage.getItem('hidden_reports') || '[]');
    
    // 2. Neue ID hinzufügen, falls noch nicht vorhanden
    if (!hiddenReports.includes(id)) {
        hiddenReports.push(id);
    }
    
    // 3. Zurück in LocalStorage speichern
    localStorage.setItem('hidden_reports', JSON.stringify(hiddenReports));
    
    // 4. UI sofort aktualisieren (einfach die Liste neu rendern)
    // Da wir einen Live-Listener haben, triggern wir einfach ein lokales Update
    location.reload(); // Am einfachsten, oder die render-Funktion manuell aufrufen
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
    const btn = document.querySelector('.btn-hero');
    const token = localStorage.getItem('gh_token');
    
    // 1. Visuellen Status aktivieren
    btn.classList.add('loading');
    const originalText = btn.innerHTML;
    btn.innerHTML = "Wird gestartet...";

    showToast("GitHub Action wird ausgelöst...", "info");

    fetch(`https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/workflows/scrape_schedule.yml/dispatches`, {
        method: 'POST',
        headers: { 'Authorization': `token ${token}` },
        body: JSON.stringify({ ref: 'master' }) 
    })
    .then(r => {
        if(r.ok) {
            showToast("Run erfolgreich gestartet!", "success");
        } else {
            showToast("Fehler beim Starten.", "error");
        }
    })
    .catch(e => {
        showToast("Netzwerkfehler.", "error");
    })
    .finally(() => {
        // 2. Button nach 2 Sekunden wieder normal machen (Zeit für GitHub zum Verarbeiten)
        setTimeout(() => {
            btn.classList.remove('loading');
            btn.innerHTML = originalText;
        }, 2000);
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

// Neue Funktion für schöne Benachrichtigungen
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon Logik
    let icon = 'ℹ️';
    if(type === 'success') icon = '✅';
    if(type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    // Nach 4 Sekunden ausfaden und entfernen
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Überarbeiteter Scraper Trigger (OHNE confirm/alert)
function triggerScrape() {
    const token = localStorage.getItem('gh_token');
    
    // Visuelles Feedback sofort geben
    showToast("Scraper wird gestartet...", "info");

    fetch(`https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/workflows/scrape_schedule.yml/dispatches`, {
        method: 'POST',
        headers: { 'Authorization': `token ${token}` },
        body: JSON.stringify({ ref: 'master' }) 
    }).then(r => {
        if(r.ok) {
            showToast("Scraper läuft! Daten erscheinen gleich.", "success");
        } else {
            showToast("Fehler beim Starten.", "error");
        }
    }).catch(e => {
        showToast("Netzwerkfehler.", "error");
    });
}

// Überarbeiteter Github Dispatch (OHNE alert)
async function sendGithubDispatch(eventType, payload) {
    const token = localStorage.getItem('gh_token');
    if(!token) return showToast("Token fehlt!", "error");

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
        if(!res.ok) throw new Error();
        showToast("Befehl erfolgreich gesendet!", "success");
    } catch(e) {
        showToast("Fehler beim Senden.", "error");
    }
}

async function refineWithAI() {
    const area = document.getElementById('workActivities');
    const btn = document.getElementById('btnAI');
    const input = area.value;
    const geminiKey = localStorage.getItem('gemini_token');

    if (!input) return showToast("Bitte erst Stichpunkte eingeben!", "error");
    if (!geminiKey) return showToast("Gemini Key fehlt!", "error");

    btn.classList.add('loading');
    btn.innerHTML = "<span>⏳</span> KI arbeitet...";

    try {
        // 1. Liste Modelle auf, um den richtigen Pfad zu finden (verhindert 404)
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();

        if (!listData.models) throw new Error("API Key ungültig oder keine Modelle freigeschaltet.");

        const activeModel = listData.models.find(m => m.name.includes('gemini-1.5-flash')) || 
                           listData.models.find(m => m.supportedGenerationMethods.includes('generateContent'));

        if (!activeModel) throw new Error("Kein passendes Modell gefunden.");

        // 2. Der neue Hardprompt für strikte Stichpunkte
        const prompt = `
            Du bist ein Experte für IHK-Berichtshefte (Fachinformatiker). 
            Aufgabe: Formuliere die folgenden Tätigkeiten professionell um.
            
            STRIKTE REGELN:
            1. Antworte AUSSCHLIESSLICH in Stichpunkten (Bulletpoints).
            2. Schreibe NIEMALS ganze Sätze.
            3. Gruppiere zusammengehörige Tätigkeiten mit einer fettgedruckten Überschrift (Thema), gefolgt von den Stichpunkten.
            4. Nutze präzise Fachterminologie.
            
            Beispiel für den gewünschten Stil:
            Berichtsübersicht OKE:
            - Vereinheitlichung des Reports (Abstände, Größen)
            - Designverbesserung
            - Fehlerbehebung
            
            Werbliche Einwilligung:
            - Definition eines neuen Report-Designs
            - Erstellung einer Skizze
            
            Eingabe des Nutzers:
            ${input}
        `;

        const genUrl = `https://generativelanguage.googleapis.com/v1beta/${activeModel.name}:generateContent?key=${geminiKey}`;
        
        const response = await fetch(genUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ 
                    parts: [{ text: prompt }] 
                }]
            })
        });

        const genData = await response.json();
        if (genData.error) throw new Error(genData.error.message);

        const refinedText = genData.candidates[0].content.parts[0].text;
        
        // Ergebnis ins Textfeld schreiben
        area.value = refinedText.trim();
        showToast("In Stichpunkte umgewandelt!", "success");

    } catch (e) {
        console.error("KI-Fehler:", e);
        showToast("Fehler: " + e.message, "error");
    } finally {
        btn.classList.remove('loading');
        btn.innerHTML = "<span>🪄</span> KI Überarbeiten";
    }
}

// Fallback Funktion, falls das Flash-Modell im Account nicht aktiv ist
async function tryFallbackAI(input, key) {
    const area = document.getElementById('workActivities');
    console.log("Flash nicht gefunden, versuche Fallback auf gemini-pro...");
    
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Schreibe dies professionell für ein Berichtsheft um: ${input}` }] }]
            })
        });
        const data = await res.json();
        if (data.candidates) {
            area.value = data.candidates[0].content.parts[0].text.trim();
            showToast("Verbessert (via Fallback-Modell)", "success");
        } else {
            throw new Error("Kein Modell verfügbar");
        }
    } catch (e) {
        showToast("Beide KI-Modelle fehlgeschlagen. Key prüfen!", "error");
    }
}