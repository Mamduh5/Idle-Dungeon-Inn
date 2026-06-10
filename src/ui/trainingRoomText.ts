import { getHeroesForParty, getInnRoom, getSelectedParty } from "../state/gameSelectors";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { HeroId } from "../types/ids";
import type { RoomJob } from "../types/roomTypes";
import {
  calculateTrainingRoomXpPerSecond,
  getActiveRoomJobs,
  getHeroActiveRoomJob,
  getHeroTrainingAttackBonus,
  getTrainingRoomAssignmentBlockReason,
  TRAINING_XP_PER_ATTACK_LEVEL
} from "../systems/roomJobSystem";

export const TRAINING_ROOM_BUILD_COPY = [
  "Trains selected heroes over time.",
  "Higher room level trains faster.",
  "Personal +ATK is kept.",
  "No global attack aura."
];

export interface TrainingRoomInnText {
  speedLabel: string;
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
  const targetHero = activeTrainingHero ?? getDefaultTrainingHero(state, selectedHero?.id ?? null);
  const displayHero = activeTrainingHero ?? targetHero ?? selectedHero;
  const isUnlocked = Boolean(room?.isUnlocked && room.level > 0);
  const blockedReason = targetHero && !activeTrainingJob ? getTrainingRoomAssignmentBlockReason(state, targetHero.id) : null;

  if (!isUnlocked) {
    return {
      speedLabel: "Train 0 XP/s",
      assignmentLabel: "Training Room locked",
      bonusLabel: displayHero ? `${displayHero.name} training: +${getHeroTrainingAttackBonus(displayHero)} ATK` : "No hero selected",
      progressLabel: blockedReason ?? "Unlock at Floor 2",
      actionLabel: "Locked",
      actionEnabled: false,
      blockedReason,
      isCancelAction: false,
      activeTrainingJob,
      activeTrainingHero,
      targetHero
    };
  }

  if (!targetHero && !activeTrainingHero) {
    return {
      speedLabel: `Train ${formatNumber(calculateTrainingRoomXpPerSecond(state))} XP/s`,
      assignmentLabel: "Training Room idle",
      bonusLabel: "No hero selected",
      progressLabel: "No eligible hero",
      actionLabel: "No Hero",
      actionEnabled: false,
      blockedReason: "No eligible hero.",
      isCancelAction: false,
      activeTrainingJob,
      activeTrainingHero,
      targetHero
    };
  }

  if (activeTrainingJob && activeTrainingHero) {
    return {
      speedLabel: `Train ${formatNumber(calculateTrainingRoomXpPerSecond(state))} XP/s`,
      assignmentLabel: `${activeTrainingHero.name} training`,
      bonusLabel: `${activeTrainingHero.name} training: +${getHeroTrainingAttackBonus(activeTrainingHero)} ATK`,
      progressLabel: `Next +ATK ${formatNumber(activeTrainingHero.training.attackTrainingXp)}/${TRAINING_XP_PER_ATTACK_LEVEL} XP`,
      actionLabel: "Cancel Training",
      actionEnabled: true,
      blockedReason: null,
      isCancelAction: true,
      activeTrainingJob,
      activeTrainingHero,
      targetHero: activeTrainingHero
    };
  }

  if (!displayHero) {
    return {
      speedLabel: `Train ${formatNumber(calculateTrainingRoomXpPerSecond(state))} XP/s`,
      assignmentLabel: "Training Room idle",
      bonusLabel: "No hero selected",
      progressLabel: "Choose a hero first",
      actionLabel: "No Hero",
      actionEnabled: false,
      blockedReason: "No hero selected.",
      isCancelAction: false,
      activeTrainingJob,
      activeTrainingHero,
      targetHero
    };
  }

  return {
    speedLabel: `Train ${formatNumber(calculateTrainingRoomXpPerSecond(state))} XP/s`,
    assignmentLabel: "Training Room idle",
    bonusLabel: `${displayHero.name} training: +${getHeroTrainingAttackBonus(displayHero)} ATK`,
    progressLabel: blockedReason ?? "Short drill to next +ATK",
    actionLabel: `Train ${displayHero.name}`,
    actionEnabled: blockedReason === null,
    blockedReason,
    isCancelAction: false,
    activeTrainingJob,
    activeTrainingHero,
    targetHero
  };
}

export function getEligibleTrainingHeroes(state: GameState): HeroInstance[] {
  const party = getSelectedParty(state);
  const partyHeroes = party ? getHeroesForParty(state, party.id) : [];
  const partyHeroIds = new Set(partyHeroes.map((hero) => hero.id));
  const orderedHeroes = [...partyHeroes, ...state.heroes.filter((hero) => !partyHeroIds.has(hero.id))];

  return orderedHeroes.filter((hero) => getTrainingRoomAssignmentBlockReason(state, hero.id) === null);
}

export function getDefaultTrainingHero(state: GameState, preferredHeroId: HeroId | null = null): HeroInstance | null {
  if (preferredHeroId) {
    const preferredHero = state.heroes.find((hero) => hero.id === preferredHeroId) ?? null;
    if (preferredHero && getTrainingRoomAssignmentBlockReason(state, preferredHero.id) === null) {
      return preferredHero;
    }
  }

  return getEligibleTrainingHeroes(state)[0] ?? null;
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
