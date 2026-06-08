import Phaser from "phaser";
import { heroDefinitions } from "../data/heroData";
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
    const targetFloor = party?.selectedTargetFloor ?? run?.floor ?? state.unlockedFloor;

    this.drawBackdrop();
    this.drawInnShell();
    this.drawBedRoom(bedRoom);
    this.drawTrainingRoom(trainingRoom);
    this.drawCommonRoom(party?.name ?? "No Party");
    this.drawTowerGate(targetFloor, buttonLabel, canDispatch);
    this.drawToast(latestEvent?.message ?? "No recent events yet.", latestEvent?.severity === "warning");

    if (hero) {
      this.drawHero(hero);
    }

    if (canDispatch) {
      this.add
        .zone(246, 682, 112, 50)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => {
          updateGameState(sendSelectedPartyToTower);
          this.scene.restart();
        });
    }

    createSceneHud(this, { title: "Inn View", activeLabel: "Inn" });
  }

  private drawBackdrop(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2f1d17).setOrigin(0, 0);
    this.add.rectangle(0, 620, GAME_WIDTH, 142, 0x211713).setOrigin(0, 0);
    this.add.line(0, 640, 16, 0, GAME_WIDTH - 16, 0, 0xb07742, 0.35).setOrigin(0, 0);
  }

  private drawInnShell(): void {
    this.add.rectangle(22, 120, 346, 520, 0x7a432d, 1).setStrokeStyle(3, 0xd89a58);
    this.add.polygon(GAME_WIDTH / 2, 121, [0, -28, 176, 0, -176, 0], 0x4a2a21, 1).setStrokeStyle(2, 0xd89a58);

    this.add.line(0, 330, 42, 0, 342, 0, 0xd89a58, 0.9).setOrigin(0, 0);
    this.add.line(0, 150, 196, 0, 196, 480, 0xd89a58, 0.85).setOrigin(0, 0);
    this.add.line(0, 330, 238, 0, 238, 310, 0xd89a58, 0.85).setOrigin(0, 0);

    this.add.text(GAME_WIDTH / 2, 136, "The Lantern Inn", {
      align: "center",
      color: "#fff0ce",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "15px",
      fontStyle: "700"
    }).setOrigin(0.5);
  }

  private drawBedRoom(room: InnRoomState | null): void {
    this.add.rectangle(42, 154, 132, 164, 0x8f5935, 1).setStrokeStyle(2, 0xffcc7d);
    this.add.text(56, 170, `Bed Lv${room?.level ?? 0}`, {
      color: "#fff0ce",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px",
      fontStyle: "700"
    });

    this.add.rectangle(58, 220, 82, 48, 0x4d2d23, 1).setStrokeStyle(2, 0xf1c76f).setOrigin(0, 0);
    this.add.rectangle(64, 226, 27, 17, 0xffe2b0, 1).setOrigin(0, 0);
    this.add.rectangle(94, 228, 40, 34, 0xd86c58, 1).setOrigin(0, 0);
    this.add.circle(146, 292, 10, 0xffd86f, 0.9);
    this.add.text(58, 286, "HP rest", {
      color: "#ffe7a3",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "12px"
    });
  }

  private drawTrainingRoom(room: InnRoomState | null): void {
    const isUnlocked = Boolean(room?.isUnlocked);

    this.add.rectangle(218, 154, 128, 164, isUnlocked ? 0x76503b : 0x3b312c, 1).setStrokeStyle(
      2,
      isUnlocked ? 0xffcc7d : 0x7a6758
    );
    this.add.text(230, 170, isUnlocked ? `Training Lv${room?.level ?? 0}` : "Training Locked", {
      color: isUnlocked ? "#fff0ce" : "#c9b8a6",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "12px",
      fontStyle: "700"
    });

    this.add.line(0, 278, 278, 0, 278, 48, isUnlocked ? 0xf1c76f : 0x9f8d7d, 1).setOrigin(0, 0);
    this.add.circle(278, 242, 24, isUnlocked ? 0xf1c76f : 0x6d5a49, 1);
    this.add.circle(278, 242, 14, isUnlocked ? 0x7a432d : 0x3b312c, 1);
    this.add.circle(278, 242, 5, isUnlocked ? 0xfff0ce : 0x9f8d7d, 1);
    this.add.rectangle(250, 290, 56, 10, isUnlocked ? 0xb07742 : 0x6d5a49, 1);

    if (!isUnlocked) {
      this.add.rectangle(218, 154, 128, 164, 0x15110f, 0.36);
      this.add.line(0, 178, 232, 0, 332, 112, 0xc9b8a6, 0.45).setOrigin(0, 0);
      this.add.line(0, 306, 232, 0, 332, -112, 0xc9b8a6, 0.45).setOrigin(0, 0);
    }
  }

  private drawCommonRoom(partyName: string): void {
    this.add.rectangle(42, 344, 194, 238, 0x6f3d28, 1).setStrokeStyle(2, 0xd89a58);
    this.add.text(58, 358, partyName, {
      color: "#fff3df",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      fontStyle: "700"
    });

    this.add.circle(130, 452, 34, 0xf0a247, 0.76);
    this.add.circle(130, 452, 18, 0xffd86f, 0.95);
    this.add.rectangle(74, 512, 78, 32, 0x4d2d23, 1).setStrokeStyle(1, 0xb57745);
    this.add.rectangle(160, 506, 42, 44, 0x4d2d23, 1).setStrokeStyle(1, 0xb57745);
    this.add.text(74, 548, "common room", {
      color: "#f9dfbc",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "12px"
    });
  }

  private drawTowerGate(targetFloor: number, buttonLabel: string, canDispatch: boolean): void {
    this.add.rectangle(246, 344, 96, 238, 0x543526, 1).setStrokeStyle(2, 0xd89a58);
    this.add.text(268, 360, `Target F${targetFloor}`, {
      color: "#ffe7a3",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px",
      fontStyle: "700"
    });

    this.add.rectangle(272, 428, 44, 86, 0x1f1a1a, 1).setStrokeStyle(2, 0xa8d7ff);
    this.add.circle(294, 428, 22, 0x1f1a1a, 1).setStrokeStyle(2, 0xa8d7ff);
    this.add.circle(304, 476, 3, 0xffd86f, 1);
    this.add.line(0, 560, 292, 0, 330, 84, 0xa8d7ff, 0.5).setOrigin(0, 0);
    this.add.line(0, 610, 292, 0, 330, -84, 0xa8d7ff, 0.35).setOrigin(0, 0);
    this.add.text(262, 522, "Tower Gate", {
      color: "#d7e8ff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "12px"
    });

    this.add.rectangle(246, 682, 112, 50, canDispatch ? 0xf0a247 : 0x6d5a49, 1).setStrokeStyle(
      2,
      canDispatch ? 0xffd86f : 0x9a8068
    ).setOrigin(0, 0);
    this.add.text(302, 707, buttonLabel, {
      align: "center",
      color: canDispatch ? "#251611" : "#ead8c7",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "14px",
      fontStyle: "700",
      wordWrap: { width: 92 }
    }).setOrigin(0.5);
  }

  private drawToast(message: string, isWarning: boolean): void {
    this.add.rectangle(36, 602, 204, 44, isWarning ? 0x6b4724 : 0x4d2d23, 0.96).setStrokeStyle(
      1,
      isWarning ? 0xffd86f : 0xb57745
    ).setOrigin(0, 0);
    this.add.text(50, 614, message, {
      color: isWarning ? "#ffe7a3" : "#f9dfbc",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px",
      wordWrap: { width: 176 }
    });
  }

  private drawHero(hero: HeroInstance): void {
    const maxHp = heroDefinitions[hero.classId]?.baseStats.hp ?? hero.currentHp;
    const hpRatio = Phaser.Math.Clamp(hero.currentHp / maxHp, 0, 1);
    const position = getHeroPosition(hero.status);

    if (hero.status === "in_tower") {
      this.drawAwayMarker(hero, maxHp, position.x, position.y);
      return;
    }

    this.add.rectangle(position.x, position.y + 23, 40, 8, 0x231713, 0.35);
    this.add.rectangle(position.x, position.y + 4, 22, 30, 0x465f8e, 1).setStrokeStyle(1, 0xffd86f);
    this.add.circle(position.x, position.y - 17, 13, 0xffd86f, 1);
    this.add.rectangle(position.x - 13, position.y - 25, 26, 7, 0x8f5935, 1).setOrigin(0, 0);
    this.add.rectangle(position.x + 16, position.y + 4, 5, 24, 0xc9b8a6, 1);

    if (hero.status === "defeated") {
      this.add.line(0, position.y, position.x - 18, 0, position.x + 18, 0, 0xffe7a3, 0.8).setOrigin(0, 0);
    }

    this.drawHeroLabels(hero, maxHp, hpRatio, position.x - 52, position.y - 66);
  }

  private drawAwayMarker(hero: HeroInstance, maxHp: number, x: number, y: number): void {
    this.add.circle(x, y, 12, 0xffd86f, 0.95);
    this.add.rectangle(x - 8, y + 10, 16, 24, 0xa8d7ff, 0.9).setOrigin(0, 0);
    this.add.line(0, y + 44, x - 18, 0, x + 18, 0, 0xa8d7ff, 0.55).setOrigin(0, 0);
    this.drawHeroLabels(hero, maxHp, 1, 246, 584);
  }

  private drawHeroLabels(hero: HeroInstance, maxHp: number, hpRatio: number, x: number, y: number): void {
    this.add.rectangle(x, y + 20, 84, 9, 0x2c1b17, 1).setOrigin(0, 0);
    this.add.rectangle(x, y + 20, 84 * hpRatio, 9, 0xd86c58, 1).setOrigin(0, 0);
    this.add.text(x, y, `${hero.name} Lv${hero.level}`, {
      color: "#fff3df",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "12px",
      fontStyle: "700"
    });
    this.add.text(x, y + 32, `HP ${hero.currentHp}/${maxHp}`, {
      color: "#f9dfbc",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "11px"
    });
    this.add.text(x, y + 46, formatStatus(hero.status), {
      color: hero.status === "in_tower" ? "#a8d7ff" : "#ffe7a3",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "11px"
    });
  }
}

function getHeroPosition(status: HeroStatus): { x: number; y: number } {
  if (status === "in_tower") {
    return { x: 294, y: 548 };
  }

  if (status === "resting" || status === "wounded" || status === "defeated") {
    return { x: 114, y: 292 };
  }

  return { x: 162, y: 488 };
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
