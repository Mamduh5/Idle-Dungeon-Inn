import { automationDefinitions } from "../data/automationData";
import { heroDefinitions } from "../data/heroData";
import { roomDefinitions } from "../data/roomData";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { PartyState } from "../types/partyTypes";
import type { TowerRunState } from "../types/towerTypes";

const STARTER_HERO_ID = "hero_rookie_knight_1";
const STARTER_PARTY_ID = "party_lantern";

export function createInitialGameState(): GameState {
  const now = Date.now();
  const rookieKnight = heroDefinitions.rookie_knight;

  const starterHero: HeroInstance = {
    id: STARTER_HERO_ID,
    classId: rookieKnight.classId,
    name: "Mira",
    level: 1,
    xp: 0,
    currentHp: rookieKnight.baseStats.hp,
    status: "ready",
    assignedPartyId: STARTER_PARTY_ID,
    highestFloorCleared: 0,
    defeats: 0,
    traits: [],
    gear: {},
    training: {
      attackTrainingXp: 0,
      attackTrainingLevel: 0,
      totalTrainingSeconds: 0
    }
  };

  const starterParty: PartyState = {
    id: STARTER_PARTY_ID,
    name: "Lantern Party",
    heroIds: [STARTER_HERO_ID],
    maxSize: 3,
    mode: "push",
    selectedTargetFloor: 1,
    selectedMaterialId: null,
    retreatHpPercent: 30,
    isUnlocked: true
  };

  const starterTowerRun: TowerRunState = {
    partyId: STARTER_PARTY_ID,
    status: "preparing",
    floor: 1,
    nodeIndex: 0,
    nodeProgress: 0,
    enemies: [],
    heroCombatCooldowns: {},
    enemyCombatCooldowns: {},
    lastCombatEventMessage: null,
    combatStartedAt: null,
    lootBag: [],
    lastFailureReason: null,
    startedAt: now
  };

  return {
    version: 1,
    currencies: {
      coins: 0
    },
    heroes: [starterHero],
    parties: [starterParty],
    selectedPartyId: STARTER_PARTY_ID,
    towerRuns: [starterTowerRun],
    innRooms: [
      {
        roomId: roomDefinitions.bed_room.roomId,
        level: 1,
        isUnlocked: true,
        activeJob: null,
        jobs: []
      },
      {
        roomId: roomDefinitions.training_room.roomId,
        level: 0,
        isUnlocked: false,
        activeJob: null,
        jobs: []
      }
    ],
    automation: {
      autoDispatchLevel: 0,
      lastAutoDispatchAt: null,
      autoLootLevel: 0,
      autoHealLevel: 0,
      autoRepairLevel: 0,
      autoSkillLevel: 0,
      autoRetryLevel: 0,
      enabled: {
        [automationDefinitions.auto_dispatch_board.automationId]: false
      }
    },
    unlockedFloor: 1,
    highestFloorCleared: 0,
    firstClearFloorIds: [],
    inventory: {
      itemStacks: []
    },
    recentEvents: [
      {
        id: "event_welcome",
        type: "save_loaded",
        createdAt: now,
        message: "The inn is open.",
        severity: "info"
      }
    ],
    lastActiveAt: now
  };
};

export const initialGameState: GameState = createInitialGameState();
