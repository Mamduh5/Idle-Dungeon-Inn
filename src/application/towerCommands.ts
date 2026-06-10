import { completeSelectedFloor } from "../systems/floorClearSystem";
import { continueSelectedTowerRun } from "../systems/towerNodeActionSystem";
import { recoverSelectedWipedParty } from "../systems/wipeRecoverySystem";
import type { GameState } from "../types/gameState";

export function completeSelectedFloorFromTower(state: GameState, now?: number): GameState {
  return completeSelectedFloor(state, now);
}

export function continueSelectedRunFromTower(state: GameState, now?: number): GameState {
  return continueSelectedTowerRun(state, now);
}

export function recoverSelectedPartyFromTower(state: GameState, now?: number): GameState {
  return recoverSelectedWipedParty(state, now);
}
