import { enemyDefinitions } from "../data/enemyData";
import type { TowerRunState } from "../types/towerTypes";

export const FLOOR_10_BOSS_FLOOR = 10;
export const FLOOR_10_BOSS_ID = "floor_10_gatekeeper";
export const FLOOR_20_BOSS_FLOOR = 20;
export const FLOOR_20_BOSS_ID = "bone_captain";

export const FLOOR_10_BOSS_HINT =
  "Floor 10 checkpoint: Took too much damage before Big Cave Slime fell. Upgrade Bed Room for retry recovery and Training Room for attack.";
export const FLOOR_20_BOSS_HINT =
  "Floor 20 checkpoint: Bone Captain overwhelmed the party. Upgrade Bed Room for recovery and Training Room for hero-specific attack.";

export const FLOOR_10_BOSS_SUGGESTIONS = [
  "Bed Room: recover more HP after each return.",
  "Training Room: add attack so the boss falls sooner.",
  "Retry manually after recovery; Auto-Dispatch will not recover wiped parties."
];
export const FLOOR_20_BOSS_SUGGESTIONS = [
  "Bed Room: recover both heroes for the next checkpoint attempt.",
  "Training Room: raise personal attack before retrying Bone Captain.",
  "Party size 2 matters here; keep both heroes ready before dispatch."
];

export function isFloor10BossNode(run: TowerRunState | null): boolean {
  return Boolean(
    run &&
      run.floor === FLOOR_10_BOSS_FLOOR &&
      run.enemies.some((enemy) => enemy.enemyId === FLOOR_10_BOSS_ID)
  );
}

export function isFloor20BossNode(run: TowerRunState | null): boolean {
  return Boolean(
    run &&
      run.floor === FLOOR_20_BOSS_FLOOR &&
      run.enemies.some((enemy) => enemy.enemyId === FLOOR_20_BOSS_ID)
  );
}

export function isCheckpointBossNode(run: TowerRunState | null): boolean {
  return isFloor10BossNode(run) || isFloor20BossNode(run);
}

export function createFloor10BossEncounterMessage(partyName: string): string {
  const bossName = enemyDefinitions[FLOOR_10_BOSS_ID]?.name ?? "Floor 10 boss";
  return `${partyName} reached the first checkpoint boss: ${bossName}.`;
}

export function createBossEncounterMessage(floor: number, bossId: string | null, partyName: string): string {
  if (floor === FLOOR_10_BOSS_FLOOR && bossId === FLOOR_10_BOSS_ID) {
    return createFloor10BossEncounterMessage(partyName);
  }

  if (floor === FLOOR_20_BOSS_FLOOR && bossId === FLOOR_20_BOSS_ID) {
    const bossName = enemyDefinitions[FLOOR_20_BOSS_ID]?.name ?? "Bone Captain";
    return `${partyName} reached the Bone Hall checkpoint boss: ${bossName}.`;
  }

  return `${partyName} reached a boss: ${enemyDefinitions[bossId ?? ""]?.name ?? bossId ?? "unknown boss"}.`;
}

export function createFloor10BossFailureReason(run: TowerRunState): string {
  const boss = run.enemies.find((enemy) => enemy.enemyId === FLOOR_10_BOSS_ID);
  const bossStats = enemyDefinitions[FLOOR_10_BOSS_ID]?.baseStats;

  if (boss && bossStats && (boss.currentHp ?? bossStats.hp) <= Math.ceil(bossStats.hp * 0.35)) {
    return "Floor 10 checkpoint: Damage was close, but recovery ran out before Big Cave Slime fell. Upgrade Bed Room, then retry.";
  }

  return FLOOR_10_BOSS_HINT;
}

export function createFloor20BossFailureReason(run: TowerRunState): string {
  const boss = run.enemies.find((enemy) => enemy.enemyId === FLOOR_20_BOSS_ID);
  const bossStats = enemyDefinitions[FLOOR_20_BOSS_ID]?.baseStats;

  if (boss && bossStats && (boss.currentHp ?? bossStats.hp) <= Math.ceil(bossStats.hp * 0.35)) {
    return "Floor 20 checkpoint: Damage was close, but Bone Captain outlasted recovery. Upgrade Bed Room, then train both heroes.";
  }

  return FLOOR_20_BOSS_HINT;
}

export function createCheckpointBossFailureReason(run: TowerRunState): string {
  if (isFloor20BossNode(run)) {
    return createFloor20BossFailureReason(run);
  }

  return createFloor10BossFailureReason(run);
}

export function createFloor10BossFailureEventMessage(): string {
  return `${FLOOR_10_BOSS_HINT} Fix: ${FLOOR_10_BOSS_SUGGESTIONS.join(" ")}`;
}

export function createFloor20BossFailureEventMessage(): string {
  return `${FLOOR_20_BOSS_HINT} Fix: ${FLOOR_20_BOSS_SUGGESTIONS.join(" ")}`;
}

export function createCheckpointBossFailureEventMessage(run: TowerRunState): string {
  return isFloor20BossNode(run) ? createFloor20BossFailureEventMessage() : createFloor10BossFailureEventMessage();
}

export function getCheckpointBossName(run: TowerRunState | null): string | null {
  if (isFloor20BossNode(run)) {
    return enemyDefinitions[FLOOR_20_BOSS_ID]?.name ?? "Bone Captain";
  }

  if (isFloor10BossNode(run)) {
    return enemyDefinitions[FLOOR_10_BOSS_ID]?.name ?? "Big Cave Slime";
  }

  return null;
}

export function getBottleneckSuggestionsForRun(run: TowerRunState | null): string[] {
  return isFloor20BossNode(run) ? FLOOR_20_BOSS_SUGGESTIONS : FLOOR_10_BOSS_SUGGESTIONS;
}

export function getBottleneckHintForRun(run: TowerRunState | null): string | null {
  if (!run) {
    return null;
  }

  if (run.floor === FLOOR_10_BOSS_FLOOR && run.lastFailureReason?.includes("Floor 10 checkpoint")) {
    return run.lastFailureReason;
  }

  if (run.floor === FLOOR_20_BOSS_FLOOR && run.lastFailureReason?.includes("Floor 20 checkpoint")) {
    return run.lastFailureReason;
  }

  return null;
}
