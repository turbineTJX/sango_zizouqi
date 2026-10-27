import {BANDIT_RULES as R} from './data/design/bandits.mjs';
import {GENERATED_STATS,generatedOfficerSource,validGeneratedOfficer} from './generated-officers.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {initializeTacticLearning,validTacticLearning} from './tactic-learning.mjs';
import {emptyEquipment} from './troop-equipment.mjs';
import {mapNode} from './map-node-data.mjs';
import {nationalScenario} from './national-scenarios.mjs';

const clone=x=>structuredClone(x);
export const banditCamps=s=>s.campaign?.bandits?.camps||[];
export const banditCamp=(s,id)=>banditCamps(s).find(c=>c.id===id);
export function banditRandom(s){const b=s.campaign.bandits;b.seed=(Math.imul(b.seed,1664525)+1013904223)>>>0;return b.seed/4294967296;}
export function nationalOfficerAverage(s){
 const people=new Map([...s.cities.flatMap(c=>c.units),...s.armies.filter(a=>!a.banditCampId&&!a.disbanded).flatMap(a=>a.units),...s.campaign.idle.map(o=>o.unit)].filter(u=>OFFICER_BY_ID[u.id]).map(u=>[u.id,u]));
 // Includes officers currently in the world, including captives; future/dead
 // catalogue entries and procedurally generated bandits never enter the mean.
 for(const p of s.campaign.domestic.people)if(['FREE','CAPTIVE'].includes(p.status)){const u=p.unit||{...OFFICER_BY_ID[p.id],level:1};if(u&&!people.has(p.id))people.set(p.id,u);}
 const all=[...people.values()];return Object.fromEntries([...GENERATED_STATS,'level'].map(k=>[k,all.reduce((n,u)=>n+(u[k]??1),0)/Math.max(1,all.length)]));
}
export function initializeBandits(s){
 s.campaign.bandits={version:R.version,seed:(s.seed^0x57b61d23)>>>0,camps:[],observations:{}};
 if(!s.campaign.scenarioId)return;
 const average=nationalOfficerAverage(s),year=nationalScenario(s.campaign.scenarioId).year||200;
 const nodes=(s.junctions||[]).filter(n=>n.kind!=='port').map(n=>({n,rank:banditRandom(s)})).sort((a,b)=>a.rank-b.rank),provinces=new Set(),spread=[];
 for(const entry of nodes)if(!provinces.has(entry.n.province)){provinces.add(entry.n.province);spread.push(entry);}
 const count=Math.min(R.maximumCamps,Math.max(provinces.size,Math.ceil(nodes.length/R.nodeDensity)));
 const selected=[...spread,...nodes.filter(entry=>!spread.includes(entry))].slice(0,count);
 for(const {n} of selected){
  const number=s.campaign.bandits.camps.length+1,id='bandit-camp-'+number,randomInt=(min,max)=>min+Math.floor(banditRandom(s)*(max-min+1)),size=randomInt(R.minGenerals,R.maxGenerals),units=[];
  for(let i=0;i<size;i++){
   const g={version:1,id:`bandit-person-${number}-${i+1}`,seed:randomInt(0,0xffffffff),average:clone(average),year},source=generatedOfficerSource(g),type=['spear','halberd','archer'][randomInt(0,2)];
   const u={...source,generatedOfficer:g,type,aptitudes:{spear:1,halberd:1,cavalry:0,archer:1},equipment:emptyEquipment(),formation:type==='archer'?'back':'front',troops:randomInt(R.minTroops,R.maxTroops),wounded:0,first:true,level:Math.max(1,Math.min(10,Math.round(average.level))),merit:0,homeCity:n.id};initializeTacticLearning(u,g.seed);units.push(u);
  }
  s.campaign.bandits.camps.push({id,nodeId:n.id,name:n.name+'贼寨',createdDay:s.campaign.day,average:clone(average),units,gold:randomInt(R.goldMinimum,R.goldMaximum),grain:randomInt(R.grainMinimum,R.grainMaximum),talentRoll:banditRandom(s),battleId:null,clearedDay:null,winner:null,receipt:null});
 }
}
export function observeBanditCamps(s,faction,visible){
 if(!s.campaign.bandits)return;
 const observations=s.campaign.bandits.observations[faction]??={};
 for(const c of banditCamps(s))if(visible(mapNode(s,c.nodeId))){
  const army=c.battleId&&s.armies.find(a=>a.banditCampId===c.id),units=army?.units||c.units;
  const live=c.battleId&&s.campaign.battles.find(r=>r.id===c.battleId&&!r.settled)?.battle;
  const data={id:c.id,nodeId:c.nodeId,name:c.name,units:clone(units).map(u=>{const b=live?.sides.flatMap(x=>x.units).find(x=>x.id===u.id);return b?{...u,troops:b.hp}:u;}),clearedDay:c.clearedDay};
  observations[c.id]={day:s.campaign.day,data};
 }
}
export function banditIntelligence(s,id,faction=s.campaign.playerFaction){return s.campaign.bandits?.observations[faction]?.[id]||null;}
export function knownBanditCamps(s,faction=s.campaign.playerFaction){return Object.values(s.campaign.bandits?.observations[faction]||{}).map(i=>({...i.data,observedDay:i.day}));}
export function validateBandits(s,fail){
 const b=s.campaign.bandits,int=(x,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
 fail(b?.version===R.version&&int(b.seed,0xffffffff)&&Array.isArray(b.camps)&&b.camps.length<=R.maximumCamps&&b.observations&&typeof b.observations==='object','贼寨存档无效');
 const ids=new Set(),nodes=new Set(),people=new Set();
 for(const c of b.camps){
  fail(/^bandit-camp-\d+$/.test(c.id)&&!ids.has(c.id)&&!nodes.has(c.nodeId)&&s.junctions?.some(n=>n.id===c.nodeId&&n.kind!=='port')&&c.name===mapNode(s,c.nodeId).name+'贼寨'&&int(c.createdDay,s.campaign.day)&&c.createdDay>0&&int(c.gold)&&int(c.grain)&&Number.isFinite(c.talentRoll)&&c.talentRoll>=0&&c.talentRoll<1,'贼寨地点或库存无效');ids.add(c.id);nodes.add(c.nodeId);
  fail(Array.isArray(c.units)&&c.units.length<=R.maxGenerals&&(c.clearedDay===null?c.units.length>0:int(c.clearedDay,s.campaign.day)&&c.clearedDay>=c.createdDay)&&(!c.battleId||s.campaign.battles.some(r=>r.id===c.battleId&&!r.settled&&r.banditCampId===c.id)),'贼寨战斗状态无效');
  for(const u of c.units){fail(validGeneratedOfficer(u)&&!people.has(u.id)&&JSON.stringify(u.generatedOfficer.average)===JSON.stringify(c.average)&&validTacticLearning(u)&&int(u.troops,R.maxTroops)&&int(u.wounded)&&u.homeCity===c.nodeId,'随机贼将资料无效');people.add(u.id);}
  if(c.receipt){const r=c.receipt;fail(c.clearedDay!==null&&typeof r.battleId==='string'&&int(r.gold)&&int(r.grain)&&int(r.lostGold)&&int(r.lostGrain)&&r.gold+r.lostGold===r.beforeGold&&r.grain+r.lostGrain===r.beforeGrain&&c.gold===0&&c.grain===0,'贼寨战利品凭据无效');}
 }
 for(const a of s.armies){
  if(a.banditTarget)fail(ids.has(a.banditTarget)&&!a.banditCampId,'讨贼军令目标无效');
  if(a.banditCampId){const c=banditCamp(s,a.banditCampId);fail(c&&c.battleId&&a.faction==='neutral'&&a.location===c.nodeId&&!a.travel&&!a.route.length&&a.units.every(u=>validGeneratedOfficer(u)&&c.units.some(x=>x.id===u.id)),'贼寨守军来源无效');}
  else fail(a.units.every(u=>!u.generatedOfficer),'随机贼将不属于正式势力名册');
 }
 for(const [f,records]of Object.entries(b.observations)){fail(s.campaign.vision.factions[f]&&records&&typeof records==='object','贼寨观察势力无效');for(const [id,i]of Object.entries(records)){const c=banditCamp(s,id);fail(c&&int(i.day,s.campaign.day)&&i.day>0&&i.data?.id===id&&i.data.nodeId===c.nodeId&&i.data.name===c.name&&Array.isArray(i.data.units)&&i.data.units.every(validGeneratedOfficer)&&(i.data.clearedDay===null||int(i.data.clearedDay,i.day)),'贼寨情报无效');}}
}
