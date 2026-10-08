import {changeMerit,meritChangeText,PROGRESSION} from './progression.mjs';
import {appendActivityNode} from './activity-nodes.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {cityFoodRequirement} from './city-logistics.mjs';

// Reuse the permanent factual ledger for idempotency and player-visible changes.
export function settleOfficerMerit(s,u,{sourceId,amount,faction,cityId=null,category='personnel',reason}){
 const key=`merit:${sourceId}:${u.id}`,prior=s.campaign.activity.nodes.find(n=>n.sourceId===key);
 if(prior)return prior.result.growth;
 const growth=changeMerit(u,amount);
 appendActivityNode(s,{sourceId:key,category,phase:'merit',faction,cityId,officerId:u.id,text:`${u.name}${reason}：${meritChangeText(growth)}。`,result:{growth,leveled:growth.before!==growth.after}});
 return growth;
}
export function settleMeritCapacity(s){
 for(const c of s.cities){
  if(s.campaign.battles.some(r=>!r.settled&&r.cityId===c.id))continue;
  const units=[...c.units,...s.campaign.idle.filter(o=>o.faction===c.owner&&o.location===c.id&&!o.destination&&!o.retreating).map(o=>o.unit)];
  for(const u of units){
   if(!u.meritCapacity||u.mission)continue;
   const excess=Math.min(u.troops,Math.max(0,u.troops+u.wounded-troopCapacity(u)));
   u.troops-=excess;c.manpower+=excess;
   if(u.troops+u.wounded<=troopCapacity(u))delete u.meritCapacity;
  }
 }
}
export function transportMerit(s,u,faction,source,target,amounts,{sourceId,failed=false,relief=false,reason='完成运输'}={}){
 if(source===target)return null;
 const r=PROGRESSION.transport,value=Object.entries(r.values).reduce((n,[key,weight])=>n+(amounts[key]||0)*weight,0)*(relief?r.reliefFactor:1);
 if(value<=0)return null;
 const turn=Math.floor((s.campaign.day-1)/10),ledger=s.campaign.activity.nodes;
 const prior=ledger.find(n=>n.sourceId===`merit:${sourceId}:${u.id}`);if(prior)return prior.result.growth;
 const pair=[source,target].sort().join(':'),previous=ledger.filter(n=>n.phase==='merit'&&n.result.transport?.faction===faction&&n.result.transport.pair===pair&&n.result.transport.turn===turn);
 // A shared route budget prevents split deliveries or officer swaps multiplying credit.
 const cumulative=previous.reduce((n,x)=>n+x.result.transport.value,0)+value;
 const awarded=previous.reduce((n,x)=>n+Math.max(0,x.result.growth.gained),0);
 const personal=ledger.filter(n=>n.officerId===u.id&&n.result.transport?.turn===turn).reduce((n,x)=>n+Math.max(0,x.result.growth.gained),0),earned=Math.round(cumulative<r.minimumValue?cumulative/r.minimumValue*r.minimum:r.minimum+(cumulative-r.minimumValue)/r.valuePerMerit);
 const amount=failed?-Math.min(PROGRESSION.failures.transportMaximum,Math.max(PROGRESSION.failures.transportMinimum,Math.round(value/r.valuePerMerit))):Math.max(0,Math.min(r.maximumPerTurn-personal,Math.min(r.maximumPerTurn,earned)-awarded));
 const growth=settleOfficerMerit(s,u,{sourceId,amount,faction,cityId:target,reason});
 const node=ledger.find(n=>n.sourceId===`merit:${sourceId}:${u.id}`);
 node.result.transport={faction,source,target,pair,turn,value:failed?0:value};
 return growth;
}
export function transportRelievesShortage(s,c,amounts){return amounts.gold>0&&c.gold<c.budget.goldReserve||amounts.grain>0&&c.grain<c.budget.grainReserve+cityFoodRequirement(s,c,10);}
