if (!CONFIG || !CONFIG.FIREBASE) alert("Config fehlt!");
firebase.initializeApp(CONFIG.FIREBASE);
const db = firebase.database();

// Token beim Laden wiederherstellen
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('gh_token');
    if (savedToken) document.getElementById('ghToken').value = savedToken;
});

function saveToken() {
    const token = document.getElementById('ghToken').value;
    if (token) localStorage.setItem('gh_token', token);
}

// Listener für Updates
db.ref('status').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    document.getElementById('statusMessage').innerText = data.message;
    document.getElementById('lastRunDate').innerText = data.lastRun;
    
    const badge = document.getElementById('statusBadge');
    badge.className = `status-badge status-${data.status}`;
    badge.innerText = data.status.toUpperCase();

    const editor = document.getElementById('editorCard');
    const spinner = document.getElementById('mainSpinner');
    
    if (data.status === 'running') spinner.style.display = 'block';
    else spinner.style.display = 'none';

    if (data.content && typeof data.content === 'object') {
        editor.style.display = 'block';
        ['evp1','deutsch','stdm','kryp','gid','englisch','evp2'].forEach(key => {
            if(document.activeElement.id !== key) document.getElementById(key).value = data.content[key] || '';
        });
    }
});

async function triggerAction(url, body) {
    saveToken(); // Speichern!
    const token = document.getElementById('ghToken').value;
    if(!token) return alert("Token fehlt!");
    
    db.ref('status').update({ status: 'running', message: 'Starte GitHub Action...' });
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
            body: JSON.stringify(body)
        });
        if(!res.ok) throw new Error("GitHub Error: " + res.status);
        alert("Gestartet!");
    } catch(e) {
        alert(e.message);
        db.ref('status').update({ status: 'failed', message: 'Trigger fehlgeschlagen' });
    }
}

function startExtractRun() {
    triggerAction(
        `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/workflows/scrape_schedule.yml/dispatches`,
        { ref: 'main' }
    );
}

function startSubmitRun() {
    const content = {
        evp1: document.getElementById('evp1').value,
        deutsch: document.getElementById('deutsch').value,
        stdm: document.getElementById('stdm').value,
        kryp: document.getElementById('kryp').value,
        gid: document.getElementById('gid').value,
        englisch: document.getElementById('englisch').value,
        evp2: document.getElementById('evp2').value
    };
    triggerAction(
        `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/dispatches`,
        { event_type: 'trigger-ihk-upload', client_payload: { text: JSON.stringify(content) } }
    );
}