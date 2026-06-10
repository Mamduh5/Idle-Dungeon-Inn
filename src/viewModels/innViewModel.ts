import { roomDefinitions } from "../data/roomData";
import { getAutoDispatchControlState } from "../systems/automationSystem";
import { getFloor10BossCallout, getFloor10RoomRecommendation } from "../systems/bottleneckCalloutSystem";
import { canDispatchSelectedParty } from "../systems/partyDispatchSystem";
import {
  calculateBedRoomHealingPerSecond,
  getHeroActiveRoomJob,
  getHeroReadyHpThreshold,
  getRoomJobCapacity
} from "../systems/roomJobSystem";
import { getFirstPartyHero, getHeroesForParty, getInnRoom, getSelectedParty, getSelectedTowerRun } from "../state/gameSelectors";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { HeroId, HeroStatus, RoomId } from "../types/ids";
import type { TowerRunStatus } from "../types/towerTypes";
import { getHeroHpDisplayText } from "../ui/heroDisplayText";
import { getTrainingRoomInnText } from "../ui/trainingRoomText";

const DETAILED_INN_ROOM_IDS = new Set<RoomId>(["bed_room", "training_room"]);

export interface InnHeroViewModel {
  id: HeroId;
  name: string;
  levelLabel: string;
  status: HeroStatus;
  statusLabel: string;
  hpLabel: string;
  hpRatio: number;
  readyHpLabel: string;
}

export interface InnBedRoomViewModel {
  levelLabel: string;
  healingSpeedLabel: string;
  capacityLabel: string;
  heroStatusLabel: string | null;
  heroStatusIsActive: boolean;
  readyHpLabel: string | null;
  recommendationBadge: string | null;
}

export interface InnTrainingRoomViewModel {
  isUnlocked: boolean;
  title: string;
  levelLabel: string;
  speedLabel: string;
  selectorLabel: string;
  assignmentLabel: string;
  hasActiveTrainingJob: boolean;
  bonusLabel: string;
  progressLabel: string;
  actionLabel: string;
  actionEnabled: boolean;
  isCancelAction: boolean;
  blockedReason: string | null;
  targetHeroId: HeroId | null;
  selectedHeroId: HeroId | null;
  canSelectPrevious: boolean;
  canSelectNext: boolean;
  recommendationBadge: string | null;
}

export interface InnRoomCardViewModel {
  roomId: RoomId;
  name: string;
  levelLabel: string;
  statusLabel: string;
  effectLabel: string;
  isUnlocked: boolean;
}

export interface InnGateViewModel {
  targetFloorLabel: string;
  actionLabel: string;
  actionEnabled: boolean;
  statusLabel: string;
}

export interface InnAutoDispatchViewModel {
  label: string;
  isUnlocked: boolean;
}

export interface InnViewModel {
  partyName: string;
  commonRoomSubtitle: string;
  hero: InnHeroViewModel | null;
  heroes: InnHeroViewModel[];
  bedRoom: InnBedRoomViewModel;
  trainingRoom: InnTrainingRoomViewModel;
  extraRooms: InnRoomCardViewModel[];
  gate: InnGateViewModel;
  autoDispatch: InnAutoDispatchViewModel;
  latestMessage: string;
  isWarning: boolean;
  offlineReportMessage?: string;
  bottleneckMessage?: string;
}

export function getInnViewModel(state: GameState): InnViewModel {
  const party = getSelectedParty(state);
  const run = getSelectedTowerRun(state);
  const hero = party ? getFirstPartyHero(state, party.id) : null;
  const heroes = party ? getHeroesForParty(state, party.id).map(createHeroViewModel) : [];
  const bedRoom = getInnRoom(state, "bed_room");
  const trainingRoom = getInnRoom(state, "training_room");
  const latestEvent = state.recentEvents[0];
  const latestOfflineReport = state.recentEvents.find((event) => event.type === "offline_report");
  const floor10Callout = getFloor10BossCallout(state);
  const autoDispatch = getAutoDispatchControlState(state);
  const canDispatch = canDispatchSelectedParty(state);
  const targetFloor = party?.selectedTargetFloor ?? run?.floor ?? state.unlockedFloor;
  const compactPartyName = (party?.name ?? "No Party") === "Lantern Party" ? "Party" : party?.name ?? "No Party";
  const selectedTrainingHero = state.selectedTrainingHeroId
    ? state.heroes.find((candidate) => candidate.id === state.selectedTrainingHeroId) ?? null
    : hero;

  return {
    partyName: party?.name ?? "No Party",
    commonRoomSubtitle: compactPartyName,
    hero: hero ? createHeroViewModel(hero) : null,
    heroes,
    bedRoom: {
      levelLabel: `Lv ${bedRoom?.level ?? 0}`,
      healingSpeedLabel: `Heal ${formatNumber(calculateBedRoomHealingPerSecond(state))} HP/s`,
      capacityLabel: `Capacity ${getRoomJobCapacity(state, "bed_room")}`,
      ...createBedHeroStatus(state, hero),
      recommendationBadge: getFloor10RoomRecommendation(state, "bed_room")?.innBadge ?? null
    },
    trainingRoom: createTrainingRoomViewModel(state, trainingRoom?.isUnlocked === true, trainingRoom?.level ?? 0, selectedTrainingHero),
    extraRooms: createExtraRoomCards(state),
    gate: {
      targetFloorLabel: `Target F${targetFloor}`,
      actionLabel: isRunActive(run?.status) ? "Party in Tower" : canDispatch ? "Send to Tower" : "Party Not Ready",
      actionEnabled: canDispatch,
      statusLabel: canDispatch ? "path is clear" : "gate closed"
    },
    autoDispatch: {
      label: autoDispatch.label,
      isUnlocked: autoDispatch.isUnlocked
    },
    latestMessage: latestEvent?.message ?? "The inn is waiting for orders.",
    isWarning: Boolean(floor10Callout) || latestEvent?.severity === "warning",
    offlineReportMessage: latestOfflineReport?.message,
    bottleneckMessage: floor10Callout?.buildMessage
  };
}

function createHeroViewModel(hero: HeroInstance): InnHeroViewModel {
  const hpDisplay = getHeroHpDisplayText(hero);
  return {
    id: hero.id,
    name: hero.name,
    levelLabel: `${hero.name} Lv ${hero.level}`,
    status: hero.status,
    statusLabel: formatStatusLabel(hero.status),
    hpLabel: hpDisplay.label,
    hpRatio: hpDisplay.ratio,
    readyHpLabel: `Ready at ${getHeroReadyHpThreshold(hero)} HP`
  };
}

function createBedHeroStatus(
  state: GameState,
  hero: HeroInstance | null
): Pick<InnBedRoomViewModel, "heroStatusLabel" | "heroStatusIsActive" | "readyHpLabel"> {
  if (!hero) {
    return {
      heroStatusLabel: null,
      heroStatusIsActive: false,
      readyHpLabel: null
    };
  }

  const activeJob = getHeroActiveRoomJob(state, hero.id);
  const isHealingHere = activeJob?.roomId === "bed_room" && activeJob.jobType === "healing";

  return {
    heroStatusLabel: isHealingHere ? `${hero.name} resting` : `${hero.name} ${formatStatusLabel(hero.status)}`,
    heroStatusIsActive: isHealingHere,
    readyHpLabel: `Ready at ${getHeroReadyHpThreshold(hero)} HP`
  };
}

function createTrainingRoomViewModel(
  state: GameState,
  isUnlocked: boolean,
  level: number,
  selectedHero: HeroInstance | null
): InnTrainingRoomViewModel {
  const trainingText = getTrainingRoomInnText(state, selectedHero);

  return {
    isUnlocked,
    title: isUnlocked ? "Training Room" : "Locked Wing",
    levelLabel: isUnlocked ? `Lv ${level}` : "Floor 2",
    speedLabel: trainingText.speedLabel,
    selectorLabel: trainingText.selectorLabel,
    assignmentLabel: trainingText.assignmentLabel,
    hasActiveTrainingJob: trainingText.activeTrainingJob !== null,
    bonusLabel: trainingText.bonusLabel,
    progressLabel: trainingText.progressLabel,
    actionLabel: trainingText.actionLabel,
    actionEnabled: trainingText.actionEnabled,
    isCancelAction: trainingText.isCancelAction,
    blockedReason: trainingText.blockedReason,
    targetHeroId: trainingText.targetHero?.id ?? null,
    selectedHeroId: trainingText.selectedHero?.id ?? null,
    canSelectPrevious: trainingText.canSelectPrevious,
    canSelectNext: trainingText.canSelectNext,
    recommendationBadge: getFloor10RoomRecommendation(state, "training_room")?.innBadge ?? null
  };
}

function createExtraRoomCards(state: GameState): InnRoomCardViewModel[] {
  return state.innRooms
    .filter((room) => !DETAILED_INN_ROOM_IDS.has(room.roomId))
    .map((room) => {
      const definition = roomDefinitions[room.roomId];
      const unlockFloor = definition?.unlockFloor ?? 1;
      const isFloorKnown = state.unlockedFloor >= Math.max(1, unlockFloor - 1) || room.isUnlocked;
      return {
        roomId: room.roomId,
        name: definition?.name ?? room.roomId,
        levelLabel: `Lv ${room.level}`,
        statusLabel: room.isUnlocked ? "Unlocked" : isFloorKnown ? `Unlock F${unlockFloor}` : "Future wing",
        effectLabel: createExtraRoomEffectLabel(room.roomId, room.isUnlocked, definition?.description ?? "Inn room foundation."),
        isUnlocked: room.isUnlocked
      };
    });
}

function createExtraRoomEffectLabel(roomId: RoomId, isUnlocked: boolean, description: string): string {
  if (roomId === "kitchen") {
    return isUnlocked ? "Food prep foundation active" : "Food prep foundation";
  }

  if (roomId === "forge") {
    return isUnlocked ? "Gear foundation active" : "Gear foundation";
  }

  if (roomId === "tavern") {
    return isUnlocked ? "Party foundation active" : "Party foundation";
  }

  if (roomId === "library") {
    return isUnlocked ? "Automation research active" : "Automation research foundation";
  }

  if (roomId === "gate_room") {
    return isUnlocked ? "Travel prep active" : "Travel prep foundation";
  }

  return description;
}

function isRunActive(status: TowerRunStatus | undefined): boolean {
  return status === "traveling" || status === "exploring" || status === "fighting" || status === "looting";
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
