export const SCHOOL_FIELDS = ['stdm', 'evp', 'sport', 'wbl', 'englisch', 'deutsch', 'dkrypt'] as const;
export type SchoolField = (typeof SCHOOL_FIELDS)[number];

export interface SickDays {
  montag: boolean;
  freitag: boolean;
}

export const ABSENCE_TYPES = ['krank', 'urlaub', 'frei', 'feiertag'] as const;
export type AbsenceType = (typeof ABSENCE_TYPES)[number];

export const ABSENCE_LABELS: Record<AbsenceType, string> = {
  krank: 'Krank',
  urlaub: 'Urlaub',
  frei: 'Frei',
  feiertag: 'Feiertag',
};

export interface DayAbsences {
  montag: AbsenceType | null;
  freitag: AbsenceType | null;
}

export interface ReportContent extends Partial<Record<SchoolField, string>> {
  workActivities?: string;
  /** Veraltet – nur noch für alte Berichte; neue Berichte nutzen `absences`. */
  sickDays?: SickDays;
  absences?: DayAbsences;
}

export interface ReportDoc {
  status?: string;
  message?: string;
  content?: ReportContent;
  dateLabel?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Report extends ReportDoc {
  id: string;
}

export interface StatusDoc {
  status: 'green' | 'yellow' | 'red';
  lastChecked: string;
  missingCount: number;
  pendingCount: number;
  message: string;
  details: {
    missing: string[];
    pending: string[];
  };
}

export interface AppSettings {
  digestEnabled: boolean;
  digestEmail: string;
  digestWeekday: number; // 0 = Sonntag ... 6 = Samstag, Standard Freitag = 5
}

export const DEFAULT_SETTINGS: AppSettings = {
  digestEnabled: false,
  digestEmail: '',
  digestWeekday: 5,
};
