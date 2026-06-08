import type { LootId } from "../types/ids";
import type { RewardDefinition } from "../types/lootTypes";

export const rewardDefinitions: Record<LootId, RewardDefinition> = {
  coins_tiny: {
    rewardId: "coins_tiny",
    name: "Tiny Coin Pouch",
    coins: 5
  },
  coins_small: {
    rewardId: "coins_small",
    name: "Small Coin Pouch",
    coins: 12
  },
  coins_floor_clear: {
    rewardId: "coins_floor_clear",
    name: "First Clear Coin Pouch",
    coins: 25
  }
};
