import Phaser from "phaser";
import { purchaseRoomUpgradeFromBuild, toggleAutoDispatchFromBuild } from "../application/buildCommands";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { clearSavedGameStateForDev, getGameState, updateGameState } from "../state/gameStore";
import { tickGameState } from "../systems/gameTickSystem";
import {
  addCenteredLabel,
  addLabel,
  drawDivider,
  drawActionButton,
  drawPanel,
  drawStatusBadge
} from "../ui/components";
import { createSceneHud } from "../ui/sceneHud";
import { UI_COLORS, UI_HEX } from "../ui/theme";
import {
  getBuildViewModel,
  type BuildChoiceCardViewModel,
  type BuildChoiceCategoryViewModel,
  type BuildAutomationViewModel,
  type BuildFuturePlanViewModel,
  type BuildRoomPlanViewModel,
  type BuildViewModel
} from "../viewModels/buildViewModel";

const isDevBuild = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

export class BuildScene extends Phaser.Scene {
  public constructor() {
    super("BuildScene");
  }

  public create(): void {
    const viewModel = getBuildViewModel(getGameState());
    const choicesY = viewModel.hasBottleneckCallout ? 276 : 218;

    this.drawBackdrop();
    this.drawPlanTable();
    this.drawBottleneckCallout(viewModel.bottleneckCallout);
    this.drawChoiceCategories(viewModel.choiceCategories, choicesY);
    this.drawDevControls();

    createSceneHud(this, { title: "Build", activeLabel: "Build" });
  }

  public update(_time: number, delta: number): void {
    const now = Date.now();
    updateGameState((currentState) => tickGameState(currentState, delta, now));
  }

  private drawBackdrop(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x241916).setOrigin(0, 0);
    this.add.rectangle(0, 104, GAME_WIDTH, 658, 0x3a2a22, 1).setOrigin(0, 0);
    this.add.rectangle(26, 126, 338, 582, 0x4d382b, 1).setOrigin(0, 0).setStrokeStyle(2, UI_COLORS.gold);
    this.add.polygon(GAME_WIDTH / 2, 126, [0, -24, 166, 0, -166, 0], 0x2a1d18, 1).setStrokeStyle(2, UI_COLORS.gold);
    addCenteredLabel(this, GAME_WIDTH / 2, 142, "Inn Plans", {
      color: UI_HEX.gold,
      fontSize: 15,
      fontStyle: "700"
    });
  }

  private drawPlanTable(): void {
    this.add.rectangle(52, 166, 286, 42, 0x2d201b, 1).setOrigin(0, 0).setStrokeStyle(1, 0xb57745);
    this.add.rectangle(70, 160, 94, 18, UI_COLORS.parchment, 1).setStrokeStyle(1, 0x7a432d).setOrigin(0, 0);
    this.add.rectangle(178, 160, 68, 18, UI_COLORS.parchment, 1).setStrokeStyle(1, 0x7a432d).setOrigin(0, 0);
    this.add.rectangle(260, 160, 52, 18, UI_COLORS.parchment, 1).setStrokeStyle(1, 0x7a432d).setOrigin(0, 0);
    addCenteredLabel(this, GAME_WIDTH / 2, 188, "Spend tower coins on room upgrades", {
      color: UI_HEX.mutedCream,
      fontSize: 11,
      width: 250
    });
  }

  private drawBottleneckCallout(callout: BuildViewModel["bottleneckCallout"]): void {
    if (!callout) {
      return;
    }

    drawPanel(this, 48, 216, 294, 60, 0x5a3524, UI_COLORS.gold, 0.98, 7);
    addLabel(this, 62, 224, callout.title, {
      color: UI_HEX.gold,
      fontSize: 11,
      fontStyle: "700",
      width: 120
    });
    addLabel(this, 62, 240, callout.buildMessage, {
      color: UI_HEX.cream,
      fontSize: 9,
      width: 266
    });
    callout.recommendations.forEach((recommendation, index) => {
      addLabel(this, 62, 258 + index * 9, recommendation.buildWhy, {
        color: UI_HEX.skyBlue,
        fontSize: 8,
        fontStyle: "700",
        width: 266
      });
    });
  }

  private drawRoomPlan(x: number, y: number, room: BuildRoomPlanViewModel): void {
    const fill = room.recommendationBadge ? 0x7a432d : room.isAvailable ? 0x6f3d28 : 0x3b312c;
    const stroke = room.recommendationBadge ? UI_COLORS.skyBlue : room.isAvailable ? UI_COLORS.gold : 0x8a7a69;
    drawPanel(this, x, y, 136, 214, fill, stroke, 0.98, 7);
    addLabel(this, x + 12, y + 14, room.title, {
      color: room.isAvailable ? UI_HEX.cream : UI_HEX.mutedCream,
      fontSize: 14,
      fontStyle: "700",
      width: 112
    });
    addLabel(this, x + 12, y + 36, room.levelLabel, {
      color: room.recommendationBadge ? UI_HEX.skyBlue : room.isAvailable ? UI_HEX.gold : UI_HEX.mutedCream,
      fontSize: 12,
      fontStyle: "700"
    });

    if (room.recommendationBadge) {
      drawStatusBadge(this, x + 22, y + 58, room.recommendationBadge, 0x1f4662);
    }

    if (room.roomId === "bed_room") {
      this.add.rectangle(x + 22, y + 88, 78, 42, 0x3a241d, 1).setOrigin(0, 0).setStrokeStyle(2, UI_COLORS.gold);
      this.add.rectangle(x + 28, y + 94, 28, 14, 0xffe2b0, 1).setOrigin(0, 0);
      this.add.rectangle(x + 58, y + 96, 34, 28, UI_COLORS.hearth, 1).setOrigin(0, 0);
    } else {
      this.add.circle(x + 68, y + 102, 28, room.isAvailable ? UI_COLORS.gold : 0x6d5a49, 1);
      this.add.circle(x + 68, y + 102, 16, 0x3a241d, 1);
      this.add.rectangle(x + 36, y + 140, 64, 10, room.isAvailable ? 0xb07742 : 0x6d5a49, 1).setOrigin(0, 0);
    }

    drawStatusBadge(
      this,
      x + 14,
      y + 142,
      room.unlockStatusLabel,
      room.isAvailable ? 0x275241 : 0x4a4038
    );

    if (room.roomId === "bed_room") {
      addCenteredLabel(this, x + 68, y + 164, room.strategicLabel, {
        color: UI_HEX.mutedCream,
        fontSize: 9,
        width: 112
      });
    }

    if (!room.isAvailable) {
      this.add.rectangle(x, y, 136, 140, 0x11100f, 0.24).setOrigin(0, 0);
      drawDivider(this, x + 18, y + 80, x + 118, y + 142, UI_COLORS.mutedCream, 0.35);
    }

    addCenteredLabel(this, x + 68, y + 66, room.effectLabel, {
      color: room.isAvailable ? UI_HEX.parchment : UI_HEX.mutedCream,
      fontSize: 10,
      width: 112
    });

    if (room.upgrade) {
      drawActionButton(this, {
        x: x + 68,
        y: y + 184,
        width: 114,
        height: 36,
        label: room.upgrade.label,
        enabled: room.upgrade.canPurchase,
        fill: room.recommendationBadge ? UI_COLORS.skyBlue : UI_COLORS.amber,
        stroke: UI_COLORS.gold,
        onClick: () => {
          updateGameState((currentState) => purchaseRoomUpgradeFromBuild(currentState, room.roomId));
          this.scene.restart();
        }
      });
    }
  }

  private drawChoiceCategories(categories: BuildChoiceCategoryViewModel[], startY: number): void {
    const cards = categories.flatMap((category) => category.cards);

    cards.slice(0, 8).forEach((card, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      this.drawChoiceCard(48 + col * 158, startY + row * 118, card);
    });
  }

  private drawChoiceCard(x: number, y: number, card: BuildChoiceCardViewModel): void {
    const isRecommended = card.recommendationBadge !== null;
    const fill = isRecommended ? 0x6b4724 : card.isUnlocked ? 0x2f241d : 0x3b312c;
    const stroke = isRecommended ? UI_COLORS.skyBlue : card.isUnlocked ? UI_COLORS.gold : 0x8a7a69;
    const canRunCommand = card.command !== null && card.blockedReason === null;

    drawPanel(this, x, y, 136, 108, fill, stroke, 0.98, 7);
    addLabel(this, x + 10, y + 9, card.category, {
      color: isRecommended ? UI_HEX.skyBlue : UI_HEX.gold,
      fontSize: 9,
      fontStyle: "700",
      width: 116
    });
    addLabel(this, x + 10, y + 25, card.title, {
      color: card.isUnlocked ? UI_HEX.cream : UI_HEX.mutedCream,
      fontSize: 13,
      fontStyle: "700",
      width: 116
    });
    addLabel(this, x + 10, y + 45, card.description, {
      color: UI_HEX.mutedCream,
      fontSize: 9,
      width: 116
    });
    addLabel(this, x + 10, y + 68, card.gameplayEffect, {
      color: card.isUnlocked ? UI_HEX.parchment : UI_HEX.mutedCream,
      fontSize: 8,
      width: 116
    });

    if (card.command) {
      const metaLabel = getChoiceMetaLabel(card);
      addLabel(this, x + 10, y + 87, metaLabel, {
        color: card.recommendationBadge ? UI_HEX.skyBlue : card.blockedReason ? UI_HEX.gold : UI_HEX.mutedCream,
        fontSize: card.blockedReason ? 7 : 8,
        fontStyle: "700",
        width: 54
      });
      drawActionButton(this, {
        x: x + 96,
        y: y + 92,
        width: 68,
        height: 28,
        label: getChoiceActionLabel(card),
        enabled: canRunCommand,
        fill: isRecommended ? UI_COLORS.skyBlue : UI_COLORS.amber,
        stroke: UI_COLORS.gold,
        onClick: () => {
          if (card.command === "purchase_room_upgrade" && card.targetRoomId) {
            const targetRoomId = card.targetRoomId;
            updateGameState((currentState) => purchaseRoomUpgradeFromBuild(currentState, targetRoomId));
            this.scene.restart();
            return;
          }

          if (card.command === "toggle_auto_dispatch") {
            updateGameState(toggleAutoDispatchFromBuild);
            this.scene.restart();
          }
        }
      });
    } else {
      drawStatusBadge(this, x + 10, y + 82, card.recommendationBadge ?? card.costLabel, card.blockedReason ? 0x4a4038 : 0x275241);
    }
  }

  private drawAutomationPanel(control: BuildAutomationViewModel, panelY: number): void {
    drawPanel(this, 48, panelY, 294, 108, 0x2f241d, control.isUnlocked ? UI_COLORS.gold : 0x8a7a69, 0.98, 7);
    addLabel(this, 66, panelY + 16, control.name, {
      color: control.isUnlocked ? UI_HEX.cream : UI_HEX.mutedCream,
      fontSize: 14,
      fontStyle: "700",
      width: 178
    });
    drawStatusBadge(
      this,
      246,
      panelY + 12,
      control.statusLabel,
      control.isEnabled ? 0x275241 : control.isUnlocked ? 0x4a4038 : 0x3b312c
    );
    addLabel(this, 66, panelY + 42, control.description, {
      color: UI_HEX.mutedCream,
      fontSize: 12,
      width: 174
    });

    if (control.isUnlocked) {
      addLabel(this, 66, panelY + 68, `Status: ${control.statusLabel}`, {
        color: control.isEnabled ? UI_HEX.success : UI_HEX.mutedCream,
        fontSize: 11,
        fontStyle: "700",
        width: 112
      });
      drawActionButton(this, {
        x: 278,
        y: panelY + 76,
        width: 104,
        height: 34,
        label: control.actionLabel,
        enabled: true,
        fill: control.isEnabled ? 0x5d5249 : UI_COLORS.amber,
        stroke: UI_COLORS.gold,
        onClick: () => {
          updateGameState(toggleAutoDispatchFromBuild);
          this.scene.restart();
        }
      });
    } else {
      addCenteredLabel(this, 256, panelY + 76, control.unlockLabel, {
        color: UI_HEX.gold,
        fontSize: 11,
        fontStyle: "700",
        width: 126
      });
    }
  }

  private drawTrainingRoomCopy(panelY: number, copy: string[]): void {
    drawPanel(this, 48, panelY, 294, 42, 0x2f241d, UI_COLORS.gold, 0.98, 7);
    addLabel(this, 62, panelY + 8, copy[0] ?? "", {
      color: UI_HEX.cream,
      fontSize: 10,
      fontStyle: "700",
      width: 132
    });
    addLabel(this, 62, panelY + 23, copy[1] ?? "", {
      color: UI_HEX.mutedCream,
      fontSize: 9,
      width: 132
    });
    addLabel(this, 202, panelY + 8, copy[2] ?? "", {
      color: UI_HEX.gold,
      fontSize: 9,
      fontStyle: "700",
      width: 126
    });
    addLabel(this, 202, panelY + 23, copy[3] ?? "", {
      color: UI_HEX.mutedCream,
      fontSize: 9,
      fontStyle: "700",
      width: 126
    });
  }

  private drawFuturePlans(panelY: number, plans: BuildFuturePlanViewModel[]): void {
    drawPanel(this, 48, panelY, 294, 74, 0x2f241d, 0xb57745, 0.98, 7);
    addLabel(this, 66, panelY + 12, "Future Wings", {
      color: UI_HEX.cream,
      fontSize: 13,
      fontStyle: "700"
    });
    addLabel(this, 66, panelY + 34, "Later systems stay visible, but not clickable.", {
      color: UI_HEX.mutedCream,
      fontSize: 10,
      width: 252
    });

    plans.forEach((plan, index) => {
      const optionX = 66 + index * 88;
      this.add.rectangle(optionX, panelY + 52, 70, 18, 0x45352b, 1).setStrokeStyle(1, 0x7f6757).setOrigin(0, 0);
      addCenteredLabel(this, optionX + 35, panelY + 61, plan.label, {
        color: UI_HEX.mutedCream,
        fontSize: 9,
        fontStyle: "700",
        width: 60
      });
    });
  }

  private drawDevControls(): void {
    if (!isDevBuild) {
      return;
    }

    drawActionButton(this, {
      x: GAME_WIDTH / 2,
      y: 730,
      width: 142,
      height: 32,
      label: "DEV: Clear Save",
      enabled: true,
      fill: 0x5d5249,
      stroke: UI_COLORS.gold,
      onClick: () => {
        clearSavedGameStateForDev();
        this.scene.start("InnScene");
      }
    });
  }
}

function getChoiceActionLabel(card: BuildChoiceCardViewModel): string {
  if (card.command === "toggle_auto_dispatch") {
    return "Toggle";
  }

  if (card.blockedReason) {
    return "Wait";
  }

  return card.isUnlocked ? "Upgrade" : "Unlock";
}

function getChoiceMetaLabel(card: BuildChoiceCardViewModel): string {
  return card.recommendationBadge ?? card.blockedReason ?? card.costLabel;
}
