# AGENTS.md — koan-work

## Project

`koan-work` is a tiny browser-first 2D platformer sandbox.

The current goal is fast iteration on movement feel, room snapping, and simple tile collision — not a full engine, not production polish, not multiplayer yet.

## Tech Stack

- **Runtime:** Browser
- **Game framework:** Phaser 4
- **Language:** TypeScript
- **Build/dev server:** Vite
- **Package manager:** pnpm
- **Tests:** Vitest
- **Rendering:** Phaser `Graphics` debug primitives for now
- **Physics:** Custom AABB arcade physics, not Phaser Arcade Physics
- **Levels:** TypeScript/ASCII tilemaps, no external level editor yet

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

Notes:

- `pnpm dev` starts Vite for local browser playtesting.
- `pnpm test` runs unit tests for pure game logic.
- `pnpm build` runs TypeScript checking and production bundling.
- `dist/` is generated output and should not be committed.
- `node_modules/` should not be committed. Obviously.

## Current Game Shape

Core constants live in `src/game/constants.ts`:

- Viewport: `480 × 288`
- Tile size: `16px`
- Room size: `30 × 18` tiles
- Player size: `12 × 16`
- Fixed physics timestep: `60Hz`

Current level format:

```text
. empty
# solid
@ spawn
^ future hazard marker
G future goal marker
```

Only `#` and `@` have gameplay behavior right now. `^` and `G` may render/debug as markers, but do not add behavior unless the task asks for it.

## Architecture

```text
src/main.ts
  Phaser scene shell, fixed timestep loop, debug rendering, HUD

src/game/constants.ts
  Tuning constants and dimensions

src/game/input.ts
  Keyboard input snapshot

src/game/level.ts
  ASCII level data, parsing, tile lookup, room lookup

src/game/player.ts
  Player state factory/types

src/game/physics.ts
  Custom platformer movement and AABB tile collision

test/
  Vitest coverage for level parsing and physics behavior
```

Phaser should mostly handle:

- Canvas/WebGL setup
- Game loop shell
- Keyboard input access
- Debug drawing
- Text HUD

Plain TypeScript game modules should handle:

- Level parsing
- Player state
- Movement tuning
- Collision
- Physics tests

Keep game logic as pure/plain TypeScript where reasonable. This makes tests cheap and agent edits safer.

## Contribution Rules

### Keep it tiny

This repo is in prototype mode. Prefer the smallest thing that improves the playable sandbox.

Avoid:

- ECS frameworks
- abstract entity systems
- plugin architectures
- asset pipelines
- premature multiplayer prep
- generic engine code
- new folders unless they earn their keep

### Do not use Phaser physics

The project intentionally uses custom AABB physics for control and testability. Do not introduce Phaser Arcade Physics unless explicitly requested.

### Preserve fixed timestep physics

Physics updates should run through the fixed timestep loop in `src/main.ts`. Avoid tying movement behavior directly to variable render delta.

### Keep levels TUI-friendly

Levels are ASCII/TypeScript data for now. Do not add Tiled, LDtk, or custom editors unless asked.

### Add tests for logic changes

If changing any of these, update/add Vitest tests:

- level parsing
- tile collision
- movement physics
- jump behavior
- room calculations

Manual browser playtesting is still useful, but pure logic should have tests.

### Tuning constants go in `constants.ts`

Do not scatter magic movement numbers through physics code. Put tunable values in `src/game/constants.ts`.

### Debug primitives first

Visuals are intentionally rectangles/markers. Do not add sprites, asset loading, animations, or art pipelines unless asked.

## Verification Checklist

Before saying work is done, run:

```bash
pnpm test
pnpm build
```

For gameplay/UI changes, also run:

```bash
pnpm dev
```

Then smoke test in a browser:

- canvas mounts
- player appears
- keyboard movement works
- jumping works
- collision with solid tiles works
- room snapping still works
- HUD still updates

## Temp Files

If you generate temporary files during work — plans, screenshots, scratch notes, dumps, etc. — put them in `/temp` at the repo root. Do not leave them scattered in the working directory. The folder is gitignored.

## Style

- Strict TypeScript.
- Simple interfaces/types.
- No clever generic gymnastics.
- Prefer readable code over abstraction.
- Keep modules small and direct.
- If a change needs a design decision, ask before building around assumptions.
