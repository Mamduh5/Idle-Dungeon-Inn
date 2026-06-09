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
  },
  moss_bat: {
    enemyId: "moss_bat",
    name: "Moss Bat",
    baseStats: {
      hp: 44,
      attack: 8,
      defense: 2,
      attackSpeed: 1.15,
      critChance: 0.04,
      critDamage: 1.2,
      skillPower: 0,
      recovery: 0,
      aggro: 2,
      lootBonus: 0
    },
    unlockFloor: 4,
    lootTableId: "coins_small"
  },
  rust_goblin: {
    enemyId: "rust_goblin",
    name: "Rust Goblin",
    baseStats: {
      hp: 58,
      attack: 9,
      defense: 3,
      attackSpeed: 0.85,
      critChance: 0.05,
      critDamage: 1.25,
      skillPower: 0,
      recovery: 0,
      aggro: 4,
      lootBonus: 0
    },
    unlockFloor: 5,
    lootTableId: "coins_small"
  },
  ember_wisp: {
    enemyId: "ember_wisp",
    name: "Ember Wisp",
    baseStats: {
      hp: 48,
      attack: 9,
      defense: 2,
      attackSpeed: 0.8,
      critChance: 0.06,
      critDamage: 1.25,
      skillPower: 0,
      recovery: 0,
      aggro: 2,
      lootBonus: 0
    },
    unlockFloor: 6,
    lootTableId: "coins_small"
  },
  cracked_sentinel: {
    enemyId: "cracked_sentinel",
    name: "Cracked Sentinel",
    baseStats: {
      hp: 82,
      attack: 11,
      defense: 6,
      attackSpeed: 0.65,
      critChance: 0.03,
      critDamage: 1.2,
      skillPower: 0,
      recovery: 0,
      aggro: 7,
      lootBonus: 0
    },
    unlockFloor: 7,
    lootTableId: "coins_small"
  },
  cellar_hexer: {
    enemyId: "cellar_hexer",
    name: "Cellar Hexer",
    baseStats: {
      hp: 68,
      attack: 11,
      defense: 4,
      attackSpeed: 0.9,
      critChance: 0.07,
      critDamage: 1.3,
      skillPower: 0,
      recovery: 0,
      aggro: 3,
      lootBonus: 0
    },
    unlockFloor: 8,
    lootTableId: "coins_small"
  },
  tower_brute: {
    enemyId: "tower_brute",
    name: "Tower Brute",
    baseStats: {
      hp: 92,
      attack: 12,
      defense: 6,
      attackSpeed: 0.65,
      critChance: 0.04,
      critDamage: 1.25,
      skillPower: 0,
      recovery: 0,
      aggro: 8,
      lootBonus: 0
    },
    unlockFloor: 9,
    lootTableId: "coins_small"
  },
  floor_10_gatekeeper: {
    enemyId: "floor_10_gatekeeper",
    name: "Big Cave Slime",
    baseStats: {
      hp: 128,
      attack: 13,
      defense: 7,
      attackSpeed: 0.7,
      critChance: 0.05,
      critDamage: 1.3,
      skillPower: 0,
      recovery: 0,
      aggro: 10,
      lootBonus: 0
    },
    unlockFloor: 10,
    lootTableId: "coins_small"
  }
};
