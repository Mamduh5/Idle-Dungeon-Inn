import { prototypeTowerFloors } from "../data/towerData";
import type { GameState } from "../types/gameState";
import type { RewardDefinition } from "../types/lootTypes";

export function calculateFloorCoinReward(state: GameState, floorNumber: number): number {
  const floor = prototypeTowerFloors.find((candidate) => candidate.floor === floorNumber);
  const isFirstClear = !state.firstClearFloorIds.includes(floorNumber);
  const configuredReward = sumCoinRewards(isFirstClear ? floor?.firstClearRewards : floor?.repeatRewards);
  const fallbackReward = isFirstClear ? floorNumber * 25 : floorNumber * 10;

  return normalizeCoinReward(configuredReward ?? fallbackReward);
}

export function applyCoinReward(state: GameState, amount: number): GameState {
  const coinAmount = normalizeCoinReward(amount);

  if (coinAmount <= 0) {
    return state;
  }

  return {
    ...state,
    currencies: {
      ...state.currencies,
      coins: state.currencies.coins + coinAmount
    }
  };
}

export function getFloorRewardSummary(state: GameState, floorNumber: number): string {
  const reward = calculateFloorCoinReward(state, floorNumber);

  if (reward <= 0) {
    return "No coin reward was configured.";
  }

  return `Earned ${reward} coins.`;
}

function sumCoinRewards(rewards: RewardDefinition[] | undefined): number | null {
  if (!rewards || rewards.length === 0) {
    return null;
  }

  return rewards.reduce((total, reward) => total + (reward.coins ?? 0), 0);
}

function normalizeCoinReward(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.max(0, Math.floor(amount));
}
