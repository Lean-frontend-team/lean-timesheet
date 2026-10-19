import { EXCL_STATES, EXCL_TEXT, HOURS, WEEKEND, WFH_TEXT } from './config.js';
import { todayStr, toMin } from './format.js';

// Attendance row columns: 0 date (yyyy-MM-dd) · 1 weekday · 2 check in · 3 check out
//                         4 worked (HH:MM) · 5 status text · 6 state (hidden column)
export const isOffState = (state, statusText) =>
  EXCL_STATES.includes(state) || EXCL_TEXT.test(statusText);
export const isWfh = (state, statusText) => state === 'work_from_home' || WFH_TEXT.test(statusText);

// months: Set of 'yyyy-MM' to include (empty = all)
// ignored: days unticked in the Days list – shown, but left out of every total as if not in the table
// includeToday: today is unticked by default (still in progress); true when the user ticked it
export function calculate(
  rows,
  months,
  leaveMap,
  ignored = new Set(),
  includeToday = false,
  today = todayStr(),
) {
  const byMonth = new Map(),
    days = [],
    seen = new Set();
  let todaySkipped = false;
  for (const c of rows) {
    const cell = (i) => c[i] || '';
    const date = cell(0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (months.size && !months.has(date.slice(0, 7))))
      continue;
    const skipToday = date === today && !includeToday;
    if (skipToday) todaySkipped = true;
    if (skipToday || (date !== today && ignored.has(date))) {
      if (!days.some((d) => d.date === date))
        days.push({
          date,
          weekday: cell(1),
          checkIn: cell(2),
          checkOut: cell(3),
          workedText: cell(4),
          status: cell(5),
          minutes: toMin(cell(4)),
          off: null,
          wfh: false,
          ignored: true,
        });
      continue;
    }

    const key = date.slice(0, 7);
    let m = byMonth.get(key);
    if (!m)
      byMonth.set(
        key,
        (m = { month: key, working: 0, excluded: 0, weekend: 0, wfh: 0, off: 0, worked: 0 }),
      );
    const actual = toMin(cell(4));
    if (seen.has(date)) {
      m.worked += actual; // same date twice: add hours, require once
      continue;
    }
    seen.add(date);

    const dow = new Date(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)).getDay();
    const state = cell(6).trim().toLowerCase();
    const off = WEEKEND.includes(dow)
      ? 'Weekend'
      : leaveMap.get(date) || (isOffState(state, cell(5)) ? cell(5) || 'Leave / holiday' : null);
    const base = {
      date,
      weekday: cell(1),
      checkIn: cell(2),
      checkOut: cell(3),
      workedText: cell(4),
      status: cell(5),
    };

    if (off) {
      // not required; hours worked count as extra
      if (off === 'Weekend') m.weekend++;
      else m.excluded++;
      m.off += actual;
      m.worked += actual;
      days.push({ ...base, minutes: actual, off, wfh: false });
      continue;
    }
    const wfh = isWfh(state, cell(5));
    const minutes = wfh ? HOURS * 60 : actual;
    m.working++;
    m.worked += minutes;
    if (wfh) m.wfh++;
    days.push({ ...base, minutes, off: null, wfh });
  }
  const list = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  const total = { month: 'Total', working: 0, excluded: 0, weekend: 0, wfh: 0, off: 0, worked: 0 };
  for (const m of list)
    for (const k of ['working', 'excluded', 'weekend', 'wfh', 'off', 'worked']) total[k] += m[k];
  return {
    months: list,
    total,
    days: days.sort((a, b) => b.date.localeCompare(a.date)),
    todaySkipped,
  };
}

export const required = (m) => m.working * HOURS * 60;
export const balance = (m) => m.worked - required(m);
export const average = (m) => (m.working ? m.worked / m.working : 0);
