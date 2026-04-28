import { vi } from 'vitest';
import {
  calcDamage,
  createCombatState,
  ENEMY_TEMPLATES,
  PLAYER_BASE_STATS,
  tickCombat,
  type CombatState,
} from '../src/game/combat';

describe('combat system', () => {
  beforeEach(() => {
    // Seed-ish behavior: mock Math.random for deterministic tests
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // roll = 0 (0.5 * 7 = 3.5, floor = 3, -3 = 0)
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates combat state with cloned stats', () => {
    const state = createCombatState('slime', PLAYER_BASE_STATS);

    expect(state.enemyTemplateId).toBe('slime');
    expect(state.playerStats).toEqual(PLAYER_BASE_STATS);
    expect(state.enemyStats).toEqual(ENEMY_TEMPLATES.slime);
    expect(state.enemyDefeated).toBe(false);
    expect(state.playerDefeated).toBe(false);
    expect(state.log[0]).toBe('A wild slime appears!');
  });

  it('throws on unknown enemy template', () => {
    expect(() => createCombatState('dragon', PLAYER_BASE_STATS)).toThrow(/Unknown enemy template/);
  });

  it('calculates damage with rng roll', () => {
    // With mock random = 0.5, roll = 0
    const dmg = calcDamage(PLAYER_BASE_STATS, ENEMY_TEMPLATES.slime);
    expect(dmg).toBe(PLAYER_BASE_STATS.atk - ENEMY_TEMPLATES.slime.def + 0);
    expect(dmg).toBe(8 - 1 + 0);
    expect(dmg).toBe(7);
  });

  it('never deals less than 1 damage', () => {
    const weakAttacker = { maxHp: 10, hp: 10, atk: 1, def: 0, spd: 10 };
    const strongDefender = { maxHp: 10, hp: 10, atk: 1, def: 10, spd: 10 };
    vi.spyOn(Math, 'random').mockReturnValue(0); // roll = -3

    const dmg = calcDamage(weakAttacker, strongDefender);
    expect(dmg).toBe(1);
  });

  it('ticks combat: charges build and attacks trigger', () => {
    const state = createCombatState('slime', PLAYER_BASE_STATS);

    // Player spd=80, enemy spd=60. Charge threshold = 100.
    // After 1 second: player charge = 80, enemy charge = 60. No attacks.
    tickCombat(state, 1);
    expect(state.playerCharge).toBe(80);
    expect(state.enemyCharge).toBe(60);
    expect(state.log.length).toBe(1); // just the appear message

    // After another second: player charge = 160, enemy charge = 120.
    // Player attacks once (charge -> 60), enemy attacks once (charge -> 20).
    tickCombat(state, 1);
    expect(state.playerCharge).toBe(60);
    expect(state.enemyCharge).toBe(20);
    expect(state.log.length).toBe(3); // appear + player hit + enemy hit
  });

  it('defeats enemy when hp reaches 0', () => {
    const player = { ...PLAYER_BASE_STATS, atk: 50, spd: 1000 };
    const state = createCombatState('slime', player);

    tickCombat(state, 0.1);

    expect(state.enemyDefeated).toBe(true);
    expect(state.enemyStats.hp).toBe(0);
    expect(state.log[state.log.length - 1]).toBe('slime is defeated!');
  });

  it('defeats player when hp reaches 0', () => {
    const player = { ...PLAYER_BASE_STATS, hp: 1, def: 0 };
    const enemy = { ...ENEMY_TEMPLATES.slime, atk: 50, spd: 1000 };
    const state: CombatState = {
      playerStats: player,
      enemyStats: enemy,
      enemyTemplateId: 'slime',
      playerCharge: 0,
      enemyCharge: 0,
      log: [],
      enemyDefeated: false,
      playerDefeated: false,
    };

    tickCombat(state, 0.1);

    expect(state.playerDefeated).toBe(true);
    expect(state.playerStats.hp).toBe(0);
    expect(state.log[state.log.length - 1]).toBe('You were defeated...');
  });

  it('does not tick when already defeated', () => {
    const state = createCombatState('slime', PLAYER_BASE_STATS);
    state.enemyDefeated = true;

    tickCombat(state, 1);

    expect(state.playerCharge).toBe(0);
    expect(state.enemyCharge).toBe(0);
    expect(state.log.length).toBe(1);
  });
});
