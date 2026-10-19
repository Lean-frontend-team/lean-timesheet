import { describe, expect, it } from 'vitest';
import { leaveDayMap, parseLeaves } from '../src/bookmarklet/leaves.js';

const HEADERS = ['Leave Type', 'From', 'To', 'Duration', 'Status'];

describe('parseLeaves', () => {
  it('reads columns by header and detects approval', () => {
    const leaves = parseLeaves(HEADERS, [
      ['Annual Leave', '04/10/2026', '06/10/2026', '3 days', 'Approved'],
      ['Sick Leave', '2026-09-01', '2026-09-01', '1 day', 'To Approve'],
      ['Annual Leave', '2026-08-10', '2026-08-11', '2 days', 'Refused'],
    ]);
    expect(leaves).toHaveLength(3);
    expect(leaves[0]).toMatchObject({ type: 'Annual Leave', approved: true, duration: '3 days' });
    expect(leaves[0].from).toEqual(new Date(2026, 9, 4));
    expect(leaves[0].to).toEqual(new Date(2026, 9, 6));
    expect(leaves[1].approved).toBe(false);
    expect(leaves[2].approved).toBe(false);
  });

  it('sorts newest first and drops rows without dates', () => {
    const leaves = parseLeaves(HEADERS, [
      ['A', '2026-01-01', '2026-01-01', '', 'Approved'],
      ['no dates here', '', '', '', ''],
      ['B', '2026-05-01', '2026-05-01', '', 'Approved'],
    ]);
    expect(leaves.map((l) => l.type)).toEqual(['B', 'A']);
  });
});

describe('leaveDayMap', () => {
  it('expands approved leaves into days', () => {
    const map = leaveDayMap([
      { type: 'Annual', from: new Date(2026, 9, 4), to: new Date(2026, 9, 6), approved: true },
      { type: 'Sick', from: new Date(2026, 9, 8), to: new Date(2026, 9, 8), approved: false },
    ]);
    expect([...map.keys()]).toEqual(['2026-10-04', '2026-10-05', '2026-10-06']);
    expect(map.get('2026-10-05')).toBe('Annual');
  });
});
