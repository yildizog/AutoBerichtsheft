'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Report } from '@/lib/types';
import { IconChevron } from './icons';

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

export function MonthCalendar({ reports, pendingWeeks }: { reports: Report[]; pendingWeeks: Set<string> }) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const byDate = new Map<string, Report>();
  for (const r of reports) byDate.set(r.id, r);

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
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          onClick={() => shift(-1)}
          aria-label="Vorheriger Monat"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ios-blue active:bg-label/10"
        >
          <IconChevron className="rotate-180" size={16} />
        </button>
        <div className="text-[15px] font-bold">
          {MONTHS[view.m]} {view.y}
        </div>
        <button
          onClick={() => shift(1)}
          aria-label="Nächster Monat"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ios-blue active:bg-label/10"
        >
          <IconChevron size={16} />
        </button>
      </div>

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
            const tone =
              report.status === 'success' && !pendingWeeks.has(report.id)
                ? 'green'
                : report.status === 'failed'
                  ? 'red'
                  : 'yellow';
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
    </div>
  );
}
