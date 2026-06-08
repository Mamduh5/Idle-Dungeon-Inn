import Phaser from "phaser";
import { NAV_ITEMS } from "../game/navigation";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { getSelectedTowerRun } from "../state/gameSelectors";
import { getGameState } from "../state/gameStore";
import { addCenteredLabel, addLabel, drawPanel } from "./components";
import { UI_COLORS, UI_HEX } from "./theme";

export interface HudOptions {
  title: string;
  activeLabel: string;
}

export function createSceneHud(scene: Phaser.Scene, options: HudOptions): void {
  createTopHud(scene, options.title);
  createBottomNav(scene, options.activeLabel);
}

function createTopHud(scene: Phaser.Scene, title: string): void {
  const state = getGameState();
  const selectedRun = getSelectedTowerRun(state);
  const displayFloor = selectedRun?.floor ?? state.unlockedFloor;

  scene.add.rectangle(0, 0, GAME_WIDTH, 104, UI_COLORS.ink, 0.97).setOrigin(0, 0);
  scene.add.rectangle(0, 88, GAME_WIDTH, 16, 0x2d201b, 1).setOrigin(0, 0);
  scene.add.rectangle(22, 86, GAME_WIDTH - 44, 1, UI_COLORS.gold, 0.5).setOrigin(0, 0.5);

  addLabel(scene, 22, 16, title, {
    color: UI_HEX.cream,
    fontSize: 18,
    fontStyle: "700",
    width: 188
  });

  addLabel(scene, 22, 42, "Idle Dungeon Inn", {
    color: UI_HEX.mutedCream,
    fontSize: 11,
    fontStyle: "700"
  });

  drawPanel(scene, 218, 16, 68, 44, 0x30231d, UI_COLORS.gold, 0.96, 7);
  addCenteredLabel(scene, 252, 29, "Coins", {
    color: UI_HEX.mutedCream,
    fontSize: 10,
    fontStyle: "700"
  });
  addCenteredLabel(scene, 252, 46, `${state.currencies.coins}`, {
    color: UI_HEX.gold,
    fontSize: 15,
    fontStyle: "700"
  });

  drawPanel(scene, 298, 16, 68, 44, 0x1c2838, UI_COLORS.skyBlue, 0.96, 7);
  addCenteredLabel(scene, 332, 29, "Floor", {
    color: UI_HEX.mutedCream,
    fontSize: 10,
    fontStyle: "700"
  });
  addCenteredLabel(scene, 332, 46, `${displayFloor}`, {
    color: UI_HEX.skyBlue,
    fontSize: 15,
    fontStyle: "700"
  });
}

function createBottomNav(scene: Phaser.Scene, activeLabel: string): void {
  const navHeight = 82;
  const top = GAME_HEIGHT - navHeight;
  const itemWidth = GAME_WIDTH / NAV_ITEMS.length;

  scene.add.rectangle(0, top, GAME_WIDTH, navHeight, UI_COLORS.deepInk, 0.98).setOrigin(0, 0);
  scene.add.rectangle(0, top, GAME_WIDTH, 1, UI_COLORS.gold, 0.45).setOrigin(0, 0);

  NAV_ITEMS.forEach((item, index) => {
    const left = index * itemWidth;
    const centerX = left + itemWidth / 2;
    const isActive = item.label === activeLabel;

    const button = scene.add
      .rectangle(centerX, top + 40, itemWidth - 10, 56, isActive ? 0x35251f : 0x1c2027, 1)
      .setStrokeStyle(1, isActive ? UI_COLORS.gold : 0x414a55)
      .setInteractive({ useHandCursor: true });

    drawNavMark(scene, item.label, centerX, top + 25, isActive);
    addCenteredLabel(scene, centerX, top + 53, item.label, {
      color: isActive ? UI_HEX.gold : UI_HEX.mutedCream,
      fontSize: 13,
      fontStyle: isActive ? "700" : "500"
    });

    button.on("pointerup", () => {
      if (!isActive) {
        scene.scene.start(item.sceneKey);
      }
    });
  });
}

function drawNavMark(scene: Phaser.Scene, label: string, x: number, y: number, isActive: boolean): void {
  const color = isActive ? UI_COLORS.gold : UI_COLORS.towerStone;

  if (label === "Inn") {
    scene.add.polygon(x, y - 2, [0, -10, 16, 0, 10, 0, 10, 12, -10, 12, -10, 0, -16, 0], color, 1);
    return;
  }

  if (label === "Tower") {
    scene.add.rectangle(x, y + 2, 18, 22, color, 1);
    scene.add.polygon(x, y - 12, [0, -8, 13, 2, -13, 2], color, 1);
    return;
  }

  if (label === "Heroes") {
    scene.add.circle(x, y - 5, 7, color, 1);
    scene.add.rectangle(x, y + 8, 22, 14, color, 1);
    return;
  }

  scene.add.rectangle(x - 3, y + 2, 18, 6, color, 1).setRotation(-0.7);
  scene.add.rectangle(x - 11, y + 9, 8, 12, color, 1).setRotation(-0.7);
}
