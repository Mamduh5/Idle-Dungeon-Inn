# Idle Dungeon Inn Redesign Rubric

Scoring:

- 0 = failed
- 1 = weak
- 2 = acceptable
- 3 = strong

A screen passes only if every critical item scores at least 3.

## Inn View Critical Checks

- Looks like a cozy inn/base, not a dashboard.
- Inn world is larger than the 390px viewport and cannot be fully seen at once.
- Camera drag/pan works with pointer input.
- Camera bounds keep the viewport inside the Inn world.
- Bed, Hearth, Training, and Tower Gate are spatial zones in the world.
- Hero is physically represented in the inn when available.
- Bed/rest space is visual, not just a text card.
- Training space is visual, locked/unlocked readable.
- Tower gate/path is visible.
- Send to Tower action is attached to the Tower Gate zone, not floating as a generic dashboard button.
- Core info is readable: party, hero, HP, target floor, coins, latest event.
- Text supports the scene instead of dominating it.

## Tower View Critical Checks

- Looks like a dungeon/tower run, not a status report.
- Tower is a wider physical corridor/room stage, not a fitted central panel.
- Node/floor info is compact overlay, not center content.
- Traveling and exploring show hero movement through a path or room sequence.
- Fighting shows encounter staging with hero physically on one side and enemy physically on the other.
- Continue Run and Complete Floor are contextual world actions connected to passage/exit, not main dashboard buttons.
- Traveling, exploring, fighting, cleared, exit, and wiped states are visually distinct.
- Hero side and enemy side are clear.
- HP bars are readable.
- Floor/node progress is readable.
- Continue Run action is clear when available.
- Complete Floor action is clear when available.
- Combat feedback is visible without becoming text spam.
- No visual confusion at 390x844.
- No visual confusion at 360x640.

## Heroes View Critical Checks

- Looks intentional, not like a forgotten placeholder.
- Shows hero roster clearly.
- Shows hero status and HP.
- Shows party assignment/future party slots.
- Does not pretend unavailable systems are functional.

## Build View Critical Checks

- Looks intentional, not like a forgotten placeholder.
- Shows Bed Room and Training Room as upgrade/build directions.
- Communicates locked/future systems honestly.
- Does not pretend unimplemented room upgrades are functional.
- Feels like a game build screen, not a settings page.

## Global Critical Checks

- Coherent art direction across all screens.
- Consistent HUD/nav.
- Touch targets are readable.
- No important elements hidden under bottom nav.
- No text walls.
- No copyrighted/trademarked art.
- Full current gameplay loop still works.
- Coins from floor clear still work.
- Bottom nav labels remain exactly Inn | Tower | Heroes | Build.
- No Phaser imports are added to pure modules.
