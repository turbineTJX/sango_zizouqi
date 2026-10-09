import assert from 'node:assert/strict';
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';

const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const root=resolve(args.source||'.'),out=resolve(args.out||'work/all-ai-decisions');await mkdir(out,{recursive:true});
const scenario=args.scenario||'guandu-200',seed=Number(args.seed||20261009),days=Number(args.days||120);
assert.ok(Number.isSafeInteger(seed)&&Number.isSafeInteger(days)&&days>0);
const load=file=>import(pathToFileURL(join(root,file)));
const {newCampaign,advanceCampaignDay,serializeCampaign,validateCampaign,activeBattles}=await load('strategic-campaign.mjs');
const {pendingDomesticProposals}=await load('domestic.mjs');
const {isAIControlled}=await load('player-faction.mjs');
const {NATIONAL_SCENARIOS}=await load('national-scenarios.mjs');
const files=(await readdir(root)).filter(f=>f.endsWith('.mjs'));
async function walk(folder){for(const entry of await readdir(join(root,folder),{withFileTypes:true})){const file=join(folder,entry.name);if(entry.isDirectory())await walk(file);else if(/\.(mjs|json)$/.test(file))files.push(file);}}
await walk('data');const digest=file=>readFile(join(root,file)).then(b=>createHash('sha256').update(b).digest('hex'));
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,await digest(f)])));
const input=args.save?await readFile(resolve(args.save),'utf8'):null;
const s=input?validateCampaign(JSON.parse(input)):newCampaign(seed,scenario,'cao',{allAI:true}),spec=NATIONAL_SCENARIOS.find(x=>x.id===scenario),start=performance.now();
assert.equal(s.campaign.scenarioId,scenario);const startDay=s.campaign.day,endDay=startDay+days,existingArmies=new Set(s.armies.map(a=>a.id));
const inputSave=input?{path:resolve(args.save),sha256:createHash('sha256').update(input).digest('hex'),day:startDay}:null;
assert.ok(spec);assert.ok(spec.factions.every(f=>isAIControlled(s,f)));assert.equal(s.campaign.domestic.incidents.enabled,true);
const departures=new Map(),battles=new Map(),decisions=new Map(),hunger=[],captures=[],checkpoints=[],daily=[];
const owners=new Map(s.cities.map(c=>[c.id,c.owner]));let steps=0;
function inspect(){
 assert.equal(s.campaign.allAI,true);assert.equal(pendingDomesticProposals(s).length,0);
 for(const b of activeBattles(s)){assert.equal(b.awaiting,false);assert.equal(b.control,'auto');assert.equal(b.battle.deploymentLocked,true);}
 for(const c of s.cities){for(const key of ['gold','grain','manpower'])assert.ok(Number.isSafeInteger(c[key])&&c[key]>=0,`${c.id} ${key} must be whole units`);
  assert.ok(c.units.every(u=>Number.isSafeInteger(u.troops)&&Number.isSafeInteger(u.wounded)),'City troop counts must be whole units');
  const old=owners.get(c.id);if(old!==c.owner){captures.push({day:s.campaign.day,city:c.id,from:old,to:c.owner});owners.set(c.id,c.owner);}
  if(c.hunger>0)hunger.push({day:s.campaign.day,kind:'city',id:c.id,faction:c.owner,hunger:c.hunger,grain:c.grain,troops:c.units.reduce((n,u)=>n+u.troops,0),besieged:activeBattles(s).some(b=>b.kind==='siege'&&b.cityId===c.id),work:s.campaign.domestic.assignments.filter(a=>a.cityId===c.id).map(a=>({direction:a.direction,action:a.action?.key})),incoming:s.campaign.idle.filter(o=>o.destination===c.id&&o.cargo?.grain).map(o=>({grain:o.cargo.grain,remainingDays:o.remainingDays}))});
 }
 for(const a of s.armies.filter(a=>!a.disbanded)){
  assert.ok(Number.isSafeInteger(a.supply)&&a.supply>=0);assert.ok(Number.isSafeInteger(a.supplyCapacity)&&Number.isSafeInteger(a.supplyIn||0));assert.ok(a.units.every(u=>Number.isSafeInteger(u.troops)&&u.troops>=0&&Number.isSafeInteger(u.wounded)&&u.wounded>=0));
  if(!departures.has(a.id)&&!a.defense)departures.set(a.id,{day:s.campaign.day,id:a.id,faction:a.faction,home:a.homeCity,target:a.target,task:a.task,units:a.units.length,troops:a.units.reduce((n,u)=>n+u.troops,0),existingAtStart:existingArmies.has(a.id)});
  if(a.hunger>0)hunger.push({day:s.campaign.day,kind:'army',id:a.id,faction:a.faction,hunger:a.hunger,supply:a.supply,location:a.location,target:a.target,task:a.task});
 }
 for(const b of s.campaign.battles)if(b.settled&&!battles.has(b.id))battles.set(b.id,{id:b.id,kind:b.kind,city:b.cityId,startedDay:b.startedDay,endedDay:b.endedDay,report:b.report});
 for(const d of s.campaign.ai.decisions)decisions.set(JSON.stringify(d),d);
 for(const o of s.campaign.idle){assert.ok(Number.isSafeInteger(o.unit.troops)&&Number.isSafeInteger(o.unit.wounded));for(const key of ['gold','grain','manpower'])if(o.cargo&&Object.hasOwn(o.cargo,key))assert.ok(Number.isSafeInteger(o.cargo[key])&&o.cargo[key]>=0,'Cargo quantities must be whole units');}
 daily.push({day:s.campaign.day,armies:s.armies.filter(a=>!a.disbanded).length,activeBattles:activeBattles(s).length,settledBattles:battles.size,plans:s.campaign.ai.plans.length,assignments:s.campaign.domestic.assignments.length,transports:s.campaign.idle.filter(o=>o.destination&&o.cargo).length});
}
try{
 inspect();console.log(JSON.stringify({event:'start',scenario,seed,days,factions:spec.factions.length,source:root}));
 while(s.campaign.day<endDay&&!s.finished){
  assert.ok(steps++<(days+1)*2,'Simulation stopped advancing');const before=s.campaign.day;
  const copy=before%30===0?validateCampaign(JSON.parse(serializeCampaign(s))):null;
  advanceCampaignDay(s);assert.ok(s.campaign.day>before||s.finished);
  if(copy){advanceCampaignDay(copy);assert.equal(serializeCampaign(copy),serializeCampaign(s),'Save continuation differs');checkpoints.push({day:s.campaign.day,deterministic:true});}
  inspect();
  if((s.campaign.day-1)%10===0){const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);console.log(JSON.stringify({event:'progress',day:s.campaign.day,departures:departures.size,battles:battles.size,hungerDays:hunger.length,seconds:Math.round((performance.now()-start)/1000)}));}
 }
 const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);
 const changed=[];for(const file of files)if(await digest(file)!==sourceHashes[file])changed.push(file);assert.deepEqual(changed,[],'Simulation source changed');
 const metrics={scenario,scenarioName:spec.name||spec.id,seed,requestedDays:days,startDay,completedDay:s.campaign.day,finished:s.finished,aiFactions:spec.factions.length,departures:departures.size,newDepartures:[...departures.values()].filter(a=>!a.existingAtStart).length,settledBattles:battles.size,newSettledBattles:[...battles.values()].filter(b=>b.endedDay>=startDay).length,activeBattles:activeBattles(s).length,captures:captures.length,cityHungerDays:hunger.filter(x=>x.kind==='city').length,armyHungerDays:hunger.filter(x=>x.kind==='army').length,unguardedCityHungerDays:hunger.filter(x=>x.kind==='city'&&!x.besieged&&x.troops>0).length,deterministicCheckpoints:checkpoints.length,seconds:Math.round((performance.now()-start)/1000)};
 const result={metrics,inputSave,sourceHashes,departures:[...departures.values()],battles:[...battles.values()],captures,hunger,checkpoints,daily,decisions:[...decisions.values()],plans:s.campaign.ai.plans,scope:'Original ordinary nationwide scenario or exact validated continuation save. All factions use AI; ordinary fog and incidents enabled. No injected wars, units, stock, roads or combat outcomes. Resource failures caused by actual war remain diagnostic findings, not artificial victories. This run does not establish annual sustainability, calibrated losses or optimal decisions.'};
 await writeFile(join(out,'campaign-save.json'),saved);await writeFile(join(out,'campaign-audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({event:'finish',...metrics}));
}catch(error){await writeFile(join(out,'failed-save.json'),serializeCampaign(s));await writeFile(join(out,'failure.txt'),error.stack);throw error;}
