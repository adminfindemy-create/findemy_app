// Client mirror of backend/api/src/lib/ist.ts. A slot's wall-clock is an IST
// (+05:30, no DST) wall-clock; we store/transport the UTC instant. These
// pure-offset helpers replace device-local Date.getHours/setHours so slot
// math no longer depends on the device timezone.
const IST_OFFSET_MIN = 5 * 60 + 30;

/** IST calendar date ('yyyy-MM-dd') of an instant (ISO string or Date). */
export function istDateKey(instant: string | Date): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  const shifted = new Date(date.getTime() + IST_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Given an existing slot instant `iso`, return the ISO string of the UTC
 * instant for IST wall-clock `hh:mm` on the SAME IST calendar day as `iso`.
 * Used when a coach edits a slot's time.
 */
export function setIstWallClock(iso: string, hh: number, mm: number): string {
  const dateStr = istDateKey(iso); // IST day of the original slot
  const [y, mo, d] = dateStr.split('-').map(Number);
  const asUtcMillis = Date.UTC(y, (mo ?? 1) - 1, d ?? 1, hh, mm, 0, 0);
  return new Date(asUtcMillis - IST_OFFSET_MIN * 60_000).toISOString();
}
