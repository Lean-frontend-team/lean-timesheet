import { describe, expect, it } from 'vitest';
import { parseLeaves } from '../src/bookmarklet/leaves.js';
import { holidaySet, leaveCategory, summarizeLeaves } from '../src/bookmarklet/leaveSummary.js';

// Headers and rows as the ERP "My Leaves" page shows them
const HEADERS = ['Description', 'Date From', 'Date To', 'State'];
const ERP_ROWS = [
  ['Sickness', '09/07/2024', '09/07/2024', 'Rejected'],
  ['Sickness', '10/07/2024', '10/07/2024', 'Approved'],
  ['Annual Vacation', '29/10/2024', '07/11/2024', 'Approved'],
  ['Annual Vaction', '13/04/2025', '20/04/2025', 'Approved'],
  ['sick leave', '27/01/2025', '09/02/2025', 'Approved'],
  ['Marriage', '06/04/2025', '10/04/2025', 'Approved'],
  ['Annual vaction', '21/04/2025', '01/05/2025', 'Approved'],
  ['Auto Scheduled by HR', '02/11/2025', '11/11/2025', ''],
  ['Annual vaction', '26/03/2025', '27/03/2025', 'Approved'],
  ['sick leave', '12/06/2025', '12/06/2025', ''],
  ['Annual vacation', '12/06/2025', '12/06/2025', 'Approved'],
];
const leaves = parseLeaves(HEADERS, ERP_ROWS);
const byType = (s) => Object.fromEntries(s.types.map((t) => [t.type, t]));

describe('leaveCategory', () => {
  it('guesses the type from free-text descriptions, typos included', () => {
    expect(leaveCategory('Annual Vaction')).toBe('Annual');
    expect(leaveCategory('annual')).toBe('Annual');
    expect(leaveCategory('sick leave')).toBe('Sick');
    expect(leaveCategory('Sickness')).toBe('Sick');
    expect(leaveCategory('Hajj')).toBe('Hajj');
    expect(leaveCategory('Marriage')).toBe('Marriage');
    expect(leaveCategory('Unpaid leave')).toBe('Unpaid');
    expect(leaveCategory('Auto Scheduled by HR')).toBe('Other');
  });
});

describe('summarizeLeaves', () => {
  it('counts approved days per type, Sun–Thu as working days', () => {
    const s = summarizeLeaves(leaves, { today: '2026-11-10' });
    const t = byType(s);
    // 10/07/2024 (Wed) + 27/01–09/02/2025 (14 days, 10 Sun–Thu)
    expect(t.Sick).toMatchObject({ requests: 2, calendar: 15, workdays: 11 });
    // 06–10/04/2025 Sun–Thu
    expect(t.Marriage).toMatchObject({ requests: 1, calendar: 5, workdays: 5 });
    // 10 + 8 + 11 + 2 + 1 calendar days
    expect(t.Annual).toMatchObject({ requests: 5, calendar: 32 });
    expect(s.types.map((x) => x.type)).toEqual(['Annual', 'Sick', 'Marriage']);
    expect(s.notCounted).toBe(3); // rejected + 2 without a state
    expect(s.total.calendar).toBe(15 + 5 + 32);
  });

  it('starts from the join date and clips leaves that began before it', () => {
    const s = summarizeLeaves(leaves, { since: new Date(2024, 10, 5), today: '2026-11-10' });
    const t = byType(s);
    expect(t.Sick.requests).toBe(1); // July 2024 is before joining
    expect(t.Annual.calendar).toBe(3 + 8 + 11 + 2 + 1); // 05–07/11/2024 only
  });

  it('keeps future days apart as upcoming and skips public holidays', () => {
    const future = parseLeaves(HEADERS, [['Hajj', '2026-11-08', '2026-11-12', 'Approved']]);
    const s = summarizeLeaves(future, {
      today: '2026-11-10',
      holidays: holidaySet([['2026-11-09', '', '', '', '', 'Public Holiday', 'public_holiday']]),
    });
    // 08 Sun, 09 holiday, 10 Tue → taken; 11 Wed, 12 Thu → upcoming
    expect(byType(s).Hajj).toMatchObject({ calendar: 3, workdays: 2, upcoming: 2 });
  });

  it('splits working days by year and lists every leave, newest first', () => {
    const s = summarizeLeaves(leaves, { today: '2026-11-10' });
    expect(s.years.map((y) => y.year)).toEqual(['2025', '2024']);
    expect(s.years[1].byType).toEqual({ Sick: 1, Annual: 8 }); // 29/10–07/11/2024: 8 Sun–Thu
    expect(s.years.reduce((n, y) => n + y.total, 0)).toBe(s.total.workdays);
    expect(s.items).toHaveLength(ERP_ROWS.length);
    expect(s.items[0]).toMatchObject({ type: 'Auto Scheduled by HR', counted: false });
    expect(s.items.find((i) => i.type === 'Marriage')).toMatchObject({
      category: 'Marriage',
      workdays: 5,
      counted: true,
    });
  });

  it('counts a day in two overlapping leaves once', () => {
    const dup = parseLeaves(HEADERS, [
      ['Annual', '2026-10-04', '2026-10-05', 'Approved'],
      ['Annual', '2026-10-05', '2026-10-06', 'Approved'],
    ]);
    expect(summarizeLeaves(dup, { today: '2026-11-10' }).total.calendar).toBe(3);
  });
});
