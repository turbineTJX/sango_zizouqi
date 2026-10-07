import {playerFaction} from './player-faction.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';

// City stores are authoritative. The HUD totals are only a projection.
export const factionGold=(s,faction)=>s.cities.filter(c=>c.owner===faction).reduce((n,c)=>n+c.gold,0);
export function syncResourceTotals(s){
 const cities=s.cities.filter(c=>c.owner===playerFaction(s));
 s.gold=cities.reduce((n,c)=>n+c.gold,0);
 s.grain=Math.floor(cities.reduce((n,c)=>n+c.grain,0));
}
export function initializeCityResources(s,openingGold){
 for(const faction of new Set(s.cities.map(c=>c.owner))){
  const cities=s.cities.filter(c=>c.owner===faction),weight=cities.reduce((n,c)=>n+(c.citySize==='small'?1:2),0);
  let remaining=openingGold;
  cities.forEach((c,i)=>{c.gold=i===cities.length-1?remaining:Math.floor(openingGold*(c.citySize==='small'?1:2)/weight);remaining-=c.gold;
   c.budget={goldReserve:ECONOMY_RULES.budget.goldReserve,grainReserve:ECONOMY_RULES.budget.grainReserve,warning:'',warningSequence:0};
  });
 }
 syncResourceTotals(s);
}
export function addCityGold(s,c,amount){
 if(!c||!s.cities.includes(c)||!Number.isSafeInteger(amount)||!Number.isSafeInteger(c.gold+amount)||c.gold+amount<0)throw new Error('本城金不足或金额无效');
 c.gold+=amount;syncResourceTotals(s);
}
export function factionFundingCity(s,faction){
 return s.cities.filter(c=>c.owner===faction).sort((a,b)=>b.gold-a.gold||a.id.localeCompare(b.id))[0]||null;
}
