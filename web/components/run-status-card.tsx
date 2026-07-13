'use client';

import { useState } from 'react';
import { GithubJob, GithubRun } from '@/lib/github';
import { IconCheck, IconChevron, IconX } from './icons';

function StepDot({ status, conclusion, index }: { status: string; conclusion: string | null; index: number }) {
  if (status === 'completed' && conclusion === 'failure') {
    return (
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ios-red/15 text-ios-red ring-1 ring-ios-red/40">
        <IconX size={12} />
      </div>
    );
  }
  if (status === 'completed') {
    return (
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ios-green/15 text-ios-green ring-1 ring-ios-green/40">
        <IconCheck size={12} />
      </div>
    );
  }
  if (status === 'in_progress') {
    return (
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ios-orange/15 text-ios-orange ring-1 ring-ios-orange/40">
        <span className="ios-spinner !h-3.5 !w-3.5 !border-ios-orange/30 !border-t-ios-orange" />
      </div>
    );
  }
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-label/[0.05] text-[11px] font-bold text-label-secondary ring-1 ring-separator">
      {index + 1}
    </div>
  );
}

export function RunStatusCard({ run, jobs }: { run: GithubRun | null; jobs: GithubJob[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!run) {
    return <p className="py-6 text-center text-[13px] text-label-secondary">Keine aktiven Jobs.</p>;
  }

  const time = new Date(run.created_at).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const badgeTone =
    run.status !== 'completed'
      ? 'bg-ios-orange/15 text-ios-orange'
      : run.conclusion === 'success'
        ? 'bg-ios-green/15 text-ios-green'
        : 'bg-ios-red/15 text-ios-red';

  return (
    <div className="rounded-ios border border-separator bg-surface-tertiary/60 p-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`flex w-full items-start justify-between gap-3 text-left ${expanded ? 'mb-3 border-b border-separator pb-3' : ''}`}
      >
        <div className="flex items-start gap-2">
          <IconChevron
            size={14}
            className={`mt-1 flex-shrink-0 text-label-secondary transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          <div>
            <div className="text-[15px] font-bold text-ios-blue">{run.name}</div>
            <div className="text-[12px] text-label-secondary">Gestartet um {time} Uhr</div>
          </div>
        </div>
        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeTone}`}>
          {run.status === 'completed' ? run.conclusion || 'fertig' : run.status}
        </span>
      </button>

      {expanded &&
        (jobs.length === 0 ? (
          <p className="text-[13px] text-label-secondary">
            {run.status === 'completed'
              ? run.conclusion === 'success'
                ? 'Job erfolgreich beendet.'
                : 'Job fehlgeschlagen.'
              : 'Job läuft…'}
          </p>
        ) : (
          jobs.map((job) => (
            <div key={job.name} className="mb-3 last:mb-0">
              <div className="mb-2 text-[13px] font-semibold text-label-secondary">{job.name}</div>
              <div className="flex flex-col gap-2.5">
                {job.steps.map((step, i) => (
                  <div key={step.name} className="flex items-center gap-2.5" title={`${step.name} (${step.status})`}>
                    <StepDot status={step.status} conclusion={step.conclusion} index={i} />
                    <span
                      className={`text-[13px] ${
                        step.status === 'in_progress' ? 'font-semibold text-ios-orange' : 'text-label-secondary'
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ))}
    </div>
  );
}
