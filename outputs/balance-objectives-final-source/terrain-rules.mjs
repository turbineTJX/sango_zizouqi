import {unitTerrain,TERRAIN_NAMES} from './battlefield.mjs';

const PROFILES = {
  fire:{description:'按目标格：林地伤害 +30%，湿地 −20%，水面 −40%；灼烧每步按目标当前地形修正。',target:{forest:1.3,marsh:.8,water:.6}},
  ranged:{description:'按施放格：高地伤害 +20%；按目标格：林地伤害 −20%；两项相乘。',source:{hill:1.2},target:{forest:.8}},
  charge:{description:'按起点、冲锋路径及目标格中最不利地形：林地伤害 −30%，高地 −15%，湿地 −40%，桥面 −20%。',path:{forest:.7,hill:.85,marsh:.6,bridge:.8}},
  ambush:{description:'按施放格：林地伤害及迟滞、疲弱时长 +30%，高地 +15%，湿地 −20%。',source:{forest:1.3,hill:1.15,marsh:.8},statuses:['slow','weaken']},
  fortify:{description:'按施放格：高地、桥面状态时长 +25%，湿地 −25%。',source:{hill:1.25,bridge:1.25,marsh:.75},statuses:['phalanx','bulwark','camp'],noDamage:true},
  mobility:{description:'按施放格：林地、桥面减伤与疾行时长 −25%，湿地 −50%。',source:{forest:.75,bridge:.75,marsh:.5},statuses:['ward','haste'],noDamage:true},
  emplace:{description:'按施放格：高地架设时长 +20%，湿地 −40%。',source:{hill:1.2,marsh:.6},statuses:['emplaced'],noDamage:true},
  water:{description:'按目标格：水面伤害及迟滞、衰咒时长 +25%，岸地 −30%；舰船在桥下按水面，陆军在桥上按岸地。',target:{water:1.25,land:.7,forest:.7,hill:.7,marsh:.7,bridge:.7},statuses:['slow','curse']},
};
export function tacticTerrainProfile(s){
  if(s.burn||['fire','wildfire'].includes(s.effect))return 'fire';
  if(['rush','terror'].includes(s.effect))return 'charge';
  if(['scatter','repeat','retreatShot','pierce','suppress','bombard','broadside'].includes(s.effect)||s.effect==='famous'&&s.mode==='attack'&&s.category==='force'&&s.range>1)return 'ranged';
  if(s.effect==='ambush')return 'ambush';
  if(['phalanx','bulwark','camp'].includes(s.effect))return 'fortify';
  if(s.effect==='gallop')return 'mobility';
  if(s.effect==='emplace')return 'emplace';
  if(s.effect==='undertow')return 'water';
  return null;
}
export function terrainTacticDescription(s){
  if(s.attackOrb&&['fire','suppress','pierce'].includes(s.id||s.effect))return '地形只修正附加的武技威力，原普攻不乘战法地形系数。'+(PROFILES[tacticTerrainProfile(s)]?.description||'');
  return PROFILES[tacticTerrainProfile(s)]?.description||'无额外地形修正；仍遵守水陆通行、射程与目标限制。';
}
export const fireTerrainFactor=(b,target)=>PROFILES.fire.target[unitTerrain(b,target)]??1;
// The caller supplies the cast origin and real route before any movement occurs.
export function tacticTerrainEffect(b,source,s,target=source,path=[]){
  const profile=PROFILES[tacticTerrainProfile(s)];
  const from=unitTerrain(b,source),to=unitTerrain(b,target);
  if(!profile)return {factor:1,damage:1,statuses:[],label:''};
  const route=[source,...path.map(p=>({...source,...p})),target];
  const factor=profile.path?Math.min(...route.map(p=>profile.path[unitTerrain(b,p)]??1)):(profile.source?.[from]??1)*(profile.target?.[to]??1);
  const label=factor===1?'':`${profile.path?'冲锋沿途':profile.source&&profile.target?TERRAIN_NAMES[from]+' → '+TERRAIN_NAMES[to]:TERRAIN_NAMES[profile.source?from:to]}：${profile.noDamage?'状态时长':profile.statuses?'伤害/状态时长':'伤害'} ${factor>1?'+':'−'}${Math.round(Math.abs(factor-1)*100)}%`;
  return {factor,damage:profile.noDamage?1:factor,statuses:profile.statuses||[],label};
}
