import { PLAYER_HEIGHT, PLAYER_WIDTH } from './constants';
import type { Level } from './level';

export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
};

export function createPlayer(level: Level): Player {
  return {
    x: level.spawn.x,
    y: level.spawn.y,
    vx: 0,
    vy: 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    grounded: false,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
  };
}
