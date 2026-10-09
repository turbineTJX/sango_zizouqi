import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';

const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
const root=resolve(args.source||'.'),out=resolve(args.out||'work/strategic-planning-audit');await mkdir(out,{recursive:true});
const load=file=>import(pathToFileURL(join(root,file))),hash=x=>createHash('sha256').update(x).digest('hex');
const {newCampaign,advanceCampaignDay,serializeCampaign,validateCampaign}=await load('strategic-campaign.mjs');
const {cityBudget}=await load('city-budget.mjs');
const {citySupplyBudgets,forecastArmySupply}=await load('city-logistics.mjs');
const {NATIONAL_SCENARIOS}=await load('national-scenarios.mjs');
const algorithmRuntime=(await readdir(root)).includes('strategic-algorithms.mjs')?await load('strategic-algorithms.mjs'):null;
let pluginHash=null;
if(args['algorithm-module']){
 assert.ok(algorithmRuntime,'Source snapshot does not expose strategic algorithm interfaces');
 pluginHash={path:resolve(args['algorithm-module']),sha256:hash(await readFile(resolve(args['algorithm-module'])))};
 const plugin=await import(pathToFileURL(resolve(args['algorithm-module'])));
 assert.ok(Array.isArray(plugin.strategicAlgorithms),'Algorithm module must export strategicAlgorithms');
 for(const {kind,id,run}of plugin.strategicAlgorithms)algorithmRuntime.registerStrategicAlgorithm(kind,{id,run});
 assert.equal(hash(await readFile(pluginHash.path)),pluginHash.sha256,'Algorithm module changed while loading');
}
const changes={};for(const [flag,kind]of [['selector','selector'],['goal-evaluator','goalEvaluator'],['offensive-evaluator','offensiveEvaluator'],['battle-predictor','battlePredictor'],['preparation-predictor','preparationPredictor']])if(args[flag])changes[kind]=args[flag];
assert.ok(algorithmRuntime||!Object.keys(changes).length,'Source snapshot does not expose strategic algorithm interfaces');
const files=(await readdir(root)).filter(f=>f.endsWith('.mjs'));
async function walk(folder){for(const e of await readdir(join(root,folder),{withFileTypes:true})){const path=join(folder,e.name);if(e.isDirectory())await walk(path);else if(/\.(mjs|json)$/.test(path))files.push(path);}}
await walk('data');const hashes=Object.fromEntries(await Promise.all(files.map(async f=>[f.replaceAll('\\','/'),hash(await readFile(join(root,f)))])));
const scenarios=args.scenario?args.scenario.split(','):NATIONAL_SCENARIOS.map(s=>s.id),seeds=(args.seeds||'417').split(',').map(Number),days=Number(args.days||30),rows=[];
for(const scenario of scenarios)for(const seed of seeds){
 const start=performance.now(),s=newCampaign(seed,scenario,'cao',{allAI:true}),departures=new Map(),plans=new Map(),goals=new Map(),events=[];
 if(algorithmRuntime)assert.equal(algorithmRuntime.setStrategicAlgorithms(s,changes),null);
 const hunger=new Map(),samples=[];let calls=0;
 const sum=(xs,fn)=>xs.reduce((n,x)=>n+fn(x),0);
 function inspect(){
  for(const a of s.armies.filter(a=>!a.disbanded&&!a.defense))if(!departures.has(a.id))departures.set(a.id,{day:s.campaign.day,id:a.id,faction:a.faction,home:a.homeCity,target:a.target,task:a.task,units:a.units.length,troops:a.units.map(u=>u.troops)});
  for(const p of s.campaign.ai.plans){const old=plans.get(p.id);if(old?.phase!==p.phase){const row={day:s.campaign.day,id:p.id,faction:p.faction,target:p.target,phase:p.phase,units:p.officerIds.length,reason:p.reason};plans.set(p.id,row);events.push({eventType:'plan',...row});}}
  for(const [f,policy]of Object.entries(s.campaign.ai.factions)){const strategy=policy.strategy;if(strategy&&goals.get(f)!==strategy.revision){goals.set(f,strategy.revision);events.push({eventType:'strategy',day:s.campaign.day,faction:f,revision:strategy.revision,goal:structuredClone(strategy.goal),neighbors:structuredClone(strategy.neighbors),evaluation:strategy.trace.at(-1)});}}
 }
 function sample(){
  for(const f of Object.keys(s.campaign.ai.factions)){const own=s.cities.filter(c=>c.owner===f),armies=s.armies.filter(a=>a.faction===f&&!a.disbanded),supplies=citySupplyBudgets(s).filter(x=>x.army.faction===f),forecast=forecastArmySupply(s,{supplies}),budgets=own.map(c=>({c,b:cityBudget(s,c,{supplies,supplyForecast:forecast})}));
   hunger.set(f,(hunger.get(f)||0)+own.filter(c=>c.hunger>0).length+armies.filter(a=>a.hunger>0).length);
   samples.push({day:s.campaign.day,faction:f,cities:own.length,gold:sum(own,c=>c.gold),grain:sum(own,c=>c.grain),manpower:sum(own,c=>c.manpower),troops:sum(own,c=>sum(c.units,u=>u.troops))+sum(armies,a=>sum(a.units,u=>u.troops)),goldShortCities:budgets.filter(x=>x.b.shortages.gold>0).map(x=>x.c.id),grainShortCities:budgets.filter(x=>x.b.shortages.grain>0).map(x=>x.c.id)});
  }
 }
 try{
  sample();inspect();console.log(JSON.stringify({eventType:'start',scenario,seed,days,aiVersion:s.campaign.ai.version,algorithms:s.campaign.ai.algorithms}));
  while(s.campaign.day<=days&&!s.finished){assert.ok(calls++<(days+1)*8,'World stopped advancing');const before=s.campaign.day;advanceCampaignDay(s);assert.ok(s.campaign.day>before||s.finished,'All-AI world failed to advance');inspect();sample();
   if((s.campaign.day-1)%10===0){const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);console.log(JSON.stringify({eventType:'progress',scenario,seed,day:s.campaign.day,departures:departures.size,plans:plans.size,seconds:Math.round((performance.now()-start)/1000)}));}
  }
  const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);await writeFile(join(out,`${scenario}-${seed}-save.json`),saved);
  const changed=[];for(const f of files)if(hash(await readFile(join(root,f)))!==hashes[f.replaceAll('\\','/')])changed.push(f);assert.deepEqual(changed,[],'Source changed during simulation');
  if(pluginHash)assert.equal(hash(await readFile(pluginHash.path)),pluginHash.sha256,'Algorithm module changed during simulation');
  const result={scenario,seed,requestedDays:days,completedDay:s.campaign.day,complete:true,seconds:Math.round((performance.now()-start)/1000),aiVersion:s.campaign.ai.version,algorithms:s.campaign.ai.algorithms,pluginHash,sourceHashes:hashes,departures:[...departures.values()],plans:[...plans.values()],hunger:Object.fromEntries(hunger),samples,events,
   scope:'Original nationwide scenario, all factions use the shared AI controller, ordinary fog and incidents enabled. No prescribed wars, changed roads, free resources, custom formation or altered combat outcomes. A short run validates execution; it does not prove annual wartime sustainability or calibrated combat prediction.'};
  await writeFile(join(out,`${scenario}-${seed}.json`),JSON.stringify(result,null,2));rows.push({scenario,seed,day:s.campaign.day,departures:departures.size,plans:plans.size,hunger:sum([...hunger.values()],x=>x),seconds:result.seconds});console.log(JSON.stringify({eventType:'finish',...rows.at(-1)}));
 }catch(error){await writeFile(join(out,`${scenario}-${seed}-failed-save.json`),serializeCampaign(s));await writeFile(join(out,`${scenario}-${seed}-error.txt`),error.stack);throw error;}
}
await writeFile(join(out,'summary.json'),JSON.stringify(rows,null,2));
