import {treasureFate} from './treasures.mjs';
import {mapNode,mapNodes} from './road-network.mjs';
import {appendActivityNode} from './activity-nodes.mjs';
import {officerActivities} from './officer-activity.mjs';
import {playerFaction} from './player-faction.mjs';
import {FACTIONS,log} from './engine.mjs';
import {findCampaignRoute,isPlanning} from './strategic-campaign.mjs';
import {roadCost,roadDistance} from './strategic-movement.mjs';
import {startPersonnelJourney} from './personnel-movement.mjs';
import {cancelDomestic} from './domestic.mjs';
import {factionFundingCity} from './city-resources.mjs';
import {addCityGold} from './talent-core.mjs';
const town=mapNode;
export function personnelEvent(s,id,type,unit,text,context=null){
 if(s.campaign.personnelEvents.some(e=>e.id===id))return;
 s.campaign.personnelEvents.unshift({id,day:s.campaign.day,type,officerId:unit.id,text});s.campaign.personnelEvents.length=Math.min(100,s.campaign.personnelEvents.length);log(s,text,'war');
 const at=context||officerActivities(s).get(unit.id);
 appendActivityNode(s,{sourceId:'personnel:'+id,category:'personnel',phase:type,faction:at?.faction,officerId:unit.id,cityId:at?.siteId||at?.location||null,text});
}
export function fateRoll(s,key){let h=s.seed>>>0;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h^=h>>>16;h=Math.imul(h,0x45d9f3b)>>>0;return h/4294967296;}
export function removeOfficer(s,id){
 cancelDomestic(s,id,'人员离队');
 for(const c of s.cities){c.units=c.units.filter(u=>u.id!==id);if(c.governor===id)c.governor=null;}
 for(const a of s.armies){a.units=a.units.filter(u=>u.id!==id);for(const role of ['leader','advisor','deputy'])if(a[role]===id)a[role]=role==='deputy'?null:a.units.find(u=>u.troops>0)?.id||a.units[0]?.id||null;}
 s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==id);
 s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==id);
}
function nearestHome(s,start,faction){
 const todo=[{id:start,cost:0,route:[]}],seen=new Set(),neighbors=new Map(mapNodes(s).map(c=>[c.id,[]]));for(const [a,b]of s.roads){neighbors.get(a).push(b);neighbors.get(b).push(a);}
 while(todo.length){todo.sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id));const x=todo.shift();if(seen.has(x.id))continue;seen.add(x.id);if(town(s,x.id).owner===faction)return {c:town(s,x.id),route:x.route,end:start,cost:x.cost};for(const to of neighbors.get(x.id))if(!seen.has(to))todo.push({id:to,cost:x.cost+roadCost(s,x.id,to),route:[...x.route,to]});}return null;
}
export function sendOfficerHome(s,unit,faction,location,{edge=null,reason='返城'}={}){
 delete unit.mission;
 const options=[];
 for(const end of edge?[edge.from,edge.to]:[location]){const option=nearestHome(s,end,faction);if(!option)continue;if(edge)option.cost+=roadCost(s,edge.from,edge.to)*(end===edge.from?edge.fraction:1-edge.fraction);options.push(option);}
 options.sort((a,b)=>a.cost-b.cost||a.c.id.localeCompare(b.c.id));
 if(!options.length){s.campaign.domestic.people.push({id:unit.id,unit,cityId:location,status:'FREE',debutDay:s.campaign.day,travel:null});const r=s.campaign.talent.records[unit.id];r.phase='WAIT';r.phaseUntilDay=s.campaign.day+31;r.hardWaitUntilDay=s.campaign.day+31;return null;}
 const best=options[0],o={unit,faction,location,destination:best.c.id,remainingDays:1,movementReason:reason};unit.homeCity=best.c.id;
 startPersonnelJourney(s,o);
 if(edge){const forward=best.end===edge.to,from=forward?edge.from:edge.to,to=best.end,progress=roadCost(s,from,to)*(forward?edge.fraction:1-edge.fraction);o.location=from;o.journey={route:[to,...best.route],progress,blocked:''};if(progress>=roadCost(s,from,to)){o.location=to;o.journey.route.shift();o.journey.progress=0;}o.remainingDays=Math.max(1,Math.ceil(best.cost/70));}
 s.campaign.idle.push(o);return o;
}
export function resolveOfficerLoss(s,{unit,faction,location,enemy,eventId,edge=null,reason='部队全歼',survivingArmy=null}){
 if(s.campaign.personnelEvents.some(e=>e.id===eventId))return null;
 const roll=fateRoll(s,eventId);let result=roll<.02?'DEAD':enemy&&roll<.35?'CAPTIVE':'ESCAPED';
 if(result==='CAPTIVE'&&!s.cities.some(c=>c.owner===enemy))result='ESCAPED';
 // An escaped officer and their empty unit record stay with a surviving army.
 // Keep appointments, wounded, growth and learning; zero troops cannot fight.
 if(result==='ESCAPED'&&survivingArmy&&s.armies.includes(survivingArmy)&&!survivingArmy.disbanded&&survivingArmy.faction===faction&&survivingArmy.units.includes(unit)&&survivingArmy.units.some(u=>u!==unit&&u.troops>0)){
  delete unit.mission;unit.troops=0;
  personnelEvent(s,eventId,'ESCAPED',unit,`${unit.name}${reason}后脱身，随${survivingArmy.name}待整编，保留原任职；补充兵员前不能参战或提供军略。`);
  return 'ESCAPED';
 }
 treasureFate(s,unit.id,result,location);
 removeOfficer(s,unit.id);delete unit.mission;unit.troops=0;unit.wounded=0;
 let escapedHome=null;
 if(result==='ESCAPED')escapedHome=sendOfficerHome(s,unit,faction,location,{edge,reason:'败军脱身返城'});
 else {const prisons=s.cities.filter(c=>c.owner===enemy),prison=prisons.sort((a,b)=>Math.hypot(a.x-town(s,location).x,a.y-town(s,location).y)-Math.hypot(b.x-town(s,location).x,b.y-town(s,location).y)||a.id.localeCompare(b.id))[0];
  const prisoner={id:unit.id,unit,cityId:location,status:result,debutDay:s.campaign.day,travel:null,fate:{originalFaction:faction,captor:result==='CAPTIVE'?enemy:null,eventId,day:s.campaign.day,reason}};
  if(result==='CAPTIVE'){const start=edge?.to||location,route=findCampaignRoute(s,start,prison.id)||[];prisoner.custody={destination:prison.id,route:edge?[edge.to,...route]:route,progress:edge?roadCost(s,edge.from,edge.to)*edge.fraction:0};if(edge)prisoner.cityId=edge.from;if(prisoner.custody.route.length&&prisoner.custody.progress>=roadCost(s,prisoner.cityId,prisoner.custody.route[0])){prisoner.cityId=prisoner.custody.route.shift();prisoner.custody.progress=0;}if(!prisoner.custody.route.length)delete prisoner.custody;}
  s.campaign.domestic.people.push(prisoner);
 }
 personnelEvent(s,eventId,result,unit,`${unit.name}${reason}：${result==='DEAD'?'战死':result==='CAPTIVE'?`被${FACTIONS[enemy].name}俘获`:escapedHome?'脱身，正沿道路返回友城':'脱身，但已无可归城池，转为在野'}。`,{faction,siteId:location});return result;
}
export const ransomCost=p=>300+5*Math.max(p.unit.leadership,p.unit.force,p.unit.intellect);
export function releaseCaptive(s,id,{ransom=false,automatic=false,diplomatic=false}={}){
 const p=s.campaign.domestic.people.find(p=>p.id===id&&p.status==='CAPTIVE'&&p.fate);
 if(!p)return '该武将不在被俘状态';
 if(p.diplomaticLock&&!diplomatic)return '该武将正在外交交接，须按已批准方案办理';
 if(p.custody&&!automatic)return '正在押送，抵达后可办理赎回或释放';
 const f=p.fate.originalFaction;
 if(!automatic&&(!isPlanning(s)||s.finished||!(ransom?f===playerFaction(s):p.fate.captor===playerFaction(s))))return '只能在筹划阶段处置相关俘虏';
 if(ransom){const cost=ransomCost(p);const home=factionFundingCity(s,f),captor=town(s,p.cityId);if(!home)return '已无可返回的己方城池';if(home.gold<cost)return '付款城市赎金不足';if(captor?.owner!==p.fate.captor)return '关押城市已失守';addCityGold(s,home,-cost);addCityGold(s,captor,cost);}
 s.campaign.domestic.people=s.campaign.domestic.people.filter(x=>x!==p);sendOfficerHome(s,p.unit,f,p.cityId,{edge:p.custody?.route.length?{from:p.cityId,to:p.custody.route[0],fraction:p.custody.progress/roadCost(s,p.cityId,p.custody.route[0])}:null,reason:ransom?'赎回返城':'获释返城'});
 treasureFate(s,p.unit.id,'RELEASE',p.cityId);
 personnelEvent(s,`${p.fate.eventId}:release`,ransom?'RANSOM':'RELEASE',p.unit,`${p.unit.name}${ransom?'已付赎金获释':'获释'}，从${town(s,p.cityId).name}出发返城。`,{faction:f,siteId:p.cityId});return null;
}
export function updateCaptives(s){
 for(const p of [...s.campaign.domestic.people].filter(p=>p.status==='CAPTIVE'&&p.fate)){
  if(p.diplomaticEscort)continue;
  if(p.custody){const t=p.custody;if(town(s,t.destination).owner!==p.fate.captor){delete p.diplomaticLock;releaseCaptive(s,p.id,{automatic:true});continue;}let budget=50;while(t.route.length&&budget>0){const to=t.route[0],cost=roadCost(s,p.cityId,to),used=Math.min(budget,cost-t.progress);t.progress+=used;budget-=used;if(t.progress>=cost){p.cityId=to;t.route.shift();t.progress=0;}}if(!t.route.length)delete p.custody;continue;}
  if(town(s,p.cityId).owner!==p.fate.captor){delete p.diplomaticLock;releaseCaptive(s,p.id,{automatic:true});}
  else if(!s.campaign.diplomacy&&p.fate.originalFaction!==playerFaction(s)&&s.campaign.day-p.fate.day>=3)releaseCaptive(s,p.id,{ransom:true,automatic:true});
 }
}
export function roadEdgeForArmy(s,a){return a.travel?{from:a.travel.from,to:a.travel.to,fraction:a.travel.progress/roadDistance(s,a.travel.from,a.travel.to)}:null;}
export function displaceCityOfficers(s,cityId,oldFaction,eventId){
 const c=town(s,cityId);if(c.owner===oldFaction)return;
 const people=[...s.campaign.idle.filter(o=>o.faction===oldFaction&&o.location===cityId&&!o.destination&&!o.retreating&&!o.unit.mission).map(o=>o.unit),...c.units.filter(u=>!u.mission)];
 for(const unit of people)resolveOfficerLoss(s,{unit,faction:oldFaction,location:cityId,enemy:c.owner,eventId:eventId+':resident:'+unit.id,reason:'城池失守'});
}
