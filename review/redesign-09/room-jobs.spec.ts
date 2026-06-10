import { expect, test } from "@playwright/test";
import { createInitialGameState } from "../../src/game/initialState";
import { normalizeLoadedGameState } from "../../src/state/saveStorage";
import { tickAutomation } from "../../src/systems/automationSystem";
import { getSelectedPartyDispatchBlockReason, sendSelectedPartyToTower } from "../../src/systems/partyDispatchSystem";
import {
  assignHeroToBedHealingIfNeeded,
  assignHeroToRoomJob,
  getHeroActiveRoomJob,
  getHeroReadyHpThreshold,
  getRoomJobCapacity,
  tickRoomJobs
} from "../../src/systems/roomJobSystem";
import { recoverSelectedWipedParty } from "../../src/systems/wipeRecoverySystem";
import type { GameState } from "../../src/types/gameState";

test("generic room job state normalizes old saves without wiping progress", () => {
  const baseState = createInitialGameState();
  const rawState = {
    ...baseState,
    currencies: {
      coins: Number.NaN
    },
    heroes: baseState.heroes.map((hero) => ({
      ...hero,
      currentHp: Number.POSITIVE_INFINITY,
      status: "unknown_status"
    })),
    innRooms: baseState.innRooms.map((room) => {
      const { jobs: _jobs, ...legacyRoom } = room;
      return {
        ...legacyRoom,
        activeJob: "legacy_job"
      };
    })
  };

  const normalized = normalizeLoadedGameState(rawState);

  expect(normalized).not.toBeNull();
  expect(normalized?.currencies.coins).toBe(0);
  expect(normalized?.heroes[0]?.currentHp).toBe(120);
  expect(normalized?.heroes[0]?.status).toBe("ready");
  expect(normalized?.heroes[0]?.training).toEqual({
    attackTrainingXp: 0,
    attackTrainingLevel: 0,
    totalTrainingSeconds: 0
  });
  expect(normalized?.innRooms.every((room) => Array.isArray(room.jobs))).toBe(true);
  expect(normalized?.innRooms.every((room) => room.activeJob === null)).toBe(true);
});

test("room job helpers assign a stable healing job with v0 capacity", () => {
  const state = createInitialGameState();
  const hero = state.heroes[0];
  const woundedState = {
    ...state,
    heroes: state.heroes.map((candidate) =>
      candidate.id === hero.id
        ? {
            ...candidate,
            currentHp: 40,
            status: "resting" as const
          }
        : candidate
    )
  };

  const assignedState = assignHeroToRoomJob(woundedState, hero.id, "bed_room", "healing", 1000);
  const job = getHeroActiveRoomJob(assignedState, hero.id);

  expect(getRoomJobCapacity(assignedState, "bed_room")).toBe(1);
  expect(job?.id).toBe(`room_job_bed_room_${hero.id}_healing`);
  expect(job?.jobType).toBe("healing");
  expect(job?.status).toBe("active");
});

test("manual wipe recovery returns hero resting and blocks low HP dispatch", () => {
  const wipedState = createWipedFloorSixState(createInitialGameState(), true);
  const recoveredState = recoverSelectedWipedParty(wipedState);
  const hero = recoveredState.heroes[0];

  expect(recoveredState.towerRuns[0]?.status).toBe("preparing");
  expect(hero?.status).toBe("resting");
  expect(hero?.currentHp).toBe(1);
  expect(getHeroActiveRoomJob(recoveredState, hero?.id ?? "")?.jobType).toBe("healing");
  expect(getSelectedPartyDispatchBlockReason(recoveredState)).toContain("resting");

  const dispatchAttempt = sendSelectedPartyToTower(recoveredState, { now: 2000 });
  expect(dispatchAttempt.towerRuns[0]?.status).toBe("preparing");
  expect(dispatchAttempt.heroes[0]?.status).toBe("resting");
});

test("Bed Room heals over time and marks hero ready at the readiness threshold", () => {
  const recoveredState = recoverSelectedWipedParty(createWipedFloorSixState(createInitialGameState(), false));
  const hero = recoveredState.heroes[0];
  const readyThreshold = getHeroReadyHpThreshold(hero);
  const healedState = tickRoomJobs(recoveredState, 60_000, 61_000);

  expect(readyThreshold).toBe(108);
  expect(healedState.heroes[0]?.currentHp).toBeGreaterThanOrEqual(readyThreshold);
  expect(healedState.heroes[0]?.status).toBe("ready");
  expect(getHeroActiveRoomJob(healedState, hero.id)).toBeNull();
});

test("Auto-Dispatch does not recover wiped runs and waits for Bed Room readiness after manual recovery", () => {
  const wipedState = createWipedFloorSixState(createInitialGameState(), true);
  const stillWipedState = tickAutomation(wipedState, 60_000);

  expect(stillWipedState.towerRuns[0]?.status).toBe("wiped");
  expect(stillWipedState.heroes[0]?.status).toBe("defeated");

  const recoveredState = recoverSelectedWipedParty(stillWipedState);
  const tooSoonState = tickAutomation(recoveredState, Date.now() + 5_000);

  expect(tooSoonState.towerRuns[0]?.status).toBe("preparing");
  expect(tooSoonState.heroes[0]?.status).toBe("resting");

  const firstHeroHealedState = tickRoomJobs(tooSoonState, 60_000, Date.now() + 65_000);
  const secondHeroHealedState = tickRoomJobs(firstHeroHealedState, 40_000, Date.now() + 105_000);
  const redispatchedState = tickAutomation(secondHeroHealedState, Date.now() + 107_000);

  expect(redispatchedState.heroes[0]?.status).toBe("in_tower");
  expect(redispatchedState.heroes[1]?.status).toBe("in_tower");
  expect(redispatchedState.towerRuns[0]?.status).toBe("traveling");
  expect(redispatchedState.towerRuns[0]?.floor).toBe(6);
});

test("Bed Room ticking is pure and scene independent", () => {
  const woundedState = assignHeroToBedHealingIfNeeded(
    {
      ...createInitialGameState(),
      heroes: createInitialGameState().heroes.map((hero) => ({
        ...hero,
        currentHp: 40,
        status: "resting" as const
      }))
    },
    "hero_rookie_knight_1",
    1000
  );

  const tickedState = tickRoomJobs(woundedState, 5_000, 6_000);

  expect(tickedState.heroes[0]?.currentHp).toBeGreaterThan(woundedState.heroes[0]?.currentHp ?? 0);
  expect(tickedState.innRooms.find((room) => room.roomId === "bed_room")?.jobs[0]?.progress).toBeGreaterThan(0);
});

function createWipedFloorSixState(baseState: GameState, autoDispatchEnabled: boolean): GameState {
  const now = Date.now();

  return {
    ...baseState,
    unlockedFloor: 6,
    highestFloorCleared: 5,
    firstClearFloorIds: [1, 2, 3, 4, 5],
    heroes: baseState.heroes.map((hero) => ({
      ...hero,
      currentHp: 0,
      status: "defeated" as const,
      highestFloorCleared: 5
    })),
    parties: baseState.parties.map((party) => ({
      ...party,
      selectedTargetFloor: 6
    })),
    towerRuns: baseState.towerRuns.map((run) => ({
      ...run,
      status: "wiped" as const,
      floor: 6,
      nodeIndex: 1,
      nodeProgress: 1,
      enemies: [
        {
          enemyId: "ember_wisp",
          currentHp: 18,
          status: "active" as const
        }
      ],
      heroCombatCooldowns: {},
      enemyCombatCooldowns: {},
      lastCombatEventMessage: "Party wiped. Return/revive is not implemented yet.",
      combatStartedAt: now - 1000,
      lootBag: [],
      lastFailureReason: "Party wiped.",
      startedAt: now - 5000
    })),
    automation: {
      ...baseState.automation,
      autoDispatchLevel: 1,
      lastAutoDispatchAt: now - 5000,
      enabled: {
        ...baseState.automation.enabled,
        auto_dispatch_board: autoDispatchEnabled
      }
    },
    recentEvents: [],
    lastActiveAt: now
  };
}
