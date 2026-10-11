import assert from 'node:assert/strict';
import {mkdir,readdir,readFile,writeFile,appendFile,rename} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';

// A headless observer of the ordinary game. Never modifies decisions, stock,
// fog, incidents, movement, daily records, battles or the victory condition.
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const root=resolve(args.source||'.'),out=resolve(args.out||'work/ai-unification-20261010/run');
const scenario=args.scenario||'guandu-200',seed=Number(args.seed||20261010),days=Number(args.days||3600),checkpointDays=Number(args.checkpoint||90);
assert.ok(Number.isSafeInteger(seed)&&seed>=0&&seed<=0xffffffff&&Number.isSafeInteger(days)&&days>0&&Number.isSafeInteger(checkpointDays)&&checkpointDays>0);
await mkdir(out,{recursive:true});
const load=file=>import(pathToFileURL(join(root,file)));
const {newCampaign,advanceCampaignDay,serializeCampaign,validateCampaign,activeBattles}=await load('strategic-campaign.mjs');
const {NATIONAL_SCENARIOS,NATIONAL_FACTIONS}=await load('national-scenarios.mjs');
const {pendingDomesticProposals}=await load('domestic.mjs');
const {isAIControlled}=await load('player-faction.mjs');
const {RULES_VERSION}=await load('combat-rules.mjs');
const files=(await readdir(root)).filter(f=>f.endsWith('.mjs'));
async function walk(folder){for(const entry of await readdir(join(root,folder),{withFileTypes:true})){const file=join(folder,entry.name);if(entry.isDirectory())await walk(file);else if(/\.(mjs|json)$/.test(file))files.push(file);}}
await walk('data');files.sort();
const digest=async file=>createHash('sha256').update(await readFile(join(root,file))).digest('hex');
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,await digest(file)])));
const sourceHash=createHash('sha256').update(JSON.stringify(sourceHashes)).digest('hex');
const spec=NATIONAL_SCENARIOS.find(s=>s.id===scenario);assert.ok(spec,'Unknown ordinary scenario');
const s=args.save?validateCampaign(JSON.parse(await readFile(resolve(args.save),'utf8'))):newCampaign(seed,scenario,'cao',{allAI:true});
assert.equal(s.campaign.scenarioId,scenario);assert.equal(s.campaign.allAI,true);assert.ok(spec.factions.every(f=>isAIControlled(s,f)));assert.equal(s.campaign.domestic.incidents.enabled,true);
const startDay=s.campaign.day,endDay=startDay+days,start=performance.now(),startUTC=new Date().toISOString();
const referenceText=args.reference?await readFile(resolve(args.reference),'utf8'):null;
const referenceDay=referenceText?JSON.parse(referenceText).campaign.day:null;
let referenceMatched=false;
const owners=new Map(s.cities.map(c=>[c.id,c.owner])),seenArmies=new Set(s.armies.map(a=>a.id)),seenBattles=new Set(),revisions=new Map();
const captures=[],departures=[],battles=[],hungerExamples=[],checkpoints=[],admissions=[],territoryHistory=[];
let cityHungerDays=0,armyHungerDays=0,lastCaptureDay=startDay,lastBattleDay=startDay,lastDepartureDay=startDay,lastProgressDay=0,maxQuietDays=0;
const atomicJSON=async(name,value)=>{const path=join(out,name);await writeFile(path+'.tmp',typeof value==='string'?value:JSON.stringify(value,null,2));await rename(path+'.tmp',path);};
const counts=()=>Object.fromEntries(['neutral',...spec.factions].map(f=>[f,s.cities.filter(c=>c.owner===f).length]));
const seconds=()=>Math.round((performance.now()-start)/1000);
function inspect(){
 assert.equal(s.campaign.allAI,true);assert.equal(pendingDomesticProposals(s).length,0);
 for(const r of activeBattles(s)){assert.equal(r.awaiting,false);assert.equal(r.control,'auto');assert.equal(r.battle.deploymentLocked,true);lastBattleDay=s.campaign.day;}
 for(const c of s.cities){
  for(const key of ['gold','grain','manpower'])assert.ok(Number.isSafeInteger(c[key])&&c[key]>=0,c.id+' '+key);
  if(owners.get(c.id)!==c.owner){captures.push({day:s.campaign.day,city:c.id,name:c.name,from:owners.get(c.id),to:c.owner});owners.set(c.id,c.owner);lastCaptureDay=s.campaign.day;}
  if(c.hunger>0){cityHungerDays++;if(hungerExamples.length<100)hungerExamples.push({day:s.campaign.day,kind:'city',id:c.id,faction:c.owner,hunger:c.hunger});}
 }
 for(const a of s.armies.filter(a=>!a.disbanded)){
  assert.ok(Number.isSafeInteger(a.supply)&&a.supply>=0);assert.ok(a.units.every(u=>Number.isSafeInteger(u.troops)&&u.troops>=0&&Number.isSafeInteger(u.wounded)&&u.wounded>=0));
  if(!seenArmies.has(a.id)){seenArmies.add(a.id);departures.push({day:s.campaign.day,id:a.id,name:a.name,faction:a.faction,home:a.homeCity,target:a.target,task:a.task,units:a.units.length,troops:a.units.reduce((n,u)=>n+u.troops,0)});lastDepartureDay=s.campaign.day;}
  if(a.hunger>0){armyHungerDays++;if(hungerExamples.length<100)hungerExamples.push({day:s.campaign.day,kind:'army',id:a.id,faction:a.faction,hunger:a.hunger});}
 }
 for(const r of [...s.campaign.battles,...s.campaign.archive])if((r.settled||r.endedDay)&&!seenBattles.has(r.id)){seenBattles.add(r.id);battles.push({id:r.id,name:r.name,startedDay:r.startedDay,endedDay:r.endedDay,reason:r.report?.reason||r.reason});lastBattleDay=s.campaign.day;}
 for(const [f,p]of Object.entries(s.campaign.ai.factions))if(revisions.get(f)!==p.strategy.revision){revisions.set(f,p.strategy.revision);const t=p.strategy.trace.at(-1);if(t)admissions.push({day:s.campaign.day,faction:f,goal:structuredClone(p.strategy.goal),admission:structuredClone(t.admission)});}
 const quiet=s.campaign.day-Math.max(lastCaptureDay,lastBattleDay,lastDepartureDay);maxQuietDays=Math.max(maxQuietDays,quiet);
 if(s.finished){assert.equal(s.finished,'victory');assert.notEqual(s.cities[0].owner,'neutral');assert.ok(s.cities.every(c=>c.owner===s.cities[0].owner));}
}
async function saveCheckpoint({verifyContinuation=false}={}){
 const saved=serializeCampaign(s),copy=validateCampaign(JSON.parse(saved));assert.equal(serializeCampaign(copy),saved,'Current save cannot round-trip');
 if(verifyContinuation&&!s.finished){const replay=validateCampaign(JSON.parse(saved));advanceCampaignDay(copy);advanceCampaignDay(replay);assert.equal(serializeCampaign(copy),serializeCampaign(replay),'Reloaded daily continuations differ');}
 await atomicJSON('checkpoint-save.json',saved);checkpoints.push({day:s.campaign.day,roundTrip:true,continuation:verifyContinuation&&!s.finished,bytes:Buffer.byteLength(saved)});
}
async function progress(event='progress'){
 const row={event,day:s.campaign.day,elapsedGameDays:s.campaign.day-startDay,seconds:seconds(),territory:counts(),survivingFactions:spec.factions.filter(f=>s.cities.some(c=>c.owner===f)),captures:captures.length,departures:departures.length,battles:battles.length,activeBattles:activeBattles(s).length,activeOffensives:s.campaign.ai.plans.filter(p=>!['complete','cancelled','consolidate'].includes(p.phase)).length,cityHungerDays,armyHungerDays,quietDays:s.campaign.day-Math.max(lastCaptureDay,lastBattleDay,lastDepartureDay)};
 territoryHistory.push(row);await appendFile(join(out,'progress.jsonl'),JSON.stringify(row)+'\n');await atomicJSON('progress.json',row);console.log(JSON.stringify(row));lastProgressDay=s.campaign.day;
}
try{
 await atomicJSON('run-config.json',{scenario,scenarioName:spec.name,seed,requestedDays:days,startDay,startUTC,source:root,sourceHash,rulesVersion:RULES_VERSION,sourceHashes,checkpointDays,inputSave:args.save?resolve(args.save):null,scope:'Fresh ordinary scenario or exact current continuation. All AI, normal fog and incidents. Original victory requires every city to have one non-neutral owner. No injected war, resources, rosters, roads, actions or outcomes.'});
 inspect();await saveCheckpoint();await progress('start');
 while(s.campaign.day<endDay&&!s.finished){
  const before=s.campaign.day,replay=(before-startDay)%180===179?validateCampaign(JSON.parse(serializeCampaign(s))):null;
  const result=advanceCampaignDay(s);assert.ok(s.campaign.day>before||s.finished,'Daily execution paused: '+JSON.stringify(result));
  if(replay){advanceCampaignDay(replay);assert.equal(serializeCampaign(replay),serializeCampaign(s),'Live daily execution differs from save continuation');checkpoints.push({day:s.campaign.day,liveContinuation:true});}
  inspect();
  if(s.campaign.day===referenceDay){
   const actual=serializeCampaign(s);assert.ok(actual===referenceText,'Indexed run differs from full original checkpoint on day '+referenceDay);
   referenceMatched=true;console.log(JSON.stringify({event:'reference-match',day:referenceDay,sourceSave:resolve(args.reference),stateHash:createHash('sha256').update(actual).digest('hex')}));
  }
  if((s.campaign.day-startDay)%checkpointDays===0)await saveCheckpoint();
  if(s.campaign.day-lastProgressDay>=30||s.finished)await progress();
 }
 await saveCheckpoint();await progress(s.finished?'unified':'limit');
 for(const file of files)assert.equal(await digest(file),sourceHashes[file],'Frozen runtime changed: '+file);
 if(referenceText)assert.ok(referenceMatched,'Reference checkpoint was not reached');
 const recent=admissions.filter(a=>a.day>=s.campaign.day-360),reasons=recent.flatMap(a=>a.admission).reduce((o,a)=>(o[a.stage+':'+a.reason]=(o[a.stage+':'+a.reason]||0)+1,o),{});
 const winner=s.finished?s.cities[0].owner:null;
 const result={status:s.finished?'unified':'limit',scenario,scenarioName:spec.name,seed,sourceHash,rulesVersion:RULES_VERSION,startUTC,endUTC:new Date().toISOString(),startDay,completedDay:s.campaign.day,elapsedGameDays:s.campaign.day-startDay,seconds:seconds(),reference:referenceText?{day:referenceDay,matched:referenceMatched,path:resolve(args.reference)}:null,winner,winnerName:winner?NATIONAL_FACTIONS[winner]?.name||winner:null,territory:counts(),cities:s.cities.length,captures:captures.length,newArmies:departures.length,settledBattles:battles.length,cityHungerDays,armyHungerDays,lastCaptureDay,lastBattleDay,lastDepartureDay,maxQuietDays,checkpoints,territoryHistory,recentAdmission:reasons,recentStrategies:Object.fromEntries(Object.entries(s.campaign.ai.factions).map(([f,p])=>[f,p.strategy])),captureEvents:captures,departures,battles,hungerExamples};
 await atomicJSON('unification-result.json',result);await atomicJSON('campaign-save.json',serializeCampaign(s));
 console.log(JSON.stringify({event:'finish',...Object.fromEntries(Object.entries(result).filter(([k])=>!['checkpoints','territoryHistory','recentAdmission','recentStrategies','captureEvents','departures','battles','hungerExamples'].includes(k)))}));
}catch(error){
 await atomicJSON('failed-save.json',serializeCampaign(s));await atomicJSON('failure.json',{day:s.campaign.day,seconds:seconds(),error:error.stack,territory:counts(),lastCaptureDay,lastBattleDay,lastDepartureDay});throw error;
}
