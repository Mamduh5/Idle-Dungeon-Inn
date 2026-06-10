import Phaser from "phaser";
import {
  handleInnSelectNextTrainingHero,
  handleInnSelectPreviousTrainingHero,
  handleInnSendSelectedParty,
  handleInnToggleAutoDispatch,
  handleInnTrainingAction
} from "../application/innCommands";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { getGameState, updateGameState } from "../state/gameStore";
import { tickGameState } from "../systems/gameTickSystem";
import type { HeroStatus } from "../types/ids";
import {
  getInnViewModel,
  type InnBedRoomViewModel,
  type InnGateViewModel,
  type InnHeroViewModel,
  type InnRoomCardViewModel,
  type InnTrainingRoomViewModel
} from "../viewModels/innViewModel";
import { getInnCameraScrollForCreate } from "../ui/innCameraScroll";
import {
  addCenteredLabel,
  addLabel,
  drawActionButton,
  drawDivider,
  drawHpBar,
  drawPanel,
  drawTinyHero
} from "../ui/components";
import { createSceneHud } from "../ui/sceneHud";
import { UI_COLORS, UI_HEX } from "../ui/theme";

const INN_WORLD_WIDTH = 1480;
const INN_INITIAL_SCROLL_X = 330;
const WORLD_DRAG_TOP = 108;
const WORLD_DRAG_BOTTOM = GAME_HEIGHT - 92;
const MAX_CAMERA_SCROLL_X = INN_WORLD_WIDTH - GAME_WIDTH;

type InnSceneCreateData = {
  scrollX?: number;
};

export class InnScene extends Phaser.Scene {
  private isDraggingWorld = false;
  private didDragWorld = false;
  private dragStartX = 0;
  private lastPointerX = 0;

  public constructor() {
    super("InnScene");
  }

  public create(data: InnSceneCreateData = {}): void {
    const state = getGameState();
    const viewModel = getInnViewModel(state);

    this.configureCamera(data.scrollX);
    this.drawWorldBackdrop();
    this.drawInnBase();
    this.drawBedRoom(viewModel.bedRoom);
    this.drawCommonRoom(
      viewModel.commonRoomSubtitle,
      viewModel.latestMessage,
      viewModel.isWarning,
      viewModel.offlineReportMessage,
      viewModel.bottleneckMessage
    );
    this.drawTrainingRoom(viewModel.trainingRoom);
    this.drawExtraRoomCards(viewModel.extraRooms);
    this.drawTowerGate(viewModel.gate, viewModel.autoDispatch.label, viewModel.autoDispatch.isUnlocked);
    this.drawDragHints();

    this.drawHeroes(viewModel.heroes.length > 0 ? viewModel.heroes : viewModel.hero ? [viewModel.hero] : []);

    this.enableCameraDrag();

    const worldChildCount = this.children.list.length;
    createSceneHud(this, { title: "Lantern Inn", activeLabel: "Inn" });
    this.fixChildrenAddedAfter(worldChildCount);
  }

  public update(_time: number, delta: number): void {
    const now = Date.now();
    updateGameState((currentState) => tickGameState(currentState, delta, now));
  }

  private configureCamera(savedScrollX?: number): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, INN_WORLD_WIDTH, GAME_HEIGHT);
    camera.setScroll(getInnCameraScrollForCreate(savedScrollX, INN_INITIAL_SCROLL_X, MAX_CAMERA_SCROLL_X), 0);
  }

  private restartWithCurrentScroll(): void {
    this.scene.restart({ scrollX: this.cameras.main.scrollX } satisfies InnSceneCreateData);
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
      { x: 1090, width: 350, height: 148 },
      { x: 1360, width: 240, height: 118 }
    ]) {
      this.add.ellipse(hill.x, 318, hill.width, hill.height, 0x171d29, 0.88);
    }

    this.add.rectangle(24, 622, INN_WORLD_WIDTH - 48, 18, 0x3a241d, 1).setStrokeStyle(1, 0x8f5935);
    this.add.rectangle(54, 634, INN_WORLD_WIDTH - 108, 42, 0x5b3425, 1);
    this.add.rectangle(0, 676, INN_WORLD_WIDTH, 86, 0x2a1a16, 1).setOrigin(0, 0);
  }

  private drawInnBase(): void {
    this.add.rectangle(56, 560, 1138, 50, 0x3a241d, 1).setOrigin(0, 0).setStrokeStyle(2, 0xb57745);
    this.add.rectangle(90, 602, 1070, 26, 0x251611, 1).setOrigin(0, 0);

    for (const x of [106, 310, 392, 650, 728, 944, 1218, 1390]) {
      this.add.rectangle(x, 194, 12, 384, UI_COLORS.darkTimber, 1).setStrokeStyle(1, 0xe7ac64);
    }

    drawDivider(this, 260, 628, 420, 628, UI_COLORS.gold, 0.55);
    drawDivider(this, 650, 628, 754, 628, UI_COLORS.gold, 0.55);
    drawDivider(this, 956, 628, 1088, 628, UI_COLORS.skyBlue, 0.55);
    drawDivider(this, 1160, 628, 1396, 628, UI_COLORS.gold, 0.38);

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
    addCenteredLabel(this, 705, 716, "Rooms >", {
      color: UI_HEX.skyBlue,
      fontSize: 12,
      fontStyle: "700",
      width: 100
    });
  }

  private drawBedRoom(room: InnBedRoomViewModel): void {
    this.drawRoomShell(74, 198, 246, 362, 0x8f5935, "Bed Room", room.levelLabel, UI_HEX.cream);

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
    addCenteredLabel(this, 193, 532, room.healingSpeedLabel, {
      color: UI_HEX.gold,
      fontSize: 11,
      fontStyle: "700",
      width: 150
    });
    addCenteredLabel(this, 193, 550, room.capacityLabel, {
      color: UI_HEX.mutedCream,
      fontSize: 10,
      width: 150
    });

    if (room.heroStatusLabel) {
      addCenteredLabel(this, 193, 470, room.heroStatusLabel, {
        color: room.heroStatusIsActive ? UI_HEX.success : UI_HEX.parchment,
        fontSize: 10,
        fontStyle: "700",
        width: 150
      });
      addCenteredLabel(this, 193, 486, room.readyHpLabel ?? "", {
        color: UI_HEX.mutedCream,
        fontSize: 10,
        width: 150
      });
    }

    if (room.recommendationBadge) {
      this.drawRoomRecommendationBadge(98, 260, room.recommendationBadge);
    }

    this.add.circle(292, 236, 18, UI_COLORS.gold, 0.76);
    this.add.circle(292, 236, 8, 0xffecb3, 1);
  }

  private drawCommonRoom(
    partyName: string,
    eventMessage: string,
    isWarning: boolean,
    offlineReportMessage: string | undefined,
    bottleneckMessage: string | undefined
  ): void {
    this.drawRoomShell(382, 236, 286, 328, 0x6f3d28, "Hearth Hall", partyName, UI_HEX.gold);

    if (offlineReportMessage) {
      this.drawAwayReport(414, 122, offlineReportMessage);
    }

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

    if (bottleneckMessage) {
      drawPanel(this, 414, 354, 214, 54, 0x101722, UI_COLORS.skyBlue, 0.96, 6);
      addLabel(this, 430, 364, "Upgrade advice", {
        color: UI_HEX.skyBlue,
        fontSize: 11,
        fontStyle: "700"
      });
      addLabel(this, 430, 382, bottleneckMessage, {
        color: UI_HEX.cream,
        fontSize: 10,
        width: 184
      });
    }

    addCenteredLabel(this, 522, 536, "common hearth", {
      color: UI_HEX.parchment,
      fontSize: 11,
      fontStyle: "700",
      width: 140
    });
  }

  private drawAwayReport(x: number, y: number, message: string): void {
    drawPanel(this, x, y, 214, 92, 0x183829, UI_COLORS.gold, 0.96, 7);
    addLabel(this, x + 14, y + 10, "Away Report", {
      color: UI_HEX.gold,
      fontSize: 12,
      fontStyle: "700",
      width: 186
    });
    addLabel(this, x + 14, y + 31, message, {
      color: UI_HEX.parchment,
      fontSize: 10,
      width: 186
    });
  }

  private drawTrainingRoom(room: InnTrainingRoomViewModel): void {
    const fill = room.isUnlocked ? 0x76503b : 0x3a332e;

    this.drawRoomShell(
      724,
      198,
      240,
      362,
      fill,
      room.title,
      room.levelLabel,
      room.isUnlocked ? UI_HEX.cream : UI_HEX.mutedCream
    );

    this.add.circle(844, 384, 36, room.isUnlocked ? UI_COLORS.gold : 0x6d5a49, 1);
    this.add.circle(844, 384, 21, room.isUnlocked ? 0x7a432d : 0x3b312c, 1);
    this.add.rectangle(840, 420, 8, 66, room.isUnlocked ? 0xb07742 : 0x6d5a49, 1);
    this.add.rectangle(794, 488, 102, 12, room.isUnlocked ? 0xb07742 : 0x6d5a49, 1);
    drawDivider(this, 778, 432, 812, 388, room.isUnlocked ? UI_COLORS.gold : UI_COLORS.mutedCream, 0.7);
    drawDivider(this, 910, 432, 876, 388, room.isUnlocked ? UI_COLORS.gold : UI_COLORS.mutedCream, 0.7);

    if (room.isUnlocked) {
      addCenteredLabel(this, 844, 508, room.speedLabel, {
        color: UI_HEX.gold,
        fontSize: 11,
        fontStyle: "700",
        width: 142
      });
      addCenteredLabel(this, 844, 524, room.selectorLabel, {
        color: UI_HEX.skyBlue,
        fontSize: 10,
        fontStyle: "700",
        width: 142
      });
      this.drawTrainingSelectorButton(800, 552, "Prev", room.canSelectPrevious, handleInnSelectPreviousTrainingHero);
      this.drawTrainingSelectorButton(888, 552, "Next", room.canSelectNext, handleInnSelectNextTrainingHero);
      addCenteredLabel(this, 844, 578, room.assignmentLabel, {
        color: room.hasActiveTrainingJob ? UI_HEX.success : UI_HEX.mutedCream,
        fontSize: 10,
        fontStyle: "700",
        width: 142
      });
      addCenteredLabel(this, 844, 594, room.bonusLabel, {
        color: UI_HEX.parchment,
        fontSize: 10,
        fontStyle: "700",
        width: 142
      });
      addCenteredLabel(this, 844, 609, room.progressLabel, {
        color: room.hasActiveTrainingJob ? UI_HEX.success : UI_HEX.mutedCream,
        fontSize: 9,
        width: 142
      });
      drawActionButton(this, {
        x: 844,
        y: 642,
        width: 142,
        height: 32,
        label: room.actionLabel,
        enabled: room.actionEnabled,
        fill: room.isCancelAction ? 0x5d5249 : UI_COLORS.amber,
        stroke: UI_COLORS.gold,
        onClick: () => {
          if (this.didDragWorld || !room.targetHeroId) {
            return;
          }

          updateGameState((currentState) => handleInnTrainingAction(currentState, room.targetHeroId));
          this.restartWithCurrentScroll();
        }
      });

      if (room.blockedReason) {
        addCenteredLabel(this, 844, 671, room.blockedReason, {
          color: UI_HEX.gold,
          fontSize: 9,
          fontStyle: "700",
          width: 148
        });
      }
    }

    if (room.recommendationBadge) {
      this.drawRoomRecommendationBadge(746, 260, room.recommendationBadge);
    }

    if (!room.isUnlocked) {
      this.add.rectangle(724, 198, 240, 362, 0x11100f, 0.3).setOrigin(0, 0);
      drawDivider(this, 762, 270, 926, 510, UI_COLORS.mutedCream, 0.42);
      drawDivider(this, 926, 270, 762, 510, UI_COLORS.mutedCream, 0.42);
    }
  }

  private drawTrainingSelectorButton(
    x: number,
    y: number,
    label: string,
    enabled: boolean,
    command: (state: ReturnType<typeof getGameState>) => ReturnType<typeof getGameState>
  ): void {
    drawPanel(this, x - 34, y - 13, 68, 26, enabled ? 0x2c4150 : 0x3a332e, enabled ? UI_COLORS.skyBlue : 0x8a7a69, 0.94, 6);
    addCenteredLabel(this, x, y, label, {
      color: enabled ? UI_HEX.skyBlue : UI_HEX.mutedCream,
      fontSize: 10,
      fontStyle: "700",
      width: 60
    });

    const zone = this.add.zone(x, y, 68, 26).setOrigin(0.5);
    if (enabled) {
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerup", () => {
        if (this.didDragWorld) {
          return;
        }

        updateGameState(command);
        this.restartWithCurrentScroll();
      });
    }
  }

  private drawExtraRoomCards(rooms: InnRoomCardViewModel[]): void {
    addCenteredLabel(this, 1236, 170, "Inn wings", {
      color: UI_HEX.gold,
      fontSize: 13,
      fontStyle: "700",
      width: 180
    });

    rooms.slice(0, 5).forEach((room, index) => {
      const x = 1058 + (index % 2) * 188;
      const y = 210 + Math.floor(index / 2) * 136;
      this.drawExtraRoomCard(x, y, room);
    });
  }

  private drawExtraRoomCard(x: number, y: number, room: InnRoomCardViewModel): void {
    const fill = room.isUnlocked ? 0x4c3327 : 0x2f2a27;
    const stroke = room.isUnlocked ? UI_COLORS.gold : 0x8a7a69;
    drawPanel(this, x, y, 166, 106, fill, stroke, 0.96, 7);
    addLabel(this, x + 12, y + 10, room.name, {
      color: room.isUnlocked ? UI_HEX.cream : UI_HEX.mutedCream,
      fontSize: 12,
      fontStyle: "700",
      width: 102
    });
    addLabel(this, x + 116, y + 10, room.levelLabel, {
      color: room.isUnlocked ? UI_HEX.gold : UI_HEX.mutedCream,
      fontSize: 11,
      fontStyle: "700",
      width: 38,
      align: "right"
    });
    addLabel(this, x + 12, y + 36, room.statusLabel, {
      color: room.isUnlocked ? UI_HEX.success : UI_HEX.gold,
      fontSize: 10,
      fontStyle: "700",
      width: 138
    });
    addLabel(this, x + 12, y + 56, room.effectLabel, {
      color: UI_HEX.mutedCream,
      fontSize: 10,
      width: 138
    });
  }

  private drawRoomRecommendationBadge(x: number, y: number, label: string): void {
    drawPanel(this, x, y, 198, 38, 0x101722, UI_COLORS.skyBlue, 0.96, 7);
    addCenteredLabel(this, x + 99, y + 19, label, {
      color: UI_HEX.skyBlue,
      fontSize: 10,
      fontStyle: "700",
      width: 178
    });
  }

  private drawTowerGate(gate: InnGateViewModel, autoDispatchLabel: string, canToggleAutoDispatch: boolean): void {
    this.add.rectangle(1038, 530, 352, 82, 0x543526, 1).setOrigin(0, 0).setStrokeStyle(2, 0xe7ac64);
    addCenteredLabel(this, 1120, 552, gate.targetFloorLabel, {
      color: UI_HEX.skyBlue,
      fontSize: 13,
      fontStyle: "700",
      width: 130
    });
    addCenteredLabel(this, 1120, 586, "tower gate", {
      color: UI_HEX.skyBlue,
      fontSize: 12,
      fontStyle: "700",
      width: 120
    });
    this.drawAutoDispatchToggle(1280, 552, autoDispatchLabel, canToggleAutoDispatch);
    this.drawGateAction(1280, 596, gate);
  }

  private drawAutoDispatchToggle(x: number, y: number, label: string, enabled: boolean): void {
    const isOn = label === "Auto: ON";
    drawPanel(this, x - 58, y - 16, 116, 32, enabled ? 0x183829 : 0x3a332e, enabled ? UI_COLORS.gold : 0x8a7a69, 0.94, 7);
    addCenteredLabel(this, x, y, label, {
      color: isOn ? UI_HEX.success : UI_HEX.mutedCream,
      fontSize: 11,
      fontStyle: "700",
      width: 102
    });

    const zone = this.add.zone(x, y, 116, 32).setOrigin(0.5);
    if (enabled) {
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerup", () => {
        if (this.didDragWorld) {
          return;
        }

        updateGameState(handleInnToggleAutoDispatch);
        this.restartWithCurrentScroll();
      });
    }
  }

  private drawGateAction(x: number, y: number, gate: InnGateViewModel): void {
    const fill = gate.actionEnabled ? UI_COLORS.amber : 0x5d5249;
    const stroke = gate.actionEnabled ? UI_COLORS.gold : 0x8a7a69;

    drawPanel(this, x - 82, y - 18, 164, 36, fill, stroke, 1, 7);
    addCenteredLabel(this, x, y, gate.actionLabel, {
      color: gate.actionEnabled ? UI_HEX.dark : UI_HEX.mutedCream,
      fontSize: 13,
      fontStyle: "700",
      width: 138
    });
    addCenteredLabel(this, x, y - 28, gate.statusLabel, {
      color: gate.actionEnabled ? UI_HEX.success : UI_HEX.mutedCream,
      fontSize: 10,
      fontStyle: "700",
      width: 132
    });

    const zone = this.add.zone(x, y, 164, 36).setOrigin(0.5);
    if (gate.actionEnabled) {
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerup", () => {
        if (this.didDragWorld) {
          return;
        }

        updateGameState(handleInnSendSelectedParty);
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

  private drawHeroes(heroes: InnHeroViewModel[]): void {
    heroes.slice(0, 2).forEach((hero, index) => this.drawHero(hero, index, heroes.length));
  }

  private drawHero(hero: InnHeroViewModel, index: number, totalHeroes: number): void {
    const position = getHeroPosition(hero.status, index, totalHeroes);
    const labelPosition = getHeroLabelPosition(hero.status, index, totalHeroes);
    const palette = hero.status === "in_tower" ? "away" : hero.status === "defeated" ? "defeated" : "hero";

    drawTinyHero(this, position.x, position.y, {
      hpRatio: hero.hpRatio,
      palette
    });
    addLabel(this, labelPosition.x, labelPosition.y, hero.levelLabel, {
      color: UI_HEX.cream,
      fontSize: 11,
      fontStyle: "700",
      width: 118
    });
    drawHpBar(this, labelPosition.x, labelPosition.y + 34, 108, 8, hero.hpRatio, hero.hpLabel);
    addLabel(this, labelPosition.x, labelPosition.y + 48, hero.statusLabel, {
      color: hero.status === "in_tower" ? UI_HEX.skyBlue : UI_HEX.gold,
      fontSize: 10,
      width: 108
    });
    addLabel(this, labelPosition.x, labelPosition.y + 62, hero.readyHpLabel, {
      color: UI_HEX.mutedCream,
      fontSize: 9,
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

function getHeroPosition(status: HeroStatus, index: number, totalHeroes: number): { x: number; y: number } {
  const offset = getPartyMemberOffset(index, totalHeroes);

  if (status === "in_tower") {
    return { x: 1118 + offset * 0.72, y: 558 + Math.abs(offset) * 0.08 };
  }

  if (status === "resting" || status === "wounded" || status === "defeated") {
    return { x: 194 + offset * 0.82, y: 458 + Math.abs(offset) * 0.12 };
  }

  return { x: 522 + offset, y: 492 + Math.abs(offset) * 0.12 };
}

function getHeroLabelPosition(status: HeroStatus, index: number, totalHeroes: number): { x: number; y: number } {
  const offset = getPartyMemberOffset(index, totalHeroes);

  if (status === "in_tower") {
    return { x: 1064 + offset * 0.72, y: 548 + index * 78 };
  }

  if (status === "resting" || status === "wounded" || status === "defeated") {
    return { x: 130 + offset * 0.58, y: 282 + index * 78 };
  }

  return { x: 458 + offset * 0.58, y: 358 + index * 78 };
}

function getPartyMemberOffset(index: number, totalHeroes: number): number {
  if (totalHeroes <= 1) {
    return 0;
  }

  return index === 0 ? -34 : 34;
}
