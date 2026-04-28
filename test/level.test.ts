import { ROOM_COLS, ROOM_ROWS, TILE_SIZE } from '../src/game/constants';
import { assertLevelMatchesRoomGrid, isSolidTile, level01Rows, parseLevel } from '../src/game/level';

describe('level parsing', () => {
  it('parses the demo level dimensions and spawn', () => {
    const level = parseLevel(level01Rows);

    expect(level.width).toBe(ROOM_COLS * 3);
    expect(level.height).toBe(ROOM_ROWS);
    expect(level.spawn).toEqual({ x: 2 * TILE_SIZE + 2, y: 14 * TILE_SIZE });
    expect(() => assertLevelMatchesRoomGrid(level)).not.toThrow();
  });

  it('treats out-of-bounds as solid', () => {
    const level = parseLevel(level01Rows);

    expect(isSolidTile(level, -1, 0)).toBe(true);
    expect(isSolidTile(level, 0, -1)).toBe(true);
    expect(isSolidTile(level, level.width, 0)).toBe(true);
    expect(isSolidTile(level, 0, level.height)).toBe(true);
  });

  it('rejects inconsistent row widths', () => {
    expect(() => parseLevel(['@..', '....'])).toThrow(/inconsistent width/);
  });
});
