import {treasureDesign} from './data/design/treasures.mjs';
// Keep sources separate only when an entry treasure shares an existing status.
const eligible=new Set(['valor','attackHaste','phase','resolve','longRange','haste','regrowth','nexus']);
export const statusMagnitude=(s,key)=>key==='attackHaste'?(s.fraction??.2):s.amount??s.fraction??s.percent??s.potency??1;
const live=(b,u,s)=>s.until>b.tick&&(!s.sourceTreasure||!u.treasureEntry?.removed&&u.status==='active'&&u.hp>0&&!u.withdrawing&&!u.disengage&&!b.sides[u.side].retreat);
export function refreshTreasureStatus(b,u,key,sources=u.statuses[key]?.sources){
 if(!sources)return;
 const remaining=sources.filter(s=>live(b,u,s));
 if(!remaining.length){delete u.statuses[key];return;}
 remaining.sort((a,c)=>statusMagnitude(c,key)-statusMagnitude(a,key)||c.until-a.until);
 u.statuses[key]=remaining.some(s=>s.sourceTreasure)?{...remaining[0],sources:remaining}:{...remaining[0]};
}
export function mergeTreasureStatus(b,u,key,next){
 const prior=u.statuses[key];
 if(!eligible.has(key)||!next.sourceTreasure&&!prior?.sources&&!prior?.sourceTreasure)return false;
 const sources=(prior?.sources||[prior]).filter(s=>s&&live(b,u,s));
 const origin=s=>s.sourceTreasure?'treasure:'+s.sourceTreasure:(s.sourceCommand?'command:'+s.sourceCommand:(s.sourceId||'')+':'+(s.sourceSkillName||key));
 const id=origin(next),same=sources.find(s=>origin(s)===id);
 if(same&&statusMagnitude(same,key)>statusMagnitude(next,key)){refreshTreasureStatus(b,u,key,sources);return true;}
 refreshTreasureStatus(b,u,key,[...sources.filter(s=>origin(s)!==id),{...next}]);return true;
}
export function refreshTreasureStatuses(b,u){
 const e=u.treasureEntry;if(!e)return;
 if(u.status!=='active'||u.hp<=0||u.withdrawing||u.disengage||b.sides[u.side].retreat)e.removed=true;
 for(const key of eligible)if(u.statuses?.[key]?.sources)refreshTreasureStatus(b,u,key);
 const shield=u.statuses?.shield;
 if(e.removed&&shield){shield.layers=shield.layers.filter(l=>l.source!=='treasure:'+e.id);}
}
export function treasureHealBudget(u,status,amount){
 if(!status.sourceTreasure)return amount;
 const e=u.treasureEntry;
 return e&&status.sourceTreasure===e.id?Math.max(0,Math.min(amount,e.total-e.healed)):0;
}
export function debitTreasureHealing(u,status,n){if(status.sourceTreasure&&u.treasureEntry)u.treasureEntry.healed+=n;}
export function validateTreasureStatus(b,u,key,s,fail){
 if(s.sources){fail(Array.isArray(s.sources)&&s.sources.length>0&&s.sources.length<=32&&s.sources.some(v=>v.sourceTreasure)&&s.sources.every(v=>v&&!v.sources),'宝物状态来源无效');const {sources,...root}=s;fail(JSON.stringify(root)===JSON.stringify(sources[0])&&sources.every(v=>statusMagnitude(v,key)<=statusMagnitude(root,key)),'宝物状态汇总无效');for(const v of sources)validateTreasureStatus(b,u,key,v,fail);}
 if(s.sourceTreasure){
  const d=treasureDesign(s.sourceTreasure),e=u.treasureEntry;
  fail(d?.kind==='entry'&&d.status===key&&e?.id===s.sourceTreasure&&s.sourceId===u.id&&s.sourceName===u.name&&s.sourceSkillName===d.name&&s.until===e.until,'宝物状态快照无效');
  if(key==='regrowth')fail(s.amount===e.amount,'宝物休整额度无效');
  fail(!s.sourceCommand&&s.potency===undefined&&s.fraction===undefined&&s.percent===undefined&&s.castTick===undefined&&(s.amount===undefined||key==='regrowth'),'宝物不能伪造其他强度来源');
 }
}
