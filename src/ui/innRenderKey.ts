import type { GameState } from "../types/gameState";

export function getInnReadinessRenderKey(state: GameState): string {
  const heroRosterKey = state.heroes
    .map((hero) => `${hero.id}:${hero.assignedPartyId ?? "none"}`)
    .join("|");
  const unlockedRoomKey = state.innRooms
    .map((room) => `${room.roomId}:${room.isUnlocked ? 1 : 0}:${room.level}`)
    .join("|");
  const partyKey = state.parties
    .map((party) => `${party.id}:${party.isUnlocked ? 1 : 0}:${party.heroIds.join(",")}`)
    .join("|");

  return `${heroRosterKey}::${unlockedRoomKey}::${partyKey}`;
}
