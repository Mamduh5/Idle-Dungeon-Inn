# Idle Dungeon Inn Mega Phase Ledger

## Current phase
Phase 3 - Bottleneck View v0

## Completed phases
- Phase 0 - Setup and audit: created the mega-phase ledger, recorded baseline assumptions, confirmed clean tracked state before edits, and ran fast baseline validation.
- Phase 1 - Backend Boundary v1: added canonical view models for Inn/Heroes/Build/Tower, added Build/Tower command wrappers, removed Inn command dependence on view-model output, refactored scenes to consume view models/commands, and added focused boundary tests.
- Phase 2 - Backend Boundary v2: added a typed game command dispatcher, explicit party command helpers, clearer central tick order, recent-event capping in the tick path, stronger save normalization, and focused backend architecture tests.

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
- Completed.

### Phase 3 - Bottleneck View v0
- Add a read-only bottleneck analysis model and view model.
- Add focused tests for low HP, low damage/training, Floor 10 checkpoint wording, and no-current-blocker state.

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
- src/application/gameCommands.ts
- src/application/partyCommands.ts
- src/state/recentEvents.ts
- src/state/saveStorage.ts
- src/systems/gameTickSystem.ts
- review/redesign-10/backend-boundary-v2.spec.ts

### Phase 3
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

### Phase 2
- `npm run build`: passed. Vite reported the existing large chunk warning.
- `npm run test -- review/redesign-10/backend-boundary-v1.spec.ts`: passed, 8 tests.
- `npm run test -- review/redesign-10/backend-boundary-v2.spec.ts`: passed, 5 tests.
- `npm run test -- review/redesign-09/room-jobs.spec.ts`: passed, 6 tests.
- `npm run test -- review/redesign-09/training-room.spec.ts`: passed, 22 tests.
- `npm run test -- review/redesign-09/inn-drag-scroll.spec.ts`: passed, 5 tests.
- `git diff --check`: passed with line-ending warnings only.
- `git status --short --untracked-files=all`: reported `src/state/saveStorage.ts` and `review/redesign-10/backend-boundary-v2.spec.ts` as dirty; other Phase 1 files exist on disk but were not reported dirty by Git in this sandbox state.

## Tests intentionally not run
- Phase 0: no focused gameplay tests were required; Phase 1 will run the requested focused tests.
- Phase 1: no broad redesign-09 long suites were run; not part of Phase 1 fast validation.
- Phase 2: no broad long suites were run; not part of Phase 2 fast validation.

## Known risks
- The pasted mega prompt asks to continue through all phases, but the current implementation will still validate and ledger each phase before moving on.
- Existing ignored build/test output directories may change during validation.
- `git diff --name-only` hit a transient Windows sandbox `spawn setup refresh` error after Phase 1; `git status --short` succeeded and was used instead.
- Some Git inspection commands intermittently hit Windows sandbox `spawn setup refresh`; validation commands themselves continued to run successfully.

## Resume instructions
The next Codex context should:
1. Read this ledger.
2. Inspect current git diff.
3. Run only the phase's allowed fast checks unless explicitly asked.
4. Continue from the current phase, not from the beginning.
