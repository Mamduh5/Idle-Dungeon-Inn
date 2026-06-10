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
  },
  apprentice_archer: {
    classId: "apprentice_archer",
    name: "Apprentice Archer",
    role: "fast damage / fragile",
    baseStats: {
      hp: 82,
      attack: 14,
      defense: 5,
      attackSpeed: 1.35,
      critChance: 0.08,
      critDamage: 1.55,
      skillPower: 1,
      recovery: 3,
      aggro: 4,
      lootBonus: 0
    },
    growth: {
      hp: 11,
      attack: 4,
      defense: 1,
      recovery: 1
    },
    unlockFloor: 1,
    startingSkillIds: ["quick_shot"]
  }
};
