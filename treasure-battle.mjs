import {TREASURE_RULES,treasureDesign,validTreasureId} from './data/design/treasures.mjs';
// This module has no strategic state or random draws. Entry snapshots are immutable.
export function treasureBondBonus(u,levels){
 const d=treasureDesign(u.treasureId),n=d?.kind==='bond'?levels[d.bondId]||0:0;
 return n>0&&n<TREASURE_RULES.bondCap&&Object.values(levels).reduce((a,b)=>a+b,0)<TREASURE_RULES.totalBondCap?{id:d.bondId,points:1}:null;
}
export function grantTreasureEntries(b,units,apply){
 for(const u of units){
  if(u.treasureEntry||u.status!=='active'||u.hp<=0||u.isDecoy)continue;
  const d=treasureDesign(u.treasureId);if(d?.kind!=='entry')continue;
  const amount=d.fraction?Math.min(d.cap,Math.floor(u.initial*d.fraction)):0;
  const total=d.totalFraction?Math.min(d.totalCap,Math.floor(u.initial*d.totalFraction)):0;
  u.treasureEntry={id:u.treasureId,tick:b.tick,until:b.tick+d.steps+1,amount,total,healed:0,removed:false};
  apply(u,d.status,d.steps,{sourceId:u.id,sourceName:u.name,sourceSkillName:d.name,sourceTreasure:u.treasureId,...(d.status==='shield'?{amount,source:'treasure:'+u.treasureId,label:d.name+' · 护盾'}:{}),...(d.status==='regrowth'?{amount}:{})});
 }
}
export function treasureEntryActive(b,u){const e=u.treasureEntry;return !!e&&!e.removed&&e.until>b.tick&&u.status==='active'&&u.hp>0&&!u.isDecoy&&!u.withdrawing&&!u.disengage&&!b.sides[u.side].retreat;}
export function recordTreasureDamage(b,u,target,amount){
 if(!u||!target||!b.sides[u.side]?.units.includes(u)||u.side===target.side||u.isDecoy||target.isDecoy||target.type==='gate'||amount<=0)return;
 u.treasureDamage ||= {};u.treasureDamage[target.id]=(u.treasureDamage[target.id]||0)+amount;
}
export function validTreasureBattle(b,fail){
 const ids=new Set(),units=b.sides.flatMap(s=>s.units);
 for(const u of units){
  fail(validTreasureId(u.treasureId),'未知宝物');
  if(u.treasureId){fail(!ids.has(u.treasureId),'宝物在双方或援军中重复');ids.add(u.treasureId);}
  if(u.treasureDamage!==undefined)fail(u.treasureDamage&&Object.entries(u.treasureDamage).every(([id,n])=>units.some(v=>v.id===id&&v.side!==u.side&&!v.isDecoy&&v.type!=='gate')&&Number.isSafeInteger(n)&&n>=0),'夺宝贡献记录无效');
  const e=u.treasureEntry,d=treasureDesign(u.treasureId);
  if(e){
   fail(d?.kind==='entry'&&e.id===u.treasureId&&b.deploymentLocked&&Number.isSafeInteger(e.tick)&&e.tick>=0&&e.tick<=b.tick&&e.tick===u.bondEntry?.tick&&e.until===e.tick+d.steps+1&&typeof e.removed==='boolean','宝物入场记录无效');
   fail(e.amount===(d.fraction?Math.min(d.cap,Math.floor(u.initial*d.fraction)):0)&&e.total===(d.totalFraction?Math.min(d.totalCap,Math.floor(u.initial*d.totalFraction)):0)&&Number.isSafeInteger(e.healed)&&e.healed>=0&&e.healed<=e.total,'宝物额度无效');
  }else fail(d?.kind!=='entry'||!u.bondEntry,'宝物缺少首次入场记录');
 }
}
