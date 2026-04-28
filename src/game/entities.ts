import { PLAYER_HEIGHT, PLAYER_WIDTH } from './constants';
import type { Level } from './level';

export type Npc = {
  readonly x: number;
  readonly y: number;
  readonly id: string;
  readonly width: number;
  readonly height: number;
};

export type Enemy = {
  readonly x: number;
  readonly y: number;
  readonly id: string;
  readonly templateId: string;
  readonly width: number;
  readonly height: number;
};

export function createNpcs(level: Level): Npc[] {
  return level.npcs.map((pos, i) => ({
    x: pos.x,
    y: pos.y,
    id: i === 0 ? 'villageIdiot' : `npc-${i}`,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
  }));
}

export function createEnemies(level: Level): Enemy[] {
  return level.enemies.map((pos, i) => ({
    x: pos.x,
    y: pos.y,
    id: `enemy-${i}`,
    templateId: 'slime',
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
  }));
}
