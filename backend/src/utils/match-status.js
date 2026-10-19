export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

/**
 * Calculates current match status based on start/end times relative to now.
 *
 * @param {string|Date} startTime - ISO string or Date object
 * @param {string|Date|null} [endTime] - ISO string, Date object or null
 * @param {Date} [now] - Current timestamp reference (defaults to new Date())
 * @returns {'scheduled'|'live'|'finished'}
 */
export function getMatchStatus(startTime, endTime, now = new Date()) {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;
  const current = new Date(now);

  if (current < start) {
    return MATCH_STATUS.SCHEDULED;
  }
  if (end && current > end) {
    return MATCH_STATUS.FINISHED;
  }
  return MATCH_STATUS.LIVE;
}
