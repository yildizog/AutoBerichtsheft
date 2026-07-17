// Gesetzliche Feiertage in NRW (Schule/IHK Nordwestfalen).

// Ostersonntag nach der Gauß-Formel (gregorianischer Kalender).
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = März, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function keyOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const cache = new Map<number, Map<string, string>>();

function holidaysForYear(year: number): Map<string, string> {
  let map = cache.get(year);
  if (map) return map;
  const easter = easterSunday(year);
  map = new Map<string, string>([
    [keyOf(new Date(year, 0, 1)), 'Neujahr'],
    [keyOf(addDays(easter, -2)), 'Karfreitag'],
    [keyOf(addDays(easter, 1)), 'Ostermontag'],
    [keyOf(new Date(year, 4, 1)), 'Tag der Arbeit'],
    [keyOf(addDays(easter, 39)), 'Christi Himmelfahrt'],
    [keyOf(addDays(easter, 50)), 'Pfingstmontag'],
    [keyOf(addDays(easter, 60)), 'Fronleichnam'],
    [keyOf(new Date(year, 9, 3)), 'Tag der Deutschen Einheit'],
    [keyOf(new Date(year, 10, 1)), 'Allerheiligen'],
    [keyOf(new Date(year, 11, 25)), '1. Weihnachtstag'],
    [keyOf(new Date(year, 11, 26)), '2. Weihnachtstag'],
  ]);
  cache.set(year, map);
  return map;
}

/** Name des NRW-Feiertags am gegebenen Datum, sonst null. */
export function getHolidayName(date: Date): string | null {
  return holidaysForYear(date.getFullYear()).get(keyOf(date)) ?? null;
}

/**
 * Montag und Freitag der Woche, in der das Datum (Format YYYY-MM-DD) liegt.
 * Gibt null zurück, wenn das Datum nicht parsebar ist.
 */
export function getWeekDays(dateStr: string): { montag: Date; freitag: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (isNaN(date.getTime())) return null;
  const dayOfWeek = date.getDay() || 7; // Sonntag = 7
  const montag = addDays(date, -(dayOfWeek - 1));
  return { montag, freitag: addDays(montag, 4) };
}
