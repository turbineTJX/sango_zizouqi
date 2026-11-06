import {ECONOMY_RULES} from './data/design/economy-rules.mjs';

// Wounds travel with troops only while outside a friendly city. Admission is
// a transfer of real people, never healing or recruitment, and is idempotent.
export function admitCityWounded(c,units){
 let received=0;
 for(const u of units){received+=u.wounded||0;u.wounded=0;}
 c.wounded=(c.wounded||0)+received;return received;
}
export function receiveResidentWounded(s){
 for(const c of s.cities){
  admitCityWounded(c,c.units);
  for(const a of s.armies)if(!a.disbanded&&!a.travel&&a.location===c.id&&a.faction===c.owner&&!s.campaign.battles.some(b=>!b.settled&&b.armyIds.includes(a.id)))admitCityWounded(c,a.units);
  for(const o of s.campaign.idle)if(o.location===c.id&&!o.destination&&!o.retreating&&!o.unit.mission&&o.faction===c.owner)admitCityWounded(c,[o.unit]);
 }
}
export function cityWoundedRecovery(c){
 const r=ECONOMY_RULES.wounded;
 return r.treatmentPlaces*(r.basePerPlace+(c.barracks||0)*r.perBarracks+(c.clinic||0)*r.perClinic);
}
export function recoverCityWounded(c,limit){
 const n=Math.max(0,Math.floor(Math.min(c.wounded||0,limit,ECONOMY_RULES.capacity.manpowerMax-c.manpower)));
 c.wounded=(c.wounded||0)-n;c.manpower+=n;return n;
}
