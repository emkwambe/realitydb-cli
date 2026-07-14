// ─── EU timezones + holidays + business-date generation (Blocker 7) ──────────
// Pure, host-independent date arithmetic. CRITICAL: every Date access uses UTC
// methods (getUTC*, setUTCHours, Date.UTC) — never local-time getters — so a
// fixed seed yields identical output on ANY host regardless of process TZ.
// (The feedback §4.2 sketch used local-time getters, which its own §4.3
// determinism claim forbids; corrected to UTC throughout here.)

export interface TimezoneConfig {
  ianaZone: string;
  standardOffset: string;
  dstOffset: string;
  dstStart: { month: number; week: number; dow: number }; // month 0-indexed; week -1 = last; dow 0 = Sun
  dstEnd: { month: number; week: number; dow: number };
}

export const EU_TIMEZONES: Record<string, TimezoneConfig> = {
  DE: { ianaZone: 'Europe/Berlin',    standardOffset: '+01:00', dstOffset: '+02:00', dstStart: { month: 2, week: -1, dow: 0 }, dstEnd: { month: 9, week: -1, dow: 0 } },
  FR: { ianaZone: 'Europe/Paris',     standardOffset: '+01:00', dstOffset: '+02:00', dstStart: { month: 2, week: -1, dow: 0 }, dstEnd: { month: 9, week: -1, dow: 0 } },
  IT: { ianaZone: 'Europe/Rome',      standardOffset: '+01:00', dstOffset: '+02:00', dstStart: { month: 2, week: -1, dow: 0 }, dstEnd: { month: 9, week: -1, dow: 0 } },
  ES: { ianaZone: 'Europe/Madrid',    standardOffset: '+01:00', dstOffset: '+02:00', dstStart: { month: 2, week: -1, dow: 0 }, dstEnd: { month: 9, week: -1, dow: 0 } },
  NL: { ianaZone: 'Europe/Amsterdam', standardOffset: '+01:00', dstOffset: '+02:00', dstStart: { month: 2, week: -1, dow: 0 }, dstEnd: { month: 9, week: -1, dow: 0 } },
  AT: { ianaZone: 'Europe/Vienna',    standardOffset: '+01:00', dstOffset: '+02:00', dstStart: { month: 2, week: -1, dow: 0 }, dstEnd: { month: 9, week: -1, dow: 0 } },
  BE: { ianaZone: 'Europe/Brussels',  standardOffset: '+01:00', dstOffset: '+02:00', dstStart: { month: 2, week: -1, dow: 0 }, dstEnd: { month: 9, week: -1, dow: 0 } },
  IE: { ianaZone: 'Europe/Dublin',    standardOffset: '+00:00', dstOffset: '+01:00', dstStart: { month: 2, week: -1, dow: 0 }, dstEnd: { month: 9, week: -1, dow: 0 } },
  PL: { ianaZone: 'Europe/Warsaw',    standardOffset: '+01:00', dstOffset: '+02:00', dstStart: { month: 2, week: -1, dow: 0 }, dstEnd: { month: 9, week: -1, dow: 0 } },
  SE: { ianaZone: 'Europe/Stockholm', standardOffset: '+01:00', dstOffset: '+02:00', dstStart: { month: 2, week: -1, dow: 0 }, dstEnd: { month: 9, week: -1, dow: 0 } },
};

export const COUNTRY_HOLIDAYS: Record<string, string[]> = {
  DE: ['01-01', '05-01', '10-03', '12-25', '12-26'],
  FR: ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'],
  IT: ['01-01', '01-06', '04-25', '05-01', '06-02', '08-15', '11-01', '12-08', '12-25', '12-26'],
  ES: ['01-01', '01-06', '05-01', '08-15', '10-12', '11-01', '12-06', '12-08', '12-25'],
  NL: ['01-01', '04-27', '05-05', '12-25', '12-26'],
  AT: ['01-01', '01-06', '05-01', '08-15', '10-26', '11-01', '12-08', '12-25', '12-26'],
  BE: ['01-01', '04-21', '05-01', '07-21', '08-15', '11-01', '11-11', '12-25'],
  IE: ['01-01', '03-17', '04-01', '05-01', '06-03', '08-05', '10-28', '12-25', '12-26'],
  PL: ['01-01', '01-06', '05-01', '05-03', '08-15', '11-01', '11-11', '12-25', '12-26'],
  SE: ['01-01', '01-06', '05-01', '06-06', '12-25', '12-26'],
};

// Pure UTC arithmetic. week === -1 → last <dow> of the month; else nth (1-based).
export function getNthWeekdayOfMonth(year: number, month: number, week: number, dow: number): Date {
  if (week === -1) {
    // Day 0 of the next month == last day of `month`.
    const lastDate = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let day = lastDate; day > 0; day--) {
      if (new Date(Date.UTC(year, month, day)).getUTCDay() === dow) {
        return new Date(Date.UTC(year, month, day));
      }
    }
    return new Date(Date.UTC(year, month, lastDate));
  }
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const day = 1 + ((dow - firstDow + 7) % 7) + (week - 1) * 7;
  return new Date(Date.UTC(year, month, day));
}

export function isDST(date: Date, tz: TimezoneConfig): boolean {
  const year = date.getUTCFullYear();
  const dstStart = getNthWeekdayOfMonth(year, tz.dstStart.month, tz.dstStart.week, tz.dstStart.dow);
  const dstEnd = getNthWeekdayOfMonth(year, tz.dstEnd.month, tz.dstEnd.week, tz.dstEnd.dow);
  return date >= dstStart && date < dstEnd;
}

export function getOffset(date: Date, country: string): string {
  const tz = EU_TIMEZONES[country];
  if (!tz) return '+00:00';
  return isDST(date, tz) ? tz.dstOffset : tz.standardOffset;
}

export function isBusinessDay(date: Date, country: string): boolean {
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return false; // Sunday / Saturday
  const mmdd = String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + String(date.getUTCDate()).padStart(2, '0');
  return !(COUNTRY_HOLIDAYS[country] || []).includes(mmdd);
}

export function formatTimestamp(date: Date, country: string): string {
  const offset = getOffset(date, country);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}${offset}`;
}

// rng draws: 1 per attempt (offsetDays), up to 100 attempts, + 3 on success
// (hours, minutes, seconds). Deterministic given the seed. Business hours 08–17.
export function generateBusinessDate(country: string, minDate: Date, maxDate: Date, rng: () => number): string {
  const rangeDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
  let attempts = 0;
  while (attempts < 100) {
    const offsetDays = Math.floor(rng() * rangeDays);
    const candidate = new Date(minDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    if (isBusinessDay(candidate, country)) {
      candidate.setUTCHours(8 + Math.floor(rng() * 10), Math.floor(rng() * 60), Math.floor(rng() * 60), 0);
      return formatTimestamp(candidate, country);
    }
    attempts++;
  }
  return formatTimestamp(minDate, country);
}
