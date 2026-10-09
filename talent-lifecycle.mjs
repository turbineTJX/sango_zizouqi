import {mapNode,mapNodes,isJunction} from './road-network.mjs';
import {appendActivityNode} from './activity-nodes.mjs';
import {retainFactionMerit,meritChangeText,PROGRESSION} from './progression.mjs';
import {settleOfficerMerit,settleMeritCapacity} from './campaign-merit.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {cityNeedsAgriculture,cityNeedsCommerce} from './economy.mjs';
import {plannedOfficer,domesticIntentWeight} from './strategic-intent.mjs';
import {diplomaticAssignment} from './diplomacy-relations.mjs';
import {assignDomestic,assignmentFor,setDomesticPriority} from './domestic.mjs';
import {appointGovernor} from './strategic-campaign.mjs';
import {DIRECTIONS} from './domestic-designs.mjs';
import {playerFaction,isAIControlled} from './player-faction.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {withCitySupplyQueries} from './city-logistics.mjs';
import {lightPersonnelSpeed,startPersonnelJourney} from './personnel-movement.mjs';
import {roadCost} from './strategic-movement.mjs';
import {cityPersonnel} from './city-personnel.mjs';
import {OFFICER_BY_ID,OFFICER_CATALOG} from './officer-catalog.mjs';
import {passiveList} from './passives.mjs';
import {makeOfficer,newGame,validateSave,log} from './engine.mjs';
import {nationalScenario,talentScenarioEntry} from './national-scenarios.mjs';
import {relationshipInfo,changeRelationshipScore} from './relationships.mjs';
import {TALENT_RULES,clamp,talentTurn,talentKey,talentQuality,righteousness,relation,servingPeople,factionLord,isLord,nearby,localContact,legalRoad,cityBesieged,refreshTalentDemand,talentContext,willingness,projectNeed,progressFor,talentEligibility,TALENT_REASONS} from './talent-core.mjs';

const data=s=>s.campaign.talent;
const day=s=>s.campaign.day;
export function talentRandom(s){const t=data(s);t.seed=(Math.imul(t.seed,1664525)+1013904223)>>>0;return t.seed/4294967296;}
const randomInt=(s,a,b)=>a+Math.floor(talentRandom(s)*(b-a+1));
function report(s,code,id,text,faction=playerFaction(s),extra={}){
 const t=data(s);t.reports.unshift({day:day(s),code,personId:id,faction,text,...extra});t.reports=t.reports.slice(0,160);
 const person=servingPeople(s).get(id),project=t.projects[talentKey(id,faction)],cityId=project?.cityId||person?.location||s.campaign.domestic.people.find(p=>p.id===id)?.cityId||null;
 appendActivityNode(s,{sourceId:'talent:'+s.campaign.activity?.nextSequence,category:'talent',phase:code,faction,officerId:id,officerIds:project?.executorId?[project.executorId]:[],cityId,siteId:person?.location||s.campaign.domestic.people.find(p=>p.id===id)?.cityId||cityId,text,result:extra});
 if(faction===playerFaction(s)&&['discovered','signed','leave-warning','resigned','changed-side','offer-paused','project-closed'].includes(code)){
  const d=s.campaign.domestic,person=servingPeople(s).get(id),project=t.projects[talentKey(id,faction)];
  d.events.unshift({id:d.nextId++,actionId:null,assignmentId:null,cityId:project?.cityId||person?.location||d.people.find(p=>p.id===id)?.cityId||null,officerId:id,faction,day:day(s),phase:'event',text,result:{talentCode:code},important:true,read:false});d.events=d.events.slice(0,240);
 }
 if(faction===playerFaction(s))log(s,`第${day(s)}天：${text}`,'event');
}
function record(s,id){return data(s).records[id]??={phase:'WAIT',phaseUntilDay:0,hardWaitUntilDay:0,defeatHistory:[],rejoinBlocks:{},idleTurns:0,idleDays:0,idlePenaltyStep:2,workedDays:0,leaveAtDay:null,graceUntilDay:day(s)+90,lastDutyDay:0,voluntaryFaction:null,meritFaction:null};}
export function initializeTalent(s){
 s.campaign.talent={version:TALENT_RULES.version,seed:(s.seed^0x9a325f17)>>>0,records:{},projects:{},knowledge:{},demands:{},demandSignature:'',demandMonth:-1,reports:[],processedEvents:[],defeats:{},lastDay:0,nextProject:1};
 const occupied=servingPeople(s),spec=nationalScenario(s.campaign.scenarioId),t=data(s);let index=0,missing=0;
 for(const f of new Set(s.cities.map(c=>c.owner)))if(f!=='neutral'){t.knowledge[f]={};}
 s.campaign.domestic.people=[];
 for(const u of OFFICER_CATALOG){
  const r=record(s,u.id);if(occupied.has(u.id)){r.meritFaction=occupied.get(u.id).faction;continue;}
  const entry=talentScenarioEntry(s.campaign.scenarioId,u,s.cities),cityId=entry.activityCityIds[0]||s.cities[index++%s.cities.length].id;if(!entry.activityCityIds.length)missing++;
  const debutDay=entry.earliestTurn===null?1:1+10*randomInt(s,entry.earliestTurn,entry.latestTurn);
  const status=!entry.autoEligible?'EXCLUDED':spec&&spec.kind!=='fictional'&&u.deathYear&&u.deathYear<spec.year?'DEAD':debutDay>1?'NOT_DEBUTED':'FREE';
  r.phase=talentRandom(s)<.35?'SEEK':'WAIT';r.phaseUntilDay=debutDay+(r.phase==='SEEK'?180:randomInt(s,3,36)*10);
  s.campaign.domestic.people.push({id:u.id,cityId,status,debutDay,travel:null});
 }
 if(missing)report(s,'initialization',null,`${missing}名人物暂无活动城市配置，暂按地图顺序分布；不代表历史地理。`);
 refreshTalentDemand(s,true);
}
export function discoverTalent(s,id,faction){
 const p=s.campaign.domestic.people.find(p=>p.id===id&&p.status==='FREE'&&!p.travel);if(!p)return false;
 const t=data(s),k=(t.knowledge[faction]??={})[id],r=record(s,id),attitude=willingness(s,id,faction).W>=60?r.phase==='SEEK'?'ready':'waiting':'unwilling';
 (t.knowledge[faction]??={})[id]={discovered:true,lastKnownCityId:p.cityId,lastSeenDay:day(s),locationConfirmed:true,lastReportedAttitude:attitude};
 if(!k?.locationConfirmed)report(s,'discovered',id,`发现${OFFICER_BY_ID[id].name}在${mapNode(s,p.cityId).name}，${TALENT_REASONS[attitude]}。`,faction);
 return true;
}
export function unknownTalent(s,cityId,faction){return s.campaign.domestic.people.filter(p=>p.status==='FREE'&&!p.travel&&!data(s).knowledge[faction]?.[p.id]?.locationConfirmed&&localContact(s,cityId,p.cityId));}
export function talentCandidates(s,c,mode){
 const context=talentContext(s),t=data(s),ids=mode==='hire'?s.campaign.domestic.people.filter(p=>p.status==='FREE'&&!p.travel&&nearby(s,c.id,p.cityId)&&t.knowledge[c.owner]?.[p.id]?.locationConfirmed).map(p=>p.id):s.campaign.idle.filter(o=>o.faction!==c.owner&&o.faction!=='neutral'&&!o.destination&&!o.retreating&&nearby(s,c.id,o.location)&&(s.campaign.domestic.loyalty[o.unit.id]??85)<70).map(o=>o.unit.id),f=context.factions[c.owner]||{N:0,D:1};
 const candidates=[];
 for(const id of ids){
  const check=talentEligibility(s,id,c.owner,c.id,mode,context);if(!check.ok)continue;
  const saved=t.projects[talentKey(id,c.owner)],p=saved?.state==='CLOSED'?null:saved,need=projectNeed(id,mode);if(p?.progress>=need||p?.lastAttemptTurn===talentTurn(s))continue;
  if(s.campaign.domestic.assignments.some(a=>s.cities.find(c=>c.id===a.cityId)?.owner===c.owner&&a.action?.targetId===id&&['hire','persuade'].includes(a.action.key)))continue;
  const score=(mode==='hire'?70:45)+Math.floor(15*(p?.progress||0)/need)+clamp((check.Q-70)/2,0,15)+(mode==='hire'&&check.W>=80?5:0);
  candidates.push({id,score,check,progress:p?.progress||0,created:p?.createdOrder??Number.MAX_SAFE_INTEGER});
 }
 // Existing projects get first use of the faction's paid parallel slots.
 const all=Object.values(t.projects).filter(p=>p.factionId===c.owner&&p.state!=='CLOSED'&&p.progress>0&&p.progress<projectNeed(p.personId,p.mode)&&talentEligibility(s,p.personId,c.owner,p.cityId,p.mode,context).ok).sort((a,b)=>talentQuality(OFFICER_BY_ID[b.personId])-talentQuality(OFFICER_BY_ID[a.personId])||a.createdOrder-b.createdOrder);
 const limit=Math.max(1,f.D-f.N),active=s.campaign.domestic.assignments.filter(a=>s.cities.find(c=>c.id===a.cityId)?.owner===c.owner&&['hire','persuade'].includes(a.action?.key)).map(a=>a.action.targetId);
 const reserved=new Set([...active,...all.map(p=>p.personId)].slice(0,limit));
 return candidates.filter(x=>reserved.has(x.id)||reserved.size<limit).sort((a,b)=>Number(b.progress>0)-Number(a.progress>0)||b.score-a.score||a.created-b.created||a.id.localeCompare(b.id));
}
export function startTalentProject(s,a,c){
 const x=a.action,t=data(s),key=talentKey(x.targetId,c.owner);
 if(t.projects[key]?.state==='CLOSED')delete t.projects[key];
 const p=t.projects[key]??={personId:x.targetId,factionId:c.owner,mode:x.key,executorId:a.officerId,cityId:c.id,progress:0,attempts:0,spent:0,createdOrder:t.nextProject++,createdDay:day(s),lastContactDay:day(s),lastDecayDay:day(s),nextAttemptDay:0,lastAttemptTurn:-1,state:'ACTIVE',reason:'ready',meritPenalty:0};
 p.executorId=a.officerId;p.cityId=c.id;p.mode=x.key;p.state='ACTIVE';p.targetFaction=servingPeople(s).get(x.targetId)?.faction??null;p.lastAttemptTurn=talentTurn(s);p.attempts++;p.spent+=x.cost;
 const r=record(s,x.targetId);if(x.key==='hire'&&r.phase==='WAIT'){r.phase='SEEK';r.phaseUntilDay=day(s)+180;}
}
export function completeTalentProject(s,a,c,factor){
 const x=a.action,p=data(s).projects[talentKey(x.targetId,c.owner)];
 if(!p)return {actual:0,details:'项目已失效'};
 const actor=servingPeople(s).get(a.officerId)?.unit,actual=s.campaign.domestic.people.find(x=>x.id===p.personId)?.cityId||servingPeople(s).get(p.personId)?.location;
 if(actor?.mission&&actual!==actor.mission.location){p.state='PAUSED';p.reason='range';return {actual:0,details:'接洽对象已经离开，未产生远程接洽进度'};}
 const check=talentEligibility(s,p.personId,c.owner,c.id,p.mode);
 if(!check.ok||(p.mode==='persuade'&&servingPeople(s).get(p.personId)?.faction!==p.targetFaction)){p.state='PAUSED';p.reason=check.ok?'invalid':check.reason;return {actual:0,details:`接洽中止：${TALENT_REASONS[p.reason]}，不退已付费用`};}
 const gain=Math.min(progressFor(factor),Math.max(0,projectNeed(p.personId,p.mode)-p.progress));p.progress+=gain;p.lastContactDay=day(s);p.lastDecayDay=day(s);
 p.nextAttemptDay=day(s)+(factor<1?(p.mode==='hire'?20:30):0)+1;
 if(gain&&a.officerId!==p.personId){const info=relationshipInfo(a.officerId,p.personId,s.relationshipScores,s.relationshipTypes);if(info.type!=='disliked'&&info.score<65)changeRelationshipScore({relationshipScores:s.relationshipScores,relationshipTypes:s.relationshipTypes},a.officerId,p.personId,1);}
 return {actual:gain,details:`接洽进度+${gain}（${p.progress}/${projectNeed(p.personId,p.mode)}）${p.progress>=projectNeed(p.personId,p.mode)?'，等待旬末统一签约':factor<1?'，进入接洽冷却':''}`};
}
function stableRank(s,key){let hash=s.seed>>>0;for(const ch of key)hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;return hash/4294967296;}
export function resolveTalentOffers(s,cancel){
 const t=data(s);let offers=Object.values(t.projects).filter(p=>p.state!=='CLOSED'&&p.progress>=projectNeed(p.personId,p.mode));
 while(offers.length){
  const context=talentContext(s),valid=[];
  for(const p of offers){const e=talentEligibility(s,p.personId,p.factionId,p.cityId,p.mode,context,{ignoreCooldown:true});if(e.ok)valid.push({p,e});else{if(p.reason!==e.reason)report(s,'offer-paused',p.personId,`${OFFICER_BY_ID[p.personId].name}签约暂停：${TALENT_REASONS[e.reason]}。`,p.factionId);p.state='PAUSED';p.reason=e.reason;}}
  if(!valid.length)break;
  const groups=new Map();for(const v of valid){if(!groups.has(v.p.personId))groups.set(v.p.personId,[]);groups.get(v.p.personId).push(v);}
  const winners=[];
  for(const [id,list] of groups){const top=Math.max(...list.map(x=>x.e.W)),close=list.filter(x=>top-x.e.W<=5);
   const rank=x=>x.e.W+(close.length>1?stableRank(s,`${day(s)}:${id}:${x.p.factionId}`)*4-2:0);
   close.sort((a,b)=>rank(b)-rank(a)||stableRank(s,`${id}:${b.p.factionId}`)-stableRank(s,`${id}:${a.p.factionId}`)||a.p.factionId.localeCompare(b.p.factionId));winners.push(close[0]);}
  winners.sort((a,b)=>b.e.W-a.e.W||b.e.Q-a.e.Q||a.p.createdOrder-b.p.createdOrder||a.p.personId.localeCompare(b.p.personId));
  const {p}=winners[0],free=s.campaign.domestic.people.find(x=>x.id===p.personId),existing=s.campaign.idle.find(o=>o.unit.id===p.personId),location=free?.cityId||existing?.location;
  if(!location){offers=offers.filter(x=>x!==p);continue;}
  const unit=free?(free.unit||makeOfficer(p.personId,0,0,1,s.seed)):existing.unit;
  const previousFaction=record(s,p.personId).meritFaction||existing?.faction;
  let factionGrowth=null;
  if(previousFaction&&previousFaction!==p.factionId){
   factionGrowth=retainFactionMerit(unit);
   report(s,'merit-transfer',p.personId,`${unit.name}改仕，旧功绩保留20%；${meritChangeText(factionGrowth)}。`,p.factionId,{growth:factionGrowth,previousFaction});
  }
  record(s,p.personId).meritFaction=p.factionId;
  if(existing)report(s,'changed-side',p.personId,`${unit.name}接受其他势力邀请，离开本方。`,existing.faction);
  cancel(s,p.personId,'接受新势力邀请');
  if(existing)s.campaign.idle=s.campaign.idle.filter(o=>o!==existing);
  s.campaign.domestic.people=s.campaign.domestic.people.filter(x=>x.id!==p.personId);
  unit.homeCity=p.cityId;const recruit={unit,faction:p.factionId,location,destination:location===p.cityId?null:p.cityId,remainingDays:0};if(recruit.destination)startPersonnelJourney(s,recruit);s.campaign.idle.push(recruit);
  s.campaign.domestic.loyalty[p.personId]=free?80:65;
  const r=record(s,p.personId);Object.assign(r,{idleTurns:0,idleDays:0,idlePenaltyStep:2,workedDays:0,leaveAtDay:null,graceUntilDay:day(s)+91+(location===p.cityId?0:2),voluntaryFaction:p.factionId});
  for(const other of Object.values(t.projects).filter(x=>x.personId===p.personId)){if(other!==p&&other.state!=='CLOSED'){const o=servingPeople(s).get(other.executorId),penalty=Math.max(0,PROGRESSION.failures.talentProject-other.meritPenalty);if(o?.faction===other.factionId&&penalty)settleOfficerMerit(s,o.unit,{sourceId:`talent-project-failed:${other.createdOrder}`,amount:-penalty,faction:other.factionId,cityId:other.cityId,category:'talent',reason:'接洽项目未能签约'});}if(other!==p&&other.state!=='CLOSED')report(s,'project-closed',p.personId,`${unit.name}已接受其他势力邀请，接洽项目结束。`,other.factionId);other.state='CLOSED';other.reason=other===p?'signed':'other-faction';}
  for(const knowledge of Object.values(t.knowledge))if(knowledge[p.personId])knowledge[p.personId].locationConfirmed=false;
  report(s,'signed',p.personId,`${unit.name}完成接洽，加入${mapNode(s,p.cityId).name}${location===p.cityId?'':'，正沿道路赴任'}。`,p.factionId,{cost:p.spent,elapsed:day(s)-p.createdDay+1,reward:{kind:'officer',officerId:unit.id,stats:Object.fromEntries(['leadership','force','intellect','politics','charm'].map(k=>[k,unit[k]])),traits:passiveList(unit).filter(t=>!t.cap).map(t=>({id:t.id,name:t.name})),location,destination:recruit.destination}});
  const executor=servingPeople(s).get(p.executorId);
  if(executor?.faction===p.factionId)settleOfficerMerit(s,executor.unit,{sourceId:`talent-signed:${p.createdOrder}`,amount:PROGRESSION.talentSigned,faction:p.factionId,cityId:p.cityId,category:'talent',reason:`促成${unit.name}签约`});
  settleMeritCapacity(s);
  offers=offers.filter(x=>x.personId!==p.personId);
 }
}
function invalidateLocation(s,id,cityId){
 for(const [f,k]of Object.entries(data(s).knowledge))if(k[id]?.locationConfirmed){k[id].locationConfirmed=false;report(s,'moved',id,`${OFFICER_BY_ID[id].name}离开${mapNode(s,cityId).name}，原位置线索失效。`,f);}
}
function moveFreePerson(s,p){
 const routes=new Map([[p.cityId,[]]]),queue=[p.cityId];
 while(queue.length){const current=queue.shift(),path=routes.get(current);if(path.filter(id=>!isJunction(s,id)).length>=2)continue;
  for(const [a,b]of s.roads){const next=a===current?b:b===current?a:null;if(next&&!routes.has(next)&&legalRoad(s,current,next)){routes.set(next,[...path,next]);queue.push(next);}}
 }
 const context=talentContext(s),choices=[];
 for(const [id,path]of [...routes].sort(([a],[b])=>a.localeCompare(b))){if(isJunction(s,id)||cityBesieged(s,id)&&id!==p.cityId)continue;const c=s.cities.find(c=>c.id===id),friend=[...context.serving.values()].some(o=>o.location===id&&relation(s,p.id,o.unit.id)>=80);
  choices.push({id,path,score:(c.owner==='neutral'?50:willingness(s,p.id,c.owner,context).W)+(friend?6:0)-3*path.length+talentRandom(s)*10-5});
 }
 choices.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));const pick=choices[0];
 if(pick?.path.length){p.travel={path:pick.path,progress:0,remainingDays:Math.ceil(roadCost(s,p.cityId,pick.path[0])/lightPersonnelSpeed(p))};invalidateLocation(s,p.id,p.cityId);return true;}return false;
}
function freeOfficer(s,o,{hardDays=60,defeat=null}={}){
 const t=data(s),r=record(s,o.unit.id);s.campaign.idle=s.campaign.idle.filter(x=>x!==o);
 if(s.campaign.domestic.people.some(p=>p.id===o.unit.id))throw new Error('人物重复转为在野');
 s.campaign.domestic.people.push({id:o.unit.id,cityId:o.location,status:'FREE',debutDay:day(s),travel:null,unit:o.unit});
 Object.assign(r,{phase:'WAIT',phaseUntilDay:day(s)+hardDays+1,hardWaitUntilDay:day(s)+hardDays+1,idleDays:0,idleTurns:0,idlePenaltyStep:2,workedDays:0,leaveAtDay:null});
 if(defeat)r.defeatHistory.push(defeat);else r.rejoinBlocks[o.faction]=day(s)+181;
 // A free former employee starts a fresh project if they later approach the old employer.
 for(const p of Object.values(t.projects).filter(p=>p.personId===o.unit.id&&p.state!=='CLOSED')){p.mode='hire';p.state='PAUSED';p.reason='hardWait';}
 (t.knowledge[o.faction]??={})[o.unit.id]={discovered:true,lastKnownCityId:o.location,lastSeenDay:day(s),locationConfirmed:true,lastReportedAttitude:'waiting'};
 report(s,defeat?'displaced':'resigned',o.unit.id,`${o.unit.name}${defeat?'因势力灭亡流离在野':'因长期未任用辞官'}，整理${hardDays}天后再考虑出仕。`,o.faction);
}
export function noteTalentCityCapture(s,oldFaction,newFaction,eventId){if(oldFaction==='neutral')return;data(s).defeats[oldFaction]={oldFactionId:oldFaction,formerLordId:factionLord(s,oldFaction),defeatingFactionId:newFaction,defeatedTurn:talentTurn(s),eventId};}
export function processTalentDefeats(s,cancel){
 const t=data(s);
 for(const [f,h]of Object.entries(t.defeats)){
  if(t.processedEvents.includes(h.eventId)||s.cities.some(c=>c.owner===f))continue;
  const armies=s.armies.filter(a=>a.faction===f),ongoing=s.campaign.battles.some(b=>!b.settled&&b.armyIds.some(id=>armies.some(a=>a.id===id)));
  if(ongoing||armies.some(a=>a.units.some(u=>u.troops+u.wounded>0)))continue;
  const units=new Map();for(const a of armies){for(const u of a.units)units.set(u.id,{unit:u,faction:f,location:a.location,destination:null,remainingDays:0});for(const o of a.returningOfficers||[])units.set(o.unit.id,o);}
  s.armies=s.armies.filter(a=>a.faction!==f);for(const o of s.campaign.idle.filter(o=>o.faction===f))units.set(o.unit.id,o);
  for(const o of units.values()){cancel(s,o.unit.id,'势力灭亡');freeOfficer(s,o,{hardDays:(3+Math.floor(righteousness(o.unit.id)/20))*10,defeat:{...h}});}
  t.processedEvents.push(h.eventId);
 }
}
function hasDuty(s,o){
 if(diplomaticAssignment(s,o.unit.id))return true;
 if(o.unit.mission||o.unit.scouting)return true;
 if(o.cityUnit&&o.unit.troops+o.unit.wounded>0)return true;
 if(isLord(s,o.unit.id,o.faction))return true;
 if(o.army&&!o.army.disbanded&&o.army.units.some(u=>u.troops+u.wounded>0))return true;
 if(o.army&&!cityPersonnel(s,o.location).some(x=>x.unit.id===o.unit.id))return false;
 if(o.destination)return false;
 return s.cities.some(c=>c.id===o.location&&c.owner===o.faction&&(c.governor===o.unit.id||s.campaign.domestic.assignments.some(a=>a.officerId===o.unit.id&&a.cityId===c.id)));
}
export function finishTalentDay(s,cancel){
 const t=data(s);if(t.lastDay===day(s))return;t.lastDay=day(s);
 processTalentDefeats(s,cancel);
 for(const o of servingPeople(s).values()){
  if(o.faction==='neutral')continue;const r=record(s,o.unit.id);if(r.lastDutyDay===day(s))continue;r.lastDutyDay=day(s);
  if(hasDuty(s,o)){r.workedDays++;if(r.workedDays>=30){r.idleDays=0;r.idleTurns=0;r.idlePenaltyStep=2;if(r.leaveAtDay!==null){r.leaveAtDay=null;report(s,'retained',o.unit.id,`${o.unit.name}连续任职30天，取消离职预警。`,o.faction);}}}
  else {r.workedDays=0;if(day(s)>=r.graceUntilDay)r.idleDays++;}
  r.idleTurns=Math.floor(r.idleDays/10);
  if(day(s)%10||isLord(s,o.unit.id,o.faction))continue;
  const high=righteousness(o.unit.id)>=80||relation(s,o.unit.id,factionLord(s,o.faction))>=80;let loyalty=s.campaign.domestic.loyalty[o.unit.id]??85;
  const penaltyStep=Math.floor(r.idleDays/30);
  if(day(s)>=r.graceUntilDay&&!hasDuty(s,o)&&penaltyStep>r.idlePenaltyStep){loyalty=Math.max(0,loyalty-(high?2:5)*(penaltyStep-r.idlePenaltyStep));r.idlePenaltyStep=penaltyStep;}
  if(r.workedDays>=30&&day(s)%30===0&&loyalty<95)loyalty++;
  s.campaign.domestic.loyalty[o.unit.id]=loyalty;
  if(day(s)>=r.graceUntilDay&&!hasDuty(s,o)&&r.idleTurns>=18&&loyalty<(high?40:60)&&r.leaveAtDay===null){r.leaveAtDay=day(s)+30;report(s,'leave-warning',o.unit.id,`${o.unit.name}长期闲置，将于第${r.leaveAtDay}天辞官；需连续任职30天挽留，安抚不能取消预警。`,o.faction);}
  if(r.leaveAtDay!==null&&day(s)>=r.leaveAtDay){
   // Empty formations are not employment. Detach safely without deleting any
   // soldiers, changing a live battle or taking the rest of an army along.
   const a=o.army;
   if(a&&!a.travel&&!a.route.length&&!a.units.some(u=>u.troops+u.wounded>0)&&!s.campaign.battles.some(b=>!b.settled&&b.armyIds.includes(a.id))){
    a.units=a.units.filter(u=>u.id!==o.unit.id);if(!a.units.length)s.armies=s.armies.filter(x=>x!==a);else{if(!a.units.some(u=>u.id===a.leader))a.leader=a.units[0].id;if(!a.units.some(u=>u.id===a.advisor))a.advisor=a.units[0].id;}
    delete o.army;
   }
   // Offsite missions keep their original resident container until return.
   // A due resignation waits for that real return instead of freeing a second
   // copy at the mission location while leaving the employee in the home city.
   if(!o.army&&!o.destination&&!o.retreating&&!o.unit.mission){if(o.cityUnit){const c=s.cities.find(c=>c.id===o.location);c.units=c.units.filter(u=>u.id!==o.unit.id);}cancel(s,o.unit.id,'辞官');for(const c of s.cities)if(c.governor===o.unit.id)c.governor=null;freeOfficer(s,o);}
  }
 }
 for(const p of s.campaign.domestic.people){
  const r=record(s,p.id);if(['DEAD','CAPTIVE','EXCLUDED'].includes(p.status))continue;
  if(p.status==='NOT_DEBUTED'){if(day(s)<p.debutDay)continue;p.status='FREE';}
  if(p.travel){let budget=lightPersonnelSpeed(p);while(p.travel&&budget>0){const t=p.travel,next=t.path[0];if(!legalRoad(s,p.cityId,next))break;const cost=roadCost(s,p.cityId,next),used=Math.min(budget,cost-t.progress);t.progress+=used;budget-=used;if(t.progress>=cost){p.cityId=t.path.shift();t.progress=0;if(!t.path.length){p.travel=null;r.phaseUntilDay=day(s)+(r.phase==='SEEK'?180:randomInt(s,6,18)*10);}}if(p.travel)p.travel.remainingDays=Math.max(1,Math.ceil((roadCost(s,p.cityId,p.travel.path[0])-p.travel.progress)/lightPersonnelSpeed(p)));}continue;}
  if(day(s)%10||day(s)+1<r.phaseUntilDay||day(s)+1<r.hardWaitUntilDay)continue;
  if(r.phase==='WAIT'){r.phase='SEEK';r.phaseUntilDay=day(s)+180;if(r.hardWaitUntilDay){r.hardWaitUntilDay=0;moveFreePerson(s,p);}for(const [f,k]of Object.entries(t.knowledge))if(k[p.id]?.locationConfirmed)report(s,'seeking',p.id,`${OFFICER_BY_ID[p.id].name}开始求仕。`,f);}
  else {
   const active=Object.values(t.projects).some(x=>x.personId===p.id&&x.state!=='CLOSED'&&x.progress>0&&day(s)-x.lastContactDay<=30&&willingness(s,p.id,x.factionId).W>=60&&talentEligibility(s,p.id,x.factionId,x.cityId,'hire',undefined,{ignoreCooldown:true}).ok)||s.campaign.domestic.assignments.some(a=>a.action?.targetId===p.id&&a.action.remaining<=1&&a.action.key==='hire');
   if(active){r.phaseUntilDay=day(s)+30;continue;}r.phase='WAIT';r.phaseUntilDay=day(s)+randomInt(s,6,18)*10;moveFreePerson(s,p);
  }
 }
 if(day(s)%10===0){refreshTalentDemand(s,day(s)%30===0);refreshTalentProjects(s);}
}
export function talentArrived(s,id){const r=record(s,id);r.graceUntilDay=day(s)+90;}
export function refreshTalentProjects(s){
 const t=data(s),context=talentContext(s);
 for(const p of Object.values(t.projects)){
  if(p.state==='CLOSED')continue;
  if(s.campaign.domestic.people.some(x=>x.id===p.personId))p.mode='hire';
  const check=talentEligibility(s,p.personId,p.factionId,p.cityId,p.mode,context,{ignoreCooldown:p.progress>=projectNeed(p.personId,p.mode)});
  if(check.ok&&p.state==='PAUSED')report(s,'project-resumed',p.personId,`${OFFICER_BY_ID[p.personId].name}的接洽项目可以恢复。`,p.factionId);
  p.state=check.ok?'ACTIVE':'PAUSED';p.reason=check.reason;
  if(day(s)-p.lastContactDay>=120&&day(s)-p.lastDecayDay>=30){const ticks=Math.floor((day(s)-Math.max(p.lastDecayDay,p.lastContactDay+90))/30);if(ticks>0){p.progress=Math.max(0,p.progress-ticks*6);p.lastDecayDay+=Math.max(0,p.lastContactDay+90-p.lastDecayDay)+ticks*30;}}
 }
 for(const [f,known]of Object.entries(t.knowledge))for(const [id,k]of Object.entries(known)){
  if(!k.locationConfirmed)continue;const p=s.campaign.domestic.people.find(p=>p.id===id);if(!p||p.travel||p.cityId!==k.lastKnownCityId){k.locationConfirmed=false;continue;}
  const w=willingness(s,id,f,context),attitude=w.W>=60?record(s,id).phase==='SEEK'?'ready':'waiting':'unwilling';
  if(attitude!==k.lastReportedAttitude){k.lastReportedAttitude=attitude;report(s,'attitude',id,`${OFFICER_BY_ID[id].name}：${TALENT_REASONS[attitude]}${w.H?'（有旧主顾虑）':''}。`,f);}
 }
}
export function prepareEnemyDomestic(s){
 if(!s.campaign.scenarioId)return;
 for(const faction of [...new Set(s.cities.filter(c=>isAIControlled(s,c.owner)).map(c=>c.owner))]){
  const cities=s.cities.filter(c=>c.owner===faction),first=[cities.some(c=>cityNeedsAgriculture(s,c))?'agriculture':null,cities.some(c=>cityNeedsCommerce(s,c))?'commerce':null].filter(Boolean);
  setDomesticPriority(s,[...first,...Object.keys(DIRECTIONS).filter(d=>!first.includes(d))],{faction,scheduled:true});
 }
 for(const c of s.cities.filter(c=>isAIControlled(s,c.owner))){
  if(s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===c.id))continue;
  if(!c.governor){const best=rankOfficerCandidates(s,cityPersonnel(s,c.id).map(o=>o.unit).filter(u=>!u.mission&&!u.scouting&&!diplomaticAssignment(s,u.id)&&!plannedOfficer(s,u.id)&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(u.id))),{task:'governor',city:c.id}).find(x=>x.recommendation.available);if(best)appointGovernor(s,c.id,best.unit.id,{scheduled:true,faction:c.owner});}
  // Reuse a waiting optional worker when the city has lost its sole producer.
  // Paid active work continues; this is a real appointment, never free income.
  const priorities=[cityNeedsAgriculture(s,c)?'agriculture':null,cityNeedsCommerce(s,c)?'commerce':null].filter(Boolean);
  for(const direction of priorities){
   const resident=cityPersonnel(s,c.id).map(o=>o.unit).filter(u=>!u.mission&&!u.scouting&&!diplomaticAssignment(s,u.id)&&!plannedOfficer(s,u.id)&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(u.id)));
   if(resident.some(u=>assignmentFor(s,u.id)?.direction===direction))continue;
   const eligible=resident.filter(u=>!assignmentFor(s,u.id)?.action&&!priorities.includes(assignmentFor(s,u.id)?.direction)),free=eligible.filter(u=>!assignmentFor(s,u.id));
   const best=rankOfficerCandidates(s,free.length?free:eligible,{task:'domestic',city:c.id,direction}).find(x=>x.recommendation.available);
   if(best)assignDomestic(s,c.id,direction,best.unit.id,{scheduled:true,faction:c.owner});
  }
  const assigned=new Set(s.campaign.domestic.assignments.map(a=>a.officerId));
  let units=cityPersonnel(s,c.id).map(o=>o.unit).filter(u=>!u.scouting&&!assigned.has(u.id)&&!diplomaticAssignment(s,u.id)&&!plannedOfficer(s,u.id)&&!u.mission&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(u.id)));
  const directions=Object.keys(DIRECTIONS).filter(direction=>!s.campaign.domestic.assignments.some(a=>a.cityId===c.id&&a.direction===direction));
  // Secure food staffing before optional jobs when planned soldiers outconsume
  // recurring fields. Existing appointments and active work remain intact.
  const foodPriority=cityNeedsAgriculture(s,c),cashPriority=cityNeedsCommerce(s,c),pairs=withCitySupplyQueries(s,()=>directions.flatMap(direction=>rankOfficerCandidates(s,units,{task:'domestic',city:c.id,direction}).filter(x=>x.recommendation.available).map(x=>({...x,direction,priority:x.recommendation.score*domesticIntentWeight(s,c.id,direction)}))).sort((a,b)=>(foodPriority?Number(b.direction==='agriculture')-Number(a.direction==='agriculture'):0)||(cashPriority?Number(b.direction==='commerce')-Number(a.direction==='commerce'):0)||b.priority-a.priority||a.unit.id.localeCompare(b.unit.id)||a.direction.localeCompare(b.direction)));
  const filled=new Set();for(const x of pairs){if(assigned.has(x.unit.id)||filled.has(x.direction))continue;assigned.add(x.unit.id);filled.add(x.direction);assignDomestic(s,c.id,x.direction,x.unit.id,{scheduled:true,faction:c.owner});}
  // Additional civil officers perform real autonomous work, using the same
  // recommendation scores and costs as player appointments. Never reassign work.
  for(let slot=1;slot<ECONOMY_RULES.ai.economicWorkersPerDirection;slot++)for(const direction of ['agriculture','commerce','military']){
   if(s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&a.direction===direction).length>slot)continue;
   const best=rankOfficerCandidates(s,units.filter(u=>!assigned.has(u.id)),{task:'domestic',city:c.id,direction}).find(x=>x.recommendation.available);
   if(best){assignDomestic(s,c.id,direction,best.unit.id,{scheduled:true,faction:c.owner});assigned.add(best.unit.id);}
  }
 }
}
export function talentSummary(s,faction=playerFaction(s)){
 const context=talentContext(s),f=context.factions[faction]||{N:0,D:1},t=data(s);
 return {N:f.N,D:f.D,people:Object.entries(t.knowledge[faction]||{}).map(([id,k])=>{
  const p=t.projects[talentKey(id,faction)],w=willingness(s,id,faction,context),r=t.records[id];return {id,...k,W:Math.round(w.W),H:w.H,phase:r.phase,progress:p?.progress||0,need:projectNeed(id,p?.mode),reason:p?.reason||k.lastReportedAttitude};
 }),reports:t.reports.filter(r=>r.faction===faction).slice(0,16)};
}
export function validateTalent(s){
 const fail=(ok,message='人才存档无效')=>{if(!ok)throw new Error(message);},int=(x,max=1e9)=>Number.isSafeInteger(x)&&x>=0&&x<=max,map=x=>x&&typeof x==='object'&&!Array.isArray(x),t=data(s),city=id=>!!mapNode(s,id);
 fail(t?.version===TALENT_RULES.version,'人才存档版本不兼容，请重新开始');
 const factions=new Set([...s.cities.map(c=>c.owner),...Object.keys(t.knowledge)]);
 fail(int(t.seed,0xffffffff)&&int(t.lastDay,day(s))&&t.lastDay===s.campaign.domestic.lastFinishedDay&&int(t.nextProject)&&t.nextProject>0&&int(t.demandMonth)&&typeof t.demandSignature==='string');
 for(const key of ['records','projects','knowledge','demands','defeats'])fail(map(t[key]));
 fail(Object.keys(t.records).length===OFFICER_CATALOG.length);
 for(const [id,r]of Object.entries(t.records)){
  fail(OFFICER_BY_ID[id]&&r&&['WAIT','SEEK'].includes(r.phase)&&['phaseUntilDay','hardWaitUntilDay','idleTurns','idleDays','idlePenaltyStep','workedDays','graceUntilDay','lastDutyDay'].every(k=>int(r[k]))&&r.idleTurns===Math.floor(r.idleDays/10)&&r.lastDutyDay<=day(s));
  fail(r.leaveAtDay===null||int(r.leaveAtDay));fail(r.voluntaryFaction===null||factions.has(r.voluntaryFaction));fail(r.meritFaction===null||factions.has(r.meritFaction));fail(map(r.rejoinBlocks)&&Object.entries(r.rejoinBlocks).every(([f,n])=>factions.has(f)&&int(n))&&Array.isArray(r.defeatHistory));
  for(const h of r.defeatHistory)fail(factions.has(h.oldFactionId)&&factions.has(h.defeatingFactionId)&&(h.formerLordId===null||OFFICER_BY_ID[h.formerLordId])&&int(h.defeatedTurn)&&typeof h.eventId==='string');
 }
 const serving=servingPeople(s),seen=new Set(serving.keys());
 for(const p of s.campaign.domestic.people){
  fail(OFFICER_BY_ID[p.id]&&!seen.has(p.id)&&city(p.cityId)&&['FREE','NOT_DEBUTED','CAPTIVE','DEAD','EXCLUDED'].includes(p.status)&&int(p.debutDay),'人才身份或唯一性无效');seen.add(p.id);
  if(p.travel){fail(p.status==='FREE'&&Array.isArray(p.travel.path)&&p.travel.path.length>0&&p.travel.path.length<=mapNodes(s).length&&int(p.travel.remainingDays,100)&&p.travel.remainingDays>0&&Number.isFinite(p.travel.progress)&&p.travel.progress>=0&&p.travel.progress<roadCost(s,p.cityId,p.travel.path[0]));let from=p.cityId;for(const to of p.travel.path){fail(city(to)&&s.roads.some(([a,b])=>a===from&&b===to||b===from&&a===to));from=to;}}
  if(p.fate){fail(['CAPTIVE','DEAD'].includes(p.status)&&factions.has(p.fate.originalFaction)&&(p.status==='DEAD'?p.fate.captor===null:factions.has(p.fate.captor))&&int(p.fate.day,day(s))&&typeof p.fate.eventId==='string'&&typeof p.fate.reason==='string');}
  if(p.custody){const t=p.custody;fail(p.status==='CAPTIVE'&&p.fate&&city(t.destination)&&Array.isArray(t.route)&&t.route.length>0&&t.route.length<=mapNodes(s).length&&Number.isFinite(t.progress)&&t.progress>=0&&t.progress<roadCost(s,p.cityId,t.route[0]));let from=p.cityId;for(const to of t.route){fail(Number.isFinite(roadCost(s,from,to)));from=to;}fail(from===t.destination);}
  if(p.unit){fail(p.unit.id===p.id&&city(p.unit.homeCity));const proxy=newGame();proxy.armies=[{...proxy.armies[0],units:[p.unit],leader:p.id,advisor:p.id,}];validateSave(proxy);}
 }
 fail(seen.size===OFFICER_CATALOG.length,'人物池存在遗漏');
 const orders=new Set();
 for(const [key,p]of Object.entries(t.projects)){
  fail(key===talentKey(p.personId,p.factionId)&&OFFICER_BY_ID[p.personId]&&factions.has(p.factionId)&&['hire','persuade'].includes(p.mode)&&OFFICER_BY_ID[p.executorId]&&city(p.cityId));
  fail(Number.isSafeInteger(p.meritPenalty)&&p.meritPenalty>=0,'人才扣罚记录无效');fail(['progress','attempts','spent','createdOrder','createdDay','lastContactDay','lastDecayDay','nextAttemptDay'].every(k=>int(p[k]))&&p.progress<=projectNeed(p.personId,'persuade')&&p.createdOrder>0&&p.createdOrder<t.nextProject&&!orders.has(p.createdOrder)&&int(p.lastAttemptTurn)&&['ACTIVE','PAUSED','CLOSED'].includes(p.state)&&typeof p.reason==='string');orders.add(p.createdOrder);
 }
 for(const [f,known]of Object.entries(t.knowledge)){fail(factions.has(f)&&map(known));for(const [id,k]of Object.entries(known))fail(OFFICER_BY_ID[id]&&k.discovered===true&&city(k.lastKnownCityId)&&int(k.lastSeenDay,day(s))&&typeof k.locationConfirmed==='boolean'&&['ready','waiting','unwilling'].includes(k.lastReportedAttitude));}
 for(const [f,d]of Object.entries(t.demands))fail(factions.has(f)&&int(d.cities,s.cities.length)&&int(d.soldiers)&&int(d.demand)&&d.demand>=1);

 fail(Array.isArray(t.processedEvents)&&new Set(t.processedEvents).size===t.processedEvents.length&&t.processedEvents.every(x=>typeof x==='string'));
 for(const [f,h]of Object.entries(t.defeats))fail(factions.has(f)&&h.oldFactionId===f&&factions.has(h.defeatingFactionId)&&typeof h.eventId==='string'&&int(h.defeatedTurn));
 fail(Array.isArray(t.reports)&&t.reports.length<=160&&t.reports.every(r=>int(r.day,day(s))&&typeof r.text==='string'&&r.text.length<1000&&typeof r.code==='string'&&(r.personId===null||OFFICER_BY_ID[r.personId])&&factions.has(r.faction)));
}
