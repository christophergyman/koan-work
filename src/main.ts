import * as Phaser from 'phaser';
import './style.css';
import {
  FIXED_DT,
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
import {
  createCombatState,
  PLAYER_BASE_STATS,
  tickCombat,
  type CombatState,
  type CombatStats,
} from './game/combat';
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

  private enemies: { x: number; y: number; id: string; templateId: string; width: number; height: number }[] = [];
  private combatState: CombatState | null = null;
  private activeEnemyId: string | null = null;
  private nearbyEnemyId: string | null = null;
  private playerStats: CombatStats = { ...PLAYER_BASE_STATS };
  private defeatedEnemies = new Map<string, number>();
  private deathPopupTimer = 0;
  private combatText!: Phaser.GameObjects.Text;
  private deathText!: Phaser.GameObjects.Text;
  private showDebug = true;
  private readonly ENEMY_RESPAWN_TICKS = 600; // ~10 seconds at 60fps

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

    for (let i = 0; i < this.level.enemies.length; i += 1) {
      const enemyPos = this.level.enemies[i];
      this.enemies.push({
        x: enemyPos.x,
        y: enemyPos.y,
        id: `enemy-${i}`,
        templateId: 'slime',
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

    this.combatText = this.add.text(16, VIEW_HEIGHT - 56, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#e6edf3',
      wordWrap: { width: VIEW_WIDTH - 32 },
    });
    this.combatText.setVisible(false);
    this.combatText.setDepth(10);

    this.deathText = this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ff5370',
      align: 'center',
    });
    this.deathText.setOrigin(0.5, 0.5);
    this.deathText.setVisible(false);
    this.deathText.setDepth(10);

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
      if (input.toggleDebugPressed) this.showDebug = !this.showDebug;
      this.handleEnemyInteraction(input);
      if (!this.combatState) {
        this.handleNpcInteraction(input);
      }
      this.tickCombatAndTether();
      this.tickDefeatedEnemies();
      if (this.deathPopupTimer > 0) this.deathPopupTimer -= 1;
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

    for (const enemy of this.enemies) {
      if (this.defeatedEnemies.has(enemy.id)) continue;
      this.graphics.fillStyle(0xff5370, 1);
      this.graphics.fillRect(
        Math.round(enemy.x - cameraX),
        Math.round(enemy.y - cameraY),
        enemy.width,
        enemy.height,
      );
      if (this.combatState && this.activeEnemyId === enemy.id) {
        const barWidth = enemy.width;
        const hpRatio = this.combatState.enemyStats.hp / this.combatState.enemyStats.maxHp;
        this.graphics.fillStyle(0x333333, 1);
        this.graphics.fillRect(
          Math.round(enemy.x - cameraX),
          Math.round(enemy.y - cameraY - 6),
          barWidth,
          4,
        );
        this.graphics.fillStyle(hpRatio > 0.5 ? 0x59ffa0 : hpRatio > 0.25 ? 0xffcc66 : 0xff5370, 1);
        this.graphics.fillRect(
          Math.round(enemy.x - cameraX),
          Math.round(enemy.y - cameraY - 6),
          Math.round(barWidth * hpRatio),
          4,
        );
      }
    }

    // Player HP bar
    const playerHpRatio = this.playerStats.hp / this.playerStats.maxHp;
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(8, 52, 60, 6);
    this.graphics.fillStyle(playerHpRatio > 0.5 ? 0x59ffa0 : playerHpRatio > 0.25 ? 0xffcc66 : 0xff5370, 1);
    this.graphics.fillRect(8, 52, Math.round(60 * playerHpRatio), 6);

    const hintTarget = this.nearbyEnemyId && !this.combatState
      ? this.enemies.find(e => e.id === this.nearbyEnemyId)
      : this.nearbyNpcId && !this.activeNpcId
        ? this.npcs.find(n => n.id === this.nearbyNpcId)
        : null;

    if (hintTarget) {
      const isEnemy = 'templateId' in hintTarget;
      this.hintText.setText(isEnemy ? '[E] Fight' : '[E] Talk');
      this.hintText.setPosition(
        Math.round(hintTarget.x - cameraX + hintTarget.width / 2 - this.hintText.width / 2),
        Math.round(hintTarget.y - cameraY - 16),
      );
      this.hintText.setVisible(true);
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

    if (this.combatState) {
      const log = this.combatState.log.slice(-3).join('\n');

      this.graphics.fillStyle(0x1a1a1a, 0.95);
      this.graphics.fillRect(8, VIEW_HEIGHT - 64, VIEW_WIDTH - 16, 56);
      this.graphics.lineStyle(2, 0xff5370, 1);
      this.graphics.strokeRect(8, VIEW_HEIGHT - 64, VIEW_WIDTH - 16, 56);

      this.combatText.setText(log);
      this.combatText.setVisible(true);
    } else {
      this.combatText.setVisible(false);
    }

    if (this.deathPopupTimer > 0) {
      this.deathText.setText("hmm that was weird, dont rememeber much");
      this.deathText.setVisible(true);
    } else {
      this.deathText.setVisible(false);
    }

    if (this.showDebug) {
      this.hud.setText([
        `pos ${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}`,
        `vel ${this.player.vx.toFixed(1)}, ${this.player.vy.toFixed(1)}`,
        `grounded ${this.player.grounded}`,
        `room ${roomX}, ${roomY}`,
        `hp ${this.playerStats.hp}/${this.playerStats.maxHp}`,
      ]);
      this.hud.setVisible(true);
    } else {
      this.hud.setVisible(false);
    }
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

  private handleEnemyInteraction(input: InputState): void {
    if (this.combatState) return; // already fighting

    const proximity = TILE_SIZE * 1.5;
    let nearbyEnemy: typeof this.enemies[0] | null = null;

    for (const enemy of this.enemies) {
      if (this.defeatedEnemies.has(enemy.id)) continue;
      const dx = (this.player.x + this.player.width / 2) - (enemy.x + enemy.width / 2);
      const dy = (this.player.y + this.player.height / 2) - (enemy.y + enemy.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= proximity) {
        nearbyEnemy = enemy;
        break;
      }
    }

    this.nearbyEnemyId = nearbyEnemy ? nearbyEnemy.id : null;

    if (nearbyEnemy && input.interactPressed) {
      this.activeEnemyId = nearbyEnemy.id;
      this.combatState = createCombatState(nearbyEnemy.templateId, this.playerStats);
    }
  }

  private tickCombatAndTether(): void {
    if (!this.combatState || !this.activeEnemyId) return;

    const enemy = this.enemies.find(e => e.id === this.activeEnemyId);
    if (!enemy || this.defeatedEnemies.has(enemy.id)) {
      this.endCombat();
      return;
    }

    tickCombat(this.combatState, FIXED_DT);

    // Tether: push player back into 1 tile radius
    const tetherRadius = TILE_SIZE;
    const ecx = enemy.x + enemy.width / 2;
    const ecy = enemy.y + enemy.height / 2;
    const pcx = this.player.x + this.player.width / 2;
    const pcy = this.player.y + this.player.height / 2;
    const dx = pcx - ecx;
    const dy = pcy - ecy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > tetherRadius) {
      const ratio = tetherRadius / dist;
      const newPcx = ecx + dx * ratio;
      const newPcy = ecy + dy * ratio;
      this.player.x = newPcx - this.player.width / 2;
      this.player.y = newPcy - this.player.height / 2;
    }

    // Check outcomes
    if (this.combatState.enemyDefeated) {
      this.defeatedEnemies.set(enemy.id, this.ENEMY_RESPAWN_TICKS);
      this.playerStats = this.combatState.playerStats;
      this.endCombat();
      return;
    }

    if (this.combatState.playerDefeated) {
      this.player.x = this.level.spawn.x;
      this.player.y = this.level.spawn.y;
      this.player.vx = 0;
      this.player.vy = 0;
      this.playerStats = { ...PLAYER_BASE_STATS };
      this.deathPopupTimer = 180; // ~3 seconds at 60fps
      this.endCombat();
    }
  }

  private tickDefeatedEnemies(): void {
    for (const [id, remaining] of this.defeatedEnemies) {
      const next = remaining - 1;
      if (next <= 0) {
        this.defeatedEnemies.delete(id);
      } else {
        this.defeatedEnemies.set(id, next);
      }
    }
  }

  private endCombat(): void {
    this.combatState = null;
    this.activeEnemyId = null;
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
