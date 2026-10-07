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
  if(d.family||['intentIncome','hitIntentDeny','swiftBurst','songAttack','crusherAttack','doubtPulse','lureAttack','fireAttack','chainAttack','valorIntent','spreadGuard','finishStrike','counterHorse','siegeStrike','nearAllySpeed','isolatedStrike','escort','physicalGuard','distantStrike','lastStand','entryPower','beautyHit','swornLink','reserveEntry','formationTiles','routMomentum'].includes(d.special))continue;
  (mods[d.stat] ||= []).push({label:`${d.name} ${d.points}点`,factor:1+d.values[d.tier-1]});
  if(d.tier===d.thresholds.length&&d.extraValue)(mods[d.extra] ||= []).push({label:`${d.name}满档`,factor:1+d.extraValue});
 }

 for(const d of activeBonds(b,u))if(d.special==='swornLink')(mods.discipline ||= []).push({label:'桃园结义',factor:1+d.singleDiscipline});
 for(const d of activeBonds(b,u))if(d.special==='nearAllySpeed'&&adjacentBondAlly(b,u))(mods.attackSpeed ||= []).push({label:'聚势邻接',factor:1+d.values[d.tier-1]});
 for(const d of activeBonds(b,u))if(d.special==='lastStand'&&u.hp<=u.maxHp*d.hpThreshold)for(const stat of ['attack','martialPower','strategyPower'])(mods[stat] ||= []).push({label:'背水反击',factor:1+d.values[d.tier-1]});
 const formation=formationBoost(b||{},u);if(formation)for(const stat of ['attack','martialPower','strategyPower'])(mods[stat] ||= []).push({label:'军阵阵位',factor:1+formation});
 if(bondOnField(u)&&(u.statuses?.peachFury?.until||0)>(b?.tick??Infinity)){for(const stat of ['attack','martialPower','strategyPower'])(mods[stat] ||= []).push({label:'桃园奋战',factor:1+BOND_DESIGNS.bondPeach.furyPower});(mods.attackSpeed ||= []).push({label:'桃园奋战',factor:1+BOND_DESIGNS.bondPeach.furySpeed});}
 const swift=bondSwiftEffect(b,u);if(swift)(mods.move ||= []).push({label:'疾驰突进',factor:1+swift.moveBonus});
 const speed=b?routSpeedBonus(b,u):0;if(speed)(mods.attackSpeed ||= []).push({label:'破军乘胜',factor:1+speed});
 return mods;
}
export function bondList(u,b){
 const current=bondLevels(u),side=sideBonds(b,u.side),active=new Set(activeBonds(b,u).filter(x=>x.special!=='entryPower'||(u.bondEntry?.powerUntil||0)>(b?.tick||0)).map(x=>x.id));
 if(u.hp>u.maxHp*BOND_DESIGNS.bondLastStand.hpThreshold)active.delete('bondLastStand');
 if(!adjacentBondAlly(b,u))active.delete('bondMuster');
 if(!bondSwiftEffect(b,u))active.delete('bondSwift');
 if(adjacentBondAlly(b,u))active.delete('bondSpread');
 active.delete('bondGuard');if(formationBoost(b||{},u))active.add('bondGuard');if((u.statuses?.peachFury?.until||0)>(b?.tick??Infinity))active.add('bondPeach');
 return Object.entries(bondCaps(u)).map(([id,cap])=>({id,...BOND_DESIGNS[id],domain:'battle',level:current[id]||0,unlocked:!!current[id],cap,state:active.has(id)?'在场生效':'未生效',description:`个人等级 ${current[id]||0}／${cap}；${b?`场上合计 ${side[id]?.points||0} 点；`:''}${BOND_DESIGNS[id].description}`}));
}
import {hexDistance} from './hex-grid.mjs';
export const adjacentBondAlly=(b,u)=>(b?.sides?.[u.side]?.units||[]).some(v=>v!==u&&bondOnField(v)&&hexDistance(v,u)===1);
export function bondDamage(b,u,target,kind){
 if(target.isDecoy)return 1;
 if(kind==='dot')return bondValorDamage(b,u,target);
 if(target.type==='gate')return activeBonds(b,u).filter(d=>d.special==='siegeStrike').reduce((factor,d)=>factor*(1+d.values[d.tier-1]),1);
 let factor=(1+routDamageBonus(b,u))*bondValorDamage(b,u,target);
 for(const d of activeBonds(b,u)){
  if(d.special==='lowIntent'&&d.tier===d.thresholds.length&&kind==='intellect'&&target.intent<60)factor*=1+d.specialValue;
  if(d.special==='finishStrike'&&target.hp<=target.maxHp*d.hpThreshold)factor*=1+d.values[d.tier-1];
  if(d.special==='counterHorse'&&troopFamily(target.type)==='cavalry')factor*=1+d.values[d.tier-1];
  if(d.special==='isolatedStrike'&&!adjacentBondAlly(b,target))factor*=1+d.values[d.tier-1];
  if(d.special==='distantStrike'&&hexDistance(u,target)>=d.minDistance){factor*=1+d.values[d.tier-1];if(bondControlled(b,target))factor*=1+d.controlBonus[d.tier-1];}
 }
 return factor;
}
export function bondProtection(b,u,kind){
 if(kind==='dot')return 1;
 let factor=1;
 for(const d of activeBonds(b,u)){
  if(d.special==='spreadGuard'&&kind==='intellect'&&!adjacentBondAlly(b,u))factor*=1-d.values[d.tier-1];
  if(d.special==='physicalGuard'&&['basic','force'].includes(kind))factor*=1-d.values[d.tier-1];
  if(d.special==='lastStand'&&u.hp<=u.maxHp*d.hpThreshold)factor*=1-d.protection[d.tier-1];
 }
 return factor;
}
// Contribution persists while on the field; active aid has stricter action eligibility.
export const bondOperational=(b,u)=>bondOnField(u)&&!u.withdrawing&&!u.disengage&&!b.sides[u.side].retreat&&!['confuse','stasis'].some(key=>(u.statuses?.[key]?.until||0)>b.tick&&!bondBlocksEffect(b,u,u.statuses[key]));
// The stored window keeps counting while qualification or action eligibility is lost.
export function bondSwiftEffect(b,u){
 const s=u.statuses?.swiftRush;
 if(!b||!s||s.until<=b.tick||!bondOperational(b,u))return null;
 const d=activeBonds(b,u).find(d=>d.special==='swiftBurst');
 return d?{moveBonus:d.values[Math.min(d.tier,s.bondSwiftTier)-1],until:s.until}:null;
}
export function validSwiftStatus(b,u,s){
 const d=BOND_DESIGNS.bondSwift;
 return s.sourceId===u.id&&s.sourceSkillName===d.name&&(bondLevels(u).bondSwift||0)>0&&Number.isInteger(s.bondSwiftTier)&&s.bondSwiftTier>=1&&s.bondSwiftTier<=d.thresholds.length&&Number.isInteger(s.castTick)&&s.castTick>=0&&s.castTick<=b.tick&&u.bondEntry?.tick<=s.castTick&&s.until===s.castTick+d.burstSteps[s.bondSwiftTier-1]&&u.bondState?.swiftReady===s.castTick+d.period;
}
export const bondCommandMultiplier=()=>1;
export const bondEntryIgnoresZoc=()=>false;
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
   u.bondEntry={tick:b.tick};
  }
 }
}
export function validBondEntry(b,u){
 const e=u.bondEntry;
 if(!validFormationEntry(b,u)||!validBondEquipment(b,u))return false;
 // Reserves withdrawn by an army retreat never entered the field or received entry rewards.
 if(!e)return !b.deploymentLocked||u.status==='reserve'||u.status==='withdrawn'&&b.sides[u.side]?.retreat&&u.x===-1&&u.y===-1&&!u.participated;
 return b.deploymentLocked&&Object.keys(e).length===1&&Number.isInteger(e.tick)&&e.tick>=0&&e.tick<=b.tick;
}
export const bondStratagemStrength=()=>0;
export const validBondStrength=value=>value===0;

export function bondIntentIncomeFactor(b,u){
 const d=activeBonds(b,u).find(d=>d.special==='intentIncome');return d?1+d.incomeBonus[d.tier-1]:1;
}
export function bondHitIntentDenialChance(b,u,target){
 if(!b||!target||!bondOperational(b,u)||!bondOnField(target)||target.side===u.side||bondBlocksEffect(b,target,u))return 0;
 const d=activeBonds(b,u).find(d=>d.special==='hitIntentDeny');return d?d.chance[d.tier-1]:0;
}

export function bondHitEffect(b,u){const d=activeBonds(b,u).find(d=>d.special==='beautyHit');return d?{intentDrain:d.intentDrain[d.tier-1],chance:d.statusChance[d.tier-1],steps:d.statusSteps,statuses:d.statuses,allEnemies:d.tier===d.thresholds.length}:null;}

export const bondSource=(b,source)=>b?.sides?.flatMap(s=>s.units||[]).find(u=>u.id===(typeof source==='string'?source:source?.sourceId||source?.id))||null;
export const bondValorRule=(b,u)=>activeBonds(b,u).find(d=>d.special==='valorIntent')||null;
export function bondBlocksEffect(b,u,source,{beneficial=false}={}){
 if(beneficial)return false;
 const actor=bondSource(b,source),d=actor&&actor!==u&&!actor.isDecoy&&actor.intent<u.intent?bondValorRule(b,u):null;
 return !!d&&d.tier===d.thresholds.length;
}
export function bondDamageImmunity(b,u,source){
 const actor=bondSource(b,source);
 if(!actor||actor===u||actor.isDecoy||actor.intent>=u.intent)return 0;
 const d=bondValorRule(b,u);return d?d.immunityChance[d.tier-1]:0;
}
export function bondValorDamage(b,u,target){
 if(!u||!target||target.isDecoy||target.type==='gate'||u.side===target.side||!(target.intent<u.intent))return 1;
 const d=bondValorRule(b,u);return d?1+d.values[d.tier-1]:1;
}
const bondStatus=(b,u,key)=>(u.statuses?.[key]?.until||0)>b.tick&&!bondBlocksEffect(b,u,u.statuses[key]);
export const bondControlled=(b,u)=>['confuse','seal','disrupted'].some(key=>bondStatus(b,u,key));
export const bondFinisherCritical=(b,u,target)=>!target.isDecoy&&target.type!=='gate'&&target.hp<=target.maxHp*BOND_DESIGNS.bondFinisher.hpThreshold&&topBond(b,u,'bondFinisher')&&bondStatus(b,target,'armorBreak');
export function bondDefenseIgnore(b,u,target,kind){
 const d=activeBonds(b,u).find(d=>d.special==='distantStrike');
 return d&&['basic','force'].includes(kind)&&!target.isDecoy&&target.type!=='gate'&&d.tier===d.thresholds.length&&hexDistance(u,target)>=d.minDistance&&bondControlled(b,target)?d.defenseIgnore:0;
}

