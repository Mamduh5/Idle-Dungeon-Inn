import Phaser from "phaser";
import { heroDefinitions } from "../data/heroData";
import { roomDefinitions } from "../data/roomData";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import {
  getFirstPartyHero,
  getInnRoom,
  getSelectedParty,
  getSelectedTowerRun
} from "../state/gameSelectors";
import { getGameState, updateGameState } from "../state/gameStore";
import { sendSelectedPartyToTower } from "../systems/partyDispatchSystem";
import type { HeroInstance } from "../types/heroTypes";
import type { HeroStatus } from "../types/ids";
import type { InnRoomState } from "../types/roomTypes";
import type { TowerRunStatus } from "../types/towerTypes";
import { createSceneHud } from "../ui/sceneHud";

export class InnScene extends Phaser.Scene {
  public constructor() {
    super("InnScene");
  }

  public create(): void {
    const state = getGameState();
    const party = getSelectedParty(state);
    const run = getSelectedTowerRun(state);
    const hero = party ? getFirstPartyHero(state, party.id) : null;
    const bedRoom = getInnRoom(state, "bed_room");
    const trainingRoom = getInnRoom(state, "training_room");
    const latestEvent = state.recentEvents[0];
    const canDispatch =
      Boolean(party && hero && run) &&
      !isRunActive(run?.status) &&
      !isHeroUnavailable(hero?.status);
    const buttonLabel = isRunActive(run?.status) ? "Party in Tower" : canDispatch ? "Send to Tower" : "Party Not Ready";

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x3f261d).setOrigin(0, 0);
    this.add.rectangle(20, 120, GAME_WIDTH - 40, 624, 0x6f3d28, 1).setStrokeStyle(2, 0xd89a58);
    this.add.rectangle(GAME_WIDTH / 2, 162, 252, 58, 0x8f5935, 1).setStrokeStyle(2, 0xffcc7d);
    this.add.text(GAME_WIDTH / 2, 162, "Hearth Room", {
      align: "center",
      color: "#fff0ce",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "22px",
      fontStyle: "700"
    }).setOrigin(0.5);

    this.add.text(38, 206, party?.name ?? "No Party", {
      color: "#fff3df",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "20px",
      fontStyle: "700"
    });

    this.add.text(38, 232, `Target Floor ${party?.selectedTargetFloor ?? state.unlockedFloor}`, {
      color: "#f1c76f",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "14px"
    });

    this.drawHeroPanel(hero);
    this.drawRoomCard(38, 424, "Bed Room", bedRoom, roomDefinitions.bed_room.description);
    this.drawRoomCard(204, 424, "Training Room", trainingRoom, roomDefinitions.training_room.description);

    this.add.rectangle(38, 584, GAME_WIDTH - 76, 54, 0x4d2d23, 1).setStrokeStyle(1, 0xb57745).setOrigin(0, 0);
    this.add.text(54, 596, latestEvent?.message ?? "No recent events yet.", {
      color: latestEvent?.severity === "warning" ? "#ffe0a3" : "#f9dfbc",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "14px",
      wordWrap: { width: GAME_WIDTH - 108 }
    });

    const button = this.add
      .rectangle(GAME_WIDTH / 2, 682, GAME_WIDTH - 76, 54, canDispatch ? 0xf0a247 : 0x6d5a49, 1)
      .setStrokeStyle(2, canDispatch ? 0xffd86f : 0x9a8068);

    this.add.text(GAME_WIDTH / 2, 682, buttonLabel, {
      align: "center",
      color: canDispatch ? "#251611" : "#ead8c7",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "18px",
      fontStyle: "700"
    }).setOrigin(0.5);

    if (canDispatch) {
      button.setInteractive({ useHandCursor: true });
      button.on("pointerup", () => {
        updateGameState(sendSelectedPartyToTower);
        this.scene.restart();
      });
    }

    createSceneHud(this, { title: "Inn View", activeLabel: "Inn" });
  }

  private drawHeroPanel(hero: HeroInstance | null): void {
    const maxHp = hero ? heroDefinitions[hero.classId]?.baseStats.hp ?? hero.currentHp : 1;
    const hpRatio = hero ? Phaser.Math.Clamp(hero.currentHp / maxHp, 0, 1) : 0;

    this.add.rectangle(38, 270, GAME_WIDTH - 76, 124, 0x4d2d23, 1).setStrokeStyle(2, 0xd89a58).setOrigin(0, 0);
    this.add.circle(82, 332, 30, 0xffd86f, 0.9);
    this.add.rectangle(82, 366, 42, 42, 0x8f5935, 1).setStrokeStyle(1, 0xffcc7d);

    this.add.text(130, 296, hero ? `${hero.name} Lv ${hero.level}` : "No hero assigned", {
      color: "#fff3df",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "18px",
      fontStyle: "700"
    });

    this.add.text(130, 324, `Status ${formatStatus(hero?.status ?? "idle")}`, {
      color: hero?.status === "in_tower" ? "#a8d7ff" : "#f9dfbc",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "14px"
    });

    this.add.rectangle(130, 354, 176, 12, 0x2c1b17, 1).setOrigin(0, 0);
    this.add.rectangle(130, 354, 176 * hpRatio, 12, 0xd86c58, 1).setOrigin(0, 0);
    this.add.text(130, 372, `HP ${hero?.currentHp ?? 0}/${maxHp}`, {
      color: "#f9dfbc",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px"
    });
  }

  private drawRoomCard(x: number, y: number, title: string, room: InnRoomState | null, description: string): void {
    const isUnlocked = Boolean(room?.isUnlocked);

    this.add.rectangle(x, y, 148, 126, isUnlocked ? 0x8f5935 : 0x3b312c, 1).setStrokeStyle(
      2,
      isUnlocked ? 0xffcc7d : 0x7a6758
    ).setOrigin(0, 0);
    this.add.text(x + 14, y + 14, title, {
      color: isUnlocked ? "#fff0ce" : "#c9b8a6",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "15px",
      fontStyle: "700"
    });
    this.add.text(x + 14, y + 40, isUnlocked ? `Level ${room?.level ?? 0}` : "Locked", {
      color: isUnlocked ? "#f1c76f" : "#9f8d7d",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px"
    });
    this.add.text(x + 14, y + 64, description, {
      color: isUnlocked ? "#f9dfbc" : "#a9988a",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "12px",
      wordWrap: { width: 120 }
    });
  }
}

function isRunActive(status: TowerRunStatus | undefined): boolean {
  return status === "traveling" || status === "exploring" || status === "fighting" || status === "looting";
}

function isHeroUnavailable(status: HeroStatus | undefined): boolean {
  return (
    status === "defeated" ||
    status === "wounded" ||
    status === "in_tower" ||
    status === "resting" ||
    status === "eating" ||
    status === "training" ||
    status === "gearing"
  );
}

function formatStatus(status: HeroStatus): string {
  return status.split("_").join(" ");
}
