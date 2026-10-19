import { anyDate, dayStr } from './format.js';

// Leave page table → [{ type, from, to, duration, status, approved }], newest first.
// Columns are found by header text, so the ERP can reorder or rename them.
export function parseLeaves(headers, rows) {
  const col = (re, skip = []) => headers.findIndex((h, i) => !skip.includes(i) && re.test(h));
  const from = col(/\bfrom\b|start/i);
  const to = col(/^to\b|\bto\b|\bend\b|until/i, [from]);
  const status = col(/status|state/i);
  const duration = col(/duration|number of|days|hours/i, [from, to]);
  const type = col(/type|leave|time off|description|reason/i, [from, to, status, duration]);
  return rows
    .map((c) => {
      const cell = (i) => (i >= 0 && i < c.length ? c[i] : '');
      const dates = (from >= 0 && to >= 0 ? [cell(from), cell(to)] : c)
        .map(anyDate)
        .filter(Boolean);
      if (!dates.length) return null;
      const st = status >= 0 ? cell(status) : c.join(' ');
      const approved =
        /\b(approved|validated?|confirmed)\b/i.test(st) &&
        !/refus|reject|cancel|draft|to approve|waiting|pending/i.test(st);
      return {
        type: type >= 0 ? cell(type) : c.find((x) => x && !anyDate(x)) || 'Leave',
        from: dates[0],
        to: dates[1] || dates[0],
        duration: cell(duration),
        status: status >= 0 ? cell(status) : approved ? 'Approved' : '',
        approved,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.from - a.from);
}

// Approved leaves → Map('yyyy-MM-dd' → leave type)
export function leaveDayMap(leaves) {
  const map = new Map();
  for (const l of leaves) {
    if (!l.approved || l.to < l.from || l.to - l.from > 400 * 864e5) continue;
    for (let d = new Date(l.from); d <= l.to; d.setDate(d.getDate() + 1))
      if (!map.has(dayStr(d))) map.set(dayStr(d), l.type);
  }
  return map;
}
