import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { createSceneHud } from "../ui/sceneHud";

export class InnScene extends Phaser.Scene {
  public constructor() {
    super("InnScene");
  }

  public create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x3f261d).setOrigin(0, 0);
    this.add.rectangle(26, 130, GAME_WIDTH - 52, 470, 0x6f3d28, 1).setStrokeStyle(2, 0xd89a58);
    this.add.rectangle(GAME_WIDTH / 2, 184, 250, 72, 0x8f5935, 1).setStrokeStyle(2, 0xffcc7d);
    this.add.text(GAME_WIDTH / 2, 184, "Hearth Room", {
      align: "center",
      color: "#fff0ce",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "22px",
      fontStyle: "700"
    }).setOrigin(0.5);

    this.add.circle(104, 366, 48, 0xf0a247, 0.72);
    this.add.circle(104, 366, 26, 0xffd86f, 0.86);
    this.add.rectangle(230, 370, 130, 84, 0x4d2d23, 1).setStrokeStyle(2, 0xb57745);
    this.add.text(230, 370, "Resting tables\nand warm beds", {
      align: "center",
      color: "#f9dfbc",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px"
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 642, "Inn View", {
      align: "center",
      color: "#f7efe4",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "20px",
      fontStyle: "700"
    }).setOrigin(0.5);

    createSceneHud(this, { title: "Inn View", activeLabel: "Inn" });
  }
}
