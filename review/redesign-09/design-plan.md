# Idle Dungeon Inn Redesign Plan

## 1. Current Visual Problems

- Inn has a useful drawn cutaway, but it still relies on boxed labels and a detached button.
- Tower reads like a status report: panel, progress bar, party list, enemy list, then buttons.
- Heroes and Build are placeholder-like screens with generic panels and little game-world framing.
- HUD/nav are functional, but they feel like app chrome rather than game framing.
- Combat feedback is text-led and enemies/heroes do not occupy a clear scene.

## 2. Chosen Reference Principles

- From Dungeon Village and Dungeon Village 2: show the base as a physical fantasy place with readable rooms and tiny people.
- From Tiny Tower: use room boundaries and vertical/floor readability without copying the skyscraper format.
- From Soda Dungeon 2: keep the tavern/base directly connected to dungeon runs and show combat as a watched idle encounter.
- From AFK Arena and Legend of Slime: make hero/enemy identity and HP readable on mobile.
- From Clicker Heroes: keep currency/progression always visible while the active encounter remains central.
- From Darkest Dungeon: use clear hero-side and enemy-side staging in the tower.

## 3. New Visual Direction

- Cozy fantasy inn: warm timber, cream labels, hearth light, bed area, training alcove, and a glowing tower gate.
- Tower run: dark stone corridor, torches, node track, hero on the left, enemies on the right, clear HP bars, state lighting.
- Heroes: roster hall with one active hero plaque and party bench slots.
- Build: inn blueprint/workshop view with physical room miniatures and honest locked/future markers.
- UI copy stays compact. Text explains state, not mechanics tutorials.

## 4. Screen-by-Screen Redesign Plan

Inn:
- Draw a larger inn cutaway with three room zones and a visible path to a blue tower gate.
- Draw Mira in the room matching her status.
- Attach Send to Tower to the gate/path area.
- Move latest event into a small parchment notice near the hearth.
- Keep party, HP, target floor, coins, and floor visible.

Tower:
- Replace the central panel/list stack with a dungeon scene.
- Draw a top node track and progress bar for floor/node progress.
- Draw state-specific scenes: traveling bridge, exploring corridor, fighting arena, cleared gate, exit portal, wiped red overlay.
- Draw hero and enemy HP near actors.
- Use one combat/event line and a single relevant action button.

Heroes:
- Draw a roster hall with active hero portrait/body, HP bar, status, level, and assigned party.
- Draw party bench slots: Mira assigned, remaining slots as future/locked capacity hints.
- No fake recruitment or upgrade buttons.

Build:
- Draw a warm drafting table and room miniatures.
- Show Bed Room as active/unlocked and Training Room as locked until Floor 2.
- Show future wings as honest planning markers.
- No fake upgrade buttons.

## 5. Files Likely To Change

- src/ui/theme.ts
- src/ui/components.ts
- src/ui/sceneHud.ts
- src/scenes/InnScene.ts
- src/scenes/TowerScene.ts
- src/scenes/HeroesScene.ts
- src/scenes/BuildScene.ts
- review/redesign-09/self-evaluation.md
- review/redesign-09/REQUEST.md
- review/redesign-09/screenshots/*.png

## 6. Validation Plan

- Run npm run build.
- Run any other relevant existing scripts if package.json includes them; currently only dev, build, and preview exist.
- Use browser automation against Vite dev or preview to:
  - load Inn
  - click Send to Tower
  - observe traveling, exploring, fighting
  - wait for encounter clear
  - click Continue Run
  - wait for exit
  - click Complete Floor
  - confirm return to inn, coins, unlocked next floor, and send-again readiness
  - click bottom nav labels Inn, Tower, Heroes, Build
- Capture required screenshots at 390x844.
- Capture responsive checks at 390x844 and 360x640.

## 7. Risk List

- Phaser text can overlap if labels are too long, so all long text needs word wrap and small fixed areas.
- The fixed 390x844 canvas scales down at 360x640, so dense labels must be avoided.
- Tower auto-tick restarts scene frequently; render keys must keep updates visible without breaking buttons.
- Validation clicks are canvas-coordinate based, so button positions should stay stable.

## 8. Preserving The Gameplay Loop

- Keep dispatch in sendSelectedPartyToTower.
- Keep ticking through tickGameState.
- Keep Continue Run in continueSelectedTowerRun.
- Keep Complete Floor in completeSelectedFloor.
- Scenes only read state, draw visuals, and call the existing actions.
- No gameplay rules will be moved into UI renderers.

## 9. Avoiding Fake Systems

- Heroes future party slots are displayed as future capacity only.
- Build room directions are display-only unless an existing system already supports them.
- Training Room is shown locked/future because the current state has it locked and no upgrade action exists.
- Treasure and reward systems are not expanded beyond existing floor-clear coins.

## 10. Mobile Readability

- Keep one primary focal region per screen.
- Use fixed touch button areas above the bottom nav.
- Use short labels, high-contrast text, and near-actor HP bars.
- Avoid large text walls and dense rows.
- Keep core content between the top HUD and bottom nav.

## 11. Failure/Retry Validation

- If build fails, fix TypeScript or Vite errors and rerun npm run build.
- If browser launch fails, try preview/dev alternatives and another launch configuration.
- If screenshot capture fails, repair the script or capture flow and retry.
- If the full loop fails, fix the exact broken state transition or click target and rerun from a reset state.
- If any critical rubric item scores 0 or 1, revise the implementation, rebuild, revalidate affected flow, recapture screenshots, and update self-evaluation.
