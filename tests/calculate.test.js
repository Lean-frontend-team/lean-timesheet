import { describe, expect, it } from 'vitest';
import { average, balance, calculate, required } from '../src/bookmarklet/calculate.js';

// [date, weekday, check in, check out, worked, status, state]
const row = (date, worked, status = 'Attended', state = 'attended') => [
  date,
  '',
  '',
  '',
  worked,
  status,
  state,
];
const TODAY = '2026-10-19';
const all = new Set();

describe('calculate', () => {
  it('requires 8h per Sun–Thu working day', () => {
    const r = calculate(
      [row('2026-10-04', '09:00'), row('2026-10-05', '07:30')],
      all,
      new Map(),
      new Set(),
      false,
      TODAY,
    );
    expect(r.total.working).toBe(2);
    expect(required(r.total)).toBe(16 * 60);
    expect(r.total.worked).toBe(16 * 60 + 30);
    expect(balance(r.total)).toBe(30);
    expect(average(r.total)).toBe(8 * 60 + 15);
  });

  it('does not require weekends and counts hours worked on them as extra', () => {
    const r = calculate(
      [row('2026-10-02', '03:00'), row('2026-10-03', '00:00')],
      all,
      new Map(),
      new Set(),
      false,
      TODAY,
    );
    expect(r.total.working).toBe(0);
    expect(r.total.weekend).toBe(2);
    expect(r.total.off).toBe(180);
    expect(balance(r.total)).toBe(180);
  });

  it('credits WFH as 8h', () => {
    const r = calculate(
      [row('2026-10-05', '00:00', 'Work From Home', 'work_from_home')],
      all,
      new Map(),
      new Set(),
      false,
      TODAY,
    );
    expect(r.total.wfh).toBe(1);
    expect(balance(r.total)).toBe(0);
  });

  it('excludes approved leaves and leave/holiday states', () => {
    const r = calculate(
      [
        row('2026-10-04', '00:00'),
        row('2026-10-05', '00:00', 'Public Holiday', 'public_holiday'),
        row('2026-10-06', '02:00'),
      ],
      all,
      new Map([['2026-10-04', 'Annual Leave']]),
      new Set(),
      false,
      TODAY,
    );
    expect(r.total.working).toBe(1);
    expect(r.total.excluded).toBe(2);
    expect(balance(r.total)).toBe(-6 * 60);
  });

  it('still requires 8h on absence days', () => {
    const r = calculate(
      [row('2026-10-04', '00:00', 'Absence', 'absence')],
      all,
      new Map(),
      new Set(),
      false,
      TODAY,
    );
    expect(balance(r.total)).toBe(-8 * 60);
  });

  it('leaves today out unless includeToday is set', () => {
    const rows = [row('2026-10-15', '08:00'), row(TODAY, '04:00')];
    const without = calculate(rows, all, new Map(), new Set(), false, TODAY);
    expect(without.total.working).toBe(1);
    expect(without.todaySkipped).toBe(true);
    expect(without.days.find((d) => d.date === TODAY).ignored).toBe(true);

    const withToday = calculate(rows, all, new Map(), new Set(), true, TODAY);
    expect(withToday.total.working).toBe(2);
    expect(balance(withToday.total)).toBe(-4 * 60);
  });

  it('leaves unticked days out of the totals but keeps them in the list', () => {
    const r = calculate(
      [row('2026-10-04', '08:00'), row('2026-10-05', '01:00')],
      all,
      new Map(),
      new Set(['2026-10-05']),
      false,
      TODAY,
    );
    expect(r.total.working).toBe(1);
    expect(r.days).toHaveLength(2);
  });

  it('adds hours for a duplicated date but requires it once', () => {
    const r = calculate(
      [row('2026-10-04', '05:00'), row('2026-10-04', '03:00')],
      all,
      new Map(),
      new Set(),
      false,
      TODAY,
    );
    expect(r.total.working).toBe(1);
    expect(balance(r.total)).toBe(0);
  });

  it('filters by selected months and groups by month', () => {
    const rows = [row('2026-09-30', '08:00'), row('2026-10-01', '09:00')];
    const oct = calculate(rows, new Set(['2026-10']), new Map(), new Set(), false, TODAY);
    expect(oct.months.map((m) => m.month)).toEqual(['2026-10']);

    const both = calculate(rows, all, new Map(), new Set(), false, TODAY);
    expect(both.months.map((m) => m.month)).toEqual(['2026-09', '2026-10']);
    expect(both.days.map((d) => d.date)).toEqual(['2026-10-01', '2026-09-30']);
  });

  it('skips rows without a valid date', () => {
    const r = calculate(
      [['Total', '', '', '', '99:00'], row('2026-10-04', '08:00')],
      all,
      new Map(),
      new Set(),
      false,
      TODAY,
    );
    expect(r.days).toHaveLength(1);
  });
});
