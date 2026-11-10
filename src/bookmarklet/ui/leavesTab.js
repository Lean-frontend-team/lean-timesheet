import { anyDate, dayStr, esc } from '../format.js';
import { holidaySet, ORDER, summarizeLeaves } from '../leaveSummary.js';
import { badge, kpi } from './parts.js';

export const COLORS = {
  Annual: '#2563eb',
  Sick: '#e11d48',
  Hajj: '#0d9488',
  Marriage: '#db2777',
  Maternity: '#9333ea',
  Paternity: '#7c3aed',
  Bereavement: '#475569',
  Exam: '#ca8a04',
  Unpaid: '#ea580c',
  Other: '#64748b',
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const niceDate = (d) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const chip = (type) => `<span class="cat" style="--c:${COLORS[type]}">${esc(type)}</span>`;

// "2 years 3 months" between two 'yyyy-MM-dd' days
function tenure(from, to) {
  const a = anyDate(from),
    b = anyDate(to);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
  if (b.getDate() < a.getDate()) months--;
  if (months < 1) return 'less than a month';
  const y = Math.floor(months / 12),
    m = months % 12;
  return [y ? plural(y, 'year') : '', m ? plural(m, 'month') : ''].filter(Boolean).join(' ');
}

// The Leaves tab: days off taken per type since the join date. Ignores the month picker.
export function renderLeavesTab({ leaves, leavesState, rows, joinDate, today, typeFilter }) {
  if (leavesState === 'loading' && !leaves.length)
    return '<div class="center">Reading the Leave page…</div>';
  if (leavesState === 'error' && !leaves.length)
    return '<div class="center">Could not read the Leave page.<br><br><a href="/my/leave">Open it in the ERP</a> to check you can see it, then click <b>Lean Attendance</b> again.</div>';

  const s = summarizeLeaves(leaves, {
    since: joinDate ? anyDate(joinDate) : null,
    today,
    holidays: holidaySet(rows),
  });
  const first = leaves.length
    ? dayStr(leaves.reduce((a, l) => (l.from < a ? l.from : a), leaves[0].from))
    : '';
  const sub = joinDate
    ? `Since you joined on ${niceDate(anyDate(joinDate))} · ${tenure(joinDate, today)} at Lean`
    : first
      ? `Every leave on the Leave page · first one on ${niceDate(anyDate(first))}`
      : 'Every leave on the Leave page';

  const t = s.total;
  const typeCards = s.types
    .map((x) =>
      kpi(
        esc(x.type),
        x.workdays,
        `${plural(x.calendar, 'calendar day')} · ${plural(x.requests, 'request')}${x.upcoming ? ` · <b>+${x.upcoming} upcoming</b>` : ''}`,
        COLORS[x.type],
      ),
    )
    .join('');

  // Share of working days by type, as one stacked bar
  const share = t.workdays
    ? `<div class="stack">${s.types
        .filter((x) => x.workdays)
        .map(
          (x) =>
            `<span style="flex:${x.workdays};background:${COLORS[x.type]}" title="${esc(x.type)}: ${x.workdays} working days"></span>`,
        )
        .join('')}</div>
      <div class="legend">${s.types
        .filter((x) => x.workdays)
        .map(
          (x) =>
            `<span><i style="background:${COLORS[x.type]}"></i>${esc(x.type)} <b>${Math.round((x.workdays / t.workdays) * 100)}%</b></span>`,
        )
        .join('')}</div>`
    : '';

  const yearTypes = ORDER.filter((k) => s.years.some((y) => y.byType[k]));
  const years = s.years.length
    ? `<div class="section"><h2>By year <span class="sub">working days</span></h2><table>
        <tr><th>Year</th>${yearTypes.map((k) => `<th>${chip(k)}</th>`).join('')}<th>Total</th></tr>
        ${s.years
          .map(
            (y) =>
              `<tr><td class="b">${y.year}</td>${yearTypes.map((k) => `<td>${y.byType[k] || '–'}</td>`).join('')}<td class="b">${y.total}</td></tr>`,
          )
          .join('')}
      </table></div>`
    : '';

  const used = ORDER.filter((k) => s.items.some((i) => i.category === k));
  const items = s.items.filter((i) => !typeFilter || i.category === typeFilter);
  const days = (n, up) =>
    up ? `${n || ''} <span class="up">${n ? '+' : ''}${up} upcoming</span>` : n;
  const history = `<div class="section">
      <div class="head2"><h2>History · ${items.length}</h2>
        <div class="chips">
          <button class="fchip ${typeFilter ? '' : 'on'}" data-filter="">All</button>
          ${used.map((k) => `<button class="fchip ${typeFilter === k ? 'on' : ''}" data-filter="${k}" style="--c:${COLORS[k]}">${esc(k)}</button>`).join('')}
        </div>
      </div>
      ${
        items.length
          ? `<table><tr><th>Type</th><th class="l">Description</th><th>From</th><th>To</th><th>Working days</th><th>Calendar days</th><th>State</th><th>Counted</th></tr>
        ${items
          .map(
            (
              i,
            ) => `<tr class="${i.approved ? '' : 'muted'}"><td>${chip(i.category)}</td><td class="l">${esc(i.type)}</td>
          <td>${niceDate(i.from)}</td><td>${niceDate(i.to)}</td><td class="b">${days(i.workdays, i.upcoming)}</td><td>${i.calendar}</td>
          <td>${badge(i.status) || '<span class="sub">No state</span>'}</td>
          <td>${i.counted ? '✓' : i.approved ? 'No – already in another leave' : 'No – not approved'}</td></tr>`,
          )
          .join('')}</table>`
          : '<div class="sub">No leaves.</div>'
      }
    </div>`;

  return `
    <div class="head">
      <div><h1>Leave days taken</h1><div class="sub">${esc(sub)}</div></div>
      <div class="joinbox">
        <label>Joined Lean on <input type="date" data-join="1" value="${esc(joinDate)}" max="${today}"></label>
        ${joinDate ? '<button class="quick" data-joinclear="1">Clear</button>' : ''}
      </div>
    </div>
    ${
      joinDate
        ? ''
        : '<div class="banner hint">📅 Set the day you joined Lean (top right) to count leave from that date. It is saved in this browser.</div>'
    }
    ${
      s.types.length
        ? `<div class="kpis">
        ${kpi('All leave', t.workdays, `working days · ${plural(t.calendar, 'calendar day')}${t.upcoming ? ` · <b>+${t.upcoming} upcoming</b>` : ''}`, '#1f3a5f')}
        ${typeCards}
      </div>
      ${share ? `<div class="section">${share}</div>` : ''}`
        : `<div class="banner hint">No approved leaves${joinDate ? ' since ' + esc(niceDate(anyDate(joinDate))) : ''}.</div>`
    }
    ${years}
    ${history}
    <div class="sub foot">Approved leaves only · working days = Sun–Thu, not public holidays · a day in two leaves counts once · the type is guessed from the description${
      s.notCounted ? ` · ${plural(s.notCounted, 'request')} not approved (not counted)` : ''
    }</div>`;
}
