export const pad = (n) => String(n).padStart(2, '0');
export const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => dayStr(new Date());

// "HH:MM" → minutes
export const toMin = (s) => {
  const m = /(\d+):(\d{2})/.exec(s || '');
  return m ? +m[1] * 60 + +m[2] : 0;
};
// minutes → "HH:MM" (absolute value)
export const fmt = (n) => {
  const a = Math.round(Math.abs(n));
  return pad(Math.floor(a / 60)) + ':' + pad(a % 60);
};
// minutes → "+HH:MM" / "-HH:MM"
export const sfmt = (n) => (n < 0 ? '-' : '+') + fmt(n);

export const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
export const strip = (h) =>
  clean(
    String(h)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' '),
  );
export const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );

// 'yyyy-MM' → "October 2026"
export const monthLong = (k) =>
  new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

// yyyy-MM-dd or dd/MM/yyyy → local Date
export const anyDate = (s) => {
  let m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s || '');
  if (m) return new Date(+m[1], m[2] - 1, +m[3]);
  m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s || '');
  return m ? new Date(+m[3], m[2] - 1, +m[1]) : null;
};

// Check-in as the ERP shows it (dd/MM/yyyy HH:mm:ss) or ISO-like → local Date
export const parseCheckIn = (s) => {
  let m = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s || '');
  if (m) return new Date(+m[3], m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0));
  m = /(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s || '');
  return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : null;
};

// 12-hour, e.g. 03:32 PM
export const hhmm = (d) =>
  `${pad(d.getHours() % 12 || 12)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
