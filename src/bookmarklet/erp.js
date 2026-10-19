import { ATT_PATH, LEAVE_PATH } from './config.js';
import { clean, strip } from './format.js';
import { parseLeaves } from './leaves.js';

const cellsOf = (tr) => Array.from(tr.cells, (td) => clean(td.textContent));

// Thrown as Error('signin') when the ERP redirects to its login page
async function fetchDoc(path) {
  const res = await fetch(path, { credentials: 'include' });
  if (/\/web\/login/.test(new URL(res.url).pathname)) throw new Error('signin');
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return new DOMParser().parseFromString(await res.text(), 'text/html');
}

export async function readAttendance() {
  if (location.pathname.startsWith(ATT_PATH)) {
    // Already on the attendance page: use its data (all table pages, hidden state column included)
    try {
      const $ = window.jQuery;
      if ($ && $.fn.dataTable && $.fn.dataTable.isDataTable('#summaryTable')) {
        const rows = $('#summaryTable')
          .DataTable()
          .rows()
          .data()
          .toArray()
          .map((r) => Array.from(r, strip))
          .filter((r) => r.length >= 5);
        if (rows.length) return rows;
      }
    } catch {
      /* fall through */
    }
    const tb = document.querySelector('#summaryTable tbody');
    if (tb && tb.rows.length && tb.rows[0].cells.length >= 7) return Array.from(tb.rows, cellsOf);
  }
  const doc = await fetchDoc(ATT_PATH);
  if (!doc.querySelector('#summaryTable')) throw new Error('signin');
  return Array.from(doc.querySelectorAll('#summaryTable tbody tr'), cellsOf);
}

export async function readLeaves() {
  const parse = (doc) => {
    const table = [...doc.querySelectorAll('table')].sort(
      (a, b) => b.rows.length - a.rows.length,
    )[0];
    const headers = table?.tHead?.rows.length
      ? Array.from(table.tHead.rows[0].cells, (c) => clean(c.textContent))
      : [];
    const rows = [];
    if (table)
      for (const body of table.tBodies)
        for (const tr of body.rows) {
          const cells = cellsOf(tr);
          if (cells.some(Boolean)) rows.push(cells);
        }
    const links = [...doc.querySelectorAll('.pagination a[href]')]
      .map((a) => new URL(a.getAttribute('href'), location.origin))
      .filter((u) => u.pathname.startsWith(LEAVE_PATH))
      .map((u) => u.pathname + u.search);
    return { headers, rows, links };
  };
  const first = parse(await fetchDoc(LEAVE_PATH));
  const rows = [...first.rows],
    seen = new Set([LEAVE_PATH]);
  let batch = first.links;
  while (batch.length && seen.size < 30) {
    // other pages in parallel
    const urls = [...new Set(batch)].filter((u) => !seen.has(u));
    urls.forEach((u) => seen.add(u));
    batch = [];
    const docs = await Promise.all(urls.map((u) => fetchDoc(u).catch(() => null)));
    for (const p of docs.filter(Boolean).map(parse)) {
      rows.push(...p.rows);
      batch.push(...p.links);
    }
  }
  const unique = [...new Map(rows.map((r) => [r.join('|'), r])).values()]; // page 1 may be fetched twice
  return parseLeaves(first.headers, unique);
}
