import Phaser from "phaser";
import { automationDefinitions } from "../data/automationData";
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
import { calculateReturnHealingAmount, calculateTrainingRoomAttackBonus } from "../systems/roomEffectSystem";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { HeroStatus } from "../types/ids";
import type { InnRoomState } from "../types/roomTypes";
import type { TowerRunStatus } from "../types/towerTypes";
import {
  addCenteredLabel,
  addLabel,
  drawDivider,
  drawHpBar,
  drawPanel,
  drawTinyHero,
  formatStatusLabel
} from "../ui/components";
import { createSceneHud } from "../ui/sceneHud";
import { UI_COLORS, UI_HEX } from "../ui/theme";

const INN_WORLD_WIDTH = 1260;
const INN_INITIAL_SCROLL_X = 330;
const WORLD_DRAG_TOP = 108;
const WORLD_DRAG_BOTTOM = GAME_HEIGHT - 92;
const MAX_CAMERA_SCROLL_X = INN_WORLD_WIDTH - GAME_WIDTH;

export class InnScene extends Phaser.Scene {
  private isDraggingWorld = false;
  private didDragWorld = false;
  private dragStartX = 0;
  private lastPointerX = 0;

  public constructor() {
    super("InnScene");
  }

  public create(): void {
    const state = getGameState();
    const party = getSelectedParty(state);
    const run = getSelectedTowerRun(state);
    const hero = party ? getFirstPartyHero(state, party.id) : null;
    const bedRoom = getInnRoom(state, "bed_room");
    const bedRoomHealing = calculateReturnHealingAmount(state);
    const trainingRoom = getInnRoom(state, "training_room");
    const trainingRoomAttackBonus = calculateTrainingRoomAttackBonus(state);
    const latestEvent = state.recentEvents[0];
    const canDispatch =
      Boolean(party && hero && run) &&
      !isRunActive(run?.status) &&
      !isHeroUnavailable(hero?.status);
    const targetFloor = party?.selectedTargetFloor ?? run?.floor ?? state.unlockedFloor;
    const buttonLabel = isRunActive(run?.status) ? "Party in Tower" : canDispatch ? "Send to Tower" : "Party Not Ready";
    const autoDispatchLabel = getAutoDispatchLabel(state);

    this.configureCamera();
    this.drawWorldBackdrop();
    this.drawInnBase();
    this.drawBedRoom(bedRoom, bedRoomHealing);
    this.drawCommonRoom(party?.name ?? "No Party", latestEvent?.message ?? "The inn is waiting for orders.", latestEvent?.severity === "warning");
    this.drawTrainingRoom(trainingRoom, trainingRoomAttackBonus);
    this.drawTowerGate(targetFloor, buttonLabel, canDispatch, autoDispatchLabel);
    this.drawDragHints();

    if (hero) {
      this.drawHero(hero);
    }

    this.enableCameraDrag();

    const worldChildCount = this.children.list.length;
    createSceneHud(this, { title: "Lantern Inn", activeLabel: "Inn" });
    this.fixChildrenAddedAfter(worldChildCount);
  }

  public update(_time: number, delta: number): void {
    const now = Date.now();
    updateGameState((currentState) => tickGameState(currentState, delta, now));
  }

  private configureCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, INN_WORLD_WIDTH, GAME_HEIGHT);
    camera.setScroll(INN_INITIAL_SCROLL_X, 0);
  }

  private enableCameraDrag(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < WORLD_DRAG_TOP || pointer.y > WORLD_DRAG_BOTTOM) {
        return;
      }

      this.isDraggingWorld = true;
      this.didDragWorld = false;
      this.dragStartX = pointer.x;
      this.lastPointerX = pointer.x;
      this.input.setDefaultCursor("grabbing");
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDraggingWorld || !pointer.isDown) {
        return;
      }

      const deltaX = pointer.x - this.lastPointerX;
      if (Math.abs(deltaX) > 0.1) {
        const camera = this.cameras.main;
        camera.scrollX = Phaser.Math.Clamp(camera.scrollX - deltaX, 0, MAX_CAMERA_SCROLL_X);
        this.lastPointerX = pointer.x;
      }

      if (Math.abs(pointer.x - this.dragStartX) > 6) {
        this.didDragWorld = true;
      }
    });

    this.input.on("pointerup", () => this.stopCameraDrag());
    this.input.on("pointerupoutside", () => this.stopCameraDrag());
    this.input.setDefaultCursor("grab");
  }

  private stopCameraDrag(): void {
    this.isDraggingWorld = false;
    this.input.setDefaultCursor("grab");
  }

  private drawWorldBackdrop(): void {
    this.add.rectangle(0, 0, INN_WORLD_WIDTH, GAME_HEIGHT, 0x241916).setOrigin(0, 0);
    this.add.rectangle(0, 104, INN_WORLD_WIDTH, 214, 0x2a2844, 1).setOrigin(0, 0);
    this.add.rectangle(0, 318, INN_WORLD_WIDTH, 444, 0x211713, 1).setOrigin(0, 0);
    this.add.rectangle(0, 640, INN_WORLD_WIDTH, 122, 0x17100e, 1).setOrigin(0, 0);

    for (let x = 38; x < INN_WORLD_WIDTH; x += 78) {
      const y = 122 + ((x * 17) % 54);
      this.add.circle(x, y, 1.4, UI_COLORS.gold, 0.65);
    }

    for (const hill of [
      { x: 120, width: 260, height: 112 },
      { x: 410, width: 340, height: 138 },
      { x: 770, width: 290, height: 104 },
      { x: 1090, width: 350, height: 148 }
    ]) {
      this.add.ellipse(hill.x, 318, hill.width, hill.height, 0x171d29, 0.88);
    }

    this.add.rectangle(24, 622, INN_WORLD_WIDTH - 48, 18, 0x3a241d, 1).setStrokeStyle(1, 0x8f5935);
    this.add.rectangle(54, 634, INN_WORLD_WIDTH - 108, 42, 0x5b3425, 1);
    this.add.rectangle(0, 676, INN_WORLD_WIDTH, 86, 0x2a1a16, 1).setOrigin(0, 0);
  }

  private drawInnBase(): void {
    this.add.rectangle(56, 560, 970, 50, 0x3a241d, 1).setOrigin(0, 0).setStrokeStyle(2, 0xb57745);
    this.add.rectangle(90, 602, 896, 26, 0x251611, 1).setOrigin(0, 0);

    for (const x of [106, 310, 392, 650, 728, 944]) {
      this.add.rectangle(x, 194, 12, 384, UI_COLORS.darkTimber, 1).setStrokeStyle(1, 0xe7ac64);
    }

    drawDivider(this, 260, 628, 420, 628, UI_COLORS.gold, 0.55);
    drawDivider(this, 650, 628, 754, 628, UI_COLORS.gold, 0.55);
    drawDivider(this, 956, 628, 1088, 628, UI_COLORS.skyBlue, 0.55);

    addLabel(this, 480, 714, "Drag to inspect inn", {
      color: UI_HEX.mutedCream,
      fontSize: 12,
      fontStyle: "700",
      width: 170
    });
    addCenteredLabel(this, 330, 716, "< Bed", {
      color: UI_HEX.gold,
      fontSize: 12,
      fontStyle: "700",
      width: 70
    });
    addCenteredLabel(this, 705, 716, "Gate >", {
      color: UI_HEX.skyBlue,
      fontSize: 12,
      fontStyle: "700",
      width: 80
    });
  }

  private drawBedRoom(room: InnRoomState | null, healingAmount: number): void {
    this.drawRoomShell(74, 198, 246, 362, 0x8f5935, "Bed Room", `Lv ${room?.level ?? 0}`, UI_HEX.cream);

    this.add.rectangle(116, 388, 144, 58, 0x3a241d, 1).setOrigin(0, 0).setStrokeStyle(2, UI_COLORS.gold);
    this.add.rectangle(126, 398, 46, 22, 0xffe2b0, 1).setOrigin(0, 0);
    this.add.rectangle(176, 400, 74, 38, UI_COLORS.hearth, 1).setOrigin(0, 0);
    this.add.rectangle(258, 405, 14, 42, 0xb07742, 1).setOrigin(0, 0);

    this.add.rectangle(102, 494, 182, 26, 0x4d2d22, 1).setStrokeStyle(1, 0xd39b5f);
    addCenteredLabel(this, 193, 507, "Recovery room", {
      color: UI_HEX.parchment,
      fontSize: 11,
      fontStyle: "700",
      width: 150
    });
    addCenteredLabel(this, 193, 536, `Rest +${healingAmount} HP`, {
      color: UI_HEX.gold,
      fontSize: 11,
      fontStyle: "700",
      width: 150
    });

    this.add.circle(292, 236, 18, UI_COLORS.gold, 0.76);
    this.add.circle(292, 236, 8, 0xffecb3, 1);
  }

  private drawCommonRoom(partyName: string, eventMessage: string, isWarning: boolean): void {
    const compactPartyName = partyName === "Lantern Party" ? "Party" : partyName;

    this.drawRoomShell(382, 236, 286, 328, 0x6f3d28, "Hearth Hall", compactPartyName, UI_HEX.gold);

    this.add.circle(522, 414, 64, UI_COLORS.amber, 0.34);
    this.add.circle(522, 414, 34, UI_COLORS.gold, 0.95);
    this.add.circle(522, 414, 16, UI_COLORS.hearth, 1);
    this.add.rectangle(474, 466, 100, 36, 0x3a241d, 1).setStrokeStyle(1, 0xb57745);
    this.add.rectangle(590, 456, 46, 54, 0x3a241d, 1).setStrokeStyle(1, 0xb57745);
    this.add.rectangle(410, 474, 44, 34, 0x3a241d, 1).setStrokeStyle(1, 0xb57745);

    drawPanel(this, 414, 286, 214, 62, isWarning ? 0x6b4724 : 0x3a241d, isWarning ? UI_COLORS.gold : 0xb57745, 0.96, 6);
    addLabel(this, 430, 296, "Latest", {
      color: isWarning ? UI_HEX.gold : UI_HEX.parchment,
      fontSize: 11,
      fontStyle: "700"
    });
    addLabel(this, 430, 314, eventMessage, {
      color: isWarning ? UI_HEX.gold : UI_HEX.mutedCream,
      fontSize: 12,
      width: 180
    });

    addCenteredLabel(this, 522, 536, "common hearth", {
      color: UI_HEX.parchment,
      fontSize: 11,
      fontStyle: "700",
      width: 140
    });
  }

  private drawTrainingRoom(room: InnRoomState | null, attackBonus: number): void {
    const isUnlocked = Boolean(room?.isUnlocked);
    const fill = isUnlocked ? 0x76503b : 0x3a332e;

    this.drawRoomShell(
      724,
      198,
      240,
      362,
      fill,
      isUnlocked ? "Training Room" : "Locked Wing",
      isUnlocked ? `Lv ${room?.level ?? 0}` : "Floor 2",
      isUnlocked ? UI_HEX.cream : UI_HEX.mutedCream
    );

    this.add.circle(844, 384, 36, isUnlocked ? UI_COLORS.gold : 0x6d5a49, 1);
    this.add.circle(844, 384, 21, isUnlocked ? 0x7a432d : 0x3b312c, 1);
    this.add.rectangle(840, 420, 8, 66, isUnlocked ? 0xb07742 : 0x6d5a49, 1);
    this.add.rectangle(794, 488, 102, 12, isUnlocked ? 0xb07742 : 0x6d5a49, 1);
    drawDivider(this, 778, 432, 812, 388, isUnlocked ? UI_COLORS.gold : UI_COLORS.mutedCream, 0.7);
    drawDivider(this, 910, 432, 876, 388, isUnlocked ? UI_COLORS.gold : UI_COLORS.mutedCream, 0.7);

    if (isUnlocked) {
      addCenteredLabel(this, 844, 536, `Train +${attackBonus} ATK`, {
        color: UI_HEX.gold,
        fontSize: 11,
        fontStyle: "700",
        width: 142
      });
    }

    if (!isUnlocked) {
      this.add.rectangle(724, 198, 240, 362, 0x11100f, 0.3).setOrigin(0, 0);
      drawDivider(this, 762, 270, 926, 510, UI_COLORS.mutedCream, 0.42);
      drawDivider(this, 926, 270, 762, 510, UI_COLORS.mutedCream, 0.42);
    }
  }

  private drawTowerGate(targetFloor: number, buttonLabel: string, canDispatch: boolean, autoDispatchLabel: string): void {
    this.add.rectangle(1038, 212, 164, 352, 0x543526, 1).setOrigin(0, 0).setStrokeStyle(2, 0xe7ac64);
    this.add.polygon(1120, 212, [0, -58, 104, 0, -104, 0], UI_COLORS.darkTimber, 1).setStrokeStyle(2, UI_COLORS.skyBlue);
    addCenteredLabel(this, 1120, 242, `Target F${targetFloor}`, {
      color: UI_HEX.skyBlue,
      fontSize: 13,
      fontStyle: "700",
      width: 130
    });

    this.add.rectangle(1086, 326, 68, 136, 0x151922, 1).setStrokeStyle(3, UI_COLORS.skyBlue);
    this.add.circle(1120, 326, 34, 0x151922, 1).setStrokeStyle(3, UI_COLORS.skyBlue);
    this.add.circle(1138, 404, 4, UI_COLORS.gold, 1);
    this.add.line(0, 466, 1120, 0, 1120, 112, UI_COLORS.skyBlue, 0.35).setOrigin(0, 0);
    this.add.line(0, 608, 1098, 0, 1058, 70, UI_COLORS.skyBlue, 0.24).setOrigin(0, 0);
    this.add.line(0, 608, 1142, 0, 1182, 70, UI_COLORS.skyBlue, 0.24).setOrigin(0, 0);
    addCenteredLabel(this, 1120, 502, "tower gate", {
      color: UI_HEX.skyBlue,
      fontSize: 12,
      fontStyle: "700",
      width: 120
    });
    addCenteredLabel(this, 1120, 536, autoDispatchLabel, {
      color: autoDispatchLabel === "Auto: ON" ? UI_HEX.success : UI_HEX.mutedCream,
      fontSize: 11,
      fontStyle: "700",
      width: 118
    });

    this.drawGateAction(1120, 676, buttonLabel, canDispatch);
  }

  private drawGateAction(x: number, y: number, label: string, enabled: boolean): void {
    const fill = enabled ? UI_COLORS.amber : 0x5d5249;
    const stroke = enabled ? UI_COLORS.gold : 0x8a7a69;

    drawPanel(this, x - 82, y - 27, 164, 54, fill, stroke, 1, 7);
    addCenteredLabel(this, x, y, label, {
      color: enabled ? UI_HEX.dark : UI_HEX.mutedCream,
      fontSize: 14,
      fontStyle: "700",
      width: 138
    });
    addCenteredLabel(this, x, y - 44, enabled ? "path is clear" : "gate closed", {
      color: enabled ? UI_HEX.success : UI_HEX.mutedCream,
      fontSize: 11,
      fontStyle: "700",
      width: 132
    });

    const zone = this.add.zone(x, y, 164, 54).setOrigin(0.5);
    if (enabled) {
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerup", () => {
        if (this.didDragWorld) {
          return;
        }

        updateGameState(sendSelectedPartyToTower);
        this.scene.start("TowerScene");
      });
    }
  }

  private drawDragHints(): void {
    this.add.rectangle(350, 688, 22, 2, UI_COLORS.gold, 0.7);
    this.add.triangle(336, 688, 0, 0, 12, -7, 12, 7, UI_COLORS.gold, 0.7);
    this.add.rectangle(686, 688, 22, 2, UI_COLORS.skyBlue, 0.7);
    this.add.triangle(708, 688, 0, 0, -12, -7, -12, 7, UI_COLORS.skyBlue, 0.7);
  }

  private drawRoomShell(
    x: number,
    y: number,
    width: number,
    height: number,
    fill: number,
    title: string,
    subtitle: string,
    subtitleColor: string
  ): void {
    this.add.rectangle(x, y, width, height, fill, 1).setOrigin(0, 0).setStrokeStyle(2, 0xe7ac64);
    this.add.polygon(x + width / 2, y, [0, -42, width / 2 + 18, 0, -width / 2 - 18, 0], UI_COLORS.darkTimber, 1).setStrokeStyle(2, UI_COLORS.gold);
    this.add.rectangle(x + 16, y + 18, width - 32, 32, 0x3a241d, 0.92).setOrigin(0, 0).setStrokeStyle(1, 0xb57745);
    addLabel(this, x + 28, y + 26, title, {
      color: UI_HEX.cream,
      fontSize: 13,
      fontStyle: "700",
      width: width - 92
    });
    addLabel(this, x + width - 72, y + 26, subtitle, {
      color: subtitleColor,
      fontSize: 12,
      fontStyle: "700",
      width: 58,
      align: "right"
    });
  }

  private drawHero(hero: HeroInstance): void {
    const maxHp = heroDefinitions[hero.classId]?.baseStats.hp ?? Math.max(1, hero.currentHp);
    const hpRatio = Phaser.Math.Clamp(hero.currentHp / Math.max(1, maxHp), 0, 1);
    const position = getHeroPosition(hero.status);
    const labelPosition = getHeroLabelPosition(hero.status);
    const palette = hero.status === "in_tower" ? "away" : hero.status === "defeated" ? "defeated" : "hero";

    drawTinyHero(this, position.x, position.y, {
      hpRatio,
      palette
    });

    addLabel(this, labelPosition.x, labelPosition.y, `${hero.name} Lv ${hero.level}`, {
      color: UI_HEX.cream,
      fontSize: 11,
      fontStyle: "700",
      width: 118
    });
    drawHpBar(this, labelPosition.x, labelPosition.y + 34, 108, 8, hpRatio, `HP ${hero.currentHp}/${maxHp}`);
    addLabel(this, labelPosition.x, labelPosition.y + 48, formatStatusLabel(hero.status), {
      color: hero.status === "in_tower" ? UI_HEX.skyBlue : UI_HEX.gold,
      fontSize: 10,
      width: 108
    });
  }

  private fixChildrenAddedAfter(startIndex: number): void {
    this.children.list.slice(startIndex).forEach((child) => {
      const maybeFixed = child as Phaser.GameObjects.GameObject & {
        setScrollFactor?: (x: number, y?: number) => Phaser.GameObjects.GameObject;
      };
      maybeFixed.setScrollFactor?.(0);
    });
  }
}

function getHeroPosition(status: HeroStatus): { x: number; y: number } {
  if (status === "in_tower") {
    return { x: 1118, y: 558 };
  }

  if (status === "resting" || status === "wounded" || status === "defeated") {
    return { x: 194, y: 458 };
  }

  return { x: 522, y: 492 };
}

function getHeroLabelPosition(status: HeroStatus): { x: number; y: number } {
  if (status === "in_tower") {
    return { x: 1064, y: 548 };
  }

  if (status === "resting" || status === "wounded" || status === "defeated") {
    return { x: 130, y: 282 };
  }

  return { x: 458, y: 358 };
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

function getAutoDispatchLabel(state: GameState): string {
  if (state.automation.autoDispatchLevel <= 0) {
    return "Auto: locked";
  }

  return state.automation.enabled[automationDefinitions.auto_dispatch_board.automationId] ? "Auto: ON" : "Auto: OFF";
}
