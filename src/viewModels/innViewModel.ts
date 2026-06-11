import { getAutoDispatchControlState } from "../systems/automationSystem";
import { getFloor10BossCallout, getFloor10RoomRecommendation } from "../systems/bottleneckCalloutSystem";
import { roomDefinitions } from "../data/roomData";
import { canDispatchSelectedParty } from "../systems/partyDispatchSystem";
import {
  calculateBedRoomHealingPerSecond,
  getEligibleTrainingHeroes,
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
  assignmentLabel: string;
  targetLabel: string;
  previousHeroId: HeroId | null;
  nextHeroId: HeroId | null;
  selectorEnabled: boolean;
  hasActiveTrainingJob: boolean;
  bonusLabel: string;
  progressLabel: string;
  actionLabel: string;
  actionEnabled: boolean;
  isCancelAction: boolean;
  blockedReason: string | null;
  targetHeroId: HeroId | null;
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
    trainingRoom: createTrainingRoomViewModel(state, trainingRoom?.isUnlocked === true, trainingRoom?.level ?? 0),
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
  level: number
): InnTrainingRoomViewModel {
  const selector = createTrainingHeroSelector(state);
  const selectedHero = selector.activeHero ?? selector.selectedHero;
  const trainingText = getTrainingRoomInnText(state, selectedHero);

  return {
    isUnlocked,
    title: isUnlocked ? "Training Room" : "Locked Wing",
    levelLabel: isUnlocked ? `Lv ${level}` : "Floor 2",
    speedLabel: trainingText.speedLabel,
    assignmentLabel: trainingText.assignmentLabel,
    targetLabel: selectedHero ? `Target: ${selectedHero.name}` : "Target: None",
    previousHeroId: selector.previousHeroId,
    nextHeroId: selector.nextHeroId,
    selectorEnabled: selector.canSwitch,
    hasActiveTrainingJob: trainingText.activeTrainingJob !== null,
    bonusLabel: trainingText.bonusLabel,
    progressLabel: trainingText.progressLabel,
    actionLabel: trainingText.actionLabel,
    actionEnabled: trainingText.actionEnabled,
    isCancelAction: trainingText.isCancelAction,
    blockedReason: trainingText.blockedReason,
    targetHeroId: trainingText.targetHero?.id ?? null,
    recommendationBadge: getFloor10RoomRecommendation(state, "training_room")?.innBadge ?? null
  };
}

function createTrainingHeroSelector(state: GameState): {
  selectedHero: HeroInstance | null;
  activeHero: HeroInstance | null;
  previousHeroId: HeroId | null;
  nextHeroId: HeroId | null;
  canSwitch: boolean;
} {
  const activeJob = state.innRooms
    .find((room) => room.roomId === "training_room")
    ?.jobs.find((job) => job.status === "active" && job.jobType === "training") ?? null;
  const activeHero = activeJob ? state.heroes.find((hero) => hero.id === activeJob.heroId) ?? null : null;
  const eligibleHeroes = getEligibleTrainingHeroes(state);
  const savedHero = state.selectedTrainingHeroId
    ? eligibleHeroes.find((hero) => hero.id === state.selectedTrainingHeroId) ?? null
    : null;
  const selectedHero = activeHero ?? savedHero ?? eligibleHeroes[0] ?? null;
  const selectedIndex = selectedHero ? eligibleHeroes.findIndex((hero) => hero.id === selectedHero.id) : -1;
  const canSwitch = !activeHero && eligibleHeroes.length > 1 && selectedIndex >= 0;

  if (!canSwitch) {
    return {
      selectedHero,
      activeHero,
      previousHeroId: null,
      nextHeroId: null,
      canSwitch: false
    };
  }

  const previousIndex = (selectedIndex - 1 + eligibleHeroes.length) % eligibleHeroes.length;
  const nextIndex = (selectedIndex + 1) % eligibleHeroes.length;

  return {
    selectedHero,
    activeHero,
    previousHeroId: eligibleHeroes[previousIndex]?.id ?? null,
    nextHeroId: eligibleHeroes[nextIndex]?.id ?? null,
    canSwitch
  };
}

function createExtraRoomCards(state: GameState): InnRoomCardViewModel[] {
  const detailedRoomIds = new Set<RoomId>(["bed_room", "training_room"]);

  return state.innRooms
    .filter((room) => !detailedRoomIds.has(room.roomId))
    .map((room) => {
      const definition = roomDefinitions[room.roomId];
      const name = definition?.name ?? room.roomId;
      const unlockLabel = definition ? `Unlock F${definition.unlockFloor}` : "Future room";
      const statusLabel = room.isUnlocked ? "Unlocked" : `${unlockLabel} - future`;

      return {
        roomId: room.roomId,
        name,
        levelLabel: `Lv ${room.level}`,
        statusLabel,
        effectLabel: room.isUnlocked ? createRoomEffectLabel(definition?.effectType) : "Foundation / coming soon",
        isUnlocked: room.isUnlocked
      };
    });
}

function createRoomEffectLabel(effectType: string | undefined): string {
  switch (effectType) {
    case "food_prep":
      return "Food prep foundation";
    case "gear_upgrade":
      return "Gear upgrade foundation";
    case "party_capacity":
      return "Party planning foundation";
    case "automation_research":
      return "Automation foundation";
    case "travel_prep":
      return "Travel prep foundation";
    default:
      return "Foundation / coming soon";
  }
}

function isRunActive(status: TowerRunStatus | undefined): boolean {
  return status === "traveling" || status === "exploring" || status === "fighting" || status === "looting" || status === "retreating" || status === "boss_ready";
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
