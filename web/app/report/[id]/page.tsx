'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import { ABSENCE_LABELS, AbsenceType, DayAbsences, Report, SchoolField } from '@/lib/types';
import { getHolidayName, getWeekDays } from '@/lib/holidays';
import { Switch } from '@/components/switch';
import { IconBed, IconCalendar, IconCheck, IconChevron, IconSparkles, IconUpload, IconX } from '@/components/icons';
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
  const [absences, setAbsences] = useState<DayAbsences>({ montag: null, freitag: null });
  const [holidays, setHolidays] = useState<{ montag: string | null; freitag: string | null }>({ montag: null, freitag: null });

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

        // Feiertage (NRW) für Montag/Freitag dieser Woche ermitteln.
        const week = getWeekDays(data.report.dateLabel || id);
        const holidayNames = {
          montag: week ? getHolidayName(week.montag) : null,
          freitag: week ? getHolidayName(week.freitag) : null,
        };
        setHolidays(holidayNames);

        // Neue Berichte nutzen `absences`, alte nur `sickDays` (boolean = krank).
        const loaded: DayAbsences = c.absences
          ? { montag: c.absences.montag ?? null, freitag: c.absences.freitag ?? null }
          : { montag: c.sickDays?.montag ? 'krank' : null, freitag: c.sickDays?.freitag ? 'krank' : null };
        // Feiertage automatisch vorbelegen, sofern der Tag nicht schon markiert ist.
        if (!loaded.montag && holidayNames.montag) loaded.montag = 'feiertag';
        if (!loaded.freitag && holidayNames.freitag) loaded.freitag = 'feiertag';
        setAbsences(loaded);

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

  function buildContent() {
    return {
      ...fields,
      workActivities,
      absences,
      // Für ältere Konsumenten weiterhin mitschreiben (true = krank).
      sickDays: { montag: absences.montag === 'krank', freitag: absences.freitag === 'krank' },
    };
  }

  async function saveContent(): Promise<boolean> {
    setSaveState('saving');
    try {
      await apiFetch(`/api/reports/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: buildContent() }),
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
  }, [fields, workActivities, absences]);

  function selectAbsence(day: keyof DayAbsences, type: AbsenceType) {
    // Erneutes Tippen auf die aktive Option hebt die Markierung wieder auf.
    setAbsences((a) => ({ ...a, [day]: a[day] === type ? null : type }));
  }

  function toggleSelectAll(checked: boolean) {
    setSelected({
      stdm: checked, evp: checked, sport: checked, wbl: checked, englisch: checked, deutsch: checked, dkrypt: checked,
    });
  }

  async function refineSchool() {
    const ids = (Object.keys(selected) as SchoolField[]).filter((k) => {
      if (!selected[k]) return false;
      if (absences.montag && ['stdm', 'evp', 'sport'].includes(k)) return false;
      if (absences.freitag && ['wbl', 'englisch', 'deutsch', 'dkrypt'].includes(k)) return false;
      return true;
    });
    if (!ids.length) return toast('Nichts zum Korrigieren ausgewählt (oder Tage sind als abwesend markiert).', 'error');

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
        body: JSON.stringify({ reportId: id, content: buildContent() }),
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
        absence={absences.montag}
        holidayName={holidays.montag}
        onSelectAbsence={(t) => selectAbsence('montag', t)}
        subjectFields={MONTAG_FIELDS}
        values={fields}
        selected={selected}
        onChangeValue={(k, v) => setFields((f) => ({ ...f, [k]: v }))}
        onToggleSelected={(k) => setSelected((s) => ({ ...s, [k]: !s[k] }))}
      />
      <DaySection
        title="Freitag"
        absence={absences.freitag}
        holidayName={holidays.freitag}
        onSelectAbsence={(t) => selectAbsence('freitag', t)}
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
  absence,
  holidayName,
  onSelectAbsence,
  subjectFields,
  values,
  selected,
  onChangeValue,
  onToggleSelected,
}: {
  title: string;
  absence: AbsenceType | null;
  holidayName: string | null;
  onSelectAbsence: (type: AbsenceType) => void;
  subjectFields: SubjectField[];
  values: Record<SchoolField, string>;
  selected: Record<SchoolField, boolean>;
  onChangeValue: (id: SchoolField, value: string) => void;
  onToggleSelected: (id: SchoolField) => void;
}) {
  const filledCount = subjectFields.filter((f) => values[f.id].trim()).length;
  // "Feiertag" nur anbieten, wenn der Tag wirklich ein Feiertag ist (oder so gespeichert wurde).
  const options: AbsenceType[] = holidayName || absence === 'feiertag' ? ['krank', 'urlaub', 'frei', 'feiertag'] : ['krank', 'urlaub', 'frei'];

  const absenceMessage: Record<AbsenceType, string> = {
    krank: 'Als krank markiert – für diesen Tag sind keine Einträge nötig.',
    urlaub: 'Urlaub – für diesen Tag sind keine Einträge nötig.',
    frei: 'Freier Tag – für diesen Tag sind keine Einträge nötig.',
    feiertag: `Feiertag${holidayName ? ` (${holidayName})` : ''} – im Bericht wird „Feiertag“ eingetragen.`,
  };

  return (
    <div className="ios-group mt-4">
      {/* Tages-Header */}
      <div className="flex items-center justify-between gap-2 border-b border-separator px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
          {!absence && (
            <span className="text-[12px] font-medium text-label-secondary">
              {filledCount}/{subjectFields.length} ausgefüllt
            </span>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {options.map((type) => {
            const active = absence === type;
            return (
              <button
                key={type}
                onClick={() => onSelectAbsence(type)}
                className={`ios-btn !px-2.5 !py-1.5 text-[12px] ${
                  active ? 'bg-ios-green text-black' : 'bg-ios-red/15 text-ios-red'
                }`}
              >
                {type === 'krank' && <IconBed size={12} />}
                {ABSENCE_LABELS[type]}
              </button>
            );
          })}
        </div>
      </div>

      {absence ? (
        <div className="flex items-center gap-2.5 px-4 py-4 text-[13px] text-label-secondary">
          {absence === 'krank' ? (
            <IconBed size={14} className="flex-shrink-0 text-ios-green" />
          ) : (
            <IconCalendar size={14} className="flex-shrink-0 text-ios-green" />
          )}
          {absenceMessage[absence]}
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
