import Phaser from "phaser";
import { enemyDefinitions } from "../data/enemyData";
import { prototypeTowerFloors } from "../data/towerData";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { getHeroesForParty, getSelectedParty, getSelectedTowerRun } from "../state/gameSelectors";
import { getGameState, updateGameState } from "../state/gameStore";
import { tickGameState } from "../systems/gameTickSystem";
import { heroDefinitions } from "../data/heroData";
import type { HeroStatus } from "../types/ids";
import type { TowerNodeDefinition, TowerRunState } from "../types/towerTypes";
import { createSceneHud } from "../ui/sceneHud";

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
    const status = run?.status ?? "preparing";
    const progress = run?.nodeProgress ?? 0;

    this.renderKey = getTowerRenderKey(run, heroes);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x111827).setOrigin(0, 0);
    this.add.rectangle(40, 128, GAME_WIDTH - 80, 520, 0x1f2937, 1).setStrokeStyle(2, 0x5b6b84);

    this.add.text(GAME_WIDTH / 2, 154, party?.name ?? "No Party", {
      align: "center",
      color: "#edf5ff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "22px",
      fontStyle: "700"
    }).setOrigin(0.5);

    this.drawRunPanel(run, node);
    this.drawProgressBar(78, 292, GAME_WIDTH - 156, progress);

    this.add.text(GAME_WIDTH / 2, 350, getTowerMessage(party?.name ?? "Party", run, node), {
      align: "center",
      color: "#edf5ff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      wordWrap: { width: GAME_WIDTH - 110 }
    }).setOrigin(0.5);

    this.add.text(72, 418, "Party Heroes", {
      color: "#d7e8ff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      fontStyle: "700"
    });

    heroes.forEach((hero, index) => {
      const y = 468 + index * 48;
      this.add.rectangle(GAME_WIDTH / 2, y, 238, 36, 0x273449, 1).setStrokeStyle(1, 0x7186a4);
      const maxHp = heroDefinitions[hero.classId]?.baseStats.hp ?? hero.currentHp;
      this.add.text(88, y - 10, `${hero.name} Lv ${hero.level}`, {
        color: "#edf5ff",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "700"
      });
      this.add.text(228, y - 10, formatStatus(hero.status), {
        color: hero.status === "in_tower" ? "#ffe7a3" : "#9eb8d8",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "12px"
      });
      this.add.text(88, y + 4, `HP ${hero.currentHp}/${maxHp}`, {
        color: hero.currentHp <= 0 ? "#f9b6a8" : "#9eb8d8",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "11px"
      });
    });

    if (run && run.enemies.length > 0) {
      this.drawEnemies(run);
    }

    this.add.text(GAME_WIDTH / 2, 684, "Tower View", {
      align: "center",
      color: "#edf5ff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "20px",
      fontStyle: "700"
    }).setOrigin(0.5);

    createSceneHud(this, { title: "Tower View", activeLabel: "Tower" });
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

  private drawRunPanel(run: TowerRunState | null, node: TowerNodeDefinition | null): void {
    const status = run?.status ?? "preparing";

    this.add.rectangle(GAME_WIDTH / 2, 234, 238, 108, 0x273449, 1).setStrokeStyle(1, 0x7186a4);
    this.add.text(GAME_WIDTH / 2, 204, `Status ${formatStatus(status)}`, {
      align: "center",
      color: status === "preparing" ? "#d7e8ff" : "#ffe7a3",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      fontStyle: "700"
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 230, `Floor ${run?.floor ?? 1} | Node ${run?.nodeIndex ?? 0}`, {
      align: "center",
      color: "#d7e8ff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "14px"
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 254, `Node ${node?.type ?? "none"}`, {
      align: "center",
      color: "#9eb8d8",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px"
    }).setOrigin(0.5);
  }

  private drawProgressBar(x: number, y: number, width: number, progress: number): void {
    const clampedProgress = Phaser.Math.Clamp(progress, 0, 1);

    this.add.rectangle(x, y, width, 12, 0x111827, 1).setStrokeStyle(1, 0x7186a4).setOrigin(0, 0);
    this.add.rectangle(x, y, width * clampedProgress, 12, 0xa8d7ff, 1).setOrigin(0, 0);
    this.add.text(GAME_WIDTH / 2, y + 24, `Progress ${Math.round(clampedProgress * 100)}%`, {
      align: "center",
      color: "#9eb8d8",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "12px"
    }).setOrigin(0.5);
  }

  private drawEnemies(run: TowerRunState): void {
    const title = run.status === "blocked" ? "Encounter Cleared" : run.status === "wiped" ? "Encounter Ended" : "Encounter";
    this.add.text(72, 546, title, {
      color: "#ffe7a3",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      fontStyle: "700"
    });

    run.enemies.forEach((enemy, index) => {
      const enemyDefinition = enemyDefinitions[enemy.enemyId];
      const y = 596 + index * 44;

      this.add.rectangle(GAME_WIDTH / 2, y, 238, 34, 0x3a2631, 1).setStrokeStyle(1, 0xd86c58);
      this.add.circle(92, y, 12, 0x86d28f, 1);
      this.add.text(116, y - 10, enemyDefinition?.name ?? enemy.enemyId, {
        color: "#fff3df",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "700"
      });
      const maxHp = enemyDefinition?.baseStats.hp ?? enemy.currentHp ?? "?";
      this.add.text(214, y - 10, formatStatus(enemy.status), {
        color: enemy.status === "defeated" ? "#9eb8d8" : "#f9b6a8",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "11px"
      });
      this.add.text(258, y - 10, `HP ${enemy.currentHp ?? "?"}/${maxHp}`, {
        color: "#f9b6a8",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "11px"
      });
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
    return `Exploring Floor ${run.floor}${node ? ` toward a ${node.type} node` : ""}.`;
  }

  if (run.status === "fighting") {
    return run.lastCombatEventMessage ?? "Combat running...";
  }

  if (run.status === "looting") {
    return "Treasure found. Rewards not implemented yet.";
  }

  if (run.status === "blocked") {
    return run.lastFailureReason === "Encounter cleared. Node advancement is not implemented yet."
      ? "Encounter cleared. Rewards/floor clear not implemented yet."
      : "Run is blocked until the next system is implemented.";
  }

  if (run.status === "wiped") {
    return "Party wiped. Return/revive not implemented yet.";
  }

  return `${partyName} status: ${formatStatus(run.status)}.`;
}

function getTowerRenderKey(run: TowerRunState | null, heroes: Array<{ id: string; currentHp: number; status: string }>): string {
  if (!run) {
    return "none";
  }

  const progressBucket = Math.floor(run.nodeProgress * 20);
  const heroesKey = heroes.map((hero) => `${hero.id}:${hero.currentHp}:${hero.status}`).join(",");
  const enemiesKey = run.enemies
    .map((enemy) => `${enemy.enemyId}:${enemy.currentHp}:${enemy.status}`)
    .join(",");

  return `${run.status}|${run.floor}|${run.nodeIndex}|${progressBucket}|${heroesKey}|${enemiesKey}|${run.lastCombatEventMessage}`;
}

function formatStatus(status: string | HeroStatus): string {
  return status.split("_").join(" ");
}
