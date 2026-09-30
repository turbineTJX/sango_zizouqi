import {activeBonds,bondOnField,bondLevels} from './bonds.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';
const eligible=(b,u)=>bondOnField(u)&&!u.withdrawing&&!u.disengage&&!b.sides[u.side].retreat&&!((u.statuses?.stasis?.until||0)>b.tick);
// Shared attack events; the engine supplies intent and combat notices.
export function resolveBondEvent(b,u,event,api){
 if(!b.deploymentLocked||!eligible(b,u))return;
 const state=u.bondState ||= {};
 for(const d of activeBonds(b,u)){
  if(d.special==='valorRamp'&&event==='basicHit'&&state.valorTick!==b.tick){
   state.valorTick=b.tick;state.valorStacks=Math.min(d.maxStacks,(state.valorStacks||0)+1);
   if(d.tier===d.thresholds.length&&state.valorStacks===d.maxStacks&&!state.valorRally){state.valorRally=true;api.intent(u,d.rallyIntent);api.signal(u,'勇武奋战');}
  }
 }
}
export function validBondState(u,tick){
 const s=u.bondState;if(!s||typeof s!=='object'||Array.isArray(s))return false;
 if(Object.keys(s).some(k=>!['valorTick','valorStacks','valorRally'].includes(k)))return false;
 const levels=bondLevels(u);
 if(s.valorStacks!==undefined||s.valorTick!==undefined){if(!levels.bondValor||!Number.isInteger(s.valorStacks)||s.valorStacks<1||s.valorStacks>BOND_DESIGNS.bondValor.maxStacks||!Number.isInteger(s.valorTick)||s.valorTick<0||s.valorTick>tick)return false;}
 if(s.valorRally!==undefined&&(s.valorRally!==true||s.valorStacks!==BOND_DESIGNS.bondValor.maxStacks))return false;
 return true;
}
