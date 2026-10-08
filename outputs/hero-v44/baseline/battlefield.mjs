import {battleBuildings} from './building-rules.mjs';
export const BATTLE_TERRAINS = Object.freeze({land:'平原',forest:'林地',hill:'丘陵',marsh:'湿地',river:'河流'});
export const TERRAIN_NAMES = Object.freeze({land:'平地',forest:'林地',hill:'高地',marsh:'湿地',water:'水面',bridge:'桥梁'});
export const TERRAIN_HELP = Object.freeze({
  land:'开阔平原，战法按基础效果结算。',
  forest:'两翼林地、中路平地；林中火攻与伏弩增强，射击和骑兵冲锋受限。',
  hill:'两侧高地、中央平地；高地射击与列阵增强，冲锋和行军减慢。',
  marsh:'中央湿地、两翼平地；湿地火攻、冲锋和列阵减弱，行军减慢。',
  river:'双水道与中央桥梁；舰船走水面和桥下，陆军走岸地和桥面；水面火攻减弱，涡流增强。',
});
// Fixed, mirrored layouts are derived from the saved preset; no extra RNG draws.
export function terrainAt(b,x,y){
  if(b.terrain==='river'&&[3,4].includes(y))return [6,7].includes(x)?'bridge':'water';
  if(b.terrain==='forest'&&x>=2&&x<=11&&[1,2,5,6].includes(y))return 'forest';
  if(b.terrain==='hill'&&[2,3,4,9,10,11].includes(x)&&y>=1&&y<=6)return 'hill';
  if(b.terrain==='marsh'&&x>=4&&x<=9&&y>=2&&y<=5)return 'marsh';
  return 'land';
}
export function unitTerrain(b,u){
  const ground=terrainAt(b,u.x,u.y);
  return ground==='bridge'&&u.type==='ship'?'water':ground;
}
export function terrainMoveFactor(b,u){
  const ground=unitTerrain(b,u);
  if(ground==='forest')return u.type==='cavalry'?.65:u.type==='siege'?.75:.9;
  if(ground==='hill')return .85;
  if(ground==='marsh')return .6;
  if(ground==='bridge'&&u.type==='cavalry')return .8;
  return 1;
}
export function canOccupy(b,u,x,y){
  if(x<0||x>=14||y<0||y>=8||blockedTerrain(b,x,y))return false;
  const ground=terrainAt(b,x,y);
  return u.type==='ship'?['water','bridge'].includes(ground):ground!=='water';
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
    if (!groups.has(u.wave)) groups.set(u.wave, { wave: u.wave, arrivalTick: u.arrivalTick, total: 0, waiting: 0, active: 0 });
    const group = groups.get(u.wave);
    group.total++;
    if (u.status === 'reserve') group.waiting++;
    if (u.status === 'active') group.active++;
  }
  return [...groups.values()].sort((a, c) => a.wave - c.wave);
}
