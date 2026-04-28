import { FIXED_DT, JUMP_SPEED } from '../src/game/constants';
import type { InputState } from '../src/game/input';
import { parseLevel } from '../src/game/level';
import { updatePlayer } from '../src/game/physics';
import { createPlayer, type Player } from '../src/game/player';

const noInput: InputState = {
  left: false,
  right: false,
  jumpDown: false,
  jumpPressed: false,
  jumpReleased: false,
};

function input(overrides: Partial<InputState>): InputState {
  return { ...noInput, ...overrides };
}

function step(player: Player, rows: readonly string[], frames = 1, frameInput: InputState = noInput): void {
  const level = parseLevel(rows);
  for (let i = 0; i < frames; i += 1) updatePlayer(player, level, frameInput, FIXED_DT);
}

describe('custom platformer physics', () => {
  it('lands on solid floor', () => {
    const rows = [
      '........',
      '.@......',
      '........',
      '........',
      '########',
    ];
    const level = parseLevel(rows);
    const player = createPlayer(level);

    step(player, rows, 60);

    expect(player.grounded).toBe(true);
    expect(player.y + player.height).toBe(4 * 16);
    expect(player.vy).toBe(0);
  });

  it('is blocked by a solid wall', () => {
    const rows = [
      '..........',
      '.@...#....',
      '.....#....',
      '.....#....',
      '##########',
    ];
    const level = parseLevel(rows);
    const player = createPlayer(level);

    step(player, rows, 40, input({ right: true }));

    expect(player.x + player.width).toBe(5 * 16);
    expect(player.vx).toBe(0);
  });

  it('allows jumping during coyote time', () => {
    const rows = [
      '........',
      '.@......',
      '........',
      '........',
      '########',
    ];
    const level = parseLevel(rows);
    const player = createPlayer(level);
    player.grounded = false;
    player.coyoteTimer = 0.05;

    updatePlayer(player, level, input({ jumpDown: true, jumpPressed: true }), FIXED_DT);

    expect(player.vy).toBeLessThan(-JUMP_SPEED / 2);
    expect(player.coyoteTimer).toBe(0);
  });

  it('buffers jump input while airborne', () => {
    const rows = [
      '........',
      '.@......',
      '........',
      '........',
      '########',
    ];
    const level = parseLevel(rows);
    const player = createPlayer(level);
    player.grounded = false;

    updatePlayer(player, level, input({ jumpDown: true, jumpPressed: true }), FIXED_DT);

    expect(player.jumpBufferTimer).toBeGreaterThan(0);
  });
});
