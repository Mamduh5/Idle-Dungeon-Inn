import { enemyDefinitions } from "../data/enemyData";
import { heroDefinitions } from "../data/heroData";
import { appendRecentEvent } from "../state/recentEvents";
import { createHeroCombatStats } from "./combatStatSystem";
import {
  createCheckpointBossFailureEventMessage,
  createCheckpointBossFailureReason,
  isCheckpointBossNode
} from "./bottleneckHintSystem";
import { ENCOUNTER_CLEAR_HOLD_REASON } from "./towerNodeActionSystem";
import type { CombatStats } from "../types/combatTypes";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { PartyId } from "../types/ids";
import type { PartyState } from "../types/partyTypes";
import type { RecentEvent } from "../types/recentEventTypes";
import type { TowerRunEnemyState, TowerRunState } from "../types/towerTypes";

export function tickCombat(state: GameState, deltaMs: number, now: number): GameState {
  if (deltaMs <= 0) {
    return state;
  }

  let heroes = state.heroes;
  let recentEvents = state.recentEvents;
  let changed = false;

  const towerRuns = state.towerRuns.map((run) => {
    if (run.status !== "fighting") {
      return run;
    }

    const party = state.parties.find((candidate) => candidate.id === run.partyId);
    const result = tickCombatRun(state, run, party, heroes, deltaMs, now);

    if (result.run !== run) {
      changed = true;
    }

    if (result.heroes !== heroes) {
      changed = true;
      heroes = result.heroes;
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
    heroes,
    towerRuns,
    recentEvents,
    lastActiveAt: now
  };
}

function tickCombatRun(
  state: GameState,
  run: TowerRunState,
  party: PartyState | undefined,
  allHeroes: HeroInstance[],
  deltaMs: number,
  now: number
): { run: TowerRunState; heroes: HeroInstance[]; event: RecentEvent | null } {
  if (!party) {
    return { run, heroes: allHeroes, event: null };
  }

  let heroes = allHeroes;
  let enemies = normalizeEnemies(run.enemies);
  let heroCombatCooldowns = { ...run.heroCombatCooldowns };
  let enemyCombatCooldowns = { ...run.enemyCombatCooldowns };
  let lastCombatEventMessage = run.lastCombatEventMessage;

  if (run.combatStartedAt === null) {
    return {
      run: {
        ...run,
        enemies,
        heroCombatCooldowns,
        enemyCombatCooldowns,
        lastCombatEventMessage: "Combat running...",
        combatStartedAt: now
      },
      heroes,
      event: null
    };
  }

  const partyHeroIds = new Set(party.heroIds);
  const partyHeroes = heroes.filter((hero) => partyHeroIds.has(hero.id));

  for (const hero of partyHeroes) {
    if (!isHeroAlive(hero)) {
      continue;
    }

    const heroStats = createHeroCombatStats(state, hero);
    const targetIndex = enemies.findIndex(isEnemyAlive);

    if (!heroStats || targetIndex < 0) {
      continue;
    }

    const attackIntervalMs = getAttackIntervalMs(heroStats.attackSpeed);
    let cooldown = (heroCombatCooldowns[hero.id] ?? 0) + deltaMs;

    while (cooldown >= attackIntervalMs && isEnemyAlive(enemies[targetIndex])) {
      cooldown -= attackIntervalMs;
      const target = enemies[targetIndex];
      const enemyStats = enemyDefinitions[target.enemyId]?.baseStats;

      if (!enemyStats) {
        break;
      }

      const damage = calculateDamage(heroStats, enemyStats);
      const nextHp = Math.max(0, (target.currentHp ?? enemyStats.hp) - damage);
      enemies[targetIndex] = {
        ...target,
        currentHp: nextHp,
        status: nextHp <= 0 ? "defeated" : "active"
      };
      lastCombatEventMessage = `${hero.name} hit ${enemyDefinitions[target.enemyId]?.name ?? target.enemyId} for ${damage}.`;
    }

    heroCombatCooldowns[hero.id] = cooldown;
  }

  if (!enemies.some(isEnemyAlive)) {
    return {
      run: {
        ...run,
        status: "blocked",
        enemies,
        heroCombatCooldowns,
        enemyCombatCooldowns,
        lastCombatEventMessage: "Encounter cleared. Rewards are not implemented yet.",
        lastFailureReason: ENCOUNTER_CLEAR_HOLD_REASON
      },
      heroes,
      event: createEvent(
        now,
        "tower_encounter_cleared",
        `${party.name} defeated the encounter. Rewards are not implemented yet.`,
        "success",
        party.id,
        run.floor
      )
    };
  }

  for (const enemy of enemies) {
    if (!isEnemyAlive(enemy)) {
      continue;
    }

    const enemyStats = enemyDefinitions[enemy.enemyId]?.baseStats;
    const targetHero = heroes.find((hero) => partyHeroIds.has(hero.id) && isHeroAlive(hero));

    if (!enemyStats || !targetHero) {
      continue;
    }

    const enemyKey = getEnemyRuntimeKey(enemy, enemies);
    const attackIntervalMs = getAttackIntervalMs(enemyStats.attackSpeed);
    let cooldown = (enemyCombatCooldowns[enemyKey] ?? 0) + deltaMs;

    while (cooldown >= attackIntervalMs && isHeroAliveById(heroes, targetHero.id)) {
      cooldown -= attackIntervalMs;
      const currentTarget = heroes.find((hero) => hero.id === targetHero.id);
      const targetStats = currentTarget ? heroDefinitions[currentTarget.classId]?.baseStats : null;

      if (!currentTarget || !targetStats) {
        break;
      }

      const damage = calculateDamage(enemyStats, targetStats);
      const nextHp = Math.max(0, currentTarget.currentHp - damage);
      heroes = heroes.map((hero) =>
        hero.id === currentTarget.id
          ? {
              ...hero,
              currentHp: nextHp,
              status: nextHp <= 0 ? "defeated" : hero.status
            }
          : hero
      );
      lastCombatEventMessage = `${enemyDefinitions[enemy.enemyId]?.name ?? enemy.enemyId} hit ${currentTarget.name} for ${damage}.`;
    }

    enemyCombatCooldowns[enemyKey] = cooldown;
  }

  if (!heroes.some((hero) => partyHeroIds.has(hero.id) && isHeroAlive(hero))) {
    const failedRun = {
      ...run,
      enemies,
      heroCombatCooldowns,
      enemyCombatCooldowns
    };
    const checkpointBossWipe = isCheckpointBossNode(failedRun);
    const lastFailureReason = checkpointBossWipe ? createCheckpointBossFailureReason(failedRun) : "Party wiped.";
    const lastCombatMessage = checkpointBossWipe
      ? `Floor ${failedRun.floor} checkpoint failed. Return to the inn, recover, then improve Bed Room or Training Room.`
      : "Party wiped. Return/revive is not implemented yet.";
    const eventMessage = checkpointBossWipe
      ? createCheckpointBossFailureEventMessage(failedRun)
      : `${party.name} was wiped on Floor ${run.floor}.`;

    return {
      run: {
        ...failedRun,
        status: "wiped",
        lastCombatEventMessage: lastCombatMessage,
        lastFailureReason
      },
      heroes: heroes.map((hero) =>
        partyHeroIds.has(hero.id)
          ? {
              ...hero,
              currentHp: 0,
              status: "defeated"
            }
          : hero
      ),
      event: createEvent(now, "party_wiped", eventMessage, "danger", party.id, run.floor)
    };
  }

  return {
    run: {
      ...run,
      enemies,
      heroCombatCooldowns,
      enemyCombatCooldowns,
      lastCombatEventMessage
    },
    heroes,
    event: null
  };
}

function normalizeEnemies(enemies: TowerRunEnemyState[]): TowerRunEnemyState[] {
  return enemies.map((enemy) => {
    const maxHp = enemyDefinitions[enemy.enemyId]?.baseStats.hp ?? null;
    const currentHp = enemy.currentHp ?? maxHp;

    return {
      ...enemy,
      currentHp,
      status: currentHp !== null && currentHp <= 0 ? "defeated" : enemy.status
    };
  });
}

function isHeroAlive(hero: HeroInstance): boolean {
  return hero.currentHp > 0 && hero.status !== "defeated";
}

function isHeroAliveById(heroes: HeroInstance[], heroId: string): boolean {
  const hero = heroes.find((candidate) => candidate.id === heroId);
  return Boolean(hero && isHeroAlive(hero));
}

function isEnemyAlive(enemy: TowerRunEnemyState): boolean {
  return enemy.status === "active" && (enemy.currentHp ?? 0) > 0;
}

function getAttackIntervalMs(attackSpeed: number): number {
  return 1000 / Math.max(0.1, attackSpeed);
}

function calculateDamage(attacker: CombatStats, defender: CombatStats): number {
  return Math.max(1, Math.floor(attacker.attack - defender.defense * 0.5));
}

function getEnemyRuntimeKey(enemy: TowerRunEnemyState, enemies: TowerRunEnemyState[]): string {
  const matchingIndex = enemies.filter((candidate) => candidate.enemyId === enemy.enemyId).indexOf(enemy);
  return `${enemy.enemyId}_${Math.max(0, matchingIndex)}`;
}

function createEvent(
  createdAt: number,
  type: RecentEvent["type"],
  message: string,
  severity: RecentEvent["severity"],
  partyId: PartyId,
  floor: number
): RecentEvent {
  return {
    id: `event_${type}_${partyId}_${createdAt}`,
    type,
    createdAt,
    message,
    severity,
    partyId,
    floor
  };
}
