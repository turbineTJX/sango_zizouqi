import {economicStaffingError} from './economy.mjs';
import {PROGRESSION} from './progression.mjs';
import {settleOfficerMerit,transportMerit} from './campaign-merit.mjs';
import {cityBudget} from './city-budget.mjs';
import {DIPLOMACY_RULES as R,DIPLOMACY_AI as AI,DIPLOMACY_WORK as WORK,DIPLOMACY_DIRECTIONS as DIRECTIONS,DIPLOMACY_GOALS as GOALS,DIPLOMACY_ACTIONS as ACTIONS} from './data/design/diplomacy-rules.mjs';
import {diplomaticAssignment,diplomaticPair,diplomaticClauses,activeDiplomaticClause,factionsHostile,diplomaticProtection,diplomaticPassage,militaryAidRestricted,diplomaticAssetReserve} from './diplomacy-relations.mjs';
import {FACTIONS} from './engine.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {playerFaction,isAIControlled,isPlayerControlled} from './player-faction.mjs';
import {servingPeople,factionLord,addCityGold} from './talent-core.mjs';
import {mapNode,mapNodes,isJunction} from './road-network.mjs';
import {roadCost} from './road-metrics.mjs';
import {residentOfficer,cityPersonnel} from './city-personnel.mjs';
import {assignmentFor,cancelDomestic,pendingDomesticOrder,cityFoodReserve,grainCapacity,reservedMen,reconcileDomestic} from './domestic.mjs';
import {plannedOfficer,plannedGrain,plannedCargo} from './strategic-intent.mjs';
import {launchExpedition,orderCampaignArmy,transferOfficer,armyBattle,settleDiplomaticCeasefire,roadLength} from './strategic-campaign.mjs';
import {releaseCaptive,ransomCost,resolveOfficerLoss} from './officer-fates.mjs';
import {transportEnemy} from './personnel-movement.mjs';
import {appendActivityNode} from './activity-nodes.mjs';
import {recordOfficerActivities} from './officer-activity.mjs';
import {requestFactionOrder} from './strategic-orders.mjs';
import {DIRECTIONS as DOMESTIC_DIRECTIONS} from './domestic-designs.mjs';
import {factionStrategicProfile,strategicTravelDays} from './strategic-ai.mjs';
import {cityForce} from './city-units.mjs';
import {diplomaticRetreat} from './strategic-retreat.mjs';
import {intelligenceWorld,cityIntelligence} from './strategic-vision.mjs';
import {STRATEGIC_PLANNING_RULES as PLANNING} from './data/design/strategic-planning-rules.mjs';

const copy=structuredClone,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),town=mapNode;
const roadAdjacency=new WeakMap();let routeSession=null;
export function initializeDiplomacy(s){
 const factions=[...new Set(s.cities.map(c=>c.owner))].filter(f=>f!=='neutral');
 const wars={};for(let i=0;i<factions.length;i++)for(let j=i+1;j<factions.length;j++)wars[diplomaticPair(factions[i],factions[j])]={active:true,day:1};
 s.campaign.diplomacy={version:R.version,nextId:1,lastDay:0,lastAIReview:0,contacts:Object.fromEntries(factions.map(f=>[f,lordCity(s,f)?.id||s.cities.find(c=>c.owner===f).id])),assignments:[],orders:[],proposals:[],contracts:[],wars,relations:{},credit:{},policies:Object.fromEntries(factions.map(f=>[f,{goal:'auto',target:null,goldReserve:R.goldReserve,grainReserve:R.grainReserve,manpowerReserve:R.manpowerReserve,feeBudget:R.feeBudget,fees:0,feeTurn:0}]))};
}
const factions=s=>Object.keys(s.campaign.diplomacy.policies).filter(f=>s.cities.some(c=>c.owner===f));
export function lordCity(s,faction){const id=factionLord(s,faction),o=servingPeople(s).get(id);return o&&!o.army&&!o.destination&&!o.unit.mission?s.cities.find(c=>c.id===o.location&&c.owner===faction):null;}
export function diplomaticResources(s,faction,cityId=null,excludeDiplomacyId=null){const c=cityId?town(s,cityId):lordCity(s,faction),p=s.campaign.diplomacy.policies[faction];return {city:c?.owner===faction?c:null,gold:c?.owner===faction?Math.max(0,c.gold-Math.max(c.budget.goldReserve,p?.goldReserve||0)-diplomaticAssetReserve(s,faction,'gold',c.id,excludeDiplomacyId)):0,grain:c?.owner===faction?Math.max(0,Math.floor(c.grain-Math.max(p.grainReserve,cityFoodReserve(s,c,20))-plannedGrain(s,c.id,{excludeDiplomacyId}))):0,manpower:c?.owner===faction?Math.max(0,Math.floor(c.manpower-reservedMen(c)-p.manpowerReserve-plannedCargo(s,c.id,'manpower',{excludeDiplomacyId}))):0};}
export function setDiplomaticBudget(s,values,{faction=playerFaction(s),scheduled=false}={}){if(s.finished||!scheduled&&(s.campaign.allAI||s.campaign.phase!=='planning')||!s.campaign.diplomacy.policies[faction])return '须在筹划阶段调整预算';const limits={feeBudget:10000,goldReserve:1000000,grainReserve:100000,manpowerReserve:30000};if(!values||Object.keys(values).some(k=>!Object.hasOwn(limits,k)||!Number.isSafeInteger(values[k])||values[k]<0||values[k]>limits[k]))return '外交预算无效';Object.assign(s.campaign.diplomacy.policies[faction],values);return null;}
export function diplomaticRoute(s,from,to,faction,other,kind='envoy',contractId=null){
 const key=[from,to,faction,other,kind,contractId,s===routeSession?.state?'actual':'observed',s.campaign.playerFaction].join('|'),cache=routeSession&&routeSession.state.roads===s.roads?routeSession.cache:null;if(cache?.has(key)){const path=cache.get(key);return path?[...path]:null;}
 const nodes=new Map(mapNodes(s).map(n=>[n.id,n]));let adjacency=roadAdjacency.get(s.roads);if(!adjacency){adjacency=new Map([...nodes.keys()].map(id=>[id,[]]));for(const [a,b]of s.roads){adjacency.get(a).push(b);adjacency.get(b).push(a);}roadAdjacency.set(s.roads,adjacency);}
 const queue=[{id:from,cost:0,path:[]}],seen=new Set(),distance=new Map([[from,0]]);let answer=null;
 while(queue.length){queue.sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id));const current=queue.shift(),id=current.id;if(seen.has(id))continue;seen.add(id);if(id===to){answer=current.path;break;}
  for(const next of adjacency.get(id)||[]){if(seen.has(next))continue;const n=nodes.get(next),owned=!n.owner||['neutral',faction].includes(n.owner),visitor=n.owner===other;
   if(!owned&&!visitor&&!(kind==='military'&&next===to&&factionsHostile(s,faction,n.owner))&&!diplomaticPassage(s,faction,next,kind,contractId))continue;
   if(s.campaign.battles.some(r=>!r.settled&&r.cityId===next))continue;
   if(s.armies.some(a=>!a.disbanded&&!a.travel&&a.location===next&&a.units.some(u=>u.troops>0)&&![faction,other].includes(a.faction)&&factionsHostile(s,faction,a.faction)))continue;
   const cost=current.cost+roadCost(s,id,next);if(cost<(distance.get(next)??Infinity)){distance.set(next,cost);queue.push({id:next,cost,path:[...current.path,next]});}
  }
 }if(cache)cache.set(key,answer);return answer?[...answer]:null;
}
const routeDays=(s,from,path,speed=R.lightSpeed)=>{let cost=0;for(const to of path){cost+=roadCost(s,from,to);from=to;}return Math.ceil(cost/speed);};
function emit(s,p,phase,text,{faction=p.factions[0],cityId=p.sites?.[faction]||null,officerId=p.officerId,siteId=undefined,result={}}={}){
 if(siteId===undefined){const actor=officerId&&servingPeople(s).get(officerId);siteId=actor?.unit.mission?.location||actor?.location||cityId;}
 return appendActivityNode(s,{sourceId:`diplomacy:${p.id}:${phase}:${faction}:${p.version}:${result.clauseId||''}`,category:'diplomacy',phase,faction,cityId,siteId,officerId,officerIds:result.officerIds||[],text,result:{proposalId:p.id,version:p.version,...result}});
}
export function setDiplomaticGoal(s,goal,target=null,{faction=playerFaction(s),scheduled=false}={}){if(!GOALS[goal]||!s.campaign.diplomacy.policies[faction]||target&&(target===faction||!factions(s).includes(target)))return '外交目标无效';if(s.finished||!scheduled&&(s.campaign.allAI||s.campaign.phase!=='planning'))return '须在筹划阶段调整方向';Object.assign(s.campaign.diplomacy.policies[faction],{goal,target});return null;}
export function diplomaticOfficerCandidates(s,faction,direction){
 const def=DIRECTIONS[direction];if(!def)return [];
 return [...servingPeople(s).values()].filter(o=>o.faction===faction&&!o.army&&!o.destination&&!o.unit.mission&&!o.unit.scouting&&o.unit.id!==factionLord(s,faction)&&!s.cities.some(c=>c.governor===o.unit.id)&&!pendingDomesticOrder(s,o.unit.id)&&!plannedOfficer(s,o.unit.id)).map(o=>({...o,score:o.unit[def.stat]-(assignmentFor(s,o.unit.id)?.action?AI.activeWorkCost:assignmentFor(s,o.unit.id)?AI.occupationCost:0),work:assignmentFor(s,o.unit.id)})).sort((a,b)=>b.score-a.score||a.unit.id.localeCompare(b.unit.id));
}
export function assignDiplomat(s,officerId,direction,{faction=playerFaction(s),choice=null,scheduled=false}={}){
 if(choice!==null&&!['now','after'].includes(choice))return {error:'执行时机无效'};
 if(!scheduled&&s.campaign.phase!=='planning')return {error:'须在筹划阶段委任'};
 const o=diplomaticOfficerCandidates(s,faction,direction).find(o=>o.unit.id===officerId);if(!o)return {error:'请选择实际驻城、没有军团任务的武将'};
 if(o.work?.action&&choice===null)return {confirmation:{officerId,direction,name:o.unit.name,work:o.work.action.key}};
 const d=s.campaign.diplomacy;let a=diplomaticAssignment(s,officerId);
 if(a?.projectId)return {error:'已有外交项目，须先完成或召回'};
 const wait=choice==='after'&&o.work?.action?o.work.action.id:null;
 if(!wait)cancelDomestic(s,officerId,'改任外交');
 if(!a){a={id:d.nextId++,officerId,faction,direction,homeCity:o.location,projectId:null,waiting:'等待评估',nextDay:s.campaign.day,waitAction:wait,waitChoice:choice||'after'};d.assignments.push(a);}else Object.assign(a,{direction,waitAction:wait,nextDay:s.campaign.day});
 emit(s,{id:`appointment-${a.id}`,version:1,factions:[faction],sites:{[faction]:o.location},officerId},'appointment',`${o.unit.name}负责${DIRECTIONS[direction].name}${wait?'，完成当前事务后赴任':''}。`);recordOfficerActivities(s);return {applied:true};
}
export function dismissDiplomat(s,officerId,{faction=playerFaction(s),scheduled=false}={}){const a=diplomaticAssignment(s,officerId);if(s.finished||!a||a.faction!==faction||!scheduled&&(s.campaign.allAI||s.campaign.phase!=='planning'))return '当前不能解除外交委任';const u=servingPeople(s).get(officerId)?.unit;if(u?.mission){u.mission.cancelled=true;beginReturn(s,u);a.dismissed=true;}else s.campaign.diplomacy.assignments=s.campaign.diplomacy.assignments.filter(x=>x!==a);return null;}
export function clearDiplomaticAppointments(s,ids){if(s.campaign?.diplomacy)s.campaign.diplomacy.assignments=s.campaign.diplomacy.assignments.filter(a=>!ids.includes(a.officerId)||servingPeople(s).get(a.officerId)?.unit.mission?.type==='diplomacy');}
export function cancelDiplomaticOrder(s,id,{faction=playerFaction(s),scheduled=false}={}){const d=s.campaign.diplomacy,q=d.orders.find(q=>q.id===id&&q.faction===faction);if(s.finished||!scheduled&&(s.campaign.allAI||s.campaign.phase!=='planning')||!q)return '当前不能取消此安排';d.orders=d.orders.filter(x=>x!==q);emit(s,{id:`order-${q.id}`,version:1,factions:[q.faction],sites:{},officerId:q.officerIds[0]},'order-cancel','取消外交后的待执行安排。');return null;}
export function requestDiplomaticInterruption(s,faction,command,choice){
 const d=s.campaign.diplomacy;if(!d)return null;
 const ids=command.officerIds||s.armies.find(a=>a.id===command.armyId)?.units.map(u=>u.id)||[],people=servingPeople(s),busy=ids.filter(id=>people.get(id)?.unit.mission?.type==='diplomacy'||diplomaticAssignment(s,id)?.projectId);
 if(!busy.length)return null;
 if(s.finished||!['assign','march','expedition','transfer','dismiss'].includes(command.kind)||ids.some(id=>!people.get(id)||people.get(id).faction!==faction)||command.cityId&&town(s,command.cityId)?.owner!==faction)return {error:'只能安排己方实际在职武将'};
 if(command.kind==='assign'&&!DOMESTIC_DIRECTIONS[command.direction])return {error:'内政方向无效'};
 if(command.kind==='transfer'&&(ids.length!==1||town(s,command.target)?.owner!==faction))return {error:'调任目标无效'};
 const work=busy.map(id=>{const u=people.get(id)?.unit,m=u?.mission,a=diplomaticAssignment(s,id);return {officerId:id,name:u?.name||OFFICER_BY_ID[id].name,title:'外交'+(m?.phase==='return'?'返程':'事务'),remaining:m?.route?.length?routeDays(s,m.location,m.route):1,paused:false,cost:0,actionId:a?.projectId||m?.projectId};});
 if(choice===null)return {confirmation:{command:{...copy(command),faction},work,replacing:d.orders.filter(q=>q.officerIds.some(id=>ids.includes(id))).map(q=>({...q.command,id:q.id}))}};
 if(!['now','after'].includes(choice))return {error:'执行时机无效'};
 d.orders=d.orders.filter(q=>!q.officerIds.some(id=>ids.includes(id)));const q={id:d.nextId++,faction,command:copy(command),officerIds:[...ids],choice,requestedDay:s.campaign.day};d.orders.push(q);
 if(choice==='now')for(const id of busy){const u=people.get(id)?.unit,m=u?.mission,p=d.proposals.find(p=>p.id===(m?.projectId||diplomaticAssignment(s,id)?.projectId));if(p){p.status='cancelled';emit(s,p,'cancelled','收到立即执行的新安排，未签外交方案中止。');}if(m){m.cancelled=true;beginReturn(s,u);}}
 recordOfficerActivities(s);return {queued:true};
}
function resolveDiplomaticOrders(s){const d=s.campaign.diplomacy,people=servingPeople(s);for(const q of [...d.orders]){
 const missing=q.officerIds.some(id=>!people.get(id));if(!missing&&q.officerIds.some(id=>people.get(id).unit.mission?.type==='diplomacy'))continue;
 d.orders=d.orders.filter(x=>x!==q);if(!missing)d.assignments=d.assignments.filter(a=>!q.officerIds.includes(a.officerId));
 const result=missing?{error:'执行武将已不在职'}:requestFactionOrder(s,q.faction,q.command,q.choice,true),text=result.error?'外交后续命令取消：'+result.error:'已实际返城，执行已保存的新安排。';
 emit(s,{id:`order-${q.id}`,version:1,factions:[q.faction],sites:{},officerId:q.officerIds[0]},result.error?'order-cancel':'order-done',text,{faction:q.faction});
 }}
function context(s,f,observer=f){
 const view=intelligenceWorld(s,observer),known=observer===f?lordCity(s,f):view.cities.find(c=>c.owner===f&&c.units.some(u=>u.id===factionLord(s,f))),seat=s.campaign.diplomacy.contacts[f],contact=view.cities.find(c=>c.id===seat&&c.owner===f),c=known||contact;
 // Foreign reserves and internal commitments are private, even when its city
 // stocks have been observed. Offers use observed inventory; signing rechecks
 // the actual participants' resources through the common contract rules.
 const unknown=!!c&&!cityIntelligence(s,c.id,observer).data;
 // Unknown quantities are bounded requests to negotiate, never claims that
 // inventory exists. Only an actual meeting can validate the foreign offer.
 const r=observer===f?diplomaticResources(s,f):{city:c,gold:c?(unknown?R.loanAmount:Math.max(0,c.gold-R.goldReserve)):0,grain:c?(unknown?R.grainBatch:Math.max(0,c.grain-R.grainReserve)):0,manpower:c?(unknown?R.manpowerReserve:Math.max(0,c.manpower-R.manpowerReserve)):0};
 const cities=view.cities.filter(c=>c.owner===f),own=[...cities.flatMap(c=>c.units),...view.armies.filter(a=>a.faction===f&&!a.disbanded).flatMap(a=>a.units)];
 const threats=view.armies.filter(a=>a.faction!==f&&!a.disbanded&&factionsHostile(s,f,a.faction)&&cities.some(c=>a.travel?.to===c.id||a.location===c.id||view.roads.some(([x,y])=>x===c.id&&y===(a.travel?.to||a.location)||y===c.id&&x===(a.travel?.to||a.location))));
 return {...r,faction:f,cities,militaryComplete:observer===f||cities.every(c=>!!cityIntelligence(s,c.id,observer).data),power:own.reduce((n,u)=>n+u.troops,0),pressure:threats.reduce((n,a)=>n+a.units.reduce((t,u)=>t+u.troops,0),0),threats,shortGrain:r.city?Math.max(0,Math.max(R.grainReserve,cityFoodReserve(view,r.city,30))+(observer===f?plannedGrain(s,r.city.id):0)-r.city.grain):0};
}
const leg=(kind,from,to,details={})=>({kind,from,to,...details});
function mutual(kind,a,b,duration){return [leg(kind,a,b,{duration}),leg(kind,b,a,{duration})];}
function deployOptions(s,f,enemy,recipient,defendCity=null){
 if(militaryAidRestricted(s,f,recipient))return [];
 const options=[];for(const c of s.cities.filter(c=>c.owner===f)){
  const own=f===s.campaign.playerFaction,units=c.units.filter(u=>u.troops>0&&(!own||!u.mission&&!diplomaticAssignment(s,u.id)&&!assignmentFor(s,u.id)?.action&&!pendingDomesticOrder(s,u.id)&&!plannedOfficer(s,u.id))&&u.id!==factionLord(s,f));
  // Retain a real defender and never advertise more than one legal army.
  const usable=units.sort((a,b)=>b.leadership-a.leadership||a.id.localeCompare(b.id)).slice(0,Math.min(4,units.length-1));if(!usable.length||c.grain<usable.length*900+cityFoodReserve(s,c))continue;
  const target=(defendCity?[defendCity]:s.cities.filter(t=>t.owner===enemy)).map(t=>({t,path:diplomaticRoute(s,c.id,t.id,f,recipient,'military')})).filter(x=>x.path).sort((a,b)=>routeDays(s,c.id,a.path)-routeDays(s,c.id,b.path)||a.t.id.localeCompare(b.t.id))[0];if(!target)continue;
  const days=strategicTravelDays(s,{...cityForce(c),units:usable,leader:usable[0].id},target.path);if(days*2+R.militaryServiceDays+R.militaryGraceDays>R.maximumDuration)continue;
  options.push({cityId:c.id,targetId:target.t.id,enemy,officerIds:usable.map(u=>u.id),troops:usable.reduce((n,u)=>n+u.troops,0),days,route:target.path,task:defendCity?'defend':'attack'});
 }return options.sort((a,b)=>a.days-b.days||b.troops-a.troops);
}
export function diplomaticCandidates(s,a){
 const view=intelligenceWorld(s,a.faction),strategy=s.campaign.ai?.factions[a.faction]?.strategy;
 const f=a.faction,ours=context(s,f),policy=s.campaign.diplomacy.policies[f],domain=a.direction==='commerce'?['buyGrain','sellGrain','manpower','trade','funding']:a.direction==='friendship'?['friendship','intelligence']:['renew','prisoners','peace','alliance','aid','border','withdraw','terminate'],goals=domain.includes(policy.goal)?[policy.goal]:domain,options=[];
 if(!ours.city)return options;
 for(const other of factions(view).filter(t=>t!==f&&(!policy.target||policy.target===t))){const theirs=context(s,other,f);if(!theirs.city)continue;const path=diplomaticRoute(view,a.homeCity,theirs.city.id,f,other);if(!path)continue;
  if(s.campaign.diplomacy.proposals.some(p=>p.factions.includes(f)&&p.factions.includes(other)&&['outbound','negotiating','pending','approved'].includes(p.status)))continue;
  for(const goal of goals){let clauses=[],priority=0;const grain=Math.floor(Math.min(R.grainBatch,goal==='buyGrain'?theirs.grain:ours.grain,goal==='buyGrain'?grainCapacity(ours.city)-ours.city.grain:grainCapacity(theirs.city)-theirs.city.grain)/100)*100;
   if(goal==='buyGrain'&&grain>=500&&(policy.goal!=='auto'||ours.shortGrain>0)){const gold=Math.ceil(grain*R.grainPrice);if(ours.gold>=gold){clauses=[leg('gold',f,other,{amount:gold}),leg('grain',other,f,{amount:grain})];priority=30+ours.shortGrain/100;}}
   if(goal==='sellGrain'&&grain>=500&&(policy.goal!=='auto'||ours.gold<R.goldReserve*2||theirs.shortGrain>0)){const gold=Math.ceil(grain*R.grainPrice);if(theirs.gold>=gold){clauses=[leg('grain',f,other,{amount:grain}),leg('gold',other,f,{amount:gold})];priority=30+(theirs.shortGrain>0?15:0);}}
   if(goal==='manpower'&&theirs.manpower>=1000&&ours.gold>=300&&(policy.goal!=='auto'||ours.manpower<1500)){clauses=[leg('gold',f,other,{amount:300}),leg('manpower',other,f,{amount:1000})];priority=35;}
   if(goal==='friendship'&&ours.gold>=R.gift&&(s.campaign.diplomacy.relations[diplomaticPair(f,other)]||0)<95&&!s.campaign.diplomacy.contracts.some(p=>p.goal==='friendship'&&p.factions[0]===f&&p.factions.includes(other)&&s.campaign.day-p.signedDay<R.giftCooldown)){clauses=[leg('gold',f,other,{amount:R.gift,gift:true})];priority=25-(s.campaign.diplomacy.relations[diplomaticPair(f,other)]||0)/10;}
   if(goal==='prisoners'){const captive=s.campaign.domestic.people.find(p=>p.status==='CAPTIVE'&&p.fate?.originalFaction===f&&p.fate.captor===other&&!p.diplomaticLock);if(captive){const counterpart=s.campaign.domestic.people.find(p=>p.status==='CAPTIVE'&&p.fate?.originalFaction===other&&p.fate.captor===f&&!p.diplomaticLock);clauses=[leg('prisoner',other,f,{officerId:captive.id})];if(counterpart)clauses.push(leg('prisoner',f,other,{officerId:counterpart.id}));else if(ours.gold>=ransomCost(captive))clauses.push(leg('gold',f,other,{amount:ransomCost(captive)}));else clauses=[];priority=70;}}
   if(goal==='peace'&&factionsHostile(s,f,other)&&(policy.goal!=='auto'||ours.pressure>ours.power*.3)){clauses=[leg('peace',f,other,{duration:30}),...mutual('nonaggression',f,other,30)];if(ours.power<theirs.power&&ours.gold>=300)clauses.push(leg('gold',f,other,{amount:300}));priority=50+ours.pressure/Math.max(1,ours.power)*25;}
   if(goal==='trade'&&!factionsHostile(s,f,other)&&!diplomaticClauses(s).some(({p,c})=>c.kind==='trade'&&p.factions.includes(f)&&p.factions.includes(other)&&activeDiplomaticClause(s,p,c))){clauses=[leg('trade',f,other,{duration:90,resource:'grain',quota:R.grainBatch*3,unitPrice:R.grainPrice}),...mutual('tradePass',f,other,90)];priority=20;}
   if(goal==='funding'&&theirs.gold>=R.loanAmount&&(policy.goal==='funding'||ours.gold<R.loanAmount)&&!s.campaign.diplomacy.contracts.some(p=>p.factions.includes(f)&&p.clauses.some(c=>c.kind==='gold'&&c.from===f&&c.deferred&&c.status==='waiting'))){clauses=[leg('gold',other,f,{amount:R.loanAmount}),leg('gold',f,other,{amount:Math.ceil(R.loanAmount*(1+R.loanFee)),deferred:true,dueOffset:R.loanDays})];priority=35;}
   if(goal==='intelligence'&&(policy.goal==='intelligence'||!factionsHostile(s,f,other))){const info=owner=>view.campaign.activity.nodes.filter(n=>n.faction===owner&&['battle','occupation'].includes(n.category)&&n.day>=s.campaign.day-30).slice(-3).map(n=>({nodeId:n.id,day:n.day,text:n.text}));const own=info(f),foreign=info(other);if(own.length&&foreign.length){clauses=[leg('intelligence',f,other,{information:own}),leg('intelligence',other,f,{information:foreign})];priority=20;}}
   if(goal==='renew'){const old=s.campaign.diplomacy.contracts.find(p=>p.status==='signed'&&p.factions.includes(f)&&p.factions.includes(other)&&p.clauses.some(c=>['nonaggression','alliance','trade'].includes(c.kind)&&c.status==='active'&&c.untilDay-s.campaign.day<=R.renewalLeadDays+routeDays(s,a.homeCity,path)));if(old){clauses=old.clauses.filter(c=>['peace','nonaggression','alliance','trade','envoyPass','tradePass','militaryPass','station','restrictAid'].includes(c.kind)&&c.status==='active').map(c=>{const {id,after,...approved}=JSON.parse(old.signedTerms).clauses.find(x=>x.id===c.id);return {...approved,startDay:Math.max(s.campaign.day+1,c.untilDay+1),renews:old.id};});priority=65;}}
   if(goal==='terminate'&&policy.goal==='terminate'){const old=s.campaign.diplomacy.contracts.find(p=>p.status==='signed'&&p.factions.includes(f)&&p.factions.includes(other));if(old){clauses=[leg('terminate',f,other,{contractId:old.id})];priority=30;}}
   if(goal==='withdraw'&&policy.goal==='withdraw'){const foreign=view.armies.find(a=>a.faction===other&&!a.travel&&ours.cities.some(c=>c.id===a.location)&&!armyBattle(view,a.id)),home=foreign&&theirs.cities.map(c=>({c,path:diplomaticRoute(view,foreign.location,c.id,other,f,'military')})).find(x=>x.path);if(home){clauses=[leg('withdraw',other,f,{armyId:foreign.id,targetId:home.c.id,deadline:s.campaign.day+strategicTravelDays(view,foreign,home.path)+30}),leg('militaryPass',f,other,{route:[foreign.location,...home.path],duration:60,armyIds:[foreign.id]})];priority=40;}}
   const enemy=[...new Set(ours.threats.map(a=>a.faction))].find(e=>e!==other&&factionsHostile(s,other,e));
   if(['alliance','aid'].includes(goal)&&(enemy||policy.goal!=='auto')){const foe=enemy||factions(view).find(e=>![f,other].includes(e)&&factionsHostile(s,f,e)&&factionsHostile(s,other,e));if(foe){const defend=goal==='aid'&&ours.threats.length?ours.cities.find(c=>ours.threats.some(a=>a.travel?.to===c.id||a.location===c.id)):null,force=deployOptions(view,other,foe,f,defend)[0];if(force){const permissionDays=Math.max(R.militaryBaseDuration,force.days*2+R.militaryServiceDays+R.militaryGraceDays);clauses=[...mutual('nonaggression',f,other,permissionDays),leg('militaryPass',f,other,{route:force.route,duration:permissionDays,officerIds:force.officerIds,troopCap:force.troops}),leg('deploy',other,f,{...force,deadline:s.campaign.day+routeDays(s,a.homeCity,path)+WORK.military.days+force.days+R.militaryGraceDays,duration:R.militaryServiceDays}),leg('restrictAid',other,f,{enemy:foe,duration:permissionDays})];if(defend)clauses.push(leg('station',f,other,{cityId:defend.id,officerIds:force.officerIds,troopCap:force.troops,duration:permissionDays}));else clauses.push(leg('spoils',other,f,{enemy:foe,cityId:force.targetId}));if(factionsHostile(s,f,other))clauses.unshift(leg('peace',f,other,{duration:90}));if(!factionsHostile(s,other,foe))clauses.push(leg('declare',other,f,{enemy:foe}));if(goal==='alliance')clauses.push(leg('alliance',f,other,{duration:180,enemy:foe}));if(ours.gold>=500)clauses.push(leg('gold',f,other,{amount:500,milestone:'arrival'}));if(ours.grain>=2000&&grainCapacity(theirs.city)-theirs.city.grain>=2000)clauses.push(leg('grain',f,other,{amount:2000}));priority=45+ours.pressure/Math.max(1,ours.power)*20;}}}
   if(goal==='border'&&policy.goal!=='auto'){const c=ours.cities.filter(c=>c!==ours.city&&!c.units.some(u=>u.mission)).sort((a,b)=>a.commerce-b.commerce||a.id.localeCompare(b.id))[0],t=theirs.cities.filter(c=>c!==theirs.city).sort((a,b)=>a.commerce-b.commerce||a.id.localeCompare(b.id))[0];if(c&&t){clauses=[leg('city',f,other,{cityId:c.id}),leg('city',other,f,{cityId:t.id}),leg('peace',f,other,{duration:30})];priority=30;}}
   if(!clauses.length)continue;
   const deployment=clauses.find(c=>c.kind==='deploy');if(deployment){for(const c of clauses)if(['gold','grain'].includes(c.kind))c.aid=true;const available=ours.grain-clauses.filter(c=>c.kind==='grain'&&c.from===f).reduce((n,c)=>n+c.amount,0);if(deployment.task==='defend'&&deployment.targetId===ours.city.id&&available>=1000)clauses.push(leg('supply',f,other,{amount:1000,deploymentId:'proposed',duration:60}));}
   const preference=isAIControlled(s,f)&&strategy?.neighbors[other]?.mode==='peace'&&['peace','renew'].includes(goal)?PLANNING.peacePriority:0;
   const score=priority+preference-routeDays(s,a.homeCity,path)*AI.routeDayCost;options.push({goal,other,clauses,path,targetCity:theirs.city.id,priority,score,reason:GOALS[goal]});
  }
 }return options.sort((a,b)=>b.score-a.score||a.other.localeCompare(b.other)||a.goal.localeCompare(b.goal));
}

export function evaluateDiplomaticProposal(s,p,faction){
 const x=context(s,faction),other=p.factions.find(f=>f!==faction),y=context(s,other,faction),view=intelligenceWorld(s,faction);let benefit=0,cost=0;const reasons=[];
 const profile=factionStrategicProfile(s,faction),grainValue=R.grainPrice*clamp((x.shortGrain+R.grainReserve)/Math.max(R.grainReserve,x.grain),AI.grainLowValue,AI.grainHighValue),goldValue=x.gold<AI.scarceGoldThreshold?AI.scarceGoldValue:1;
 for(const c of p.clauses){const incoming=c.to===faction,outgoing=c.from===faction;if(!incoming&&!outgoing)continue;let value=0;
  if(c.kind==='gold')value=c.amount*(c.deferred?1:goldValue)*(c.deferred&&incoming?1/(1+c.dueOffset/AI.loanDiscountDays):1);
  if(c.kind==='grain')value=c.amount*grainValue;
  if(c.kind==='manpower')value=c.amount*R.manpowerPrice*(x.manpower<1500?1.5:.8);
  if(c.kind==='city'){const t=town(view,c.cityId);value=2500+(t.commerce||0)*500+(t.farm||0)*300+(t.walls||0)*200+(t.id===x.city?.id?3000:0);}
  if(c.kind==='prisoner'){const prisoner=s.campaign.domestic.people.find(t=>t.id===c.officerId);value=prisoner?ransomCost(prisoner)*(incoming?1.4:1):0;}
  if(c.kind==='intelligence')value=Math.min(200,(c.information?.length||0)*30);
  if(['gold','grain','manpower','city','prisoner','intelligence'].includes(c.kind)){if(incoming)benefit+=value;if(outgoing)cost+=value;continue;}
  if(['peace','nonaggression'].includes(c.kind)){benefit+=(AI.peaceBaseValue+x.pressure/Math.max(1,x.power)*AI.pressurePeaceValue)*(profile.style==='cautious'?AI.cautiousPeaceWeight:profile.style==='bold'?AI.boldPeaceWeight:1);if(y.militaryComplete&&x.power>y.power*AI.superiorityRatio&&x.pressure===0)cost+=AI.peaceOpportunityCost;}
  if(c.kind==='alliance')benefit+=c.enemy&&factionsHostile(s,faction,c.enemy)?AI.allianceEnemyValue:AI.allianceOtherValue;
  if(c.kind==='trade')benefit+=80;
  if(c.kind==='deploy'){if(incoming)benefit+=c.troops*AI.aidValuePerTroop;if(outgoing){cost+=c.troops*AI.aidCostPerTroop+c.days*AI.aidDayCost;benefit+=factionsHostile(s,faction,c.enemy)?c.troops*AI.sharedEnemyPerTroop:0;}}
  if(c.kind==='declare'&&outgoing)cost+=200;
  if(c.kind==='restrictAid'&&outgoing)cost+=120;
 }
 if(p.goal==='friendship'&&p.factions[0]===faction)benefit+=R.gift*AI.giftBenefit*goldValue;
 const credit=s.campaign.diplomacy.credit[other]??100;let hash=2166136261;for(const ch of `${profile.lordId}:${p.goal}:${other}`)hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;
 const uncertainty=(hash/4294967295*2-1)*(1-profile.judgment/100)*AI.judgmentError,score=Math.round(benefit*(1+uncertainty)*clamp(credit/100,AI.creditFloor,1)-cost);
 reasons.push(x.shortGrain>0?'君主城口粮不足':x.pressure>0?'边境存在实际敌军压力':'维持资源与合作条件');
 return {score,benefit:Math.round(benefit),cost:Math.round(cost),reason:reasons.join('；'),style:profile.style,judgment:profile.judgment,approve:score>=R.aiMinimumScore};
}
const terms=p=>JSON.stringify({version:p.version,sites:p.sites,clauses:p.clauses});
function closePendingReports(s,p){for(const n of s.campaign.activity.nodes)if(n.category==='diplomacy'&&n.phase==='pending'&&n.result.proposalId===p.id&&n.faction===playerFaction(s))n.read=true;}
function clauseError(s,p,{signing=false,inherited=false,requester=null}={}){
 if(!Array.isArray(p.clauses)||!p.clauses.length||p.clauses.length>60)return '外交条款无效';
 const view=requester?intelligenceWorld(s,requester):s,sums={},objects=new Set();for(const f of p.factions){const c=inherited||requester&&f!==requester?town(s,p.sites[f]):lordCity(s,f);if(!c||(!requester||f===requester)&&(c.owner!==f||c.id!==p.sites[f]))return '君主驻城已变化，需要重新交涉';sums[f]={gold:0,grain:0,manpower:0};}
 for(const c of p.clauses){const foreign=requester&&c.from!==requester,world=foreign?view:s;if(!ACTIONS[c.kind]||!p.factions.includes(c.from)||!p.factions.includes(c.to)||c.from===c.to)return '条款对象无效';
  if(['gold','grain','manpower','supply'].includes(c.kind)){if(!Number.isSafeInteger(c.amount)||c.amount<=0)return '交易数量无效';if(!c.deferred)sums[c.from][c.kind==='supply'?'grain':c.kind]+=c.amount;if(c.deferred&&(c.kind!=='gold'||!Number.isSafeInteger(c.dueOffset)||c.dueOffset<10||c.dueOffset>360))return '分期付款期限无效';if((c.aid||c.kind==='supply')&&militaryAidRestricted(s,c.from,c.to))return '已有不援助承诺限制这笔军事支持';}
  if(c.duration!==undefined&&(!Number.isSafeInteger(c.duration)||c.duration<1||c.duration>R.maximumDuration))return '条约期限无效';
  if(c.kind==='city'){const t=town(world,c.cityId);if(!t||isJunction(world,t.id)||t.owner!==c.from||world.campaign.battles.some(r=>!r.settled&&r.cityId===t.id))return '城市归属或安全条件已变化';if(objects.has('city:'+t.id))return '同一城市不能重复交付';objects.add('city:'+t.id);if(!foreign&&s.campaign.diplomacy.contracts.some(q=>q.status==='signed'&&q.clauses.some(x=>x.kind==='city'&&x.cityId===t.id&&x.status==='waiting')))return '城池已被另一份契约预留';}
  if(c.kind==='prisoner'){const t=world.campaign.domestic.people.find(t=>t.id===c.officerId);if(!t||t.status!=='CAPTIVE'||t.fate?.captor!==c.from||t.fate.originalFaction!==c.to||!foreign&&t.diplomaticLock&&t.diplomaticLock!==p.id)return '俘虏拘押权已变化';if(objects.has('person:'+t.id))return '同一俘虏不能重复交付';objects.add('person:'+t.id);}
  if(c.kind==='deploy'){const t=town(world,c.cityId),units=c.officerIds?.map(id=>t?.units.find(u=>u.id===id));
   const shape=t&&Array.isArray(c.officerIds)&&c.officerIds.length>0&&c.officerIds.length<=10&&new Set(c.officerIds).size===c.officerIds.length&&c.officerIds.every(id=>OFFICER_BY_ID[id])&&Number.isSafeInteger(c.troops)&&c.troops>0&&town(s,c.targetId)&&FACTIONS[c.enemy]&&Number.isSafeInteger(c.deadline)&&c.deadline>s.campaign.day;
   if(!shape||!foreign&&(t.owner!==c.from||units.some(u=>!u||u.mission||u.scouting||assignmentFor(s,u.id)?.action||pendingDomesticOrder(s,u.id)||plannedOfficer(s,u.id,{excludeDiplomacyId:p.id}))||units.reduce((n,u)=>n+u.troops,0)<c.troops||t.grain<units.length*900+cityFoodReserve(s,t)))return '援军编制、兵粮或到达期限不可履行';
   for(const id of c.officerIds){if(objects.has('person:'+id))return '武将不能同时承担两项承诺';objects.add('person:'+id);}}
  if(c.kind==='deploy'&&(militaryAidRestricted(s,c.from,c.to)||diplomaticProtection(s,c.from,c.enemy)||!factionsHostile(s,c.from,c.enemy)&&!p.clauses.some(x=>x.kind==='declare'&&x.from===c.from&&x.enemy===c.enemy)))return '军事承诺违反现有条约或缺少明确宣战条款';
  if(c.kind==='trade'&&(c.resource!=='grain'||!Number.isSafeInteger(c.quota)||c.quota<=0||!Number.isFinite(c.unitPrice)||c.unitPrice<=0))return '经贸框架必须明确粮、数量和固定价格';
  if(c.after!==undefined&&(!Array.isArray(c.after)||c.after.some(id=>!p.clauses.some(x=>x.id===id&&x.id<c.id))))return '前置条款必须引用前面已明确的履约节点';
  if(c.kind==='alliance'&&!p.factions.every(f=>p.clauses.some(x=>x.kind==='nonaggression'&&x.from===f)))return '同盟须附双方互不侵犯承诺';
  if(['militaryPass','station','envoyPass','tradePass','supply'].includes(c.kind)&&c.route?.some(id=>!town(s,id)))return '路权地点无效';
  if(['declare','restrictAid','spoils'].includes(c.kind)&&!FACTIONS[c.enemy])return '军事对象无效';
  if(c.kind==='withdraw'&&!world.armies.some(a=>a.id===c.armyId&&a.faction===c.from))return '约定军团已不存在';
  if(c.kind==='terminate'&&!s.campaign.diplomacy.contracts.some(q=>q.id===c.contractId&&q.status==='signed'))return '待解除契约已失效';
  if(c.kind==='intelligence'&&(!Array.isArray(c.information)||!c.information.length||c.information.some(i=>!world.campaign.activity.nodes.some(n=>n.id===i.nodeId&&n.faction===c.from&&n.text===i.text&&n.day===i.day))))return '情报须引用本方已掌握的事实和日期';
 }
 for(const f of p.factions){if(requester&&f!==requester)continue;const r=diplomaticResources(s,f,inherited?p.sites[f]:null,p.id),out=p.clauses.filter(c=>c.kind==='city'&&c.from===f).length,incoming=p.clauses.filter(c=>c.kind==='city'&&c.to===f).length;
  if(s.cities.filter(c=>c.owner===f).length-out+incoming<1)return '交接后必须保留实际城池';
  for(const k of ['gold','grain','manpower'])if(sums[f][k]>r[k])return '君主城可用'+({gold:'金',grain:'粮',manpower:'预备兵'})[k]+'不足';
  for(const k of ['grain','manpower']){const n=p.clauses.filter(c=>c.kind===k&&c.to===f).reduce((n,c)=>n+c.amount,0),cap=k==='grain'?grainCapacity(r.city):30000;if(n-sums[f][k]+r.city[k]>cap)return '君主城接收容量不足';}
 }
 if(signing&&p.factions.some(f=>p.approvals[f]?.version!==p.version||p.approvals[f]?.terms!==terms(p)))return '最终方案尚未获双方批准或条款已变化';return null;
}
function beginMission(s,unit,{faction,homeCity,targetCity,other,projectId,purpose='envoy',clauseId=null,route=null}){
 const path=route||diplomaticRoute(s,homeCity,targetCity,faction,other,purpose==='cargo'?'trade':'envoy',projectId);if(!path)return false;
 unit.mission={type:'diplomacy',actionId:projectId,projectId,clauseId,purpose,faction,homeCity,targetCity,location:homeCity,route:path,progress:0,phase:path.length?'outbound':'work',workDone:false,cancelled:false,lastDay:s.campaign.day,workStartDay:s.campaign.day+1,cargo:null};return true;
}
function diplomaticWork(clauses){return clauses.map(c=>WORK[c.kind]||WORK[['deploy','declare','withdraw'].includes(c.kind)?'military':['city','spoils'].includes(c.kind)?'city':'resource']).reduce((a,b)=>({days:Math.max(a.days,b.days),fee:Math.max(a.fee,b.fee)}),WORK.resource);}
export function prepareDiplomaticProposal(s,a,candidate){
 const d=s.campaign.diplomacy,actor=servingPeople(s).get(a.officerId),f=a.faction,other=candidate.other;if(!actor||actor.unit.mission||actor.unit.scouting||!lordCity(s,f)||!candidate.targetCity)return null;
 const policy=d.policies[f],turn=Math.floor((s.campaign.day-1)/10);if(policy.feeTurn!==turn){policy.feeTurn=turn;policy.fees=0;}
 const work=diplomaticWork(candidate.clauses),fee=work.fee;if(policy.fees+fee>policy.feeBudget||town(s,actor.location).gold<fee+Math.max(town(s,actor.location).budget.goldReserve,policy.goldReserve)){a.waiting='办事经费不足';return null;}
 const p={id:d.nextId++,version:1,factions:[f,other],officerId:a.officerId,direction:a.direction,goal:candidate.goal,sites:{[f]:lordCity(s,f).id,[other]:candidate.targetCity},clauses:copy(candidate.clauses),status:'outbound',approvals:{},createdDay:s.campaign.day,expiresDay:s.campaign.day+routeDays(s,a.homeCity,candidate.path)+work.days+R.offerDays,progress:0,workDays:work.days,expenses:{[f]:fee},attempts:0,reason:candidate.reason,score:candidate.score,escrow:[],receivers:{},meetingCity:candidate.targetCity};
 if(p.clauses.some(c=>['grain','manpower','prisoner','city'].includes(c.kind)))p.clauses.push(...mutual('tradePass',f,other,90),...mutual('envoyPass',f,other,90));
 p.visitPermit={officerId:a.officerId,untilDay:p.expiresDay+routeDays(s,a.homeCity,candidate.path)+30};
 p.clauses=p.clauses.map((c,i)=>({...c,id:i+1}));for(const c of p.clauses)if(c.deploymentId==='proposed')c.deploymentId=p.clauses.find(x=>x.kind==='deploy').id;const error=clauseError(s,p,{requester:f});if(error){a.waiting=error;return null;}
 if(!beginMission(s,actor.unit,{faction:f,homeCity:a.homeCity,targetCity:candidate.targetCity,other,projectId:p.id,route:candidate.path}))return null;
 addCityGold(s,town(s,actor.location),-fee);policy.fees+=fee;a.projectId=p.id;a.waiting='实际出使';d.proposals.push(p);emit(s,p,'departure',`${actor.unit.name}出使${FACTIONS[other].name}，争取${GOALS[p.goal]}，已用接洽费${fee}金。`);return p;
}
function beginReturn(s,u){
 const m=u.mission;if(!m||m.phase==='return')return;
 const from=m.location,next=m.route[0],progress=m.progress,other=town(s,m.targetCity)?.owner;
 const homes=s.cities.filter(c=>c.owner===m.faction).map(c=>({c,path:diplomaticRoute(s,from,c.id,m.faction,other,'envoy',m.projectId)})).filter(x=>x.path).sort((a,b)=>routeDays(s,from,a.path)-routeDays(s,from,b.path)||a.c.id.localeCompare(b.c.id));
 const home=homes.find(x=>x.c.id===m.homeCity)||homes[0];if(!home){m.blocked='无合法返城路线';return;}
 m.phase='return';m.workDone=true;m.homeCity=home.c.id;delete m.blocked;
 if(next&&progress>0){m.location=next;m.route=[from,...home.path];m.progress=roadCost(s,next,from)-progress;}
 else {m.route=home.path;m.progress=0;}
}
export function approveDiplomaticProposal(s,id,version,{faction=playerFaction(s),automatic=false}={}){const p=s.campaign.diplomacy.proposals.find(p=>p.id===id),f=faction;if(s.finished||!(automatic?isAIControlled(s,f):isPlayerControlled(s,f))||!p||p.status!=='pending'||!p.factions.includes(f)||p.version!==Number(version)||p.expiresDay<s.campaign.day)return '方案已失效，请重新交涉';const error=clauseError(s,p,{requester:f});if(error)return error;p.approvals[f]={version:p.version,day:s.campaign.day,controller:automatic?'ai':'player',terms:terms(p)};if(!automatic)closePendingReports(s,p);emit(s,p,'approved',`${automatic?FACTIONS[f].name:'玩家'}批准${GOALS[p.goal]}最终方案。`,{faction:f});if(p.factions.every(f=>p.approvals[f]?.version===p.version))p.status='approved';return null;}
export function decideDiplomaticProposal(s,id,decision,{faction=playerFaction(s),automatic=false}={}){const p=s.campaign.diplomacy.proposals.find(p=>p.id===id),f=faction;if(s.finished||!(automatic?isAIControlled(s,f):isPlayerControlled(s,f))||!p||!p.factions.includes(f)||p.status!=='pending')return '方案已处理';const u=servingPeople(s).get(p.officerId)?.unit;
 if(!['renegotiate','reject'].includes(decision))return '方案处理方式无效';if(!automatic)closePendingReports(s,p);
 if(decision==='renegotiate'){p.version++;p.approvals={};p.status='negotiating';p.progress=0;p.attempts++;p.expiresDay=s.campaign.day+R.offerDays;emit(s,p,'returned','玩家要求继续交涉。',{faction:f});}
 else {p.status='rejected';emit(s,p,'rejected','玩家否决本次外交方案。',{faction:f});if(u)beginReturn(s,u);}recordOfficerActivities(s);return null;
}
function reviewFinalProposal(s,p){
 p.status='pending';p.expiresDay=s.campaign.day+R.offerDays;
 for(const f of p.factions){const assessment=evaluateDiplomaticProposal(s,p,f);if(isAIControlled(s,f)){
   if(!assessment.approve){p.status='negotiating';p.progress=Math.max(0,p.workDays-2);p.attempts++;const money=p.clauses.find(c=>c.kind==='gold'&&c.to===f&&!c.gift);if(money&&p.attempts<=2){money.amount=Math.ceil(money.amount*1.15/10)*10;p.version++;p.approvals={};emit(s,p,'counteroffer',`${FACTIONS[f].name}提出反报价：${money.amount}金。`);return;}p.status='rejected';emit(s,p,'rejected',`${FACTIONS[f].name}认为代价或军事责任不合适，未同意。`);const u=servingPeople(s).get(p.officerId)?.unit;if(u){settleOfficerMerit(s,u,{sourceId:`diplomacy-refused:${p.id}`,amount:-PROGRESSION.diplomacy.refused,faction:p.factions[0],cityId:p.sites[p.factions[0]],category:'diplomacy',reason:'外交交涉未成'});beginReturn(s,u);}return;}
   const error=approveDiplomaticProposal(s,p.id,p.version,{faction:f,automatic:true});if(error){p.status='cancelled';emit(s,p,'failed',error,{faction:f});const u=servingPeople(s).get(p.officerId)?.unit;if(u)beginReturn(s,u);return;}
  }
  emit(s,p,'pending',`${GOALS[p.goal]}方案已谈妥，等待${isPlayerControlled(s,f)?'玩家':'君主'}最终批准。${assessment.reason}`,{faction:f,result:{assessment}});
 }
 if(p.factions.every(f=>p.approvals[f]?.version===p.version))p.status='approved';
}
function signProposal(s,p){
 const error=clauseError(s,p,{signing:true,inherited:!!p.parentId});if(error){p.status='cancelled';emit(s,p,'failed',`未签署：${error}`);const u=servingPeople(s).get(p.officerId)?.unit;if(u?.mission?.projectId===p.id)beginReturn(s,u);return;}
 p.signedTerms=terms(p);p.status='signed';p.signedDay=s.campaign.day;p.deadline=s.campaign.day+Math.max(R.contractGraceDays,...p.clauses.map(c=>c.dueOffset?c.dueOffset+R.contractGraceDays:c.deadline?c.deadline-s.campaign.day+30:0));
 for(const c of p.clauses){Object.assign(c,{status:'waiting',delivered:0,effectiveDay:['gold','grain','manpower','prisoner','city'].includes(c.kind)?s.campaign.day:s.campaign.day+1,untilDay:c.duration?s.campaign.day+c.duration:null,remaining:c.amount||0});
  if(['gold','grain','manpower','supply'].includes(c.kind)){const resource=c.kind==='supply'?'grain':c.kind;if(c.deferred){c.dueDay=s.campaign.day+c.dueOffset;p.escrow.push({clauseId:c.id,kind:resource,faction:c.from,cityId:p.sites[c.from],amount:0});}else{if(resource==='gold')addCityGold(s,town(s,p.sites[c.from]),-c.amount);else town(s,p.sites[c.from])[resource]-=c.amount;p.escrow.push({clauseId:c.id,kind:resource,faction:c.from,cityId:p.sites[c.from],amount:c.amount});}}
  if(c.kind==='prisoner')s.campaign.domestic.people.find(t=>t.id===c.officerId).diplomaticLock=p.id;
 }
 for(const c of p.clauses.filter(c=>c.kind==='gold'))if(p.clauses.some(x=>['peace','nonaggression','alliance'].includes(x.kind)&&x.after?.includes(c.id)))c.effectiveDay=s.campaign.day+1;
 s.campaign.diplomacy.contracts.push(p);s.campaign.diplomacy.proposals=s.campaign.diplomacy.proposals.filter(x=>x!==p);
 for(const f of p.factions)emit(s,p,'signed',`${GOALS[p.goal]}正式签署，逐项履约。`,{faction:f});const u=servingPeople(s).get(p.officerId)?.unit;if(u?.mission?.projectId===p.id)beginReturn(s,u);
}

const holding=(p,c)=>p.escrow.find(e=>e.clauseId===c.id);
const strategicClause=(p,c)=>['peace','alliance','trade','deploy'].includes(c.kind)||c.kind==='nonaggression'&&c.from===p.factions[0]&&!p.clauses.some(x=>['peace','alliance'].includes(x.kind));
function completeClause(s,p,c,text,phase='delivery'){c.status='done';emit(s,p,phase,text,{faction:c.to,officerId:null,result:{clauseId:c.id,actual:c.delivered}});emit(s,p,phase,text,{faction:c.from,officerId:null,result:{clauseId:c.id,actual:c.delivered}});}
function carrier(s,p,c,location,purpose='cargo',target=p.sites[c.to]){
 const choices=[...servingPeople(s).values()].filter(o=>o.faction===c.from&&!o.army&&!o.destination&&!o.unit.mission&&!o.unit.scouting&&!assignmentFor(s,o.unit.id)&&!pendingDomesticOrder(s,o.unit.id)&&!plannedOfficer(s,o.unit.id)&&!s.cities.some(c=>c.governor===o.unit.id)&&o.unit.id!==factionLord(s,c.from)).sort((a,b)=>Number(b.location===location)-Number(a.location===location)||a.unit.id.localeCompare(b.unit.id));
 const o=choices.find(o=>diplomaticRoute(s,o.location,location,c.from,c.to,'envoy',p.id));if(!o)return null;
 if(!beginMission(s,o.unit,{faction:c.from,homeCity:o.location,targetCity:o.location===location?target:location,other:c.to,projectId:p.id,purpose:o.location===location?purpose:'collect-'+purpose,clauseId:c.id}))return null;
 const m=o.unit.mission;m.sourceCity=location;m.deliveryCity=target;
 if(o.location===location&&purpose==='cargo'){const h=holding(p,c);m.cargo={kind:c.kind,amount:h.amount};h.amount=0;}
 c.carrierId=o.unit.id;return o.unit;
}
function dispatchClause(s,p,c){
 if(c.carrierId||c.status!=='waiting')return;
 if(['grain','manpower'].includes(c.kind)){carrier(s,p,c,p.sites[c.from]);return;}
 if(c.kind==='prisoner'){const prisoner=s.campaign.domestic.people.find(t=>t.id===c.officerId&&t.status==='CAPTIVE'&&t.fate?.captor===c.from);if(!prisoner){failContract(s,p,'俘虏已失去拘押权');return;}if(prisoner.custody)return;const u=carrier(s,p,c,prisoner.cityId,'prisoner',p.meetingCity);if(u&&u.mission.purpose==='prisoner')startPrisonerEscort(s,p,c,u,prisoner);}
}
function startPrisonerEscort(s,p,c,u,prisoner){
 const m=u.mission;m.purpose='prisoner';m.targetCity=p.meetingCity;m.route=diplomaticRoute(s,m.location,p.meetingCity,c.from,c.to,'envoy',p.id)||[];m.progress=0;m.phase=m.route.length?'outbound':'work';m.captiveId=prisoner.id;prisoner.diplomaticEscort=u.id;if(m.route.length)prisoner.custody={destination:p.meetingCity,route:[...m.route],progress:0};else delete prisoner.custody;
}
function failContract(s,p,reason,{fault=null,terminate=false}={}){
 if(p.status!=='signed'||p.failure&&!terminate)return;
 const preserveProtection=!fault&&!terminate&&p.clauses.some(c=>['peace','nonaggression','alliance'].includes(c.kind)),hasDebt=p.clauses.some(c=>c.deferred&&c.status==='waiting');
 p.status=preserveProtection||hasDebt?'signed':'failed';p.failure=reason;
 for(const c of p.clauses)if(!c.deferred&&(!preserveProtection||!['peace','nonaggression','alliance','envoyPass','tradePass','militaryPass','station'].includes(c.kind)))if(!['done','expired'].includes(c.status))c.status='failed';
 for(const e of p.escrow){if(e.kind==='gold'){const home=town(s,e.cityId);if(home?.owner===e.faction){addCityGold(s,home,e.amount);e.amount=0;}}else if(e.amount){const c=town(s,e.cityId),cap=e.kind==='grain'?grainCapacity(c):30000,n=Math.min(e.amount,Math.max(0,cap-c[e.kind]));c[e.kind]+=n;e.amount-=n;}}
 for(const t of s.campaign.domestic.people.filter(t=>t.diplomaticLock===p.id)){if(![...servingPeople(s).values()].some(o=>o.unit.mission?.captiveId===t.id)){delete t.diplomaticLock;delete t.diplomaticEscort;}}
 for(const o of servingPeople(s).values())if(o.unit.mission?.type==='diplomacy'&&o.unit.mission.projectId===p.id)beginReturn(s,o.unit);
 if(fault&&p.factions.includes(fault))s.campaign.diplomacy.credit[fault]=Math.max(0,(s.campaign.diplomacy.credit[fault]??100)-15);
 for(const f of p.factions)emit(s,p,'failed',`外交履约中止：${reason}，未付资金解除预留，实物按实际位置退运，已发生债务继续结算。`,{faction:f});
}
function advanceMission(s,u){
 const m=u.mission;if(!m||m.type!=='diplomacy'||m.lastDay===s.campaign.day)return;m.lastDay=s.campaign.day;
 const p=[...s.campaign.diplomacy.proposals,...s.campaign.diplomacy.contracts].find(p=>p.id===m.projectId),c=p?.clauses.find(c=>c.id===m.clauseId),other=p?.factions.find(f=>f!==m.faction);
 if(m.cancelled&&m.phase!=='return'){if(p&&['pending','outbound','negotiating'].includes(p.status)){p.status='cancelled';emit(s,p,'cancelled','使臣召回，未签方案取消。');}beginReturn(s,u);}
 if(!p){beginReturn(s,u);return;}
 const home=town(s,m.homeCity);if(home?.owner!==m.faction){const index=home?.units.indexOf(u);if(index>=0){home.manpower+=u.troops+u.wounded;u.troops=0;u.wounded=0;home.units.splice(index,1);s.campaign.idle.push({unit:u,faction:m.faction,location:m.location,destination:null,remainingDays:0});}if(m.phase!=='return')beginReturn(s,u);}
 const policy=s.campaign.diplomacy.policies[m.faction],turn=Math.floor((s.campaign.day-1)/10);if(policy.feeTurn!==turn){policy.feeTurn=turn;policy.fees=0;}
 if(policy.fees+R.dailyFare>policy.feeBudget||town(s,m.homeCity)?.owner!==m.faction||town(s,m.homeCity).gold<R.dailyFare+Math.max(town(s,m.homeCity).budget.goldReserve,policy.goldReserve)){m.blocked='外交行资不足，等待经费';return;}
 addCityGold(s,town(s,m.homeCity),-R.dailyFare);policy.fees+=R.dailyFare;p.expenses??={};p.expenses[m.faction]=(p.expenses[m.faction]||0)+R.dailyFare;
 emit(s,p,'fare-'+s.campaign.day,`${u.name}今日实际使用${R.dailyFare}金行资。`,{faction:m.faction,officerId:u.id,siteId:m.location,result:{clauseId:m.clauseId}});
 if(m.blocked==='外交行资不足，等待经费')delete m.blocked;
 if(m.phase==='work'&&m.location!==m.targetCity&&m.purpose!=='envoy'){const path=diplomaticRoute(s,m.location,m.targetCity,m.faction,other,m.cargo?'trade':'envoy',p.id);if(path){m.route=path;m.phase=path.length?'outbound':'work';}else m.blocked='等待合法交付路线';}
 if(m.phase==='work')return;
 const speed=m.purpose==='prisoner'?R.captiveSpeed:m.cargo?R.cargoSpeed:R.lightSpeed;let budget=speed;
 while(m.route.length&&budget>0){const from=m.location,to=m.route[0],cost=roadCost(s,from,to),used=Math.min(budget,cost-m.progress);
  const destination=town(s,to),allowed=!destination.owner||[m.faction,other,'neutral'].includes(destination.owner)||diplomaticPassage(s,m.faction,to,m.cargo?'trade':'envoy',p.id),blocked=s.campaign.battles.some(r=>!r.settled&&r.cityId===to)||s.armies.some(a=>!a.travel&&a.location===to&&a.units.some(u=>u.troops>0)&&![m.faction,other].includes(a.faction)&&factionsHostile(s,m.faction,a.faction));
  if(!allowed||blocked){m.blocked='通行路线受阻';if(m.progress===0){const alternative=diplomaticRoute(s,from,m.phase==='return'?m.homeCity:m.targetCity,m.faction,other,m.cargo?'trade':'envoy',p.id);if(alternative&&alternative[0]!==to){m.route=alternative;continue;}}emit(s,p,'blocked',`${u.name}在${town(s,from).name}附近的实际路线受阻，等待合法通行或返程。`,{faction:m.faction,officerId:u.id,siteId:from,result:{clauseId:m.clauseId}});break;}
  {
   const hit=transportEnemy(s,{unit:u,faction:m.faction,location:from,diplomaticContract:p.id,diplomaticEnvoy:m.cargo||m.captiveId?null:u.id},to,m.progress/cost,(m.progress+used)/cost,0,1);
   if(hit){if(m.cargo?.amount)transportMerit(s,u,m.faction,m.sourceCity||m.homeCity,m.deliveryCity||m.targetCity,{[m.cargo.kind]:m.cargo.amount},{sourceId:`diplomacy-loss:${p.id}:${u.id}`,failed:true,reason:'外交押运遇敌损失'});else if(m.purpose==='envoy')settleOfficerMerit(s,u,{sourceId:`diplomacy-loss:${p.id}:${u.id}`,amount:-PROGRESSION.failures.transportMinimum,faction:m.faction,cityId:m.homeCity,category:'diplomacy',reason:'出使遭敌截获'});if(m.cargo)m.cargo.amount=0;const escort=s.campaign.domestic.people.find(t=>t.id===m.captiveId);if(escort){delete escort.diplomaticLock;delete escort.diplomaticEscort;delete escort.custody;escort.cityId=from;escort.fate.captor=hit.faction;}
    const saved=s.cities.find(t=>t.units.includes(u));if(saved){saved.manpower+=u.troops+u.wounded;}u.troops=0;u.wounded=0;delete u.mission;resolveOfficerLoss(s,{unit:u,faction:m.faction,location:from,enemy:hit.faction,eventId:`diplomatic-loss:${p.id}:${u.id}`,edge:{from,to,fraction:hit.fraction??m.progress/cost},reason:m.cargo||m.captiveId?'外交押运遇敌':'使臣出行遇敌'});if(p.status==='signed')failContract(s,p,'外交人员遭第三方截获');else{p.status='cancelled';closePendingReports(s,p);emit(s,p,'failed','实际使臣出行遭第三方截获，未签方案中止。');}return;}
  }
  m.progress+=used;budget-=used;if(m.progress>=cost){m.location=to;m.route.shift();m.progress=0;}
  const captive=s.campaign.domestic.people.find(t=>t.id===m.captiveId);if(captive){captive.cityId=m.location;if(m.route.length)captive.custody={destination:m.targetCity,route:[...m.route],progress:m.progress};else delete captive.custody;}
 }
 if(m.route.length)return;delete m.blocked;
 if(m.purpose==='evacuation'&&m.phase!=='return'){const captive=s.campaign.domestic.people.find(t=>t.id===m.captiveId);if(captive){delete captive.diplomaticLock;delete captive.diplomaticEscort;delete captive.custody;}delete m.captiveId;beginReturn(s,u);return;}
 if(m.phase==='return'){
  const prisoner=s.campaign.domestic.people.find(t=>t.id===m.captiveId);if(prisoner){delete prisoner.diplomaticLock;delete prisoner.diplomaticEscort;delete prisoner.custody;delete m.captiveId;}
  if(m.cargo?.amount){const city=town(s,m.location),cap=m.cargo.kind==='grain'?grainCapacity(city):30000,n=Math.min(m.cargo.amount,Math.max(0,cap-city[m.cargo.kind]));city[m.cargo.kind]+=n;m.cargo.amount-=n;if(m.cargo.amount){m.blocked='返城仓储不足';return;}}
  const a=diplomaticAssignment(s,u.id);if(a){a.projectId=null;a.homeCity=m.location;a.nextDay=s.campaign.day+(p.goal==='friendship'?30:R.retryDays);a.waiting='已返城';if(a.dismissed)s.campaign.diplomacy.assignments=s.campaign.diplomacy.assignments.filter(x=>x!==a);}
  const source=s.cities.find(t=>t.units.includes(u));if(source&&source.id!==m.location){source.manpower+=u.troops+u.wounded;u.troops=0;u.wounded=0;source.units=source.units.filter(x=>x!==u);s.campaign.idle.push({unit:u,faction:m.faction,location:m.location,destination:null,remainingDays:0});}
  const idle=s.campaign.idle.find(o=>o.unit===u);if(idle)idle.location=m.location;u.homeCity=m.location;delete u.mission;emit(s,p,'returned-home',`${u.name}实际返城。`,{faction:m.faction,cityId:m.location,officerId:u.id,result:{clauseId:m.clauseId}});return;
 }
 if(m.purpose.startsWith('collect-')){
  const purpose=m.purpose.slice(8);m.purpose=purpose;m.targetCity=m.deliveryCity;m.route=diplomaticRoute(s,m.location,m.targetCity,m.faction,other,purpose==='cargo'?'trade':'envoy',p.id)||[];m.phase=m.route.length?'outbound':'work';
  if(purpose==='cargo'){const h=holding(p,c);m.cargo={kind:c.kind,amount:h.amount};h.amount=0;}
  if(purpose==='prisoner'){const prisoner=s.campaign.domestic.people.find(t=>t.id===c.officerId);if(prisoner)startPrisonerEscort(s,p,c,u,prisoner);}
  if(purpose==='evacuation'){const prisoner=s.campaign.domestic.people.find(t=>t.id===m.evacuationId);if(prisoner&&prisoner.cityId===m.location){m.captiveId=prisoner.id;if(m.route.length)prisoner.custody={destination:m.targetCity,route:[...m.route],progress:0};}}return;
 }
 m.phase='work';m.workStartDay=s.campaign.day+1;if(m.purpose==='envoy'&&p.status==='outbound')p.status='negotiating';
}
function unloadCargo(s,p,c){const u=servingPeople(s).get(c.carrierId)?.unit,m=u?.mission;if(c.status!=='waiting'||!m||m.projectId!==p.id||m.clauseId!==c.id||m.purpose!=='cargo'||m.phase!=='work'||m.cargo?.kind!==c.kind||m.location!==p.sites[c.to])return;const city=town(s,m.location);if(city.owner!==c.to){failContract(s,p,'君主城交付地点失守');return;}
 const cap=c.kind==='grain'?grainCapacity(city):30000,n=Math.min(m.cargo.amount,c.amount-c.delivered,Math.max(0,Math.floor(cap-city[c.kind])));city[c.kind]+=n;m.cargo.amount-=n;c.delivered+=n;c.remaining-=n;
 if(n>0)transportMerit(s,u,c.from,p.sites[c.from],city.id,{[c.kind]:n},{sourceId:`diplomacy-cargo:${p.id}:${c.id}:${c.delivered}`,reason:'完成真实外交押运'});
 if(n>0)emit(s,p,`unload-${c.delivered}`,`${u.name}实际向${city.name}交付${n}${c.kind==='grain'?'粮':'预备兵'}。`,{faction:c.to,officerId:u.id,cityId:city.id,result:{clauseId:c.id,actual:n}});
 if(!m.cargo.amount){completeClause(s,p,c,`${ACTIONS[c.kind]}完成：${c.delivered}。`);m.cargo=null;beginReturn(s,u);}else m.blocked='收货君主城仓储不足';
}
function releasePrisoners(s,p){const clauses=p.clauses.filter(c=>c.kind==='prisoner'&&c.status==='waiting');if(!clauses.length)return;
 if(clauses.some(c=>{const t=s.campaign.domestic.people.find(t=>t.id===c.officerId);return !t||t.status!=='CAPTIVE'||t.fate?.captor!==c.from||t.cityId!==p.meetingCity||t.custody?.route.length||!c.carrierId;}))return;
 for(const c of clauses){const t=s.campaign.domestic.people.find(t=>t.id===c.officerId);delete t.diplomaticLock;delete t.diplomaticEscort;delete t.custody;const error=releaseCaptive(s,t.id,{automatic:true,diplomatic:true});if(error){failContract(s,p,error);return;}c.delivered=1;completeClause(s,p,c,`${OFFICER_BY_ID[c.officerId].name}完成真实交接并获释返城。`,'prisoner');const u=servingPeople(s).get(c.carrierId)?.unit;if(u)beginReturn(s,u);}
}
function transferCities(s,p){const clauses=p.clauses.filter(c=>c.kind==='city'&&c.status==='waiting');if(!clauses.length)return;
 for(const c of clauses){const city=town(s,c.cityId);if(city.owner!==c.from||s.campaign.battles.some(r=>!r.settled&&r.cityId===c.cityId)){failContract(s,p,'交接城市归属或战场条件改变');return;}
  const homes=s.cities.filter(t=>t.owner===c.from&&!clauses.some(x=>x.cityId===t.id)).sort((a,b)=>a.id.localeCompare(b.id));if(!homes.length){failContract(s,p,'原方缺少可撤离城市');return;}
  const prisoners=s.campaign.domestic.people.filter(t=>t.status==='CAPTIVE'&&t.cityId===city.id);
  for(const prisoner of prisoners){if(prisoner.custody||prisoner.diplomaticLock)continue;const escort=carrier(s,p,{...c,from:c.from,to:c.from},city.id,'evacuation',homes[0].id);if(escort){const m=escort.mission;m.evacuationId=prisoner.id;prisoner.diplomaticLock=p.id;prisoner.diplomaticEscort=escort.id;if(m.purpose==='evacuation'){m.captiveId=prisoner.id;if(m.route.length)prisoner.custody={destination:homes[0].id,route:[...m.route],progress:0};}}}
  if(prisoners.length)continue;
  for(const o of cityPersonnel(s,city.id)){if(o.unit.mission)return;cancelDomestic(s,o.unit.id,'和平交接城池');if(city.governor===o.unit.id)city.governor=null;const error=transferOfficer(s,o.unit.id,homes[0].id,{scheduled:true,faction:c.from});if(error)return;}
  for(const a of s.armies.filter(a=>a.faction===c.from&&!a.travel&&a.location===city.id)){if(armyBattle(s,a.id))return;orderCampaignArmy(s,a.id,homes[0].id,'auto',{scheduled:true,faction:c.from});}
  if(!p.receivers[c.id]){const receive={...c,from:c.to,to:c.from};const u=carrier(s,p,receive,p.sites[c.to],'handover',city.id);if(u)p.receivers[c.id]=u.id;}
 }
 if(clauses.some(c=>s.campaign.domestic.people.some(t=>t.status==='CAPTIVE'&&t.cityId===c.cityId)||cityPersonnel(s,c.cityId).length||s.armies.some(a=>a.location===c.cityId&&!a.travel&&a.faction===c.from)||servingPeople(s).get(p.receivers[c.id])?.unit.mission?.location!==c.cityId))return;
 for(const c of clauses){const city=town(s,c.cityId);city.owner=c.to;city.domestic.owner=c.to;city.domestic.reserved=0;city.domestic.preparation={intent:null,shield:null};city.governor=null;c.delivered=1;}
 reconcileDomestic(s);
 for(const c of clauses){completeClause(s,p,c,`${town(s,c.cityId).name}和平交接至${FACTIONS[c.to].name}，未触发战斗伤亡。`,'city');const u=servingPeople(s).get(p.receivers[c.id])?.unit;if(u)beginReturn(s,u);}
}
function settleGold(s,p,c){const e=holding(p,c);if(c.status!=='waiting'||!e||c.effectiveDay>s.campaign.day||c.after?.some(id=>!['done','active'].includes(p.clauses.find(x=>x.id===id)?.status)))return;
 if(c.deferred){if(s.campaign.day<c.dueDay)return;const n=Math.min(c.amount-c.delivered,Math.floor(Math.max(0,town(s,p.sites[c.from]).owner===c.from?town(s,p.sites[c.from]).gold-Math.max(town(s,p.sites[c.from]).budget.goldReserve,s.campaign.diplomacy.policies[c.from].goldReserve):0)));if(n){addCityGold(s,town(s,p.sites[c.from]),-n);e.amount+=n;}if(s.campaign.day>c.dueDay+10&&!c.overdue){c.overdue=true;s.campaign.diplomacy.credit[c.from]=Math.max(0,(s.campaign.diplomacy.credit[c.from]??100)-15);for(const f of p.factions)emit(s,p,'failed','约定债务逾期，未清余额继续保留。',{faction:f,result:{clauseId:c.id}});}}
 if(!e.amount||town(s,p.sites[c.to])?.owner!==c.to)return;
 const exchanges=p.clauses.filter(x=>x.from===c.to&&x.to===c.from&&['grain','manpower','prisoner','city','deploy'].includes(x.kind));let fraction=1;
 if(exchanges.length)fraction=Math.min(...exchanges.map(x=>x.kind==='deploy'?(x.arrivedDay?1:0):x.delivered/(x.amount||1)));
 const amount=Math.min(e.amount,Math.max(0,Math.floor(c.amount*fraction)-c.delivered));if(!amount)return;e.amount-=amount;c.delivered+=amount;c.remaining-=amount;addCityGold(s,town(s,p.sites[c.to]),amount);
 emit(s,p,`payment-${c.delivered}`,`君主城收支：向${FACTIONS[c.to].name}实际划付${amount}金。`,{faction:c.from,officerId:null,result:{clauseId:c.id,actual:amount}});
 if(c.delivered===c.amount){completeClause(s,p,c,`约定${c.amount}金已全部结算。`);if(c.gift){const key=diplomaticPair(c.from,c.to),relation=s.campaign.diplomacy.relations[key]||0;s.campaign.diplomacy.relations[key]=Math.min(100,relation+Math.max(1,Math.floor(R.giftGain*(1-relation/100))));}}
}
export function declareDiplomaticWar(s,from,to,{approved=false}={}){if(from===to||to==='neutral')return null;if(diplomaticProtection(s,from,to))return '存在保护条约，须先批准解约';if(!approved)return '宣战须由君主批准';const key=diplomaticPair(from,to);if(s.campaign.diplomacy.wars[key]?.active)return null;s.campaign.diplomacy.wars[key]={active:true,day:s.campaign.day};emit(s,{id:`war-${key}-${s.campaign.day}`,version:1,factions:[from,to],sites:{}},'war',`${FACTIONS[from].name}向${FACTIONS[to].name}宣战。`,{faction:from,officerId:null});return null;}
function executeClause(s,p,c){
 if(c.status!=='waiting'||c.effectiveDay>s.campaign.day)return;
 if(c.after?.some(id=>!['done','active'].includes(p.clauses.find(x=>x.id===id)?.status)))return;
 if(c.startDay&&c.startDay>s.campaign.day)return;
 if(c.kind==='peace'){s.campaign.diplomacy.wars[diplomaticPair(c.from,c.to)]={active:false,day:s.campaign.day};settleDiplomaticCeasefire(s,c.from,c.to);c.status='active';}
 else if(['nonaggression','alliance','trade','restrictAid','envoyPass','tradePass','militaryPass','station'].includes(c.kind))c.status='active';
 else if(c.kind==='declare'){const error=declareDiplomaticWar(s,c.from,c.enemy,{approved:true});if(error){failContract(s,p,error);return;}c.status='done';}
 else if(c.kind==='deploy'){
  if(!factionsHostile(s,c.from,c.enemy)&&p.clauses.some(x=>x.kind==='declare'&&x.from===c.from&&x.enemy===c.enemy&&x.status!=='done'))return;
  if(!c.armyId){if(militaryAidRestricted(s,c.from,c.to)){failContract(s,p,'现有不援助承诺禁止这次出兵');return;}const units=c.officerIds.map(id=>town(s,c.cityId)?.units.find(u=>u.id===id));if(units.some(u=>!u||u.mission)){failContract(s,p,'援军人员已变化');return;}const q={cityId:c.cityId,officerIds:c.officerIds,leader:units.slice().sort((a,b)=>b.leadership-a.leadership)[0].id,advisor:units.slice().sort((a,b)=>b.intellect-a.intellect)[0].id,target:c.targetId,policy:'auto',route:c.route};const error=launchExpedition(s,q,{scheduled:true,faction:c.from});if(error){failContract(s,p,error);return;}c.armyId=s.armies.at(-1).id;s.armies.at(-1).diplomaticTask={contractId:p.id,clauseId:c.id,recipient:c.to,enemy:c.enemy,untilDay:c.deadline+c.duration};emit(s,p,'army-departure',`约定援军${s.armies.at(-1).name}实际出发。`,{faction:c.to,result:{clauseId:c.id,armyId:c.armyId}});}
  const army=s.armies.find(a=>a.id===c.armyId);if(army?.location===c.targetId&&!army.travel||armyBattle(s,c.armyId)?.cityId===c.targetId){c.delivered=1;c.arrivedDay=s.campaign.day;c.untilDay=s.campaign.day+c.duration-1;c.status='active';army.diplomaticTask.untilDay=c.untilDay;for(const f of p.factions)emit(s,p,'aid','约定援军已实际抵达任务地点，开始执行驻守或作战义务。',{faction:f,result:{clauseId:c.id,armyId:c.armyId}});}else if(s.campaign.day>c.deadline)failContract(s,p,'援军未能在约定时间抵达');
 }
 else if(c.kind==='withdraw'){const a=s.armies.find(a=>a.id===c.armyId);if(!a){failContract(s,p,'撤离军团已不存在');return;}if(a.location===c.targetId&&!a.travel)c.status='done';else if(!a.route.length&&!armyBattle(s,a.id))orderCampaignArmy(s,a.id,c.targetId,'auto',{scheduled:true,faction:c.from});}
 else if(c.kind==='spoils'){const city=town(s,c.cityId);if(city?.owner===c.from){c.kind='city';c.effectiveDay=s.campaign.day;}else if(city&&![c.enemy,c.from].includes(city.owner))c.status='failed';}
 else if(c.kind==='terminate'){const old=s.campaign.diplomacy.contracts.find(x=>x.id===c.contractId);if(old)failContract(s,old,'双方批准提前解约',{terminate:true});c.status='done';}
 else if(c.kind==='intelligence'){s.campaign.diplomacy.policies[c.to].intelligence??=[];s.campaign.diplomacy.policies[c.to].intelligence.push(...copy(c.information));c.status='done';emit(s,p,'intelligence','已交付带日期的实际情报。',{faction:c.to,result:{clauseId:c.id}});}
 else if(c.kind==='supply'){
  const a=s.armies.find(a=>a.id===(c.armyId||p.clauses.find(x=>x.id===c.deploymentId)?.armyId)&&a.faction===c.to),source=town(s,p.sites[c.from]),e=holding(p,c);if(!a||a.travel||a.location!==source.id||source.owner!==c.from||!e)return;const n=Math.floor(Math.min(c.amount-c.delivered,e.amount,a.supplyCapacity-a.supply));if(n<=0)return;e.amount-=n;a.supply+=n;c.delivered+=n;c.remaining-=n;emit(s,p,'supply-'+c.delivered,`从${source.name}实际预留粮中为${a.name}补给${n}粮。`,{faction:c.from,result:{clauseId:c.id,armyId:a.id,actual:n}});if(c.delivered>=c.amount)completeClause(s,p,c,'约定补给限额已实际使用完毕。','aid');
 }
 if(c.status==='active'){c.effectiveDay=s.campaign.day;if(c.duration)c.untilDay=s.campaign.day+c.duration-1;for(const f of p.factions)emit(s,p,'effective',`${ACTIONS[c.kind]}生效${c.untilDay?'，至第'+c.untilDay+'天':''}。`,{faction:f,result:{clauseId:c.id,important:strategicClause(p,c)}});}
}
function militaryTasks(s,p){
 for(const c of p.clauses.filter(c=>c.kind==='deploy'&&c.armyId&&['waiting','active','failed'].includes(c.status))){
  const a=s.armies.find(a=>a.id===c.armyId);if(!a||a.disbanded){failContract(s,p,'援军已在实际作战中损失或解散');continue;}if(a.diplomaticTask?.contractId!==p.id)continue;
  const battle=armyBattle(s,a.id),node=a.travel?.to||a.location,owner=town(s,node)?.owner,foreign=owner&&owner!==a.faction&&owner!=='neutral'&&!factionsHostile(s,a.faction,owner),passageEnded=foreign&&!diplomaticPassage(s,a.faction,node,'military',null,a),stationEnded=c.status==='active'&&c.task==='defend'&&!a.travel&&!a.route.length&&foreign&&!diplomaticPassage(s,a.faction,node,'station',null,a);
  if(c.status==='waiting'&&passageEnded)failContract(s,p,'援军通行许可已结束，实际撤回');
  const ended=c.status==='failed'||c.status==='active'&&s.campaign.day>c.untilDay||!factionsHostile(s,c.from,c.enemy)||c.task==='attack'&&town(s,c.targetId)?.owner!==c.enemy||passageEnded||stationEnded;
  if(!ended)continue;if(battle){a.diplomaticTask.ending=true;continue;}
  const path=diplomaticRetreat(s,a.faction,a.location,a.travel?{from:a.travel.from,to:a.travel.to,fraction:a.travel.progress/roadLength(s,a.travel.from,a.travel.to)}:null,p.factions);if(!path)continue;
  applyDiplomaticWithdrawal(s,a,path,p.factions);delete a.diplomaticTask;if(c.status!=='failed')c.status='done';for(const f of p.factions)emit(s,p,'aid-end','军事任务结束，援军沿实际道路返回本方城市。',{faction:f,result:{clauseId:c.id,armyId:a.id}});
 }
}
function applyDiplomaticWithdrawal(s,a,best,parties){a.location=best.path.location;a.route=best.path.route;a.target=a.route.length?best.id:null;a.travel=best.path.progress>0&&a.route.length?{from:a.location,to:a.route[0],road:'main',progress:roadLength(s,a.location,a.route[0])*best.path.progress/roadCost(s,a.location,a.route[0])}:null;a.task='按约撤军';a.diplomaticWithdrawal={from:parties[0],to:parties[1],route:[...a.route]};}
function withdrawUnpermittedGuests(s){
 for(const a of s.armies){
  const node=a.travel?.to||a.location,owner=town(s,node)?.owner;
  if(a.disbanded||a.diplomaticTask||a.diplomaticWithdrawal||armyBattle(s,a.id)||!owner||owner===a.faction||owner==='neutral'||factionsHostile(s,a.faction,owner)||diplomaticPassage(s,a.faction,node,'station',null,a)||a.route.length&&diplomaticPassage(s,a.faction,node,'military',null,a))continue;
  const edge=a.travel?{from:a.travel.from,to:a.travel.to,fraction:a.travel.progress/roadLength(s,a.travel.from,a.travel.to)}:null,best=diplomaticRetreat(s,a.faction,a.location,edge,[a.faction,owner]);
  if(best){applyDiplomaticWithdrawal(s,a,best,[a.faction,owner]);emit(s,{id:`guest-${a.id}`,version:1,factions:[a.faction,owner],sites:{[owner]:node}},'withdrawal','军事许可结束，实际军团沿道路返回本方城市。',{faction:owner,officerId:null,result:{armyId:a.id}});}else a.task='等待合法退兵路线';
 }
}
function processTradeFramework(s,p,c){
 if(c.status!=='active'||p.failure||c.batchId&&s.campaign.diplomacy.contracts.some(b=>b.id===c.batchId&&b.status==='signed'))return;
 if(c.batchId){const previous=s.campaign.diplomacy.contracts.find(b=>b.id===c.batchId);c.used=(c.used||0)+(previous?.clauses.find(x=>x.kind==='grain')?.delivered||0);delete c.batchId;}
 const quota=c.quota-(c.used||0);if(quota<500)return;
 const parties=p.factions.map(f=>({f,r:diplomaticResources(s,f,p.sites[f])}));if(parties.some(x=>!x.r.city))return;
 const buyer=parties.slice().sort((a,b)=>a.r.city.grain-b.r.city.grain)[0],seller=parties.find(x=>x!==buyer),need=Math.max(0,Math.max(s.campaign.diplomacy.policies[buyer.f].grainReserve,cityFoodReserve(s,buyer.r.city,30))-buyer.r.city.grain);
 const amount=Math.floor(Math.min(quota,R.grainBatch,seller.r.grain,need,grainCapacity(buyer.r.city)-buyer.r.city.grain,buyer.r.gold/c.unitPrice)/100)*100;if(amount<500)return;
 const id=s.campaign.diplomacy.nextId++,clauses=[leg('grain',seller.f,buyer.f,{amount}),leg('gold',buyer.f,seller.f,{amount:Math.ceil(amount*c.unitPrice)}),...mutual('tradePass',seller.f,buyer.f,90),...mutual('envoyPass',seller.f,buyer.f,90)].map((x,i)=>({...x,id:i+1})),batch={id,version:p.version,parentId:p.id,frameClauseId:c.id,factions:[...p.factions],officerId:p.officerId,direction:'commerce',goal:'buyGrain',sites:copy(p.sites),clauses,status:'approved',approvals:{},createdDay:s.campaign.day,expiresDay:s.campaign.day+R.offerDays,workDays:0,progress:0,expenses:{},attempts:0,reason:'已批准固定价格经贸框架内的实际批次',escrow:[],receivers:{},meetingCity:p.meetingCity};
 if(clauseError(s,batch,{inherited:true}))return;
 for(const f of p.factions)batch.approvals[f]={version:batch.version,controller:p.approvals[f].controller,day:p.approvals[f].day,terms:terms(batch),sourceContractId:p.id};
 signProposal(s,batch);if(batch.status==='signed'){c.batchId=id;emit(s,p,'batch-'+id,`已批准额度内生成${amount}粮的实际交易批次，固定报价${c.unitPrice}金／粮。`,{faction:buyer.f,result:{clauseId:c.id,batchId:id}});}
}
function processContract(s,p){
 if(p.status!=='signed')return;
 for(const c of p.clauses){if(c.kind!=='deploy'&&c.untilDay!==null&&c.untilDay<s.campaign.day&&c.status==='active'){c.status='expired';for(const f of p.factions)emit(s,p,'expired',`${ACTIONS[c.kind]}按期到期。`,{faction:f,result:{clauseId:c.id,important:strategicClause(p,c)}});}else if(c.untilDay===s.campaign.day+5&&c.status==='active')for(const f of p.factions)emit(s,p,'expiring',`${ACTIONS[c.kind]}还有5天到期。`,{faction:f,result:{clauseId:c.id,important:strategicClause(p,c)}});executeClause(s,p,c);if(p.status!=='signed')return;dispatchClause(s,p,c);if(['grain','manpower'].includes(c.kind))unloadCargo(s,p,c);if(c.kind==='trade')processTradeFramework(s,p,c);}
 militaryTasks(s,p);
 releasePrisoners(s,p);transferCities(s,p);for(const c of p.clauses.filter(c=>c.kind==='gold'))settleGold(s,p,c);
 settleDiplomaticMerit(s,p);
 const deliveries=p.clauses.filter(c=>['gold','grain','manpower','city','prisoner','deploy','intelligence','withdraw'].includes(c.kind));if(!p.fulfilledDay&&deliveries.length&&deliveries.every(c=>c.status==='done')){p.fulfilledDay=s.campaign.day;for(const f of p.factions)emit(s,p,'fulfilled',`${GOALS[p.goal]}已实际完成全部交付，条约和通行许可按约定期限继续。`,{faction:f,officerId:null});}
 if(s.campaign.day>p.deadline&&p.clauses.some(c=>c.status==='waiting'&&!c.deferred))failContract(s,p,'剩余交付已超过约定宽限');
 if(p.status==='signed'&&p.clauses.every(c=>['done','expired','failed'].includes(c.status))&&!p.escrow.some(e=>e.amount))p.status=p.clauses.some(c=>c.status==='failed')?'failed':'completed';
}
function settleDiplomaticMerit(s,p){
 if(p.parentId||p.failure)return;
 const actor=servingPeople(s).get(p.officerId),f=p.factions[0];if(!actor||actor.faction!==f)return;
 const meaningful=p.clauses.filter(c=>!['envoyPass','tradePass','militaryPass','station','restrictAid'].includes(c.kind));
 if(meaningful.some(c=>['active','done'].includes(c.status)))settleOfficerMerit(s,actor.unit,{sourceId:`diplomacy-effective:${p.id}`,amount:PROGRESSION.diplomacy.effective,faction:f,cityId:p.sites[f],category:'diplomacy',reason:'促成外交方案实际生效'});
 // Conditions already met are credited once, independently of later expiry.
 if(meaningful.length&&meaningful.every(c=>c.kind==='deploy'?c.status==='done':['done','active'].includes(c.status))){const major=meaningful.some(c=>['city','prisoner','deploy','alliance'].includes(c.kind));settleOfficerMerit(s,actor.unit,{sourceId:`diplomacy-fulfilled:${p.id}`,amount:major?PROGRESSION.diplomacy.majorFulfilled:PROGRESSION.diplomacy.fulfilled,faction:f,cityId:p.sites[f],category:'diplomacy',reason:'完成外交目标实际履约'});}
}
function refundStoredAssets(s,p){if(!p.failure&&p.status==='signed')return;for(const e of p.escrow){if(!e.amount)continue;if(e.kind==='gold'){const home=town(s,e.cityId);if(home?.owner===e.faction){addCityGold(s,home,e.amount);e.amount=0;}continue;}const c=town(s,e.cityId);if(!c)continue;const cap=e.kind==='grain'?grainCapacity(c):30000,n=Math.max(0,Math.floor(Math.min(e.amount,cap-c[e.kind])));c[e.kind]+=n;e.amount-=n;}}
// Reuse the exact candidate generator and legal officers for both controllers.
// Scores represent decisions only; resource and route gates never get noise.
export function diplomaticAIPlan(s,faction){
 const d=s.campaign.diplomacy,rows=[],bySite=new Map();for(const direction of Object.keys(DIRECTIONS))for(const o of diplomaticOfficerCandidates(s,faction,direction)){
  const current=diplomaticAssignment(s,o.unit.id);if(current?.projectId||current?.dismissed)continue;
  const home=town(s,o.location);
  if(home&&economicStaffingError(s,home,[o.unit.id])&&!d.assignments.some(a=>a.officerId===o.unit.id))continue;
  const a={faction,direction,officerId:o.unit.id,homeCity:o.location},key=direction+':'+o.location;if(!bySite.has(key))bySite.set(key,diplomaticCandidates(s,a)[0]||null);const candidate=bySite.get(key);if(!candidate)continue;
  const b=cityBudget(s,home,{includeWork:false});if(b.shortages.gold>0&&!['buyGrain','sellGrain','funding','peace','prisoners','withdraw'].includes(candidate.goal))continue;
  const profile=factionStrategicProfile(s,faction),work=diplomaticWork(candidate.clauses),opportunity=(o.work?.action?AI.activeWorkCost:o.work?AI.occupationCost:0)*profile.developmentWeight,wait=o.work?.action?.remaining||0;
  const score=candidate.score+o.unit[DIRECTIONS[direction].stat]*AI.abilityPerPoint-opportunity-work.fee*AI.feePerPoint-wait*AI.workPerDay;
  rows.push({officerId:o.unit.id,direction,goal:candidate.goal,target:candidate.other,score,reason:candidate.reason,waitingDays:wait});
 }
 return rows.sort((a,b)=>b.score-a.score||a.officerId.localeCompare(b.officerId)||a.direction.localeCompare(b.direction));
}
export function planDiplomaticAI(s){
 const d=s.campaign.diplomacy;if(s.campaign.day-d.lastAIReview<R.reviewDays&&d.lastAIReview)return;d.lastAIReview=s.campaign.day;
 routeSession={state:s,cache:new Map()};
 for(const f of factions(s).filter(f=>isAIControlled(s,f))){const x=context(s,f);if(!x.city||x.cities.reduce((n,c)=>n+cityPersonnel(s,c.id).length,0)<3)continue;
  const existing=d.assignments.filter(a=>a.faction===f&&!a.dismissed),plan=diplomaticAIPlan(s,f),best=plan.find(q=>q.score>=R.aiAssignmentScore&&(!existing.length||!existing.some(a=>a.direction===q.direction)));
  if(!best)continue;
  const reusable=existing.find(a=>!a.projectId&&!a.waitAction&&!servingPeople(s).get(a.officerId)?.unit.mission&&a.nextDay<=s.campaign.day);
  if(reusable){const result=assignDiplomat(s,reusable.officerId,best.direction,{faction:f,choice:'after',scheduled:true});if(!result.error)reusable.waiting='军情与供需变化后重新评估';continue;}
  if(existing.length>=R.aiMaxDiplomats)continue;assignDiplomat(s,best.officerId,best.direction,{faction:f,choice:'after',scheduled:true});
 }
 routeSession=null;
}
export function advanceDiplomacy(s){
 const d=s.campaign.diplomacy;if(d.lastDay===s.campaign.day)return;d.lastDay=s.campaign.day;
 // Today’s rights and peace take effect before today’s journeys or military AI.
 for(const p of d.contracts.filter(p=>p.status==='signed')){for(const c of p.clauses.filter(c=>c.kind==='gold'))settleGold(s,p,c);for(const c of p.clauses.filter(c=>['peace','nonaggression','alliance','trade','restrictAid','envoyPass','tradePass','militaryPass','station','declare','intelligence','terminate'].includes(c.kind)))executeClause(s,p,c);}
 planDiplomaticAI(s);
 for(const o of [...servingPeople(s).values()])advanceMission(s,o.unit);
 for(const a of [...d.assignments]){const o=servingPeople(s).get(a.officerId);if(!o||o.faction!==a.faction&&!o.unit.mission){d.assignments=d.assignments.filter(x=>x!==a);continue;}if(a.dismissed||a.projectId||a.nextDay>s.campaign.day)continue;
  if(a.waitAction){const work=assignmentFor(s,a.officerId);if(work?.action?.id===a.waitAction){a.waiting='等待内政结束';continue;}const history=s.campaign.domestic.workHistory[a.officerId]?.find(x=>x.actionId===a.waitAction);if(!history||history.status==='interrupted'){a.waiting='原事务中止，重新评估';a.nextDay=s.campaign.day+R.retryDays;}cancelDomestic(s,a.officerId,'赴任外交');a.waitAction=null;}
  if(o.unit.mission||o.destination||o.army||d.orders.some(q=>q.officerIds.includes(a.officerId)))continue;const candidates=diplomaticCandidates(s,a);if(candidates.length){for(const candidate of candidates){a.waiting='';if(prepareDiplomaticProposal(s,a,candidate))break;}if(!a.projectId)a.waiting||='资源、路线或对象不满足条件';}else a.waiting=lordCity(s,a.faction)?'暂无可履行且值得办理的方案':'君主未驻己方城市';
 }
 for(const p of [...d.proposals]){if(['pending','outbound','negotiating','approved'].includes(p.status)&&p.expiresDay<s.campaign.day){p.status='expired';emit(s,p,'expired','最终方案超期，未自动接受。');const u=servingPeople(s).get(p.officerId)?.unit;if(u)beginReturn(s,u);}
  if(p.status==='negotiating'){const u=servingPeople(s).get(p.officerId)?.unit;if(u?.mission?.phase==='work'&&!u.mission.blocked&&u.mission.workStartDay<=s.campaign.day){p.progress+=Math.max(.5,u[DIRECTIONS[p.direction].stat]/50);if(p.progress>=p.workDays)reviewFinalProposal(s,p);}}
  if(p.status==='approved')signProposal(s,p);
 }
 for(const p of [...d.contracts]){processContract(s,p);militaryTasks(s,p);refundStoredAssets(s,p);}withdrawUnpermittedGuests(s);resolveDiplomaticOrders(s);recordOfficerActivities(s);
}
export function validateDiplomaticMission(s,u){const m=u.mission;if(m?.type!=='diplomacy')return;const fail=ok=>{if(!ok)throw Error('外交人员移动存档无效');};fail(Number.isSafeInteger(m.projectId)&&m.projectId>0&&Object.hasOwn(FACTIONS,m.faction)&&[m.homeCity,m.targetCity,m.location].every(id=>town(s,id))&&['outbound','work','return'].includes(m.phase)&&Array.isArray(m.route)&&m.route.length<=mapNodes(s).length&&Number.isFinite(m.progress)&&m.progress>=0&&Number.isInteger(m.lastDay)&&m.lastDay<=s.campaign.day);let from=m.location;for(const to of m.route){fail(Number.isFinite(roadCost(s,from,to)));from=to;}fail(m.route.length?m.progress<roadCost(s,m.location,m.route[0]):m.progress===0);fail(!m.cargo||['grain','manpower'].includes(m.cargo.kind)&&Number.isSafeInteger(m.cargo.amount)&&m.cargo.amount>=0);}
export function validateDiplomacy(s){
 const d=s.campaign.diplomacy,fail=ok=>{if(!ok)throw Error('外交存档无效');},int=n=>Number.isSafeInteger(n)&&n>=0,ids=new Set();fail(d?.version===R.version&&int(d.nextId)&&d.nextId>0&&int(d.lastDay)&&d.lastDay<=s.campaign.day&&Array.isArray(d.assignments)&&Array.isArray(d.orders)&&Array.isArray(d.proposals)&&Array.isArray(d.contracts)&&d.wars&&d.policies);
 fail(d.contacts&&Object.keys(d.contacts).length===Object.keys(d.policies).length&&Object.entries(d.contacts).every(([f,id])=>Object.hasOwn(d.policies,f)&&s.cities.some(c=>c.id===id)));
 const queued=new Set();for(const q of d.orders){fail(int(q.id)&&q.id>0&&q.id<d.nextId&&FACTIONS[q.faction]&&['now','after'].includes(q.choice)&&int(q.requestedDay)&&q.requestedDay<=s.campaign.day&&q.command&&['assign','march','expedition','transfer','dismiss'].includes(q.command.kind)&&Array.isArray(q.officerIds)&&q.officerIds.length>0);for(const id of q.officerIds){fail(OFFICER_BY_ID[id]&&!queued.has(id));queued.add(id);}}
 const actors=new Set();for(const a of d.assignments){fail(int(a.id)&&a.id<d.nextId&&OFFICER_BY_ID[a.officerId]&&!actors.has(a.officerId)&&FACTIONS[a.faction]&&DIRECTIONS[a.direction]&&town(s,a.homeCity)&&int(a.nextDay)&&(a.waitAction===null||int(a.waitAction)));actors.add(a.officerId);}
 for(const p of [...d.proposals,...d.contracts]){fail(int(p.id)&&p.id>0&&p.id<d.nextId&&!ids.has(p.id)&&int(p.version)&&p.version>0&&p.factions.length===2&&p.factions[0]!==p.factions[1]&&p.factions.every(f=>FACTIONS[f]&&town(s,p.sites[f]))&&OFFICER_BY_ID[p.officerId]&&DIRECTIONS[p.direction]&&GOALS[p.goal]&&['outbound','negotiating','pending','approved','signed','completed','rejected','expired','cancelled','failed'].includes(p.status)&&Array.isArray(p.clauses)&&p.clauses.length>0&&p.clauses.length<=60&&int(p.createdDay)&&p.createdDay<=s.campaign.day&&int(p.expiresDay)&&p.approvals);ids.add(p.id);
  const seen=new Set();for(const c of p.clauses){fail(int(c.id)&&c.id>0&&!seen.has(c.id)&&ACTIONS[c.kind]&&p.factions.includes(c.from)&&p.factions.includes(c.to)&&c.from!==c.to);seen.add(c.id);if(c.amount!==undefined)fail(int(c.amount)&&c.amount>0);if(c.delivered!==undefined)fail(Number.isFinite(c.delivered)&&c.delivered>=0&&c.delivered<=(c.amount||1));}
  fail(Number.isFinite(p.progress)&&p.progress>=0&&int(p.workDays)&&p.workDays<=60&&Array.isArray(p.escrow)&&p.receivers&&typeof p.receivers==='object');
  for(const [f,a]of Object.entries(p.approvals))fail(p.factions.includes(f)&&a.version===p.version&&int(a.day)&&a.day<=s.campaign.day&&a.controller===(isPlayerControlled(s,f)?'player':'ai')&&typeof a.terms==='string'&&a.terms.length<100000);
  if(['pending','approved'].includes(p.status))fail(Object.values(p.approvals).every(a=>a.terms===terms(p)));
  if(p.signedDay!==undefined){fail(int(p.signedDay)&&p.signedDay>=p.createdDay&&p.signedDay<=s.campaign.day&&int(p.deadline)&&p.deadline>p.signedDay&&typeof p.signedTerms==='string'&&p.factions.every(f=>p.approvals[f]?.terms===p.signedTerms));const escrowIds=new Set();for(const e of p.escrow){const c=p.clauses.find(c=>c.id===e.clauseId);fail(c&&!escrowIds.has(e.clauseId)&&int(e.amount)&&e.amount<=c.amount-c.delivered&&['gold','grain','manpower'].includes(e.kind)&&e.kind===(c.kind==='supply'?'grain':c.kind)&&e.cityId===p.sites[e.faction]&&p.factions.includes(e.faction)&&e.faction===c.from);escrowIds.add(e.clauseId);}}
  if(['signed','completed'].includes(p.status))fail(p.signedDay!==undefined&&p.factions.every(f=>p.approvals[f]?.version===p.version));
  if(p.signedDay!==undefined){
   let approved;try{approved=JSON.parse(p.signedTerms);}catch{fail(false);}fail(approved?.version===p.version&&JSON.stringify(approved.sites)===JSON.stringify(p.sites)&&Array.isArray(approved.clauses)&&approved.clauses.length===p.clauses.length);
   const fixed=['kind','from','to','amount','gift','duration','cityId','officerId','route','resource','quota','unitPrice','deferred','dueOffset','milestone','aid','information','targetId','enemy','officerIds','troops','days','task','deadline','deploymentId','armyIds','troopCap','renews','startDay','contractId','after'];
   for(const original of approved.clauses){const c=p.clauses.find(c=>c.id===original.id);fail(c);for(const key of new Set([...Object.keys(original),...fixed,...(original.kind==='deploy'?[]:['armyId'])])){if(key==='kind'&&original.kind==='spoils'&&c.kind==='city')continue;fail(JSON.stringify(c[key])===JSON.stringify(original[key]));}}
  }
  if(p.parentId){const parent=d.contracts.find(x=>x.id===p.parentId),frame=parent?.clauses.find(x=>x.id===p.frameClauseId&&x.kind==='trade');fail(parent&&frame&&p.version===parent.version&&p.factions.every(f=>p.sites[f]===parent.sites[f]&&p.approvals[f]?.sourceContractId===parent.id&&p.approvals[f].controller===parent.approvals[f].controller)&&p.clauses.filter(c=>!['envoyPass','tradePass'].includes(c.kind)).length===2);const grain=p.clauses.find(c=>c.kind==='grain'),gold=p.clauses.find(c=>c.kind==='gold');fail(grain&&gold&&grain.amount<=frame.quota&&gold.amount===Math.ceil(grain.amount*frame.unitPrice)&&gold.from===grain.to&&gold.to===grain.from);}
 }
 for(const [pair,w]of Object.entries(d.wars))fail(pair.split(':').length===2&&pair.split(':').every(f=>FACTIONS[f])&&typeof w.active==='boolean'&&int(w.day)&&w.day<=s.campaign.day);
 for(const [f,p]of Object.entries(d.policies))fail(FACTIONS[f]&&GOALS[p.goal]&&['goldReserve','grainReserve','manpowerReserve','feeBudget','fees','feeTurn'].every(k=>int(p[k]))&&(p.target===null||FACTIONS[p.target]));
 for(const a of d.assignments)fail(a.projectId===null||ids.has(a.projectId)&&[...d.proposals,...d.contracts].some(p=>p.id===a.projectId&&p.officerId===a.officerId));
 for(const o of servingPeople(s).values()){validateDiplomaticMission(s,o.unit);const m=o.unit.mission;if(m?.type==='diplomacy'){const p=[...d.proposals,...d.contracts].find(p=>p.id===m.projectId);fail(p&&p.factions.includes(m.faction)&&(m.clauseId===null||p.clauses.some(c=>c.id===m.clauseId))&&['envoy','cargo','prisoner','handover','evacuation','collect-cargo','collect-prisoner','collect-handover','collect-evacuation'].includes(m.purpose)&&typeof m.cancelled==='boolean'&&typeof m.workDone==='boolean');if(m.cargo){const c=p.clauses.find(c=>c.id===m.clauseId);fail(c.kind===m.cargo.kind&&m.cargo.amount<=c.amount-c.delivered);}}}
 for(const a of s.armies)if(a.diplomaticTask){const t=a.diplomaticTask,p=d.contracts.find(p=>p.id===t.contractId),c=p?.clauses.find(c=>c.id===t.clauseId&&c.kind==='deploy');fail(c&&c.armyId===a.id&&c.from===a.faction&&c.to===t.recipient&&c.enemy===t.enemy&&int(t.untilDay));}
 for(const t of s.campaign.domestic.people)if(t.diplomaticLock){const p=d.contracts.find(p=>p.id===t.diplomaticLock);fail(t.status==='CAPTIVE'&&p&&(p.clauses.some(c=>c.kind==='prisoner'&&c.officerId===t.id)||t.diplomaticEscort)&&(!t.diplomaticEscort||servingPeople(s).get(t.diplomaticEscort)?.unit.mission?.projectId===p.id));}
}
