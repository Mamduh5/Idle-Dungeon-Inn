import Phaser from "phaser";
import {
  completeSelectedFloorFromTower,
  continueSelectedRunFromTower,
  recoverSelectedPartyFromTower
} from "../application/towerCommands";
import { enemyDefinitions } from "../data/enemyData";
import { prototypeTowerFloors } from "../data/towerData";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { getGameState, updateGameState } from "../state/gameStore";
import { isFloor10BossNode } from "../systems/bottleneckHintSystem";
import { tickGameState } from "../systems/gameTickSystem";
import {
  ENCOUNTER_CLEAR_HOLD_REASON,
  FLOOR_CLEAR_HOLD_REASON,
  TREASURE_HOLD_REASON
} from "../systems/towerNodeActionSystem";
import type { HeroInstance } from "../types/heroTypes";
import type { TowerNodeDefinition, TowerRunEnemyState, TowerRunState } from "../types/towerTypes";
import {
  addCenteredLabel,
  addLabel,
  drawActionButton,
  drawDivider,
  drawHpBar,
  drawPanel,
  drawStatusBadge,
  drawTinyEnemy,
  drawTinyHero
} from "../ui/components";
import { createSceneHud } from "../ui/sceneHud";
import { getHeroHpDisplayText } from "../ui/heroDisplayText";
import { UI_COLORS, UI_HEX } from "../ui/theme";
import { getTowerViewModel, type TowerViewModel } from "../viewModels/towerViewModel";

const TOWER_WORLD_WIDTH = 960;
const TOWER_MAX_SCROLL_X = TOWER_WORLD_WIDTH - GAME_WIDTH;

export class TowerScene extends Phaser.Scene {
  private renderKey = "";
  private lastRestartAt = 0;

  public constructor() {
    super("TowerScene");
  }

  public create(): void {
    const state = getGameState();
    const viewModel = getTowerViewModel(state);
    const run = viewModel.run;
    const heroes = viewModel.heroes;

    this.renderKey = getTowerRenderKey(run, heroes);
    this.configureCamera(run);
    this.drawDungeonWorld(run);
    this.drawTowerStage(viewModel);
    this.drawContextAction(viewModel);

    const fixedChildStart = this.children.list.length;
    this.drawCompactRunOverlay(viewModel);
    createSceneHud(this, { title: "Tower Run", activeLabel: "Tower" });
    this.fixChildrenAddedAfter(fixedChildStart);
  }

  public update(_time: number, delta: number): void {
    const now = Date.now();
    const state = updateGameState((currentState) => tickGameState(currentState, delta, now));
    const viewModel = getTowerViewModel(state);
    const nextKey = getTowerRenderKey(viewModel.run, viewModel.heroes);

    if (nextKey !== this.renderKey && now - this.lastRestartAt > 80) {
      this.lastRestartAt = now;
      this.scene.restart();
    }
  }

  private configureCamera(run: TowerRunState | null): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, TOWER_WORLD_WIDTH, GAME_HEIGHT);
    camera.setScroll(getTowerCameraScrollX(run), 0);
  }

  private drawDungeonWorld(run: TowerRunState | null): void {
    const status = run?.status ?? "preparing";
    const wallColor = status === "wiped" ? 0x25131a : status === "fighting" ? 0x111825 : 0x142033;

    this.add.rectangle(0, 0, TOWER_WORLD_WIDTH, GAME_HEIGHT, wallColor).setOrigin(0, 0);
    this.add.rectangle(0, 104, TOWER_WORLD_WIDTH, 164, 0x0c1421, 1).setOrigin(0, 0);
    this.add.rectangle(0, 268, TOWER_WORLD_WIDTH, 494, 0x111827, 1).setOrigin(0, 0);

    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 12; col += 1) {
        const x = col * 88 - (row % 2) * 32;
        const y = 130 + row * 64;
        this.add.rectangle(x, y, 82, 58, row % 2 === 0 ? 0x1a2535 : 0x172030, 0.38).setOrigin(0, 0);
      }
    }

    this.add.rectangle(46, 558, 864, 54, 0x283247, 1).setOrigin(0, 0).setStrokeStyle(2, 0x53657e);
    this.add.rectangle(86, 526, 788, 32, 0x1b2434, 1).setOrigin(0, 0).setStrokeStyle(1, 0x53657e);
    this.add.rectangle(0, 666, TOWER_WORLD_WIDTH, 96, 0x0b1018, 0.8).setOrigin(0, 0);

    for (const x of [94, 276, 456, 638, 820]) {
      this.add.rectangle(x, 250, 22, 318, 0x0d1320, 1).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
      this.add.rectangle(x - 12, 236, 46, 18, 0x1c2a3d, 1).setOrigin(0, 0).setStrokeStyle(1, 0x53657e);
    }

    this.drawWorldTorches(status);
    this.drawFarDoor(130, "Entry", UI_COLORS.towerStone);
    this.drawFarDoor(830, "Deep", UI_COLORS.towerStone);
  }

  private drawCompactRunOverlay(viewModel: TowerViewModel): void {
    const run = viewModel.run;
    drawPanel(this, 18, 112, 354, 88, 0x101722, UI_COLORS.towerStone, 0.96, 7);
    addLabel(this, 34, 124, viewModel.partyName, {
      color: UI_HEX.cream,
      fontSize: 13,
      fontStyle: "700",
      width: 136
    });
    addLabel(this, 34, 144, viewModel.floorNodeLabel, {
      color: UI_HEX.skyBlue,
      fontSize: 11,
      fontStyle: "700"
    });
    if (viewModel.checkpointLabel) {
      addLabel(this, 150, 144, viewModel.checkpointLabel, {
        color: UI_HEX.gold,
        fontSize: 11,
        fontStyle: "700",
        width: 100
      });
    }
    drawStatusBadge(this, 246, 123, viewModel.statusLabel, statusColor(run));
    this.drawCompactNodeTrack(run);
  }

  private drawCompactNodeTrack(run: TowerRunState | null): void {
    const floor = run ? prototypeTowerFloors.find((candidate) => candidate.floor === run.floor) : null;
    const nodes = floor?.nodes ?? [];
    const startX = 38;
    const endX = 352;
    const y = 178;

    drawDivider(this, startX, y, endX, y, UI_COLORS.towerStone, 0.75);
    nodes.forEach((node, index) => {
      const x = nodes.length <= 1 ? GAME_WIDTH / 2 : startX + (index * (endX - startX)) / (nodes.length - 1);
      const isCurrent = Boolean(run && index === run.nodeIndex);
      const isPast = Boolean(run && index < run.nodeIndex);
      const fill = isCurrent ? UI_COLORS.gold : isPast ? UI_COLORS.success : 0x334155;
      const label = node.type === "boss" ? "BOSS" : node.type;
      this.add.circle(x, y, isCurrent ? 9 : 7, fill, 1).setStrokeStyle(1, isCurrent ? UI_COLORS.parchment : UI_COLORS.towerStone);
      addCenteredLabel(this, x, y + 14, label, {
        color: isCurrent ? UI_HEX.gold : UI_HEX.mutedCream,
        fontSize: 9,
        fontStyle: isCurrent ? "700" : "500",
        width: 58
      });
    });

    if (run) {
      this.add.rectangle(94, 190, 202, 5, UI_COLORS.deepInk, 1).setOrigin(0, 0).setStrokeStyle(1, UI_COLORS.towerStone);
      this.add.rectangle(94, 190, 202 * Phaser.Math.Clamp(run.nodeProgress, 0, 1), 5, UI_COLORS.skyBlue, 1).setOrigin(0, 0);
    }
  }

  private drawTowerStage(viewModel: TowerViewModel): void {
    const { partyName, run, currentNode: node, heroes } = viewModel;
    const status = run?.status ?? "preparing";
    const hero = heroes[0] ?? null;

    if (!run || status === "preparing") {
      this.drawPreparingStage(hero);
    } else if (status === "traveling") {
      this.drawTravelingStage(partyName, run, hero);
    } else if (status === "exploring") {
      this.drawExploringStage(run, node, hero);
    } else if (status === "fighting") {
      this.drawCombatStage(run, hero);
    } else if (status === "blocked" && run.lastFailureReason === ENCOUNTER_CLEAR_HOLD_REASON) {
      this.drawClearedStage(run, hero);
    } else if (status === "blocked" && run.lastFailureReason === FLOOR_CLEAR_HOLD_REASON) {
      this.drawExitStage(run, hero);
    } else if (status === "looting") {
      this.drawTreasureStage(run, hero);
    } else if (status === "wiped") {
      this.drawWipedStage(run, hero, viewModel.bottleneckHint, viewModel.bottleneckSuggestions);
    } else {
      this.drawBlockedStage(run, hero);
    }

    if (viewModel.shouldShowWorldEventLine) {
      this.drawWorldEventLine(viewModel.message);
    }
  }

  private drawPreparingStage(hero: HeroInstance | null): void {
    this.drawPortal(170, 426, UI_COLORS.skyBlue, "Tower mouth");
    addCenteredLabel(this, 222, 646, "waiting at the threshold", {
      color: UI_HEX.mutedCream,
      fontSize: 12,
      width: 180
    });

    if (hero) {
      this.drawHeroUnit(hero, 112, 524, "waiting");
    }
  }

  private drawTravelingStage(partyName: string, run: TowerRunState, hero: HeroInstance | null): void {
    const travelX = 130 + run.nodeProgress * 610;
    this.add.line(0, 554, 108, 0, 808, 0, UI_COLORS.skyBlue, 0.45).setOrigin(0, 0);
    this.add.line(0, 532, 108, 0, 808, -20, UI_COLORS.towerStone, 0.65).setOrigin(0, 0);
    this.drawPortal(826, 418, UI_COLORS.skyBlue, "Floor gate");
    addCenteredLabel(this, travelX, 632, `${partyName} advances`, {
      color: UI_HEX.skyBlue,
      fontSize: 12,
      fontStyle: "700",
      width: 150
    });

    if (hero) {
      this.drawHeroUnit(hero, travelX, 528, "traveling");
    }
  }

  private drawExploringStage(run: TowerRunState, node: TowerNodeDefinition | null, hero: HeroInstance | null): void {
    const exploreX = 170 + run.nodeProgress * 520;
    const nodeLabel = node?.type === "boss" ? "boss gate" : node?.type ?? "node";
    this.drawArchway(250, 412, 0x172235, "side room");
    this.drawArchway(520, 392, 0x172235, nodeLabel);
    this.drawArchway(760, 422, 0x172235, "passage");
    this.add.circle(exploreX + 26, 492, 22, UI_COLORS.gold, 0.18);
    this.add.circle(exploreX + 26, 492, 9, UI_COLORS.gold, 0.85);

    if (run.floor === 10 && node?.type === "boss") {
      addCenteredLabel(this, 520, 562, "Floor 10 checkpoint", {
        color: UI_HEX.gold,
        fontSize: 12,
        fontStyle: "700",
        width: 150
      });
    }

    if (hero) {
      this.drawHeroUnit(hero, exploreX, 528, "exploring");
    }
  }

  private drawCombatStage(run: TowerRunState, hero: HeroInstance | null): void {
    const isBoss = isFloor10BossNode(run);
    this.add.rectangle(350, 314, 360, 250, 0x0f1724, 0.68).setOrigin(0, 0).setStrokeStyle(2, isBoss ? UI_COLORS.gold : 0x53657e);
    this.add.circle(530, 552, 178, 0x121827, 0.46);
    addCenteredLabel(this, 530, 326, isBoss ? "boss checkpoint" : "encounter room", {
      color: UI_HEX.gold,
      fontSize: 13,
      fontStyle: "700",
      width: 150
    });

    if (isBoss) {
      addCenteredLabel(this, 530, 348, "Big Cave Slime", {
        color: UI_HEX.cream,
        fontSize: 12,
        fontStyle: "700",
        width: 150
      });
    }

    if (hero) {
      this.drawHeroUnit(hero, 430, 524, "in tower");
    }

    this.drawEnemies(run.enemies, 650, 510);
    this.add.line(0, 508, 500, 0, 586, 0, UI_COLORS.danger, 0.5).setOrigin(0, 0);
    this.add.line(0, 496, 500, 0, 586, 0, UI_COLORS.gold, 0.35).setOrigin(0, 0);
  }

  private drawClearedStage(run: TowerRunState, hero: HeroInstance | null): void {
    this.add.rectangle(440, 314, 360, 250, 0x0f1724, 0.68).setOrigin(0, 0).setStrokeStyle(2, 0x53657e);

    if (hero) {
      this.drawHeroUnit(hero, 496, 524, "ready");
    }

    this.drawEnemies(run.enemies, 626, 510, true);
    this.drawPortal(704, 420, UI_COLORS.success, "open passage");
  }

  private drawExitStage(run: TowerRunState, hero: HeroInstance | null): void {
    this.drawPortal(715, 418, UI_COLORS.gold, "Exit");
    this.add.circle(715, 438, 82, UI_COLORS.gold, 0.16);
    addCenteredLabel(this, 715, 604, `Floor ${run.floor} clear`, {
      color: UI_HEX.gold,
      fontSize: 12,
      fontStyle: "700",
      width: 128
    });

    if (hero) {
      this.drawHeroUnit(hero, 620, 528, "at exit");
    }
  }

  private drawTreasureStage(run: TowerRunState, hero: HeroInstance | null): void {
    this.drawArchway(650, 386, 0x172235, "treasure");
    this.add.rectangle(628, 498, 90, 56, 0x7a432d, 1).setStrokeStyle(2, UI_COLORS.gold);
    this.add.rectangle(616, 476, 114, 28, UI_COLORS.amber, 1).setStrokeStyle(2, UI_COLORS.gold);
    addCenteredLabel(this, 673, 580, run.lastFailureReason === TREASURE_HOLD_REASON ? "continue" : "found", {
      color: UI_HEX.gold,
      fontSize: 12,
      width: 120
    });

    if (hero) {
      this.drawHeroUnit(hero, 526, 528, "looting");
    }
  }

  private drawWipedStage(
    run: TowerRunState,
    hero: HeroInstance | null,
    bottleneckHint: string | null,
    bottleneckSuggestions: string[]
  ): void {
    this.add.rectangle(330, 300, 390, bottleneckHint ? 326 : 286, 0x4d1824, 0.38).setOrigin(0, 0);
    addCenteredLabel(this, 525, 328, bottleneckHint ? "Checkpoint Failed" : "Party Wiped", {
      color: UI_HEX.danger,
      fontSize: 14,
      fontStyle: "700"
    });

    if (hero) {
      this.drawHeroUnit(hero, 430, 528, "defeated", true);
    }

    this.drawEnemies(run.enemies, 650, 510);

    if (bottleneckHint) {
      drawPanel(this, 344, 358, 214, 132, 0x101722, UI_COLORS.gold, 0.96, 7);
      addLabel(this, 358, 370, "Bottleneck", {
        color: UI_HEX.gold,
        fontSize: 12,
        fontStyle: "700"
      });
      addLabel(this, 358, 390, bottleneckHint, {
        color: UI_HEX.cream,
        fontSize: 10,
        width: 184
      });
      addLabel(this, 358, 450, bottleneckSuggestions.join(" "), {
        color: UI_HEX.parchment,
        fontSize: 10,
        width: 184
      });
    }
  }

  private drawBlockedStage(run: TowerRunState, hero: HeroInstance | null): void {
    this.drawArchway(620, 390, 0x172235, "paused");

    if (hero) {
      this.drawHeroUnit(hero, 500, 528, "waiting");
    }

    addCenteredLabel(this, 640, 574, run.lastFailureReason ?? "The party is waiting.", {
      color: UI_HEX.mutedCream,
      fontSize: 12,
      width: 170
    });
  }

  private drawContextAction(viewModel: TowerViewModel): void {
    const action = viewModel.action;
    if (!action) {
      return;
    }

    const actionX = this.cameras.main.scrollX + GAME_WIDTH / 2;
    const actionY = 652;
    const color =
      action.id === "complete_floor" ? UI_COLORS.gold : action.id === "continue_run" ? UI_COLORS.skyBlue : UI_COLORS.danger;
    const fill =
      action.id === "complete_floor" ? UI_COLORS.gold : action.id === "continue_run" ? UI_COLORS.skyBlue : 0x6b2935;
    const stroke = action.id === "continue_run" ? 0xd7e8ff : UI_COLORS.parchment;

    this.drawActionConnector(actionX, actionY, color);
    drawActionButton(this, {
      x: actionX,
      y: actionY,
      width: 154,
      height: 44,
      label: action.label,
      enabled: action.enabled,
      fill,
      stroke,
      textColor: action.id === "recover_party" ? UI_HEX.cream : undefined,
      onClick: () => {
        if (action.id === "complete_floor") {
          updateGameState(completeSelectedFloorFromTower);
          this.scene.start("InnScene");
          return;
        }

        if (action.id === "continue_run") {
          updateGameState(continueSelectedRunFromTower);
          this.scene.restart();
          return;
        }

        updateGameState(recoverSelectedPartyFromTower);
        this.scene.start("InnScene");
      }
    });
  }

  private drawActionConnector(x: number, y: number, color: number): void {
    this.add.line(0, 0, x, y - 24, x + 52, y - 88, color, 0.32).setOrigin(0, 0);
    this.add.line(0, 0, x, y - 24, x - 52, y - 88, color, 0.2).setOrigin(0, 0);
  }

  private drawWorldTorches(status: string): void {
    const flame = status === "wiped" ? UI_COLORS.danger : status === "fighting" ? UI_COLORS.gold : UI_COLORS.amber;

    for (const x of [174, 368, 548, 742]) {
      this.add.rectangle(x - 3, 314, 6, 44, 0x5b3525, 1).setOrigin(0, 0);
      this.add.circle(x, 306, 13, flame, 0.48);
      this.add.circle(x, 306, 6, UI_COLORS.gold, 0.88);
    }
  }

  private drawFarDoor(x: number, label: string, stroke: number): void {
    this.add.rectangle(x - 32, 390, 64, 112, 0x0c1220, 1).setStrokeStyle(2, stroke);
    this.add.circle(x, 390, 32, 0x0c1220, 1).setStrokeStyle(2, stroke);
    addCenteredLabel(this, x, 522, label, {
      color: UI_HEX.mutedCream,
      fontSize: 10,
      width: 78
    });
  }

  private drawPortal(x: number, y: number, color: number, label: string): void {
    this.add.rectangle(x - 38, y - 8, 76, 138, 0x111827, 1).setStrokeStyle(3, color);
    this.add.circle(x, y - 8, 38, 0x111827, 1).setStrokeStyle(3, color);
    this.add.circle(x, y + 54, 5, color, 1);
    addCenteredLabel(this, x, y + 156, label, {
      color: color === UI_COLORS.gold ? UI_HEX.gold : color === UI_COLORS.success ? UI_HEX.success : UI_HEX.skyBlue,
      fontSize: 11,
      fontStyle: "700",
      width: 120
    });
  }

  private drawArchway(x: number, y: number, fill: number, label: string): void {
    this.add.rectangle(x - 54, y, 108, 108, fill, 1).setStrokeStyle(2, UI_COLORS.towerStone);
    this.add.circle(x, y, 54, fill, 1).setStrokeStyle(2, UI_COLORS.towerStone);
    this.add.rectangle(x - 42, y + 18, 84, 92, 0x0d1320, 1).setStrokeStyle(1, 0x53657e);
    addCenteredLabel(this, x, y + 134, label, {
      color: UI_HEX.mutedCream,
      fontSize: 10,
      width: 88
    });
  }

  private drawHeroUnit(hero: HeroInstance, x: number, y: number, status: string, forceDefeated = false): void {
    const hpDisplay = getHeroHpDisplayText(hero);

    drawTinyHero(this, x, y, {
      facing: "right",
      palette: forceDefeated || hero.status === "defeated" ? "defeated" : "hero"
    });
    drawHpBar(this, x - 50, y - 86, 100, 8, hpDisplay.ratio, `${hero.name} ${hpDisplay.label}`, UI_COLORS.success);
    addCenteredLabel(this, x, y + 44, status, {
      color: UI_HEX.mutedCream,
      fontSize: 10,
      width: 88
    });
  }

  private drawEnemies(enemies: TowerRunEnemyState[], x: number, y: number, forceDefeated = false): void {
    if (enemies.length === 0) {
      addCenteredLabel(this, x, y - 22, "No enemy in sight", {
        color: UI_HEX.mutedCream,
        fontSize: 12,
        width: 120
      });
      return;
    }

    enemies.slice(0, 2).forEach((enemy, index) => {
      const enemyDefinition = enemyDefinitions[enemy.enemyId];
      const enemyY = y + index * 78;
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
        x - 52,
        enemyY - 82,
        104,
        8,
        hpRatio,
        `${enemyDefinition?.name ?? "Enemy"} HP ${currentHp}/${maxHp}`,
        UI_COLORS.danger
      );
    });
  }

  private drawWorldEventLine(message: string): void {
    const x = this.cameras.main.scrollX + 42;
    drawPanel(this, x, 626, 306, 50, 0x101722, UI_COLORS.towerStone, 0.96, 7);
    addLabel(this, x + 14, 638, message, {
      color: UI_HEX.cream,
      fontSize: 12,
      width: 278
    });
  }

  private fixChildrenAddedAfter(startIndex: number): void {
    this.children.list.slice(startIndex).forEach((child) => {
      const maybeFixed = child as Phaser.GameObjects.GameObject & {
        setScrollFactor?: (x: number, y?: number) => Phaser.GameObjects.GameObject;
      };
      maybeFixed.setScrollFactor?.(0);
    });
  }
}

function getTowerCameraScrollX(run: TowerRunState | null): number {
  if (!run || run.status === "preparing") {
    return 0;
  }

  if (run.status === "traveling") {
    return clampCameraScroll(130 + run.nodeProgress * 610 - 168);
  }

  if (run.status === "exploring") {
    return clampCameraScroll(170 + run.nodeProgress * 520 - 168);
  }

  if (run.status === "fighting" || run.status === "wiped") {
    return 300;
  }

  if (run.status === "blocked" && run.lastFailureReason === ENCOUNTER_CLEAR_HOLD_REASON) {
    return 425;
  }

  if (run.status === "blocked" && run.lastFailureReason === FLOOR_CLEAR_HOLD_REASON) {
    return 520;
  }

  if (run.status === "looting") {
    return 425;
  }

  return 300;
}

function clampCameraScroll(scrollX: number): number {
  return Phaser.Math.Clamp(scrollX, 0, TOWER_MAX_SCROLL_X);
}

function statusColor(run: TowerRunState | null): number {
  if (!run) {
    return 0x334155;
  }

  if (run.status === "fighting" || run.status === "wiped") {
    return run.floor === 10 ? 0x6b4724 : 0x5c2530;
  }

  if (run.status === "blocked") {
    return run.lastFailureReason === FLOOR_CLEAR_HOLD_REASON ? 0x6b4724 : 0x275241;
  }

  if (run.status === "traveling" || run.status === "exploring") {
    return 0x1f4662;
  }

  return 0x334155;
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
