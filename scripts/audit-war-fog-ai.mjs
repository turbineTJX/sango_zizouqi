import assert from 'node:assert/strict';
import {access,mkdir,readFile,readdir,writeFile,appendFile} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {spawn} from 'node:child_process';

const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
const root=resolve('.'),out=resolve(args.out||'work/war-fog-ai');await mkdir(out,{recursive:true});
const digest=data=>createHash('sha256').update(data).digest('hex');
if(!args.snapshot&&!await access(join(root,'audit-source-manifest.json')).then(()=>true,()=>false)){
 const name=new Date().toISOString().replace(/[^0-9]/g,'')+'-'+process.pid;
 const run=(cwd,argv)=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/audit-war-fog-ai.mjs',...argv],{cwd,stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',code=>resolve(code??1));});
 const snapshot=await run(root,[`--snapshot=${name}`,`--out=${out}`]);if(snapshot)process.exit(snapshot);
 const argv=process.argv.slice(2).filter(a=>!a.startsWith('--out=')&&!a.startsWith('--resume='));argv.push(`--out=${out}`);if(args.resume)argv.push(`--resume=${resolve(args.resume)}`);
 process.exit(await run(join(out,'runtime-'+name),argv));
}
if(args.snapshot){
 const target=resolve(out,'runtime-'+args.snapshot);await mkdir(target);
 const files=(await readdir(root)).filter(f=>f.endsWith('.mjs'));files.push('package.json','scripts/audit-war-fog-ai.mjs');
 async function walk(folder){for(const e of await readdir(join(root,folder),{withFileTypes:true})){const file=join(folder,e.name);if(e.isDirectory())await walk(file);else if(/\.(mjs|json)$/.test(file))files.push(file);}}
 await walk('data');const hashes={};
 for(const f of files){const data=await readFile(join(root,f));hashes[f.replaceAll('\\','/')]=digest(data);await mkdir(dirname(join(target,f)),{recursive:true});await writeFile(join(target,f),data);}
 for(const [f,hash]of Object.entries(hashes))assert.equal(digest(await readFile(join(root,f))),hash,'Source changed while snapshotting '+f);
 await writeFile(join(target,'audit-source-manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),root,hashes},null,2));
 console.log(JSON.stringify({runtime:target,files:files.length}));process.exit(0);
}

const {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign}=await import('../strategic-campaign.mjs');
const {scoutAssignments,scoutRoute,scoutOperator}=await import('../scouting-state.mjs');
const {cityIntelligence,validateVision}=await import('../strategic-vision.mjs');
const {STRATEGIC_SCOUTING_RULES}=await import('../data/design/strategic-scouting-rules.mjs');
const {ACTIONS}=await import('../domestic-designs.mjs');
const {FACTIONS}=await import('../engine.mjs');
const scenario=args.scenario||'guandu-200',seed=Number(args.seed||417),days=Number(args.days||30),label=args.label||'initial';
const name=`${scenario}-${seed}-${label}`,file=join(out,name+'.json'),eventsFile=join(out,name+'-events.jsonl'),checkpoint=join(out,name+'-save.json');
const s=args.resume?validateCampaign(JSON.parse(await readFile(resolve(args.resume),'utf8'))):newCampaign(seed,scenario);
const start=performance.now(),scouts=new Map(),departures=new Map(),plans=new Map(),battles=new Set(),seenNodes=new Set(),seenDecisions=new Set(),metrics={},samples=[],issues=[];
const m=f=>metrics[f]??={faction:f,name:FACTIONS[f]?.name||f,scoutStarts:0,scoutReports:0,scoutCityReports:0,scoutStops:0,scoutArrivals:0,domesticStarted:0,domesticCompleted:0,domesticFailed:0,constructionCompleted:0,productionCompleted:0,productiveResults:0,resourceCredits:{gold:0,grain:0,manpower:0},domesticInterrupted:0,departures:0,attackPlans:0,holdReasons:{},maxConcurrentScouts:0,cityHungerDays:0,armyHungerDays:0};
for(const f of Object.keys(s.campaign.ai.factions))m(f);
const sum=(xs,fn)=>xs.reduce((n,x)=>n+fn(x),0);
const emit=async event=>appendFile(eventsFile,JSON.stringify(event)+'\n');
async function inspect(){
 const tasks=scoutAssignments(s),counts=new Map(),targets=new Set();
 for(const t of tasks){
  const key=t.faction+':'+t.targetCity;assert.ok(!targets.has(key),'Duplicate scout target '+key);targets.add(key);
  counts.set(t.faction,(counts.get(t.faction)||0)+1);assert.ok(scoutRoute(s,t.homeCity,t.targetCity),'Illegal scouting endpoint '+t.id);
  const owner=scoutOperator(s,t);if(!owner||owner.location!==t.homeCity||owner.faction!==t.faction||owner.army)issues.push({day:s.campaign.day,type:'scout-operator-presence',task:t.id});
  if(!scouts.has(t.id)){const record={id:t.id,faction:t.faction,home:t.homeCity,target:t.targetCity,officer:t.officerId,startedDay:s.campaign.day,arrivedDay:null};scouts.set(t.id,record);m(t.faction).scoutStarts++;await emit({kind:'scout-start',...record});}
  if(t.phase==='watch'&&scouts.get(t.id).arrivedDay===null){scouts.get(t.id).arrivedDay=s.campaign.day;m(t.faction).scoutArrivals++;await emit({kind:'scout-arrive',id:t.id,faction:t.faction,day:s.campaign.day});}
 }
 for(const [f,n]of counts){assert.ok(n<=STRATEGIC_SCOUTING_RULES.maxAssignments,'Too many scouting assignments for '+f);m(f).maxConcurrentScouts=Math.max(m(f).maxConcurrentScouts,n);}
 for(const a of s.armies.filter(a=>!a.disbanded&&!a.defense&&Object.hasOwn(s.campaign.ai.factions,a.faction))){
  if(!departures.has(a.id)){const record={id:a.id,faction:a.faction,day:s.campaign.day,home:a.homeCity,target:a.target,units:a.units.length,troops:sum(a.units,u=>u.troops),task:a.task,targetIntelligence:a.target?{day:cityIntelligence(s,a.target,a.faction).day,visible:cityIntelligence(s,a.target,a.faction).visible}:null};departures.set(a.id,record);m(a.faction).departures++;await emit({kind:'departure',...record});}
 }
 for(const p of s.campaign.ai.plans){
  const previous=plans.get(p.id);if(!previous||previous.phase!==p.phase){const row={id:p.id,faction:p.faction,day:s.campaign.day,phase:p.phase,target:p.target,units:p.officerIds.length,reason:p.reason};plans.set(p.id,row);if(p.phase==='attack')m(p.faction).attackPlans++;await emit({kind:'plan',...row});}
 }
 for(const b of s.campaign.battles)if(!battles.has(b.id)){battles.add(b.id);await emit({kind:'battle',id:b.id,day:s.campaign.day,city:b.cityId,factions:b.battle.sides.map(x=>x.faction)});}
 for(const n of s.campaign.activity.nodes){if(seenNodes.has(n.id))continue;seenNodes.add(n.id);if(!Object.hasOwn(s.campaign.ai.factions,n.faction))continue;const row=m(n.faction);
  if(n.phase==='SCOUT_INTEL'){row.scoutReports++;if(/:city:/.test(n.sourceId))row.scoutCityReports++;}
  if(n.phase==='SCOUT_RECALL')row.scoutStops++;
  if(n.category==='domestic'){
   if(n.phase==='start')row.domesticStarted++;
   if(n.phase==='complete'){row.domesticCompleted++;if(ACTIONS[n.key]?.kind==='build')row.constructionCompleted++;if(['cash','grain','recruit'].includes(ACTIONS[n.key]?.kind))row.productionCompleted++;}
   if(['complete','failure'].includes(n.phase)&&n.result?.resourceCredit){const credits=n.result.resourceCredit;if(Object.values(credits).some(v=>v>0))row.productiveResults++;for(const k of ['gold','grain','manpower'])row.resourceCredits[k]+=credits[k]||0;}
   if(n.phase==='failure')row.domesticFailed++;
   if(n.phase==='cancel')row.domesticInterrupted++;
  }
  if(n.category==='domestic'&&['start','complete','failure','cancel'].includes(n.phase)||['SCOUT_OUT','SCOUT_INTEL','SCOUT_RECALL'].includes(n.phase))await emit({kind:'activity',id:n.id,day:n.day,faction:n.faction,phase:n.phase,key:n.key,city:n.cityId,officer:n.officerId,text:n.text,result:n.result});
 }
 for(const d of s.campaign.ai.decisions){const key=JSON.stringify(d);if(seenDecisions.has(key))continue;seenDecisions.add(key);if(d.kind==='hold')m(d.faction).holdReasons[d.reason]=(m(d.faction).holdReasons[d.reason]||0)+1;await emit({kind:'decision',...d});}
}
function takeSample(){
 const factions={};for(const f of Object.keys(metrics)){const cities=s.cities.filter(c=>c.owner===f),armies=s.armies.filter(a=>a.faction===f&&!a.disbanded),row=m(f);
  row.cityHungerDays+=cities.filter(c=>c.hunger>0).length;row.armyHungerDays+=armies.filter(a=>a.hunger>0).length;
  factions[f]={cities:cities.length,gold:sum(cities,c=>c.gold),grain:sum(cities,c=>c.grain),manpower:sum(cities,c=>c.manpower),troops:sum(cities,c=>sum(c.units,u=>u.troops))+sum(armies,a=>sum(a.units,u=>u.troops)),appointments:s.campaign.domestic.assignments.filter(a=>cities.some(c=>c.id===a.cityId)).length,scouts:scoutAssignments(s).filter(t=>t.faction===f).length,activeWork:s.campaign.domestic.assignments.filter(a=>cities.some(c=>c.id===a.cityId)&&a.action).length,armies:armies.length};
 }samples.push({day:s.campaign.day,factions});
}
async function saveReport(error=null){
 const report={scenario,seed,label,requestedDays:days,completedDay:s.campaign.day,seconds:Math.round((performance.now()-start)/1000),complete:!error&&(s.campaign.day>days||!!s.finished),error,issues,metrics:Object.values(metrics),scouts:[...scouts.values()],departures:[...departures.values()],plans:[...plans.values()],battles:battles.size,samples,sourceManifest:JSON.parse(await readFile('audit-source-manifest.json','utf8')),scope:'Unmodified nationwide scenario and shared daily engine, normal fog enabled, natural AI factions. Player keeps default orders and delegates encountered battles; no shortened roads, free resources, prescribed attacks or altered combat outcomes.'};
 await writeFile(file,JSON.stringify(report,null,2));await writeFile(checkpoint,serializeCampaign(s));return report;
}
try{
 await writeFile(eventsFile,'');takeSample();await inspect();console.log(JSON.stringify({kind:'start',scenario,seed,days,factions:Object.keys(metrics).length}));let calls=0,lastDay=s.campaign.day;
 while(s.campaign.day<=days&&!s.finished){
  assert.ok(calls++<(days+1)*30,'World stopped advancing');const t=performance.now();
  if(s.campaign.phase==='planning')assert.equal(beginExecution(s),null);
  await inspect();for(const b of activeBattles(s).filter(b=>b.awaiting))assert.equal(chooseEncounter(s,b.id,false),null);
  advanceCampaignDay(s);await inspect();
  if(s.campaign.day!==lastDay){lastDay=s.campaign.day;takeSample();validateVision(s);
   const report=await saveReport();console.log(JSON.stringify({kind:'day',scenario,seed,day:s.campaign.day,seconds:Math.round((performance.now()-start)/1000),stepSeconds:Math.round((performance.now()-t)/1000),scouts:scouts.size,scoutArrivals:sum(Object.values(metrics),x=>x.scoutArrivals),domesticCompleted:sum(Object.values(metrics),x=>x.domesticCompleted),departures:departures.size,attacks:sum(Object.values(metrics),x=>x.attackPlans),battles:battles.size}));
   if((s.campaign.day-1)%10===0){const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);}
  }
 }
 const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);const report=await saveReport();console.log(JSON.stringify({kind:'finish',scenario,seed,day:s.campaign.day,seconds:report.seconds,scouts:scouts.size,departures:departures.size,attacks:sum(Object.values(metrics),x=>x.attackPlans),battles:battles.size,issues:issues.length,complete:report.complete}));
}catch(e){await saveReport(e.stack);console.error(e.stack);process.exitCode=1;}
