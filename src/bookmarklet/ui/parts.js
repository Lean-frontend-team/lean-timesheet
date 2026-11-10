import { esc } from '../format.js';

// Small HTML pieces shared by the tabs
export const badge = (s) => {
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

export const kpi = (title, value, note, color, valueClass = '') =>
  `<div class="kpi" style="--c:${color}"><div class="t">${title}</div><div class="v ${valueClass}">${value}</div><div class="n">${note || '&nbsp;'}</div></div>`;
