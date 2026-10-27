import {observeBanditCamps,knownBanditCamps} from './bandit-state.mjs';
import {generatedOfficer,validGeneratedOfficer} from './generated-officers.mjs';
import {campaignDate} from './national-scenarios.mjs';
import {mapNode} from './map-node-data.mjs';
import {BUILDING_DESIGNS} from './data/design/buildings.mjs';
import {cityVisionRadius} from './city-technology.mjs';
import {roadDistance,roadCost} from './road-metrics.mjs';
import {inheritRoadQueries} from './road-network.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {playerFaction} from './player-faction.mjs';
import {NATIONAL_FACTIONS as FACTIONS} from './national-scenarios.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {scoutAssignments,scoutVisionProxy} from './scouting-state.mjs';
import {activityByFaction,activityByDay} from './activity-query-index.mjs';
import {metropolitanRegions,regionContains} from './metropolitan-region-data.mjs';
import {regionalWatchtower} from './regional-watchtower.mjs';

const perspective=Symbol('intelligence perspective');
const origin=Symbol('intelligence origin');
const observationSignatures=new WeakMap();
const queryScopes=new WeakMap();
// Sharing is limited to one synchronous, read-only evaluation. Never retain a
// projected world across an appointment, payment, movement or observation.
export function withIntelligenceQueries(s,evaluate){
 s=s[origin]||s;if(queryScopes.has(s))return evaluate();
 queryScopes.set(s,{sources:new Map(),views:new Map(),supplyViews:new Map(),armies:new Map(),unknown:new Map()});
 try{return evaluate();}finally{queryScopes.delete(s);}
}
const clone=x=>structuredClone(x);
export const visionEnabled=s=>!!s.campaign?.vision;
export function visionPosition(s,o){
 const t=o.travel;
 if(!t)return mapNode(s,o.location);
 const a=mapNode(s,t.from),b=mapNode(s,t.to),p=t.progress/roadDistance(s,t.from,t.to);
 return {x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p};
}
export function missionVisionProxy(s,u){
 const m=u.mission,to=m.route[0];
 return {location:m.location,travel:to?{from:m.location,to,progress:roadDistance(s,m.location,to)*m.progress/roadCost(s,m.location,to)}:null};
}
export function armyVisionRadius(a){
 const intellect=Math.max(0,...a.units.filter(u=>u.id===a.leader||u.id===a.advisor).map(u=>u.intellect));
 return MOVEMENT_RULES.vision.army+intellect*MOVEMENT_RULES.vision.armyIntellectPerPoint;
}
export function visionSources(s,faction=playerFaction(s)){
 s=s[origin]||s;const scope=queryScopes.get(s);if(scope?.sources.has(faction))return scope.sources.get(faction);
 const rules=MOVEMENT_RULES.vision,sources=[],areas=new Map();
 if(s.campaign.scenarioId)for(const region of metropolitanRegions(s)){
  if(!areas.has(region.ownerId))areas.set(region.ownerId,[]);areas.get(region.ownerId).push(region);
 }
 for(const c of s.cities)if(c.owner===faction){
  const tower=regionalWatchtower(c);
  sources.push({...c,radius:tower?rules.city:cityVisionRadius(c,rules.city),kind:'city',regions:areas.get(c.id)||[]});
  if(tower?.radius)sources.push({...tower,kind:'watchtower',object:{location:c.id}});
 }
 for(const a of s.armies)if(a.faction===faction&&!a.disbanded&&a.units.some(u=>u.troops>0))sources.push({...visionPosition(s,a),radius:armyVisionRadius(a),kind:'army',object:a});
 for(const t of scoutAssignments(s))if(t.faction===faction&&!t.paused){const proxy=scoutVisionProxy(s,t);sources.push({...visionPosition(s,proxy),radius:rules.scout,kind:'scout',object:proxy});}
 for(const v of s.campaign.vision?.factions[faction]?.scouted||[])if(v.expiresDay>s.campaign.day)sources.push({...v,radius:rules.scout,kind:'scout',object:{location:v.location,travel:v.travel}});
 scope?.sources.set(faction,sources);return sources;
}
const sourceContains=(v,p)=>Math.hypot(p.x-v.x,p.y-v.y)<=v.radius||v.regions?.some(r=>regionContains(r,p));
export function pointVisible(s,point,faction=playerFaction(s),sources=null){
 if(!visionEnabled(s))return true;
 return !!point&&(sources||visionSources(s,faction)).some(v=>sourceContains(v,point));
}
export function directPointVisible(s,point,faction=playerFaction(s)){
 if(!visionEnabled(s))return true;return !!point&&visionSources(s,faction).some(v=>v.kind!=='scout'&&sourceContains(v,point));
}
export function cityVisible(s,id,faction=playerFaction(s),sources=null){return pointVisible(s,mapNode(s[origin]||s,id),faction,sources);}
export function armyVisible(s,a,faction=playerFaction(s),sources=null){
 return !a.disbanded&&(a.faction===faction||pointVisible(s,visionPosition(s[origin]||s,a),faction,sources));
}
export function battleVisible(s,r,faction=playerFaction(s),sources=null){
 return !visionEnabled(s)||r.battle?.sides.some(x=>x.faction===faction)||pointVisible(s,r.point,faction,sources);
}
export function initializeVision(s){
 const factions=[...new Set(s.cities.map(c=>c.owner).filter(f=>f!=='neutral'))];
 s.campaign.vision={version:3,explored:'national',factions:Object.fromEntries(factions.map(f=>[f,{cities:{},armies:{},towers:{},scouted:[],nextSightId:1,battles:[],chronicle:clone(s.logs)}]))};
 // Geography and the opening political map are common knowledge; garrisons are not.
 for(const record of Object.values(s.campaign.vision.factions))for(const c of s.cities)record.cities[c.id]={day:null,owner:c.owner,data:null};
 updateVision(s);
}
export function updateVision(s){
 const vision=s.campaign.vision;if(!vision)return;
 let signatures=observationSignatures.get(s);if(!signatures){signatures=new Map();observationSignatures.set(s,signatures);}
 const today=activityByDay(s.campaign.activity?.nodes||[],s.campaign.day);
 const observedCities=new Map();
 for(const [f,record]of Object.entries(vision.factions)){
  record.scouted=record.scouted.filter(v=>v.expiresDay>s.campaign.day);
  const sources=visionSources(s,f),visible=p=>pointVisible(s,p,f,sources);
  observeBanditCamps(s,f,p=>sources.some(v=>['army','scout'].includes(v.kind)&&Math.hypot(v.x-p.x,v.y-p.y)<=v.radius));
  for(const c of s.cities){const tower=regionalWatchtower(c);if(tower&&(c.owner===f||visible(tower)))record.towers[c.id]={day:s.campaign.day,data:clone(tower)};
   else if(record.towers?.[c.id]?.data.owner===f)record.towers[c.id]={day:s.campaign.day,data:{...record.towers[c.id].data,owner:c.owner}};
  }
  for(const c of s.cities)if(c.owner===f||visible(c)){
   let observed=observedCities.get(c.id);
   if(!observed){const data={...c,units:c.units.filter(u=>!u.mission)};observed={data,signature:JSON.stringify([s.campaign.day,data])};observedCities.set(c.id,observed);}
   const key=f+':'+c.id,signature=observed.signature;
   if(signatures.get(key)===signature&&record.cities[c.id]?.day===s.campaign.day)continue;signatures.set(key,signature);
   record.cities[c.id]={day:s.campaign.day,owner:c.owner,data:clone(observed.data)};
  }
  else if(record.cities[c.id]?.owner===f){const old=record.cities[c.id];record.cities[c.id]={...old,day:s.campaign.day,owner:c.owner,data:old.data?{...old.data,owner:c.owner}:null};}
  for(const a of s.armies)if(!a.disbanded&&a.faction!==f&&visible(visionPosition(s,a)))record.armies[a.id]={day:s.campaign.day,receivedDay:s.campaign.day,data:armyObservation(s,a)};
  // A glimpse of a foreign battle does not reveal its later, unseen outcome.
  for(const r of s.campaign.battles)if((r.battle.sides.some(x=>x.faction===f)||r.settled&&visible(r.point))&&!record.battles.includes(r.id))record.battles.push(r.id);
  record.battles=record.battles.filter(id=>s.campaign.battles.some(r=>r.id===id)||s.campaign.archive?.some(r=>r.id===id));
  const known=new Set(record.chronicle.map(l=>l.sourceId));
  for(const n of today)if((n.faction===f||n.cityId&&!n.phase.startsWith('SCOUT')&&visible(mapNode(s,n.cityId)))&&!known.has(n.sourceId)){record.chronicle.unshift({turn:Math.floor((n.day-1)/10)+1,type:n.category==='battle'?'war':'event',text:n.text,sourceId:n.sourceId});known.add(n.sourceId);}
  record.chronicle=record.chronicle.slice(0,300);
 }
}
export function cityIntelligence(s,id,faction=playerFaction(s)){
 const base=s[origin]||s,c=mapNode(base,id),live=cityVisible(base,id,faction),record=base.campaign.vision?.factions[faction]?.cities[id];
 return {visible:live,day:live?base.campaign.day:record?.day??null,owner:live?c?.owner:record?.owner||'neutral',data:live?c:record?.data||null};
}
export function intelligenceLabel(s,id){const i=cityIntelligence(s,id);if(i.visible){const base=s[origin]||s,p=mapNode(base,id),until=Math.max(0,...(base.campaign.vision.factions[playerFaction(s)]?.scouted||[]).filter(v=>Math.hypot(v.x-p.x,v.y-p.y)<=MOVEMENT_RULES.vision.scout).map(v=>v.expiresDay));return !directPointVisible(base,p)&&until>base.campaign.day?`当前视野 · 侦察视野剩余 ${until-base.campaign.day} 天`:'当前视野';}return i.day===null?'尚未侦察':`${campaignDate(s,{day:i.day})}情报 · 已失去视野`;}
export function armyObservation(s,a){
 const data=clone(a),battle=s.campaign.battles.find(r=>!r.settled&&r.armyIds.includes(a.id));
 if(battle)for(const u of data.units){const live=battle.battle.sides.flatMap(side=>side.units).find(x=>x.id===u.id&&x.armyId===a.id);if(live)u.troops=live.hp;}
 return {...data,route:[],target:null,supplyLine:null,task:a.travel?'行军中':'驻扎'};
}
export function armyIntelligence(s,id,faction=playerFaction(s)){
 const base=s[origin]||s,a=base.armies.find(a=>a.id===id),live=a&&(a.faction===faction||pointVisible(base,visionPosition(base,a),faction));
 return live?{day:base.campaign.day,receivedDay:base.campaign.day,data:a.faction===faction?a:armyObservation(base,a)}:base.campaign.vision?.factions[faction]?.armies[id]||null;
}
function unknownCity(c,owner,scope=null){
 const key=c.id+':'+owner;if(scope?.unknown.has(key))return scope.unknown.get(key);
 const data={...c,owner,units:[],governor:null,project:null,domestic:null,buildings:null,payroll:null};
 for(const key of ['gold','grain','manpower',...Object.keys(BUILDING_DESIGNS),'order','hunger','garrison'])data[key]=null;
 scope?.unknown.set(key,data);return data;
}
function projectedCity(s,c,faction,visible,scope){
 if(c.owner===faction||visible)return c;
 const i=s.campaign.vision.factions[faction]?.cities[c.id];return i?.data||unknownCity(c,i?.owner||'neutral',scope);
}
// The same city value as intelligenceWorld, without projecting other cities,
// armies, personnel or history. Views remain read-only and never persist here.
export function cityObservation(s,id,faction=playerFaction(s)){
 if(!visionEnabled(s)||s[perspective]===faction)return mapNode(s,id);
 s=s[origin]||s;const c=mapNode(s,id);
 if(!c||!s.cities.includes(c))return c;
 return projectedCity(s,c,faction,c.owner===faction||cityVisible(s,id,faction),queryScopes.get(s));
}
function observedBattle(s,r,faction){
 if(r.battle.sides.some(x=>x.faction===faction))return r;
 // Foreign battles expose the present observation, not earlier unseen days.
 const battle={...r.battle,logs:[]};
 return {...r,battle,templates:{},snapshots:[{day:s.campaign.day,tick:battle.tick,data:battle}],report:r.report?{reason:r.report.reason,winner:r.report.winner,growth:[],stats:[]}:null};
}
function observedBattles(s,faction,sources){return s.campaign.battles.filter(r=>battleVisible(s,r,faction,sources)).map(r=>observedBattle(s,r,faction));}
// The army projection is also used by read-only threat assessments. Preserve
// the caller's perspective without building unrelated city and history views.
export function observedArmies(s,faction=playerFaction(s)){
 if(!visionEnabled(s)||s[perspective]===faction)return s.armies;
 s=s[origin]||s;if(!s.armies.length)return s.armies;
 const scope=queryScopes.get(s);if(scope?.armies.has(faction))return scope.armies.get(faction);
 const sources=visionSources(s,faction);
 const result=s.armies.filter(a=>armyVisible(s,a,faction,sources)).map(a=>a.faction===faction?a:armyObservation(s,a));scope?.armies.set(faction,result);return result;
}
// Depot routing reads geography, legal city/army observations, battles and
// passage permissions. It never needs a personnel directory or work history.
// Keep this contract narrow; it is not a world for decisions or execution.
export function supplyRoutingWorld(s,faction){
 if(!visionEnabled(s)||s[perspective]===faction)return s;
 return withIntelligenceQueries(s,()=>readSupplyRoutingWorld(s,faction));
}
function readSupplyRoutingWorld(s,faction){
 const base=s[origin]||s,scope=queryScopes.get(base);
 if(scope?.supplyViews.has(faction))return scope.supplyViews.get(faction);
 const sources=visionSources(base,faction),result={
  cities:base.cities.map(c=>projectedCity(base,c,faction,c.owner===faction||pointVisible(base,c,faction,sources),scope)),armies:observedArmies(s,faction),
  roads:base.roads,junctions:base.junctions,roadSegments:base.roadSegments,
  campaign:{day:base.campaign.day,scenarioId:base.campaign.scenarioId,playerFaction:faction,
   battles:s[perspective]===faction?s.campaign.battles:observedBattles(base,faction,sources),diplomacy:base.campaign.diplomacy}
 };
 inheritRoadQueries(base,result);scope?.supplyViews.set(faction,result);return result;
}
// All UI consumers use this read-only projection; never pass it to a mutation.
export function intelligenceWorld(s,faction=playerFaction(s)){
 if(!visionEnabled(s)||s[perspective]===faction)return s;
 s=s[origin]||s;const scope=queryScopes.get(s);if(scope?.views.has(faction))return scope.views.get(faction);
 const record=s.campaign.vision.factions[faction],sources=visionSources(s,faction),visibleCities=new Set(s.cities.filter(c=>cityVisible(s,c.id,faction,sources)).map(c=>c.id));
 const cities=s.cities.map(c=>projectedCity(s,c,faction,visibleCities.has(c.id),scope));
 const armies=s.armies.filter(a=>armyVisible(s,a,faction,sources)).map(a=>a.faction===faction?a:armyObservation(s,a));
 const idle=s.campaign.idle.filter(o=>o.faction===faction||!o.unit.mission&&!o.destination&&!o.retreating&&visibleCities.has(o.location));
 const ownIds=new Set([...s.cities.filter(c=>c.owner===faction).flatMap(c=>c.units),...s.armies.filter(a=>a.faction===faction).flatMap(a=>a.units),...s.campaign.idle.filter(o=>o.faction===faction).map(o=>o.unit)].map(u=>u.id));
 const activity=s.campaign.activity;
 // Most strategy queries only inspect cities and armies. Defer the potentially
 // large factual list until requested, retaining this projection's boundary.
 const activityNodes=activity?.nodes,throughSequence=activityNodes?.at(-1)?.sequence??0;
 let projectedNodes;
 const projectedActivity=activity?{...activity,meritTotals:{[faction]:activity.meritTotals[faction]||{}},records:Object.fromEntries(Object.entries(activity.records).filter(([id])=>ownIds.has(id))),
  get nodes(){return projectedNodes??=activityByFaction(activityNodes,faction,throughSequence);},
  set nodes(value){projectedNodes=value;}}:activity;
 const campaign={...s.campaign,bandits:s.campaign.bandits?{version:s.campaign.bandits.version,camps:knownBanditCamps(s,faction),observations:{[faction]:s.campaign.bandits.observations[faction]||{}}}:undefined,playerFaction:faction,idle,scouting:{...s.campaign.scouting,tasks:scoutAssignments(s).filter(t=>t.faction===faction)},battles:observedBattles(s,faction,sources),archive:(s.campaign.archive||[]).filter(r=>record?.battles.includes(r.id)),
  personnelEvents:s.campaign.personnelEvents.filter(e=>ownIds.has(e.officerId)),ai:s.campaign.ai?{...s.campaign.ai,factions:{},plans:[],supports:[],decisions:[]}:undefined,
  domestic:{...s.campaign.domestic,loyalty:Object.fromEntries(Object.entries(s.campaign.domestic.loyalty).filter(([id])=>ownIds.has(id))),priorities:{[faction]:s.campaign.domestic.priorities[faction]},orders:s.campaign.domestic.orders.filter(q=>q.faction===faction),assignments:s.campaign.domestic.assignments.filter(a=>ownIds.has(a.officerId)),people:s.campaign.domestic.people.filter(p=>p.fate&&(p.fate.originalFaction===faction||p.fate.captor===faction))},
  activity:projectedActivity};
 const result={...s,cities,armies,campaign,logs:record?.chronicle||[]};result[perspective]=faction;result[origin]=s;inheritRoadQueries(s,result);scope?.views.set(faction,result);return result;
}
export function fogMarkup(s,id='world-fog',project=null){
 if(!visionEnabled(s))return '';
 const circles=visionSources(s).map(v=>{const p=project?(v.kind==='city'?project({location:v.id}):project(v.object)):v;return `<circle cx="${p.x}" cy="${p.y}" r="${v.radius}" fill="url(#${id}-edge)"/>`+(!project?(v.regions||[]).map(r=>`<polygon data-vision-region="${r.id}" points="${r.points}" fill="black" stroke="black" stroke-width=".08"/>`).join(''):'');}).join('');
 return `<defs><radialGradient id="${id}-edge"><stop offset="0" stop-color="black"/><stop offset=".42" stop-color="black"/><stop offset=".74" stop-color="black" stop-opacity=".55"/><stop offset="1" stop-color="black" stop-opacity="0"/></radialGradient><mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="white"/>${circles}</mask></defs><g class="war-fog" aria-hidden="true" pointer-events="none"><rect width="1024" height="1024" fill="#515a55" opacity=".36" mask="url(#${id}-mask)"/></g>`;
}
export function watchtowerObservations(s,faction=playerFaction(s)){
 const base=s[origin]||s,result=new Map(Object.entries(base.campaign.vision?.factions[faction]?.towers||{}));
 const sources=visionSources(base,faction),visible=p=>pointVisible(base,p,faction,sources);
 for(const c of base.cities){const tower=regionalWatchtower(c);if(tower&&(c.owner===faction||visible(tower)))result.set(c.id,{day:base.campaign.day,data:tower});}
 return [...result.values()].map(r=>({...r,visible:base.cities.find(c=>c.id===r.data.cityId)?.owner===faction||visible(r.data)}));
}
export function validateVision(s){
 const v=s.campaign.vision,fail=x=>{if(!x)throw Error('战争迷雾情报存档无效');};
 fail(v?.version===3&&v.explored==='national'&&v.factions&&typeof v.factions==='object'&&!Array.isArray(v.factions));
 fail(Object.keys(v.factions).length>0&&Object.keys(v.factions).length<=Object.keys(FACTIONS).length);
 for(const [f,r]of Object.entries(v.factions)){
  fail(r.towers&&typeof r.towers==='object'&&!Array.isArray(r.towers)&&Object.keys(r.towers).length<=s.cities.length);
  for(const [id,t]of Object.entries(r.towers||{})){
   const a=t?.data,c=s.cities.find(c=>c.id===id),area=c&&metropolitanRegions(s).find(p=>p.id===a?.siteId&&p.ownerId===id);
   fail(c&&a?.cityId===id&&area&&Number.isFinite(a.x)&&Number.isFinite(a.y)&&regionContains(area,a)&&Number.isSafeInteger(t.day)&&t.day>=1&&t.day<=s.campaign.day&&(a.owner==='neutral'||Object.hasOwn(FACTIONS,a.owner))&&typeof a.name==='string'&&['active','damaged','construction'].includes(a.phase)&&Number.isFinite(a.progress)&&a.progress>=0&&a.progress<=100&&[0,32,38].includes(a.radius)&&Number.isSafeInteger(a.hp)&&a.hp>=0&&Number.isSafeInteger(a.maxHp)&&a.maxHp>0&&a.hp<=a.maxHp);
  }
  fail(Object.hasOwn(FACTIONS,f)&&r&&r.cities&&Object.keys(r.cities).length===s.cities.length&&Array.isArray(r.battles)&&new Set(r.battles).size===r.battles.length&&r.battles.length<=1100&&r.battles.every(id=>s.campaign.battles.some(b=>b.id===id)||s.campaign.archive?.some(b=>b.id===id))&&Array.isArray(r.chronicle)&&r.chronicle.length<=300);
  for(const c of s.cities){const i=r.cities[c.id];fail(i&&(i.owner==='neutral'||Object.hasOwn(FACTIONS,i.owner))&&(i.day===null?i.data===null:Number.isSafeInteger(i.day)&&i.day>=1&&i.day<=s.campaign.day&&i.data?.id===c.id&&i.data.owner===i.owner));
   if(i.data){const d=i.data;fail(d.x===c.x&&d.y===c.y&&Array.isArray(d.units)&&d.units.length<=Object.keys(OFFICER_BY_ID).length&&d.units.every(u=>Object.hasOwn(OFFICER_BY_ID,u.id)&&Number.isFinite(u.troops)&&u.troops>=0&&!u.mission));for(const k of ['gold','grain','manpower','walls','granary','farm','commerce','barracks'])fail(Number.isFinite(d[k])&&d[k]>=0);}
  }
  fail(Array.isArray(r.scouted)&&r.scouted.length<=10000&&Number.isSafeInteger(r.nextSightId)&&r.nextSightId>=1&&new Set(r.scouted.map(v=>v.id)).size===r.scouted.length);
  for(const sight of r.scouted)fail(Number.isSafeInteger(sight.id)&&sight.id>=1&&sight.id<r.nextSightId&&Object.hasOwn(OFFICER_BY_ID,sight.officerId)&&Number.isFinite(sight.x)&&Number.isFinite(sight.y)&&Number.isSafeInteger(sight.seenDay)&&sight.seenDay>=1&&sight.seenDay<=s.campaign.day&&Number.isSafeInteger(sight.expiresDay)&&sight.expiresDay>sight.seenDay&&sight.expiresDay<=s.campaign.day+MOVEMENT_RULES.scouting.baseMaximumDays+MOVEMENT_RULES.scouting.intellectExtension&&mapNode(s,sight.location)&&(!sight.travel||Number.isFinite(roadCost(s,sight.travel.from,sight.travel.to))&&sight.travel.from===sight.location&&Number.isFinite(sight.travel.progress)&&sight.travel.progress>=0&&sight.travel.progress<=roadDistance(s,sight.travel.from,sight.travel.to)));
  fail(r.armies&&typeof r.armies==='object'&&!Array.isArray(r.armies)&&Object.keys(r.armies).length<=200);
  for(const [id,i]of Object.entries(r.armies))fail(/^a\d+$/.test(id)&&Number.isSafeInteger(i.day)&&i.day>=1&&i.day<=s.campaign.day&&Number.isSafeInteger(i.receivedDay)&&i.receivedDay>=i.day&&i.receivedDay<=s.campaign.day&&i.data?.id===id&&(i.data.faction==='neutral'||Object.hasOwn(FACTIONS,i.data.faction))&&Array.isArray(i.data.units)&&i.data.units.every(u=>(Object.hasOwn(OFFICER_BY_ID,u.id)||validGeneratedOfficer(u))&&Number.isFinite(u.troops)&&u.troops>=0)&&i.data.route?.length===0&&i.data.target===null&&i.data.supplyLine===null);
  fail(r.chronicle.every(l=>Number.isSafeInteger(l.turn)&&l.turn>=1&&typeof l.type==='string'&&typeof l.text==='string'&&l.text.length<2000));
 }
 fail(s.cities.every(c=>c.owner==='neutral'||Object.hasOwn(v.factions,c.owner)));
}
