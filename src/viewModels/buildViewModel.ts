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

export interface BuildViewModel {
  hasBottleneckCallout: boolean;
  bottleneckCallout: Floor10BossCallout | null;
  roomPlans: BuildRoomPlanViewModel[];
  trainingRoomCopy: string[];
  automation: BuildAutomationViewModel;
  futurePlans: BuildFuturePlanViewModel[];
}

export function getBuildViewModel(state: GameState): BuildViewModel {
  const bottleneckCallout = getFloor10BossCallout(state);

  return {
    hasBottleneckCallout: Boolean(bottleneckCallout),
    bottleneckCallout,
    roomPlans: PRIMARY_ROOM_IDS.map((roomId) => createRoomPlanViewModel(state, roomId)),
    trainingRoomCopy: TRAINING_ROOM_BUILD_COPY,
    automation: createAutomationViewModel(state),
    futurePlans: [
      { label: "Kitchen", status: "future" },
      { label: "Workshop", status: "future" },
      { label: "Guest Beds", status: "future" }
    ]
  };
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
