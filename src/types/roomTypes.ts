import type { HeroId, RoomId, TowerFloorId } from "./ids";

export type RoomJobType =
  | "healing"
  | "training"
  | "food_prep"
  | "gear_upgrade"
  | "morale"
  | "skill_study"
  | "alchemy"
  | "travel_prep";

export type RoomJobStatus = "active" | "paused" | "complete";

export interface RoomJob {
  id: string;
  roomId: RoomId;
  heroId: HeroId;
  jobType: RoomJobType;
  status: RoomJobStatus;
  progress: number;
  startedAt: number;
  updatedAt: number;
}

export interface RoomDefinition {
  roomId: RoomId;
  name: string;
  description: string;
  baseCost: number;
  costGrowth: number;
  effectType: string;
  unlockFloor: TowerFloorId;
}

export interface InnRoomState {
  roomId: RoomId;
  level: number;
  isUnlocked: boolean;
  activeJob: string | null;
  jobs: RoomJob[];
}
