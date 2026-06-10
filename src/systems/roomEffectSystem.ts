import { getInnRoom } from "../state/gameSelectors";
import type { GameState } from "../types/gameState";
import type { RoomId } from "../types/ids";

export const BASE_TOWER_TRAVEL_DURATION_MS = 1600;
export const BASE_AUTO_DISPATCH_COOLDOWN_MS = 1500;

export function getUnlockedRoomLevel(state: GameState, roomId: RoomId): number {
  const room = getInnRoom(state, roomId);
  return room?.isUnlocked ? Math.max(0, Math.floor(room.level)) : 0;
}

export function getGateRoomTravelDurationMs(state: GameState): number {
  return calculateGateRoomTravelDurationMsForLevel(getUnlockedRoomLevel(state, "gate_room"));
}

export function calculateGateRoomTravelDurationMsForLevel(level: number): number {
  const reduction = Math.min(0.4, level * 0.08);
  return Math.max(600, Math.round(BASE_TOWER_TRAVEL_DURATION_MS * (1 - reduction)));
}

export function getLibraryAutoDispatchCooldownMs(state: GameState): number {
  return calculateLibraryAutoDispatchCooldownMsForLevel(getUnlockedRoomLevel(state, "library"));
}

export function calculateLibraryAutoDispatchCooldownMsForLevel(level: number): number {
  const reduction = Math.min(0.5, level * 0.1);
  return Math.max(500, Math.round(BASE_AUTO_DISPATCH_COOLDOWN_MS * (1 - reduction)));
}
