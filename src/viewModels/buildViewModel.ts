import { automationDefinitions } from "../data/automationData";
import { roomDefinitions } from "../data/roomData";
import { getAutoDispatchControlState } from "../systems/automationSystem";
import {
  getFloor10BossCallout,
  getFloor10RoomRecommendation,
  type Floor10BossCallout
} from "../systems/bottleneckCalloutSystem";
import {
  calculateBedRoomHealingPerSecondForLevel,
  calculateTrainingRoomXpPerSecondForLevel
} from "../systems/roomJobSystem";
import { getRoomUpgradePreview } from "../systems/roomUpgradeSystem";
import { getInnRoom } from "../state/gameSelectors";
import type { GameState } from "../types/gameState";
import type { RoomId } from "../types/ids";
import { TRAINING_ROOM_BUILD_COPY } from "../ui/trainingRoomText";
import { getBottleneckViewModel, type BottleneckViewModel } from "./bottleneckViewModel";

const PRIMARY_ROOM_IDS: RoomId[] = ["bed_room", "training_room"];

export interface BuildRoomUpgradeViewModel {
  label: string;
  canPurchase: boolean;
  blockedReason: string | null;
}

export interface BuildRoomPlanViewModel {
  roomId: RoomId;
  title: string;
  levelLabel: string;
  effectLabel: string;
  isAvailable: boolean;
  isFloorUnlocked: boolean;
  unlockStatusLabel: string;
  recommendationBadge: string | null;
  strategicLabel: string;
  upgrade: BuildRoomUpgradeViewModel | null;
}

export interface BuildAutomationViewModel {
  name: string;
  isUnlocked: boolean;
  isEnabled: boolean;
  statusLabel: string;
  description: string;
  actionLabel: string;
  unlockLabel: string;
}

export interface BuildFuturePlanViewModel {
  label: string;
  status: string;
}

export type BuildChoiceCategory = "Sustain" | "Training" | "Tank" | "Fast Clear" | "Loot" | "Automation";

export interface BuildChoiceCardViewModel {
  id: string;
  category: BuildChoiceCategory;
  title: string;
  description: string;
  gameplayEffect: string;
  cost: number | null;
  costLabel: string;
  canAfford: boolean;
  isUnlocked: boolean;
  blockedReason: string | null;
  recommendationBadge: string | null;
  targetRoomId: RoomId | null;
  command: "purchase_room_upgrade" | "toggle_auto_dispatch" | null;
}

export interface BuildChoiceCategoryViewModel {
  category: BuildChoiceCategory;
  cards: BuildChoiceCardViewModel[];
}

export interface BuildViewModel {
  hasBottleneckCallout: boolean;
  bottleneckCallout: Floor10BossCallout | null;
  bottleneckSummary: BottleneckViewModel;
  choiceCategories: BuildChoiceCategoryViewModel[];
  roomPlans: BuildRoomPlanViewModel[];
  trainingRoomCopy: string[];
  automation: BuildAutomationViewModel;
  futurePlans: BuildFuturePlanViewModel[];
}

export function getBuildViewModel(state: GameState): BuildViewModel {
  const bottleneckCallout = getFloor10BossCallout(state);
  const roomPlans = PRIMARY_ROOM_IDS.map((roomId) => createRoomPlanViewModel(state, roomId));
  const automation = createAutomationViewModel(state);
  const choiceCards = [
    ...roomPlans.map((roomPlan) => createRoomChoiceCard(state, roomPlan)),
    createAutomationChoiceCard(automation),
    ...createFutureChoiceCards()
  ];

  return {
    hasBottleneckCallout: Boolean(bottleneckCallout),
    bottleneckCallout,
    bottleneckSummary: getBottleneckViewModel(state),
    choiceCategories: groupChoiceCards(choiceCards),
    roomPlans,
    trainingRoomCopy: TRAINING_ROOM_BUILD_COPY,
    automation,
    futurePlans: [
      { label: "Kitchen", status: "future" },
      { label: "Workshop", status: "future" },
      { label: "Guest Beds", status: "future" }
    ]
  };
}

function createRoomChoiceCard(state: GameState, roomPlan: BuildRoomPlanViewModel): BuildChoiceCardViewModel {
  const upgrade = getRoomUpgradePreview(state, roomPlan.roomId);
  const isBedRoom = roomPlan.roomId === "bed_room";

  return {
    id: `room_${roomPlan.roomId}`,
    category: isBedRoom ? "Sustain" : "Training",
    title: roomPlan.title,
    description: isBedRoom
      ? "Recover wounded heroes for safer checkpoint retries."
      : "Train selected heroes for personal attack gains.",
    gameplayEffect: isBedRoom
      ? `${roomPlan.effectLabel}. Improves retry pacing after wipes.`
      : `${roomPlan.effectLabel}. Personal +ATK is kept per hero; no global aura.`,
    cost: upgrade?.cost ?? null,
    costLabel: upgrade ? `${upgrade.cost} coins` : "No upgrade",
    canAfford: upgrade?.canAfford ?? false,
    isUnlocked: roomPlan.isAvailable,
    blockedReason: upgrade?.reason ?? null,
    recommendationBadge: roomPlan.recommendationBadge,
    targetRoomId: roomPlan.roomId,
    command: "purchase_room_upgrade"
  };
}

function createAutomationChoiceCard(automation: BuildAutomationViewModel): BuildChoiceCardViewModel {
  return {
    id: "automation_auto_dispatch",
    category: "Automation",
    title: automation.name,
    description: "Send ready parties back to the tower automatically.",
    gameplayEffect: automation.description,
    cost: null,
    costLabel: automation.isUnlocked ? automation.statusLabel : automation.unlockLabel,
    canAfford: automation.isUnlocked,
    isUnlocked: automation.isUnlocked,
    blockedReason: automation.isUnlocked ? null : automation.unlockLabel,
    recommendationBadge: null,
    targetRoomId: null,
    command: automation.isUnlocked ? "toggle_auto_dispatch" : null
  };
}

function createFutureChoiceCards(): BuildChoiceCardViewModel[] {
  return [
    createLockedChoiceCard("future_tavern", "Tank", "Tavern", "Party capacity and roster management foundation."),
    createLockedChoiceCard("future_gate_room", "Fast Clear", "Gate Room", "Shorter travel and retry pacing."),
    createLockedChoiceCard("future_kitchen", "Loot", "Kitchen", "Preparation buffs and future loot support.")
  ];
}

function createLockedChoiceCard(
  id: string,
  category: BuildChoiceCategory,
  title: string,
  description: string
): BuildChoiceCardViewModel {
  return {
    id,
    category,
    title,
    description,
    gameplayEffect: "Coming in a later room phase.",
    cost: null,
    costLabel: "Locked",
    canAfford: false,
    isUnlocked: false,
    blockedReason: "Coming soon",
    recommendationBadge: null,
    targetRoomId: null,
    command: null
  };
}

function groupChoiceCards(cards: BuildChoiceCardViewModel[]): BuildChoiceCategoryViewModel[] {
  const categoryOrder: BuildChoiceCategory[] = ["Sustain", "Training", "Automation", "Tank", "Fast Clear", "Loot"];

  return categoryOrder
    .map((category) => ({
      category,
      cards: cards.filter((card) => card.category === category)
    }))
    .filter((group) => group.cards.length > 0);
}

function createRoomPlanViewModel(state: GameState, roomId: RoomId): BuildRoomPlanViewModel {
  const room = getInnRoom(state, roomId);
  const definition = roomDefinitions[roomId];
  const upgrade = getRoomUpgradePreview(state, roomId);
  const isAvailable = Boolean(room?.isUnlocked);
  const recommendation = getFloor10RoomRecommendation(state, roomId);

  return {
    roomId,
    title: definition?.name ?? roomId,
    levelLabel: `Lv ${room?.level ?? 0}`,
    effectLabel: getRoomEffectLabel(roomId, room?.isUnlocked ? room.level : 0),
    isAvailable,
    isFloorUnlocked: upgrade?.isFloorUnlocked ?? false,
    unlockStatusLabel: isAvailable ? "Unlocked" : upgrade?.isFloorUnlocked ? "Locked" : `Floor ${definition?.unlockFloor ?? "?"}`,
    recommendationBadge: recommendation ? "Recommended" : null,
    strategicLabel: roomId === "bed_room" ? "Safer retry pacing" : "Personal hero training",
    upgrade: upgrade
      ? {
          label: upgrade.canPurchase ? upgrade.label : upgrade.reason ?? upgrade.label,
          canPurchase: upgrade.canPurchase,
          blockedReason: upgrade.reason
        }
      : null
  };
}

function createAutomationViewModel(state: GameState): BuildAutomationViewModel {
  const control = getAutoDispatchControlState(state);
  const definition = automationDefinitions.auto_dispatch_board;

  return {
    name: definition.name,
    isUnlocked: control.isUnlocked,
    isEnabled: control.isEnabled,
    statusLabel: control.statusLabel,
    description: "Sends ready party back to tower.",
    actionLabel: control.isEnabled ? "Turn OFF" : "Turn ON",
    unlockLabel: `Unlocks at Floor ${definition.unlockFloor}`
  };
}

function getRoomEffectLabel(roomId: RoomId, level: number): string {
  if (roomId === "bed_room") {
    return `Healing ${calculateBedRoomHealingPerSecondForLevel(level)} HP/s`;
  }

  if (roomId === "training_room") {
    return `Training ${calculateTrainingRoomXpPerSecondForLevel(level)} XP/s`;
  }

  return roomDefinitions[roomId]?.effectType.split("_").join(" ") ?? "unknown";
}
