import {mapNode} from './map-node-data.mjs';
import {BUILDING_DESIGNS} from './data/design/buildings.mjs';
import {cityVisionRadius} from './city-technology.mjs';
import {roadDistance,roadCost} from './road-metrics.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {playerFaction} from './player-faction.mjs';
import {NATIONAL_FACTIONS as FACTIONS} from './national-scenarios.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {scoutAssignments,scoutVisionProxy} from './scouting-state.mjs';

const perspective=Symbol('intelligence perspective');
const origin=Symbol('intelligence origin');
const observationSignatures=new WeakMap();
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
 s=s[origin]||s;const rules=MOVEMENT_RULES.vision,sources=[];
 for(const c of s.cities)if(c.owner===faction)sources.push({...c,radius:cityVisionRadius(c,rules.city),kind:'city'});
 for(const a of s.armies)if(a.faction===faction&&!a.disbanded&&a.units.some(u=>u.troops>0))sources.push({...visionPosition(s,a),radius:armyVisionRadius(a),kind:'army',object:a});
 for(const t of scoutAssignments(s))if(t.faction===faction&&!t.paused){const proxy=scoutVisionProxy(s,t);sources.push({...visionPosition(s,proxy),radius:rules.scout,kind:'scout',object:proxy});}
 for(const v of s.campaign.vision?.factions[faction]?.scouted||[])if(v.expiresDay>s.campaign.day)sources.push({...v,radius:rules.scout,kind:'scout',object:{location:v.location,travel:v.travel}});
 return sources;
}
export function pointVisible(s,point,faction=playerFaction(s),sources=null){
 if(!visionEnabled(s))return true;
 return !!point&&(sources||visionSources(s,faction)).some(v=>Math.hypot(point.x-v.x,point.y-v.y)<=v.radius);
}
export function directPointVisible(s,point,faction=playerFaction(s)){
 if(!visionEnabled(s))return true;return !!point&&visionSources(s,faction).some(v=>v.kind!=='scout'&&Math.hypot(point.x-v.x,point.y-v.y)<=v.radius);
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
 s.campaign.vision={version:2,explored:'national',factions:Object.fromEntries(factions.map(f=>[f,{cities:{},armies:{},scouted:[],nextSightId:1,battles:[],chronicle:clone(s.logs)}]))};
 // Geography and the opening political map are common knowledge; garrisons are not.
 for(const record of Object.values(s.campaign.vision.factions))for(const c of s.cities)record.cities[c.id]={day:null,owner:c.owner,data:null};
 updateVision(s);
}
export function updateVision(s){
 const vision=s.campaign.vision;if(!vision)return;
 let signatures=observationSignatures.get(s);if(!signatures){signatures=new Map();observationSignatures.set(s,signatures);}
 const today=(s.campaign.activity?.nodes||[]).filter(n=>n.day===s.campaign.day);
 const observedCities=new Map();
 for(const [f,record]of Object.entries(vision.factions)){
  record.scouted=record.scouted.filter(v=>v.expiresDay>s.campaign.day);
  const sources=visionSources(s,f),visible=p=>!!p&&sources.some(v=>Math.hypot(p.x-v.x,p.y-v.y)<=v.radius);
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
export function intelligenceLabel(s,id){const i=cityIntelligence(s,id);if(i.visible){const base=s[origin]||s,p=mapNode(base,id),until=Math.max(0,...(base.campaign.vision.factions[playerFaction(s)]?.scouted||[]).filter(v=>Math.hypot(v.x-p.x,v.y-p.y)<=MOVEMENT_RULES.vision.scout).map(v=>v.expiresDay));return !directPointVisible(base,p)&&until>base.campaign.day?`当前视野 · 侦察视野剩余 ${until-base.campaign.day} 天`:'当前视野';}return i.day===null?'尚未侦察':`第 ${i.day} 天情报 · 已失去视野`;}
export function armyObservation(s,a){
 const data=clone(a),battle=s.campaign.battles.find(r=>!r.settled&&r.armyIds.includes(a.id));
 if(battle)for(const u of data.units){const live=battle.battle.sides.flatMap(side=>side.units).find(x=>x.id===u.id&&x.armyId===a.id);if(live)u.troops=live.hp;}
 return {...data,route:[],target:null,supplyLine:null,task:a.travel?'行军中':'驻扎'};
}
export function armyIntelligence(s,id,faction=playerFaction(s)){
 const base=s[origin]||s,a=base.armies.find(a=>a.id===id),live=a&&(a.faction===faction||pointVisible(base,visionPosition(base,a),faction));
 return live?{day:base.campaign.day,receivedDay:base.campaign.day,data:a.faction===faction?a:armyObservation(base,a)}:base.campaign.vision?.factions[faction]?.armies[id]||null;
}
function unknownCity(c,owner){
 const data={...c,owner,units:[],governor:null,project:null,domestic:null,buildings:null};
 for(const key of ['gold','grain','manpower',...Object.keys(BUILDING_DESIGNS),'order','hunger','garrison'])data[key]=null;
 return data;
}
// The same city value as intelligenceWorld, without projecting other cities,
// armies, personnel or history. Views remain read-only and never persist here.
export function cityObservation(s,id,faction=playerFaction(s)){
 if(!visionEnabled(s)||s[perspective]===faction)return mapNode(s,id);
 s=s[origin]||s;const c=mapNode(s,id);
 if(!c||!s.cities.includes(c)||c.owner===faction||cityVisible(s,id,faction))return c;
 const i=s.campaign.vision.factions[faction]?.cities[id];
 return i?.data||unknownCity(c,i?.owner||'neutral');
}
function observedBattle(s,r,faction){
 if(r.battle.sides.some(x=>x.faction===faction))return r;
 // Foreign battles expose the present observation, not earlier unseen days.
 const battle={...r.battle,logs:[]};
 return {...r,battle,templates:{},snapshots:[{day:s.campaign.day,tick:battle.tick,data:battle}],report:r.report?{reason:r.report.reason,winner:r.report.winner,growth:[],stats:[]}:null};
}
// The army projection is also used by read-only threat assessments. Preserve
// the caller's perspective without building unrelated city and history views.
export function observedArmies(s,faction=playerFaction(s)){
 if(!visionEnabled(s)||s[perspective]===faction)return s.armies;
 s=s[origin]||s;if(!s.armies.length)return s.armies;
 const sources=visionSources(s,faction);
 return s.armies.filter(a=>armyVisible(s,a,faction,sources)).map(a=>a.faction===faction?a:armyObservation(s,a));
}
// All UI consumers use this read-only projection; never pass it to a mutation.
export function intelligenceWorld(s,faction=playerFaction(s)){
 if(!visionEnabled(s)||s[perspective]===faction)return s;
 s=s[origin]||s;const record=s.campaign.vision.factions[faction],sources=visionSources(s,faction),visibleCities=new Set(s.cities.filter(c=>cityVisible(s,c.id,faction,sources)).map(c=>c.id));
 const cities=s.cities.map(c=>{
  if(c.owner===faction||visibleCities.has(c.id))return c;
  const i=record?.cities[c.id];return i?.data?i.data:unknownCity(c,i?.owner||'neutral');
 });
 const armies=s.armies.filter(a=>armyVisible(s,a,faction,sources)).map(a=>a.faction===faction?a:armyObservation(s,a));
 const idle=s.campaign.idle.filter(o=>o.faction===faction||!o.unit.mission&&!o.destination&&!o.retreating&&visibleCities.has(o.location));
 const ownIds=new Set([...s.cities.filter(c=>c.owner===faction).flatMap(c=>c.units),...s.armies.filter(a=>a.faction===faction).flatMap(a=>a.units),...s.campaign.idle.filter(o=>o.faction===faction).map(o=>o.unit)].map(u=>u.id));
 const activity=s.campaign.activity;
 const campaign={...s.campaign,playerFaction:faction,idle,scouting:{...s.campaign.scouting,tasks:scoutAssignments(s).filter(t=>t.faction===faction)},battles:s.campaign.battles.filter(r=>battleVisible(s,r,faction,sources)).map(r=>observedBattle(s,r,faction)),archive:(s.campaign.archive||[]).filter(r=>record?.battles.includes(r.id)),
  personnelEvents:s.campaign.personnelEvents.filter(e=>ownIds.has(e.officerId)),ai:s.campaign.ai?{...s.campaign.ai,factions:{},plans:[],supports:[],decisions:[]}:undefined,
  domestic:{...s.campaign.domestic,priorities:{[faction]:s.campaign.domestic.priorities[faction]},orders:s.campaign.domestic.orders.filter(q=>q.faction===faction),assignments:s.campaign.domestic.assignments.filter(a=>ownIds.has(a.officerId)),people:s.campaign.domestic.people.filter(p=>p.fate&&(p.fate.originalFaction===faction||p.fate.captor===faction))},
  activity:activity?{...activity,records:Object.fromEntries(Object.entries(activity.records).filter(([id])=>ownIds.has(id))),nodes:activity.nodes.filter(n=>n.faction===faction)}:activity};
 const result={...s,cities,armies,campaign,logs:record?.chronicle||[]};result[perspective]=faction;result[origin]=s;return result;
}
export function fogMarkup(s,id='world-fog',project=null){
 if(!visionEnabled(s))return '';
 const circles=visionSources(s).map(v=>{const p=project?(v.kind==='city'?project({location:v.id}):project(v.object)):v;return `<circle cx="${p.x}" cy="${p.y}" r="${v.radius}" fill="url(#${id}-edge)"/>`;}).join('');
 return `<defs><radialGradient id="${id}-edge"><stop offset="0" stop-color="black"/><stop offset=".84" stop-color="black"/><stop offset="1" stop-color="black" stop-opacity="0"/></radialGradient><mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="white"/>${circles}</mask></defs><g class="war-fog" aria-hidden="true" pointer-events="none"><rect width="1024" height="1024" fill="#303b42" opacity=".56" mask="url(#${id}-mask)"/></g>`;
}
export function validateVision(s){
 const v=s.campaign.vision,fail=x=>{if(!x)throw Error('战争迷雾情报存档无效');};
 fail(v?.version===2&&v.explored==='national'&&v.factions&&typeof v.factions==='object'&&!Array.isArray(v.factions));
 fail(Object.keys(v.factions).length>0&&Object.keys(v.factions).length<=Object.keys(FACTIONS).length);
 for(const [f,r]of Object.entries(v.factions)){
  fail(Object.hasOwn(FACTIONS,f)&&r&&r.cities&&Object.keys(r.cities).length===s.cities.length&&Array.isArray(r.battles)&&new Set(r.battles).size===r.battles.length&&r.battles.length<=1100&&r.battles.every(id=>s.campaign.battles.some(b=>b.id===id)||s.campaign.archive?.some(b=>b.id===id))&&Array.isArray(r.chronicle)&&r.chronicle.length<=300);
  for(const c of s.cities){const i=r.cities[c.id];fail(i&&(i.owner==='neutral'||Object.hasOwn(FACTIONS,i.owner))&&(i.day===null?i.data===null:Number.isSafeInteger(i.day)&&i.day>=1&&i.day<=s.campaign.day&&i.data?.id===c.id&&i.data.owner===i.owner));
   if(i.data){const d=i.data;fail(d.x===c.x&&d.y===c.y&&Array.isArray(d.units)&&d.units.length<=Object.keys(OFFICER_BY_ID).length&&d.units.every(u=>Object.hasOwn(OFFICER_BY_ID,u.id)&&Number.isFinite(u.troops)&&u.troops>=0&&!u.mission));for(const k of ['gold','grain','manpower','walls','granary','farm','commerce','barracks'])fail(Number.isFinite(d[k])&&d[k]>=0);}
  }
  fail(Array.isArray(r.scouted)&&r.scouted.length<=10000&&Number.isSafeInteger(r.nextSightId)&&r.nextSightId>=1&&new Set(r.scouted.map(v=>v.id)).size===r.scouted.length);
  for(const sight of r.scouted)fail(Number.isSafeInteger(sight.id)&&sight.id>=1&&sight.id<r.nextSightId&&Object.hasOwn(OFFICER_BY_ID,sight.officerId)&&Number.isFinite(sight.x)&&Number.isFinite(sight.y)&&Number.isSafeInteger(sight.seenDay)&&sight.seenDay>=1&&sight.seenDay<=s.campaign.day&&Number.isSafeInteger(sight.expiresDay)&&sight.expiresDay>sight.seenDay&&sight.expiresDay<=s.campaign.day+MOVEMENT_RULES.scouting.baseMaximumDays+MOVEMENT_RULES.scouting.intellectExtension&&mapNode(s,sight.location)&&(!sight.travel||Number.isFinite(roadCost(s,sight.travel.from,sight.travel.to))&&sight.travel.from===sight.location&&Number.isFinite(sight.travel.progress)&&sight.travel.progress>=0&&sight.travel.progress<=roadDistance(s,sight.travel.from,sight.travel.to)));
  fail(r.armies&&typeof r.armies==='object'&&!Array.isArray(r.armies)&&Object.keys(r.armies).length<=200);
  for(const [id,i]of Object.entries(r.armies))fail(/^a\d+$/.test(id)&&Number.isSafeInteger(i.day)&&i.day>=1&&i.day<=s.campaign.day&&Number.isSafeInteger(i.receivedDay)&&i.receivedDay>=i.day&&i.receivedDay<=s.campaign.day&&i.data?.id===id&&(i.data.faction==='neutral'||Object.hasOwn(FACTIONS,i.data.faction))&&Array.isArray(i.data.units)&&i.data.units.every(u=>Object.hasOwn(OFFICER_BY_ID,u.id)&&Number.isFinite(u.troops)&&u.troops>=0)&&i.data.route?.length===0&&i.data.target===null&&i.data.supplyLine===null);
  fail(r.chronicle.every(l=>Number.isSafeInteger(l.turn)&&l.turn>=1&&typeof l.type==='string'&&typeof l.text==='string'&&l.text.length<2000));
 }
 fail(s.cities.every(c=>c.owner==='neutral'||Object.hasOwn(v.factions,c.owner)));
}
