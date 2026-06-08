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

- Cozy fantasy inn/base: a wide panable cutaway where the phone is a camera viewport over a larger inn world, not a fitted poster.
- The Inn world is spatial first: Bed Room, Hearth/common room, Training wing, and Tower Gate live at different world x positions with floor paths and visible continuation beyond the viewport.
- Tower run: dark stone corridor, torches, node track, hero on the left, enemies on the right, clear HP bars, state lighting.
- Heroes: roster hall with one active hero plaque and party bench slots.
- Build: inn blueprint/workshop view with physical room miniatures and honest locked/future markers.
- UI copy stays compact. Text explains state, not mechanics tutorials.

## 3A. Inn Camera World Layout

- Canvas viewport: 390x844. The top HUD (0-104) and bottom nav (762-844) remain fixed overlays.
- Inn world size: 1260x844. Horizontal camera bounds are 0-870. Vertical camera stays at 0 so the HUD and nav remain stable.
- Drag/pan behavior: pointer drag in the central world band, roughly y 112-752, subtracts pointer delta from camera scrollX and clamps to camera bounds. It must work with mouse and touch pointer input.
- Initial camera focus: scrollX 330, centered on the Hearth/common area and the road toward the Training wing. The left Bed Room and right Gate are intentionally off-screen or partial.
- Fixed HUD content: title, coins, current floor, bottom navigation.
- Panable world content: all rooms, room labels, latest event notice, hero, paths, arrows, Tower Gate, and the Send to Tower gate action.

World object positions:

| Object | World position / footprint | Notes |
| --- | --- | --- |
| Bed Room / Recovery | x 70-310, y 170-520 | Separate room with bed, recovery label, and hero placement when wounded/resting/defeated. |
| Hearth / Common Area | x 390-650, y 210-590 | Primary start area with hearth, party table, latest event notice, and available hero placement. |
| Training Room / Locked Wing | x 720-940, y 170-530 | Physical room with practice dummy/rack; locked overlay until unlocked. |
| Tower Gate | x 1040-1215, y 190-620 | Edge-of-world gateway with target floor label, path beams, and attached Send to Tower action. |
| Hero | Bed x 190 y 428, Hearth x 520 y 482, Gate x 1115 y 565 | Placement follows hero status rather than floating in a panel. |

## 4. Screen-by-Screen Redesign Plan

Inn:
- Draw a 1260px-wide inn/base world with camera bounds and drag panning.
- Show only part of the inn at a time on 390x844; left/center/right screenshots must prove the world continues.
- Place Bed Room, Hearth/common area, Training Room, and Tower Gate as spatial zones.
- Draw Mira in the room matching her status.
- Attach Send to Tower to the Tower Gate zone; it should not be a floating one-screen dashboard button.
- Move latest event into a small parchment notice near the hearth.
- Keep party, HP, target floor, coins, and floor visible.
- Add a compact drag hint and small directional arrows as world labels, not a tutorial block.

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
  - capture Inn left Bed area
  - drag/pan to center Hearth area and capture
  - drag/pan to right Gate area and capture
  - click Send to Tower at the gate
  - observe traveling, exploring, fighting
  - wait for encounter clear
  - click Continue Run
  - wait for exit
  - click Complete Floor
  - confirm return to inn, coins, unlocked next floor, and send-again readiness
  - click bottom nav labels Inn, Tower, Heroes, Build
- Capture required screenshots at 390x844.
- Capture responsive checks at 390x844 and 360x640.
- Assert the Inn camera scroll changes after pointer drag and remains clamped within bounds.

## 7. Risk List

- Phaser text can overlap if labels are too long, so all long text needs word wrap and small fixed areas.
- The fixed 390x844 canvas scales down at 360x640, so dense labels must be avoided.
- Tower auto-tick restarts scene frequently; render keys must keep updates visible without breaking buttons.
- Validation clicks are canvas-coordinate based, so button positions should stay stable.
- Gate actions are now world-coordinate based, so validation must pan the camera before clicking the gate button.

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
