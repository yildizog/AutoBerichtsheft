'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import { Report, SchoolField, SickDays } from '@/lib/types';
import { Switch } from '@/components/switch';
import { IconBed, IconCheck, IconChevron, IconSparkles, IconUpload, IconX } from '@/components/icons';
import { useToast } from '@/components/providers';

type SubjectField = { id: SchoolField; label: string; placeholder: string; chip: string };

const MONTAG_FIELDS: SubjectField[] = [
  { id: 'stdm', label: 'STDM', placeholder: 'Softwaretechnologie und Datenmanagement…', chip: 'bg-ios-blue/15 text-ios-blue' },
  { id: 'evp', label: 'EVP', placeholder: 'Entwicklung Vernetzter Prozesse…', chip: 'bg-ios-indigo/15 text-ios-indigo' },
  { id: 'sport', label: 'Sport', placeholder: 'Sportunterricht…', chip: 'bg-ios-green/15 text-ios-green' },
];

const FREITAG_FIELDS: SubjectField[] = [
  { id: 'wbl', label: 'WBL', placeholder: 'Wirtschafts- und Betriebslehre…', chip: 'bg-ios-orange/15 text-ios-orange' },
  { id: 'englisch', label: 'Englisch', placeholder: 'Englischunterricht…', chip: 'bg-ios-teal/15 text-ios-teal' },
  { id: 'deutsch', label: 'Deutsch', placeholder: 'Deutschunterricht…', chip: 'bg-ios-purple/15 text-ios-purple' },
  { id: 'dkrypt', label: 'D-KRYPT', placeholder: 'Kryptologie & Sicherheit…', chip: 'bg-ios-pink/15 text-ios-pink' },
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
  const [markingDone, setMarkingDone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function toggleDone() {
    const nextStatus = report?.status === 'success' ? 'waiting' : 'success';
    setMarkingDone(true);
    try {
      await apiFetch(`/api/reports/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setReport((r) => (r ? { ...r, status: nextStatus } : r));
      toast(nextStatus === 'success' ? 'Bericht als erledigt markiert.' : 'Bericht wieder in Bearbeitung.', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setMarkingDone(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Bestätigung nach kurzer Zeit wieder zurücksetzen, falls nicht getippt wird.
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setDeleting(true);
    try {
      await apiFetch(`/api/reports/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast('Bericht gelöscht.', 'success');
      router.replace('/');
    } catch (err) {
      toast((err as Error).message, 'error');
      setDeleting(false);
      setConfirmDelete(false);
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

      <div className="ios-group mt-6">
        <div className="flex items-center justify-between border-b border-separator px-4 py-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[17px] font-bold tracking-tight">Betrieb</h2>
            <span className="text-[12px] font-medium text-label-secondary">Tätigkeiten der Woche</span>
          </div>
          {workActivities.trim() && (
            <span className="flex items-center text-ios-green" title="Eintrag vorhanden">
              <IconCheck size={13} />
            </span>
          )}
        </div>
        <div className="px-3.5 py-3">
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
      </div>

      <div className="px-4 pt-6">
        <button onClick={upload} disabled={uploading} className="ios-btn-filled-green w-full py-3.5 text-[16px]">
          {uploading ? <span className="ios-spinner !border-black/30 !border-t-black" /> : <IconUpload />}
          IHK Upload starten
        </button>
      </div>

      <div className="px-4 pt-3">
        <button onClick={toggleDone} disabled={markingDone} className="ios-btn-tinted w-full">
          {markingDone ? <span className="ios-spinner" /> : <IconCheck size={14} />}
          {report?.status === 'success' ? 'Als nicht erledigt markieren' : 'Als erledigt markieren'}
        </button>
      </div>

      <div className="px-4 pb-8 pt-3">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`w-full ${confirmDelete ? 'ios-btn-filled-red' : 'ios-btn-tinted-red'}`}
        >
          {deleting ? <span className="ios-spinner" /> : <IconX size={14} />}
          {confirmDelete ? 'Wirklich löschen? Erneut tippen' : 'Bericht löschen'}
        </button>
        <p className="mt-2 text-center text-[11px] text-label-secondary">
          Erledigte Berichte werden nach 7 Tagen automatisch entfernt.
        </p>
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
  subjectFields: SubjectField[];
  values: Record<SchoolField, string>;
  selected: Record<SchoolField, boolean>;
  onChangeValue: (id: SchoolField, value: string) => void;
  onToggleSelected: (id: SchoolField) => void;
}) {
  const filledCount = subjectFields.filter((f) => values[f.id].trim()).length;

  return (
    <div className="ios-group mt-4">
      {/* Tages-Header */}
      <div className="flex items-center justify-between border-b border-separator px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
          {!sick && (
            <span className="text-[12px] font-medium text-label-secondary">
              {filledCount}/{subjectFields.length} ausgefüllt
            </span>
          )}
        </div>
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

      {sick ? (
        <div className="flex items-center gap-2.5 px-4 py-4 text-[13px] text-label-secondary">
          <IconBed size={14} className="flex-shrink-0 text-ios-green" />
          Als krank markiert – für diesen Tag sind keine Einträge nötig.
        </div>
      ) : (
        subjectFields.map((f) => {
          const filled = Boolean(values[f.id].trim());
          return (
            <div key={f.id} className="border-b border-separator px-3.5 py-3 last:border-b-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide ${f.chip}`}>
                    {f.label}
                  </span>
                  {filled && (
                    <span className="flex items-center text-ios-green" title="Eintrag vorhanden">
                      <IconCheck size={13} />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-label-secondary">KI-Korrektur</span>
                  <Switch on={selected[f.id]} onToggle={() => onToggleSelected(f.id)} label={`${f.label} für KI-Korrektur einbeziehen`} />
                </div>
              </div>
              <textarea
                className="ios-textarea min-h-[90px]"
                placeholder={f.placeholder}
                value={values[f.id]}
                onChange={(e) => onChangeValue(f.id, e.target.value)}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
