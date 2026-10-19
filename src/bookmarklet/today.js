import { HOURS, MAX_RECOVERY_MIN, WEEKEND } from './config.js';
import { isOffState, isWfh } from './calculate.js';
import { fmt, hhmm, parseCheckIn, sfmt } from './format.js';

// Today line: hours left to complete the day and the earliest leave time (first check-in + 8h),
// plus advice from this month's balance (up to yesterday; today isn't counted).
// Returns { cls, text, time, advice: { tone, before, time, after } | null }
export function describeToday({ row, now, leaveType, monthBalance }) {
  const cell = (i) => (row && row[i]) || '';
  const state = cell(6).trim().toLowerCase();
  const off = (why) => ({
    cls: 'today off',
    text: `🕘 Today is a day off (${why}) – no hours needed.`,
    time: '',
    advice: null,
  });

  if (WEEKEND.includes(now.getDay())) return off('Weekend');
  if (leaveType) return off(leaveType);
  if (row && isOffState(state, cell(5))) return off(cell(5) || 'Leave / holiday');
  if (row && isWfh(state, cell(5)))
    return {
      cls: 'today',
      text: `🕘 Today is WFH – counted as ${HOURS}h.`,
      time: '',
      advice: null,
    };

  const checkIn = parseCheckIn(cell(2));
  if (!checkIn)
    return {
      cls: 'today',
      text: '🕘 No check-in recorded for today yet – click the bookmark again after you check in.',
      time: '',
      advice: null,
    };

  const leaveAt = new Date(checkIn.getTime() + HOURS * 3600e3);
  const worked = Math.max(0, (now - checkIn) / 60e3),
    left = (leaveAt - now) / 60e3;
  const done = left <= 0;
  const text = done
    ? `✅ Today: checked in ${hhmm(checkIn)} · ${HOURS}h completed (${sfmt(-left)} extra) · you could leave from`
    : `🕘 Today: checked in ${hhmm(checkIn)} · worked ${fmt(worked)} · ${fmt(left)} left to complete ${HOURS}h · you can leave at`;

  let advice = null;
  const bal = monthBalance;
  if (bal > 0) {
    const at = new Date(leaveAt.getTime() - bal * 60e3);
    advice =
      at <= now
        ? {
            tone: 'g',
            before: `💡 With your ${sfmt(bal)} balance this month, you can already leave –`,
            time: 'now',
            after: '',
          }
        : {
            tone: 'g',
            before: `💡 This is to complete ${HOURS}h, but your ${sfmt(bal)} balance this month lets you leave at`,
            time: hhmm(at),
            after: '',
          };
  } else if (bal < 0) {
    const stay = Math.min(-bal, MAX_RECOVERY_MIN); // never suggest more than 2h beyond the 8h time
    const at = new Date(leaveAt.getTime() + stay * 60e3);
    advice =
      stay < -bal
        ? {
            tone: 'r',
            before: `💡 This is to complete ${HOURS}h, but your ${sfmt(bal)} balance this month recommends staying until`,
            time: hhmm(at),
            after: `(recovers ${fmt(stay)} of it)`,
          }
        : {
            tone: 'r',
            before: `💡 This is to complete ${HOURS}h, but to recover your ${sfmt(bal)} balance this month, stay until`,
            time: hhmm(at),
            after: '',
          };
  }
  return { cls: done ? 'today done' : 'today', text, time: hhmm(leaveAt), advice };
}
