import {STATUS_DEFINITIONS,REMEDIES,CONTROL_STATUSES} from './data/design/battle-statuses.mjs';
import {hexDistance,hexNeighbors} from './hex-grid.mjs';
import {canOccupy} from './battlefield.mjs';
import {appendBattleLog} from './battle-log.mjs';

export {STATUS_DEFINITIONS,REMEDIES,CONTROL_STATUSES};
export const statusOn=(b,u,key)=>(u.statuses?.[key]?.until||0)>b.tick;
export const statusValue=(u,key,field)=>u.statuses?.[key]?.[field]??STATUS_DEFINITIONS[key]?.[field];
export const statusNotice=(b,u,text)=>appendBattleLog(b,u.name+' · '+text);
export function detected(b,u,side=1-u.side){
 return (b.sides[side]?.units||[]).some(v=>v.status==='active'&&v.hp>0&&!v.withdrawing&&!b.sides[side]?.retreat&&statusOn(b,v,'insight')&&!['confuse','stasis','stealth'].some(k=>statusOn(b,v,k))&&hexDistance(u,v)<=statusValue(v,'insight','range'));
}
export const hidden=(b,u)=>statusOn(b,u,'stealth')&&!detected(b,u);
export function breakStealth(b,u,reason){
 if(!statusOn(b,u,'stealth'))return false;
 delete u.statuses.stealth;statusNotice(b,u,'伏兵显形 · '+reason);return true;
}
export function remedyKeys(kind){return REMEDIES[kind]||[];}
export const needsRemedy=(b,u,kind)=>remedyKeys(kind).some(k=>statusOn(b,u,k));
export function remedy(b,u,kind){
 if(kind==='breakFormation'&&statusOn(b,u,'magicImmune'))return [];
 const keys=remedyKeys(kind).filter(k=>statusOn(b,u,k));
 for(const k of keys)delete u.statuses[k];
 if(keys.length)statusNotice(b,u,({calm:'镇静',rally:'整军',aid:'救护',quench:'扑火',breakFormation:'破阵'})[kind]+' · 解除'+keys.map(k=>STATUS_DEFINITIONS[k].name).join('、'));
 return keys;
}
export function prepareDecoy(b,u,source={},threshold=.5){
 if(u.preparedDecoy?.used)return false;
 u.preparedDecoy={threshold,used:false,source};
 if(u.hp>0&&u.hp/u.initial<threshold&&createDecoy(b,u,source))u.preparedDecoy.used=true;
 return true;
}
export function createDecoy(b,u,source={},duration=STATUS_DEFINITIONS.decoy.duration){
 if(u.isDecoy||u.status!=='active'||u.hp<=0||statusOn(b,u,'decoy'))return false;
 const occupied=b.sides.flatMap(s=>s.units).filter(v=>v.status==='active'&&v.hp>0);
 const cell=hexNeighbors(u).map(([x,y])=>({x,y})).find(p=>canOccupy(b,u,p.x,p.y)&&!occupied.some(v=>v.x===p.x&&v.y===p.y));
 if(!cell)return false;
 u.statuses.decoy={until:b.tick+duration+1,hp:Math.round(u.initial*STATUS_DEFINITIONS.decoy.hpFraction),...cell,...source};
 statusNotice(b,u,'疑兵出现');return true;
}
// Proxies exist only during targeting. The durable state is on the real owner;
// no fake officers, deployment slots, casualty records or victory counts.
export function decoyTargets(b,side){
 return (b.sides[side]?.units||[]).filter(u=>u.status==='active'&&u.hp>0&&statusOn(b,u,'decoy')).map(u=>{
  const d=u.statuses.decoy;
  return {...u,x:d.x,y:d.y,hp:d.hp,maxHp:Math.round(u.initial*STATUS_DEFINITIONS.decoy.hpFraction),name:u.name+'疑兵',isDecoy:true,owner:u,statuses:{},passiveState:{targetId:null}};
 });
}
export function hitDecoy(b,attacker,target,damage){
 const d=target.owner.statuses.decoy;if(!d)return;
 const loss=Math.min(d.hp,Math.round(damage*STATUS_DEFINITIONS.decoy.damageMultiplier));d.hp-=loss;
 b.effects.push({from:attacker.id,to:target.id,x:target.x,y:target.y,fromX:attacker.x,fromY:attacker.y,side:attacker.side,skill:false,damage:0,label:'疑兵',text:'疑兵承伤 '+loss,decoyDamage:loss});
 if(d.hp<=0){delete target.owner.statuses.decoy;statusNotice(b,target.owner,'疑兵被击破');}
}
export function armEntryStatuses(b,u,skills){
 if(u.entryStatusesApplied)return;
 u.entryStatusesApplied=true;
 for(const s of skills)if(s.effect==='openingAmbush'){
  u.statuses.stealth={until:b.tick+STATUS_DEFINITIONS.stealth.duration+1,sourceId:u.id,sourceName:u.name,sourceSkillName:s.name};
  statusNotice(b,u,'伏兵入场');
 }
}
export function contactIntentFactor(b,u){return statusOn(b,u,'intentSuppression')?Math.max(0,1-statusValue(u,'intentSuppression','fraction')):1;}
