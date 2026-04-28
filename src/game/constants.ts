export const VIEW_WIDTH = 480;
export const VIEW_HEIGHT = 288;
export const TILE_SIZE = 16;

export const ROOM_COLS = VIEW_WIDTH / TILE_SIZE;
export const ROOM_ROWS = VIEW_HEIGHT / TILE_SIZE;

export const FIXED_DT = 1 / 60;
export const FIXED_STEP_MS = FIXED_DT * 1000;
export const MAX_FIXED_STEPS = 5;

export const PLAYER_WIDTH = 12;
export const PLAYER_HEIGHT = 16;

export const GRAVITY = 1400;
export const MAX_FALL_SPEED = 700;
export const MAX_RUN_SPEED = 150;
export const RUN_ACCEL = 1800;
export const GROUND_FRICTION = 2600;
export const AIR_FRICTION = 900;
export const JUMP_SPEED = 430;
export const COYOTE_TIME = 0.1;
export const JUMP_BUFFER_TIME = 0.1;
export const JUMP_CUT_MULTIPLIER = 0.45;
