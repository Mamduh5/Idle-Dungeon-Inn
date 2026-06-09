import { heroDefinitions } from "../data/heroData";
import { getHeroTrainingAttackBonus } from "./roomJobSystem";
import type { CombatStats } from "../types/combatTypes";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";

export type CombatStatBonuses = {
  hp: number;
  attack: number;
  defense: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
  skillPower: number;
  recovery: number;
  aggro: number;
  lootBonus: number;
};

export function createHeroCombatStats(state: GameState, hero: HeroInstance): CombatStats | null {
  const baseStats = heroDefinitions[hero.classId]?.baseStats;

  if (!baseStats) {
    return null;
  }

  const bonuses = createHeroCombatBonuses(state, hero);

  return {
    hp: baseStats.hp + bonuses.hp,
    attack: Math.max(0, baseStats.attack + bonuses.attack),
    defense: baseStats.defense + bonuses.defense,
    attackSpeed: baseStats.attackSpeed + bonuses.attackSpeed,
    critChance: baseStats.critChance + bonuses.critChance,
    critDamage: baseStats.critDamage + bonuses.critDamage,
    skillPower: baseStats.skillPower + bonuses.skillPower,
    recovery: baseStats.recovery + bonuses.recovery,
    aggro: baseStats.aggro + bonuses.aggro,
    lootBonus: baseStats.lootBonus + bonuses.lootBonus
  };
}

export function createHeroCombatBonuses(_state: GameState, hero: HeroInstance): CombatStatBonuses {
  return {
    ...createEmptyCombatStatBonuses(),
    attack: getHeroTrainingAttackBonus(hero)
  };
}

function createEmptyCombatStatBonuses(): CombatStatBonuses {
  return {
    hp: 0,
    attack: 0,
    defense: 0,
    attackSpeed: 0,
    critChance: 0,
    critDamage: 0,
    skillPower: 0,
    recovery: 0,
    aggro: 0,
    lootBonus: 0
  };
}
