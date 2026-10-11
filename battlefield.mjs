import {combatFamily} from './troop-equipment.mjs';
import {battleBuildings} from './building-rules.mjs';
import {battleMap} from './data/design/battle-maps.mjs';
export {BATTLE_TERRAINS,TERRAIN_NAMES,TERRAIN_HELP} from './data/design/battle-terrain.mjs';
// Every consumer, including movement and rendering, reads the same authored map.
export function terrainAt(b,x,y){
  return battleMap(b)?.tiles[y]?.[x]||'land';
}
export function unitTerrain(b,u){
  const ground=terrainAt(b,u.x,u.y);
  return ground==='bridge'&&combatFamily(u)==='ship'?'water':ground;
}
export function terrainMoveFactor(b,u){
  const ground=unitTerrain(b,u);
  if(ground==='forest')return combatFamily(u)==='cavalry'?.65:combatFamily(u)==='siege'?.75:.9;
  if(ground==='hill')return .85;
  if(ground==='marsh')return .6;
  if(ground==='bridge'&&combatFamily(u)==='cavalry')return .8;
  return 1;
}
export function canOccupy(b,u,x,y){
  return canTraverseTerrain(b,u,x,y)&&!blockedTerrain(b,x,y);
}
export function canTraverseTerrain(b,u,x,y){
  if(x<0||x>=14||y<0||y>=8)return false;
  const ground=terrainAt(b,x,y);
  return ground!=='rock'&&(ground!=='water'||!!u.equipment?.ship);
}
// Buildings occupy cells independently of the six troop slots.
export function blockedTerrain(b, x, y) {
  return battleBuildings(b).some(a=>a.hp>0&&x===a.x&&y===a.y);
}

export function gateTarget(b, unit) {
  if (!b.siege || b.siege.gate.hp <= 0 || unit.side !== b.siege.attackerSide) return null;
  return b.siege.gate;
}

export function waveSummary(b, side) {
  const groups = new Map();
  for (const u of b.sides[side].units) {
    if (!u.wave) continue;
    if (!groups.has(u.wave)) groups.set(u.wave, { wave: u.wave, armyId:u.armyId, arrivalTick: u.arrivalTick, ...(u.arrivalCondition?{arrivalCondition:u.arrivalCondition}:{}), arrived:(u.arrivalTick||0)<=b.tick&&u.arrivalConfirmed!==false, total: 0, waiting: 0, active: 0 });
    const group = groups.get(u.wave);
    group.total++;
    if (u.status === 'reserve') group.waiting++;
    if (u.status === 'active') group.active++;
  }
  return [...groups.values()].sort((a, c) => a.wave - c.wave);
}
