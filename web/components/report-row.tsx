'use client';

import Link from 'next/link';
import { Report, SCHOOL_FIELDS } from '@/lib/types';
import { IconChevron, IconDocument } from './icons';

function describeStatus(report: Report, isPending: boolean) {
  if (isPending) return { label: 'Genehmigung ausstehend', tone: 'orange' as const };
  if (report.status === 'success') return { label: 'Erledigt', tone: 'green' as const };
  if (report.status === 'waiting') return { label: 'In Bearbeitung', tone: 'orange' as const };
  if (report.status === 'running') return { label: 'Läuft…', tone: 'blue' as const };
  if (report.status === 'failed') return { label: 'Fehlgeschlagen', tone: 'red' as const };
  return { label: report.status || 'Unbekannt', tone: 'gray' as const };
}

const TONE_CLASSES: Record<string, string> = {
  green: 'bg-ios-green/15 text-ios-green',
  orange: 'bg-ios-orange/15 text-ios-orange',
  blue: 'bg-ios-blue/15 text-ios-blue',
  red: 'bg-ios-red/15 text-ios-red',
  gray: 'bg-label/[0.08] text-label-secondary',
};

export function ReportRow({ report, isPending }: { report: Report; isPending: boolean }) {
  const { label, tone } = describeStatus(report, isPending);

  const tags: string[] = [];
  if (report.content) {
    SCHOOL_FIELDS.forEach((f) => {
      if (report.content?.[f]?.trim()) tags.push(f.toUpperCase());
    });
    if (report.content.workActivities?.trim()) tags.push('Betrieb');
  }

  return (
    <Link href={`/report/${encodeURIComponent(report.id)}`} className="ios-row ios-row-active ios-card-press">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[11px] bg-surface-tertiary text-label-secondary">
        <IconDocument size={20} />
      </div>
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
      <IconChevron className="flex-shrink-0 text-label-secondary" />
    </Link>
  );
}
