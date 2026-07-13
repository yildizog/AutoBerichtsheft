export const SCHOOL_FIELDS = ['stdm', 'evp', 'sport', 'wbl', 'englisch', 'deutsch', 'dkrypt'] as const;
export type SchoolField = (typeof SCHOOL_FIELDS)[number];

export interface SickDays {
  montag: boolean;
  freitag: boolean;
}

export interface ReportContent extends Partial<Record<SchoolField, string>> {
  workActivities?: string;
  sickDays?: SickDays;
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
