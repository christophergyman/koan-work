import * as Phaser from 'phaser';
import './style.css';
import {
  FIXED_STEP_MS,
  MAX_FIXED_STEPS,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  ROOM_COLS,
  ROOM_ROWS,
  TILE_SIZE,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './game/constants';
import { NPC_DIALOGUES } from './game/dialogue';
import { KeyboardInput, type InputState } from './game/input';
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
  private npcs: { x: number; y: number; id: string; width: number; height: number }[] = [];
  private activeNpcId: string | null = null;
  private dialoguePageIndex = 0;
  private nearbyNpcId: string | null = null;
  private dialogueText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

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

    for (const npcPos of this.level.npcs) {
      this.npcs.push({
        x: npcPos.x,
        y: npcPos.y,
        id: 'villageIdiot',
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
      });
    }

    this.dialogueText = this.add.text(16, VIEW_HEIGHT - 56, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e6edf3',
      wordWrap: { width: VIEW_WIDTH - 32 },
    });
    this.dialogueText.setVisible(false);
    this.dialogueText.setDepth(10);

    this.hintText = this.add.text(0, 0, '[E] Talk', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 3, y: 2 },
    });
    this.hintText.setVisible(false);
    this.hintText.setDepth(10);
  }

  update(_time: number, deltaMs: number): void {
    this.accumulatorMs += Math.min(deltaMs, FIXED_STEP_MS * MAX_FIXED_STEPS);

    let steps = 0;
    while (this.accumulatorMs >= FIXED_STEP_MS && steps < MAX_FIXED_STEPS) {
      const input = this.controls.read();
      updatePlayer(this.player, this.level, input, FIXED_STEP_MS / 1000);
      this.handleNpcInteraction(input);
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

    for (const npc of this.npcs) {
      this.graphics.fillStyle(0xff66ff, 1);
      this.graphics.fillRect(
        Math.round(npc.x - cameraX),
        Math.round(npc.y - cameraY),
        npc.width,
        npc.height,
      );
    }

    if (this.nearbyNpcId && !this.activeNpcId) {
      const npc = this.npcs.find(n => n.id === this.nearbyNpcId);
      if (npc) {
        this.hintText.setPosition(
          Math.round(npc.x - cameraX + npc.width / 2 - this.hintText.width / 2),
          Math.round(npc.y - cameraY - 16),
        );
        this.hintText.setVisible(true);
      }
    } else {
      this.hintText.setVisible(false);
    }

    if (this.activeNpcId) {
      const dialogue = NPC_DIALOGUES[this.activeNpcId];
      if (dialogue && this.dialoguePageIndex < dialogue.pages.length) {
        const page = dialogue.pages[this.dialoguePageIndex];

        this.graphics.fillStyle(0x1a1a2e, 0.95);
        this.graphics.fillRect(8, VIEW_HEIGHT - 64, VIEW_WIDTH - 16, 56);
        this.graphics.lineStyle(2, 0x8b95ff, 1);
        this.graphics.strokeRect(8, VIEW_HEIGHT - 64, VIEW_WIDTH - 16, 56);

        this.dialogueText.setText(page);
        this.dialogueText.setVisible(true);
      }
    } else {
      this.dialogueText.setVisible(false);
    }

    this.hud.setText([
      `pos ${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}`,
      `vel ${this.player.vx.toFixed(1)}, ${this.player.vy.toFixed(1)}`,
      `grounded ${this.player.grounded}`,
      `room ${roomX}, ${roomY}`,
    ]);
  }

  private handleNpcInteraction(input: InputState): void {
    const proximity = TILE_SIZE * 1.5;
    let nearbyNpc: typeof this.npcs[0] | null = null;

    for (const npc of this.npcs) {
      const dx = (this.player.x + this.player.width / 2) - (npc.x + npc.width / 2);
      const dy = (this.player.y + this.player.height / 2) - (npc.y + npc.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= proximity) {
        nearbyNpc = npc;
        break;
      }
    }

    this.nearbyNpcId = nearbyNpc ? nearbyNpc.id : null;

    if (this.activeNpcId) {
      const activeNpc = this.npcs.find(n => n.id === this.activeNpcId);
      if (!activeNpc) {
        this.closeDialogue();
        return;
      }

      const dx = (this.player.x + this.player.width / 2) - (activeNpc.x + activeNpc.width / 2);
      const dy = (this.player.y + this.player.height / 2) - (activeNpc.y + activeNpc.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > proximity) {
        this.closeDialogue();
        return;
      }

      if (input.interactPressed) {
        const dialogue = NPC_DIALOGUES[this.activeNpcId];
        if (!dialogue) {
          this.closeDialogue();
          return;
        }

        this.dialoguePageIndex += 1;
        if (this.dialoguePageIndex >= dialogue.pages.length) {
          this.closeDialogue();
        }
      }
      return;
    }

    if (nearbyNpc && input.interactPressed) {
      this.activeNpcId = nearbyNpc.id;
      this.dialoguePageIndex = 0;
    }
  }

  private closeDialogue(): void {
    this.activeNpcId = null;
    this.dialoguePageIndex = 0;
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
