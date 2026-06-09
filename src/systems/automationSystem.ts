import { automationDefinitions } from "../data/automationData";
import { appendRecentEvent } from "../state/recentEvents";
import type { GameState } from "../types/gameState";
import type { RecentEvent } from "../types/recentEventTypes";
import { getSelectedPartyDispatchBlockReason, sendSelectedPartyToTower } from "./partyDispatchSystem";

const AUTO_DISPATCH_ID = automationDefinitions.auto_dispatch_board.automationId;
const AUTO_DISPATCH_COOLDOWN_MS = 1500;

export function tickAutomation(state: GameState, now: number): GameState {
  const unlockedState = unlockAutoDispatchIfReady(state, now);

  if (unlockedState !== state) {
    return unlockedState;
  }

  if (!isAutoDispatchEnabled(unlockedState)) {
    return unlockedState;
  }

  const lastAutoDispatchAt = unlockedState.automation.lastAutoDispatchAt;
  if (lastAutoDispatchAt !== null && now - lastAutoDispatchAt < AUTO_DISPATCH_COOLDOWN_MS) {
    return unlockedState;
  }

  if (getSelectedPartyDispatchBlockReason(unlockedState) !== null) {
    return unlockedState;
  }

  const dispatchedState = sendSelectedPartyToTower(unlockedState, {
    now,
    eventType: "automation_triggered",
    createMessage: (partyName, targetFloor) => `Auto-Dispatch sent ${partyName} to Floor ${targetFloor}.`
  });

  return {
    ...dispatchedState,
    automation: {
      ...dispatchedState.automation,
      lastAutoDispatchAt: now
    }
  };
}

export function toggleAutoDispatch(state: GameState): GameState {
  if (state.automation.autoDispatchLevel <= 0) {
    return state;
  }

  const now = Date.now();
  const nextEnabled = !state.automation.enabled[AUTO_DISPATCH_ID];

  return {
    ...state,
    automation: {
      ...state.automation,
      enabled: {
        ...state.automation.enabled,
        [AUTO_DISPATCH_ID]: nextEnabled
      }
    },
    recentEvents: appendRecentEvent(
      state.recentEvents,
      createAutomationEvent(now, `Auto-Dispatch turned ${nextEnabled ? "ON" : "OFF"}.`, "info")
    ),
    lastActiveAt: now
  };
}

function unlockAutoDispatchIfReady(state: GameState, now: number): GameState {
  if (state.automation.autoDispatchLevel > 0 || state.unlockedFloor < automationDefinitions.auto_dispatch_board.unlockFloor) {
    return state;
  }

  return {
    ...state,
    automation: {
      ...state.automation,
      autoDispatchLevel: 1,
      lastAutoDispatchAt: now,
      enabled: {
        ...state.automation.enabled,
        [AUTO_DISPATCH_ID]: true
      }
    },
    recentEvents: appendRecentEvent(
      state.recentEvents,
      createAutomationEvent(now, "Auto-Dispatch Board unlocked.", "success")
    ),
    lastActiveAt: now
  };
}

function isAutoDispatchEnabled(state: GameState): boolean {
  return state.automation.autoDispatchLevel > 0 && state.automation.enabled[AUTO_DISPATCH_ID] === true;
}

function createAutomationEvent(
  createdAt: number,
  message: string,
  severity: RecentEvent["severity"]
): RecentEvent {
  return {
    id: `event_automation_triggered_${createdAt}`,
    type: "automation_triggered",
    createdAt,
    message,
    severity
  };
}
