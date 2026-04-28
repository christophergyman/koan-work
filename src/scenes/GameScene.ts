import * as Phaser from 'phaser';
import {
  FIXED_DT,
  FIXED_STEP_MS,
  MAX_FIXED_STEPS,
  TILE_SIZE,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from '../game/constants';
import {
  createCombatState,
  PLAYER_BASE_STATS,
  tickDefeatedEnemies,
  type CombatState,
  type CombatStats,
  updateCombatSession,
} from '../game/combat';
import { createDialogueState, NPC_DIALOGUES, updateDialogue, type DialogueState } from '../game/dialogue';
import { createEnemies, createNpcs, type Enemy, type Npc } from '../game/entities';
import { KeyboardInput, type InputState } from '../game/input';
import { assertLevelMatchesRoomGrid, getRoomForPosition, level01Rows, parseLevel } from '../game/level';
import { findNearby } from '../game/proximity';
import { updatePlayer } from '../game/physics';
import { createPlayer, type Player } from '../game/player';
import { WorldRenderer } from '../render/WorldRenderer';

export class GameScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private controls!: KeyboardInput;
  private readonly level = parseLevel(level01Rows);
  private readonly player: Player = createPlayer(this.level);
  private accumulatorMs = 0;
  private npcs: Npc[] = [];
  private dialogueState: DialogueState = createDialogueState();
  private nearbyNpcId: string | null = null;
  private dialogueText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  private enemies: Enemy[] = [];
  private combatState: CombatState | null = null;
  private activeEnemyId: string | null = null;
  private nearbyEnemyId: string | null = null;
  private playerStats: CombatStats = { ...PLAYER_BASE_STATS };
  private defeatedEnemies = new Map<string, number>();
  private deathPopupTimer = 0;
  private combatText!: Phaser.GameObjects.Text;
  private deathText!: Phaser.GameObjects.Text;
  private worldRenderer!: WorldRenderer;
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

    this.npcs = createNpcs(this.level);
    this.enemies = createEnemies(this.level);

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

    this.worldRenderer = new WorldRenderer(this.graphics);
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
      tickDefeatedEnemies(this.defeatedEnemies);
      if (this.deathPopupTimer > 0) this.deathPopupTimer -= 1;
      this.accumulatorMs -= FIXED_STEP_MS;
      steps += 1;
    }

    if (steps === MAX_FIXED_STEPS) this.accumulatorMs = 0;

    this.renderWorld();
  }

  private renderWorld(): void {
    const { roomX, roomY } = getRoomForPosition(this.player.x, this.player.y);
    const cameraX = roomX * VIEW_WIDTH;
    const cameraY = roomY * VIEW_HEIGHT;

    this.worldRenderer.clear();
    this.worldRenderer.renderTiles(this.level, roomX, roomY);
    this.worldRenderer.renderPlayer(this.player, cameraX, cameraY);
    this.worldRenderer.renderNpcs(this.npcs, cameraX, cameraY);

    const combatEnemyHpRatio = this.combatState && this.activeEnemyId
      ? this.combatState.enemyStats.hp / this.combatState.enemyStats.maxHp
      : null;
    this.worldRenderer.renderEnemies(
      this.enemies,
      new Set(this.defeatedEnemies.keys()),
      this.activeEnemyId,
      combatEnemyHpRatio,
      cameraX,
      cameraY,
    );

    this.worldRenderer.renderPlayerHpBar(this.playerStats);

    const hintTarget = this.nearbyEnemyId && !this.combatState
      ? this.enemies.find(e => e.id === this.nearbyEnemyId)
      : this.nearbyNpcId && !this.dialogueState.activeNpcId
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

    if (this.dialogueState.activeNpcId) {
      const dialogue = NPC_DIALOGUES[this.dialogueState.activeNpcId];
      if (dialogue && this.dialogueState.pageIndex < dialogue.pages.length) {
        this.worldRenderer.renderBottomPanel(0x8b95ff);
        this.dialogueText.setText(dialogue.pages[this.dialogueState.pageIndex]);
        this.dialogueText.setVisible(true);
      }
    } else {
      this.dialogueText.setVisible(false);
    }

    if (this.combatState) {
      this.worldRenderer.renderBottomPanel(0xff5370);
      this.combatText.setText(this.combatState.log.slice(-3).join('\n'));
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
    const nearbyNpc = findNearby(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
      this.npcs,
      TILE_SIZE * 1.5,
    );

    this.nearbyNpcId = nearbyNpc ? nearbyNpc.id : null;
    this.dialogueState = updateDialogue(this.dialogueState, input.interactPressed, this.nearbyNpcId);
  }

  private handleEnemyInteraction(input: InputState): void {
    if (this.combatState) return;

    const nearbyEnemy = findNearby(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
      this.enemies,
      TILE_SIZE * 1.5,
      e => !this.defeatedEnemies.has(e.id),
    );

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

    const result = updateCombatSession(
      this.combatState,
      FIXED_DT,
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
      enemy.x,
      enemy.y,
      enemy.width,
      enemy.height,
      TILE_SIZE,
    );

    if (result.type === 'ongoing') {
      this.player.x = result.newPlayerX;
      this.player.y = result.newPlayerY;
      return;
    }

    if (result.type === 'enemyDefeated') {
      this.defeatedEnemies.set(enemy.id, this.ENEMY_RESPAWN_TICKS);
      this.playerStats = result.playerStats;
      this.endCombat();
      return;
    }

    if (result.type === 'playerDefeated') {
      this.player.x = this.level.spawn.x;
      this.player.y = this.level.spawn.y;
      this.player.vx = 0;
      this.player.vy = 0;
      this.playerStats = { ...PLAYER_BASE_STATS };
      this.deathPopupTimer = 180;
      this.endCombat();
    }
  }

  private endCombat(): void {
    this.combatState = null;
    this.activeEnemyId = null;
  }
}
