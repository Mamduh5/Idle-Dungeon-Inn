import type { RoomId, TowerFloorId } from "./ids";

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
}
