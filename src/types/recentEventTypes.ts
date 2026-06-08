import type { HeroId, PartyId, TowerFloorId } from "./ids";

export type RecentEventType =
  | "party_dispatched"
  | "party_dispatch_blocked"
  | "tower_floor_entered"
  | "tower_node_reached"
  | "tower_node_continued"
  | "tower_node_continue_blocked"
  | "tower_encounter_started"
  | "tower_encounter_cleared"
  | "floor_cleared"
  | "floor_clear_blocked"
  | "party_floor_reached"
  | "party_wiped"
  | "hero_defeated"
  | "loot_found"
  | "room_job_completed"
  | "automation_triggered"
  | "boss_unlocked"
  | "upgrade_purchased"
  | "save_loaded"
  | "offline_report";

export type RecentEventSeverity = "info" | "success" | "warning" | "danger";

export interface RecentEvent {
  id: string;
  type: RecentEventType;
  createdAt: number;
  message: string;
  severity: RecentEventSeverity;
  partyId?: PartyId;
  heroId?: HeroId;
  floor?: TowerFloorId;
}
