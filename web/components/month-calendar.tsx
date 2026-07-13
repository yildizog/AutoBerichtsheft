'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Report } from '@/lib/types';
import { IconChevron } from './icons';

const EXPANDED_KEY = 'calendar-expanded';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const TONE_CLASSES = {
  green: 'bg-ios-green text-black',
  yellow: 'bg-ios-yellow text-black',
  red: 'bg-ios-red text-white',
} as const;

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function toneFor(report: Report, pendingWeeks: Set<string>): keyof typeof TONE_CLASSES {
  if (report.status === 'success' && !pendingWeeks.has(report.id)) return 'green';
  if (report.status === 'failed') return 'red';
  return 'yellow';
}

export function MonthCalendar({ reports, pendingWeeks }: { reports: Report[]; pendingWeeks: Set<string> }) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [expanded, setExpanded] = useState(true);

  // Zuletzt gewählten Zustand wiederherstellen (nur im Browser verfügbar).
  useEffect(() => {
    const stored = localStorage.getItem(EXPANDED_KEY);
    if (stored !== null) setExpanded(stored === '1');
  }, []);

  function toggleExpanded() {
    setExpanded((v) => {
      localStorage.setItem(EXPANDED_KEY, v ? '0' : '1');
      return !v;
    });
  }

  const byDate = new Map<string, Report>();
  for (const r of reports) byDate.set(r.id, r);

  // Kompakt-Zusammenfassung für den eingeklappten Zustand.
  const monthPrefix = `${view.y}-${String(view.m + 1).padStart(2, '0')}-`;
  const counts = { green: 0, yellow: 0, red: 0 };
  for (const r of reports) {
    if (r.id.startsWith(monthPrefix)) counts[toneFor(r, pendingWeeks)]++;
  }

  // Montag als Wochenstart (getDay(): So=0 … Sa=6)
  const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const todayIso = isoDate(now.getFullYear(), now.getMonth(), now.getDate());

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shift(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className="ios-group p-3">
      <div className={`flex items-center justify-between px-1 ${expanded ? 'mb-2' : ''}`}>
        <button onClick={toggleExpanded} aria-expanded={expanded} className="flex min-h-[32px] items-center gap-2">
          <IconChevron
            size={14}
            className={`flex-shrink-0 text-label-secondary transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          <span className="text-[15px] font-bold">
            {MONTHS[view.m]} {view.y}
          </span>
        </button>
        {expanded ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => shift(-1)}
              aria-label="Vorheriger Monat"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ios-blue active:bg-label/10"
            >
              <IconChevron className="rotate-180" size={16} />
            </button>
            <button
              onClick={() => shift(1)}
              aria-label="Nächster Monat"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ios-blue active:bg-label/10"
            >
              <IconChevron size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-[12px] font-semibold text-label-secondary">
            {counts.green > 0 && (
              <span className="flex items-center gap-1">
                <span className="ios-dot bg-ios-green" />
                {counts.green}
              </span>
            )}
            {counts.yellow > 0 && (
              <span className="flex items-center gap-1">
                <span className="ios-dot bg-ios-yellow" />
                {counts.yellow}
              </span>
            )}
            {counts.red > 0 && (
              <span className="flex items-center gap-1">
                <span className="ios-dot bg-ios-red" />
                {counts.red}
              </span>
            )}
            {counts.green + counts.yellow + counts.red === 0 && <span>Keine Läufe</span>}
          </div>
        )}
      </div>

      {expanded && (
      <>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-label-secondary">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const iso = isoDate(view.y, view.m, day);
          const report = byDate.get(iso);
          const isToday = iso === todayIso;
          const base = 'mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[14px]';

          if (report) {
            const tone = toneFor(report, pendingWeeks);
            return (
              <Link
                key={iso}
                href={`/report/${encodeURIComponent(report.id)}`}
                title={`${report.dateLabel || iso}: ${report.status || 'unbekannt'}`}
                className={`${base} font-bold ${TONE_CLASSES[tone]} ${isToday ? 'ring-2 ring-ios-blue' : ''} ios-card-press`}
              >
                {day}
              </Link>
            );
          }

          return (
            <div
              key={iso}
              className={`${base} ${isToday ? 'font-bold text-ios-blue ring-1 ring-ios-blue/40' : ''}`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-separator pt-3 text-[11px] text-label-secondary">
        <span className="flex items-center gap-1.5">
          <span className="ios-dot bg-ios-green" />
          Erledigt
        </span>
        <span className="flex items-center gap-1.5">
          <span className="ios-dot bg-ios-yellow" />
          In Bearbeitung
        </span>
        <span className="flex items-center gap-1.5">
          <span className="ios-dot bg-ios-red" />
          Fehlgeschlagen
        </span>
      </div>
      </>
      )}
    </div>
  );
}
