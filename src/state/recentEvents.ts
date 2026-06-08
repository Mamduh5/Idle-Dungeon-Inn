import type { RecentEvent } from "../types/recentEventTypes";

export const RECENT_EVENT_LIMIT = 20;

export function appendRecentEvent(events: RecentEvent[], event: RecentEvent): RecentEvent[] {
  return [event, ...events].slice(0, RECENT_EVENT_LIMIT);
}
