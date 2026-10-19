import { describe, expect, it } from 'vitest';
import { describeToday } from '../src/bookmarklet/today.js';

const row = (checkIn, status = 'Attended', state = 'attended') => [
  '2026-10-19',
  'Monday',
  checkIn,
  '',
  '',
  status,
  state,
];
const MONDAY_1PM = new Date(2026, 9, 19, 13, 0);

describe('describeToday', () => {
  it('shows the leave time 8h after check-in', () => {
    const t = describeToday({
      row: row('19/10/2026 08:30:00'),
      now: MONDAY_1PM,
      monthBalance: 0,
    });
    expect(t.cls).toBe('today');
    expect(t.time).toBe('04:30 PM');
    expect(t.text).toContain('worked 04:30');
    expect(t.advice).toBeNull();
  });

  it('lets a positive balance leave earlier', () => {
    const t = describeToday({ row: row('19/10/2026 08:30:00'), now: MONDAY_1PM, monthBalance: 60 });
    expect(t.advice).toMatchObject({ tone: 'g', time: '03:30 PM' });
  });

  it('caps the recovery advice at 2h', () => {
    const t = describeToday({
      row: row('19/10/2026 08:30:00'),
      now: MONDAY_1PM,
      monthBalance: -300,
    });
    expect(t.advice).toMatchObject({
      tone: 'r',
      time: '06:30 PM',
      after: '(recovers 02:00 of it)',
    });
  });

  it('marks the day done once 8h are worked', () => {
    const t = describeToday({ row: row('19/10/2026 04:00:00'), now: MONDAY_1PM, monthBalance: 0 });
    expect(t.cls).toBe('today done');
  });

  it('treats weekends, leaves and WFH as no hours needed', () => {
    const friday = new Date(2026, 9, 16, 10, 0);
    expect(describeToday({ row: null, now: friday, monthBalance: 0 }).cls).toBe('today off');
    expect(
      describeToday({ row: null, now: MONDAY_1PM, leaveType: 'Annual', monthBalance: 0 }).text,
    ).toContain('(Annual)');
    expect(
      describeToday({
        row: row('', 'Work From Home', 'work_from_home'),
        now: MONDAY_1PM,
        monthBalance: 0,
      }).text,
    ).toContain('WFH');
  });

  it('asks to check in when there is no check-in', () => {
    const t = describeToday({ row: null, now: MONDAY_1PM, monthBalance: 0 });
    expect(t.text).toContain('No check-in');
  });
});
