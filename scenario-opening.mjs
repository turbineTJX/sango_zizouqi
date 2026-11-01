import {makeOfficer} from './engine.mjs';
import {nationalScenario} from './national-scenarios.mjs';
import {initializeBuildingDurability,completeTechnologyBuilding} from './building-durability.mjs';
import {scenarioDateDay,scenarioStartDay} from './scenario-date.mjs';
import {assignDomestic} from './domestic.mjs';

export function configuredScenarioOfficer(entry,troops,index,level,seed){
 const u=makeOfficer(entry.id,entry.troops??troops,index,entry.level??level,seed);
 if(entry.type)u.type=entry.type;
 u.wounded=entry.wounded??0;u.merit=entry.merit??0;return u;
}
export function applyScenarioCities(s){
 const spec=nationalScenario(s.campaign.scenarioId),d=spec?.customDocument;if(!d)return;
 for(const entry of d.cities){const c=s.cities.find(c=>c.id===entry.id);
  if(entry.order!==undefined)c.order=entry.order;
  for(const [key,n]of Object.entries(entry.buildings||{}))c[key]=n;
  c.domestic.techs=[...(entry.techs||[])];initializeBuildingDurability(c);
  for(const id of c.domestic.techs)completeTechnologyBuilding(c,id,s);
  if(entry.wallIntegrity!==undefined){const gate=c.buildings.walls[c.id];gate.hp=Math.floor(gate.maxHp*entry.wallIntegrity/100);}
 }
}
export function applyScenarioAppointments(s){
 const spec=nationalScenario(s.campaign.scenarioId),d=spec?.customDocument;if(!d)return;
 for(const o of d.officers.filter(o=>o.state==='serving'&&scenarioDateDay(d,o.debutDate)<=scenarioStartDay(d))){
  if(o.loyalty!==undefined)s.campaign.domestic.loyalty[o.id]=o.loyalty;
  if(o.role==='governor'){const c=s.cities.find(c=>c.id===o.cityId);c.governor=o.id;c.domestic.approvalGovernor=null;}
 }
 for(const o of d.officers.filter(o=>o.state==='serving'&&o.role&&o.role!=='governor'&&scenarioDateDay(d,o.debutDate)<=scenarioStartDay(d))){const error=assignDomestic(s,o.cityId,o.role,o.id,{scheduled:true,faction:spec.factionMap[o.faction]});if(error)throw Error('剧本任职：'+error);}
}
