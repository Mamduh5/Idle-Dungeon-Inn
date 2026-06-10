import { getSelectedParty, getSelectedTowerRun } from "../state/gameSelectors";
import { appendRecentEvent } from "../state/recentEvents";
import type { GameState } from "../types/gameState";
import type { RecentEvent } from "../types/recentEventTypes";
import { getAutoDispatchControlState } from "./automationSystem";
import { canCompleteSelectedFloor, completeSelectedFloor } from "./floorClearSystem";
import { tickGameState } from "./gameTickSystem";
import { getSelectedPartyDispatchBlockReason } from "./partyDispatchSystem";
import { tickRoomJobs } from "./roomJobSystem";
import { canContinueTowerRun, continueSelectedTowerRun } from "./towerNodeActionSystem";

export const OFFLINE_PROGRESS_MIN_ELAPSED_MS = 10_000;
export const OFFLINE_PROGRESS_MAX_ELAPSED_MS = 30 * 60 * 1000;
export const OFFLINE_PROGRESS_TICK_CHUNK_MS = 1_000;
export const OFFLINE_ROOM_JOB_CHUNK_MS = 60_000;
export const OFFLINE_PROGRESS_MAX_ITERATIONS = 1_000;
export const OFFLINE_PROGRESS_MAX_FLOOR_CLEARS = 3;

interface OfflineProgressStats {
  elapsedMs: number;
  usedElapsedMs: number;
  isElapsedCapped: boolean;
  isProgressCapped: boolean;
  floorsCleared: number;
  coinsGained: number;
  roomWorkMessages: string[];
  stoppedReason: string | null;
}

interface OfflineHeroSnapshot {
  id: string;
  name: string;
  currentHp: number;
  attackTrainingXp: number;
  attackTrainingLevel: number;
}

export function calculateOfflineElapsedMs(state: GameState, now: number): number {
  if (!Number.isFinite(state.lastActiveAt) || !Number.isFinite(now) || now <= state.lastActiveAt) {
    return 0;
  }

  return now - state.lastActiveAt;
}

export function applyOfflineProgress(state: GameState, now: number): GameState {
  const elapsedMs = calculateOfflineElapsedMs(state, now);

  if (elapsedMs < OFFLINE_PROGRESS_MIN_ELAPSED_MS) {
    return state;
  }

  const usedElapsedMs = Math.min(elapsedMs, OFFLINE_PROGRESS_MAX_ELAPSED_MS);
  const originalRecentEvents = state.recentEvents;
  const initialCoins = state.currencies.coins;
  const initialHeroSnapshots = createHeroSnapshots(state);
  let offlineState = state;
  let remainingMs = usedElapsedMs;
  let simulatedNow = now - usedElapsedMs;
  let floorsCleared = 0;
  let stoppedReason: string | null = null;
  let iterations = 0;

  while (remainingMs > 0 && iterations < OFFLINE_PROGRESS_MAX_ITERATIONS) {
    iterations += 1;

    if (canCompleteSelectedFloor(offlineState)) {
      const beforeHighestFloorCleared = offlineState.highestFloorCleared;
      offlineState = completeSelectedFloor(offlineState);

      if (offlineState.highestFloorCleared > beforeHighestFloorCleared) {
        floorsCleared += 1;
      }

      if (floorsCleared >= OFFLINE_PROGRESS_MAX_FLOOR_CLEARS) {
        stoppedReason = "offline floor clear limit reached";
        break;
      }

      continue;
    }

    const run = getSelectedTowerRun(offlineState);

    if (!run) {
      stoppedReason = "no selected tower run";
      break;
    }

    if (run.status === "wiped") {
      stoppedReason = "party wiped";
      break;
    }

    if (canContinueTowerRun(run)) {
      offlineState = continueSelectedTowerRun(offlineState);
      continue;
    }

    const preparingStopReason = getPreparingStopReason(offlineState);
    if (run.status === "preparing" && preparingStopReason) {
      offlineState = tickOfflineRoomJobs(offlineState, remainingMs, now);
      remainingMs = 0;
      stoppedReason = getPreparingStopReason(offlineState) ?? preparingStopReason;
      break;
    }

    if (run.status === "blocked") {
      stoppedReason = run.lastFailureReason ?? "blocked tower state";
      break;
    }

    const tickMs = Math.min(remainingMs, OFFLINE_PROGRESS_TICK_CHUNK_MS);
    simulatedNow += tickMs;
    offlineState = tickGameState(offlineState, tickMs, simulatedNow);
    remainingMs -= tickMs;
  }

  if (iterations >= OFFLINE_PROGRESS_MAX_ITERATIONS) {
    stoppedReason = "offline safety iteration limit reached";
  }

  const stats: OfflineProgressStats = {
    elapsedMs,
    usedElapsedMs,
    isElapsedCapped: elapsedMs > OFFLINE_PROGRESS_MAX_ELAPSED_MS,
    isProgressCapped:
      elapsedMs > OFFLINE_PROGRESS_MAX_ELAPSED_MS ||
      floorsCleared >= OFFLINE_PROGRESS_MAX_FLOOR_CLEARS ||
      iterations >= OFFLINE_PROGRESS_MAX_ITERATIONS,
    floorsCleared,
    coinsGained: Math.max(0, offlineState.currencies.coins - initialCoins),
    roomWorkMessages: createRoomWorkMessages(initialHeroSnapshots, offlineState),
    stoppedReason
  };

  return {
    ...offlineState,
    recentEvents: appendRecentEvent(originalRecentEvents, createOfflineReportEvent(offlineState, now, stats)),
    lastActiveAt: now
  };
}

function tickOfflineRoomJobs(state: GameState, elapsedMs: number, now: number): GameState {
  let roomState = state;
  let remainingMs = Math.max(0, elapsedMs);
  let simulatedNow = now - remainingMs;

  while (remainingMs > 0) {
    const tickMs = Math.min(remainingMs, OFFLINE_ROOM_JOB_CHUNK_MS);
    simulatedNow += tickMs;
    roomState = tickRoomJobs(roomState, tickMs, simulatedNow);
    remainingMs -= tickMs;
  }

  return roomState;
}

function getPreparingStopReason(state: GameState): string | null {
  const autoDispatch = getAutoDispatchControlState(state);

  if (!autoDispatch.isEnabled) {
    return autoDispatch.isUnlocked ? "Auto-Dispatch is OFF" : "Auto-Dispatch is locked";
  }

  return getSelectedPartyDispatchBlockReason(state);
}

function createOfflineReportEvent(state: GameState, createdAt: number, stats: OfflineProgressStats): RecentEvent {
  const party = getSelectedParty(state);
  const partyName = party?.name ?? "The party";
  const capSuffix = stats.isProgressCapped ? " Progress was capped." : "";
  const stopSuffix = stats.stoppedReason ? ` Stopped: ${stats.stoppedReason}.` : "";
  const awayText = formatElapsed(stats.usedElapsedMs);
  const roomWorkSuffix = stats.roomWorkMessages.length > 0 ? ` ${stats.roomWorkMessages.join(" ")}` : "";

  if (stats.floorsCleared > 0 || stats.coinsGained > 0) {
    return {
      id: `event_offline_report_${createdAt}`,
      type: "offline_report",
      createdAt,
      message: `While you were away for ${awayText}, ${partyName} cleared ${stats.floorsCleared} floor(s) and earned ${stats.coinsGained} coins.${roomWorkSuffix}${capSuffix}${stopSuffix}`,
      severity: "success",
      partyId: party?.id,
      floor: state.highestFloorCleared
    };
  }

  return {
    id: `event_offline_report_${createdAt}`,
    type: "offline_report",
    createdAt,
    message: `While you were away for ${awayText}, ${stats.roomWorkMessages.length > 0 ? stats.roomWorkMessages.join(" ") : "the inn waited."}${capSuffix}${stopSuffix}`,
    severity: "info",
    partyId: party?.id,
    floor: state.highestFloorCleared
  };
}

function createHeroSnapshots(state: GameState): OfflineHeroSnapshot[] {
  return state.heroes.map((hero) => ({
    id: hero.id,
    name: hero.name,
    currentHp: hero.currentHp,
    attackTrainingXp: hero.training.attackTrainingXp,
    attackTrainingLevel: hero.training.attackTrainingLevel
  }));
}

function createRoomWorkMessages(beforeSnapshots: OfflineHeroSnapshot[], afterState: GameState): string[] {
  const messages: string[] = [];

  for (const before of beforeSnapshots) {
    const after = afterState.heroes.find((hero) => hero.id === before.id);
    if (!after) {
      continue;
    }

    if (after.currentHp > before.currentHp) {
      messages.push(`${after.name} recovered to ${formatNumber(after.currentHp)} HP in Bed Room.`);
    }

    const completedTrainingLevels = after.training.attackTrainingLevel - before.attackTrainingLevel;
    if (completedTrainingLevels > 0) {
      messages.push(`${after.name} completed ${completedTrainingLevels} attack drill${completedTrainingLevels === 1 ? "" : "s"} in Training Room.`);
      continue;
    }

    if (after.training.attackTrainingXp > before.attackTrainingXp) {
      messages.push(`${after.name} gained ${formatNumber(after.training.attackTrainingXp - before.attackTrainingXp)} training XP in Training Room.`);
    }
  }

  return messages;
}

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
