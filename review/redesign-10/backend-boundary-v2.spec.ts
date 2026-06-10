import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { automationDefinitions } from "../../src/data/automationData";
import { runGameCommand } from "../../src/application/gameCommands";
import { createInitialGameState } from "../../src/game/initialState";
import { normalizeLoadedGameState } from "../../src/state/saveStorage";
import { tickGameState } from "../../src/systems/gameTickSystem";
import { assignHeroToBedHealingIfNeeded, getHeroActiveRoomJob } from "../../src/systems/roomJobSystem";
import type { GameState } from "../../src/types/gameState";

test("typed game command pipeline mutates GameState without Phaser", () => {
  const trainingState = runGameCommand(unlockTrainingRoom(createInitialGameState(), 1), {
    type: "inn/start_training",
    heroId: "hero_rookie_knight_1",
    now: 1000
  });
  const upgradedState = runGameCommand(
    {
      ...createInitialGameState(),
      currencies: {
        coins: 25
      }
    },
    {
      type: "build/purchase_room_upgrade",
      roomId: "bed_room",
      now: 2000
    }
  );

  expect(getHeroActiveRoomJob(trainingState, "hero_rookie_knight_1")?.jobType).toBe("training");
  expect(upgradedState.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(2);
  expect(readFileSync("src/application/gameCommands.ts", "utf8")).not.toContain("phaser");
});

test("tick order lets room jobs update readiness before automation dispatch", () => {
  const autoDispatchId = automationDefinitions.auto_dispatch_board.automationId;
  const restingState = {
    ...createInitialGameState(),
    heroes: createInitialGameState().heroes.map((hero) => ({
      ...hero,
      currentHp: hero.id === "hero_rookie_knight_1" ? 106 : hero.currentHp,
      status: hero.id === "hero_rookie_knight_1" ? ("resting" as const) : ("ready" as const)
    }))
  };
  const healingState = assignHeroToBedHealingIfNeeded(restingState, "hero_rookie_knight_1", 1000);
  const automatedState: GameState = {
    ...healingState,
    automation: {
      ...healingState.automation,
      autoDispatchLevel: 1,
      lastAutoDispatchAt: null,
      enabled: {
        ...healingState.automation.enabled,
        [autoDispatchId]: true
      }
    }
  };
  const tickedState = tickGameState(automatedState, 1000, 2500);

  expect(tickedState.heroes[0]?.status).toBe("in_tower");
  expect(tickedState.towerRuns[0]?.status).toBe("traveling");
  expect(tickedState.recentEvents[0]?.type).toBe("automation_triggered");
});

test("invalid saves normalize parties, tower runs, events, and numeric state safely", () => {
  const raw = createInitialGameState() as unknown as Record<string, unknown>;
  raw.currencies = { coins: -500 };
  raw.selectedPartyId = "missing_party";
  raw.parties = [
    {
      id: "party_lantern",
      name: "Lantern Party",
      heroIds: ["hero_rookie_knight_1", "missing_hero", "hero_rookie_knight_1"],
      maxSize: Number.POSITIVE_INFINITY,
      mode: "bad_mode",
      selectedTargetFloor: -20,
      selectedMaterialId: 123,
      retreatHpPercent: 999,
      isUnlocked: true
    }
  ];
  raw.towerRuns = [
    {
      partyId: "missing_party",
      status: "bad_status",
      floor: -10,
      nodeIndex: -2,
      nodeProgress: 99,
      enemies: [{ enemyId: "cave_slime", currentHp: Number.POSITIVE_INFINITY, status: "bad_enemy_status" }],
      heroCombatCooldowns: { hero_rookie_knight_1: -5, invalid: Number.POSITIVE_INFINITY },
      enemyCombatCooldowns: { enemy_1: 2 },
      lastCombatEventMessage: 42,
      combatStartedAt: Number.POSITIVE_INFINITY,
      lootBag: [{ lootId: "coins_small", quantity: 2 }, { lootId: "bad", quantity: -3 }],
      lastFailureReason: 42,
      startedAt: Number.POSITIVE_INFINITY
    }
  ];
  raw.inventory = {
    itemStacks: [{ lootId: "coins_small", quantity: 3 }, { lootId: "bad", quantity: Number.POSITIVE_INFINITY }]
  };
  raw.recentEvents = Array.from({ length: 30 }, (_, index) => ({
    id: "",
    type: "bad_event",
    createdAt: Number.POSITIVE_INFINITY,
    message: index === 0 ? "bad" : 123,
    severity: "bad_severity",
    floor: -1
  }));

  const normalized = normalizeLoadedGameState(raw);

  expect(normalized).not.toBeNull();
  expect(normalized?.currencies.coins).toBe(0);
  expect(normalized?.selectedPartyId).toBe("party_lantern");
  expect(normalized?.parties[0]?.heroIds).toEqual(["hero_rookie_knight_1", "hero_apprentice_archer_1"]);
  expect(normalized?.parties[0]?.selectedTargetFloor).toBe(1);
  expect(normalized?.parties[0]?.retreatHpPercent).toBe(100);
  expect(normalized?.towerRuns[0]?.status).toBe("preparing");
  expect(normalized?.towerRuns[0]?.floor).toBe(1);
  expect(normalized?.towerRuns[0]?.nodeProgress).toBe(1);
  expect(normalized?.towerRuns[0]?.enemies[0]?.currentHp).toBeNull();
  expect(normalized?.towerRuns[0]?.heroCombatCooldowns.hero_rookie_knight_1).toBe(0);
  expect(normalized?.towerRuns[0]?.heroCombatCooldowns.invalid).toBeUndefined();
  expect(normalized?.towerRuns[0]?.lootBag).toEqual([{ lootId: "coins_small", quantity: 2 }]);
  expect(normalized?.inventory.itemStacks).toEqual([{ lootId: "coins_small", quantity: 3 }]);
  expect(normalized?.recentEvents).toHaveLength(20);
  expect(normalized?.recentEvents[0]?.type).toBe("save_loaded");
});

test("command pipeline cannot bypass strict dispatch readiness", () => {
  const lowHpState = {
    ...createInitialGameState(),
    heroes: createInitialGameState().heroes.map((hero) => ({
      ...hero,
      currentHp: 40,
      status: "ready" as const
    }))
  };
  const attemptedState = runGameCommand(lowHpState, {
    type: "inn/send_selected_party",
    now: 3000
  });

  expect(attemptedState.towerRuns[0]?.status).toBe("preparing");
  expect(attemptedState.recentEvents[0]?.type).toBe("party_dispatch_blocked");
});

test("backend command, view-model, and system files stay scene and Phaser free", () => {
  for (const filePath of [
    ...collectTsFiles("src/application"),
    ...collectTsFiles("src/viewModels"),
    ...collectTsFiles("src/systems")
  ]) {
    const source = readFileSync(filePath, "utf8");
    expect(source, filePath).not.toContain("from \"phaser\"");
    expect(source, filePath).not.toContain("from 'phaser'");
    expect(source, filePath).not.toContain("../scenes");
  }
});

function unlockTrainingRoom(state: GameState, level: number): GameState {
  return {
    ...state,
    innRooms: state.innRooms.map((room) =>
      room.roomId === "training_room"
        ? {
            ...room,
            level,
            isUnlocked: true,
            jobs: []
          }
        : room
    )
  };
}

function collectTsFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return collectTsFiles(fullPath);
    }

    return fullPath.endsWith(".ts") ? [fullPath] : [];
  });
}
