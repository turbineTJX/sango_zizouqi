import {playerFaction} from './player-faction.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';

// City stores are authoritative. The HUD totals are only a projection.
export const factionGold=(s,faction)=>s.cities.filter(c=>c.owner===faction).reduce((n,c)=>n+c.gold,0);
export function syncResourceTotals(s){
 const cities=s.cities.filter(c=>c.owner===playerFaction(s));
 s.gold=cities.reduce((n,c)=>n+c.gold,0);
 s.grain=Math.floor(cities.reduce((n,c)=>n+c.grain,0));
}
export function initializeCityResources(s){
 for(const c of s.cities){
  Object.assign(c,openingCityResources(c));
  c.budget={goldReserve:ECONOMY_RULES.budget.goldReserve,grainReserve:ECONOMY_RULES.budget.grainReserve,warning:'',warningSequence:0};
  c.payroll={arrears:0,lastTurn:0,lastDue:0,lastPaid:0};
 }
 syncResourceTotals(s);
}
export function openingCityResources(c){
 const size=c.citySize==='small'?'small':'large',opening=c.owner==='neutral'?ECONOMY_RULES.neutralOpening:ECONOMY_RULES.opening;
 return Object.fromEntries(['gold','grain','manpower'].map(key=>[key,opening[key][size]]));
}
// Shared by lawful intelligence estimates and actual military occupation.
// The receipt only covers city stocks, never a marching army or convoy's cargo.
export function cityCaptureResources(c){
 const keys=['gold','grain','manpower'],before=Object.fromEntries(keys.map(key=>[key,c[key]||0])),limit=c.owner==='neutral'?openingCityResources(c):null;
 const retained=Object.fromEntries(keys.map(key=>[key,Math.floor(Math.min(before[key],limit?.[key]??before[key])*ECONOMY_RULES.occupation[key+'Retention'])]));
 return {before,retained,lost:Object.fromEntries(keys.map(key=>[key,before[key]-retained[key]]))};
}
export function settleCityCaptureResources(c){
 const receipt=cityCaptureResources(c);Object.assign(c,receipt.retained);return receipt;
}
export function addCityGold(s,c,amount){
 if(!c||!s.cities.includes(c)||!Number.isSafeInteger(amount)||!Number.isSafeInteger(c.gold+amount)||c.gold+amount<0)throw new Error('本城金不足或金额无效');
 c.gold+=amount;syncResourceTotals(s);
}
export function factionFundingCity(s,faction){
 return s.cities.filter(c=>c.owner===faction).sort((a,b)=>b.gold-a.gold||a.id.localeCompare(b.id))[0]||null;
}
