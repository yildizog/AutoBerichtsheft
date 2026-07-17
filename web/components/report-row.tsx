'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Report, SCHOOL_FIELDS } from '@/lib/types';
import { IconCheck, IconChevron, IconDocument, IconX } from './icons';

function describeStatus(report: Report, isPending: boolean, isMissing: boolean, hasCheck: boolean) {
  if (report.status === 'running') return { label: 'Läuft…', tone: 'blue' as const };
  if (report.status === 'failed') return { label: 'Fehlgeschlagen', tone: 'red' as const };
  // Genehmigungsstand kommt aus dem täglichen IHK-Check (status.details).
  if (isPending) return { label: 'Wartet auf Genehmigung', tone: 'orange' as const };
  if (report.status === 'success') {
    if (isMissing) return { label: 'Fehlt im IHK-Portal', tone: 'red' as const };
    // Ohne Check-Ergebnis wissen wir nur, dass hochgeladen wurde.
    if (hasCheck) return { label: 'Vom Ausbilder genehmigt', tone: 'green' as const };
    return { label: 'Hochgeladen', tone: 'green' as const };
  }
  if (report.status === 'waiting') return { label: 'In Bearbeitung', tone: 'gray' as const };
  return { label: report.status || 'Unbekannt', tone: 'gray' as const };
}

const TONE_CLASSES: Record<string, string> = {
  green: 'bg-ios-green/15 text-ios-green',
  orange: 'bg-ios-orange/15 text-ios-orange',
  blue: 'bg-ios-blue/15 text-ios-blue',
  red: 'bg-ios-red/15 text-ios-red',
  gray: 'bg-label/[0.08] text-label-secondary',
};

export function ReportRow({
  report,
  isPending,
  isMissing = false,
  hasCheck = false,
  onDelete,
  onMarkDone,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: {
  report: Report;
  isPending: boolean;
  isMissing?: boolean;
  hasCheck?: boolean;
  onDelete?: (id: string) => Promise<void>;
  onMarkDone?: (id: string) => Promise<void>;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const { label, tone } = describeStatus(report, isPending, isMissing, hasCheck);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);

  async function handleMarkDone(e: React.MouseEvent) {
    // Klick darf nicht zusätzlich den Bericht öffnen (Zeile ist ein Link).
    e.preventDefault();
    e.stopPropagation();
    if (!onMarkDone) return;
    setMarkingDone(true);
    try {
      await onMarkDone(report.id);
    } finally {
      setMarkingDone(false);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    // Klick darf nicht zusätzlich den Bericht öffnen (Zeile ist ein Link).
    e.preventDefault();
    e.stopPropagation();
    if (!onDelete) return;
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(report.id);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  const tags: string[] = [];
  if (report.content) {
    SCHOOL_FIELDS.forEach((f) => {
      if (report.content?.[f]?.trim()) tags.push(f.toUpperCase());
    });
    if (report.content.workActivities?.trim()) tags.push('Betrieb');
  }

  const rowInner = (
    <>
      {selectMode ? (
        <span
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            selected ? 'border-ios-blue bg-ios-blue text-white' : 'border-label/25 bg-transparent text-transparent'
          }`}
          aria-hidden
        >
          <IconCheck size={12} />
        </span>
      ) : (
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[11px] bg-surface-tertiary text-label-secondary">
          <IconDocument size={20} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold">{report.dateLabel || `Woche ${report.id}`}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[tone]}`}>{label}</span>
          {tags.length > 0 ? (
            <span className="truncate text-[12px] text-label-secondary">{tags.join(' · ')}</span>
          ) : (
            <span className="truncate text-[12px] text-label-secondary">Keine Einträge</span>
          )}
        </div>
      </div>
      {!selectMode && onMarkDone && report.status !== 'success' && (
        <button
          onClick={handleMarkDone}
          aria-label={`Bericht ${report.dateLabel || report.id} als erledigt markieren`}
          title="Als erledigt markieren"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ios-green/15 text-ios-green transition-colors"
        >
          {markingDone ? <span className="ios-spinner" /> : <IconCheck size={13} />}
        </button>
      )}
      {!selectMode && onDelete && (
        <button
          onClick={handleDelete}
          aria-label={confirming ? 'Löschen bestätigen' : `Bericht ${report.dateLabel || report.id} löschen`}
          className={`flex h-8 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
            confirming
              ? 'gap-1 bg-ios-red px-3 text-[11px] font-semibold text-white'
              : 'w-8 bg-ios-red/15 text-ios-red'
          }`}
        >
          {deleting ? <span className="ios-spinner !border-white/40 !border-t-white" /> : confirming ? 'Sicher?' : <IconX size={13} />}
        </button>
      )}
      {!selectMode && <IconChevron className="flex-shrink-0 text-label-secondary" />}
    </>
  );

  if (selectMode) {
    return (
      <button
        type="button"
        onClick={() => onToggleSelect?.(report.id)}
        aria-pressed={selected}
        aria-label={`Bericht ${report.dateLabel || report.id} ${selected ? 'abwählen' : 'auswählen'}`}
        className="ios-row ios-row-active w-full text-left"
      >
        {rowInner}
      </button>
    );
  }

  return (
    <Link href={`/report/${encodeURIComponent(report.id)}`} className="ios-row ios-row-active ios-card-press">
      {rowInner}
    </Link>
  );
}
