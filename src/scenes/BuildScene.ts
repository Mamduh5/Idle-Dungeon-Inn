import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { createSceneHud } from "../ui/sceneHud";

export class BuildScene extends Phaser.Scene {
  public constructor() {
    super("BuildScene");
  }

  public create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2b2736).setOrigin(0, 0);
    this.add.text(GAME_WIDTH / 2, 142, "Build Choices", {
      align: "center",
      color: "#f6edff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "24px",
      fontStyle: "700"
    }).setOrigin(0.5);

    const choices = ["Kitchen", "Training Room", "Guest Beds", "Workshop"];

    choices.forEach((choice, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 108 + col * 176;
      const y = 252 + row * 170;

      this.add.rectangle(x, y, 142, 124, 0x3d3550, 1).setStrokeStyle(2, 0xc7a6ff);
      this.add.rectangle(x, y - 18, 72, 40, 0x5b4c79, 1);
      this.add.text(x, y + 36, choice, {
        align: "center",
        color: "#fff7ff",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "700",
        wordWrap: { width: 112 }
      }).setOrigin(0.5);
    });

    this.add.text(GAME_WIDTH / 2, 684, "Build View", {
      align: "center",
      color: "#fff7ff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "20px",
      fontStyle: "700"
    }).setOrigin(0.5);

    createSceneHud(this, { title: "Build View", activeLabel: "Build" });
  }
}
