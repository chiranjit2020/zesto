import { describe, expect, it } from 'vitest';
import { inWindow, localParts, minutesSinceMidnight } from './time.js';

describe('inWindow', () => {
  it('handles a normal same-day window', () => {
    expect(inWindow(8 * 60, 7 * 60, 10 * 60)).toBe(true); // 08:00 within 07:00–10:00
    expect(inWindow(6 * 60, 7 * 60, 10 * 60)).toBe(false);
    expect(inWindow(10 * 60, 7 * 60, 10 * 60)).toBe(false); // end is exclusive
  });

  it('handles a window that wraps past midnight (start > end)', () => {
    // quiet hours default: 23:00 -> 07:00
    expect(inWindow(23 * 60 + 30, 23 * 60, 7 * 60)).toBe(true); // 23:30
    expect(inWindow(3 * 60, 23 * 60, 7 * 60)).toBe(true); // 03:00
    expect(inWindow(12 * 60, 23 * 60, 7 * 60)).toBe(false); // 12:00, well outside
    expect(inWindow(7 * 60, 23 * 60, 7 * 60)).toBe(false); // end is exclusive
  });

  it('handles the midnight-hunger window (23:00 -> 02:00)', () => {
    expect(inWindow(23 * 60, 23 * 60, 2 * 60)).toBe(true);
    expect(inWindow(1 * 60 + 30, 23 * 60, 2 * 60)).toBe(true);
    expect(inWindow(2 * 60, 23 * 60, 2 * 60)).toBe(false); // end exclusive
    expect(inWindow(10 * 60, 23 * 60, 2 * 60)).toBe(false);
  });
});

describe('localParts / minutesSinceMidnight', () => {
  it('resolves a known UTC instant correctly for a non-UTC timezone', () => {
    // 2026-01-15T04:30:00Z is 2026-01-15 10:00 in Asia/Kolkata (UTC+5:30)
    const parts = localParts('Asia/Kolkata', new Date('2026-01-15T04:30:00Z'));
    expect(parts.hour).toBe(10);
    expect(parts.minute).toBe(0);
    expect(parts.dateKey).toBe('2026-01-15');
    expect(minutesSinceMidnight(parts)).toBe(10 * 60);
  });

  it('rolls the local date forward across a UTC midnight for a positive-offset timezone', () => {
    // 2026-01-15T23:00:00Z is 2026-01-16 04:30 in Asia/Kolkata
    const parts = localParts('Asia/Kolkata', new Date('2026-01-15T23:00:00Z'));
    expect(parts.dateKey).toBe('2026-01-16');
    expect(parts.hour).toBe(4);
    expect(parts.minute).toBe(30);
  });

  it('handles a negative-offset timezone distinctly from UTC', () => {
    // 2026-01-15T04:30:00Z is 2026-01-14 23:30 in America/New_York (UTC-5 in January)
    const parts = localParts('America/New_York', new Date('2026-01-15T04:30:00Z'));
    expect(parts.dateKey).toBe('2026-01-14');
    expect(parts.hour).toBe(23);
    expect(parts.minute).toBe(30);
  });
});
