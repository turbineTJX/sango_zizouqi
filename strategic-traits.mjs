import {TRAIT_DESIGNS} from './data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS} from './data/design/assignments.mjs';
export const STRATEGIC_TRAIT_EFFECTS=['reserveGrain','provision','healRemainder','referral','chain','handoff','farmTroops','receiveGrain','resupplyStop','relayCargo','lightMarch','forcedMarch','crossCooperate','cycleCargo','treasureDiscovery','treasureCapture'];
export const strategicTraits=(u,effect)=> (OFFICER_ASSIGNMENTS[u?.id]?.traits||[]).map(id=>({id,...TRAIT_DESIGNS[id]})).filter(t=>t.strategic&&(!effect||t.strategic.effect===effect));
export const hasStrategicTrait=(u,effect)=>strategicTraits(u,effect).length>0;
export const armyStrategicTrait=(a,effect)=>strategicTraits(a?.units.find(u=>u.id===a.leader&&u.troops>0),effect)[0];
export const assignedTrait=(s,c,effect,direction)=>s.campaign.domestic.assignments.some(a=>a.cityId===c.id&&(!direction||a.direction===direction)&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(a.officerId))&&[...c.units,...s.campaign.idle.filter(o=>o.location===c.id&&!o.destination&&o.faction===c.owner).map(o=>o.unit)].some(u=>u.id===a.officerId&&!u.mission&&hasStrategicTrait(u,effect)));
export function marchFactor(a){
 const mode=a.marchMode||'normal',t=armyStrategicTrait(a,mode==='light'?'lightMarch':'forcedMarch');
 return t&&(mode==='light'||mode==='forced'&&a.morale>=t.strategic.minimum&&a.hunger===0)?t.strategic.speed:1;
}
export function marchModes(a){return [{id:'normal',name:'常行'},...(armyStrategicTrait(a,'lightMarch')?[{id:'light',name:'轻装'}]:[]),...(armyStrategicTrait(a,'forcedMarch')?[{id:'forced',name:'急行'}]:[])];}
export function validMarch(a,day){
 if(a.marchMode===undefined)return a.marchRestUntil===undefined&&a.fullSupplyCapacity===undefined;
 if(!['normal','light','forced'].includes(a.marchMode)||!Number.isInteger(a.marchRestUntil)||a.marchRestUntil<0||a.marchRestUntil>day+TRAIT_DESIGNS.forcedMarch.strategic.recovery)return false;
 return a.marchMode==='light'?Number.isSafeInteger(a.fullSupplyCapacity)&&a.fullSupplyCapacity>0&&a.supplyCapacity===Math.floor(a.fullSupplyCapacity*TRAIT_DESIGNS.lightMarch.strategic.capacity):a.fullSupplyCapacity===undefined;
}

export const marchDescription=a=>['lightMarch','forcedMarch'].map(effect=>armyStrategicTrait(a,effect)?.description).filter(Boolean).join(' ');
