import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { PartyId, RoomId } from "../types/ids";
import type { PartyState } from "../types/partyTypes";
import type { InnRoomState } from "../types/roomTypes";
import type { TowerRunState } from "../types/towerTypes";

export function getSelectedParty(state: GameState): PartyState | null {
  return state.parties.find((party) => party.id === state.selectedPartyId) ?? null;
}

export function getTowerRunForParty(state: GameState, partyId: PartyId): TowerRunState | null {
  return state.towerRuns.find((run) => run.partyId === partyId) ?? null;
}

export function getSelectedTowerRun(state: GameState): TowerRunState | null {
  return getTowerRunForParty(state, state.selectedPartyId);
}

export function getHeroesForParty(state: GameState, partyId: PartyId): HeroInstance[] {
  const party = state.parties.find((candidate) => candidate.id === partyId);

  if (!party) {
    return [];
  }

  return party.heroIds
    .map((heroId) => state.heroes.find((hero) => hero.id === heroId))
    .filter((hero): hero is HeroInstance => Boolean(hero));
}

export function getInnRoom(state: GameState, roomId: RoomId): InnRoomState | null {
  return state.innRooms.find((room) => room.roomId === roomId) ?? null;
}

export function getFirstPartyHero(state: GameState, partyId: PartyId): HeroInstance | null {
  return getHeroesForParty(state, partyId)[0] ?? null;
}
