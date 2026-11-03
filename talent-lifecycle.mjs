import {isAITurnStart} from './ai-turn.mjs';
import {conquerTreasures,followTreasureOfficerFaction} from './treasures.mjs';
import {workProfile,workQuantity} from './work-traits.mjs';
import {ACTIONS} from './domestic-designs.mjs';
import {mapNode,mapNodes,isJunction} from './road-network.mjs';
import {appendActivityNode} from './activity-nodes.mjs';
import {retainFactionMerit,meritChangeText,PROGRESSION} from './progression.mjs';
import {settleOfficerMerit,settleMeritCapacity} from './campaign-merit.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {cityNeedsAgriculture,cityNeedsCommerce} from './economy.mjs';
import {plannedOfficer,domesticIntentWeight} from './strategic-intent.mjs';
import {diplomaticAssignment} from './diplomacy-relations.mjs';
import {dismissDiplomat} from './diplomacy.mjs';
import {recallScout} from './scouting.mjs';
import {domesticStaffing} from './domestic-staffing.mjs';
import {assignDomestic,assignmentFor,setDomesticPriority} from './domestic.mjs';
import {appointGovernor,disbandCityUnits} from './strategic-campaign.mjs';
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
import {nationalScenario,nationalWorld,nationalPersonnel,talentScenarioEntry} from './national-scenarios.mjs';
import {relationshipInfo,changeRelationshipScore} from './relationships.mjs';
import {TALENT_RULES,clamp,talentTurn,talentKey,talentQuality,righteousness,relation,servingPeople,factionLord,isLord,loyaltyWarningThreshold,loyaltyResignationChance,nearby,localContact,legalRoad,cityBesieged,refreshTalentDemand,talentContext,willingness,projectNeed,progressFor,talentEligibility,persuasionEligibility,persuasionTargets,TALENT_REASONS} from './talent-core.mjs';
import {scenarioDateDay} from './scenario-date.mjs';
import {configuredScenarioOfficer} from './scenario-opening.mjs';

const data=s=>s.campaign.talent;
const day=s=>s.campaign.day;
export function talentRandom(s){const t=data(s);t.seed=(Math.imul(t.seed,1664525)+1013904223)>>>0;return t.seed/4294967296;}
const randomInt=(s,a,b)=>a+Math.floor(talentRandom(s)*(b-a+1));
function report(s,code,id,text,faction=playerFaction(s),extra={}){
 const t=data(s);t.reports.unshift({day:day(s),code,personId:id,faction,text,...extra});t.reports=t.reports.slice(0,160);
 const person=servingPeople(s).get(id),project=t.projects[talentKey(id,faction)],cityId=project?.cityId||person?.location||s.campaign.domestic.people.find(p=>p.id===id)?.cityId||null;
 appendActivityNode(s,{sourceId:'talent:'+s.campaign.activity?.nextSequence,category:'talent',phase:code,faction,officerId:id,officerIds:project?.executorId?[project.executorId]:[],cityId,siteId:person?.location||s.campaign.domestic.people.find(p=>p.id===id)?.cityId||cityId,text,result:extra});
 if(faction===playerFaction(s)&&['discovered','signed','loyalty-low','resigned','changed-side','offer-paused','project-closed'].includes(code)){
  const d=s.campaign.domestic,person=servingPeople(s).get(id),project=t.projects[talentKey(id,faction)];
  d.events.unshift({id:d.nextId++,actionId:null,assignmentId:null,cityId:project?.cityId||person?.location||d.people.find(p=>p.id===id)?.cityId||null,officerId:id,faction,day:day(s),phase:'event',text,result:{talentCode:code},important:true,read:false});d.events=d.events.slice(0,240);
 }
 if(faction===playerFaction(s))log(s,`第${day(s)}天：${text}`,'event');
}
function record(s,id){return data(s).records[id]??={phase:'WAIT',phaseUntilDay:0,hardWaitUntilDay:0,defeatHistory:[],rejoinBlocks:{},idleTurns:0,idleDays:0,idlePenaltyStep:2,workedDays:0,loyaltyWarning:false,lastLoyaltyRiskDay:0,graceUntilDay:day(s)+90,lastDutyDay:0,voluntaryFaction:null,meritFaction:null};}
export function initializeTalent(s){
 s.campaign.talent={version:TALENT_RULES.version,seed:(s.seed^0x9a325f17)>>>0,records:{},projects:{},knowledge:{},demands:{},demandSignature:'',demandMonth:-1,reports:[],processedEvents:[],defeats:{},lastDay:day(s)-1,nextProject:1};
 const occupied=servingPeople(s),spec=nationalScenario(s.campaign.scenarioId),t=data(s),presets=new Map((spec?nationalPersonnel(spec.id,s.cities):[]).map(o=>[o.id,o]));let index=0,missing=0;
 for(const f of new Set(s.cities.map(c=>c.owner)))if(f!=='neutral'){t.knowledge[f]={};}
 s.campaign.domestic.people=[];
 for(const u of OFFICER_CATALOG){
  const r=record(s,u.id);if(occupied.has(u.id)){r.meritFaction=occupied.get(u.id).faction;continue;}
  const entry=talentScenarioEntry(s.campaign.scenarioId,u,s.cities),preset=presets.get(u.id),location=preset?.cityId||entry.activityCityIds[0],cityId=location||s.cities[index++%s.cities.length].id;if(!location&&entry.autoEligible)missing++;
  const d=spec?.customDocument||(spec?{...spec,month:spec.month||1,day:spec.day||1}:null);
  const defaultDebut=entry.earliestTurn===null?1:1+10*randomInt(s,entry.earliestTurn,entry.latestTurn);
  const debutDay=preset?Math.max(day(s),scenarioDateDay(d,preset.debutDate),preset.state==='free'?scenarioDateDay(d,preset.freeDate):0):defaultDebut;
  const status=preset?({dead:'DEAD',excluded:'EXCLUDED'}[preset.state]||(debutDay>day(s)?'NOT_DEBUTED':preset.state==='captive'?'CAPTIVE':'FREE')):!entry.autoEligible?'EXCLUDED':spec&&spec.kind!=='fictional'&&u.deathYear&&u.deathYear<spec.year?'DEAD':debutDay>day(s)?'NOT_DEBUTED':'FREE';
  r.phase=talentRandom(s)<.35?'SEEK':'WAIT';r.phaseUntilDay=debutDay+(r.phase==='SEEK'?180:randomInt(s,3,36)*10);
  const p={id:u.id,cityId:preset?.cityId||cityId,status,debutDay,travel:null};
  if(preset&&spec.customDocument&&!['DEAD','EXCLUDED'].includes(status)){p.unit={...configuredScenarioOfficer(preset,0,0,d.level,s.seed),homeCity:preset.state==='captive'?d.forces.find(f=>f.id===preset.faction).capitalId:p.cityId};if(status==='CAPTIVE')p.fate={originalFaction:spec.factionMap[preset.faction],captor:spec.factionMap[preset.captor],day:day(s),eventId:'scenario-captive-'+p.id,reason:'剧本初始俘虏'};}
  if(preset?.loyalty!==undefined)s.campaign.domestic.loyalty[u.id]=preset.loyalty;
  s.campaign.domestic.people.push(p);
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
export function activateScheduledScenarioPeople(s){
 if(!s.campaign.domestic.people.some(p=>p.status==='NOT_DEBUTED'&&p.debutDay<=day(s)))return;
 const spec=nationalScenario(s.campaign.scenarioId);if(!spec)return;
 const d=spec.customDocument||spec,entries=new Map(nationalPersonnel(spec.id,nationalWorld(spec.id).cities).map(o=>[o.id,o])),runtimeFaction=f=>spec.factionMap?.[f]||f;
 for(const p of [...s.campaign.domestic.people]){
  if(p.status!=='NOT_DEBUTED'||p.debutDay>s.campaign.day)continue;
  const entry=entries.get(p.id);
  const faction=runtimeFaction(entry?.faction),home=s.cities.find(c=>c.id===p.cityId);
  if(entry?.state==='serving'&&home?.owner===faction){
   const unit=p.unit||configuredScenarioOfficer(entry,0,0,d.level||3,s.seed);unit.homeCity=home.id;
   s.campaign.domestic.people=s.campaign.domestic.people.filter(o=>o!==p);
   if(unit.troops+unit.wounded>0)home.units.push(unit);else s.campaign.idle.push({unit,faction,location:home.id,destination:null,remainingDays:0});
   s.campaign.domestic.loyalty[p.id]=entry.loyalty??85;Object.assign(record(s,p.id),{meritFaction:faction,graceUntilDay:day(s)+90});
   if(entry.role==='governor')appointGovernor(s,home.id,p.id,{scheduled:true,faction});
   else if(entry.role)assignDomestic(s,home.id,entry.role,p.id,{scheduled:true,faction});
   if(faction===playerFaction(s))report(s,'signed',p.id,unit.name+'已在'+home.name+'登场任职。',faction);
  }else if(entry?.state==='captive'&&home?.owner===runtimeFaction(entry.captor)){p.status='CAPTIVE';p.fate={originalFaction:runtimeFaction(entry.faction),captor:runtimeFaction(entry.captor),day:day(s),eventId:'scenario-captive-'+p.id,reason:'剧本初始俘虏'};}
  else {p.status='FREE';if(entry?.state==='serving'&&p.unit){p.unit.troops=0;p.unit.wounded=0;}}
 }
}
export function unknownTalent(s,cityId,faction){return s.campaign.domestic.people.filter(p=>p.status==='FREE'&&!p.travel&&!data(s).knowledge[faction]?.[p.id]?.locationConfirmed&&localContact(s,cityId,p.cityId));}
// Invitations and local volunteers move the same real person from its actual
// location, using the existing personnel journey rather than a duplicate.
function moveFreeTalentIntoService(s,free,unit,faction,homeCity){
 s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p!==free);
 followTreasureOfficerFaction(s,unit.id,faction);unit.homeCity=homeCity;const recruit={unit,faction,location:free.cityId,destination:free.cityId===homeCity?null:homeCity,remainingDays:0};
 if(recruit.destination)startPersonnelJourney(s,recruit);s.campaign.idle.push(recruit);return recruit;
}
export function welcomeBanditTalent(s,id,faction,homeCity,campName){
 const free=s.campaign.domestic.people.find(p=>p.id===id&&p.status==='FREE'&&!p.travel),home=mapNode(s,homeCity);if(!free||home?.owner!==faction)return false;
 const r=record(s,id);if(r.hardWaitUntilDay>day(s)||(r.rejoinBlocks[faction]||0)>day(s)||Object.values(data(s).projects).some(p=>p.personId===id&&p.state!=='CLOSED'))return false;
 const unit=free.unit||makeOfficer(id,0,0,1,s.seed);if(r.meritFaction&&r.meritFaction!==faction)retainFactionMerit(unit);
 const recruit=moveFreeTalentIntoService(s,free,unit,faction,homeCity);s.campaign.domestic.loyalty[id]=80;
 Object.assign(r,{meritFaction:faction,idleTurns:0,idleDays:0,idlePenaltyStep:2,workedDays:0,loyaltyWarning:false,lastLoyaltyRiskDay:0,graceUntilDay:day(s)+91,voluntaryFaction:faction});
 for(const knowledge of Object.values(data(s).knowledge))if(knowledge[id])knowledge[id].locationConfirmed=false;
 report(s,'signed',id,`${unit.name}闻${campName}已平，前来投效${home.name}${recruit.destination?'，正沿道路赴任':''}。`,faction,{banditVolunteer:true});refreshTalentDemand(s,true);return true;
}
export function talentCandidates(s,c,mode){
 const context=talentContext(s,mode==='persuade'?c.owner:null),t=data(s),ids=mode==='hire'?s.campaign.domestic.people.filter(p=>p.status==='FREE'&&!p.travel&&nearby(s,c.id,p.cityId)&&t.knowledge[c.owner]?.[p.id]?.locationConfirmed).map(p=>p.id):persuasionTargets(s,c.owner).filter(o=>nearby(s,c.id,o.location)).map(o=>o.unit.id),f=context.factions[c.owner]||{N:0,D:1};
 const eligible=(id,city,kind)=>kind==='persuade'?persuasionEligibility(s,id,c.owner,city,context):talentEligibility(s,id,c.owner,city,kind,context);
 const candidates=[];
 for(const id of ids){
  const check=eligible(id,c.id,mode);if(!check.ok)continue;
  const saved=t.projects[talentKey(id,c.owner)],p=saved?.state==='CLOSED'?null:saved,need=projectNeed(id,mode);if(p?.progress>=need||p?.lastAttemptTurn===talentTurn(s))continue;
  if(s.campaign.domestic.assignments.some(a=>{const reserved=a.action||a.proposal?.pick;return s.cities.find(c=>c.id===a.cityId)?.owner===c.owner&&reserved?.targetId===id&&['hire','persuade','disaffect'].includes(reserved.key);}))continue;
  const score=(mode==='hire'?70:45)+Math.floor(15*(p?.progress||0)/need)+clamp((check.Q-70)/2,0,15)+(mode==='hire'&&check.W>=80?5:0);
  candidates.push({id,score,check,progress:p?.progress||0,created:p?.createdOrder??Number.MAX_SAFE_INTEGER});
 }
 // Existing projects get first use of the faction's paid parallel slots.
 const all=Object.values(t.projects).filter(p=>p.factionId===c.owner&&p.state!=='CLOSED'&&p.progress>0&&p.progress<projectNeed(p.personId,p.mode)&&eligible(p.personId,p.cityId,p.mode).ok).sort((a,b)=>talentQuality(OFFICER_BY_ID[b.personId])-talentQuality(OFFICER_BY_ID[a.personId])||a.createdOrder-b.createdOrder);
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
 if(!check.ok||(p.mode==='persuade'&&servingPeople(s).get(p.personId)?.faction!==p.targetFaction)){p.state='PAUSED';p.reason=check.ok?'invalid':check.reason;p.nextAttemptDay=day(s)+(p.mode==='persuade'?30:20)+1;return {actual:0,details:`接洽中止：${TALENT_REASONS[p.reason]}，不退已付费用`};}
 const gain=Math.min(Math.floor(progressFor(factor)*workQuantity(factor,workProfile(a.action.traitIds,ACTIONS[a.action.key]))),Math.max(0,projectNeed(p.personId,p.mode)-p.progress));p.progress+=gain;p.lastContactDay=day(s);p.lastDecayDay=day(s);
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
  let recruit;
  if(free)recruit=moveFreeTalentIntoService(s,free,unit,p.factionId,p.cityId);
  else {unit.homeCity=p.cityId;recruit={unit,faction:p.factionId,location,destination:location===p.cityId?null:p.cityId,remainingDays:0};if(recruit.destination)startPersonnelJourney(s,recruit);s.campaign.idle.push(recruit);}
  followTreasureOfficerFaction(s,unit.id,p.factionId);s.campaign.domestic.loyalty[p.personId]=free?80:65;
  const r=record(s,p.personId);Object.assign(r,{idleTurns:0,idleDays:0,idlePenaltyStep:2,workedDays:0,loyaltyWarning:false,lastLoyaltyRiskDay:0,graceUntilDay:day(s)+91+(location===p.cityId?0:2),voluntaryFaction:p.factionId});
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
 followTreasureOfficerFaction(s,o.unit.id,'neutral');
 const t=data(s),r=record(s,o.unit.id);s.campaign.idle=s.campaign.idle.filter(x=>x!==o);
 // A former employee cannot retain a staffing promise after leaving service.
 // Release it in this transition so a same-day year-end save remains valid.
 if(s.campaign.ai)s.campaign.ai.staffing=s.campaign.ai.staffing.filter(p=>p.officerId!==o.unit.id);
 if(s.campaign.domestic.people.some(p=>p.id===o.unit.id))throw new Error('人物重复转为在野');
 s.campaign.domestic.people.push({id:o.unit.id,cityId:o.location,status:'FREE',debutDay:day(s),travel:null,unit:o.unit});
 Object.assign(r,{phase:'WAIT',phaseUntilDay:day(s)+hardDays+1,hardWaitUntilDay:day(s)+hardDays+1,idleDays:0,idleTurns:0,idlePenaltyStep:2,workedDays:0,loyaltyWarning:false,lastLoyaltyRiskDay:0});
 if(defeat)r.defeatHistory.push(defeat);else r.rejoinBlocks[o.faction]=day(s)+181;
 // A free former employee starts a fresh project if they later approach the old employer.
 for(const p of Object.values(t.projects).filter(p=>p.personId===o.unit.id&&p.state!=='CLOSED')){p.mode='hire';p.state='PAUSED';p.reason='hardWait';}
 (t.knowledge[o.faction]??={})[o.unit.id]={discovered:true,lastKnownCityId:o.location,lastSeenDay:day(s),locationConfirmed:true,lastReportedAttitude:'waiting'};
 report(s,defeat?'displaced':'resigned',o.unit.id,`${o.unit.name}${defeat?'因势力灭亡流离在野':'因忠诚低辞官'}，整理${hardDays}天后再考虑出仕。`,o.faction);
}
export function noteTalentCityCapture(s,oldFaction,newFaction,eventId){if(oldFaction==='neutral')return;conquerTreasures(s,oldFaction,newFaction,eventId);data(s).defeats[oldFaction]={oldFactionId:oldFaction,formerLordId:factionLord(s,oldFaction),defeatingFactionId:newFaction,defeatedTurn:talentTurn(s),eventId};}
export function processTalentDefeats(s,cancel){
 const t=data(s);
 for(const [f,h]of Object.entries(t.defeats)){
  if(t.processedEvents.includes(h.eventId)||s.cities.some(c=>c.owner===f))continue;
  const engaged=new Set(s.campaign.battles.filter(b=>!b.settled).flatMap(b=>b.armyIds)),armies=s.armies.filter(a=>a.faction===f&&!engaged.has(a.id)),ongoing=s.armies.some(a=>a.faction===f&&engaged.has(a.id));
  const units=new Map();for(const a of armies){for(const u of a.units)units.set(u.id,{unit:u,faction:f,location:a.location,destination:null,remainingDays:0});for(const o of a.returningOfficers||[])units.set(o.unit.id,o);}
  s.armies=s.armies.filter(a=>a.faction!==f||engaged.has(a.id));for(const o of s.campaign.idle.filter(o=>o.faction===f))units.set(o.unit.id,o);
  s.pendingAppointments=s.pendingAppointments.filter(p=>s.armies.some(a=>a.id===p.armyId));
  for(const o of units.values()){cancel(s,o.unit.id,'势力灭亡');o.unit.troops=0;o.unit.wounded=0;delete o.unit.mission;delete o.unit.scouting;freeOfficer(s,o,{hardDays:(3+Math.floor(righteousness(o.unit.id)/20))*10,defeat:{...h}});}
  if(!ongoing)t.processedEvents.push(h.eventId);
 }
}
function hasDuty(s,o){
 if(diplomaticAssignment(s,o.unit.id))return true;
 if(o.unit.mission||o.unit.scouting)return true;
 if(isLord(s,o.unit.id,o.faction))return true;
 if(o.army&&!o.army.disbanded&&o.army.units.some(u=>u.troops+u.wounded>0))return true;
 if(o.army&&!cityPersonnel(s,o.location).some(x=>x.unit.id===o.unit.id))return false;
 if(o.destination)return false;
 return s.cities.some(c=>c.id===o.location&&c.owner===o.faction&&(c.governor===o.unit.id||s.campaign.domestic.assignments.some(a=>a.officerId===o.unit.id&&a.cityId===c.id)));
}
export function resolveTalentResignations(s,cancel){
 for(const o of servingPeople(s).values()){
  if(o.faction==='neutral'||isLord(s,o.unit.id,o.faction))continue;
  const r=record(s,o.unit.id),checked=r.lastLoyaltyRiskDay===day(s);r.lastLoyaltyRiskDay=day(s);
  const loyalty=s.campaign.domestic.loyalty[o.unit.id]??85,threshold=loyaltyWarningThreshold(s,o.unit.id,o.faction);
  if(loyalty>=threshold){if(r.loyaltyWarning){r.loyaltyWarning=false;report(s,'loyalty-restored',o.unit.id,`${o.unit.name}忠诚回升至${loyalty}，解除低忠诚提醒。`,o.faction);}continue;}
  if(!r.loyaltyWarning){r.loyaltyWarning=true;report(s,'loyalty-low',o.unit.id,`${o.unit.name}忠诚偏低（${loyalty}），可通过本城人才事务安抚。`,o.faction);}
  if(checked)continue;
  // Empty formations are not employment. Detach without deleting soldiers
  // or changing an ongoing battle or the other officers in the army.
  const a=o.army;
  const emptyArmy=a&&!a.travel&&!a.route.length&&!a.units.some(u=>u.troops+u.wounded>0)&&!s.campaign.battles.some(b=>!b.settled&&b.armyIds.includes(a.id));
  if(a&&!emptyArmy||o.destination||o.retreating||o.unit.mission||cityBesieged(s,o.location))continue;
  if(talentRandom(s)>=loyaltyResignationChance(s,o.unit.id,o.faction))continue;
  if(emptyArmy){
   a.units=a.units.filter(u=>u.id!==o.unit.id);if(!a.units.length)s.armies=s.armies.filter(x=>x!==a);else{if(!a.units.some(u=>u.id===a.leader))a.leader=a.units[0].id;if(!a.units.some(u=>u.id===a.advisor))a.advisor=a.units[0].id;}
   delete o.army;
  }
  // A person on a real mission must return before leaving service.
  if(!o.army&&!o.destination&&!o.retreating&&!o.unit.mission){
   let leaving=o;
   // Return all real troops through the shared disband operation first.
   if(o.cityUnit){if(disbandCityUnits(s,o.location,[o.unit.id],{scheduled:true,faction:o.faction}))continue;leaving=s.campaign.idle.find(x=>x.unit.id===o.unit.id);}
   if(o.unit.scouting)recallScout(s,o.unit.id,{faction:o.faction});
   if(diplomaticAssignment(s,o.unit.id))dismissDiplomat(s,o.unit.id,{scheduled:true,faction:o.faction});
   cancel(s,o.unit.id,'辞官');for(const c of s.cities)if(c.governor===o.unit.id){c.governor=null;c.domestic.approvalGovernor=null;}freeOfficer(s,leaving);
  }
 }
}
export function finishTalentDay(s,cancel,{deferResignations=false}={}){
 const t=data(s);if(t.lastDay===day(s))return;t.lastDay=day(s);
 processTalentDefeats(s,cancel);
 for(const o of servingPeople(s).values()){
  if(o.faction==='neutral')continue;const r=record(s,o.unit.id);if(r.lastDutyDay===day(s))continue;r.lastDutyDay=day(s);
  if(hasDuty(s,o)){r.workedDays++;if(r.workedDays>=30){r.idleDays=0;r.idleTurns=0;r.idlePenaltyStep=2;}}
  else {r.workedDays=0;if(day(s)>=r.graceUntilDay)r.idleDays++;}
  r.idleTurns=Math.floor(r.idleDays/10);
  if(day(s)%10||isLord(s,o.unit.id,o.faction))continue;
  const high=righteousness(o.unit.id)>=80||relation(s,o.unit.id,factionLord(s,o.faction))>=80;let loyalty=s.campaign.domestic.loyalty[o.unit.id]??85;
  const penaltyStep=Math.floor(r.idleDays/30);
  if(day(s)>=r.graceUntilDay&&!hasDuty(s,o)&&penaltyStep>r.idlePenaltyStep){loyalty=Math.max(0,loyalty-(high?2:5)*(penaltyStep-r.idlePenaltyStep));r.idlePenaltyStep=penaltyStep;}
  if(r.workedDays>=30&&day(s)%30===0&&loyalty<95)loyalty++;
  s.campaign.domestic.loyalty[o.unit.id]=loyalty;
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
 if(!deferResignations)resolveTalentResignations(s,cancel);
}
export function talentArrived(s,id){const r=record(s,id);r.graceUntilDay=day(s)+90;}
export function refreshTalentProjects(s){
 const t=data(s),context=talentContext(s);
 for(const p of Object.values(t.projects)){
  if(p.state==='CLOSED')continue;
  if(p.mode==='persuade'&&day(s)<p.nextAttemptDay){p.state='PAUSED';continue;}
  if(s.campaign.domestic.people.some(x=>x.id===p.personId)&&t.knowledge[p.factionId]?.[p.personId]?.locationConfirmed)p.mode='hire';
  // Private changes are learned when a real contact or signing is settled,
  // never by polling the rival's current loyalty or willingness each day.
  const check=p.mode==='persuade'?persuasionEligibility(s,p.personId,p.factionId,p.cityId):talentEligibility(s,p.personId,p.factionId,p.cityId,p.mode,context,{ignoreCooldown:p.progress>=projectNeed(p.personId,p.mode)});
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
export {prepareEnemyDomestic} from './ai-policy/domestic-staffing.mjs';
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
  fail(typeof r.loyaltyWarning==='boolean'&&int(r.lastLoyaltyRiskDay,day(s))&&!Object.hasOwn(r,'leaveAtDay'));fail(r.voluntaryFaction===null||factions.has(r.voluntaryFaction));fail(r.meritFaction===null||factions.has(r.meritFaction));fail(map(r.rejoinBlocks)&&Object.entries(r.rejoinBlocks).every(([f,n])=>factions.has(f)&&int(n))&&Array.isArray(r.defeatHistory));
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
