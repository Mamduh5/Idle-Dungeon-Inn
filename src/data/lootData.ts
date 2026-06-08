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
  },
  floor_1_first_clear_coins: {
    rewardId: "floor_1_first_clear_coins",
    name: "Floor 1 First Clear Coins",
    coins: 25
  },
  floor_1_repeat_clear_coins: {
    rewardId: "floor_1_repeat_clear_coins",
    name: "Floor 1 Repeat Clear Coins",
    coins: 10
  },
  floor_2_first_clear_coins: {
    rewardId: "floor_2_first_clear_coins",
    name: "Floor 2 First Clear Coins",
    coins: 40
  },
  floor_2_repeat_clear_coins: {
    rewardId: "floor_2_repeat_clear_coins",
    name: "Floor 2 Repeat Clear Coins",
    coins: 16
  },
  floor_3_first_clear_coins: {
    rewardId: "floor_3_first_clear_coins",
    name: "Floor 3 First Clear Coins",
    coins: 60
  },
  floor_3_repeat_clear_coins: {
    rewardId: "floor_3_repeat_clear_coins",
    name: "Floor 3 Repeat Clear Coins",
    coins: 24
  }
};
