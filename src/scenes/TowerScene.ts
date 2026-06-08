import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { createSceneHud } from "../ui/sceneHud";

export class TowerScene extends Phaser.Scene {
  public constructor() {
    super("TowerScene");
  }

  public create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x111827).setOrigin(0, 0);
    this.add.rectangle(70, 128, 250, 520, 0x1f2937, 1).setStrokeStyle(2, 0x5b6b84);

    for (let floor = 0; floor < 5; floor += 1) {
      const y = 580 - floor * 88;
      this.add.rectangle(GAME_WIDTH / 2, y, 188, 48, 0x273449, 1).setStrokeStyle(1, 0x7186a4);
      this.add.text(GAME_WIDTH / 2, y, `Tower Floor ${floor + 1}`, {
        align: "center",
        color: "#d7e8ff",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "16px",
        fontStyle: floor === 0 ? "700" : "500"
      }).setOrigin(0.5);
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
}
