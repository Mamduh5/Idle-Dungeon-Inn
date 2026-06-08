import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { BuildScene } from "../scenes/BuildScene";
import { HeroesScene } from "../scenes/HeroesScene";
import { InnScene } from "../scenes/InnScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { TowerScene } from "../scenes/TowerScene";
import { GAME_HEIGHT, GAME_WIDTH } from "./screen";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#171413",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, PreloadScene, InnScene, TowerScene, HeroesScene, BuildScene]
};
