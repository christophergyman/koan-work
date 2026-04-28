import * as Phaser from 'phaser';
import {
  ROOM_COLS,
  ROOM_ROWS,
  TILE_SIZE,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from '../game/constants';
import type { Enemy, Npc } from '../game/entities';
import { getTile } from '../game/level';
import type { Level } from '../game/level';
import type { Player } from '../game/player';
import type { CombatStats } from '../game/combat';

export class WorldRenderer {
  constructor(private readonly graphics: Phaser.GameObjects.Graphics) {}

  clear(): void {
    this.graphics.clear();
    this.graphics.fillStyle(0x14182a, 1);
    this.graphics.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  renderTiles(level: Level, roomX: number, roomY: number): void {
    const startTx = roomX * ROOM_COLS;
    const startTy = roomY * ROOM_ROWS;

    for (let y = 0; y < ROOM_ROWS; y += 1) {
      for (let x = 0; x < ROOM_COLS; x += 1) {
        const tile = getTile(level, startTx + x, startTy + y);
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
  }

  renderPlayer(player: Player, cameraX: number, cameraY: number): void {
    this.graphics.fillStyle(0xffcc66, 1);
    this.graphics.fillRect(
      Math.round(player.x - cameraX),
      Math.round(player.y - cameraY),
      player.width,
      player.height,
    );
  }

  renderNpcs(npcs: readonly Npc[], cameraX: number, cameraY: number): void {
    this.graphics.fillStyle(0xff66ff, 1);
    for (const npc of npcs) {
      this.graphics.fillRect(
        Math.round(npc.x - cameraX),
        Math.round(npc.y - cameraY),
        npc.width,
        npc.height,
      );
    }
  }

  renderEnemies(
    enemies: readonly Enemy[],
    defeatedIds: ReadonlySet<string>,
    combatEnemyId: string | null,
    combatEnemyHpRatio: number | null,
    cameraX: number,
    cameraY: number,
  ): void {
    this.graphics.fillStyle(0xff5370, 1);
    for (const enemy of enemies) {
      if (defeatedIds.has(enemy.id)) continue;
      this.graphics.fillRect(
        Math.round(enemy.x - cameraX),
        Math.round(enemy.y - cameraY),
        enemy.width,
        enemy.height,
      );
      if (combatEnemyId === enemy.id && combatEnemyHpRatio !== null) {
        this.renderHpBar(enemy.x - cameraX, enemy.y - cameraY - 6, enemy.width, 4, combatEnemyHpRatio);
      }
    }
  }

  renderPlayerHpBar(stats: CombatStats): void {
    const ratio = stats.hp / stats.maxHp;
    this.renderHpBar(8, 52, 60, 6, ratio);
  }

  renderBottomPanel(borderColor: number): void {
    this.graphics.fillStyle(0x1a1a1a, 0.95);
    this.graphics.fillRect(8, VIEW_HEIGHT - 64, VIEW_WIDTH - 16, 56);
    this.graphics.lineStyle(2, borderColor, 1);
    this.graphics.strokeRect(8, VIEW_HEIGHT - 64, VIEW_WIDTH - 16, 56);
  }

  private renderHpBar(x: number, y: number, width: number, height: number, ratio: number): void {
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(Math.round(x), Math.round(y), width, height);
    const color = ratio > 0.5 ? 0x59ffa0 : ratio > 0.25 ? 0xffcc66 : 0xff5370;
    this.graphics.fillStyle(color, 1);
    this.graphics.fillRect(Math.round(x), Math.round(y), Math.round(width * ratio), height);
  }
}
