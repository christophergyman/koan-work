import * as Phaser from 'phaser';
import './style.css';
import {
  FIXED_STEP_MS,
  MAX_FIXED_STEPS,
  ROOM_COLS,
  ROOM_ROWS,
  TILE_SIZE,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './game/constants';
import { KeyboardInput } from './game/input';
import { assertLevelMatchesRoomGrid, getRoomForPosition, getTile, level01Rows, parseLevel } from './game/level';
import { updatePlayer } from './game/physics';
import { createPlayer, type Player } from './game/player';

class GameScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private controls!: KeyboardInput;
  private readonly level = parseLevel(level01Rows);
  private readonly player: Player = createPlayer(this.level);
  private accumulatorMs = 0;

  constructor() {
    super('game');
    assertLevelMatchesRoomGrid(this.level);
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.hud = this.add.text(8, 8, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e6edf3',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 3 },
    });
    if (!this.input.keyboard) throw new Error('Keyboard input is unavailable.');
    this.controls = new KeyboardInput(this.input.keyboard);
  }

  update(_time: number, deltaMs: number): void {
    this.accumulatorMs += Math.min(deltaMs, FIXED_STEP_MS * MAX_FIXED_STEPS);

    let steps = 0;
    while (this.accumulatorMs >= FIXED_STEP_MS && steps < MAX_FIXED_STEPS) {
      updatePlayer(this.player, this.level, this.controls.read(), FIXED_STEP_MS / 1000);
      this.accumulatorMs -= FIXED_STEP_MS;
      steps += 1;
    }

    if (steps === MAX_FIXED_STEPS) this.accumulatorMs = 0;

    this.renderDebugWorld();
  }

  private renderDebugWorld(): void {
    const { roomX, roomY } = getRoomForPosition(this.player.x, this.player.y);
    const cameraX = roomX * VIEW_WIDTH;
    const cameraY = roomY * VIEW_HEIGHT;

    this.graphics.clear();
    this.graphics.fillStyle(0x14182a, 1);
    this.graphics.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const startTx = roomX * ROOM_COLS;
    const startTy = roomY * ROOM_ROWS;

    for (let y = 0; y < ROOM_ROWS; y += 1) {
      for (let x = 0; x < ROOM_COLS; x += 1) {
        const tile = getTile(this.level, startTx + x, startTy + y);
        if (tile === '#') {
          this.graphics.fillStyle(0x8b95ff, 1);
          this.graphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else if (tile === 'G') {
          this.graphics.fillStyle(0x59ffa0, 1);
          this.graphics.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, 8, 8);
        } else if (tile === '^') {
          this.graphics.fillStyle(0xff5370, 1);
          this.graphics.fillTriangle(
            x * TILE_SIZE,
            (y + 1) * TILE_SIZE,
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE,
            (x + 1) * TILE_SIZE,
            (y + 1) * TILE_SIZE,
          );
        }
      }
    }

    this.graphics.fillStyle(0xffcc66, 1);
    this.graphics.fillRect(
      Math.round(this.player.x - cameraX),
      Math.round(this.player.y - cameraY),
      this.player.width,
      this.player.height,
    );

    this.hud.setText([
      `pos ${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}`,
      `vel ${this.player.vx.toFixed(1)}, ${this.player.vy.toFixed(1)}`,
      `grounded ${this.player.grounded}`,
      `room ${roomX}, ${roomY}`,
    ]);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  backgroundColor: '#0f1220',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
});
