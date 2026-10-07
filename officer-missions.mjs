import {mapNode,mapNodes} from './road-network.mjs';
import {FACTIONS} from './engine.mjs';
import {findCampaignRoute} from './strategic-campaign.mjs';
import {roadCost} from './strategic-movement.mjs';
import {lightPersonnelSpeed} from './personnel-movement.mjs';
import {personnelEvent,sendOfficerHome} from './officer-fates.mjs';
import {validateDiplomaticMission} from './diplomacy.mjs';
const town=mapNode;
export const missionUnits=s=>[...s.cities.flatMap(c=>c.units),...s.campaign.idle.map(o=>o.unit),...s.armies.flatMap(a=>a.units)].filter(u=>u.mission);
export const missionOfficer=(s,id)=>{const unit=missionUnits(s).find(u=>u.id===id);return unit?{unit,faction:unit.mission.faction,location:unit.mission.homeCity,cityUnit:s.cities.some(c=>c.units.includes(unit))}:null;};
export function beginOfficerMission(s,a,unit,targetCity){
 if(!targetCity||targetCity===a.cityId)return;
 const route=findCampaignRoute(s,a.cityId,targetCity);if(!route)return;
 unit.mission={actionId:a.action.id,homeCity:a.cityId,faction:town(s,a.cityId).owner,targetCity,location:a.cityId,route,progress:0,phase:'outbound',workDone:false,cancelled:false,lastDay:s.campaign.day-1};
 personnelEvent(s,`mission:${a.action.id}:out`,'MISSION',unit,`${unit.name}离开${town(s,a.cityId).name}，前往${town(s,targetCity).name}接洽人才。`);
}
export function recallOfficerMission(s,unit){
 const m=unit.mission;if(!m)return;m.cancelled=true;if(m.phase==='return')return;
 const first=m.route[0],p=m.progress;
 m.phase='return';
 if(first&&p>0){const from=m.location;m.location=first;m.route=[from,...(findCampaignRoute(s,from,m.homeCity)||[])];m.progress=roadCost(s,first,from)-p;}
 else {m.route=findCampaignRoute(s,m.location,m.homeCity)||[];m.progress=0;}
}
export function returnOfficerMission(s,unit){const m=unit.mission;if(!m)return;m.workDone=true;m.phase='return';m.route=findCampaignRoute(s,m.location,m.homeCity)||[];m.progress=0;}
export function advanceOfficerMissions(s){
 for(const u of missionUnits(s)){
  const m=u.mission;if(m.type==='diplomacy'||m.lastDay===s.campaign.day)continue;m.lastDay=s.campaign.day;
  if(town(s,m.homeCity).owner!==m.faction){
   // An absent officer cannot be captured in a city where they are not present.
   const edge=m.route.length?{from:m.location,to:m.route[0],fraction:m.progress/roadCost(s,m.location,m.route[0])}:null;
   for(const c of s.cities)c.units=c.units.filter(x=>x!==u);s.campaign.idle=s.campaign.idle.filter(o=>o.unit!==u);s.campaign.domestic.assignments=s.campaign.domestic.assignments.filter(a=>a.officerId!==u.id);u.troops=0;u.wounded=0;sendOfficerHome(s,u,m.faction,m.location,{edge,reason:'原城失守，改道返城'});continue;
  }
  if(!s.campaign.domestic.assignments.some(a=>a.officerId===u.id&&a.action?.id===m.actionId)&&m.phase!=='return')recallOfficerMission(s,u);
  if(m.phase==='work')continue;
  let budget=lightPersonnelSpeed(u);
  while(m.route.length&&budget>0){const to=m.route[0],cost=roadCost(s,m.location,to),used=Math.min(budget,cost-m.progress);m.progress+=used;budget-=used;if(m.progress>=cost){m.location=to;m.route.shift();m.progress=0;}}
  if(!m.route.length){if(m.phase==='outbound'){m.phase='work';m.workStartDay=s.campaign.day+1;}else if(m.location===m.homeCity){const a=s.campaign.domestic.assignments.find(a=>a.officerId===u.id);if(!a?.action)delete u.mission;}}
 }
}
export function missionStatus(m){if(m.type==='diplomacy')return m.blocked|| (m.phase==='return'?'外交返程':m.cargo?'外交押运':m.purpose==='prisoner'?'俘虏押送':m.phase==='outbound'?'出使途中':'外交接洽');return m.phase==='outbound'?'赴访途中':m.phase==='work'?'外地接洽':m.cancelled?'任务中止，返城途中':'办事结束，返城途中';}
export function validateOfficerMission(s,u){
 const m=u.mission;if(!m)return;const fail=x=>{if(!x)throw new Error('武将外出任务存档无效');};

 if(m.type==='diplomacy'){validateDiplomaticMission(s,u);return;}
 fail(Object.hasOwn(FACTIONS,m.faction)&&Number.isSafeInteger(m.actionId)&&m.actionId>0&&m.actionId<s.campaign.domestic.nextId&&town(s,m.homeCity)&&town(s,m.targetCity)&&town(s,m.location)&&['outbound','work','return'].includes(m.phase)&&typeof m.workDone==='boolean'&&typeof m.cancelled==='boolean'&&Number.isSafeInteger(m.lastDay)&&m.lastDay>=0&&m.lastDay<=s.campaign.day&&Array.isArray(m.route)&&m.route.length<=mapNodes(s).length&&Number.isFinite(m.progress)&&m.progress>=0);
 fail(m.phase==='return'||s.campaign.domestic.assignments.some(a=>a.officerId===u.id&&a.action?.id===m.actionId));
 fail(m.phase!=='work'||Number.isSafeInteger(m.workStartDay)&&m.workStartDay>=0);
 let from=m.location;for(const to of m.route){fail(Number.isFinite(roadCost(s,from,to)));from=to;}
 fail(m.route.length?m.progress<roadCost(s,m.location,m.route[0])&&from===(m.phase==='outbound'?m.targetCity:m.homeCity):m.progress===0&&m.location===(m.phase==='outbound'||m.phase==='work'?m.targetCity:m.homeCity));
}
