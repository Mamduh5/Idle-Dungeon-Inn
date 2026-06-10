# Idle Dungeon Inn Mega Phase Ledger

## Current phase
Phase 7 - Floor 1-20 + Floor 20 Boss

## Completed phases
- Phase 0 - Setup and audit: created the mega-phase ledger, recorded baseline assumptions, confirmed clean tracked state before edits, and ran fast baseline validation.
- Phase 1 - Backend Boundary v1: added canonical view models for Inn/Heroes/Build/Tower, added Build/Tower command wrappers, removed Inn command dependence on view-model output, refactored scenes to consume view models/commands, and added focused boundary tests.
- Phase 2 - Backend Boundary v2: added a typed game command dispatcher, explicit party command helpers, clearer central tick order, recent-event capping in the tick path, stronger save normalization, and focused backend architecture tests.
- Phase 3 - Bottleneck View v0: added pure bottleneck analysis, a display-ready bottleneck view model, Build/Tower summary exposure, and focused read-only bottleneck tests.
- Phase 4 - Heroes View v1: expanded Heroes view data for roster-wide hero status, room jobs, party labels, selected-party assignment actions, and simple assignment command wiring in the scene.
- Phase 5 - Party System v1: added a shared party view model, surfaced party mode/target state, validated party select/mode commands, and fixed duplicate/sparse party slot assignment.
- Phase 6 - Second Hero + Party Size 2: added Lina the Apprentice Archer, made the starter party size 2, normalized old v1 saves additively, drew compact two-hero parties in Inn/Tower, kept combat/dispatch/recovery all-hero aware, and added focused Phase 6 coverage.

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
- Completed.

### Phase 4 - Heroes View v1
- Completed.

### Phase 5 - Party System v1
- Completed.

### Phase 6 - Second Hero + Party Size 2
- Completed.

### Phase 7 - Floor 1-20 + Floor 20 Boss
- Add Floor 11-20 data, Bone Hall enemies, and a Floor 20 Bone Captain boss checkpoint.
- Integrate Floor 20 bottleneck messaging without breaking Floor 10 behavior.

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
- src/systems/bottleneckAnalysisSystem.ts
- src/viewModels/bottleneckViewModel.ts
- src/viewModels/buildViewModel.ts
- src/viewModels/towerViewModel.ts
- review/redesign-10/bottleneck-view-v0.spec.ts

### Phase 4
- src/viewModels/heroesViewModel.ts
- src/scenes/HeroesScene.ts
- review/redesign-10/heroes-view-v1.spec.ts

### Phase 5
- src/application/partyCommands.ts
- src/scenes/HeroesScene.ts
- src/viewModels/heroesViewModel.ts
- src/viewModels/partyViewModel.ts
- src/viewModels/towerViewModel.ts
- review/redesign-10/party-system-v1.spec.ts

### Phase 6
- src/data/heroData.ts
- src/game/initialState.ts
- src/state/saveStorage.ts
- src/viewModels/innViewModel.ts
- src/scenes/InnScene.ts
- src/scenes/TowerScene.ts
- src/systems/roomJobSystem.ts
- review/redesign-10/second-hero-party-size-2.spec.ts
- review/redesign-10/backend-boundary-v1.spec.ts
- review/redesign-10/backend-boundary-v2.spec.ts
- review/redesign-10/heroes-view-v1.spec.ts
- review/redesign-10/party-system-v1.spec.ts
- review/redesign-09/inn-backend-boundary.spec.ts
- review/redesign-09/training-room.spec.ts
- review/redesign-09/room-jobs.spec.ts

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

### Phase 3
- `npm run build`: passed. Vite reported the existing large chunk warning.
- `npm run test -- review/redesign-10/bottleneck-view-v0.spec.ts`: passed, 5 tests.
- `git diff --check`: passed with line-ending warnings only.

### Phase 4
- `npm run build`: initially failed due to an old helper call arity in `heroesViewModel`; fixed, then passed. Vite reported the existing large chunk warning.
- `npm run test -- review/redesign-10/heroes-view-v1.spec.ts`: passed, 4 tests.
- `git diff --check`: passed with line-ending warnings only.

### Phase 5
- `npm run build`: passed. Vite reported the existing large chunk warning.
- `npm run test -- review/redesign-10/party-system-v1.spec.ts`: initially failed on sparse duplicate assignment; fixed `assignHeroToParty`, then passed, 5 tests.
- `git diff --check`: passed with line-ending warnings only.

### Phase 6
- `npm run build`: passed. Vite reported the existing large chunk warning.
- `npm run test -- review/redesign-10/second-hero-party-size-2.spec.ts`: passed, 7 tests.
- `npm run test -- review/redesign-10/backend-boundary-v1.spec.ts`: initially failed on the old temporary `hero_rookie_knight_2` expectation; updated to canonical `hero_apprentice_archer_1`, then passed, 8 tests.
- `npm run test -- review/redesign-10/backend-boundary-v2.spec.ts`: initially failed because the new second party hero was still resting in an automation fixture and because normalized parties now add Lina; updated the fixture/expectation, then passed, 5 tests.
- `npm run test -- review/redesign-10/heroes-view-v1.spec.ts`: initially failed on one-hero/temporary-Niko expectations; updated to canonical two-hero defaults and explicit open-slot fixtures, then passed, 4 tests.
- `npm run test -- review/redesign-10/party-system-v1.spec.ts`: initially failed on the old one-hero slot ordering expectation; updated to assert uniqueness with the canonical two-hero party, then passed, 5 tests.
- `npm run test -- review/redesign-09/inn-backend-boundary.spec.ts`: initially failed on the old temporary `hero_rookie_knight_2` expectation; updated to canonical `hero_apprentice_archer_1`, then passed, 10 tests.
- `npm run test -- review/redesign-09/training-room.spec.ts`: initially failed on duplicate temporary hero assumptions and archer base attack; updated fixtures/expectations, then passed, 22 tests.
- `npm run test -- review/redesign-09/room-jobs.spec.ts`: initially exposed that two-hero wipe recovery could leave the second hero waiting forever after Bed Room capacity freed; added a pure Bed Room queue handoff, updated the test for sequential recovery, then passed, 6 tests.
- `npm run test -- review/redesign-09/inn-drag-scroll.spec.ts`: passed, 5 tests.
- `git diff --check`: passed with line-ending warnings only.

## Tests intentionally not run
- Phase 0: no focused gameplay tests were required; Phase 1 will run the requested focused tests.
- Phase 1: no broad redesign-09 long suites were run; not part of Phase 1 fast validation.
- Phase 2: no broad long suites were run; not part of Phase 2 fast validation.
- Phase 3: no visual/manual browser checks were run; Phase 3 validation was pure view-model/system coverage.
- Phase 4: no browser/manual visual checks were run; validation was build plus focused view-model/source tests.
- Phase 5: no browser/manual visual checks were run; validation was build plus focused party view-model/command tests.
- Phase 6: no browser/manual visual checks were run; validation was build plus focused backend/view-model/source tests.

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
