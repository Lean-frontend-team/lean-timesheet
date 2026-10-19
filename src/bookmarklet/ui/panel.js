import { HOURS, ROOT_ID } from '../config.js';
import { average, balance, calculate, required } from '../calculate.js';
import { esc, fmt, monthLong, pad, sfmt, dayStr, todayStr } from '../format.js';
import { leaveDayMap } from '../leaves.js';
import { describeToday } from '../today.js';
import styles from './styles.js';

const badge = (s) => {
  const t = (s || '').toLowerCase();
  const [fg, bg] = /refus|reject|cancel|absence|no show/.test(t)
    ? ['#b91c1c', '#fee2e2']
    : /approved|validated|attend/.test(t)
      ? ['#15803d', '#dcfce7']
      : /approve|pending|waiting|draft/.test(t)
        ? ['#b45309', '#fef3c7']
        : /work from home|wfh/.test(t)
          ? ['#6d28d9', '#ede9fe']
          : /leave|holiday/.test(t)
            ? ['#475569', '#e2e8f0']
            : ['#1d4ed8', '#dbeafe'];
  return s ? `<span class="badge" style="color:${fg};background:${bg}">${esc(s)}</span>` : '';
};

const kpi = (title, value, note, color, valueClass = '') =>
  `<div class="kpi" style="--c:${color}"><div class="t">${title}</div><div class="v ${valueClass}">${value}</div><div class="n">${note || '&nbsp;'}</div></div>`;

// Opens the overlay (isolated in a shadow root so ERP styles don't interfere).
// Returns { setData, setStatus, showMessage }.
export function openPanel() {
  document.getElementById(ROOT_ID)?.remove();
  const today = todayStr();

  const host = document.createElement('div');
  host.id = ROOT_ID;
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${styles}</style>
    <div class="overlay"><div class="panel">
      <div class="bar"><b>Lean Attendance</b><span class="sub" style="color:#cbd5e1" id="status"></span><button id="close" title="Close (Esc)">×</button></div>
      <div class="body" id="body"><div class="center">Reading your attendance…</div></div>
    </div></div>`;
  const $ = (sel) => root.querySelector(sel);

  // ---------- state ----------
  let rows = [],
    leaves = [],
    leaveMap = new Map(),
    leavesState = 'loading',
    menuOpen = false;
  const selected = new Set();
  const ignoredDays = new Set(); // unticked in the Days list (until the panel is closed)
  let includeToday = false; // today is unticked by default; ticking it adds it to the totals
  const allMonthKeys = () =>
    [
      ...new Set(
        rows
          .map((r) => r[0])
          .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d || ''))
          .map((d) => d.slice(0, 7)),
      ),
    ]
      .sort()
      .reverse();

  // ---------- close ----------
  let todayTimer;
  const close = () => {
    host.remove();
    document.removeEventListener('keydown', onKey);
    clearInterval(todayTimer);
  };
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    if (menuOpen) {
      menuOpen = false; // Esc closes the month list first
      render();
    } else close();
  };
  document.addEventListener('keydown', onKey);
  $('#close').onclick = close;
  $('.overlay').addEventListener('click', (e) => {
    if (e.target.classList.contains('overlay')) close();
  });

  // ---------- render ----------
  function render() {
    const listScroll = root.querySelector('.menu .list')?.scrollTop || 0;
    const pageScroll = $('#body').scrollTop;
    const allMonths = allMonthKeys();
    const r = calculate(rows, selected, leaveMap, ignoredDays, includeToday, today),
      t = r.total,
      ok = balance(t) >= 0;
    const ignoredCount = r.days.filter((d) => d.ignored && d.date !== today).length;
    const sorted = [...selected].sort();
    const title = !sorted.length
      ? 'All months'
      : sorted.length === 1
        ? monthLong(sorted[0])
        : `${monthLong(sorted[0])} – ${monthLong(sorted[sorted.length - 1])}`;
    const extras = [
      t.wfh ? `${fmt(t.wfh * HOURS * 60)} WFH` : '',
      t.off ? `${fmt(t.off)} on days off` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const shownLeaves = leaves.filter(
      (l) =>
        !selected.size ||
        [...selected].some((k) => {
          const s = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1),
            e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
          return l.from < e && l.to >= s;
        }),
    );

    $('#body').innerHTML = `
      <div class="head">
        <div><h1>${esc(title)}</h1><div class="sub">${r.days.length} days in the table · ${r.months.length} month${r.months.length === 1 ? '' : 's'}</div></div>
        <div class="picker">
          <button class="pick ${menuOpen ? 'open' : ''}" data-toggle="1">
            <span>${!sorted.length ? 'All months' : sorted.length === 1 ? monthLong(sorted[0]) : `${sorted.length} months selected`}</span><span class="caret">▼</span>
          </button>
          ${
            menuOpen
              ? `<div class="menu">
            <div class="quicks">
              <button class="quick" data-q="all">All</button><button class="quick" data-q="this">This month</button>
              <button class="quick" data-q="last3">Last 3</button><button class="quick" data-q="clear">Clear</button>
            </div>
            <div class="list">
              ${allMonths
                .map(
                  (k, i) =>
                    (i === 0 || allMonths[i - 1].slice(0, 4) !== k.slice(0, 4)
                      ? `<div class="year">${k.slice(0, 4)}</div>`
                      : '') +
                    `<label><input type="checkbox" data-m="${k}" ${selected.has(k) ? 'checked' : ''}>${monthLong(k).split(' ')[0]}</label>`,
                )
                .join('')}
            </div>
          </div>`
              : ''
          }
        </div>
      </div>
      <div class="kpis">
        ${kpi('Working days', t.working, '', '#2563eb')}
        ${kpi('Days off', t.excluded + t.weekend, `${t.excluded} leave/holiday · ${t.weekend} weekend`, '#94a3b8')}
        ${kpi('WFH', fmt(t.wfh * HOURS * 60), `${t.wfh} days × ${HOURS}h`, '#7c3aed')}
        ${kpi('Required hours', fmt(required(t)), `${t.working} days × ${HOURS}h`, '#1f3a5f')}
        ${kpi('Total worked', fmt(t.worked), extras ? 'incl. ' + extras : '', '#0d9488')}
        ${kpi('Average / day', fmt(average(t)), `target ${pad(HOURS)}:00`, average(t) >= HOURS * 60 ? '#1a7f37' : '#c62828', average(t) >= HOURS * 60 ? 'g' : 'r')}
        ${kpi('Balance', sfmt(balance(t)), ok ? 'extra hours' : 'hours short', ok ? '#1a7f37' : '#c62828', ok ? 'g' : 'r')}
      </div>
      <div class="banner ${ok ? 'ok' : 'bad'}">${
        !t.working
          ? 'No working days in this period yet.'
          : ok
            ? `✅ You have ${sfmt(balance(t))} extra hours.`
            : `⚠️ Your average is below ${HOURS}:00 – you should work ${fmt(balance(t))} more hours.`
      }</div>
      <div class="banner today" id="today"></div>
      ${
        r.months.length > 1
          ? `<div class="section"><h2>By month</h2><table>
        <tr><th>Month</th><th>Working days</th><th>Leave / holiday</th><th>Weekend</th><th>WFH days</th><th>Required</th><th>Total worked</th><th>Average / day</th><th>Balance</th></tr>
        ${[...r.months]
          .reverse()
          .concat([t])
          .map(
            (m) => `<tr class="${m.month === 'Total' ? 'total' : ''}">
          <td>${m.month === 'Total' ? 'Total' : monthLong(m.month)}</td><td>${m.working}</td><td>${m.excluded}</td><td>${m.weekend}</td><td>${m.wfh}</td>
          <td>${fmt(required(m))}</td><td>${fmt(m.worked)}</td><td>${fmt(average(m))}</td>
          <td class="b ${balance(m) >= 0 ? 'g' : 'r'}">${sfmt(balance(m))}</td></tr>`,
          )
          .join('')}
      </table></div>`
          : ''
      }
      <div class="section"><h2>Days · ${r.days.length}${ignoredCount ? ` · ${ignoredCount} unticked (not counted)` : ''}</h2><table>
        <tr><th>Include</th><th>Date</th><th>Day</th><th>Check in</th><th>Check out</th><th>Worked</th><th>Status</th><th>Counted</th></tr>
        ${r.days
          .map((d) => {
            const note = d.ignored
              ? d.date === today
                ? 'No – today (tick to count it)'
                : 'No – unticked'
              : d.off
                ? d.minutes
                  ? `No – ${d.off} (+${fmt(d.minutes)} extra)`
                  : `No – ${d.off}`
                : d.wfh
                  ? `Yes – WFH ${HOURS}h`
                  : d.minutes
                    ? 'Yes'
                    : 'Yes – no hours';
            const cls = d.ignored || d.off ? 'muted' : !d.minutes ? 'zero' : '';
            const wcls = d.ignored
              ? ''
              : d.off
                ? d.minutes
                  ? 'b g'
                  : ''
                : d.wfh
                  ? 'b p'
                  : d.minutes < HOURS * 60
                    ? 'b r'
                    : 'b';
            return `<tr class="${cls}"><td><input type="checkbox" data-day="${d.date}" ${d.ignored ? '' : 'checked'}></td><td>${d.date}</td><td>${esc(d.weekday)}</td><td>${esc(d.checkIn)}</td><td>${esc(d.checkOut)}</td>
            <td class="${wcls}">${d.wfh ? fmt(d.minutes) + ' (WFH)' : esc(d.workedText)}</td><td>${badge(d.status)}</td><td>${esc(note)}</td></tr>`;
          })
          .join('')}
      </table></div>
      <div class="section"><h2>Leaves · ${leavesState === 'loading' ? 'reading…' : leavesState === 'error' ? 'could not read the Leave page' : shownLeaves.length}</h2>
        ${
          shownLeaves.length
            ? `<table><tr><th>Leave type</th><th>From</th><th>To</th><th>Duration</th><th>Status</th><th>Excluded from calculation</th></tr>
          ${shownLeaves
            .map(
              (
                l,
              ) => `<tr class="${l.approved ? '' : 'muted'}"><td>${esc(l.type)}</td><td>${dayStr(l.from)}</td><td>${dayStr(l.to)}</td>
            <td>${esc(l.duration)}</td><td>${badge(l.status)}</td><td>${l.approved ? 'Yes' : 'No – not approved'}</td></tr>`,
            )
            .join('')}</table>`
            : leavesState === 'done'
              ? '<div class="sub">No leaves in this period.</div>'
              : ''
        }
      </div>`;
    updateToday();
    $('#body').scrollTop = pageScroll; // re-render keeps the page and month list where they were
    const list = root.querySelector('.menu .list');
    if (list) list.scrollTop = listScroll;
  }

  function updateToday() {
    const el = root.getElementById('today');
    if (!el) return;
    const monthBalance = balance(
      calculate(rows, new Set([today.slice(0, 7)]), leaveMap, ignoredDays, false, today).total,
    );
    const { cls, text, time, advice } = describeToday({
      row: rows.find((r) => r[0] === today),
      now: new Date(),
      leaveType: leaveMap.get(today),
      monthBalance,
    });
    el.className = 'banner ' + cls;
    // badge first; leave times bold and bigger; balance advice on a second line
    el.innerHTML =
      `<span class="note">${includeToday ? 'Today is in the totals' : "Today isn't in the totals"}</span>${esc(text)}` +
      (time ? ` <span class="time">${time}</span>` : '') +
      (advice
        ? `<div class="advice ${advice.tone}">${esc(advice.before)} <span class="time">${advice.time}</span>${advice.after ? ' ' + esc(advice.after) : ''}</div>`
        : '');
  }
  todayTimer = setInterval(updateToday, 30000);

  // ---------- events ----------
  // Month dropdown: stays open while ticking months; closes on a click outside it or Esc
  root.addEventListener('click', (e) => {
    const inPicker = e.target.closest('.picker');
    if (!inPicker) {
      if (menuOpen) {
        menuOpen = false;
        render();
      }
      return;
    }
    const b = e.target.closest('button');
    if (b?.dataset.toggle) {
      menuOpen = !menuOpen;
      render();
      return;
    }
    if (!b?.dataset.q) return;
    const all = allMonthKeys();
    if (b.dataset.q === 'all' || b.dataset.q === 'clear') selected.clear();
    else if (b.dataset.q === 'this') {
      selected.clear();
      selected.add(today.slice(0, 7));
    } else if (b.dataset.q === 'last3') {
      selected.clear();
      all.slice(0, 3).forEach((k) => selected.add(k));
    }
    if (selected.size === all.length) selected.clear(); // every month ticked = all months
    render();
  });
  root.addEventListener('change', (e) => {
    const day = e.target.dataset?.day;
    if (day === today) {
      includeToday = e.target.checked;
      render();
      return;
    }
    if (day) {
      if (e.target.checked) ignoredDays.delete(day);
      else ignoredDays.add(day);
      render();
      return;
    }
    const k = e.target.dataset?.m;
    if (!k) return;
    if (e.target.checked) selected.add(k);
    else selected.delete(k);
    if (selected.size === allMonthKeys().length) selected.clear();
    render();
  });

  // ---------- public API ----------
  return {
    // Any of { rows, leaves, leavesState }; new rows pick the current month if none is selected
    setData(data) {
      if (data.rows) {
        rows = data.rows;
        const months = allMonthKeys();
        if (!selected.size && months.length)
          selected.add(months.includes(today.slice(0, 7)) ? today.slice(0, 7) : months[0]);
      }
      if (data.leaves) {
        leaves = data.leaves;
        leaveMap = leaveDayMap(leaves);
      }
      if (data.leavesState) leavesState = data.leavesState;
      render();
    },
    setStatus(text) {
      $('#status').textContent = text;
    },
    showMessage(html) {
      $('#body').innerHTML = `<div class="center">${html}</div>`;
    },
  };
}
