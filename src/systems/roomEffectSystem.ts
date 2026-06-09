import { heroDefinitions } from "../data/heroData";
import { getInnRoom } from "../state/gameSelectors";
import type { GameState } from "../types/gameState";
import type { HeroId } from "../types/ids";

export function getBedRoomLevel(state: GameState): number {
  const bedRoom = getInnRoom(state, "bed_room");

  if (!bedRoom?.isUnlocked) {
    return 0;
  }

  return Math.max(0, Math.floor(bedRoom.level));
}

export function calculateBedRoomHealingForLevel(level: number): number {
  const bedLevel = Math.max(0, Math.floor(level));
  return bedLevel > 0 ? 15 + (bedLevel - 1) * 10 : 0;
}

export function calculateReturnHealingAmount(state: GameState): number {
  return calculateBedRoomHealingForLevel(getBedRoomLevel(state));
}

export function applyReturnHealing(state: GameState, heroIds: HeroId[]): GameState {
  const healingAmount = calculateReturnHealingAmount(state);

  if (healingAmount <= 0 || heroIds.length === 0) {
    return state;
  }

  const targetHeroIds = new Set(heroIds);
  let changed = false;
  const heroes = state.heroes.map((hero) => {
    if (!targetHeroIds.has(hero.id) || hero.currentHp <= 0) {
      return hero;
    }

    const maxHp = heroDefinitions[hero.classId]?.baseStats.hp;

    if (!maxHp) {
      return hero;
    }

    const nextHp = Math.min(maxHp, hero.currentHp + healingAmount);

    if (nextHp === hero.currentHp) {
      return hero;
    }

    changed = true;
    return {
      ...hero,
      currentHp: nextHp
    };
  });

  if (!changed) {
    return state;
  }

  return {
    ...state,
    heroes
  };
}
