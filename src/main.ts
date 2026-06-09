import Phaser from "phaser";
import { gameConfig } from "./game/config";
import { clearSavedGameStateForDev, getGameState, resetGameStateForDev } from "./state/gameStore";
import "./style.css";

const game = new Phaser.Game(gameConfig);
const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;

if (isDev) {
  const devGlobal = globalThis as typeof globalThis & {
    __idleDungeonInnGame?: Phaser.Game;
    __idleDungeonInnGetState?: typeof getGameState;
    __idleDungeonInnResetState?: typeof resetGameStateForDev;
    __idleDungeonInnClearSave?: typeof clearSavedGameStateForDev;
  };
  devGlobal.__idleDungeonInnGame = game;
  devGlobal.__idleDungeonInnGetState = getGameState;
  devGlobal.__idleDungeonInnResetState = resetGameStateForDev;
  devGlobal.__idleDungeonInnClearSave = clearSavedGameStateForDev;
}
