import Phaser from "phaser";
import { enemyDefinitions } from "../data/enemyData";
import { heroDefinitions } from "../data/heroData";
import { prototypeTowerFloors } from "../data/towerData";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { getHeroesForParty, getSelectedParty, getSelectedTowerRun } from "../state/gameSelectors";
import { getGameState, updateGameState } from "../state/gameStore";
import { tickGameState } from "../systems/gameTickSystem";
import { canCompleteSelectedFloor, completeSelectedFloor } from "../systems/floorClearSystem";
import {
  canContinueTowerRun,
  continueSelectedTowerRun,
  ENCOUNTER_CLEAR_HOLD_REASON,
  FLOOR_CLEAR_HOLD_REASON,
  TREASURE_HOLD_REASON
} from "../systems/towerNodeActionSystem";
import type { HeroInstance } from "../types/heroTypes";
import type { HeroStatus } from "../types/ids";
import type { TowerNodeDefinition, TowerRunEnemyState, TowerRunState } from "../types/towerTypes";
import {
  addCenteredLabel,
  addLabel,
  drawActionButton,
  drawDivider,
  drawHpBar,
  drawPanel,
  drawProgressBar,
  drawStatusBadge,
  drawTinyEnemy,
  drawTinyHero,
  formatStatusLabel
} from "../ui/components";
import { createSceneHud } from "../ui/sceneHud";
import { UI_COLORS, UI_HEX } from "../ui/theme";

export class TowerScene extends Phaser.Scene {
  private renderKey = "";
  private lastRestartAt = 0;

  public constructor() {
    super("TowerScene");
  }

  public create(): void {
    const state = getGameState();
    const party = getSelectedParty(state);
    const run = getSelectedTowerRun(state);
    const heroes = party ? getHeroesForParty(state, party.id) : [];
    const node = run ? getCurrentNode(run) : null;

    this.renderKey = getTowerRenderKey(run, heroes);
    this.drawBackdrop(run);
    this.drawRunHeader(party?.name ?? "No Party", run, node);
    this.drawNodeTrack(run);
    this.drawTowerScene(party?.name ?? "Party", run, node, heroes);
    this.drawActionArea(state, run);

    createSceneHud(this, { title: "Tower Run", activeLabel: "Tower" });
  }

  public update(_time: number, delta: number): void {
    const now = Date.now();
    const state = updateGameState((currentState) => tickGameState(currentState, delta, now));
    const nextRun = getSelectedTowerRun(state);
    const nextParty = getSelectedParty(state);
    const nextHeroes = nextParty ? getHeroesForParty(state, nextParty.id) : [];
    const nextKey = getTowerRenderKey(nextRun, nextHeroes);

    if (nextKey !== this.renderKey && now - this.lastRestartAt > 80) {
      this.lastRestartAt = now;
      this.scene.restart();
    }
  }

  private drawBackdrop(run: TowerRunState | null): void {
    const status = run?.status ?? "preparing";
    const base = status === "fighting" ? 0x121827 : status === "wiped" ? 0x24131a : UI_COLORS.towerBlue;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, base).setOrigin(0, 0);
    this.add.rectangle(0, 104, GAME_WIDTH, 658, 0x111827, 1).setOrigin(0, 0);

    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        const x = col * 88 - (row % 2) * 28;
        const y = 118 + row * 68;
        this.add.rectangle(x, y, 82, 64, row % 2 === 0 ? 0x1a2535 : 0x172030, 0.38).setOrigin(0, 0);
      }
    }

    this.add.polygon(52, 640, [0, -20, 86, -260, 172, -20], 0x0f1218, 0.44);
    this.add.polygon(338, 640, [0, -20, -86, -260, -172, -20], 0x0f1218, 0.44);
    this.add.rectangle(0, 680, GAME_WIDTH, 82, 0x0f1218, 0.72).setOrigin(0, 0);
  }

  private drawRunHeader(partyName: string, run: TowerRunState | null, node: TowerNodeDefinition | null): void {
    drawPanel(this, 28, 118, 334, 62, 0x1d2a3f, UI_COLORS.towerStone, 0.94, 7);
    addLabel(this, 44, 130, partyName, {
      color: UI_HEX.cream,
      fontSize: 15,
      fontStyle: "700",
      width: 150
    });
    addLabel(this, 44, 152, `Floor ${run?.floor ?? 1} / Node ${(run?.nodeIndex ?? 0) + 1}`, {
      color: UI_HEX.skyBlue,
      fontSize: 12,
      fontStyle: "700"
    });

    drawStatusBadge(this, 204, 130, formatTowerStatus(run, node), statusColor(run));
  }

  private drawNodeTrack(run: TowerRunState | null): void {
    const floor = run ? prototypeTowerFloors.find((candidate) => candidate.floor === run.floor) : null;
    const nodes = floor?.nodes ?? [];
    const startX = 64;
    const y = 214;

    drawDivider(this, startX, y, GAME_WIDTH - 64, y, UI_COLORS.towerStone, 0.8);
    nodes.forEach((node, index) => {
      const x = nodes.length <= 1 ? GAME_WIDTH / 2 : startX + (index * (GAME_WIDTH - 128)) / (nodes.length - 1);
      const isCurrent = Boolean(run && index === run.nodeIndex);
      const isPast = Boolean(run && index < run.nodeIndex);
      const fill = isCurrent ? UI_COLORS.gold : isPast ? UI_COLORS.success : 0x334155;
      this.add.circle(x, y, isCurrent ? 13 : 10, fill, 1).setStrokeStyle(2, isCurrent ? UI_COLORS.parchment : UI_COLORS.towerStone);
      addCenteredLabel(this, x, y + 26, node.type, {
        color: isCurrent ? UI_HEX.gold : UI_HEX.mutedCream,
        fontSize: 10,
        fontStyle: isCurrent ? "700" : "500",
        width: 66
      });
    });

    if (run) {
      drawProgressBar(this, 76, 246, GAME_WIDTH - 152, run.nodeProgress, "node");
    }
  }

  private drawTowerScene(
    partyName: string,
    run: TowerRunState | null,
    node: TowerNodeDefinition | null,
    heroes: HeroInstance[]
  ): void {
    const status = run?.status ?? "preparing";
    const hero = heroes[0] ?? null;

    drawPanel(this, 30, 294, 330, 328, 0x172235, UI_COLORS.towerStone, 0.92, 7);
    this.add.rectangle(50, 564, 290, 28, 0x283247, 1).setOrigin(0, 0).setStrokeStyle(1, 0x53657e);
    this.add.rectangle(60, 548, 270, 16, 0x1b2434, 1).setOrigin(0, 0).setStrokeStyle(1, 0x53657e);
    this.drawTorches(status);

    if (!run || status === "preparing") {
      this.drawPreparingScene(hero);
    } else if (status === "traveling") {
      this.drawTravelingScene(partyName, run, hero);
    } else if (status === "exploring") {
      this.drawExploringScene(run, node, hero);
    } else if (status === "fighting") {
      this.drawCombatScene(run, hero);
    } else if (status === "blocked" && run.lastFailureReason === ENCOUNTER_CLEAR_HOLD_REASON) {
      this.drawClearedScene(run, hero);
    } else if (status === "blocked" && run.lastFailureReason === FLOOR_CLEAR_HOLD_REASON) {
      this.drawExitScene(run, hero);
    } else if (status === "looting") {
      this.drawTreasureScene(run, hero);
    } else if (status === "wiped") {
      this.drawWipedScene(run, hero);
    } else {
      this.drawBlockedScene(run, hero);
    }

    this.drawEventLine(getTowerMessage(partyName, run, node));
  }

  private drawTorches(status: string): void {
    const flame = status === "wiped" ? UI_COLORS.danger : status === "fighting" ? UI_COLORS.gold : UI_COLORS.amber;
    for (const x of [68, 322]) {
      this.add.rectangle(x - 3, 340, 6, 42, 0x5b3525, 1).setOrigin(0, 0);
      this.add.circle(x, 334, 12, flame, 0.55);
      this.add.circle(x, 334, 6, UI_COLORS.gold, 0.9);
    }
  }

  private drawPreparingScene(hero: HeroInstance | null): void {
    this.add.rectangle(150, 394, 90, 126, 0x171413, 1).setStrokeStyle(2, UI_COLORS.skyBlue);
    this.add.circle(195, 394, 45, 0x171413, 1).setStrokeStyle(2, UI_COLORS.skyBlue);
    addCenteredLabel(this, 195, 470, "The party is still at the inn.", {
      color: UI_HEX.mutedCream,
      fontSize: 13,
      width: 220
    });

    if (hero) {
      this.drawHeroUnit(hero, 114, 520, "waiting");
    }
  }

  private drawTravelingScene(partyName: string, run: TowerRunState, hero: HeroInstance | null): void {
    const travelX = 95 + run.nodeProgress * 175;
    this.add.line(0, 492, 80, 0, 292, 0, UI_COLORS.skyBlue, 0.55).setOrigin(0, 0);
    this.add.polygon(306, 454, [0, -48, 44, 56, -44, 56], 0x0f1218, 1).setStrokeStyle(2, UI_COLORS.towerStone);
    addCenteredLabel(this, 195, 326, `${partyName} approaches the tower`, {
      color: UI_HEX.skyBlue,
      fontSize: 13,
      fontStyle: "700",
      width: 250
    });

    if (hero) {
      this.drawHeroUnit(hero, travelX, 492, "traveling");
    }
  }

  private drawExploringScene(run: TowerRunState, node: TowerNodeDefinition | null, hero: HeroInstance | null): void {
    const exploreX = 92 + run.nodeProgress * 150;
    this.add.rectangle(84, 378, 220, 108, 0x0f1218, 1).setStrokeStyle(2, UI_COLORS.towerStone);
    this.add.rectangle(114, 404, 42, 62, 0x172235, 1).setStrokeStyle(1, 0x53657e);
    this.add.rectangle(206, 404, 42, 62, 0x172235, 1).setStrokeStyle(1, 0x53657e);
    addCenteredLabel(this, 195, 326, `Searching for ${node?.type ?? "the next room"}`, {
      color: UI_HEX.skyBlue,
      fontSize: 13,
      fontStyle: "700",
      width: 250
    });

    if (hero) {
      this.drawHeroUnit(hero, exploreX, 512, "exploring");
    }
  }

  private drawCombatScene(run: TowerRunState, hero: HeroInstance | null): void {
    addCenteredLabel(this, 195, 326, "Encounter", {
      color: UI_HEX.gold,
      fontSize: 14,
      fontStyle: "700"
    });

    if (hero) {
      this.drawHeroUnit(hero, 116, 492, "in tower");
    }

    this.drawEnemies(run.enemies, 278, 478);
    this.add.line(0, 510, 174, 0, 216, 0, UI_COLORS.danger, 0.45).setOrigin(0, 0);
    this.add.line(0, 502, 174, 0, 216, 0, UI_COLORS.gold, 0.35).setOrigin(0, 0);
  }

  private drawClearedScene(run: TowerRunState, hero: HeroInstance | null): void {
    addCenteredLabel(this, 195, 326, "Encounter Cleared", {
      color: UI_HEX.success,
      fontSize: 14,
      fontStyle: "700"
    });

    if (hero) {
      this.drawHeroUnit(hero, 118, 492, "ready to continue");
    }

    this.drawEnemies(run.enemies, 278, 486, true);
    this.add.rectangle(188, 380, 38, 108, 0x111827, 1).setStrokeStyle(2, UI_COLORS.success);
    this.add.circle(207, 380, 19, 0x111827, 1).setStrokeStyle(2, UI_COLORS.success);
    addCenteredLabel(this, 195, 552, "next passage open", {
      color: UI_HEX.success,
      fontSize: 12,
      fontStyle: "700"
    });
  }

  private drawExitScene(run: TowerRunState, hero: HeroInstance | null): void {
    addCenteredLabel(this, 195, 326, "Exit Reached", {
      color: UI_HEX.gold,
      fontSize: 14,
      fontStyle: "700"
    });
    this.add.circle(244, 440, 52, UI_COLORS.gold, 0.22);
    this.add.rectangle(214, 390, 60, 116, 0x151922, 1).setStrokeStyle(3, UI_COLORS.gold);
    this.add.circle(244, 390, 30, 0x151922, 1).setStrokeStyle(3, UI_COLORS.gold);
    addCenteredLabel(this, 244, 528, `Floor ${run.floor} clear`, {
      color: UI_HEX.gold,
      fontSize: 12,
      fontStyle: "700"
    });

    if (hero) {
      this.drawHeroUnit(hero, 118, 500, "at exit");
    }
  }

  private drawTreasureScene(run: TowerRunState, hero: HeroInstance | null): void {
    addCenteredLabel(this, 195, 326, "Treasure Room", {
      color: UI_HEX.gold,
      fontSize: 14,
      fontStyle: "700"
    });
    this.add.rectangle(224, 458, 78, 54, 0x7a432d, 1).setStrokeStyle(2, UI_COLORS.gold);
    this.add.rectangle(214, 440, 98, 24, UI_COLORS.amber, 1).setStrokeStyle(2, UI_COLORS.gold);
    addCenteredLabel(this, 263, 528, run.lastFailureReason === TREASURE_HOLD_REASON ? "continue when ready" : "found", {
      color: UI_HEX.gold,
      fontSize: 12,
      width: 120
    });

    if (hero) {
      this.drawHeroUnit(hero, 118, 500, "looting");
    }
  }

  private drawWipedScene(run: TowerRunState, hero: HeroInstance | null): void {
    this.add.rectangle(30, 294, 330, 328, 0x4d1824, 0.38).setOrigin(0, 0);
    addCenteredLabel(this, 195, 326, "Party Wiped", {
      color: UI_HEX.danger,
      fontSize: 14,
      fontStyle: "700"
    });

    if (hero) {
      this.drawHeroUnit(hero, 116, 500, "defeated", true);
    }

    this.drawEnemies(run.enemies, 278, 486);
  }

  private drawBlockedScene(run: TowerRunState, hero: HeroInstance | null): void {
    addCenteredLabel(this, 195, 326, "Run Paused", {
      color: UI_HEX.gold,
      fontSize: 14,
      fontStyle: "700"
    });

    if (hero) {
      this.drawHeroUnit(hero, 118, 500, "waiting");
    }

    addCenteredLabel(this, 244, 440, run.lastFailureReason ?? "The party is waiting.", {
      color: UI_HEX.mutedCream,
      fontSize: 12,
      width: 154
    });
  }

  private drawHeroUnit(hero: HeroInstance, x: number, y: number, status: string, forceDefeated = false): void {
    const maxHp = heroDefinitions[hero.classId]?.baseStats.hp ?? Math.max(1, hero.currentHp);
    const hpRatio = Phaser.Math.Clamp(hero.currentHp / Math.max(1, maxHp), 0, 1);
    drawTinyHero(this, x, y, {
      facing: "right",
      palette: forceDefeated || hero.status === "defeated" ? "defeated" : "hero"
    });
    drawHpBar(this, x - 46, y - 78, 92, 8, hpRatio, `${hero.name} HP ${hero.currentHp}/${maxHp}`, UI_COLORS.success);
    addCenteredLabel(this, x, y + 42, status, {
      color: UI_HEX.mutedCream,
      fontSize: 10,
      width: 86
    });
  }

  private drawEnemies(enemies: TowerRunEnemyState[], x: number, y: number, forceDefeated = false): void {
    if (enemies.length === 0) {
      addCenteredLabel(this, x, y - 20, "No enemy in sight", {
        color: UI_HEX.mutedCream,
        fontSize: 12,
        width: 120
      });
      return;
    }

    enemies.slice(0, 2).forEach((enemy, index) => {
      const enemyDefinition = enemyDefinitions[enemy.enemyId];
      const enemyY = y + index * 74;
      const maxHp = enemyDefinition?.baseStats.hp ?? Math.max(1, enemy.currentHp ?? 1);
      const currentHp = enemy.currentHp ?? maxHp;
      const hpRatio = Phaser.Math.Clamp(currentHp / Math.max(1, maxHp), 0, 1);
      const defeated = forceDefeated || enemy.status === "defeated" || currentHp <= 0;

      drawTinyEnemy(this, x, enemyY, {
        name: enemyDefinition?.name ?? enemy.enemyId,
        palette: defeated ? "defeated" : "enemy"
      });
      drawHpBar(
        this,
        x - 48,
        enemyY - 76,
        96,
        8,
        hpRatio,
        `${enemyDefinition?.name ?? "Enemy"} HP ${currentHp}/${maxHp}`,
        UI_COLORS.danger
      );
    });
  }

  private drawEventLine(message: string): void {
    drawPanel(this, 44, 632, 302, 50, 0x101722, UI_COLORS.towerStone, 0.98, 7);
    addLabel(this, 58, 644, message, {
      color: UI_HEX.cream,
      fontSize: 12,
      width: 274
    });
  }

  private drawActionArea(state: ReturnType<typeof getGameState>, run: TowerRunState | null): void {
    if (canCompleteSelectedFloor(state)) {
      drawActionButton(this, {
        x: GAME_WIDTH / 2,
        y: 714,
        width: 174,
        height: 50,
        label: "Complete Floor",
        enabled: true,
        fill: UI_COLORS.gold,
        stroke: UI_COLORS.parchment,
        onClick: () => {
          updateGameState(completeSelectedFloor);
          this.scene.start("InnScene");
        }
      });
      return;
    }

    if (canContinueTowerRun(run)) {
      drawActionButton(this, {
        x: GAME_WIDTH / 2,
        y: 714,
        width: 174,
        height: 50,
        label: "Continue Run",
        enabled: true,
        fill: UI_COLORS.skyBlue,
        stroke: 0xd7e8ff,
        onClick: () => {
          updateGameState(continueSelectedTowerRun);
          this.scene.restart();
        }
      });
      return;
    }

    addCenteredLabel(this, GAME_WIDTH / 2, 714, getPassiveActionHint(run), {
      color: UI_HEX.mutedCream,
      fontSize: 12,
      width: 210
    });
  }
}

function getCurrentNode(run: TowerRunState): TowerNodeDefinition | null {
  return prototypeTowerFloors.find((floor) => floor.floor === run.floor)?.nodes[run.nodeIndex] ?? null;
}

function getTowerMessage(partyName: string, run: TowerRunState | null, node: TowerNodeDefinition | null): string {
  if (!run || run.status === "preparing") {
    return "Party is preparing at the inn.";
  }

  if (run.status === "traveling") {
    return `${partyName} is traveling to Floor ${run.floor}.`;
  }

  if (run.status === "exploring") {
    return `Exploring toward ${node?.type ?? "the next node"}.`;
  }

  if (run.status === "fighting") {
    return run.lastCombatEventMessage ?? "Combat running.";
  }

  if (run.status === "looting") {
    return "Treasure found. Continue when ready.";
  }

  if (run.status === "blocked") {
    if (run.lastFailureReason === ENCOUNTER_CLEAR_HOLD_REASON) {
      return "Encounter cleared. Continue to the next node.";
    }

    if (run.lastFailureReason === FLOOR_CLEAR_HOLD_REASON) {
      return "Exit reached. Complete Floor to return to the inn.";
    }

    return run.lastFailureReason ?? "Run is paused.";
  }

  if (run.status === "wiped") {
    return "Party wiped. Return/revive is not implemented yet.";
  }

  return `${partyName} status: ${formatStatusLabel(run.status)}.`;
}

function formatTowerStatus(run: TowerRunState | null, node: TowerNodeDefinition | null): string {
  if (!run) {
    return "No Run";
  }

  if (run.status === "blocked" && run.lastFailureReason === ENCOUNTER_CLEAR_HOLD_REASON) {
    return "Cleared";
  }

  if (run.status === "blocked" && run.lastFailureReason === FLOOR_CLEAR_HOLD_REASON) {
    return "Exit";
  }

  if (run.status === "exploring" && node) {
    return formatStatusLabel(node.type);
  }

  return formatStatusLabel(run.status);
}

function statusColor(run: TowerRunState | null): number {
  if (!run) {
    return 0x334155;
  }

  if (run.status === "fighting" || run.status === "wiped") {
    return 0x5c2530;
  }

  if (run.status === "blocked") {
    return run.lastFailureReason === FLOOR_CLEAR_HOLD_REASON ? 0x6b4724 : 0x275241;
  }

  if (run.status === "traveling" || run.status === "exploring") {
    return 0x1f4662;
  }

  return 0x334155;
}

function getPassiveActionHint(run: TowerRunState | null): string {
  if (!run || run.status === "preparing") {
    return "Send from Inn";
  }

  if (run.status === "traveling" || run.status === "exploring" || run.status === "fighting") {
    return "watching run";
  }

  if (run.status === "wiped") {
    return "party defeated";
  }

  return "waiting";
}

function getTowerRenderKey(run: TowerRunState | null, heroes: Array<{ id: string; currentHp: number; status: string }>): string {
  if (!run) {
    return "none";
  }

  const progressBucket = Math.floor(run.nodeProgress * 8);
  const heroesKey = heroes.map((hero) => `${hero.id}:${hero.currentHp}:${hero.status}`).join(",");
  const enemiesKey = run.enemies
    .map((enemy) => `${enemy.enemyId}:${enemy.currentHp}:${enemy.status}`)
    .join(",");

  return `${run.status}|${run.floor}|${run.nodeIndex}|${progressBucket}|${heroesKey}|${enemiesKey}|${run.lastCombatEventMessage}|${run.lastFailureReason}`;
}

function formatStatus(status: string | HeroStatus): string {
  return formatStatusLabel(status);
}
