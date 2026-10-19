import { CACHE_KEY } from './config.js';
import { anyDate, dayStr } from './format.js';

// Saved copy (this browser only, erp.lean.sa origin): shown instantly, then refreshed from the ERP
export const saveCache = (rows, leaves) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        rows,
        leaves: leaves.map((l) => ({ ...l, from: dayStr(l.from), to: dayStr(l.to) })),
      }),
    );
  } catch {
    /* storage full or blocked: just skip */
  }
};

export const loadCache = () => {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!c?.rows?.length) return null;
    return {
      ...c,
      leaves: (c.leaves || []).map((l) => ({ ...l, from: anyDate(l.from), to: anyDate(l.to) })),
    };
  } catch {
    return null;
  }
};
