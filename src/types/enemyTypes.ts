import type { CombatStats } from "./combatTypes";
import type { EnemyId, LootId, TowerFloorId } from "./ids";

export interface EnemyDefinition {
  enemyId: EnemyId;
  name: string;
  baseStats: CombatStats;
  unlockFloor: TowerFloorId;
  lootTableId: LootId | null;
}
