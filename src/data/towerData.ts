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
  }
];
