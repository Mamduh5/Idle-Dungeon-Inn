import type { LootId } from "./ids";

export interface LootStack {
  lootId: LootId;
  quantity: number;
}

export interface InventoryState {
  itemStacks: LootStack[];
}

export interface RewardDefinition {
  rewardId: LootId;
  name: string;
  coins?: number;
  items?: LootStack[];
}
