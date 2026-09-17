// The gate occupies one cell, independently of the six troop slots.
export function blockedTerrain(b, x, y) {
  const gate = b.siege?.gate;
  return !!gate && gate.hp > 0 && x === gate.x && y === gate.y;
}

export function gateTarget(b, unit) {
  if (!b.siege || b.siege.gate.hp <= 0 || unit.side !== b.siege.attackerSide) return null;
  return b.siege.gate;
}

export function waveSummary(b, side) {
  const groups = new Map();
  for (const u of b.sides[side].units) {
    if (!u.wave) continue;
    if (!groups.has(u.wave)) groups.set(u.wave, { wave: u.wave, arrivalTick: u.arrivalTick, total: 0, waiting: 0, active: 0 });
    const group = groups.get(u.wave);
    group.total++;
    if (u.status === 'reserve') group.waiting++;
    if (u.status === 'active') group.active++;
  }
  return [...groups.values()].sort((a, c) => a.wave - c.wave);
}
