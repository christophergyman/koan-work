import {
  AIR_FRICTION,
  COYOTE_TIME,
  GRAVITY,
  GROUND_FRICTION,
  JUMP_BUFFER_TIME,
  JUMP_CUT_MULTIPLIER,
  JUMP_SPEED,
  MAX_FALL_SPEED,
  MAX_RUN_SPEED,
  RUN_ACCEL,
  TILE_SIZE,
} from './constants';
import type { InputState } from './input';
import { isSolidTile, type Level } from './level';
import type { Player } from './player';

const EPSILON = 0.001;

export function updatePlayer(player: Player, level: Level, input: InputState, dt: number): void {
  updateHorizontalVelocity(player, input, dt);
  updateJumpTimers(player, input, dt);

  if (player.jumpBufferTimer > 0 && (player.grounded || player.coyoteTimer > 0)) {
    player.vy = -JUMP_SPEED;
    player.grounded = false;
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;
  }

  if (input.jumpReleased && player.vy < 0) {
    player.vy *= JUMP_CUT_MULTIPLIER;
  }

  player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL_SPEED);

  moveX(player, level, player.vx * dt);
  moveY(player, level, player.vy * dt);
}

function updateHorizontalVelocity(player: Player, input: InputState, dt: number): void {
  const direction = Number(input.right) - Number(input.left);

  if (direction !== 0) {
    player.vx += direction * RUN_ACCEL * dt;
    player.vx = clamp(player.vx, -MAX_RUN_SPEED, MAX_RUN_SPEED);
    return;
  }

  const friction = player.grounded ? GROUND_FRICTION : AIR_FRICTION;
  player.vx = approach(player.vx, 0, friction * dt);
}

function updateJumpTimers(player: Player, input: InputState, dt: number): void {
  player.coyoteTimer = player.grounded ? COYOTE_TIME : Math.max(0, player.coyoteTimer - dt);

  if (input.jumpPressed) {
    player.jumpBufferTimer = JUMP_BUFFER_TIME;
  } else {
    player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
  }
}

function moveX(player: Player, level: Level, deltaX: number): void {
  player.x += deltaX;

  if (!overlapsSolid(level, player.x, player.y, player.width, player.height)) return;

  if (deltaX > 0) {
    const rightTile = Math.floor((player.x + player.width - EPSILON) / TILE_SIZE);
    player.x = rightTile * TILE_SIZE - player.width;
  } else if (deltaX < 0) {
    const leftTile = Math.floor(player.x / TILE_SIZE);
    player.x = (leftTile + 1) * TILE_SIZE;
  }

  player.vx = 0;
}

function moveY(player: Player, level: Level, deltaY: number): void {
  player.y += deltaY;
  player.grounded = false;

  if (!overlapsSolid(level, player.x, player.y, player.width, player.height)) return;

  if (deltaY > 0) {
    const bottomTile = Math.floor((player.y + player.height - EPSILON) / TILE_SIZE);
    player.y = bottomTile * TILE_SIZE - player.height;
    player.grounded = true;
  } else if (deltaY < 0) {
    const topTile = Math.floor(player.y / TILE_SIZE);
    player.y = (topTile + 1) * TILE_SIZE;
  }

  player.vy = 0;
}

function overlapsSolid(level: Level, x: number, y: number, width: number, height: number): boolean {
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + width - EPSILON) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + height - EPSILON) / TILE_SIZE);

  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      if (isSolidTile(level, tx, ty)) return true;
    }
  }

  return false;
}

function approach(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return target;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
