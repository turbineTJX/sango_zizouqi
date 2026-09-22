import {trainingCost,trainingRate} from './troop-training.mjs';
import {playerFaction} from './player-faction.mjs';
import {troopCapacity} from './troop-capacity.mjs';
export const MIN_UNIT_TROOPS=1000;
export function troopAllocationLimit(s,c,u,targets={},units=[]){
 const others=units.filter(x=>x.id!==u.id&&targets[x.id]!==undefined),added=others.reduce((n,x)=>n+Math.max(0,targets[x.id]-x.troops),0),returned=others.reduce((n,x)=>n+Math.max(0,x.troops-targets[x.id]),0),reserved=c.domestic?.reserved||0;
 const available=Math.max(0,Math.floor(Math.min(c.manpower-reserved+returned-added,2000+c.barracks*1000-c.drafted-reserved-added,Math.floor(Math.max(0,s.gold-others.reduce((n,x)=>n+trainingCost(x.type,Math.max(0,targets[x.id]-x.troops)),0))/trainingRate(u.type)),c.grain-added)));
 return Math.max(0,Math.min(troopCapacity(u)-(u.wounded||0),u.troops+available));
}
export function allocateUnitTroops(s,c,ids,targets={}){
 const units=ids.map(id=>c.units.find(u=>u.id===id)).filter(Boolean),chosen=units.filter(u=>targets[u.id]!==undefined);
 for(const u of chosen){const n=targets[u.id];if(!Number.isInteger(n)||n<MIN_UNIT_TROOPS||n>troopCapacity(u)-(u.wounded||0))return '部队兵力须为1000至当前带兵上限（扣除伤兵）';if(n>troopAllocationLimit(s,c,u,targets,units))return '据点可用预备兵、征募额度、金或粮不足，请调整兵力';}
 const cost=chosen.reduce((n,u)=>n+trainingCost(u.type,Math.max(0,targets[u.id]-u.troops)),0);if(cost>s.gold)return '编制费用不足';
 const added=chosen.reduce((n,u)=>n+Math.max(0,targets[u.id]-u.troops),0),returned=chosen.reduce((n,u)=>n+Math.max(0,u.troops-targets[u.id]),0);
 for(const u of chosen)u.troops=targets[u.id];
 c.manpower+=returned-added;c.drafted+=added;c.grain-=added;s.gold-=cost;if(s.cities)s.grain=Math.floor(s.cities.filter(x=>x.owner===playerFaction(s)).reduce((n,x)=>n+x.grain,0));return null;
}
