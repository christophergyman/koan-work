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

Level format:

```text
. empty
# solid
@ spawn
N friendly NPC (dialogue)
E enemy (combat)
^ hazard marker (no behavior yet)
G goal marker (no behavior yet)
```

## Architecture

```text
src/main.ts              entry point — Phaser bootstrap only
src/scenes/GameScene.ts  scene shell — input, systems, render calls
src/render/              Phaser drawing code (no game logic)
  WorldRenderer.ts
game/                    pure TypeScript — no Phaser, fully testable
  constants.ts
  input.ts
  level.ts
  player.ts
  physics.ts
  entities.ts            Npc / Enemy types + factories
  proximity.ts           distance utilities
  dialogue.ts            state machine + content registry
  combat.ts              tick combat + session logic
test/
  level.test.ts
  physics.test.ts
  combat.test.ts
```

`src/game/` is Phaser-free. All rendering lives in `src/render/` and `src/scenes/`. Keep it that way.

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

```bash
pnpm test
pnpm build
```

For gameplay/UI changes, also run `pnpm dev` and smoke test:

- canvas mounts, player appears
- movement, jumping, collision work
- room snapping works
- `E` talks to friendly NPC, dialogue advances and closes
- `E` fights enemy, combat panel shows, HP bars update
- death teleports to spawn with popup
- `~` toggles debug HUD
- defeated enemies respawn after ~10 seconds

## Temp Files

If you generate temporary files during work — plans, screenshots, scratch notes, dumps, etc. — put them in `/temp` at the repo root. Do not leave them scattered in the working directory. The folder is gitignored.

## Style

- Strict TypeScript.
- Simple interfaces/types.
- No clever generic gymnastics.
- Prefer readable code over abstraction.
- Keep modules small and direct.
- If a change needs a design decision, ask before building around assumptions.
