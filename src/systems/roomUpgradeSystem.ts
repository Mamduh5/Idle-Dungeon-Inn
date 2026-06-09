import { roomDefinitions } from "../data/roomData";
import { getInnRoom } from "../state/gameSelectors";
import { appendRecentEvent } from "../state/recentEvents";
import type { GameState } from "../types/gameState";
import type { RoomId } from "../types/ids";
import type { RecentEvent } from "../types/recentEventTypes";
import type { InnRoomState, RoomDefinition } from "../types/roomTypes";

export interface RoomUpgradePreview {
  roomId: RoomId;
  name: string;
  cost: number;
  nextLevel: number;
  isUnlocked: boolean;
  isFloorUnlocked: boolean;
  canAfford: boolean;
  canPurchase: boolean;
  label: string;
  reason: string | null;
}

export function getRoomUpgradeCost(room: InnRoomState | null, definition: RoomDefinition): number {
  const currentLevel = room?.level ?? 0;
  const exponent = Math.max(0, currentLevel - 1);
  return Math.ceil(definition.baseCost * definition.costGrowth ** exponent);
}

export function getRoomUpgradePreview(state: GameState, roomId: RoomId): RoomUpgradePreview | null {
  const definition = roomDefinitions[roomId];
  if (!definition) {
    return null;
  }

  const room = getInnRoom(state, roomId);
  const cost = getRoomUpgradeCost(room, definition);
  const isUnlocked = Boolean(room?.isUnlocked);
  const isFloorUnlocked = state.unlockedFloor >= definition.unlockFloor;
  const canAfford = state.currencies.coins >= cost;
  const nextLevel = isUnlocked ? (room?.level ?? 0) + 1 : 1;
  const label = isUnlocked ? `Upgrade ${cost}c` : `Unlock ${cost}c`;
  const reason = getPurchaseBlockReason(definition, cost, state, isFloorUnlocked, canAfford);

  return {
    roomId,
    name: definition.name,
    cost,
    nextLevel,
    isUnlocked,
    isFloorUnlocked,
    canAfford,
    canPurchase: reason === null,
    label,
    reason
  };
}

export function purchaseRoomUpgrade(roomId: RoomId): (state: GameState) => GameState {
  return (state) => {
    const definition = roomDefinitions[roomId];
    const now = Date.now();

    if (!definition) {
      return withRoomUpgradeEvent(state, createRoomEvent(now, `Unknown room ${roomId}.`, "warning"));
    }

    const room = getInnRoom(state, roomId);
    const cost = getRoomUpgradeCost(room, definition);
    const isFloorUnlocked = state.unlockedFloor >= definition.unlockFloor;

    if (!isFloorUnlocked) {
      return withRoomUpgradeEvent(
        state,
        createRoomEvent(now, `${definition.name} unlocks after reaching Floor ${definition.unlockFloor}.`, "warning")
      );
    }

    if (state.currencies.coins < cost) {
      return withRoomUpgradeEvent(
        state,
        createRoomEvent(now, `${definition.name} needs ${cost} coins.`, "warning")
      );
    }

    const wasUnlocked = Boolean(room?.isUnlocked);
    const nextRoom: InnRoomState = {
      roomId: definition.roomId,
      level: wasUnlocked ? (room?.level ?? 0) + 1 : 1,
      isUnlocked: true,
      activeJob: room?.activeJob ?? null,
      jobs: room?.jobs ?? []
    };
    const existingRoomIds = new Set(state.innRooms.map((candidate) => candidate.roomId));
    const nextRooms = existingRoomIds.has(roomId)
      ? state.innRooms.map((candidate) => (candidate.roomId === roomId ? nextRoom : candidate))
      : [...state.innRooms, nextRoom];
    const action = wasUnlocked ? "upgraded" : "unlocked";

    return withRoomUpgradeEvent(
      {
        ...state,
        currencies: {
          ...state.currencies,
          coins: state.currencies.coins - cost
        },
        innRooms: nextRooms
      },
      createRoomEvent(now, `${definition.name} ${action} to Lv ${nextRoom.level} for ${cost} coins.`, "success")
    );
  };
}

function getPurchaseBlockReason(
  definition: RoomDefinition,
  cost: number,
  state: GameState,
  isFloorUnlocked: boolean,
  canAfford: boolean
): string | null {
  if (!isFloorUnlocked) {
    return `Reach Floor ${definition.unlockFloor}`;
  }

  if (!canAfford) {
    return `Need ${cost - state.currencies.coins}c`;
  }

  return null;
}

function createRoomEvent(createdAt: number, message: string, severity: RecentEvent["severity"]): RecentEvent {
  return {
    id: `event_upgrade_purchased_${createdAt}`,
    type: "upgrade_purchased",
    createdAt,
    message,
    severity
  };
}

function withRoomUpgradeEvent(state: GameState, event: RecentEvent): GameState {
  return {
    ...state,
    recentEvents: appendRecentEvent(state.recentEvents, event),
    lastActiveAt: event.createdAt
  };
}
