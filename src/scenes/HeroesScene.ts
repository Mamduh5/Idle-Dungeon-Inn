import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { getGameState, updateGameState } from "../state/gameStore";
import { tickGameState } from "../systems/gameTickSystem";
import {
  addCenteredLabel,
  addLabel,
  drawDivider,
  drawHpBar,
  drawPanel,
  drawStatusBadge,
  drawTinyHero
} from "../ui/components";
import { createSceneHud } from "../ui/sceneHud";
import { UI_COLORS, UI_HEX } from "../ui/theme";
import {
  getHeroesViewModel,
  type HeroPartySlotViewModel,
  type HeroRosterCardViewModel
} from "../viewModels/heroesViewModel";

export class HeroesScene extends Phaser.Scene {
  public constructor() {
    super("HeroesScene");
  }

  public create(): void {
    const viewModel = getHeroesViewModel(getGameState());

    this.drawBackdrop();
    this.drawRosterHall(viewModel.roster);
    this.drawPartyBench(viewModel.partyName, viewModel.partySlots);

    createSceneHud(this, { title: "Heroes", activeLabel: "Heroes" });
  }

  public update(_time: number, delta: number): void {
    const now = Date.now();
    updateGameState((currentState) => tickGameState(currentState, delta, now));
  }

  private drawBackdrop(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x17221f).setOrigin(0, 0);
    this.add.rectangle(0, 104, GAME_WIDTH, 658, 0x1f342e, 1).setOrigin(0, 0);
    this.add.rectangle(20, 126, 350, 580, 0x2c463f, 1).setOrigin(0, 0).setStrokeStyle(2, 0x7fd3a6);
    this.add.polygon(GAME_WIDTH / 2, 126, [0, -24, 172, 0, -172, 0], 0x163027, 1).setStrokeStyle(2, 0x7fd3a6);

    for (const x of [62, 128, 260, 326]) {
      this.add.rectangle(x, 144, 18, 458, 0x1a2c27, 0.72).setOrigin(0.5, 0);
      this.add.rectangle(x, 190, 28, 8, 0x7fd3a6, 0.36).setOrigin(0.5, 0);
    }

    addCenteredLabel(this, GAME_WIDTH / 2, 142, "Roster Hall", {
      color: UI_HEX.success,
      fontSize: 15,
      fontStyle: "700"
    });
  }

  private drawRosterHall(heroes: HeroRosterCardViewModel[]): void {
    drawPanel(this, 38, 178, 314, 282, 0x263f38, 0x7fd3a6, 0.96, 7);
    addLabel(this, 56, 194, "Hero Roster", {
      color: UI_HEX.cream,
      fontSize: 15,
      fontStyle: "700"
    });

    if (heroes.length === 0) {
      addCenteredLabel(this, GAME_WIDTH / 2, 300, "No heroes assigned yet.", {
        color: UI_HEX.mutedCream,
        fontSize: 13,
        width: 220
      });
      return;
    }

    heroes.forEach((hero, index) => {
      const y = 256 + index * 116;
      this.add.rectangle(58, y - 42, 274, 112, 0x1d332e, 1).setOrigin(0, 0).setStrokeStyle(1, 0x6bc5b8);
      drawTinyHero(this, 102, y, {
        name: hero.name,
        status: hero.statusLabel,
        palette: hero.status === "defeated" ? "defeated" : hero.status === "in_tower" ? "away" : "hero"
      });
      addLabel(this, 154, y - 35, hero.levelLabel, {
        color: UI_HEX.cream,
        fontSize: 15,
        fontStyle: "700",
        width: 160
      });
      addLabel(this, 154, y - 14, hero.classLabel, {
        color: UI_HEX.mutedCream,
        fontSize: 12,
        width: 160
      });
      addLabel(this, 154, y + 2, hero.trainingBonusLabel, {
        color: UI_HEX.gold,
        fontSize: 10,
        width: 160
      });
      addLabel(this, 154, y + 16, hero.trainingProgressLabel, {
        color: UI_HEX.mutedCream,
        fontSize: 9,
        width: 160
      });
      drawHpBar(this, 154, y + 30, 150, 8, hero.hpRatio, hero.hpLabel, UI_COLORS.success);
      drawStatusBadge(this, 154, y + 50, hero.statusLabel, hero.status === "in_tower" ? 0x1f4662 : 0x275241);
    });
  }

  private drawPartyBench(partyName: string, slots: HeroPartySlotViewModel[]): void {
    drawPanel(this, 38, 492, 314, 172, 0x233832, 0x7fd3a6, 0.96, 7);
    addLabel(this, 56, 510, partyName, {
      color: UI_HEX.cream,
      fontSize: 15,
      fontStyle: "700",
      width: 180
    });
    addLabel(this, 56, 532, "Party bench", {
      color: UI_HEX.mutedCream,
      fontSize: 12
    });
    drawDivider(this, 56, 556, 332, 556, 0x7fd3a6, 0.45);

    slots.forEach((slot, index) => {
      const hero = slot.hero;
      const x = 56 + index * 99;
      this.add.rectangle(x, 578, 82, 58, hero ? 0x314e45 : 0x1b2c28, 1).setStrokeStyle(1, hero ? UI_COLORS.gold : 0x5f7770).setOrigin(0, 0);
      this.add.circle(x + 20, 606, 14, hero ? UI_COLORS.gold : 0x5f7770, 0.9);
      addCenteredLabel(this, x + 50, 596, slot.label, {
        color: hero ? UI_HEX.cream : UI_HEX.mutedCream,
        fontSize: 11,
        fontStyle: "700",
        width: 58
      });
      addCenteredLabel(this, x + 50, 617, slot.statusLabel, {
        color: hero ? UI_HEX.gold : UI_HEX.mutedCream,
        fontSize: 10,
        width: 58
      });
    });

    addCenteredLabel(this, GAME_WIDTH / 2, 684, "Additional party actions are not implemented.", {
      color: UI_HEX.mutedCream,
      fontSize: 11,
      width: 260
    });
  }
}
