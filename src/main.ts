import Phaser from "phaser";
import { gameConfig } from "./game/config";
import "./style.css";

const game = new Phaser.Game(gameConfig);
const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;

if (isDev) {
  (globalThis as typeof globalThis & { __idleDungeonInnGame?: Phaser.Game }).__idleDungeonInnGame = game;
}
