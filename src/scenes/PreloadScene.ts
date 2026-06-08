import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";

export class PreloadScene extends Phaser.Scene {
  public constructor() {
    super("PreloadScene");
  }

  public create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x171413).setOrigin(0, 0);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "Preparing the inn...", {
      align: "center",
      color: "#f7efe4",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "18px"
    }).setOrigin(0.5);

    this.scene.start("InnScene");
  }
}
