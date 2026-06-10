import { toggleAutoDispatch } from "../systems/automationSystem";
import { purchaseRoomUpgrade } from "../systems/roomUpgradeSystem";
import type { GameState } from "../types/gameState";
import type { RoomId } from "../types/ids";

export function purchaseRoomUpgradeFromBuild(state: GameState, roomId: RoomId, now?: number): GameState {
  return purchaseRoomUpgrade(roomId, now)(state);
}

export function toggleAutoDispatchFromBuild(state: GameState, now?: number): GameState {
  return toggleAutoDispatch(state, now);
}
