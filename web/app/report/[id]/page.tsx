'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import { Report, SchoolField, SickDays } from '@/lib/types';
import { Switch } from '@/components/switch';
import { IconBed, IconChevron, IconSparkles, IconUpload } from '@/components/icons';
import { useToast } from '@/components/providers';

const MONTAG_FIELDS: { id: SchoolField; label: string; placeholder: string }[] = [
  { id: 'stdm', label: 'STDM', placeholder: 'Softwaretechnologie und Datenmanagement…' },
  { id: 'evp', label: 'EVP', placeholder: 'Entwicklung Vernetzter Prozesse…' },
  { id: 'sport', label: 'Sport', placeholder: 'Sportunterricht…' },
];

const FREITAG_FIELDS: { id: SchoolField; label: string; placeholder: string }[] = [
  { id: 'wbl', label: 'WBL', placeholder: 'Wirtschafts- und Betriebslehre…' },
  { id: 'englisch', label: 'Englisch', placeholder: 'Englischunterricht…' },
  { id: 'deutsch', label: 'Deutsch', placeholder: 'Deutschunterricht…' },
  { id: 'dkrypt', label: 'D-KRYPT', placeholder: 'Kryptologie & Sicherheit…' },
];

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const id = decodeURIComponent(params.id);

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Record<SchoolField, string>>({
    stdm: '', evp: '', sport: '', wbl: '', englisch: '', deutsch: '', dkrypt: '',
  });
  const [selected, setSelected] = useState<Record<SchoolField, boolean>>({
    stdm: true, evp: true, sport: true, wbl: true, englisch: true, deutsch: true, dkrypt: true,
  });
  const [workActivities, setWorkActivities] = useState('');
  const [sickDays, setSickDays] = useState<SickDays>({ montag: false, freitag: false });

  const [aiSchoolLoading, setAiSchoolLoading] = useState(false);
  const [aiWorkLoading, setAiWorkLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const loadedRef = useRef(false);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ report: Report }>(`/api/reports/${encodeURIComponent(id)}`);
        setReport(data.report);
        const c = data.report.content || {};
        setFields({
          stdm: c.stdm || '', evp: c.evp || '', sport: c.sport || '',
          wbl: c.wbl || '', englisch: c.englisch || '', deutsch: c.deutsch || '', dkrypt: c.dkrypt || '',
        });
        setWorkActivities(c.workActivities || '');
        if (c.sickDays) setSickDays(c.sickDays);
        skipNextSaveRef.current = true;
        loadedRef.current = true;
      } catch (err) {
        toast((err as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveContent(): Promise<boolean> {
    setSaveState('saving');
    try {
      await apiFetch(`/api/reports/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: { ...fields, workActivities, sickDays } }),
      });
      setSaveState('saved');
      return true;
    } catch {
      setSaveState('error');
      return false;
    }
  }

  // Autosave: Änderungen 1,2s nach der letzten Eingabe automatisch in Firebase sichern.
  useEffect(() => {
    if (!loadedRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    setSaveState('dirty');
    const timer = setTimeout(() => {
      void saveContent();
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, workActivities, sickDays]);

  function toggleSick(day: keyof SickDays) {
    setSickDays((s) => ({ ...s, [day]: !s[day] }));
  }

  function toggleSelectAll(checked: boolean) {
    setSelected({
      stdm: checked, evp: checked, sport: checked, wbl: checked, englisch: checked, deutsch: checked, dkrypt: checked,
    });
  }

  async function refineSchool() {
    const ids = (Object.keys(selected) as SchoolField[]).filter((k) => {
      if (!selected[k]) return false;
      if (sickDays.montag && ['stdm', 'evp', 'sport'].includes(k)) return false;
      if (sickDays.freitag && ['wbl', 'englisch', 'deutsch', 'dkrypt'].includes(k)) return false;
      return true;
    });
    if (!ids.length) return toast('Nichts zum Korrigieren ausgewählt (oder Tage sind als "Krank" markiert).', 'error');

    const data: Record<string, string> = {};
    ids.forEach((k) => (data[k] = fields[k]));

    setAiSchoolLoading(true);
    try {
      const res = await apiFetch<{ fields: Record<string, string> }>('/api/ai/refine', {
        method: 'POST',
        body: JSON.stringify({ mode: 'school', fields: data }),
      });
      setFields((f) => ({ ...f, ...res.fields }));
      toast('Fächer überarbeitet.', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setAiSchoolLoading(false);
    }
  }

  async function refineWork() {
    if (!workActivities.trim()) return toast('Keine Tätigkeiten zum Überarbeiten eingegeben.', 'error');
    setAiWorkLoading(true);
    try {
      const res = await apiFetch<{ text: string }>('/api/ai/refine', {
        method: 'POST',
        body: JSON.stringify({ mode: 'work', text: workActivities }),
      });
      setWorkActivities(res.text);
      toast('Tätigkeiten überarbeitet.', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setAiWorkLoading(false);
    }
  }

  async function upload() {
    setUploading(true);
    try {
      // Vor dem Upload den Stand in Firebase sichern, damit DB und IHK synchron sind.
      const saved = await saveContent();
      if (!saved) throw new Error('Speichern in Firebase fehlgeschlagen – Upload abgebrochen.');
      await apiFetch('/api/actions/upload', {
        method: 'POST',
        body: JSON.stringify({ reportId: id, content: { ...fields, workActivities, sickDays } }),
      });
      toast('Upload-Auftrag gesendet.', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <span className="ios-spinner" />
      </div>
    );
  }

  return (
    <div className="ios-scroll-area min-h-[100dvh]">
      <header className="ios-navbar">
        <div className="mx-auto max-w-md px-4 py-3">
          <button onClick={() => router.push('/')} className="mb-2 -ml-1 flex items-center gap-0.5 text-[15px] font-medium text-ios-blue">
            <IconChevron className="rotate-180" size={18} />
            Übersicht
          </button>
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-[24px] font-bold tracking-tight">{report?.dateLabel || `Woche ${id}`}</h1>
            <span
              className={`whitespace-nowrap text-[12px] font-medium ${
                saveState === 'error' ? 'text-ios-red' : 'text-label-secondary'
              }`}
              aria-live="polite"
            >
              {saveState === 'dirty' && 'Ungespeicherte Änderungen…'}
              {saveState === 'saving' && 'Speichert…'}
              {saveState === 'saved' && 'Gespeichert ✓'}
              {saveState === 'error' && 'Speichern fehlgeschlagen'}
            </span>
          </div>
        </div>
      </header>

      <DaySection
        title="Montag"
        sick={sickDays.montag}
        onToggleSick={() => toggleSick('montag')}
        subjectFields={MONTAG_FIELDS}
        values={fields}
        selected={selected}
        onChangeValue={(k, v) => setFields((f) => ({ ...f, [k]: v }))}
        onToggleSelected={(k) => setSelected((s) => ({ ...s, [k]: !s[k] }))}
      />
      <DaySection
        title="Freitag"
        sick={sickDays.freitag}
        onToggleSick={() => toggleSick('freitag')}
        subjectFields={FREITAG_FIELDS}
        values={fields}
        selected={selected}
        onChangeValue={(k, v) => setFields((f) => ({ ...f, [k]: v }))}
        onToggleSelected={(k) => setSelected((s) => ({ ...s, [k]: !s[k] }))}
      />

      <div className="px-4 pt-3">
        <button onClick={() => toggleSelectAll(true)} className="text-[12px] font-medium text-ios-blue">
          Alle für KI-Korrektur auswählen
        </button>
      </div>

      <div className="flex justify-center px-4 pt-2">
        <button onClick={refineSchool} disabled={aiSchoolLoading} className="ios-btn-tinted w-full">
          {aiSchoolLoading ? <span className="ios-spinner" /> : <IconSparkles />}
          KI-Korrektur (Schule)
        </button>
      </div>

      <div className="ios-group-title">Betriebliche Tätigkeiten</div>
      <div className="ios-group p-3">
        <textarea
          className="ios-textarea min-h-[150px]"
          placeholder="Trage hier deine betrieblichen Tätigkeiten als Stichpunkte ein…"
          value={workActivities}
          onChange={(e) => setWorkActivities(e.target.value)}
        />
        <button onClick={refineWork} disabled={aiWorkLoading} className="ios-btn-tinted mt-3 w-full">
          {aiWorkLoading ? <span className="ios-spinner" /> : <IconSparkles />}
          KI Überarbeiten
        </button>
      </div>

      <div className="px-4 pb-8 pt-6">
        <button onClick={upload} disabled={uploading} className="ios-btn-filled-green w-full py-3.5 text-[16px]">
          {uploading ? <span className="ios-spinner !border-black/30 !border-t-black" /> : <IconUpload />}
          IHK Upload starten
        </button>
      </div>
    </div>
  );
}

function DaySection({
  title,
  sick,
  onToggleSick,
  subjectFields,
  values,
  selected,
  onChangeValue,
  onToggleSelected,
}: {
  title: string;
  sick: boolean;
  onToggleSick: () => void;
  subjectFields: { id: SchoolField; label: string; placeholder: string }[];
  values: Record<SchoolField, string>;
  selected: Record<SchoolField, boolean>;
  onChangeValue: (id: SchoolField, value: string) => void;
  onToggleSelected: (id: SchoolField) => void;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-label-secondary">{title}</h2>
        <button
          onClick={onToggleSick}
          className={`ios-btn !px-3 !py-1.5 text-[12px] ${
            sick ? 'bg-ios-green text-black' : 'bg-ios-red/15 text-ios-red'
          }`}
        >
          <IconBed size={12} />
          {sick ? 'Als krank markiert' : 'Krank'}
        </button>
      </div>

      <div className={`mt-2 space-y-3 px-4 transition-opacity ${sick ? 'pointer-events-none opacity-30' : ''}`}>
        {subjectFields.map((f) => (
          <div key={f.id} className="ios-group">
            <div className="ios-row justify-between !min-h-0 !py-2.5">
              <span className="text-[13px] font-bold uppercase tracking-wide text-label-secondary">{f.label}</span>
              <Switch on={selected[f.id]} onToggle={() => onToggleSelected(f.id)} label={`${f.label} für KI-Korrektur einbeziehen`} />
            </div>
            <div className="border-t border-separator p-2.5">
              <textarea
                className="ios-textarea min-h-[90px] !bg-transparent !border-0 !px-1 !ring-0"
                placeholder={f.placeholder}
                value={values[f.id]}
                onChange={(e) => onChangeValue(f.id, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
