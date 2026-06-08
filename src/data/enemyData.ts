import type { EnemyDefinition } from "../types/enemyTypes";
import type { EnemyId } from "../types/ids";

export const enemyDefinitions: Record<EnemyId, EnemyDefinition> = {
  cave_slime: {
    enemyId: "cave_slime",
    name: "Cave Slime",
    baseStats: {
      hp: 45,
      attack: 6,
      defense: 2,
      attackSpeed: 0.8,
      critChance: 0,
      critDamage: 1,
      skillPower: 0,
      recovery: 0,
      aggro: 3,
      lootBonus: 0
    },
    unlockFloor: 1,
    lootTableId: "coins_small"
  },
  bone_rat: {
    enemyId: "bone_rat",
    name: "Bone Rat",
    baseStats: {
      hp: 36,
      attack: 8,
      defense: 1,
      attackSpeed: 1.3,
      critChance: 0.05,
      critDamage: 1.25,
      skillPower: 0,
      recovery: 0,
      aggro: 2,
      lootBonus: 0
    },
    unlockFloor: 2,
    lootTableId: "coins_small"
  }
};
