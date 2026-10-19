// Lean Attendance – runs inside erp.lean.sa (bookmarklet or console), on Windows and Mac.
// Built into a single minified IIFE by the `bookmarklet` Vite plugin (see vite.config.js).
import { loadCache, saveCache } from './cache.js';
import { ALLOWED_HOST, ATT_PATH } from './config.js';
import { readAttendance, readLeaves } from './erp.js';
import { dayStr, esc, pad } from './format.js';
import { openPanel } from './ui/panel.js';

async function main() {
  // localhost is allowed only for testing
  if (!ALLOWED_HOST.test(location.hostname) && location.hostname !== 'localhost') {
    alert(
      'Lean Attendance works on the ERP.\n\nOpen https://erp.lean.sa, sign in, then click "Lean Attendance" again.',
    );
    return;
  }
  const panel = openPanel();

  const cached = loadCache();
  if (cached) {
    panel.setData({ rows: cached.rows, leaves: cached.leaves, leavesState: 'done' });
    const at = new Date(cached.savedAt);
    panel.setStatus(
      `Saved ${dayStr(at)} ${pad(at.getHours())}:${pad(at.getMinutes())} · updating…`,
    );
  }

  try {
    // Attendance and leaves are read at the same time; attendance is shown as soon as it arrives
    const leavesPromise = readLeaves();
    leavesPromise.catch(() => {});
    const rows = await readAttendance();
    let leaves = cached?.leaves || [];
    panel.setStatus(`${rows.length} days loaded · reading leaves…`);
    panel.setData({ rows });
    saveCache(rows, leaves);
    try {
      leaves = await leavesPromise;
      panel.setData({ leaves, leavesState: 'done' });
    } catch {
      panel.setData({ leavesState: cached ? 'done' : 'error' });
    }
    panel.setStatus(
      `${rows.length} days · ${leaves.filter((l) => l.approved).length} approved leaves · updated now`,
    );
    saveCache(rows, leaves);
  } catch (e) {
    if (cached) {
      // keep showing the saved copy
      panel.setStatus(
        e.message === 'signin'
          ? 'Showing saved data – sign in to the ERP to update'
          : 'Showing saved data – could not update',
      );
      return;
    }
    panel.showMessage(
      e.message === 'signin'
        ? `You're not signed in to the ERP.<br><br><a href="${ATT_PATH}">Sign in at erp.lean.sa</a>, then click <b>Lean Attendance</b> again.`
        : `Something went wrong: ${esc(e.message)}`,
    );
  }
}

main();
