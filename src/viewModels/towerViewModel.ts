import { prototypeTowerFloors } from "../data/towerData";
import { canCompleteSelectedFloor } from "../systems/floorClearSystem";
import { getBottleneckHintForRun, FLOOR_10_BOSS_SUGGESTIONS, isFloor10BossNode } from "../systems/bottleneckHintSystem";
import {
  canContinueTowerRun,
  ENCOUNTER_CLEAR_HOLD_REASON,
  FLOOR_CLEAR_HOLD_REASON,
  TREASURE_HOLD_REASON
} from "../systems/towerNodeActionSystem";
import { canRecoverSelectedWipedParty } from "../systems/wipeRecoverySystem";
import { getHeroesForParty, getSelectedParty, getSelectedTowerRun } from "../state/gameSelectors";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { TowerNodeDefinition, TowerRunState } from "../types/towerTypes";

export type TowerActionId = "complete_floor" | "continue_run" | "recover_party";

export interface TowerActionViewModel {
  id: TowerActionId;
  label: string;
  enabled: boolean;
}

export interface TowerViewModel {
  partyName: string;
  run: TowerRunState | null;
  heroes: HeroInstance[];
  currentNode: TowerNodeDefinition | null;
  floorNodeLabel: string;
  statusLabel: string;
  checkpointLabel: string | null;
  message: string;
  shouldShowWorldEventLine: boolean;
  action: TowerActionViewModel | null;
  bottleneckHint: string | null;
  bottleneckSuggestions: string[];
}

export function getTowerViewModel(state: GameState): TowerViewModel {
  const party = getSelectedParty(state);
  const run = getSelectedTowerRun(state);
  const heroes = party ? getHeroesForParty(state, party.id) : [];
  const currentNode = run ? getCurrentTowerNode(run) : null;
  const bottleneckHint = getBottleneckHintForRun(run);

  return {
    partyName: party?.name ?? "Party",
    run,
    heroes,
    currentNode,
    floorNodeLabel: `Floor ${run?.floor ?? 1} / Node ${(run?.nodeIndex ?? 0) + 1}`,
    statusLabel: formatTowerStatus(run, currentNode, bottleneckHint),
    checkpointLabel: run?.floor === 10 ? "First checkpoint" : null,
    message: getTowerMessage(party?.name ?? "Party", run, currentNode, bottleneckHint),
    shouldShowWorldEventLine: shouldDrawWorldEventLine(run),
    action: getTowerActionViewModel(state, run),
    bottleneckHint,
    bottleneckSuggestions: FLOOR_10_BOSS_SUGGESTIONS.slice(0, 2)
  };
}

export function getCurrentTowerNode(run: TowerRunState): TowerNodeDefinition | null {
  return prototypeTowerFloors.find((floor) => floor.floor === run.floor)?.nodes[run.nodeIndex] ?? null;
}

function getTowerActionViewModel(state: GameState, run: TowerRunState | null): TowerActionViewModel | null {
  if (canCompleteSelectedFloor(state)) {
    return {
      id: "complete_floor",
      label: "Complete Floor",
      enabled: true
    };
  }

  if (canContinueTowerRun(run)) {
    return {
      id: "continue_run",
      label: "Continue Run",
      enabled: true
    };
  }

  if (canRecoverSelectedWipedParty(state)) {
    return {
      id: "recover_party",
      label: "Return to Inn",
      enabled: true
    };
  }

  return null;
}

function getTowerMessage(
  partyName: string,
  run: TowerRunState | null,
  node: TowerNodeDefinition | null,
  bottleneckHint: string | null
): string {
  if (!run || run.status === "preparing") {
    return "Party is preparing at the inn.";
  }

  if (run.status === "traveling") {
    return `${partyName} is traveling to Floor ${run.floor}.`;
  }

  if (run.status === "exploring") {
    return `Exploring toward ${node?.type === "boss" ? "the boss checkpoint" : node?.type ?? "the next node"}.`;
  }

  if (run.status === "fighting") {
    return isFloor10BossNode(run) ? run.lastCombatEventMessage ?? "Boss checkpoint running." : run.lastCombatEventMessage ?? "Combat running.";
  }

  if (run.status === "looting") {
    return "Treasure found. Continue when ready.";
  }

  if (run.status === "blocked") {
    if (run.lastFailureReason === ENCOUNTER_CLEAR_HOLD_REASON) {
      return "Encounter cleared. Continue through the open passage.";
    }

    if (run.lastFailureReason === FLOOR_CLEAR_HOLD_REASON) {
      return "Exit reached. Complete Floor to return to the inn.";
    }

    return run.lastFailureReason ?? "Run is paused.";
  }

  if (run.status === "wiped") {
    return bottleneckHint ?? "Party wiped. Return to the inn to recover.";
  }

  return `${partyName} status: ${formatStatusLabel(run.status)}.`;
}

function formatTowerStatus(
  run: TowerRunState | null,
  node: TowerNodeDefinition | null,
  bottleneckHint: string | null
): string {
  if (!run) {
    return "No Run";
  }

  if (run.status === "wiped" && bottleneckHint) {
    return "Boss Failed";
  }

  if (run.status === "fighting" && isFloor10BossNode(run)) {
    return "Boss";
  }

  if (run.status === "blocked" && run.lastFailureReason === ENCOUNTER_CLEAR_HOLD_REASON) {
    return "Cleared";
  }

  if (run.status === "blocked" && run.lastFailureReason === FLOOR_CLEAR_HOLD_REASON) {
    return "Exit";
  }

  if (run.status === "exploring" && node) {
    return node.type === "boss" ? "Boss Gate" : formatStatusLabel(node.type);
  }

  return formatStatusLabel(run.status);
}

function shouldDrawWorldEventLine(run: TowerRunState | null): boolean {
  if (!run) {
    return true;
  }

  if (run.status === "blocked") {
    return run.lastFailureReason !== ENCOUNTER_CLEAR_HOLD_REASON && run.lastFailureReason !== FLOOR_CLEAR_HOLD_REASON;
  }

  return true;
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
