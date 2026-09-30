import {grantReserveEntries,syncPeach} from './bond-reserves-peach.mjs';
import {grantBondEquipment,validBondEquipment} from './bond-equipment.mjs';
import {grantFormationEntries,formationBoost,validFormationEntry,routDamageBonus,routSpeedBonus} from './bond-battlefield.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {BOND_ASSIGNMENTS} from './data/design/bond-assignments.mjs';
import {troopFamily} from './troop-training.mjs';
export const bondCaps=u=>BOND_ASSIGNMENTS[u.id]||{bondGuard:1};
const hash=s=>{let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
function random(g){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296;}
export function advanceBonds(u,seed=0){
 const g=u.bondGrowth ||= {level:1,seed:hash(`${seed}:${u.id}`),levels:{}};
 const gained=[];
 while(g.level<Math.min(10,u.level??1)){
  g.level++;
  // Each missing point has equal probability of arriving at any remaining level.
  const probability=1/(11-g.level);
  for(const [id,cap] of Object.entries(bondCaps(u))){
   const missing=cap-(g.levels[id]||0);
   for(let i=0;i<missing;i++)if(random(g)<probability){g.levels[id]=(g.levels[id]||0)+1;gained.push(id);}
  }
 }
 return gained;
}
export function bondLevels(u){
 if(u.bondGrowth)return u.bondGrowth.levels;
 const copy={id:u.id,level:u.level??1};advanceBonds(copy);return copy.bondGrowth.levels;
}
export function validBondGrowth(u){
 const g=u.bondGrowth,caps=bondCaps(u);
 return !!g&&g.level===(u.level??1)&&Number.isInteger(g.seed)&&g.seed>=0&&g.seed<=0xffffffff&&g.levels&&typeof g.levels==='object'&&!Array.isArray(g.levels)&&Object.entries(g.levels).every(([id,n])=>Number.isInteger(n)&&n>0&&n<=(caps[id]||0))&&(g.level!==10||Object.entries(caps).every(([id,n])=>g.levels[id]===n));
}
export const bondOnField=u=>u.status==='active'&&u.hp>0&&!u.isDecoy;
export function sideBonds(b,side){
 const sums={};
 for(const u of b?.sides?.[side]?.units||[])if(bondOnField(u))for(const [id,n] of Object.entries(bondLevels(u)))sums[id]=(sums[id]||0)+n;
 return Object.fromEntries(Object.entries(sums).map(([id,points])=>[id,{points,tier:BOND_DESIGNS[id].thresholds.filter(n=>points>=n).length}]));
}
export function activeBonds(b,u){
 if(!b||!bondOnField(u))return [];
 return Object.entries(sideBonds(b,u.side)).filter(([id,s])=>s.tier>0&&(BOND_DESIGNS[id].family?troopFamily(u.type)===BOND_DESIGNS[id].family:(bondLevels(u)[id]||0)>0)).map(([id,s])=>({id,...BOND_DESIGNS[id],...s}));
}
export const topBond=(b,u,id)=>activeBonds(b,u).some(x=>x.id===id&&x.tier===x.thresholds.length);
export function bondAttributes(b,u){
 const mods={};
 for(const d of activeBonds(b,u)){
  if(['entryPower','beautyHit','swornLink','reserveEntry','formationTiles','routMomentum'].includes(d.special))continue;
  (mods[d.stat] ||= []).push({label:`${d.name} ${d.points}点`,factor:1+d.values[d.tier-1]});
  if(d.special==='valorRamp'&&u.bondState?.valorStacks)(mods.attackSpeed ||= []).push({label:'勇武奋战 '+u.bondState.valorStacks+'层',factor:1+d.stackRates[d.tier-1]*u.bondState.valorStacks});
  if(d.tier===d.thresholds.length&&d.extraValue)(mods[d.extra] ||= []).push({label:`${d.name}满档`,factor:1+d.extraValue});
 }
 if(bondOnField(u)&&(u.bondEntry?.powerUntil||0)>(b?.tick??Infinity)){(mods.martialPower ||= []).push({label:'先登入场',factor:1+u.bondEntry.power});if(u.bondEntry.attackSpeed)(mods.attackSpeed ||= []).push({label:'先登入场',factor:1+u.bondEntry.attackSpeed});}
 const formation=formationBoost(b||{},u);if(formation)for(const stat of ['attack','martialPower','strategyPower'])(mods[stat] ||= []).push({label:'军阵阵位',factor:1+formation});
 if(bondOnField(u)&&(u.statuses?.peachFury?.until||0)>(b?.tick??Infinity)){for(const stat of ['attack','martialPower','strategyPower'])(mods[stat] ||= []).push({label:'桃园奋战',factor:1+BOND_DESIGNS.bondPeach.furyPower});(mods.attackSpeed ||= []).push({label:'桃园奋战',factor:1+BOND_DESIGNS.bondPeach.furySpeed});}
 const speed=b?routSpeedBonus(b,u):0;if(speed)(mods.attackSpeed ||= []).push({label:'破军乘胜',factor:1+speed});
 return mods;
}
export function bondList(u,b){
 const current=bondLevels(u),side=sideBonds(b,u.side),active=new Set(activeBonds(b,u).filter(x=>x.special!=='entryPower'||(u.bondEntry?.powerUntil||0)>(b?.tick||0)).map(x=>x.id));
 active.delete('bondGuard');if(formationBoost(b||{},u))active.add('bondGuard');if((u.statuses?.peachFury?.until||0)>(b?.tick??Infinity))active.add('bondPeach');
 return Object.entries(bondCaps(u)).map(([id,cap])=>({id,...BOND_DESIGNS[id],domain:'battle',level:current[id]||0,unlocked:!!current[id],cap,state:active.has(id)?'在场生效':'未生效',description:`个人等级 ${current[id]||0}／${cap}；${b?`场上合计 ${side[id]?.points||0} 点；`:''}${BOND_DESIGNS[id].description}`}));
}
import {hexDistance} from './hex-grid.mjs';
export function bondDamage(b,u,target,kind){
 let factor=target.type==='gate'||target.isDecoy?1:1+routDamageBonus(b,u);
 for(const d of activeBonds(b,u).filter(d=>d.tier===d.thresholds.length)){
  if(target.type==='gate'){if(d.special==='gateStrike')factor*=1+d.specialValue;continue;}
  const adjacentEnemies=(b?.sides?.[1-target.side]?.units||[]).some(v=>bondOnField(v)&&hexDistance(v,target)===1);
  if(d.special==='antiCavalry'&&troopFamily(target.type)==='cavalry'||d.special==='rearStrike'&&!adjacentEnemies||d.special==='woundedStrike'&&u.hp<u.maxHp*.5||d.special==='lowIntent'&&kind==='intellect'&&target.intent<60)factor*=1+d.specialValue;

 }
 return factor;
}
export function bondProtection(b,u,kind){
 if(kind==='dot')return 1;
 let factor=1;
 for(const d of activeBonds(b,u).filter(d=>d.tier===d.thresholds.length)){
  const near=side=>(b?.sides?.[side]?.units||[]).filter(v=>v!==u&&bondOnField(v)&&hexDistance(v,u)===1).length;
  if(d.special==='formation'&&near(u.side)>0||d.special==='surrounded'&&near(1-u.side)>=2)factor*=1-d.specialValue;
 }
 return factor*bondEscortProtection(b,u);
}
// Contribution persists while on the field; active aid has stricter action eligibility.
export const bondOperational=(b,u)=>bondOnField(u)&&!u.withdrawing&&!u.disengage&&!b.sides[u.side].retreat&&!['confuse','stasis'].some(key=>(u.statuses?.[key]?.until||0)>b.tick);
export function bondCommandMultiplier(b,u){
 let multiplier=1;
 for(const source of b.sides[u.side].units)if(bondOperational(b,source))for(const d of activeBonds(b,source))if(d.special==='command')multiplier=Math.max(multiplier,d.commandRate[d.tier-1]);
 return multiplier;
}
export function bondEscortProtection(b,u){
 if(!bondOnField(u))return 1;
 let reduction=0;
 for(const source of b?.sides?.[u.side]?.units||[])if(source!==u&&bondOperational(b,source))for(const d of activeBonds(b,source))if(d.special==='escort'&&hexDistance(source,u)<=d.range)reduction=Math.max(reduction,d.tier===d.thresholds.length?d.specialValue:d.protection[d.tier-1]);
 return 1-reduction;
}
export const bondEntryIgnoresZoc=(b,u)=>bondOnField(u)&&(u.bondEntry?.zocUntil||0)>(b?.tick||0);
export function grantBondEntries(b,side=null,entryOrder=[]){
 syncPeach(b);
 if(!b.deploymentLocked)return;
 for(const army of b.sides){
  const pending=army.units.filter(u=>bondOnField(u)&&!u.bondEntry&&(side===null||u.side===side));
  pending.sort((a,c)=>entryOrder.indexOf(a.id)-entryOrder.indexOf(c.id));
  grantReserveEntries(b,pending,b.sides.indexOf(army));
  if(!pending.length)continue;
  const sums=sideBonds(b,pending[0].side),tier=id=>sums[id]?.tier||0;
  grantFormationEntries(b,pending,pending[0].side,tier('bondGuard'));
  for(const u of pending){
   grantBondEquipment(b,u,sums);
   const horse=troopFamily(u.type)==='cavalry'?tier('bondHorse'):0,first=bondLevels(u).bondVanguard?tier('bondVanguard'):0,ready=tier('bondAid');
   const intent=ready?BOND_DESIGNS.bondAid.entryIntent[ready-1]:0;
   u.bondEntry={tick:b.tick,intent,zocUntil:horse?b.tick+BOND_DESIGNS.bondHorse.entryDuration[horse-1]+1:0,powerUntil:first?b.tick+BOND_DESIGNS.bondVanguard.entryDuration[first-1]+1:0,power:first?BOND_DESIGNS.bondVanguard.values[first-1]:0,attackSpeed:first===BOND_DESIGNS.bondVanguard.thresholds.length?BOND_DESIGNS.bondVanguard.extraValue:0};
   u.intent=Math.min(100,(u.intent||0)+intent);
  }
 }
}
export function validBondEntry(b,u){
 const e=u.bondEntry;
 if(!validFormationEntry(b,u)||!validBondEquipment(b,u))return false;
 if(!e)return !b.deploymentLocked||u.status==='reserve';
 if(!b.deploymentLocked||!Number.isInteger(e.tick)||e.tick<0||e.tick>b.tick||![0,...BOND_DESIGNS.bondAid.entryIntent].includes(e.intent))return false;
 const duration=(until,id)=>until===0||Number.isInteger(until)&&BOND_DESIGNS[id].entryDuration.includes(until-e.tick-1);
 const first=e.powerUntil?BOND_DESIGNS.bondVanguard.entryDuration.indexOf(e.powerUntil-e.tick-1):-1;
 return Object.keys(e).length===6&&duration(e.zocUntil,'bondHorse')&&(!e.zocUntil||troopFamily(u.type)==='cavalry')&&duration(e.powerUntil,'bondVanguard')&&(!e.powerUntil||bondLevels(u).bondVanguard>0)&&e.power===(first<0?0:BOND_DESIGNS.bondVanguard.values[first])&&e.attackSpeed===(first===BOND_DESIGNS.bondVanguard.thresholds.length-1?BOND_DESIGNS.bondVanguard.extraValue:0);
}
export function bondStratagemStrength(b,side){
 let bonus=0;
 for(const source of b.sides[side].units)if(bondOperational(b,source))for(const d of activeBonds(b,source))if(d.special==='commandStrength')bonus=Math.max(bonus,d.strengthBonus[d.tier-1]);
 return bonus;
}
export const validBondStrength=value=>[0,...BOND_DESIGNS.bondCommand.strengthBonus].includes(value);

export function bondHitEffect(b,u){const d=activeBonds(b,u).find(d=>d.special==='beautyHit');return d?{fraction:d.specialValue,steps:d.hitDuration[d.tier-1],control:d.tier===d.thresholds.length?d.controlSteps:0}:null;}

