import { WEEKEND } from './config.js';
import { dayStr } from './format.js';

// The Leave page has no type column, only a free-text description ("Annual Vaction", "sick leave",
// "Marriage"…), so the type is guessed from the text. First match wins; typos are expected.
const CATEGORIES = [
  ['Unpaid', /unpaid|without pay|بدون راتب/i],
  ['Sick', /sick|ill(ness)?\b|medical|hospital|مرض/i],
  ['Hajj', /\bhaj+\b|pilgrim|حج/i],
  ['Marriage', /marri|wedding|زواج/i],
  ['Maternity', /matern|وضع/i],
  ['Paternity', /patern|new ?born|baby|birth|مولود/i],
  ['Bereavement', /bereave|death|condolence|funeral|passed away|وفاة/i],
  ['Exam', /exam|امتحان/i],
  ['Annual', /annual|vac|holiday|سنوي/i],
];
// Display order (matching order above is different on purpose)
export const ORDER = [
  'Annual',
  'Sick',
  'Hajj',
  'Marriage',
  'Maternity',
  'Paternity',
  'Bereavement',
  'Exam',
  'Unpaid',
  'Other',
];

export const leaveCategory = (description) =>
  CATEGORIES.find(([, re]) => re.test(description || ''))?.[0] || 'Other';

// Attendance rows → Set of 'yyyy-MM-dd' marked as public holidays (they aren't leave days)
export const holidaySet = (rows) =>
  new Set(
    rows
      .filter(
        (r) =>
          (r[6] || '').trim().toLowerCase() === 'public_holiday' || /holiday/i.test(r[5] || ''),
      )
      .map((r) => r[0]),
  );

// Approved leaves → days taken per type, from `since` (join date) onwards.
// A day is counted once even if two leaves overlap. Working days = Sun–Thu, not public holidays.
// Days after `today` are "upcoming" (approved but not taken yet).
// Returns {
//   types: [{ type, requests, workdays, calendar, upcoming, descriptions }],   // approved, by type
//   total, notCounted,
//   years: [{ year, total, byType: { Annual: n, … } }],                        // working days taken, newest first
//   items: [{ ...leave, category, workdays, calendar, upcoming, counted }],    // every leave since joining, newest first
// }
export function summarizeLeaves(
  leaves,
  { since = null, today = dayStr(new Date()), holidays = new Set() } = {},
) {
  const sinceStr = since ? dayStr(since) : '';
  const byType = new Map(),
    byYear = new Map(),
    seen = new Set(),
    items = [];
  let notCounted = 0;
  for (const l of [...leaves].sort((a, b) => a.from - b.from)) {
    if (l.to < l.from || l.to - l.from > 400 * 864e5) continue;
    if (sinceStr && dayStr(l.to) < sinceStr) continue; // ended before joining
    const type = leaveCategory(l.type);
    const item = { ...l, category: type, workdays: 0, calendar: 0, upcoming: 0, counted: false };
    items.push(item);
    if (!l.approved) notCounted++;
    let t = byType.get(type);
    if (!t && l.approved)
      byType.set(
        type,
        (t = { type, requests: 0, workdays: 0, calendar: 0, upcoming: 0, descriptions: new Set() }),
      );
    for (let d = new Date(l.from); d <= l.to; d.setDate(d.getDate() + 1)) {
      const s = dayStr(d);
      if (sinceStr && s < sinceStr) continue;
      if (l.approved) {
        if (seen.has(s)) continue; // already in another approved leave
        seen.add(s);
        item.counted = true;
      }
      const work = !WEEKEND.includes(d.getDay()) && !holidays.has(s);
      if (s > today) {
        if (work) item.upcoming++;
        continue;
      }
      item.calendar++;
      if (work) item.workdays++;
      if (work && l.approved) {
        let y = byYear.get(s.slice(0, 4));
        if (!y) byYear.set(s.slice(0, 4), (y = { year: s.slice(0, 4), total: 0, byType: {} }));
        y.total++;
        y.byType[type] = (y.byType[type] || 0) + 1;
      }
    }
    if (item.counted) {
      t.requests++;
      t.workdays += item.workdays;
      t.calendar += item.calendar;
      t.upcoming += item.upcoming;
      t.descriptions.add(l.type);
    }
  }
  const types = [...byType.values()]
    .filter((t) => t.requests)
    .map((t) => ({ ...t, descriptions: [...t.descriptions] }))
    .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  const total = { type: 'Total', requests: 0, workdays: 0, calendar: 0, upcoming: 0 };
  for (const t of types)
    for (const k of ['requests', 'workdays', 'calendar', 'upcoming']) total[k] += t[k];
  return {
    types,
    total,
    notCounted,
    years: [...byYear.values()].sort((a, b) => b.year.localeCompare(a.year)),
    items: items.reverse(),
  };
}
