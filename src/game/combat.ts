export type CombatStats = {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
};

export const PLAYER_BASE_STATS: CombatStats = {
  maxHp: 30,
  hp: 30,
  atk: 8,
  def: 2,
  spd: 80,
};

export const ENEMY_TEMPLATES: Record<string, CombatStats> = {
  slime: {
    maxHp: 20,
    hp: 20,
    atk: 5,
    def: 1,
    spd: 60,
  },
};

const CHARGE_THRESHOLD = 100;

export type CombatState = {
  readonly playerStats: CombatStats;
  readonly enemyStats: CombatStats;
  readonly enemyTemplateId: string;
  playerCharge: number;
  enemyCharge: number;
  log: string[];
  enemyDefeated: boolean;
  playerDefeated: boolean;
};

export function createCombatState(enemyTemplateId: string, playerStats: CombatStats): CombatState {
  const template = ENEMY_TEMPLATES[enemyTemplateId];
  if (!template) throw new Error(`Unknown enemy template: ${enemyTemplateId}`);

  return {
    playerStats: cloneStats(playerStats),
    enemyStats: cloneStats(template),
    enemyTemplateId,
    playerCharge: 0,
    enemyCharge: 0,
    log: [`A wild ${enemyTemplateId} appears!`],
    enemyDefeated: false,
    playerDefeated: false,
  };
}

export function tickCombat(state: CombatState, dt: number): void {
  if (state.enemyDefeated || state.playerDefeated) return;

  state.playerCharge += state.playerStats.spd * dt;
  state.enemyCharge += state.enemyStats.spd * dt;

  while (state.playerCharge >= CHARGE_THRESHOLD && !state.enemyDefeated && !state.playerDefeated) {
    state.playerCharge -= CHARGE_THRESHOLD;
    const dmg = calcDamage(state.playerStats, state.enemyStats);
    state.enemyStats.hp -= dmg;
    state.log.push(`You hit ${state.enemyTemplateId} for ${dmg}!`);
    if (state.enemyStats.hp <= 0) {
      state.enemyStats.hp = 0;
      state.enemyDefeated = true;
      state.log.push(`${state.enemyTemplateId} is defeated!`);
      return;
    }
  }

  while (state.enemyCharge >= CHARGE_THRESHOLD && !state.enemyDefeated && !state.playerDefeated) {
    state.enemyCharge -= CHARGE_THRESHOLD;
    const dmg = calcDamage(state.enemyStats, state.playerStats);
    state.playerStats.hp -= dmg;
    state.log.push(`${state.enemyTemplateId} hits you for ${dmg}!`);
    if (state.playerStats.hp <= 0) {
      state.playerStats.hp = 0;
      state.playerDefeated = true;
      state.log.push('You were defeated...');
      return;
    }
  }
}

export function calcDamage(attacker: CombatStats, defender: CombatStats): number {
  const roll = Math.floor(Math.random() * 7) - 3; // -3 to +3
  const raw = attacker.atk - defender.def + roll;
  return Math.max(1, raw);
}

export type CombatResult =
  | { type: 'ongoing'; newPlayerX: number; newPlayerY: number }
  | { type: 'enemyDefeated'; playerStats: CombatStats }
  | { type: 'playerDefeated' };

export function updateCombatSession(
  state: CombatState,
  dt: number,
  playerX: number,
  playerY: number,
  playerWidth: number,
  playerHeight: number,
  enemyX: number,
  enemyY: number,
  enemyWidth: number,
  enemyHeight: number,
  tetherRadius: number,
): CombatResult {
  tickCombat(state, dt);

  // Tether
  const ecx = enemyX + enemyWidth / 2;
  const ecy = enemyY + enemyHeight / 2;
  const pcx = playerX + playerWidth / 2;
  const pcy = playerY + playerHeight / 2;
  const dx = pcx - ecx;
  const dy = pcy - ecy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  let newPlayerX = playerX;
  let newPlayerY = playerY;

  if (dist > tetherRadius) {
    const ratio = tetherRadius / dist;
    newPlayerX = ecx + dx * ratio - playerWidth / 2;
    newPlayerY = ecy + dy * ratio - playerHeight / 2;
  }

  if (state.enemyDefeated) {
    return { type: 'enemyDefeated', playerStats: state.playerStats };
  }

  if (state.playerDefeated) {
    return { type: 'playerDefeated' };
  }

  return { type: 'ongoing', newPlayerX, newPlayerY };
}

export function tickDefeatedEnemies(defeated: Map<string, number>): void {
  for (const [id, remaining] of defeated) {
    const next = remaining - 1;
    if (next <= 0) {
      defeated.delete(id);
    } else {
      defeated.set(id, next);
    }
  }
}

function cloneStats(stats: CombatStats): CombatStats {
  return { ...stats };
}
