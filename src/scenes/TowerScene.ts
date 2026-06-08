import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { getHeroesForParty, getSelectedParty, getSelectedTowerRun } from "../state/gameSelectors";
import { getGameState } from "../state/gameStore";
import type { HeroStatus } from "../types/ids";
import { createSceneHud } from "../ui/sceneHud";

export class TowerScene extends Phaser.Scene {
  public constructor() {
    super("TowerScene");
  }

  public create(): void {
    const state = getGameState();
    const party = getSelectedParty(state);
    const run = getSelectedTowerRun(state);
    const heroes = party ? getHeroesForParty(state, party.id) : [];
    const status = run?.status ?? "preparing";
    const message =
      status === "traveling" || status === "exploring"
        ? `${party?.name ?? "Party"} is entering Floor ${run?.floor ?? state.unlockedFloor}.`
        : status === "preparing"
          ? "Party is preparing at the inn."
          : `${party?.name ?? "Party"} status: ${formatStatus(status)}.`;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x111827).setOrigin(0, 0);
    this.add.rectangle(40, 128, GAME_WIDTH - 80, 520, 0x1f2937, 1).setStrokeStyle(2, 0x5b6b84);

    this.add.text(GAME_WIDTH / 2, 154, party?.name ?? "No Party", {
      align: "center",
      color: "#edf5ff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "22px",
      fontStyle: "700"
    }).setOrigin(0.5);

    this.add.rectangle(GAME_WIDTH / 2, 232, 238, 92, 0x273449, 1).setStrokeStyle(1, 0x7186a4);
    this.add.text(GAME_WIDTH / 2, 212, `Status ${formatStatus(status)}`, {
      align: "center",
      color: status === "preparing" ? "#d7e8ff" : "#ffe7a3",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      fontStyle: "700"
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 240, `Floor ${run?.floor ?? state.unlockedFloor} | Node ${run?.nodeIndex ?? 0}`, {
      align: "center",
      color: "#d7e8ff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "14px"
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 264, `Progress ${Math.round((run?.nodeProgress ?? 0) * 100)}%`, {
      align: "center",
      color: "#9eb8d8",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px"
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 342, message, {
      align: "center",
      color: "#edf5ff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "17px",
      wordWrap: { width: GAME_WIDTH - 110 }
    }).setOrigin(0.5);

    this.add.text(72, 424, "Party Heroes", {
      color: "#d7e8ff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      fontStyle: "700"
    });

    heroes.forEach((hero, index) => {
      const y = 474 + index * 58;
      this.add.rectangle(GAME_WIDTH / 2, y, 238, 42, 0x273449, 1).setStrokeStyle(1, 0x7186a4);
      this.add.text(88, y - 11, `${hero.name} Lv ${hero.level}`, {
        color: "#edf5ff",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "700"
      });
      this.add.text(230, y - 11, formatStatus(hero.status), {
        color: hero.status === "in_tower" ? "#ffe7a3" : "#9eb8d8",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "13px"
      });
    });

    this.add.text(GAME_WIDTH / 2, 684, "Tower View", {
      align: "center",
      color: "#edf5ff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "20px",
      fontStyle: "700"
    }).setOrigin(0.5);

    createSceneHud(this, { title: "Tower View", activeLabel: "Tower" });
  }
}

function formatStatus(status: string | HeroStatus): string {
  return status.split("_").join(" ");
}
