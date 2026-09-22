import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {assignDomestic} from '../domestic.mjs';
import {talentContext,servingPeople} from '../talent-core.mjs';

const days=Number(process.argv[2]||360),peaceful=process.argv.includes('--peaceful'),results=[],sources={};
for(const file of ['talent-core.mjs','talent-lifecycle.mjs','domestic.mjs','strategic-campaign.mjs','strategic-ai.mjs','national-scenarios.mjs'])sources[file]=createHash('sha256').update(await readFile(file)).digest('hex');
for(const scenario of [null,'guandu-200','heroes-251'])for(const seed of [23,71]){
 const s=newCampaign(seed,scenario),samples=[],events=new Map(),displaced=new Map(),domesticEvents=new Map();
 if(peaceful)s.armies.forEach(a=>a.stationary=true);
 // Player delegates available home officers. AI keeps its normal campaign policy;
 // every battle is played by the real engine, without forced winners or RNG.
 for(const c of s.cities.filter(c=>c.owner==='cao')){const o=s.campaign.idle.find(o=>o.faction==='cao'&&o.location===c.id);if(o)assignDomestic(s,c.id,'talent',o.unit.id);}
 let guard=0;
 while(s.campaign.day<=days&&!s.finished&&guard++<days*100){
  // Fixed-front economics audit: suppress only expedition planning, retain all
  // production, recruitment, talent, supply, time and validation code.
  if(peaceful&&s.campaign.ai)s.campaign.ai.lastPlanDay=s.campaign.day;
  if(s.campaign.phase==='planning')beginExecution(s);for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);advanceCampaignDay(s);
  for(const e of s.campaign.talent.reports){events.set(JSON.stringify(e),e);if(e.code==='displaced'&&!displaced.has(e.personId))displaced.set(e.personId,{day:e.day,after:{}});}
  for(const e of s.campaign.domestic.events)domesticEvents.set(e.id,e);
  for(const [id,d]of displaced)for(const offset of [30,90,180])if(s.campaign.day>=d.day+offset&&!d.after[offset]){const o=servingPeople(s).get(id),p=s.campaign.domestic.people.find(p=>p.id===id);d.after[offset]={faction:o?.faction||null,status:o?'SERVING':p?.status,city:o?.location||p?.cityId};}
  if((s.campaign.day-1)%30===0){validateCampaign(JSON.parse(serializeCampaign(s)));const context=talentContext(s);samples.push({day:s.campaign.day,factions:Object.fromEntries(Object.entries(context.factions).map(([f,v])=>[f,{N:v.N,D:v.D}]))});}
 }
 assert.ok(s.campaign.day>days||s.finished,'audit must finish');validateCampaign(JSON.parse(serializeCampaign(s)));
 const records=[...events.values()],signed=records.filter(e=>e.code==='signed'),costs=signed.map(e=>e.cost).sort((a,b)=>a-b),elapsed=signed.map(e=>e.elapsed).sort((a,b)=>a-b),distribution=list=>({count:list.length,mean:list.length?list.reduce((a,b)=>a+b,0)/list.length:null,p50:list[Math.floor(list.length*.5)]??null,p90:list[Math.min(list.length-1,Math.floor(list.length*.9))]??null});
 const reassurance=[...domesticEvents.values()].filter(e=>e.text.includes('安抚本城人才'));
 results.push({scenario:scenario||'small-map',seed,day:s.campaign.day,finished:s.finished||null,samples,newHires:signed.length,cost:distribution(costs),elapsed:distribution(elapsed),reassurance:{spent:reassurance.filter(e=>e.phase==='start').reduce((n,e)=>n+e.result.cost,0),zeroOutcome:reassurance.filter(e=>['complete','failure'].includes(e.phase)&&e.result.actual===0).length},resigned:records.filter(e=>e.code==='resigned').length,warnings:records.filter(e=>e.code==='leave-warning').length,defeatDestinations:Object.fromEntries(displaced),projects:Object.values(s.campaign.talent.projects).length,events:records});
 console.log(scenario||'small-map',seed,s.campaign.day,'hires',signed.length,'resignations',results.at(-1).resigned);
 await mkdir('outputs/talent-audit',{recursive:true});await writeFile(`outputs/talent-audit/results-${days}${peaceful?'-peaceful':''}.json`,JSON.stringify({days,peaceful,sources,results},null,2));
}
