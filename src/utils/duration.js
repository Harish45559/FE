// client/src/utils/duration.js
import { DateTime } from 'luxon';

// Minutes diff between two ISO strings, safe across midnight
export function minutesBetweenAcrossMidnight(startISO, endISO) {
  let start = DateTime.fromISO(startISO, { zone: 'utc' });
  let end = DateTime.fromISO(endISO, { zone: 'utc' });

  if (!start.isValid || !end.isValid) return 0;

  // If end < start, it means overnight shift → add 1 day
  if (end < start) end = end.plus({ days: 1 });

  return Math.max(0, Math.round(end.diff(start, 'minutes').minutes));
}

// Convert minutes → HH:MM string
export function toHHMM(totalMinutes) {
  const m = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${String(h).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
