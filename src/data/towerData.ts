import { rewardDefinitions } from "./lootData";
import type { TowerFloorDefinition } from "../types/towerTypes";

export const prototypeTowerFloors: TowerFloorDefinition[] = [
  {
    floor: 1,
    themeId: "cave_entrance",
    nodes: [
      {
        id: "floor_1_combat_1",
        type: "combat",
        enemyIds: ["cave_slime"]
      },
      {
        id: "floor_1_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_1_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_1_repeat_clear_coins]
  },
  {
    floor: 2,
    themeId: "old_cellar",
    nodes: [
      {
        id: "floor_2_combat_1",
        type: "combat",
        enemyIds: ["bone_rat"]
      },
      {
        id: "floor_2_treasure_1",
        type: "treasure",
        rewardTableId: "coins_small"
      },
      {
        id: "floor_2_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_2_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_2_repeat_clear_coins]
  },
  {
    floor: 3,
    themeId: "broken_stairs",
    nodes: [
      {
        id: "floor_3_combat_1",
        type: "combat",
        enemyIds: ["cave_slime", "bone_rat"]
      },
      {
        id: "floor_3_elite_1",
        type: "elite",
        enemyIds: ["bone_rat"]
      },
      {
        id: "floor_3_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_3_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_3_repeat_clear_coins]
  },
  {
    floor: 4,
    themeId: "moss_choked_steps",
    nodes: [
      {
        id: "floor_4_combat_1",
        type: "combat",
        enemyIds: ["moss_bat"]
      },
      {
        id: "floor_4_combat_2",
        type: "combat",
        enemyIds: ["cave_slime", "moss_bat"]
      },
      {
        id: "floor_4_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_4_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_4_repeat_clear_coins]
  },
  {
    floor: 5,
    themeId: "rusted_barracks",
    nodes: [
      {
        id: "floor_5_combat_1",
        type: "combat",
        enemyIds: ["rust_goblin"]
      },
      {
        id: "floor_5_treasure_1",
        type: "treasure",
        rewardTableId: "coins_small"
      },
      {
        id: "floor_5_elite_1",
        type: "elite",
        enemyIds: ["rust_goblin"]
      },
      {
        id: "floor_5_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_5_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_5_repeat_clear_coins]
  },
  {
    floor: 6,
    themeId: "ember_gallery",
    nodes: [
      {
        id: "floor_6_combat_1",
        type: "combat",
        enemyIds: ["ember_wisp"]
      },
      {
        id: "floor_6_combat_2",
        type: "combat",
        enemyIds: ["moss_bat", "ember_wisp", "ember_wisp"]
      },
      {
        id: "floor_6_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_6_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_6_repeat_clear_coins]
  },
  {
    floor: 7,
    themeId: "sentinel_causeway",
    nodes: [
      {
        id: "floor_7_combat_1",
        type: "combat",
        enemyIds: ["rust_goblin", "moss_bat"]
      },
      {
        id: "floor_7_elite_1",
        type: "elite",
        enemyIds: ["cracked_sentinel"]
      },
      {
        id: "floor_7_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_7_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_7_repeat_clear_coins]
  },
  {
    floor: 8,
    themeId: "hexed_cellar",
    nodes: [
      {
        id: "floor_8_combat_1",
        type: "combat",
        enemyIds: ["cellar_hexer"]
      },
      {
        id: "floor_8_treasure_1",
        type: "treasure",
        rewardTableId: "coins_small"
      },
      {
        id: "floor_8_elite_1",
        type: "elite",
        enemyIds: ["cellar_hexer", "ember_wisp"]
      },
      {
        id: "floor_8_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_8_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_8_repeat_clear_coins]
  },
  {
    floor: 9,
    themeId: "brute_watch",
    nodes: [
      {
        id: "floor_9_combat_1",
        type: "combat",
        enemyIds: ["tower_brute"]
      },
      {
        id: "floor_9_combat_2",
        type: "combat",
        enemyIds: ["cellar_hexer", "rust_goblin"]
      },
      {
        id: "floor_9_elite_1",
        type: "elite",
        enemyIds: ["tower_brute"]
      },
      {
        id: "floor_9_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_9_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_9_repeat_clear_coins]
  },
  {
    floor: 10,
    themeId: "sealed_gate",
    nodes: [
      {
        id: "floor_10_combat_1",
        type: "combat",
        enemyIds: ["tower_brute"]
      },
      {
        id: "floor_10_elite_1",
        type: "elite",
        enemyIds: ["cracked_sentinel", "ember_wisp"]
      },
      {
        id: "floor_10_boss_1",
        type: "boss",
        bossId: "floor_10_gatekeeper"
      },
      {
        id: "floor_10_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_10_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_10_repeat_clear_coins]
  },
  {
    floor: 11,
    themeId: "bone_hall",
    nodes: [
      {
        id: "floor_11_combat_1",
        type: "combat",
        enemyIds: ["bone_guard"]
      },
      {
        id: "floor_11_combat_2",
        type: "combat",
        enemyIds: ["bone_rat", "bone_guard"]
      },
      {
        id: "floor_11_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_11_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_11_repeat_clear_coins]
  },
  {
    floor: 12,
    themeId: "bone_hall",
    nodes: [
      {
        id: "floor_12_combat_1",
        type: "combat",
        enemyIds: ["bone_archer"]
      },
      {
        id: "floor_12_treasure_1",
        type: "treasure",
        rewardTableId: "coins_small"
      },
      {
        id: "floor_12_combat_2",
        type: "combat",
        enemyIds: ["bone_guard", "bone_archer"]
      },
      {
        id: "floor_12_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_12_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_12_repeat_clear_coins]
  },
  {
    floor: 13,
    themeId: "bone_hall",
    nodes: [
      {
        id: "floor_13_combat_1",
        type: "combat",
        enemyIds: ["bone_guard", "bone_archer"]
      },
      {
        id: "floor_13_elite_1",
        type: "elite",
        enemyIds: ["bone_guard", "bone_guard"]
      },
      {
        id: "floor_13_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_13_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_13_repeat_clear_coins]
  },
  {
    floor: 14,
    themeId: "bone_hall",
    nodes: [
      {
        id: "floor_14_combat_1",
        type: "combat",
        enemyIds: ["bone_archer", "bone_archer"]
      },
      {
        id: "floor_14_combat_2",
        type: "combat",
        enemyIds: ["bone_guard", "bone_archer"]
      },
      {
        id: "floor_14_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_14_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_14_repeat_clear_coins]
  },
  {
    floor: 15,
    themeId: "bone_hall",
    nodes: [
      {
        id: "floor_15_combat_1",
        type: "combat",
        enemyIds: ["bone_shaman"]
      },
      {
        id: "floor_15_treasure_1",
        type: "treasure",
        rewardTableId: "coins_small"
      },
      {
        id: "floor_15_elite_1",
        type: "elite",
        enemyIds: ["bone_guard", "bone_shaman"]
      },
      {
        id: "floor_15_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_15_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_15_repeat_clear_coins]
  },
  {
    floor: 16,
    themeId: "bone_hall",
    nodes: [
      {
        id: "floor_16_combat_1",
        type: "combat",
        enemyIds: ["bone_guard", "bone_shaman"]
      },
      {
        id: "floor_16_combat_2",
        type: "combat",
        enemyIds: ["bone_archer", "bone_shaman"]
      },
      {
        id: "floor_16_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_16_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_16_repeat_clear_coins]
  },
  {
    floor: 17,
    themeId: "bone_hall",
    nodes: [
      {
        id: "floor_17_combat_1",
        type: "combat",
        enemyIds: ["bone_guard", "bone_archer", "bone_archer"]
      },
      {
        id: "floor_17_elite_1",
        type: "elite",
        enemyIds: ["bone_guard", "bone_shaman"]
      },
      {
        id: "floor_17_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_17_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_17_repeat_clear_coins]
  },
  {
    floor: 18,
    themeId: "bone_hall",
    nodes: [
      {
        id: "floor_18_combat_1",
        type: "combat",
        enemyIds: ["bone_archer", "bone_shaman"]
      },
      {
        id: "floor_18_treasure_1",
        type: "treasure",
        rewardTableId: "coins_small"
      },
      {
        id: "floor_18_elite_1",
        type: "elite",
        enemyIds: ["bone_guard", "bone_guard", "bone_shaman"]
      },
      {
        id: "floor_18_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_18_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_18_repeat_clear_coins]
  },
  {
    floor: 19,
    themeId: "bone_hall",
    nodes: [
      {
        id: "floor_19_combat_1",
        type: "combat",
        enemyIds: ["bone_guard", "bone_archer", "bone_shaman"]
      },
      {
        id: "floor_19_elite_1",
        type: "elite",
        enemyIds: ["bone_guard", "bone_shaman", "bone_shaman"]
      },
      {
        id: "floor_19_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_19_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_19_repeat_clear_coins]
  },
  {
    floor: 20,
    themeId: "bone_hall_checkpoint",
    nodes: [
      {
        id: "floor_20_combat_1",
        type: "combat",
        enemyIds: ["bone_guard", "bone_archer"]
      },
      {
        id: "floor_20_elite_1",
        type: "elite",
        enemyIds: ["bone_guard", "bone_shaman"]
      },
      {
        id: "floor_20_boss_1",
        type: "boss",
        bossId: "bone_captain"
      },
      {
        id: "floor_20_exit",
        type: "exit"
      }
    ],
    firstClearRewards: [rewardDefinitions.floor_20_first_clear_coins],
    repeatRewards: [rewardDefinitions.floor_20_repeat_clear_coins]
  }
];
