import {BOND_DESIGNS as D} from './data/design/bonds.mjs';
import {troopFamily} from './troop-training.mjs';
export const equipmentEligible=(u,id)=>{const e=D[id]?.entryEquipment;return !!e&&(!e.holder||u.bondGrowth?.levels?.[id]>0)&&(!e.families.length||e.families.includes(troopFamily(u.type)));};
export function grantBondEquipment(b,u,sums){
 const entries=Object.entries(D).filter(([id,d])=>d.entryEquipment&&sums[id]?.tier&&equipmentEligible(u,id)).map(([id,d])=>({id,tier:sums[id].tier,rule:d.entryEquipment})).sort((a,c)=>c.rule.priority-a.rule.priority||a.id.localeCompare(c.id));
 u.bondEquipment=[];u.statuses ||= {};
 for(const {id,tier,rule:e}of entries){const key=e.kind==='orb'?'attackOrb':'heavyAttack';if((u.statuses[key]?.until||0)>b.tick)continue;u.bondEquipment.push({id,tier});u.statuses[key]={until:(b.maxTicks||240)+1,charges:e.charges[tier-1],bondSource:id,sourceId:u.id,sourceName:u.name,sourceSkillName:D[id].name,...(e.kind==='orb'?{skillId:e.skillId,potency:1}:{})};}
}
export function validBondEquipment(b,u){
 const entries=u.bondEquipment;if(!u.bondEntry)return entries===undefined;
 return Array.isArray(entries)&&entries.length<=2&&new Set(entries.map(e=>D[e.id]?.entryEquipment?.kind)).size===entries.length&&entries.every(e=>e&&Object.keys(e).length===2&&equipmentEligible(u,e.id)&&Number.isInteger(e.tier)&&e.tier>=1&&e.tier<=D[e.id].thresholds.length);
}
export function validBondEquipmentStatus(b,u,key,s){const e=D[s.bondSource]?.entryEquipment,entry=u.bondEquipment?.find(v=>v.id===s.bondSource);return !!e&&!!entry&&equipmentEligible(u,s.bondSource)&&e.kind===(key==='attackOrb'?'orb':'heavy')&&s.sourceId===u.id&&s.sourceSkillName===D[s.bondSource].name&&s.until===(b.maxTicks||240)+1&&Number.isInteger(s.charges)&&s.charges>0&&s.charges<=e.charges[entry.tier-1]&&(e.kind!=='orb'||s.skillId===e.skillId&&s.potency===1);}
export const heavyRule=(b,u)=>{const s=u.statuses?.heavyAttack;return s?.until>b.tick&&s.charges>0?D[s.bondSource]?.entryEquipment:null;};
export const equipmentText=d=>{const e=d.entryEquipment;if(!e)return '';const names={archer:'弓兵、弩兵',spear:'枪兵',halberd:'戟兵',cavalry:'骑兵'},who=(e.holder?'本羁绊持有者':'己方部队')+(e.families.length?'使用'+e.families.map(x=>names[x]||x).join('／'):'，不限兵种');return `首次入场：${who}获得${e.charges.join('／')}次${e.kind==='heavy'?'重击':e.skillId==='fire'?'火矢法球':'挫志法球'}；每场仅一次，不占战法名额。`;};
