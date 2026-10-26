import {servingPeople} from './talent-core.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {cachedRead} from './read-query-scope.mjs';

export const officerSalary=u=>ECONOMY_RULES.maintenance.officerSalaryByLevel[u.level-1];
// One canonical service record per officer. Away personnel remain on their
// home payroll; after losing that city a surviving owned city takes over.
export function cityPayroll(s,c){
 return cachedRead(s,'city-payroll',JSON.stringify([c.id,c.owner,c.payroll.arrears]),()=>readCityPayroll(s,c));
}
function readCityPayroll(s,c){
 const owned=s.cities.filter(t=>t.owner===c.owner),ids=new Set(owned.map(t=>t.id)),officers=[];
 for(const o of servingPeople(s).values()){
  if(o.faction!==c.owner)continue;
  const u=o.unit,home=u.mission?.homeCity||u.homeCity||o.army?.homeCity;
  const resident=!o.army&&!u.mission&&ids.has(o.location)?o.location:null;
  const cityId=resident||(ids.has(home)?home:owned[0]?.id);
  if(cityId===c.id)officers.push({id:u.id,name:u.name,level:u.level,gold:officerSalary(u)});
 }
 return {officers,gold:officers.reduce((n,o)=>n+o.gold,0),arrears:c.payroll.arrears};
}
export function validateCityPayroll(c,fail){
 const p=c.payroll;
 fail(p&&['arrears','lastTurn','lastDue','lastPaid'].every(k=>Number.isSafeInteger(p[k])&&p[k]>=0),'城市俸禄账目无效');
 fail(p.lastPaid<=p.lastDue&&p.lastDue-p.lastPaid===p.arrears,'城市俸禄实付无效');
}
