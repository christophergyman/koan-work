export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export interface ProximityTarget {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function findNearby<T extends ProximityTarget>(
  px: number,
  py: number,
  pWidth: number,
  pHeight: number,
  entities: readonly T[],
  radius: number,
  filter?: (e: T) => boolean,
): T | null {
  const pcx = px + pWidth / 2;
  const pcy = py + pHeight / 2;

  for (const entity of entities) {
    if (filter && !filter(entity)) continue;
    const ecx = entity.x + entity.width / 2;
    const ecy = entity.y + entity.height / 2;
    if (distance(pcx, pcy, ecx, ecy) <= radius) {
      return entity;
    }
  }

  return null;
}
