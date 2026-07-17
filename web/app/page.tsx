'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import { Report, StatusDoc } from '@/lib/types';
import { GithubJob, GithubRun } from '@/lib/github';
import { ReportRow } from '@/components/report-row';
import { RunStatusCard } from '@/components/run-status-card';
import { MonthCalendar } from '@/components/month-calendar';
import { IconCalendar, IconFlame, IconLogout, IconRefresh } from '@/components/icons';
import { useToast } from '@/components/providers';

type Filter = 'all' | 'pending' | 'done';

function computeStreak(reports: Report[]): number {
  let streak = 0;
  for (const r of reports) {
    if (r.status === 'success' || r.status === 'waiting') streak++;
    else break;
  }
  return streak;
}

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState<StatusDoc | null>(null);
  const [run, setRun] = useState<GithubRun | null>(null);
  const [jobs, setJobs] = useState<GithubJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [scrapeDate, setScrapeDate] = useState('');
  const [scraping, setScraping] = useState(false);

  async function loadReports() {
    try {
      const data = await apiFetch<{ reports: Report[] }>('/api/reports');
      setReports(data.reports);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  async function loadStatus() {
    try {
      const data = await apiFetch<{ status: StatusDoc | null }>('/api/status');
      setStatus(data.status);
    } catch {
      // Status ist "nice to have" – Fehler hier nicht laut melden.
    }
  }

  async function loadRuns() {
    try {
      const data = await apiFetch<{ run: GithubRun | null; jobs: GithubJob[] }>('/api/runs');
      setRun(data.run);
      setJobs(data.jobs);
    } catch {
      // Live-Status ist optional, still fehlschlagen lassen.
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadReports(), loadStatus(), loadRuns()]);
      setLoading(false);
    })();
    const runInterval = setInterval(loadRuns, 10000);
    const statusInterval = setInterval(() => {
      loadStatus();
      loadReports();
    }, 30000);
    return () => {
      clearInterval(runInterval);
      clearInterval(statusInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingWeeks = useMemo(() => new Set(status?.details?.pending || []), [status]);
  const streak = useMemo(() => computeStreak(reports), [reports]);

  const filteredReports = useMemo(() => {
    if (filter === 'pending') {
      return reports.filter((r) => pendingWeeks.has(r.id) || r.status === 'waiting');
    }
    if (filter === 'done') {
      return reports.filter((r) => r.status === 'success' && !pendingWeeks.has(r.id));
    }
    return reports;
  }, [reports, filter, pendingWeeks]);

  async function handleScrape() {
    setScraping(true);
    try {
      await apiFetch('/api/actions/scrape', {
        method: 'POST',
        body: JSON.stringify({ targetDate: scrapeDate || undefined }),
      });
      toast(scrapeDate ? `Scraper für ${scrapeDate} gestartet.` : 'Scraper gestartet.', 'success');
      setTimeout(loadRuns, 1500);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setScraping(false);
    }
  }

  async function handleDeleteReport(id: string) {
    try {
      await apiFetch(`/api/reports/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setReports((rs) => rs.filter((r) => r.id !== id));
      toast('Bericht gelöscht.', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  async function handleMarkDone(id: string) {
    try {
      await apiFetch(`/api/reports/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'success' }),
      });
      setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status: 'success' } : r)));
      toast('Bericht als erledigt markiert.', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="ios-scroll-area min-h-[100dvh]">
      <header className="ios-navbar">
        <div className="mx-auto max-w-md px-4 pb-3 pt-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[28px] font-bold tracking-tight">Berichtsheft</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  loadRuns();
                  loadStatus();
                  loadReports();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ios-blue active:bg-label/10"
                aria-label="Aktualisieren"
              >
                <IconRefresh size={18} />
              </button>
              <button
                onClick={handleLogout}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ios-red active:bg-label/10"
                aria-label="Abmelden"
              >
                <IconLogout size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {streak > 0 && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-ios-lg border border-ios-orange/25 bg-ios-orange/10 px-4 py-3">
          <IconFlame className="text-ios-orange" size={22} />
          <div>
            <div className="text-[15px] font-bold">{streak} Woche{streak === 1 ? '' : 'n'} am Stück erledigt</div>
            <div className="text-[12px] text-label-secondary">Weiter so – keine Lücke seit {streak} Woche{streak === 1 ? '' : 'n'}.</div>
          </div>
        </div>
      )}

      {status && status.missingCount > 0 && (
        <div className="mx-4 mt-4 rounded-ios-lg border border-ios-red/25 bg-ios-red/10 px-4 py-3">
          <div className="text-[15px] font-bold text-ios-red">{status.message}</div>
          <div className="mt-1 text-[12px] text-label-secondary">
            {status.details.missing.join(', ')}
          </div>
        </div>
      )}

      <div className="ios-group-title">Live-Automatisierung</div>
      <div className="ios-group p-1">
        <RunStatusCard run={run} jobs={jobs} />
      </div>

      <div className="ios-group-title">Monatsübersicht</div>
      <MonthCalendar reports={reports} pendingWeeks={pendingWeeks} />

      <div className="ios-group-title">Neue Woche abholen</div>
      <div className="ios-group">
        <div className="ios-row">
          <IconCalendar className="text-label-secondary" />
          <input
            type="date"
            value={scrapeDate}
            onChange={(e) => setScrapeDate(e.target.value)}
            className="ios-input"
          />
          <button onClick={handleScrape} disabled={scraping} className="ios-btn-tinted !px-3 !py-1.5 text-[13px]">
            {scraping ? <span className="ios-spinner" /> : 'Holen'}
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between px-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-label-secondary">
          Berichts-Archiv {loading ? '' : `(${filteredReports.length})`}
        </h2>
      </div>
      <div className="px-4 pt-2">
        <div className="ios-segment">
          <button data-active={filter === 'all'} onClick={() => setFilter('all')}>Alle</button>
          <button data-active={filter === 'pending'} onClick={() => setFilter('pending')}>Ausstehend</button>
          <button data-active={filter === 'done'} onClick={() => setFilter('done')}>Erledigt</button>
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="ios-spinner" />
          </div>
        ) : filteredReports.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-label-secondary">Keine Berichte in dieser Ansicht.</p>
        ) : (
          <div className="ios-group">
            {filteredReports.map((r) => (
              <ReportRow
                key={r.id}
                report={r}
                isPending={pendingWeeks.has(r.id)}
                onDelete={handleDeleteReport}
                onMarkDone={handleMarkDone}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
