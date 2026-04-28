# koan-work

Peaceful co-working game prototype.

Right now this is a tiny browser-first 2D platformer sandbox focused on fast iteration, simple movement feel, room snapping, and custom tile collision.

## Stack

- **Phaser 4** for browser game shell/rendering/input
- **TypeScript** for game logic
- **Vite** for fast local dev
- **Vitest** for unit tests
- **pnpm** for package management

## Getting Started

```bash
pnpm install
pnpm dev
```

Open the local URL Vite prints.

## Scripts

```bash
pnpm dev        # start local dev server
pnpm test       # run Vitest tests
pnpm test:watch # run tests in watch mode
pnpm build      # typecheck and build production assets
```

## Current Prototype

- Browser-only local dev target
- Fixed internal resolution: `480 × 288`
- Tile size: `16px`
- Room size: `30 × 18` tiles
- One big ASCII level split into room chunks
- Instant room-snap camera
- Keyboard input only
- Debug primitive rendering
- Custom AABB arcade physics
- Fixed timestep simulation at 60Hz

Controls:

```text
A / Left Arrow   move left
D / Right Arrow  move right
W / Up / Space   jump
```

## Level Format

Levels are currently plain TypeScript/ASCII data in `src/game/level.ts`.

```text
. empty
# solid
@ spawn
^ future hazard marker
G future goal marker
```

Only `#` and `@` have gameplay behavior right now.

## Project Structure

```text
src/main.ts              Phaser scene, fixed timestep loop, debug renderer
src/style.css            Page/canvas styling
src/game/constants.ts    Dimensions and tuning constants
src/game/input.ts        Keyboard input snapshot
src/game/level.ts        ASCII level data and parsing
src/game/player.ts       Player state/types
src/game/physics.ts      Custom movement and tile collision

test/level.test.ts       Level parsing tests
test/physics.test.ts     Physics behavior tests
```

## Development Notes

This prototype intentionally keeps things small:

- No Phaser Arcade Physics
- No sprites/art pipeline yet
- No external level editor yet
- No multiplayer yet
- No ECS or engine abstraction

Game logic should stay mostly in plain TypeScript modules so it is easy to test and easy for agents to edit.

Before finishing changes, run:

```bash
pnpm test
pnpm build
```
