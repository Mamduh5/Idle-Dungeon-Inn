import type { EnemyId, HeroId, LootId, PartyId, TowerFloorId, TowerNodeId, TowerNodeType } from "./ids";
import type { LootStack, RewardDefinition } from "./lootTypes";

export type TowerRunStatus =
  | "preparing"
  | "traveling"
  | "exploring"
  | "fighting"
  | "looting"
  | "retreating"
  | "wiped"
  | "resting"
  | "blocked"
  | "boss_ready";

export interface TowerNodeDefinition {
  id: TowerNodeId;
  type: TowerNodeType;
  enemyIds?: EnemyId[];
  trapId?: string;
  rewardTableId?: LootId;
  bossId?: EnemyId;
}

export interface TowerFloorDefinition {
  floor: TowerFloorId;
  themeId: string;
  nodes: TowerNodeDefinition[];
  firstClearRewards: RewardDefinition[];
  repeatRewards: RewardDefinition[];
}

export interface TowerRunEnemyState {
  enemyId: EnemyId;
  currentHp: number | null;
  status: "pending" | "active" | "defeated";
}

export interface TowerRunState {
  partyId: PartyId;
  status: TowerRunStatus;
  floor: TowerFloorId;
  nodeIndex: number;
  nodeProgress: number;
  enemies: TowerRunEnemyState[];
  heroCombatCooldowns: Record<HeroId, number>;
  enemyCombatCooldowns: Record<string, number>;
  lastCombatEventMessage: string | null;
  combatStartedAt: number | null;
  lootBag: LootStack[];
  lastFailureReason: string | null;
  startedAt: number;
}
