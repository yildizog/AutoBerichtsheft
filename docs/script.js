// =====================================================================
//  Berichtsheft — frontend logic
// =====================================================================

let currentReportId = null;
let allReports = {};                       // { id: report }
let sortedReportsList = [];                // sorted desc by createdAt
let pendingWeeks = [];                     // ids waiting for IHK approval
let missingWeeks = [];                     // ids that should exist but don't
let sickDays = { montag: false, freitag: false };

let currentFilter = 'all';                 // all | missing | pending | empty
let bulkMode = false;
let bulkSelected = new Set();
let recentRuns = [];

const SUBJECT_FIELDS = ['stdm', 'evp', 'sport', 'wbl', 'englisch', 'deutsch', 'dkrypt'];
const ALL_FIELDS = [...SUBJECT_FIELDS, 'workActivities'];

// =====================================================================
//  BOOT
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
    const gh = localStorage.getItem('gh_token'), ai = localStorage.getItem('gemini_token');
    if (gh && ai) { showApp(); }
    else document.getElementById('authSection').classList.remove('hidden');

    document.addEventListener('keydown', handleHotkeys);
    document.querySelectorAll('#statsStrip .stat').forEach(el => {
        el.addEventListener('click', () => setFilter(el.dataset.filter));
    });
});

firebase.initializeApp({ databaseURL: CONFIG.FIREBASE.databaseURL });
const db = firebase.database();

function showApp() {
    document.getElementById('appContent').classList.remove('hidden');
    listenToReports();
    fetchGithubRuns();
    fetchStatus();
    setInterval(fetchGithubRuns, 10000);
}

// =====================================================================
//  STATUS PILLS + HEADLINE BANNER
// =====================================================================

async function fetchStatus() {
    const submitted = document.getElementById('statusSubmitted');
    const approved = document.getElementById('statusApproved');

    db.ref('status').on('value', snap => {
        const data = snap.val();
        submitted.className = 'status-pill';
        approved.className = 'status-pill';

        if (!data) {
            submitted.title = approved.title = 'Status unbekannt';
            updateHeadline(0, 0);
            return;
        }

        pendingWeeks = data.details?.pending || [];
        missingWeeks = data.details?.missing || [];
        renderReportList();
        updateHeadline(data.missingCount || 0, data.pendingCount || 0);

        if (data.missingCount > 0) {
            submitted.classList.add('red');
            submitted.title = `${data.missingCount} Berichte fehlen`;
        } else {
            submitted.classList.add('green');
            submitted.title = 'Alle Berichte eingetragen';
        }

        if (data.pendingCount > 0) {
            approved.classList.add('yellow');
            approved.title = `${data.pendingCount} Berichte warten auf Genehmigung`;
        } else {
            approved.classList.add('green');
            approved.title = 'Alle Berichte genehmigt';
        }
    }, err => console.warn('Status fetch failed:', err));
}

function updateHeadline(missing, pending) {
    const banner = document.getElementById('headline');
    const text = document.getElementById('headlineText');
    const sub = document.getElementById('headlineSub');
    const jumpBtn = document.getElementById('jumpNextBtn');
    banner.classList.remove('ok', 'warn', 'err');

    if (missing > 0) {
        banner.classList.add('err');
        text.innerHTML = `<strong>${missing}</strong> ${missing === 1 ? 'Bericht fehlt' : 'Berichte fehlen'}`;
        sub.textContent = pending > 0
            ? `${pending} ${pending === 1 ? 'Bericht wartet' : 'Berichte warten'} zusätzlich auf Genehmigung`
            : 'Trage offene Berichte ein, damit dein Heft aktuell ist';
        if (jumpBtn) jumpBtn.style.display = '';
    } else if (pending > 0) {
        banner.classList.add('warn');
        text.innerHTML = `Alles eingetragen`;
        sub.innerHTML = `<strong>${pending}</strong> ${pending === 1 ? 'Bericht wartet' : 'Berichte warten'} auf Genehmigung`;
        if (jumpBtn) jumpBtn.style.display = '';
    } else {
        banner.classList.add('ok');
        text.textContent = `Alles erledigt`;
        sub.textContent = 'Berichte eingetragen und genehmigt';
        if (jumpBtn) jumpBtn.style.display = 'none';
    }
}

// =====================================================================
//  GITHUB AUTOMATION — current run + history
// =====================================================================

async function fetchGithubRuns() {
    const token = localStorage.getItem('gh_token');
    const wrap = document.getElementById('run-current-wrap');
    const histList = document.getElementById('run-history-list');
    if (!token) return;

    try {
        const res = await fetch(
            `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/runs?per_page=8`,
            { headers: { 'Authorization': `token ${token}` } }
        );
        const data = await res.json();
        const runs = data.workflow_runs || [];
        if (!runs.length) {
            wrap.innerHTML = '<div class="run-current"><div class="empty-line">Noch keine Läufe vorhanden</div></div>';
            histList.innerHTML = '<div class="empty-line">Keine Einträge</div>';
            return;
        }

        const current = runs[0];
        const history = runs.slice(1, 6);

        await renderCurrentRun(current, token);
        renderHistory(history);
    } catch (e) {
        console.error('GH fetch error:', e);
    }
}

async function renderCurrentRun(run, token) {
    const wrap = document.getElementById('run-current-wrap');
    const isRunning = run.status === 'in_progress' || run.status === 'queued';
    const stateClass = isRunning ? 'is-running' : (run.conclusion === 'success' ? 'is-success' : run.conclusion === 'failure' ? 'is-failed' : '');

    let steps = [];
    if (isRunning) steps = await fetchJobSteps(run.id, token);

    const total = steps.length || 0;
    const done = steps.filter(s => s.status === 'completed').length;
    const running = steps.find(s => s.status === 'in_progress');
    const pct = total ? Math.round((done / total) * 100) : (run.conclusion === 'success' ? 100 : 0);

    const startedAt = new Date(run.run_started_at || run.created_at);
    const elapsed = formatDuration((Date.now() - startedAt.getTime()) / 1000);

    let etaText = '—';
    if (isRunning && total) {
        const remaining = total - done;
        if (done > 0) {
            const avgPerStep = ((Date.now() - startedAt.getTime()) / 1000) / done;
            etaText = '~' + formatDuration(avgPerStep * remaining);
        }
    } else if (run.updated_at) {
        const dur = (new Date(run.updated_at) - startedAt) / 1000;
        etaText = formatDuration(dur);
    }

    const stateLabel = isRunning
        ? (running ? `Läuft — ${running.name}` : 'Gestartet')
        : (run.conclusion === 'success' ? 'Erfolgreich' : run.conclusion === 'failure' ? 'Fehlgeschlagen' : (run.conclusion || run.status));

    let stepsHtml = '';
    if (steps.length) {
        stepsHtml = steps.map(s => {
            let cls = 'pending';
            if (s.status === 'completed') {
                cls = s.conclusion === 'failure' ? 'failed' : 'done';
            } else if (s.status === 'in_progress') {
                cls = 'running';
            }
            const t = s.started_at && s.completed_at
                ? formatDuration((new Date(s.completed_at) - new Date(s.started_at)) / 1000)
                : (s.status === 'in_progress' ? 'läuft…' : '');
            return `<div class="step ${cls}"><span class="marker"></span><div class="name">${escape(s.name)}</div><div class="t">${t}</div></div>`;
        }).join('');
    } else if (!isRunning) {
        const cls = run.conclusion === 'failure' ? 'failed' : 'done';
        const label = run.conclusion === 'success' ? 'Lauf erfolgreich beendet' : run.conclusion === 'failure' ? 'Lauf fehlgeschlagen' : `Lauf beendet — ${escape(run.conclusion || 'unbekannt')}`;
        stepsHtml = `<div class="step ${cls}"><span class="marker"></span><div class="name">${label}</div><div class="t">${etaText}</div></div>`;
    }

    wrap.innerHTML = `
        <div class="run-current ${stateClass}">
            <div class="run-meta">
                <div>
                    <div class="run-name">${escape(run.name || 'Workflow')}</div>
                    <div class="run-sub">#${run.run_number} · ${stateLabel}</div>
                </div>
                <a class="icon-btn" href="${run.html_url}" target="_blank" rel="noopener" title="In GitHub öffnen">
                    <svg><use href="#i-ext"/></svg>
                </a>
            </div>
            <div class="run-progress"><i style="width:${pct}%"></i></div>
            <div class="run-stats">
                <div class="run-stat"><div class="k">Fortschritt</div><div class="v">${done}/${total || '—'}</div></div>
                <div class="run-stat"><div class="k">Laufzeit</div><div class="v">${elapsed}</div></div>
                <div class="run-stat"><div class="k">${isRunning ? 'ETA' : 'Dauer'}</div><div class="v">${etaText}</div></div>
            </div>
            <div class="steps">${stepsHtml || '<div class="step pending"><span class="marker"></span><div class="name">Keine Schritte verfügbar</div><div class="t"></div></div>'}</div>
        </div>
    `;
}

async function fetchJobSteps(runId, token) {
    try {
        const res = await fetch(
            `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/runs/${runId}/jobs`,
            { headers: { 'Authorization': `token ${token}` } }
        );
        const data = await res.json();
        if (!data.jobs) return [];
        return data.jobs.flatMap(j => j.steps || []);
    } catch (e) { return []; }
}

function renderHistory(runs) {
    const list = document.getElementById('run-history-list');
    if (!runs.length) {
        list.innerHTML = '<div class="empty-line">Keine Einträge</div>';
        return;
    }
    list.innerHTML = runs.map(r => {
        const cls = r.conclusion === 'success' ? 'ok' : (r.conclusion === 'failure' ? 'err' : 'warn');
        const when = relTime(new Date(r.created_at));
        return `
            <div class="history-row ${cls}">
                <div class="swatch"></div>
                <div class="label">#${r.run_number} ${escape(r.name || '')}</div>
                <a class="when" href="${r.html_url}" target="_blank" rel="noopener">${when}</a>
            </div>
        `;
    }).join('');
}

// =====================================================================
//  REPORTS — load, classify, render
// =====================================================================

function listenToReports() {
    db.ref('reports').orderByChild('createdAt').on('value', snap => {
        if (!snap.exists()) {
            sortedReportsList = [];
            allReports = {};
            renderReportList();
            return;
        }
        const arr = [];
        snap.forEach(c => arr.push({ id: c.key, ...c.val() }));
        sortedReportsList = arr.reverse();
        allReports = {};
        sortedReportsList.forEach(r => allReports[r.id] = r);
        renderReportList();
    });
}

function classifyReport(r) {
    const flags = { empty: false, partial: false, duplicate: false, pending: false };

    const c = r.content || {};
    const filled = ALL_FIELDS.filter(f => (c[f] || '').toString().trim().length > 0).length;
    const fillPct = Math.round((filled / ALL_FIELDS.length) * 100);

    if (filled === 0) flags.empty = true;
    else if (fillPct < 50) flags.partial = true;

    const dateKey = r.dateLabel || r.id;
    if (pendingWeeks.includes(dateKey) || pendingWeeks.includes(r.id)) flags.pending = true;

    return { flags, fillPct, filled, dateKey };
}

function findDuplicates() {
    const groups = {};
    sortedReportsList.forEach(r => {
        const key = r.dateLabel || r.id;
        (groups[key] = groups[key] || []).push(r);
    });
    return Object.entries(groups)
        .filter(([_, arr]) => arr.length > 1)
        .map(([key, arr]) => ({ key, items: arr }));
}

function renderReportList() {
    const container = document.getElementById('reportList');
    container.innerHTML = '';

    const dupGroups = findDuplicates();
    const duplicateIds = new Set();
    dupGroups.forEach(g => g.items.forEach(r => duplicateIds.add(r.id)));

    // build classified items
    const classified = sortedReportsList.map(r => {
        const meta = classifyReport(r);
        meta.flags.duplicate = duplicateIds.has(r.id);
        return { r, meta };
    });

    // stats
    const total = classified.length;
    const pending = classified.filter(x => x.meta.flags.pending).length;
    const empty = classified.filter(x => x.meta.flags.empty || x.meta.flags.partial).length;
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statEmpty').textContent = empty;
    document.getElementById('statMissing').textContent = missingWeeks.length;
    document.getElementById('archiveCount').textContent = total;

    // filter
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    let filtered = classified.filter(({ r, meta }) => {
        if (currentFilter === 'pending' && !meta.flags.pending) return false;
        if (currentFilter === 'empty' && !(meta.flags.empty || meta.flags.partial)) return false;
        if (currentFilter === 'missing') return false; // missing handled separately below
        if (q) {
            const hay = [
                r.dateLabel, r.id, r.status,
                ...Object.values(r.content || {})
            ].join(' ').toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    // missing weeks (synthetic rows)
    if (currentFilter === 'all' || currentFilter === 'missing') {
        if (missingWeeks.length) {
            const head = document.createElement('div');
            head.className = 'month-head';
            head.innerHTML = `<span>Fehlende Berichte</span><span class="count">${missingWeeks.length}</span>`;
            container.appendChild(head);

            missingWeeks.forEach(date => {
                const row = document.createElement('div');
                row.className = 'report-row is-empty';
                row.innerHTML = `
                    <div></div>
                    <div class="report-date mono">${escape(date)}</div>
                    <div class="report-title">
                        <span class="week-label">Noch nicht eingetragen</span>
                        <span class="report-flags"><span class="flag empty">missing</span></span>
                    </div>
                    <div class="fillbar"><div class="fillbar-track"><i style="width:0%"></i></div><span class="fillbar-pct">0%</span></div>
                    <div><span class="status-tag err">Fehlt</span></div>
                `;
                row.onclick = () => {
                    document.getElementById('scrapeDateInput').value = date;
                    showToast(`Datum gesetzt: ${date}. Klicke "Holen".`, 'warn');
                };
                container.appendChild(row);
            });
        }
    }

    if (currentFilter === 'missing') {
        if (!missingWeeks.length) {
            container.innerHTML = '<div class="empty-line">Alles eingetragen — nichts fehlt</div>';
        }
        return;
    }

    if (!filtered.length) {
        const div = document.createElement('div');
        div.className = 'empty-line';
        div.textContent = q ? `Keine Treffer für „${q}"` : 'Keine Berichte';
        container.appendChild(div);
        return;
    }

    // group by month
    const byMonth = {};
    filtered.forEach(item => {
        const d = item.meta.dateKey;
        const month = (d || '').slice(0, 7) || 'unbekannt';
        (byMonth[month] = byMonth[month] || []).push(item);
    });

    Object.entries(byMonth)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .forEach(([month, items]) => {
            const head = document.createElement('div');
            head.className = 'month-head';
            head.innerHTML = `<span>${formatMonth(month)}</span><span class="count">${items.length}</span>`;
            container.appendChild(head);

            items.forEach(({ r, meta }) => container.appendChild(buildRow(r, meta)));
        });
}

function buildRow(r, meta) {
    const row = document.createElement('div');
    row.className = 'report-row';
    if (meta.flags.empty) row.classList.add('is-empty');
    if (meta.flags.pending) row.classList.add('is-pending');
    if (meta.flags.duplicate) row.classList.add('is-duplicate');
    if (bulkSelected.has(r.id)) row.classList.add('selected');

    const flags = [];
    if (meta.flags.duplicate) flags.push('<span class="flag duplicate">Duplikat</span>');
    if (meta.flags.empty) flags.push('<span class="flag empty">Leer</span>');
    else if (meta.flags.partial) flags.push('<span class="flag partial">Unvollständig</span>');

    let statusTag;
    if (meta.flags.pending) statusTag = '<span class="status-tag pending">Genehmigung</span>';
    else if (r.status === 'success') statusTag = '<span class="status-tag ok">Erledigt</span>';
    else if (r.status === 'in_progress' || r.status === 'running') statusTag = '<span class="status-tag running">Läuft</span>';
    else if (r.status === 'failed' || r.status === 'failure') statusTag = '<span class="status-tag err">Fehler</span>';
    else if (meta.flags.empty) statusTag = '<span class="status-tag warn">Leer</span>';
    else statusTag = `<span class="status-tag">${escape(r.status || 'offen')}</span>`;

    const fillCls = meta.fillPct < 1 ? 'err' : (meta.fillPct < 50 ? 'warn' : '');
    const checkbox = bulkMode
        ? `<input type="checkbox" class="report-checkbox" ${bulkSelected.has(r.id) ? 'checked' : ''}>`
        : '<div></div>';

    row.innerHTML = `
        ${checkbox}
        <div class="report-date mono">${escape(r.dateLabel || r.id)}</div>
        <div class="report-title">
            <span class="week-label">${escape(r.dateLabel ? `Woche ${r.dateLabel}` : r.id)}</span>
            <span class="report-flags">${flags.join('')}</span>
        </div>
        <div class="fillbar ${fillCls}">
            <div class="fillbar-track"><i style="width:${meta.fillPct}%"></i></div>
            <span class="fillbar-pct">${meta.fillPct}%</span>
        </div>
        <div>${statusTag}</div>
    `;

    if (bulkMode) {
        const cb = row.querySelector('.report-checkbox');
        cb.addEventListener('click', e => {
            e.stopPropagation();
            if (cb.checked) bulkSelected.add(r.id); else bulkSelected.delete(r.id);
            updateBulkBar();
            row.classList.toggle('selected', cb.checked);
        });
        row.onclick = () => cb.click();
    } else {
        row.onclick = () => openDetail(r.id);
    }
    return row;
}

function setFilter(f) {
    currentFilter = f;
    document.querySelectorAll('#statsStrip .stat').forEach(el => {
        el.classList.toggle('active', el.dataset.filter === f);
    });
    renderReportList();
}

// =====================================================================
//  BULK MODE / DELETE
// =====================================================================

function toggleBulkMode() {
    bulkMode = !bulkMode;
    if (!bulkMode) bulkSelected.clear();
    document.getElementById('bulkbar').classList.toggle('show', bulkMode);
    const btn = document.getElementById('bulkToggleBtn');
    if (btn) btn.textContent = bulkMode ? 'Fertig' : 'Auswählen';
    updateBulkBar();
    renderReportList();
}

function clearBulkSelection() {
    bulkSelected.clear();
    updateBulkBar();
    renderReportList();
}

function updateBulkBar() {
    document.getElementById('bulkCount').textContent = bulkSelected.size;
}

async function bulkDelete() {
    if (!bulkSelected.size) return;
    if (!confirm(`${bulkSelected.size} Bericht(e) wirklich löschen?`)) return;
    const ids = [...bulkSelected];
    try {
        const updates = {};
        ids.forEach(id => { updates[`/reports/${id}`] = null; });
        await db.ref().update(updates);
        showToast(`${ids.length} gelöscht`, 'ok');
        bulkSelected.clear();
        bulkMode = false;
        document.getElementById('bulkbar').classList.remove('show');
    } catch (e) {
        showToast('Löschen fehlgeschlagen: ' + e.message, 'err');
    }
}

// =====================================================================
//  DUPLICATES
// =====================================================================

function findAndShowDuplicates() {
    const groups = findDuplicates();
    const body = document.getElementById('dupModalBody');
    if (!groups.length) {
        body.innerHTML = '<p style="color:var(--fg-2)">Keine Duplikate gefunden.</p>';
    } else {
        body.innerHTML = groups.map(g => `
            <div style="border:1px solid var(--line); padding:14px; margin-bottom:10px; border-radius:var(--r-md); background:var(--bg-2);">
                <div style="font-size:14px; font-weight:600; color:var(--fg); margin-bottom:10px;">${escape(g.key)}</div>
                ${g.items.map(it => `
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding:8px 0; border-top:1px solid var(--line)">
                        <span style="font-size:12px; color:var(--muted)">${escape(it.createdAt || 'Unbekanntes Datum')}</span>
                        <button class="btn-ghost danger" onclick="deleteOne('${it.id}')">Löschen</button>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }
    document.getElementById('dupModal').classList.add('show');
}

function closeDupModal() {
    document.getElementById('dupModal').classList.remove('show');
}

async function deleteOne(id) {
    if (!confirm(`Bericht ${id} löschen?`)) return;
    try {
        await db.ref(`reports/${id}`).remove();
        showToast('Bericht gelöscht', 'ok');
        findAndShowDuplicates();
    } catch (e) {
        showToast('Fehler: ' + e.message, 'err');
    }
}

// =====================================================================
//  JUMP TO NEXT ACTIONABLE
// =====================================================================

function jumpToNextActionable() {
    if (missingWeeks.length) {
        setFilter('missing');
        showToast(`${missingWeeks.length} fehlende Berichte`, 'warn');
        return;
    }
    const empty = sortedReportsList.find(r => {
        const c = r.content || {};
        return ALL_FIELDS.every(f => !(c[f] || '').toString().trim());
    });
    if (empty) {
        setFilter('empty');
        showToast(`Leere Berichte gefiltert`, 'warn');
        return;
    }
    if (pendingWeeks.length) {
        setFilter('pending');
        showToast(`${pendingWeeks.length} warten auf Genehmigung`, 'warn');
        return;
    }
    showToast('Alles erledigt — nichts offen', 'ok');
}

// =====================================================================
//  DETAIL VIEW
// =====================================================================

function openDetail(id) {
    currentReportId = id;
    const d = allReports[id];
    if (!d) return;
    document.getElementById('view-list').classList.add('hidden');
    document.getElementById('view-detail').classList.remove('hidden');
    document.getElementById('detailTitle').textContent = d.dateLabel || id;

    const meta = classifyReport(d);
    const tag = document.getElementById('detailStatus');
    if (meta.flags.pending) { tag.className = 'status-tag pending'; tag.textContent = 'Genehmigung ausstehend'; }
    else if (d.status === 'success') { tag.className = 'status-tag ok'; tag.textContent = 'Erledigt'; }
    else if (meta.flags.empty) { tag.className = 'status-tag warn'; tag.textContent = 'Leer'; }
    else { tag.className = 'status-tag'; tag.textContent = d.status || 'offen'; }

    sickDays = { montag: false, freitag: false };
    updateSickUI('montag');
    updateSickUI('freitag');

    SUBJECT_FIELDS.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = d.content ? (d.content[f] || '') : '';
    });
    document.getElementById('workActivities').value = d.content?.workActivities || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showList() {
    document.getElementById('view-detail').classList.add('hidden');
    document.getElementById('view-list').classList.remove('hidden');
    currentReportId = null;
}

// =====================================================================
//  KI KORREKTUR
// =====================================================================

async function refineSchoolWithAI() {
    const key = localStorage.getItem('gemini_token');
    if (!key) return showToast('Kein API Key', 'err');

    const btn = document.getElementById('btnAISchool');
    const ids = Array.from(document.querySelectorAll('.subject-select:checked'))
        .map(cb => cb.getAttribute('data-id'))
        .filter(id => {
            if (sickDays.montag && ['stdm', 'evp', 'sport'].includes(id)) return false;
            if (sickDays.freitag && ['wbl', 'englisch', 'deutsch', 'dkrypt'].includes(id)) return false;
            return true;
        });
    if (!ids.length) return showToast('Nichts ausgewählt', 'warn');

    const data = {};
    ids.forEach(id => data[id] = document.getElementById(id).value);
    const orig = btn.innerHTML;
    btn.innerHTML = 'läuft...';

    try {
        const list = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)).json();
        const model = list.models.find(m => m.supportedGenerationMethods.includes('generateContent') && !m.name.includes('embedding'))?.name || 'models/gemini-pro';
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${key}`, {
            method: 'POST',
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Überarbeite professionell für IHK-Bericht (NUR JSON zurückgeben): ${JSON.stringify(data)}` }] }],
                generationConfig: { response_mime_type: 'application/json' }
            })
        });
        const resData = await res.json();
        const corrected = JSON.parse(resData.candidates[0].content.parts[0].text.replace(/```json|```/g, ''));
        Object.keys(corrected).forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = corrected[id]; });
        showToast('KI fertig', 'ok');
    } catch (e) {
        showToast('KI Fehler: ' + e.message, 'err');
    } finally {
        btn.innerHTML = orig;
    }
}

async function refineWithAI() {
    const key = localStorage.getItem('gemini_token');
    if (!key) return showToast('Kein API Key', 'err');
    const ta = document.getElementById('workActivities');
    const text = ta.value.trim();
    if (!text) return showToast('Kein Text', 'warn');
    const btn = document.getElementById('btnAI');
    const orig = btn.innerHTML;
    btn.innerHTML = 'läuft...';
    try {
        const list = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)).json();
        const model = list.models.find(m => m.supportedGenerationMethods.includes('generateContent') && !m.name.includes('embedding'))?.name || 'models/gemini-pro';
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${key}`, {
            method: 'POST',
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Überarbeite folgende Stichpunkte zu professionellen betrieblichen Tätigkeiten für IHK-Berichtsheft (Fließtext, deutsch, knapp): ${text}` }] }]
            })
        });
        const data = await res.json();
        ta.value = data.candidates[0].content.parts[0].text.trim();
        showToast('KI fertig', 'ok');
    } catch (e) {
        showToast('KI Fehler: ' + e.message, 'err');
    } finally {
        btn.innerHTML = orig;
    }
}

// =====================================================================
//  AUTH / TRIGGERS
// =====================================================================

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
    const payload = { ref: 'master' };
    if (dateInput) payload.inputs = { target_date: dateInput };

    fetch(`https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/actions/workflows/scrape_schedule.yml/dispatches`, {
        method: 'POST',
        headers: { 'Authorization': `token ${token}` },
        body: JSON.stringify(payload)
    }).then(() => {
        showToast(dateInput ? `Scraper für ${dateInput}` : 'Scraper gestartet', 'ok');
        setTimeout(fetchGithubRuns, 2000);
    }).catch(e => showToast('Trigger-Fehler: ' + e.message, 'err'));
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
        sickDays
    };
    fetch(`https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/dispatches`, {
        method: 'POST',
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify({ event_type: 'trigger-ihk-upload', client_payload: { text: JSON.stringify(content), reportId: currentReportId } })
    }).then(() => {
        showToast('Upload-Action gesendet', 'ok');
        setTimeout(fetchGithubRuns, 2000);
    }).catch(e => showToast('Fehler: ' + e.message, 'err'));
}

// =====================================================================
//  SICK LOGIK
// =====================================================================

function setSick(day) {
    sickDays[day] = !sickDays[day];
    updateSickUI(day);
}

function updateSickUI(day) {
    const isSick = sickDays[day];
    const btn = document.querySelector(`button[onclick="setSick('${day}')"]`);
    if (btn) {
        btn.textContent = isSick ? 'Krank ✓' : 'Krank melden';
        btn.classList.toggle('is-sick', isSick);
    }
    document.querySelectorAll(`.subject[data-day="${day}"]`).forEach(box => {
        box.classList.toggle('is-disabled', isSick);
    });
}

// =====================================================================
//  HOTKEYS
// =====================================================================

function handleHotkeys(e) {
    const inDetail = !document.getElementById('view-detail').classList.contains('hidden');
    if (e.key === 'Escape') {
        if (document.getElementById('dupModal').classList.contains('show')) return closeDupModal();
        if (inDetail) showList();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && inDetail) {
        e.preventDefault();
        triggerUpload();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !inDetail) {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
    }
}

// =====================================================================
//  TOASTS
// =====================================================================

function showToast(msg, type = '') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .25s'; }, 2500);
    setTimeout(() => t.remove(), 2800);
}

// =====================================================================
//  HELPERS
// =====================================================================

function escape(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDuration(sec) {
    if (!isFinite(sec) || sec < 0) return '—';
    if (sec < 60) return Math.round(sec) + 's';
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
}

function relTime(date) {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'gerade eben';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return Math.floor(diff / 86400) + 'd';
}

function formatMonth(yyyymm) {
    if (!/^\d{4}-\d{2}$/.test(yyyymm)) return yyyymm;
    const [y, m] = yyyymm.split('-').map(Number);
    const names = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return `${names[m - 1]} ${y}`;
}
