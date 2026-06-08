import type { HeroDefinition } from "../types/heroTypes";
import type { HeroClassId } from "../types/ids";

export const heroDefinitions: Record<HeroClassId, HeroDefinition> = {
  rookie_knight: {
    classId: "rookie_knight",
    name: "Rookie Knight",
    role: "tank/frontline",
    baseStats: {
      hp: 120,
      attack: 12,
      defense: 10,
      attackSpeed: 1,
      critChance: 0.05,
      critDamage: 1.5,
      skillPower: 1,
      recovery: 4,
      aggro: 10,
      lootBonus: 0
    },
    growth: {
      hp: 18,
      attack: 3,
      defense: 2,
      recovery: 1
    },
    unlockFloor: 1,
    startingSkillIds: ["basic_slash"]
  }
};
