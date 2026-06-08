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
import { tickGameState } from "../systems/gameTickSystem";
import { sendSelectedPartyToTower } from "../systems/partyDispatchSystem";
import type { HeroInstance } from "../types/heroTypes";
import type { HeroStatus } from "../types/ids";
import type { InnRoomState } from "../types/roomTypes";
import type { TowerRunStatus } from "../types/towerTypes";
import {
  addCenteredLabel,
  addLabel,
  drawActionButton,
  drawDivider,
  drawHpBar,
  drawPanel,
  drawTinyHero,
  formatStatusLabel
} from "../ui/components";
import { createSceneHud } from "../ui/sceneHud";
import { UI_COLORS, UI_HEX } from "../ui/theme";

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
    const targetFloor = party?.selectedTargetFloor ?? run?.floor ?? state.unlockedFloor;
    const buttonLabel = isRunActive(run?.status) ? "Party in Tower" : canDispatch ? "Send to Tower" : "Party Not Ready";

    this.drawBackdrop();
    this.drawInnShell();
    this.drawBedRoom(bedRoom);
    this.drawTrainingRoom(trainingRoom);
    this.drawCommonRoom(party?.name ?? "No Party");
    this.drawTowerGate(targetFloor, buttonLabel, canDispatch);
    this.drawLatestEvent(latestEvent?.message ?? "The inn is waiting for orders.", latestEvent?.severity === "warning");

    if (hero) {
      this.drawHero(hero);
    }

    if (canDispatch) {
      drawActionButton(this, {
        x: 294,
        y: 696,
        width: 142,
        height: 54,
        label: buttonLabel,
        enabled: true,
        onClick: () => {
          updateGameState(sendSelectedPartyToTower);
          this.scene.start("TowerScene");
        }
      });
    } else {
      drawActionButton(this, {
        x: 294,
        y: 696,
        width: 142,
        height: 54,
        label: buttonLabel,
        enabled: false
      });
    }

    createSceneHud(this, { title: "Lantern Inn", activeLabel: "Inn" });
  }

  public update(_time: number, delta: number): void {
    const now = Date.now();
    updateGameState((currentState) => tickGameState(currentState, delta, now));
  }

  private drawBackdrop(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x241916).setOrigin(0, 0);
    this.add.rectangle(0, 104, GAME_WIDTH, 210, 0x332848, 1).setOrigin(0, 0);
    this.add.rectangle(0, 314, GAME_WIDTH, 448, 0x211713, 1).setOrigin(0, 0);
    this.add.polygon(325, 142, [0, -36, 28, 42, -28, 42], 0x171d29, 1);
    this.add.rectangle(311, 178, 28, 122, 0x171d29, 1);
    this.add.rectangle(0, 606, GAME_WIDTH, 156, 0x18110f, 1).setOrigin(0, 0);

    for (const star of [
      { x: 46, y: 132 },
      { x: 102, y: 164 },
      { x: 182, y: 128 },
      { x: 248, y: 158 },
      { x: 354, y: 124 }
    ]) {
      this.add.circle(star.x, star.y, 1.5, UI_COLORS.gold, 0.75);
    }
  }

  private drawInnShell(): void {
    drawPanel(this, 18, 126, 354, 512, UI_COLORS.timber, UI_COLORS.gold, 1, 6);
    this.add.polygon(GAME_WIDTH / 2, 126, [0, -38, 184, 0, -184, 0], UI_COLORS.darkTimber, 1).setStrokeStyle(2, UI_COLORS.gold);
    this.add.rectangle(36, 144, 318, 476, 0x7a432d, 1).setStrokeStyle(2, 0xe7ac64);
    drawDivider(this, 36, 330, 354, 330, UI_COLORS.gold, 0.8);
    drawDivider(this, 198, 144, 198, 620, UI_COLORS.gold, 0.75);
    drawDivider(this, 244, 330, 244, 620, UI_COLORS.gold, 0.75);

  }

  private drawBedRoom(room: InnRoomState | null): void {
    this.add.rectangle(52, 166, 126, 138, 0x8f5935, 1).setStrokeStyle(1, 0xffcc7d);
    addLabel(this, 60, 174, `Bed Room Lv${room?.level ?? 0}`, {
      color: UI_HEX.cream,
      fontSize: 12,
      fontStyle: "700",
      width: 112
    });

    this.add.rectangle(64, 218, 82, 46, 0x3a241d, 1).setStrokeStyle(2, UI_COLORS.gold).setOrigin(0, 0);
    this.add.rectangle(70, 224, 28, 16, 0xffe2b0, 1).setOrigin(0, 0);
    this.add.rectangle(100, 226, 38, 32, UI_COLORS.hearth, 1).setOrigin(0, 0);
    this.add.rectangle(142, 232, 10, 30, 0xb07742, 1).setOrigin(0, 0);
    this.add.circle(156, 286, 9, UI_COLORS.gold, 0.85);
    addLabel(this, 62, 274, "rest space", {
      color: UI_HEX.parchment,
      fontSize: 11
    });
  }

  private drawTrainingRoom(room: InnRoomState | null): void {
    const isUnlocked = Boolean(room?.isUnlocked);
    const fill = isUnlocked ? 0x76503b : 0x3a332e;

    this.add.rectangle(214, 166, 126, 138, fill, 1).setStrokeStyle(1, isUnlocked ? 0xffcc7d : 0x8a7a69);
    addLabel(this, 222, 174, isUnlocked ? `Training Lv${room?.level ?? 0}` : "Training Locked", {
      color: isUnlocked ? UI_HEX.cream : UI_HEX.mutedCream,
      fontSize: 12,
      fontStyle: "700",
      width: 112
    });

    this.add.line(0, 263, 278, 0, 278, 48, isUnlocked ? UI_COLORS.gold : 0xa39588, 1).setOrigin(0, 0);
    this.add.circle(278, 232, 24, isUnlocked ? UI_COLORS.gold : 0x6d5a49, 1);
    this.add.circle(278, 232, 14, isUnlocked ? 0x7a432d : 0x3b312c, 1);
    this.add.rectangle(244, 280, 68, 10, isUnlocked ? 0xb07742 : 0x6d5a49, 1).setOrigin(0, 0);

    if (!isUnlocked) {
      this.add.rectangle(214, 166, 126, 138, 0x11100f, 0.32);
      drawDivider(this, 226, 196, 328, 288, UI_COLORS.mutedCream, 0.45);
      drawDivider(this, 328, 196, 226, 288, UI_COLORS.mutedCream, 0.45);
    }
  }

  private drawCommonRoom(partyName: string): void {
    this.add.rectangle(52, 350, 176, 204, 0x6f3d28, 1).setStrokeStyle(1, 0xe7ac64);
    addLabel(this, 60, 360, partyName, {
      color: UI_HEX.cream,
      fontSize: 14,
      fontStyle: "700",
      width: 154
    });

    this.add.circle(122, 442, 36, UI_COLORS.amber, 0.55);
    this.add.circle(122, 442, 20, UI_COLORS.gold, 0.95);
    this.add.rectangle(72, 494, 74, 30, 0x3a241d, 1).setStrokeStyle(1, 0xb57745);
    this.add.rectangle(154, 488, 44, 42, 0x3a241d, 1).setStrokeStyle(1, 0xb57745);
    addLabel(this, 70, 532, "hearth and party table", {
      color: UI_HEX.parchment,
      fontSize: 11,
      width: 150
    });
  }

  private drawTowerGate(targetFloor: number, buttonLabel: string, canDispatch: boolean): void {
    this.add.rectangle(258, 350, 76, 204, 0x543526, 1).setStrokeStyle(1, 0xe7ac64);
    addCenteredLabel(this, 296, 364, `Target F${targetFloor}`, {
      color: UI_HEX.gold,
      fontSize: 12,
      fontStyle: "700",
      width: 70
    });

    this.add.rectangle(276, 421, 40, 88, 0x151922, 1).setStrokeStyle(2, UI_COLORS.skyBlue);
    this.add.circle(296, 421, 20, 0x151922, 1).setStrokeStyle(2, UI_COLORS.skyBlue);
    this.add.circle(306, 472, 3, UI_COLORS.gold, 1);
    this.add.line(0, 552, 296, 0, 296, 92, UI_COLORS.skyBlue, 0.35).setOrigin(0, 0);
    this.add.line(0, 610, 276, 0, 246, 76, UI_COLORS.skyBlue, 0.24).setOrigin(0, 0);
    this.add.line(0, 610, 314, 0, 344, 76, UI_COLORS.skyBlue, 0.24).setOrigin(0, 0);
    addCenteredLabel(this, 296, 526, "tower gate", {
      color: UI_HEX.skyBlue,
      fontSize: 11,
      fontStyle: "700"
    });
    addCenteredLabel(this, 294, 655, canDispatch ? "path is clear" : buttonLabel, {
      color: canDispatch ? UI_HEX.success : UI_HEX.mutedCream,
      fontSize: 11,
      width: 140
    });
  }

  private drawLatestEvent(message: string, isWarning: boolean): void {
    drawPanel(this, 36, 650, 196, 60, isWarning ? 0x6b4724 : 0x3a241d, isWarning ? UI_COLORS.gold : 0xb57745, 0.98, 7);
    addLabel(this, 50, 660, "Latest", {
      color: isWarning ? UI_HEX.gold : UI_HEX.parchment,
      fontSize: 11,
      fontStyle: "700"
    });
    addLabel(this, 50, 678, message, {
      color: isWarning ? UI_HEX.gold : UI_HEX.mutedCream,
      fontSize: 12,
      width: 168
    });
  }

  private drawHero(hero: HeroInstance): void {
    const maxHp = heroDefinitions[hero.classId]?.baseStats.hp ?? Math.max(1, hero.currentHp);
    const hpRatio = Phaser.Math.Clamp(hero.currentHp / Math.max(1, maxHp), 0, 1);
    const position = getHeroPosition(hero.status);
    const palette = hero.status === "in_tower" ? "away" : hero.status === "defeated" ? "defeated" : "hero";

    drawTinyHero(this, position.x, position.y, {
      hpRatio,
      palette
    });

    const labelPosition = getHeroLabelPosition(hero.status);
    addLabel(this, labelPosition.x, labelPosition.y, `${hero.name} Lv ${hero.level}`, {
      color: UI_HEX.cream,
      fontSize: 11,
      fontStyle: "700",
      width: 116
    });
    drawHpBar(this, labelPosition.x, labelPosition.y + 36, 106, 8, hpRatio, `HP ${hero.currentHp}/${maxHp}`);
    addLabel(this, labelPosition.x, labelPosition.y + 50, formatStatusLabel(hero.status), {
      color: hero.status === "in_tower" ? UI_HEX.skyBlue : UI_HEX.gold,
      fontSize: 10,
      width: 106
    });
  }
}

function getHeroPosition(status: HeroStatus): { x: number; y: number } {
  if (status === "in_tower") {
    return { x: 296, y: 574 };
  }

  if (status === "resting" || status === "wounded" || status === "defeated") {
    return { x: 116, y: 282 };
  }

  return { x: 164, y: 470 };
}

function getHeroLabelPosition(status: HeroStatus): { x: number; y: number } {
  if (status === "in_tower") {
    return { x: 248, y: 568 };
  }

  if (status === "resting" || status === "wounded" || status === "defeated") {
    return { x: 58, y: 190 };
  }

  return { x: 60, y: 382 };
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
