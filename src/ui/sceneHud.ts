import Phaser from "phaser";
import { initialGameState } from "../game/initialState";
import { NAV_ITEMS } from "../game/navigation";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";

export interface HudOptions {
  title: string;
  activeLabel: string;
}

export function createSceneHud(scene: Phaser.Scene, options: HudOptions): void {
  createTopHud(scene, options.title);
  createBottomNav(scene, options.activeLabel);
}

function createTopHud(scene: Phaser.Scene, title: string): void {
  const selectedRun = initialGameState.towerRuns.find(
    (run) => run.partyId === initialGameState.selectedPartyId
  );
  const displayFloor = selectedRun?.floor ?? initialGameState.unlockedFloor;

  scene.add.rectangle(0, 0, GAME_WIDTH, 104, 0x211b18, 0.96).setOrigin(0, 0);
  scene.add.rectangle(20, 78, GAME_WIDTH - 40, 1, 0x6d5a49, 0.55).setOrigin(0, 0.5);

  scene.add.text(22, 18, title, {
    color: "#fff3df",
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: "28px",
    fontStyle: "700"
  });

  scene.add.text(24, 62, `Coins ${initialGameState.currencies.coins}`, {
    color: "#f1c76f",
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: "14px"
  });

  scene.add.text(GAME_WIDTH - 24, 62, `Floor ${displayFloor}`, {
    align: "right",
    color: "#a8d7ff",
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: "14px"
  }).setOrigin(1, 0);
}

function createBottomNav(scene: Phaser.Scene, activeLabel: string): void {
  const navHeight = 82;
  const top = GAME_HEIGHT - navHeight;
  const itemWidth = GAME_WIDTH / NAV_ITEMS.length;

  scene.add.rectangle(0, top, GAME_WIDTH, navHeight, 0x171413, 0.98).setOrigin(0, 0);
  scene.add.rectangle(0, top, GAME_WIDTH, 1, 0x66584c, 0.7).setOrigin(0, 0);

  NAV_ITEMS.forEach((item, index) => {
    const left = index * itemWidth;
    const centerX = left + itemWidth / 2;
    const isActive = item.label === activeLabel;

    const button = scene.add
      .rectangle(centerX, top + 40, itemWidth - 12, 54, isActive ? 0x4f372a : 0x26201d, 1)
      .setStrokeStyle(1, isActive ? 0xf1c76f : 0x4c4139)
      .setInteractive({ useHandCursor: true });

    scene.add.text(centerX, top + 40, item.label, {
      align: "center",
      color: isActive ? "#ffe7a3" : "#d7c7b4",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "14px",
      fontStyle: isActive ? "700" : "500"
    }).setOrigin(0.5);

    button.on("pointerup", () => {
      if (!isActive) {
        scene.scene.start(item.sceneKey);
      }
    });
  });
}
