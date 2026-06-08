# ChatGPT Feedback - Redesign 09

STATUS: REQUEST_CHANGES

## Verdict

Rejected.

The redesign is functionally valid, but visually it is still not a true redesign. It reads as a polished version of the previous prototype instead of a new presentation direction. The user specifically described it as polish instead of redesign.

The user also called out screenshot `01-inn-before-send.png` directly: it still tries to fit the whole game into one phone screen. That is the core failure.

## Main problem

The reference-led pass produced documentation and validation, but the screen design still appears to be built from the same underlying panel/status-card mindset. The result may be cleaner, but it has not crossed the line into a game-world presentation.

The next pass must stop fitting everything into a single screen.

Mobile does not require showing the whole inn/tower at once. The advantage of mobile is that the player can drag/pan around a larger world, like a base map, farm, village, tower, or open-world area. Use the camera and touch-dragging instead of cramming the entire design into one viewport.

## New mandatory direction: camera world, not one-screen poster

### 1. Build scenes larger than the viewport

The game canvas is a viewport, not the whole world.

Implement the Inn as a larger panable world/scene:

- world width should be larger than 390px, for example 900-1400px
- optionally world height can be larger too, but horizontal panning is the priority
- camera drag/pan must work on mobile and desktop pointer input
- camera bounds must keep the player inside the world
- important interactive objects should exist in the world, not in stacked panels

The initial camera should focus on the most important start area, probably the hero/common room/gate area.

### 2. Do not fit all inn systems into one viewport

Stop trying to show bed, training, hearth, hero, gate, event, build hints, status, and action all in one tight screen.

Instead, split them spatially across a larger inn/base:

Example horizontal world layout:

```text
[Bed Room / Recovery] -- [Hearth / Hero Common Area] -- [Training Room / Locked Wing] -- [Tower Gate]
```

The player can drag the camera to inspect the inn.

At 390x844, the player should see one or two areas clearly, not everything crushed.

### 3. Use mobile base-map references

Use these layout principles from real mobile games without copying art:

- Clash of Clans: the player manages a fantasy village as a persistent buildable world, not a single fitted dashboard.
- Hay Day and Township: farm/town content lives on a larger map where buildings are spatial objects and the player expands/inspects the world.
- Fallout Shelter / Tiny Tower: rooms/floors are physical spaces containing people, not cards.

Apply the principle: world first, UI second.

### 4. Inn View required redesign

The Inn must become a panable base scene.

Required:

- A wide inn/base world that exceeds the phone viewport.
- Bed Room as an actual room/zone.
- Hearth/common area as a separate zone.
- Training Room as a separate zone, with locked visual if locked.
- Tower Gate as a separate zone at one edge of the world.
- Hero placed inside the world based on status.
- Send to Tower should be attached to/touching the Tower Gate zone, not floating as a generic card button.
- Status labels should be small world labels near objects.
- HUD/nav can remain fixed overlay, but world content should be panable underneath.
- Add a visible hint such as `Drag to inspect inn` or small arrows, but do not make it text-heavy.

Pass condition:

With most text removed, screenshot 01 should still be recognizable as a fantasy inn/base, and it should be obvious the scene continues beyond the current viewport.

### 5. Tower View required redesign

The Tower can also use a camera/world stage if helpful.

Required:

- It should not be a centered status panel.
- Use a wide corridor/combat stage.
- Hero side and enemy side should be world positions.
- Traveling/exploring can show the party moving along a corridor/path.
- Fighting should show actors facing each other.
- Continue/Complete actions can be fixed overlay or world-context buttons, but should not dominate as generic app panels.

Pass condition:

With most text removed, screenshot 03 should still be recognizable as a dungeon battle/run.

### 6. Reference research must be redone with pan/drag/map focus

The previous reference board is too broad and too easy to satisfy with text. Redo or append a new section focused on spatial/panable mobile game worlds.

Required references to study:

- Clash of Clans: fantasy village/base as a spatial world.
- Hay Day: farm buildings and production spaces on a larger map.
- Township: town/city-building map with expandable territory.
- Fallout Shelter: rooms as physical spaces containing people.
- Tiny Tower: tower floors as physical spaces stacked vertically.
- Kairosoft-style town/base games: tiny readable characters in spatial building layouts.

Borrow principles, not art.

### 7. New required prototype/draft before finalizing

Before implementing the full pass, create a layout plan that explicitly includes camera/world dimensions.

`review/redesign-09/design-plan.md` must include:

- Inn world size, for example 1200x700.
- Camera viewport size and bounds.
- Drag/pan input behavior.
- Object/world positions for Bed, Hearth, Training, Gate, Hero.
- Initial camera focus.
- What is fixed HUD vs what is world content.

If the plan still assumes everything visible at once, it fails.

### 8. Updated pass/fail standard

The next pass fails if:

- Screenshot 01 still looks like one fitted panel layout.
- The whole inn is squeezed into the 390x844 viewport.
- The player cannot drag/pan to inspect more of the inn/base.
- The main screen still feels like an app dashboard.
- The redesign mostly changes colors, borders, spacing, or polish.

The next pass passes only if:

- Inn View is a larger panable world/base.
- The camera/viewport shows part of the inn, not everything at once.
- Dragging/panning is implemented and validated.
- Bed, hearth, training, and tower gate exist as spatial zones.
- Tower View feels like a physical encounter/run, not a report panel.
- The current gameplay loop still works.

## Implementation instruction

Do not continue the old composition. Rebuild the Inn View around a panable world/camera.

Recommended technical approach in Phaser:

- Create a world container or world-layer for inn objects.
- Set camera bounds larger than the viewport.
- Add pointer drag to scroll the camera horizontally, with clamped bounds.
- Keep HUD and bottom nav fixed to screen coordinates.
- Keep the Send to Tower action reachable at the gate zone.
- Validate drag/pan works at 390x844 and 360x640.

If the fixed HUD/nav interferes with dragging, reserve top/bottom safe areas and only allow world drag in the central area.

## Review artifact requirements for next pass

Add screenshots that prove panning:

- `01-inn-left-bed-area.png`
- `02-inn-center-hearth-area.png`
- `03-inn-right-gate-area.png`
- keep tower/combat screenshots as before

Also include in self-evaluation:

- Did drag/pan work?
- Does the inn world exceed the viewport?
- Can the player inspect different areas?
- Does any screenshot still try to fit everything into one phone screen?

Do not mark approved.
