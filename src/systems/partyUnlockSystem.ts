import type { GameState } from "../types/gameState";
import type { PartyState } from "../types/partyTypes";

export const PARTY_B_ID = "party_b";
export const PARTY_B_UNLOCK_FLOOR = 20;

export function isPartyBUnlockedByProgress(highestFloorCleared: number, unlockedFloor: number): boolean {
  return highestFloorCleared >= PARTY_B_UNLOCK_FLOOR || unlockedFloor > PARTY_B_UNLOCK_FLOOR;
}

export function normalizePartyUnlocksForProgress(
  parties: PartyState[],
  highestFloorCleared: number,
  unlockedFloor: number
): PartyState[] {
  if (!isPartyBUnlockedByProgress(highestFloorCleared, unlockedFloor)) {
    return parties;
  }

  return parties.map((party) =>
    party.id === PARTY_B_ID
      ? {
          ...party,
          isUnlocked: true
        }
      : party
  );
}

export function applyPartyUnlocksForProgress(state: GameState): GameState {
  const parties = normalizePartyUnlocksForProgress(state.parties, state.highestFloorCleared, state.unlockedFloor);

  return parties === state.parties
    ? state
    : {
        ...state,
        parties
      };
}
