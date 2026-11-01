import {TREASURE_RULES,treasureDesign} from './data/design/treasures.mjs';
import {equippedTreasureIds,validTreasureLoadout} from './treasure-equipment.mjs';
export function treasureBondBonuses(u,levels){
 const bonuses=[],base=Object.values(levels).reduce((a,b)=>a+b,0);
 for(const id of equippedTreasureIds(u)){const d=treasureDesign(id,u),n=d?.kind==='bond'?levels[d.bondId]||0:0;if(n>0&&n<TREASURE_RULES.bondCap&&base+bonuses.length<TREASURE_RULES.totalBondCap)bonuses.push({id:d.bondId,points:1});}
 return bonuses;
}
export const treasureBondBonus=(u,levels)=>treasureBondBonuses(u,levels)[0]||null;
export function grantTreasureEntries(b,units,apply){
 for(const u of units){
  if(u.status!=='active'||u.hp<=0||u.isDecoy)continue;
  for(const id of equippedTreasureIds(u)){
   const d=treasureDesign(id,u);if(d?.kind!=='entry'||u.treasureEntries?.[id])continue;
   const amount=d.fraction?Math.min(d.cap,Math.floor(u.initial*d.fraction)):0,total=d.totalFraction?Math.min(d.totalCap,Math.floor(u.initial*d.totalFraction)):0;
   (u.treasureEntries??={})[id]={id,tick:b.tick,until:b.tick+d.steps+1,amount,total,healed:0,removed:false};
   apply(u,d.status,d.steps,{sourceId:u.id,sourceName:u.name,sourceSkillName:d.name,sourceTreasure:id,...(d.status==='shield'?{amount,source:'treasure:'+id,label:d.name+' · 护盾'}:{}),...(d.status==='regrowth'?{amount}:{})});
  }
 }
}
export function treasureEntryActive(b,u,id){const e=u.treasureEntries?.[id];return !!e&&!e.removed&&e.until>b.tick&&u.status==='active'&&u.hp>0&&!u.isDecoy&&!u.withdrawing&&!u.disengage&&!b.sides[u.side].retreat;}
export function recordTreasureDamage(b,u,target,amount){
 if(!u||!target||!b.sides[u.side]?.units.includes(u)||u.side===target.side||u.isDecoy||target.isDecoy||target.type==='gate'||amount<=0)return;
 u.treasureDamage ||= {};u.treasureDamage[target.id]=(u.treasureDamage[target.id]||0)+amount;
}
export function validTreasureBattle(b,fail){
 const ids=new Set(),units=b.sides.flatMap(s=>s.units);
 for(const u of units){
  fail(validTreasureLoadout(u),'每类仅可装备一件宝物');
  for(const id of equippedTreasureIds(u)){fail(!ids.has(id),'宝物在双方或援军中重复');ids.add(id);}
  if(u.treasureDamage!==undefined)fail(u.treasureDamage&&Object.entries(u.treasureDamage).every(([id,n])=>units.some(v=>v.id===id&&v.side!==u.side&&!v.isDecoy&&v.type!=='gate')&&Number.isSafeInteger(n)&&n>=0),'夺宝贡献记录无效');
  fail(u.treasureEntry===undefined,'旧宝物入场记录无效');
  for(const [id,e] of Object.entries(u.treasureEntries||{})){
   const d=treasureDesign(id,u);fail(equippedTreasureIds(u).includes(id)&&d?.kind==='entry'&&e.id===id&&b.deploymentLocked&&Number.isSafeInteger(e.tick)&&e.tick>=0&&e.tick<=b.tick&&e.tick===u.bondEntry?.tick&&e.until===e.tick+d.steps+1&&typeof e.removed==='boolean','宝物入场记录无效');
   fail(e.amount===(d.fraction?Math.min(d.cap,Math.floor(u.initial*d.fraction)):0)&&e.total===(d.totalFraction?Math.min(d.totalCap,Math.floor(u.initial*d.totalFraction)):0)&&Number.isSafeInteger(e.healed)&&e.healed>=0&&e.healed<=e.total,'宝物额度无效');
  }
  for(const id of equippedTreasureIds(u))if(treasureDesign(id,u)?.kind==='entry'&&u.bondEntry)fail(!!u.treasureEntries?.[id],'宝物缺少首次入场记录');
 }
}
