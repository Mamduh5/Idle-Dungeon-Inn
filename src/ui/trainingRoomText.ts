import { getInnRoom } from "../state/gameSelectors";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { RoomJob } from "../types/roomTypes";
import {
  calculateTrainingRoomXpPerSecond,
  getActiveRoomJobs,
  getDefaultTrainingHero,
  getEligibleTrainingHeroes,
  getHeroActiveRoomJob,
  getHeroTrainingAttackBonus,
  getTrainingHeroSelectionOptions,
  getTrainingRoomAssignmentBlockReason,
  TRAINING_XP_PER_ATTACK_LEVEL
} from "../systems/roomJobSystem";

export const TRAINING_ROOM_BUILD_COPY = [
  "Trains selected heroes over time.",
  "Higher room level trains faster.",
  "Personal +ATK is kept.",
  "No global attack aura."
];

export { getDefaultTrainingHero, getEligibleTrainingHeroes, getTrainingHeroSelectionOptions } from "../systems/roomJobSystem";

export interface TrainingRoomInnText {
  speedLabel: string;
  selectorLabel: string;
  assignmentLabel: string;
  bonusLabel: string;
  progressLabel: string;
  actionLabel: string;
  actionEnabled: boolean;
  blockedReason: string | null;
  isCancelAction: boolean;
  activeTrainingJob: RoomJob | null;
  activeTrainingHero: HeroInstance | null;
  targetHero: HeroInstance | null;
  selectedHero: HeroInstance | null;
  canSelectPrevious: boolean;
  canSelectNext: boolean;
}

export interface HeroTrainingRosterText {
  bonusLabel: string;
  progressLabel: string;
  statusLabel: string;
}

export function getTrainingRoomInnText(state: GameState, selectedHero: HeroInstance | null): TrainingRoomInnText {
  const room = getInnRoom(state, "training_room");
  const activeTrainingJob =
    getActiveRoomJobs(state, "training_room").find((job) => job.jobType === "training") ?? null;
  const activeTrainingHero = activeTrainingJob
    ? state.heroes.find((hero) => hero.id === activeTrainingJob.heroId) ?? null
    : null;
  const selectionOptions = getTrainingHeroSelectionOptions(state);
  const selectedFromState = state.selectedTrainingHeroId
    ? state.heroes.find((hero) => hero.id === state.selectedTrainingHeroId) ?? null
    : null;
  const selectedTrainingHero = getDefaultTrainingHero(state, selectedFromState?.id ?? selectedHero?.id ?? null);
  const targetHero = activeTrainingHero ?? selectedTrainingHero;
  const displayHero = activeTrainingHero ?? targetHero ?? selectedHero;
  const isUnlocked = Boolean(room?.isUnlocked && room.level > 0);
  const blockedReason = targetHero && !activeTrainingJob ? getTrainingRoomAssignmentBlockReason(state, targetHero.id) : null;
  const selectorLabel = selectedTrainingHero ? `Target: ${selectedTrainingHero.name}` : "Target: none";
  const canSelect = selectionOptions.length > 1 && !activeTrainingJob;

  if (!isUnlocked) {
    return {
      speedLabel: "Train 0 XP/s",
      selectorLabel,
      assignmentLabel: "Training Room locked",
      bonusLabel: displayHero ? `${displayHero.name} training: +${getHeroTrainingAttackBonus(displayHero)} ATK` : "No hero selected",
      progressLabel: blockedReason ?? "Unlock at Floor 2",
      actionLabel: "Locked",
      actionEnabled: false,
      blockedReason,
      isCancelAction: false,
      activeTrainingJob,
      activeTrainingHero,
      targetHero,
      selectedHero: selectedTrainingHero,
      canSelectPrevious: false,
      canSelectNext: false
    };
  }

  if (!targetHero && !activeTrainingHero) {
    return {
      speedLabel: `Train ${formatNumber(calculateTrainingRoomXpPerSecond(state))} XP/s`,
      selectorLabel,
      assignmentLabel: "Training Room idle",
      bonusLabel: "No hero selected",
      progressLabel: "No eligible hero",
      actionLabel: "No Hero",
      actionEnabled: false,
      blockedReason: "No eligible hero.",
      isCancelAction: false,
      activeTrainingJob,
      activeTrainingHero,
      targetHero,
      selectedHero: selectedTrainingHero,
      canSelectPrevious: false,
      canSelectNext: false
    };
  }

  if (activeTrainingJob && activeTrainingHero) {
    return {
      speedLabel: `Train ${formatNumber(calculateTrainingRoomXpPerSecond(state))} XP/s`,
      selectorLabel: `Target: ${activeTrainingHero.name}`,
      assignmentLabel: `${activeTrainingHero.name} training`,
      bonusLabel: `${activeTrainingHero.name} training: +${getHeroTrainingAttackBonus(activeTrainingHero)} ATK`,
      progressLabel: `Next +ATK ${formatNumber(activeTrainingHero.training.attackTrainingXp)}/${TRAINING_XP_PER_ATTACK_LEVEL} XP`,
      actionLabel: "Cancel Training",
      actionEnabled: true,
      blockedReason: null,
      isCancelAction: true,
      activeTrainingJob,
      activeTrainingHero,
      targetHero: activeTrainingHero,
      selectedHero: activeTrainingHero,
      canSelectPrevious: false,
      canSelectNext: false
    };
  }

  if (!displayHero) {
    return {
      speedLabel: `Train ${formatNumber(calculateTrainingRoomXpPerSecond(state))} XP/s`,
      selectorLabel,
      assignmentLabel: "Training Room idle",
      bonusLabel: "No hero selected",
      progressLabel: "Choose a hero first",
      actionLabel: "No Hero",
      actionEnabled: false,
      blockedReason: "No hero selected.",
      isCancelAction: false,
      activeTrainingJob,
      activeTrainingHero,
      targetHero,
      selectedHero: selectedTrainingHero,
      canSelectPrevious: false,
      canSelectNext: false
    };
  }

  return {
    speedLabel: `Train ${formatNumber(calculateTrainingRoomXpPerSecond(state))} XP/s`,
    selectorLabel,
    assignmentLabel: "Training Room idle",
    bonusLabel: `${displayHero.name} training: +${getHeroTrainingAttackBonus(displayHero)} ATK`,
    progressLabel: blockedReason ?? "Training until canceled",
    actionLabel: `Train ${displayHero.name}`,
    actionEnabled: blockedReason === null,
    blockedReason,
    isCancelAction: false,
    activeTrainingJob,
    activeTrainingHero,
    targetHero,
    selectedHero: selectedTrainingHero,
    canSelectPrevious: canSelect,
    canSelectNext: canSelect
  };
}

export function getHeroTrainingRosterText(state: GameState, hero: HeroInstance): HeroTrainingRosterText {
  const activeJob = getHeroActiveRoomJob(state, hero.id);
  const isTraining = activeJob?.roomId === "training_room" && activeJob.jobType === "training";
  const isResting = hero.status === "resting" || (activeJob?.roomId === "bed_room" && activeJob.jobType === "healing");
  const statusLabel = isTraining ? "Training" : isResting ? "Resting" : formatStatusLabel(hero.status);

  return {
    bonusLabel: `Training +${getHeroTrainingAttackBonus(hero)} ATK`,
    progressLabel: `Next +ATK ${formatNumber(hero.training.attackTrainingXp)}/${TRAINING_XP_PER_ATTACK_LEVEL} XP`,
    statusLabel
  };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
