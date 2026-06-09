import { enemyDefinitions } from "../data/enemyData";
import type { TowerRunState } from "../types/towerTypes";

export const FLOOR_10_BOSS_FLOOR = 10;
export const FLOOR_10_BOSS_ID = "floor_10_gatekeeper";

export const FLOOR_10_BOSS_HINT =
  "Floor 10 checkpoint: Took too much damage before Big Cave Slime fell. Upgrade Bed Room for retry recovery and Training Room for attack.";

export const FLOOR_10_BOSS_SUGGESTIONS = [
  "Bed Room: recover more HP after each return.",
  "Training Room: add attack so the boss falls sooner.",
  "Retry manually after recovery; Auto-Dispatch will not recover wiped parties."
];

export function isFloor10BossNode(run: TowerRunState | null): boolean {
  return Boolean(
    run &&
      run.floor === FLOOR_10_BOSS_FLOOR &&
      run.enemies.some((enemy) => enemy.enemyId === FLOOR_10_BOSS_ID)
  );
}

export function createFloor10BossEncounterMessage(partyName: string): string {
  const bossName = enemyDefinitions[FLOOR_10_BOSS_ID]?.name ?? "Floor 10 boss";
  return `${partyName} reached the first checkpoint boss: ${bossName}.`;
}

export function createFloor10BossFailureReason(run: TowerRunState): string {
  const boss = run.enemies.find((enemy) => enemy.enemyId === FLOOR_10_BOSS_ID);
  const bossStats = enemyDefinitions[FLOOR_10_BOSS_ID]?.baseStats;

  if (boss && bossStats && (boss.currentHp ?? bossStats.hp) <= Math.ceil(bossStats.hp * 0.35)) {
    return "Floor 10 checkpoint: Damage was close, but recovery ran out before Big Cave Slime fell. Upgrade Bed Room, then retry.";
  }

  return FLOOR_10_BOSS_HINT;
}

export function createFloor10BossFailureEventMessage(): string {
  return `${FLOOR_10_BOSS_HINT} Fix: ${FLOOR_10_BOSS_SUGGESTIONS[0]} ${FLOOR_10_BOSS_SUGGESTIONS[1]}`;
}

export function getBottleneckHintForRun(run: TowerRunState | null): string | null {
  if (!run) {
    return null;
  }

  if (run.floor === FLOOR_10_BOSS_FLOOR && run.lastFailureReason?.includes("Floor 10 checkpoint")) {
    return run.lastFailureReason;
  }

  return null;
}
