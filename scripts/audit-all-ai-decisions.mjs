import assert from 'node:assert/strict';
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {strategicTurn,warTempoReport,observedJointParticipation,observedOffensiveBattle} from './war-tempo-report.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const root=resolve(args.source||'.'),out=resolve(args.out||'work/all-ai-decisions');await mkdir(out,{recursive:true});
assert.ok(!(args.days&&args.turns),'Choose either --turns or --days');
const scenario=args.scenario||'guandu-200',seed=Number(args.seed||20261009),days=args.days?Number(args.days):Number(args.turns??70)*10;
assert.ok(Number.isSafeInteger(seed)&&Number.isSafeInteger(days)&&days>0);
const load=file=>import(pathToFileURL(join(root,file)));
const {newCampaign,advanceCampaignDay,serializeCampaign,validateCampaign,activeBattles}=await load('strategic-campaign.mjs');
const {domesticStaffing}=await load('domestic-staffing.mjs');
const {cityPersonnel}=await load('city-personnel.mjs');
const {cityStaffStatus}=await load('domestic-feedback.mjs');
const {personnelCityProfile}=await load('strategic-personnel.mjs');
const {DIRECTIONS}=await load('domestic.mjs');
const {pendingDomesticProposals}=await load('domestic.mjs');
const {isAIControlled}=await load('player-faction.mjs');
const {NATIONAL_SCENARIOS}=await load('national-scenarios.mjs');
const {STRATEGIC_PLANNING_RULES}=await load('data/design/strategic-planning-rules.mjs');
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
const buildingCompletions=new Map(),diplomaticOffers=new Map(),battleStarts=new Map();
const planTrace=[],strategyTrace=[],concentrationTrace=[],concentrationStates=new Map(),planStates=new Map(),strategyStates=new Map(),citySamples=[];
const jointParticipation=new Map();
const owners=new Map(s.cities.map(c=>[c.id,c.owner]));let steps=0;
function inspect(eventDay=s.campaign.day){
 assert.equal(s.campaign.allAI,true);assert.equal(pendingDomesticProposals(s).length,0);
 for(const b of activeBattles(s)){assert.equal(b.awaiting,false);assert.equal(b.control,'auto');assert.equal(b.battle.deploymentLocked,true);}
 for(const b of activeBattles(s).filter(b=>!b.banditCampId))for(const row of observedJointParticipation(b))jointParticipation.set(`${eventDay}:${row.battleId}:${row.side}`,{day:eventDay,...row});
 for(const c of s.cities){for(const direction of Object.keys(DIRECTIONS)){const slots=domesticStaffing(s,c.id,direction);assert.ok(slots.used<=slots.limit,`${c.id} ${direction} staffing overflow`);}
  for(const key of ['gold','grain','manpower'])assert.ok(Number.isSafeInteger(c[key])&&c[key]>=0,`${c.id} ${key} must be whole units`);
  if(c.payroll)for(const key of ['arrears','lastTurn','lastDue','lastPaid'])assert.ok(Number.isSafeInteger(c.payroll[key])&&c.payroll[key]>=0,`${c.id} payroll ${key} must be whole units`);
  assert.ok(c.units.every(u=>Number.isSafeInteger(u.troops)&&Number.isSafeInteger(u.wounded)),'City troop counts must be whole units');
  const old=owners.get(c.id);if(old!==c.owner){captures.push({day:eventDay,city:c.id,from:old,to:c.owner});owners.set(c.id,c.owner);}
  if(c.hunger>0)hunger.push({day:eventDay,kind:'city',id:c.id,faction:c.owner,hunger:c.hunger,grain:c.grain,troops:c.units.reduce((n,u)=>n+u.troops,0),besieged:activeBattles(s).some(b=>b.kind==='siege'&&b.cityId===c.id),work:s.campaign.domestic.assignments.filter(a=>a.cityId===c.id).map(a=>({direction:a.direction,action:a.action?.key})),incoming:s.campaign.idle.filter(o=>o.destination===c.id&&o.cargo?.grain).map(o=>({grain:o.cargo.grain,remainingDays:o.remainingDays}))});
 }
 for(const a of s.armies.filter(a=>!a.disbanded)){
  assert.ok(Number.isSafeInteger(a.supply)&&a.supply>=0);assert.ok(Number.isSafeInteger(a.supplyCapacity)&&Number.isSafeInteger(a.supplyIn||0));assert.ok(a.units.every(u=>Number.isSafeInteger(u.troops)&&u.troops>=0&&Number.isSafeInteger(u.wounded)&&u.wounded>=0));
  if(!departures.has(a.id)&&!a.defense){const plan=s.campaign.ai.plans.find(p=>p.faction===a.faction&&['assemble','attack'].includes(p.phase)&&a.units.some(u=>p.officerIds.includes(u.id)));
   departures.set(a.id,{day:eventDay,turn:strategicTurn(eventDay),id:a.id,faction:a.faction,home:a.homeCity,target:a.target,task:a.task,purpose:plan||a.task==='择敌出征'?'offensive':'other',planId:plan?.id??null,units:a.units.length,troops:a.units.reduce((n,u)=>n+u.troops,0),existingAtStart:existingArmies.has(a.id)});}
  if(a.hunger>0)hunger.push({day:eventDay,kind:'army',id:a.id,faction:a.faction,hunger:a.hunger,supply:a.supply,location:a.location,target:a.target,task:a.task});
 }
 for(const b of s.campaign.battles){
  const offensive=!!battleStarts.get(b.id)?.offensive||observedOffensiveBattle(b,departures);
  const record={id:b.id,kind:b.kind,city:b.cityId,startedDay:b.startedDay,attackSide:b.attackSide,offensive,banditCampId:b.banditCampId??null};
  battleStarts.set(b.id,{...record,...(b.settled?{endedDay:b.endedDay}:{})});
  if(b.settled&&!battles.has(b.id))battles.set(b.id,{...record,endedDay:b.endedDay,report:b.report});
 }
 for(const d of s.campaign.ai.decisions)decisions.set(JSON.stringify(d),d);
 for(const e of s.campaign.domestic.events){const reward=e.result?.reward;if(reward?.kind==='building'&&reward.mode==='build')buildingCompletions.set(e.id,{day:e.day,turn:strategicTurn(e.day),cityId:e.cityId,faction:e.faction,actionId:e.actionId,...reward});}
 for(const p of [...s.campaign.diplomacy.proposals,...s.campaign.diplomacy.contracts])diplomaticOffers.set(p.id,{id:p.id,createdDay:p.createdDay,createdTurn:strategicTurn(p.createdDay),factions:[...p.factions],goal:p.goal,workDays:p.workDays,status:p.status,cities:p.clauses.filter(c=>c.kind==='city').map(c=>({from:c.from,to:c.to,cityId:c.cityId}))});
 for(const p of s.campaign.ai.plans){
  const signature=JSON.stringify([p.phase,p.reason,p.tasks.map(t=>[t.id,t.status,t.refs])]);
  if(planStates.get(p.id)!==signature){planStates.set(p.id,signature);planTrace.push({day:eventDay,turn:strategicTurn(eventDay),...structuredClone(p)});}
 }
 for(const [faction,policy] of Object.entries(s.campaign.ai.factions)){
  if(strategyStates.get(faction)===policy.strategy.revision)continue;
  strategyStates.set(faction,policy.strategy.revision);
  strategyTrace.push({day:s.campaign.day,faction,stance:policy.stance,...structuredClone(policy.strategy)});
 }
 for(const p of s.campaign.ai.concentrations){
  const key=p.faction+':'+p.createdDay,signature=JSON.stringify(p);
  if(concentrationStates.get(key)!==signature){concentrationStates.set(key,signature);concentrationTrace.push({day:eventDay,...structuredClone(p)});}
 }
 if((s.campaign.day-1)%10===0)for(const c of s.cities)citySamples.push({day:s.campaign.day,id:c.id,owner:c.owner,gold:c.gold,grain:c.grain,manpower:c.manpower,hunger:c.hunger,
  payroll:c.payroll?structuredClone(c.payroll):undefined,
  units:c.units.map(u=>({id:u.id,troops:u.troops,wounded:u.wounded})),
  staffing:{role:c.owner==='neutral'?null:personnelCityProfile(s,c).role,residents:cityPersonnel(s,c.id).length,idle:cityStaffStatus(s,c).idle.map(o=>({id:o.unit.id,name:o.unit.name,prepared:!!o.cityUnit,idleDays:s.campaign.talent.records[o.unit.id]?.idleDays||0})),incoming:s.campaign.ai.staffing.filter(p=>p.cityId===c.id).map(p=>({...p}))},
  work:s.campaign.domestic.assignments.filter(a=>a.cityId===c.id).map(a=>({officerId:a.officerId,direction:a.direction,key:a.action?.key,remaining:a.action?.remaining}))});
 for(const o of s.campaign.idle){assert.ok(Number.isSafeInteger(o.unit.troops)&&Number.isSafeInteger(o.unit.wounded));for(const key of ['gold','grain','manpower'])if(o.cargo&&Object.hasOwn(o.cargo,key))assert.ok(Number.isSafeInteger(o.cargo[key])&&o.cargo[key]>=0,'Cargo quantities must be whole units');}
 daily.push({day:s.campaign.day,armies:s.armies.filter(a=>!a.disbanded).length,activeBattles:activeBattles(s).length,settledBattles:battles.size,plans:s.campaign.ai.plans.length,assignments:s.campaign.domestic.assignments.length,transports:s.campaign.idle.filter(o=>o.destination&&o.cargo).length});
}
try{
 inspect();console.log(JSON.stringify({event:'start',scenario,seed,turns:days/10,firstTurn:strategicTurn(startDay),days,factions:spec.factions.length,source:root}));
 await writeFile(join(out,'progress.json'),JSON.stringify({scenario,seed,requestedDays:days,day:s.campaign.day,departures:0,battles:0,hungerDays:0,seconds:0}));
 while(s.campaign.day<endDay&&!s.finished){
  assert.ok(steps++<(days+1)*2,'Simulation stopped advancing');const before=s.campaign.day;
  const copy=before%30===0?validateCampaign(JSON.parse(serializeCampaign(s))):null;
  advanceCampaignDay(s);assert.ok(s.campaign.day>before||s.finished);
  if(copy){advanceCampaignDay(copy);assert.equal(serializeCampaign(copy),serializeCampaign(s),'Save continuation differs');checkpoints.push({day:s.campaign.day,deterministic:true});}
  inspect(before);
  if((s.campaign.day-1)%10===0){const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);const progress={scenario,seed,requestedTurns:days/10,completedTurns:(s.campaign.day-startDay)/10,throughTurn:strategicTurn(s.campaign.day-1),requestedDays:days,day:s.campaign.day,departures:departures.size,battles:battles.size,hungerDays:hunger.length,seconds:Math.round((performance.now()-start)/1000),arrears:s.cities.filter(c=>c.payroll?.arrears>0).map(c=>({city:c.id,owner:c.owner,gold:c.gold,arrears:c.payroll.arrears}))};console.log(JSON.stringify({event:'progress',...progress}));await writeFile(join(out,'progress.json'),JSON.stringify(progress));}
 }
 const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);
 const changed=[];for(const file of files)if(await digest(file)!==sourceHashes[file])changed.push(file);assert.deepEqual(changed,[],'Simulation source changed');
 const metrics={scenario,scenarioName:spec.name||spec.id,seed,requestedTurns:days/10,completedTurns:(s.campaign.day-startDay)/10,requestedDays:days,startDay,completedDay:s.campaign.day,finished:s.finished,aiFactions:spec.factions.length,departures:departures.size,newDepartures:[...departures.values()].filter(a=>!a.existingAtStart).length,settledBattles:battles.size,newSettledBattles:[...battles.values()].filter(b=>b.endedDay>=startDay).length,activeBattles:activeBattles(s).length,captures:captures.length,cityHungerDays:hunger.filter(x=>x.kind==='city').length,armyHungerDays:hunger.filter(x=>x.kind==='army').length,unguardedCityHungerDays:hunger.filter(x=>x.kind==='city'&&!x.besieged&&x.troops>0).length,deterministicCheckpoints:checkpoints.length,seconds:Math.round((performance.now()-start)/1000)};
 const result={metrics,inputSave,sourceHashes,departures:[...departures.values()],battles:[...battles.values()],captures,hunger,checkpoints,daily,decisions:[...decisions.values()],plans:s.campaign.ai.plans,scope:'Original ordinary nationwide scenario or exact validated continuation save. All factions use AI; ordinary fog and incidents enabled. No injected wars, units, stock, roads or combat outcomes. Resource failures caused by actual war remain diagnostic findings, not artificial victories. This run does not establish annual sustainability, calibrated losses or optimal decisions.'};
 Object.assign(result,{planTrace,strategyTrace,concentrationTrace,citySamples,jointParticipation:[...jointParticipation.values()],buildingCompletions:[...buildingCompletions.values()],diplomaticOffers:[...diplomaticOffers.values()]});
 result.battleStarts=[...battleStarts.values()];
 result.tempo=warTempoReport(result,STRATEGIC_PLANNING_RULES.tempo);
 await writeFile(join(out,'campaign-save.json'),saved);await writeFile(join(out,'campaign-audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({event:'finish',...metrics}));
}catch(error){await writeFile(join(out,'failed-save.json'),serializeCampaign(s));await writeFile(join(out,'failure.txt'),error.stack);throw error;}
