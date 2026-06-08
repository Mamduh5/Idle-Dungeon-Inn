import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { createSceneHud } from "../ui/sceneHud";

export class HeroesScene extends Phaser.Scene {
  public constructor() {
    super("HeroesScene");
  }

  public create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d2f2a).setOrigin(0, 0);
    this.add.text(GAME_WIDTH / 2, 142, "Party Roster", {
      align: "center",
      color: "#dff9eb",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "24px",
      fontStyle: "700"
    }).setOrigin(0.5);

    const slots = [
      { name: "Vanguard", color: 0x7fd3a6 },
      { name: "Arcanist", color: 0x86b8ff },
      { name: "Support", color: 0xf0d37a }
    ];

    slots.forEach((slot, index) => {
      const y = 234 + index * 132;
      this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 56, 98, 0x263f38, 1).setStrokeStyle(2, slot.color);
      this.add.circle(82, y, 28, slot.color, 0.9);
      this.add.text(128, y - 18, slot.name, {
        color: "#f4fff8",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "18px",
        fontStyle: "700"
      });
      this.add.text(128, y + 10, "Hero slot placeholder", {
        color: "#b9d9cc",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "14px"
      });
    });

    this.add.text(GAME_WIDTH / 2, 684, "Heroes View", {
      align: "center",
      color: "#f4fff8",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "20px",
      fontStyle: "700"
    }).setOrigin(0.5);

    createSceneHud(this, { title: "Heroes View", activeLabel: "Heroes" });
  }
}
