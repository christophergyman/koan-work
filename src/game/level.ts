import { ROOM_COLS, ROOM_ROWS, TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from './constants';

export type Tile = '.' | '#' | '@' | '^' | 'G' | 'N';

export type Level = {
  readonly rows: readonly string[];
  readonly width: number;
  readonly height: number;
  readonly spawn: { readonly x: number; readonly y: number };
  readonly npcs: readonly { readonly x: number; readonly y: number }[];
};

const room1 = [
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..@...........................',
  '..............#####...........',
  '..........N...................',
  '############################..',
] as const;

const room2 = [
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..................#####.......',
  '..............................',
  '............####..............',
  '..............................',
  '......####....................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..##########################..',
] as const;

const room3 = [
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '.............#####............',
  '..............................',
  '..............................',
  '....................G.........',
  '..............................',
  '..............................',
  '..............................',
  '..############################',
] as const;

export const level01Rows = room1.map((row, index) => row + room2[index] + room3[index]);

export function parseLevel(rows: readonly string[]): Level {
  if (rows.length === 0) throw new Error('Level must have at least one row.');

  const width = rows[0]?.length ?? 0;
  let spawn: { x: number; y: number } | undefined;
  const npcs: { x: number; y: number }[] = [];

  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    if (row.length !== width) throw new Error(`Level row ${y} has inconsistent width.`);

    for (let x = 0; x < row.length; x += 1) {
      const tile = row[x];
      if (!isKnownTile(tile)) throw new Error(`Unknown tile '${tile}' at ${x},${y}.`);
      if (tile === '@') spawn = { x: x * TILE_SIZE + 2, y: y * TILE_SIZE };
      if (tile === 'N') npcs.push({ x: x * TILE_SIZE + 2, y: y * TILE_SIZE });
    }
  }

  if (!spawn) throw new Error('Level must include a spawn tile (@).');

  return { rows, width, height: rows.length, spawn, npcs };
}

export function getTile(level: Level, tx: number, ty: number): Tile | undefined {
  if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) return undefined;
  return level.rows[ty]?.[tx] as Tile | undefined;
}

export function isSolidTile(level: Level, tx: number, ty: number): boolean {
  const tile = getTile(level, tx, ty);
  return tile === undefined || tile === '#';
}

export function getRoomForPosition(x: number, y: number): { roomX: number; roomY: number } {
  return {
    roomX: Math.floor(x / VIEW_WIDTH),
    roomY: Math.floor(y / VIEW_HEIGHT),
  };
}

export function assertLevelMatchesRoomGrid(level: Level): void {
  if (level.width % ROOM_COLS !== 0) throw new Error('Level width must be a multiple of room width.');
  if (level.height % ROOM_ROWS !== 0) throw new Error('Level height must be a multiple of room height.');
}

function isKnownTile(tile: string): tile is Tile {
  return tile === '.' || tile === '#' || tile === '@' || tile === '^' || tile === 'G' || tile === 'N';
}
