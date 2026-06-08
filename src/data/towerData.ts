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
    firstClearRewards: [rewardDefinitions.coins_floor_clear],
    repeatRewards: [rewardDefinitions.coins_tiny]
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
    firstClearRewards: [rewardDefinitions.coins_floor_clear],
    repeatRewards: [rewardDefinitions.coins_small]
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
    firstClearRewards: [rewardDefinitions.coins_floor_clear],
    repeatRewards: [rewardDefinitions.coins_small]
  }
];
