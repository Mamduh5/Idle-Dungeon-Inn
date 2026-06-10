import { enemyDefinitions } from "../data/enemyData";
import { prototypeTowerFloors } from "../data/towerData";
import { appendRecentEvent } from "../state/recentEvents";
import { createBossEncounterMessage } from "./bottleneckHintSystem";
import { FLOOR_CLEAR_HOLD_REASON, TREASURE_HOLD_REASON } from "./towerNodeActionSystem";
import { getGateRoomTravelDurationMs } from "./roomEffectSystem";
import type { GameState } from "../types/gameState";
import type { EnemyId } from "../types/ids";
import type { PartyState } from "../types/partyTypes";
import type { RecentEvent } from "../types/recentEventTypes";
import type { TowerNodeDefinition, TowerRunEnemyState, TowerRunState } from "../types/towerTypes";

const NODE_EXPLORE_DURATION_MS = 2000;

export function tickTowerRuns(state: GameState, deltaMs: number, now: number): GameState {
  if (deltaMs <= 0) {
    return state;
  }

  let changed = false;
  let recentEvents = state.recentEvents;

  const towerRuns = state.towerRuns.map((run) => {
    const party = state.parties.find((candidate) => candidate.id === run.partyId);
    const result = tickTowerRun(run, party, deltaMs, now, getGateRoomTravelDurationMs(state));

    if (result.run !== run) {
      changed = true;
    }

    if (result.event) {
      changed = true;
      recentEvents = appendRecentEvent(recentEvents, result.event);
    }

    return result.run;
  });

  if (!changed) {
    return state;
  }

  return {
    ...state,
    towerRuns,
    recentEvents,
    lastActiveAt: now
  };
}

function tickTowerRun(
  run: TowerRunState,
  party: PartyState | undefined,
  deltaMs: number,
  now: number,
  travelDurationMs: number
): { run: TowerRunState; event: RecentEvent | null } {
  if (run.status === "traveling") {
    const nextProgress = Math.min(1, run.nodeProgress + deltaMs / travelDurationMs);

    if (nextProgress < 1) {
      return {
        run: {
          ...run,
          nodeProgress: nextProgress
        },
        event: null
      };
    }

    return {
      run: {
        ...run,
        status: "exploring",
        nodeIndex: 0,
        nodeProgress: 0
      },
      event: createEvent(
        now,
        "tower_floor_entered",
        `${partyName(party)} entered Floor ${run.floor}.`,
        "info",
        run
      )
    };
  }

  if (run.status === "exploring") {
    const floor = prototypeTowerFloors.find((candidate) => candidate.floor === run.floor);
    const node = floor?.nodes[run.nodeIndex];

    if (!floor || !node) {
      return {
        run: {
          ...run,
          status: "blocked",
          lastFailureReason: "No tower node is available for this floor.",
          nodeProgress: 1
        },
        event: createEvent(
          now,
          "tower_node_reached",
          `${partyName(party)} could not find the next tower node.`,
          "warning",
          run
        )
      };
    }

    const nextProgress = Math.min(1, run.nodeProgress + deltaMs / NODE_EXPLORE_DURATION_MS);

    if (nextProgress < 1) {
      return {
        run: {
          ...run,
          nodeProgress: nextProgress
        },
        event: null
      };
    }

    return resolveReachedNode(run, party, node, now);
  }

  return {
    run,
    event: null
  };
}

function resolveReachedNode(
  run: TowerRunState,
  party: PartyState | undefined,
  node: TowerNodeDefinition,
  now: number
): { run: TowerRunState; event: RecentEvent | null } {
  if (node.type === "combat" || node.type === "elite" || node.type === "boss") {
    const enemyIds = getNodeEnemyIds(node);
    const isBoss = node.type === "boss";
    const encounterMessage = isBoss
      ? createBossEncounterMessage(run.floor, enemyIds[0] ?? null, partyName(party))
      : `${partyName(party)} encountered enemies on Floor ${run.floor}.`;

    return {
      run: {
        ...run,
        status: "fighting",
        nodeProgress: 1,
        enemies: enemyIds.map(createEnemyState),
        heroCombatCooldowns: {},
        enemyCombatCooldowns: {},
        lastCombatEventMessage: isBoss ? "Boss checkpoint started." : "Combat started.",
        combatStartedAt: null
      },
      event: createEvent(now, "tower_encounter_started", encounterMessage, isBoss ? "danger" : "warning", run)
    };
  }

  if (node.type === "treasure") {
    return {
      run: {
        ...run,
        status: "looting",
        nodeProgress: 1,
        lastFailureReason: TREASURE_HOLD_REASON,
        lastCombatEventMessage: TREASURE_HOLD_REASON
      },
      event: createEvent(
        now,
        "loot_found",
        `${partyName(party)} found treasure. Rewards are not implemented yet.`,
        "success",
        run
      )
    };
  }

  if (node.type === "camp") {
    return {
      run: {
        ...run,
        status: "blocked",
        nodeProgress: 1,
        lastFailureReason: "Camp handling is not implemented yet."
      },
      event: createEvent(
        now,
        "tower_node_reached",
        `${partyName(party)} found a camp. Camp handling is not implemented yet.`,
        "info",
        run
      )
    };
  }

  if (node.type === "exit") {
    return {
      run: {
        ...run,
        status: "blocked",
        nodeProgress: 1,
        lastFailureReason: FLOOR_CLEAR_HOLD_REASON,
        lastCombatEventMessage: "Exit reached."
      },
      event: createEvent(
        now,
        "tower_node_reached",
        `${partyName(party)} reached the exit. Floor clear is not implemented yet.`,
        "info",
        run
      )
    };
  }

  return {
    run: {
      ...run,
      status: "blocked",
      nodeProgress: 1,
      lastFailureReason: `${node.type} node handling is not implemented yet.`
    },
    event: createEvent(
      now,
      "tower_node_reached",
      `${partyName(party)} reached a ${node.type} node. Handling is not implemented yet.`,
      "info",
      run
    )
  };
}

function getNodeEnemyIds(node: TowerNodeDefinition): EnemyId[] {
  if (node.bossId) {
    return [node.bossId];
  }

  return node.enemyIds ?? [];
}

function createEnemyState(enemyId: EnemyId): TowerRunEnemyState {
  return {
    enemyId,
    currentHp: enemyDefinitions[enemyId]?.baseStats.hp ?? null,
    status: "active"
  };
}

function createEvent(
  createdAt: number,
  type: RecentEvent["type"],
  message: string,
  severity: RecentEvent["severity"],
  run: TowerRunState
): RecentEvent {
  return {
    id: `event_${type}_${run.partyId}_${createdAt}`,
    type,
    createdAt,
    message,
    severity,
    partyId: run.partyId,
    floor: run.floor
  };
}

function partyName(party: PartyState | undefined): string {
  return party?.name ?? "Party";
}
