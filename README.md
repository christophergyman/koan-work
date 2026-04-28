# koan-work

Tiny browser-first 2D platformer sandbox with dialogue and tick-based auto-combat.

## Stack

- **Phaser 4** — browser game shell, rendering, input
- **TypeScript** — game logic
- **Vite** — dev server and build
- **Vitest** — unit tests
- **pnpm** — package management

## Getting Started

```bash
pnpm install
pnpm dev
```

## Scripts

```bash
pnpm dev     # start local dev server
pnpm test    # run Vitest tests
pnpm build   # typecheck and production build
```

## Current Features

- Fixed resolution `480 × 288`, pixel-art scaling
- Custom AABB physics on a `60Hz` fixed timestep
- Room-based camera snapping
- Multi-page dialogue with friendly NPCs (`N` tile)
- Tick-based auto-combat with enemy NPCs (`E` tile)
- Debug HUD togglable with `~`
- ASCII level data, no external editor

## Controls

```text
A / Left         move left
D / Right        move right
W / Up / Space   jump
E                interact (talk / fight)
~                toggle debug HUD
```

## Level Format

```text
. empty
# solid
@ spawn
N friendly NPC (dialogue)
E enemy (combat)
^ hazard marker (no behavior yet)
G goal marker (no behavior yet)
```

## Project Structure

```text
src/main.ts              entry point — Phaser bootstrap only
src/scenes/GameScene.ts  scene shell — input, systems, render calls
src/render/              Phaser drawing code
  WorldRenderer.ts       tiles, player, NPCs, enemies, HP bars, panels
game/                    pure TypeScript — no Phaser, fully testable
  constants.ts           dimensions and tuning
  input.ts               keyboard state
  level.ts               ASCII level parsing
  player.ts              player state factory
  physics.ts             movement and tile collision
  entities.ts            NPC / Enemy types and factories
  proximity.ts           distance utilities
  dialogue.ts            dialogue state machine + content registry
  combat.ts              tick-based combat + session logic
test/
  level.test.ts
  physics.test.ts
  combat.test.ts
```

## Dev Notes

- No Phaser Arcade Physics — custom AABB only
- No sprites / art pipeline — debug rectangles only
- No external level editor
- No ECS or generic engine code
- `src/game/` is Phaser-free for easy testing

Before finishing changes:

```bash
pnpm test
pnpm build
```
