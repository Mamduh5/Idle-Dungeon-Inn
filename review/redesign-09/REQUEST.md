# UI Redesign Review Request

Status:
PROMPT_09_ROOM_UPGRADE_PURCHASING_V1 - AWAITING HUMAN REVIEW

## Reference board

Path:
review/redesign-09/reference-board.md

## Rubric

Path:
review/redesign-09/redesign-rubric.md

## Design plan

Path:
review/redesign-09/design-plan.md

## Self-evaluation

Path:
review/redesign-09/self-evaluation.md

## Summary

Idle Dungeon Inn keeps the approved panable Inn and world-first Tower foundation, then resumes gameplay Prompt 09 with room upgrade purchasing v1. The Inn remains a 1260px panable base world with Bed, Hearth, Training, and Gate zones. Tower remains a 960px physical dungeon corridor/stage. Build now has real room purchase controls for defined rooms: tower coins can upgrade/unlock rooms, floor locks and coin shortages disable buttons with clear reasons, and the Bed Room Lv1 to Lv2 purchase is validated after the Floor 1 coin reward. Bottom nav labels remain exactly Inn | Tower | Heroes | Build.

## Changed files

- src/main.ts
- src/scenes/BuildScene.ts
- src/scenes/InnScene.ts
- src/scenes/TowerScene.ts
- src/systems/roomUpgradeSystem.ts
- review/redesign-09/reference-board.md
- review/redesign-09/redesign-rubric.md
- review/redesign-09/design-plan.md
- review/redesign-09/self-evaluation.md
- review/redesign-09/loop-validation.spec.ts
- review/redesign-09/REQUEST.md
- review/redesign-09/screenshots/01-inn-left-bed-area.png
- review/redesign-09/screenshots/02-inn-center-hearth-area.png
- review/redesign-09/screenshots/03-inn-right-gate-area.png
- review/redesign-09/screenshots/04-tower-traveling.png
- review/redesign-09/screenshots/05-tower-fighting.png
- review/redesign-09/screenshots/06-tower-continue-run.png
- review/redesign-09/screenshots/07-tower-complete-floor.png
- review/redesign-09/screenshots/08-inn-after-return.png
- review/redesign-09/screenshots/09-heroes-view.png
- review/redesign-09/screenshots/10-build-view.png
- review/redesign-09/screenshots/11-build-bed-upgraded.png
- review/redesign-09/screenshots/responsive-360x640.png
- review/redesign-09/screenshots/responsive-360x640-inn-gate.png
- review/redesign-09/screenshots/responsive-360x640-tower.png
- review/redesign-09/screenshots/responsive-390x844.png

## Build result

Command:
`npm run build`

Result:
Passed with exit code 0.

Observed output summary:

- `tsc && vite build`
- 35 modules transformed
- `dist/index.html` generated
- `dist/assets/index-DGwNm4E4.css` generated
- `dist/assets/index-C6Mz10oK.js` generated
- Vite emitted a non-blocking chunk-size warning for the Phaser-sized bundle.

Other validation scripts:

- package.json has no `test`, `typecheck`, or `lint` script.
- Added `@playwright/test` as a dev dependency because the repo now contains a repeatable browser validation artifact.

## Full loop validation

Command:
`npx playwright test review/redesign-09/loop-validation.spec.ts --reporter=line`

Result:
3 passed.

Validated loop:

- App opened to Inn.
- Inn camera was dragged to the left Bed area and scrollX was asserted near the left bound.
- Inn camera was dragged to the center Hearth area and scrollX was asserted to increase.
- Inn camera was dragged to the right Gate area and scrollX was asserted to increase and remain within bounds.
- Send to Tower was clicked from the gate-attached action after panning to the Gate.
- Tower showed traveling.
- Tower advanced through exploring toward combat.
- Tower reached actual fighting status before the fighting screenshot was captured.
- Combat changed HP and showed latest attack feedback.
- Enemy defeat created the encounter-cleared hold.
- Contextual Continue Run appeared connected to the open passage and was clicked.
- Run advanced to the exit node.
- Contextual Complete Floor appeared connected to the exit portal and was clicked.
- Floor clear granted 25 coins.
- Floor clear unlocked Floor 2.
- Party returned to Inn with Mira ready.
- Inn showed Target F2 and Send to Tower readiness.
- Bottom nav was exercised through Tower, Inn, Heroes, and Build.
- Bed Room upgrade was purchased from Build for 25 coins.
- State assertion confirmed coins dropped to 0 and Bed Room reached Lv 2.

## Screenshot paths

- review/redesign-09/screenshots/01-inn-left-bed-area.png
- review/redesign-09/screenshots/02-inn-center-hearth-area.png
- review/redesign-09/screenshots/03-inn-right-gate-area.png
- review/redesign-09/screenshots/04-tower-traveling.png
- review/redesign-09/screenshots/05-tower-fighting.png
- review/redesign-09/screenshots/06-tower-continue-run.png
- review/redesign-09/screenshots/07-tower-complete-floor.png
- review/redesign-09/screenshots/08-inn-after-return.png
- review/redesign-09/screenshots/09-heroes-view.png
- review/redesign-09/screenshots/10-build-view.png
- review/redesign-09/screenshots/11-build-bed-upgraded.png
- review/redesign-09/screenshots/responsive-360x640.png
- review/redesign-09/screenshots/responsive-360x640-inn-gate.png
- review/redesign-09/screenshots/responsive-360x640-tower.png
- review/redesign-09/screenshots/responsive-390x844.png

## Responsive checks

390x844:
Passed. Native-size screenshots show left, center, and right Inn camera positions plus Tower traveling, fighting, cleared/continue, exit/complete, Heroes, and Build readable with no key elements hidden under bottom nav.

360x640:
Passed. `responsive-360x640.png`, `responsive-360x640-inn-gate.png`, and `responsive-360x640-tower.png` show the scaled Inn and Tower remain readable, with HUD, corridor, actor, HP, event, gate action, and nav regions visible.

Visual screenshot inspection:
Passed. After Playwright regenerated screenshots, Tower traveling, fighting, continue, complete, and responsive 360x640 Tower screenshots were opened and checked visually. The fighting screenshot now captures the active encounter, not the cleared state.

Room upgrade purchase check:
Passed. `11-build-bed-upgraded.png` shows Bed Room Lv 2 and Coins 0 after the validated purchase.

## Known issues

No known blocking issues for human review.

Non-blocking note:
Vite emits a chunk-size warning because Phaser is bundled into the main build output. The build exits successfully.

## Why this should pass

The revised pass preserves the accepted Inn/Tower foundation and adds a real gameplay loop on top of it. Room upgrade purchasing v1 is data-driven from room definitions, spends existing floor-clear coins, mutates room level/unlock state, and reports through recent events. The current gameplay loop, coin reward, floor unlock, Bed Room purchase, bottom nav labels, visual screenshots, and pure-module boundaries were validated.
