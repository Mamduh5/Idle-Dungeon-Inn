# Idle Dungeon Inn Mega Phase Ledger

## Current phase
Phase 2 - Backend Boundary v2

## Completed phases
- Phase 0 - Setup and audit: created the mega-phase ledger, recorded baseline assumptions, confirmed clean tracked state before edits, and ran fast baseline validation.
- Phase 1 - Backend Boundary v1: added canonical view models for Inn/Heroes/Build/Tower, added Build/Tower command wrappers, removed Inn command dependence on view-model output, refactored scenes to consume view models/commands, and added focused boundary tests.

## Current assumptions
- Idle Dungeon Inn remains a local offline Phaser + TypeScript + Vite game.
- Bottom navigation remains exactly `Inn | Tower | Heroes | Build`.
- No server, login, cloud save, real ads, Capacitor, screenshots, screenshot artifacts, or screenshot-based tests.
- Bed Room healing stays continuous through per-hero room jobs.
- Heroes recovered from wipes/rest states must rest until HP is at least 90% of max HP.
- Training Room progress is stored per hero on `hero.training` and affects attack only through hero-specific training bonus.
- Low-HP dispatch stays blocked.
- Auto-Dispatch must not auto-recover wiped runs.
- `InnScene.update()` must not restart the scene for passive tick changes.
- Pure systems, application commands, and view models must not import Phaser.

## Phase plan
### Phase 0 - Setup and audit
- Record the baseline repo state and fast validation.
- Do not change gameplay.

### Phase 1 - Backend Boundary v1
- Completed.

### Phase 2 - Backend Boundary v2
- Add a simple typed command pipeline.
- Strengthen the central tick/backend path and save normalization.
- Add focused backend-boundary v2 tests.

## Changed files by phase
### Phase 0
- review/redesign-10/MEGA_PHASE_LEDGER.md

### Phase 1
- src/application/buildCommands.ts
- src/application/innCommands.ts
- src/application/innViewModel.ts
- src/application/towerCommands.ts
- src/scenes/BuildScene.ts
- src/scenes/HeroesScene.ts
- src/scenes/InnScene.ts
- src/scenes/TowerScene.ts
- src/systems/automationSystem.ts
- src/systems/floorClearSystem.ts
- src/systems/roomJobSystem.ts
- src/systems/roomUpgradeSystem.ts
- src/systems/towerNodeActionSystem.ts
- src/systems/wipeRecoverySystem.ts
- src/ui/trainingRoomText.ts
- src/viewModels/buildViewModel.ts
- src/viewModels/heroesViewModel.ts
- src/viewModels/innViewModel.ts
- src/viewModels/towerViewModel.ts
- review/redesign-10/backend-boundary-v1.spec.ts

### Phase 2
- Pending.

## Commands run
### Phase 0
- `git status --short`: clean before ledger creation.
- `rg --files`: inspected repo file surface.
- `npm run build`: passed. Vite reported the existing large chunk warning.
- `git diff --check`: passed.

### Phase 1
- `npm run build`: passed. Vite reported the existing large chunk warning.
- `npm run test -- review/redesign-10/backend-boundary-v1.spec.ts`: passed, 8 tests.
- `npm run test -- review/redesign-09/inn-backend-boundary.spec.ts`: passed, 10 tests.
- `npm run test -- review/redesign-09/inn-drag-scroll.spec.ts`: passed, 5 tests.
- `npm run test -- review/redesign-09/training-room.spec.ts`: initially failed because redesign-09 imported `getDefaultTrainingHero` from `ui/trainingRoomText`; fixed with a compatibility re-export, then passed, 22 tests.
- `npm run test -- review/redesign-09/room-jobs.spec.ts`: passed, 6 tests.
- `git diff --check`: passed with line-ending warnings only.
- `git status --short`: tracked Phase 1 edits and new files listed above.

## Tests intentionally not run
- Phase 0: no focused gameplay tests were required; Phase 1 will run the requested focused tests.
- Phase 1: no broad redesign-09 long suites were run; not part of Phase 1 fast validation.

## Known risks
- The pasted mega prompt asks to continue through all phases, but the current implementation will still validate and ledger each phase before moving on.
- Existing ignored build/test output directories may change during validation.
- `git diff --name-only` hit a transient Windows sandbox `spawn setup refresh` error after Phase 1; `git status --short` succeeded and was used instead.

## Resume instructions
The next Codex context should:
1. Read this ledger.
2. Inspect current git diff.
3. Run only the phase's allowed fast checks unless explicitly asked.
4. Continue from the current phase, not from the beginning.
