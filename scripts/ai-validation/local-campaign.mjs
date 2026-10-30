import assert from 'node:assert/strict';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {snapshot,verifySnapshot,writeJSON,atomic,sha,inside,exists} from './storage.mjs';

export function assessLocalLoop({winner,captures,departures,battles,reinvestment,cityless}){
 const factions=[...new Set([winner,...captures.flatMap(c=>[c.from,c.to]),...departures.map(d=>d.faction),...battles.flatMap(b=>b.factions)])].filter(f=>f&&f!=='neutral');
 const byFaction=Object.fromEntries(factions.map(f=>{
  const gains=captures.filter(c=>c.to===f&&c.from!=='neutral'),first=gains[0];
  const continuation=first&&departures.find(d=>d.faction===f&&d.day>first.day&&gains.some(g=>g.city===d.target&&g.city!==first.city&&g.day>=d.day));
  return [f,{firstConquest:!!first,continuedOffensive:!!continuation,
   consecutiveConquests:new Set(gains.map(g=>g.city)).size>=2,actualWar:battles.some(b=>b.factions.includes(f)),
   conqueredCityUsed:!!first&&reinvestment.some(e=>e.faction===f&&gains.some(g=>g.city===e.cityId&&g.day<e.day)),
   rivalLostAllCities:cityless.some(e=>e.faction!==f&&gains.some(g=>g.from===e.faction&&g.day===e.day)),localUnification:winner===f}];
 }));
 // Preserve partial progress when nobody has won yet; absence of final victory
 // must not erase a real first conquest or productive use of the captured city.
 const observedFaction=winner||factions.sort((a,b)=>Object.values(byFaction[b]).filter(Boolean).length-Object.values(byFaction[a]).filter(Boolean).length)[0]||null;
 const checks=byFaction[observedFaction]||{};
 return {status:winner&&Object.values(checks).every(Boolean)?'observed':'not-established',observedFaction,checks,byFaction,nationwideUnification:'not-assessed'};
}

async function observe(source,input,seed,out,{days,deadline,stallDays}){
 const load=f=>import(pathToFileURL(join(source.root,f))),{registerCampaignAuditScenario,nationalScenario}=await load('national-scenarios.mjs');
 if(!nationalScenario(input.spec.id))registerCampaignAuditScenario(input);
 const {newCampaign,advanceCampaignDay,serializeCampaign,validateCampaign,activeBattles}=await load('strategic-campaign.mjs');
 const {pendingDomesticProposals}=await load('domestic.mjs');
 const s=newCampaign(seed,input.spec.id,input.spec.factions[0],{allAI:true}),initial=serializeCampaign(s),started=Date.now();
 await mkdir(out,{recursive:true});await atomic(join(out,'initial-save.json'),initial);
 const owners=new Map(s.cities.map(c=>[c.id,c.owner])),knownArmies=new Set(),knownBattles=new Set(),knownEvents=new Set(),knownCityless=new Set(),concentrationStates=new Map(),revisions=new Map();
 const captures=[],departures=[],battles=[],reinvestment=[],cityless=[],concentrations=[],reviews=[],checkpoints=[],hunger=[];
 let lastCaptureDay=1,status='limit';
 const territory=()=>Object.fromEntries(input.spec.factions.map(f=>[f,s.cities.filter(c=>c.owner===f).length]));
 function inspect(){
  assert.equal(s.campaign.allAI,true);assert.equal(s.campaign.domestic.incidents.enabled,true);assert.equal(pendingDomesticProposals(s).length,0);
  for(const b of activeBattles(s)){assert.equal(b.control,'auto');assert.equal(b.awaiting,false);assert.equal(b.battle.deploymentLocked,true);}
  for(const c of s.cities){
   for(const k of ['gold','grain','manpower'])assert.ok(Number.isSafeInteger(c[k])&&c[k]>=0);
   const old=owners.get(c.id);if(old!==c.owner){captures.push({day:s.campaign.day,city:c.id,name:c.name,from:old,to:c.owner});owners.set(c.id,c.owner);lastCaptureDay=s.campaign.day;}
   if(c.hunger)hunger.push({day:s.campaign.day,kind:'city',id:c.id,faction:c.owner});
  }
  for(const a of s.armies.filter(a=>!a.disbanded)){
   assert.ok(Number.isSafeInteger(a.supply)&&a.supply>=0);
   if(!a.defense&&!knownArmies.has(a.id)){knownArmies.add(a.id);departures.push({day:s.campaign.day,id:a.id,faction:a.faction,home:a.homeCity,target:a.target,task:a.task,officerIds:a.units.map(u=>u.id),troops:a.units.reduce((n,u)=>n+u.troops,0)});}
   if(a.hunger)hunger.push({day:s.campaign.day,kind:'army',id:a.id,faction:a.faction});
  }
  for(const b of s.campaign.battles)if(b.settled&&!b.banditCampId&&!knownBattles.has(b.id)){
   knownBattles.add(b.id);battles.push({id:b.id,startedDay:b.startedDay,endedDay:b.endedDay,city:b.cityId,factions:b.battle.sides.map(x=>x.faction),report:structuredClone(b.report)});
  }
  for(const e of s.campaign.domestic.events)if(e.phase==='complete'&&!knownEvents.has(e.id)){
   knownEvents.add(e.id);if(captures.some(c=>c.city===e.cityId&&c.to===e.faction&&c.day<e.day))reinvestment.push(structuredClone(e));
  }
  for(const f of input.spec.factions)if(!knownCityless.has(f)&&!s.cities.some(c=>c.owner===f)){knownCityless.add(f);cityless.push({day:s.campaign.day,faction:f,activeArmies:s.armies.filter(a=>a.faction===f&&!a.disbanded).length});}
  for(const p of s.campaign.ai.concentrations){const key=p.faction+':'+p.createdDay,text=JSON.stringify(p);if(concentrationStates.get(key)!==text){concentrationStates.set(key,text);concentrations.push({day:s.campaign.day,...structuredClone(p)});}}
  for(const [f,p]of Object.entries(s.campaign.ai.factions))if(revisions.get(f)!==p.strategy.revision){revisions.set(f,p.strategy.revision);reviews.push({day:s.campaign.day,faction:f,goal:structuredClone(p.strategy.goal),trace:structuredClone(p.strategy.trace.at(-1))});}
 }
 async function checkpoint(){
  const bytes=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(bytes))),bytes);
  await atomic(join(out,'campaign-save.json'),bytes);
  const progress={caseId:input.spec.id,seed,day:s.campaign.day,territory:territory(),captures:captures.length,battles:battles.length,departures:departures.length,hungerDays:hunger.length,seconds:Math.round((Date.now()-started)/1000)};
  await writeJSON(join(out,'progress.json'),progress);console.log(JSON.stringify(progress));
 }
 try{
  inspect();await checkpoint();
  while(!s.finished&&s.campaign.day<=days){
   if(Date.now()>=deadline){status='budget-exhausted';break;}
   const day=s.campaign.day,replay=day%30===0?validateCampaign(JSON.parse(serializeCampaign(s))):null;
   const step=advanceCampaignDay(s);assert.ok(s.campaign.day>day||s.finished,'AI failed to advance: '+JSON.stringify(step));
   if(replay){advanceCampaignDay(replay);assert.equal(serializeCampaign(replay),serializeCampaign(s));checkpoints.push({day:s.campaign.day,deterministic:true});}
   inspect();
   if((s.campaign.day-1)%100===0)await checkpoint();
   // Stop a long unresolved window to inspect it. This is diagnostic stagnation,
   // not a proof that no later recovery or conquest is possible.
   if(s.campaign.day>=601&&s.campaign.day-lastCaptureDay>=stallDays&&!activeBattles(s).length){status='stalled';break;}
  }
  if(s.finished){assert.equal(s.finished,'victory');assert.ok(s.cities.every(c=>c.owner===s.cities[0].owner&&c.owner!=='neutral'));status='unified';}
  await checkpoint();await verifySnapshot(source);
  const winner=s.finished?s.cities[0].owner:null,admission={};
  for(const r of reviews.filter(r=>r.day>s.campaign.day-100))for(const a of r.trace?.admission||[]){const k=a.stage+': '+a.reason;admission[k]=(admission[k]||0)+1;}
  const result={scope:'synthetic-local-campaign',sourceHash:source.hash,inputHash:sha(JSON.stringify(input)),initialSaveHash:sha(initial),seed,status,winner,
   day:s.campaign.day,territory:territory(),seconds:Math.round((Date.now()-started)/1000),captures,departures,battles,reinvestment,cityless,concentrations,reviews,checkpoints,hunger,
   recentAdmission:Object.entries(admission).sort((a,b)=>b[1]-a[1]),
   loop:assessLocalLoop({winner,captures,departures,battles,reinvestment,cityless})};
  await writeJSON(join(out,'result.json'),result);return result;
 }catch(e){await atomic(join(out,'failed-save.json'),serializeCampaign(s));await atomic(join(out,'failure.txt'),e.stack);throw e;}
}

export async function main(argv){
 const args=Object.fromEntries(argv.map(x=>{const m=x.match(/^--([a-z-]+)=(.*)$/);assert.ok(m);return [m[1],m[2]];}));
 const root=resolve(args.source||'.'),out=resolve(args.out||'.local/ai-local-campaign/'+new Date().toISOString().replaceAll(/[:.]/g,'-'));
 inside(join(process.cwd(),'.local'),out);assert.ok(!await exists(out),'Use a fresh output directory');
 const days=Number(args.turns||100)*10,seeds=(args.seeds||'417').split(',').map(Number),seconds=Number(args.seconds||900),stallDays=Number(args['stall-days']||300);
 assert.ok(Number.isSafeInteger(stallDays)&&stallDays>=300,'Stagnation observation must be at least 300 days');
 assert.ok(Number.isSafeInteger(days)&&days>=10&&Number.isFinite(seconds)&&seconds>0&&seconds<=28800&&seeds.every(s=>Number.isSafeInteger(s)&&s>=0&&s<=0xffffffff)&&new Set(seeds).size===seeds.length);
 const source=await snapshot(root,join(out,'source')),load=f=>import(pathToFileURL(join(source.root,f)));
 const api={...await load('national-scenarios.mjs'),...await load('road-network.mjs'),...await load('officer-catalog.mjs')};
 const {LOCAL_CASES,buildLocalCampaignInput}=await load('scripts/ai-validation/local-campaign-cases.mjs');
 const cases=(args.cases||LOCAL_CASES.map(c=>c.id).join(',')).split(','),inputs=cases.map(id=>buildLocalCampaignInput(api,id));
 const deadline=Date.now()+seconds*1000;await writeJSON(join(out,'config.json'),{source,inputs,seeds,days,seconds,stallDays,scope:'synthetic-local-campaign',automaticPromotion:false});
 const rows=[];for(const input of inputs)for(const seed of seeds){if(Date.now()>=deadline)break;rows.push(await observe(source,input,seed,join(out,input.spec.id+'-'+seed),{days,deadline,stallDays}));}
 const summary=rows.map(r=>({scenario:r.territory,caseId:inputs.find(i=>sha(JSON.stringify(i))===r.inputHash).spec.id,seed:r.seed,status:r.status,day:r.day,winner:r.winner,captures:r.captures.length,battles:r.battles.length,departures:r.departures.length,hungerDays:r.hunger.length,loop:r.loop,recentAdmission:r.recentAdmission.slice(0,6)}));
 await writeJSON(join(out,'summary.json'),{scope:'synthetic-local-campaign',sourceHash:source.hash,complete:rows.length===inputs.length*seeds.length&&rows.every(r=>r.status!=='budget-exhausted'),rows:summary});
 await atomic(join(out,'summary.md'),['# 局部战略 AI 闭环诊断','',
  '构造的4城／6城剧本。原始道路距离、默认钱粮兵员、真实行动、迷雾及战斗结算共用；不等于全国自然统一，不自动晋级策略。',
  `达到观察上限或${stallDays}天无占城后的停滞标记不代表永远不能统一。`,'',
  '| 输入 | 种子 | 截止日 | 状态 | 占城 | 势力战 | 闭环 |','| --- | --- | --- | --- | --- | --- | --- |',
  ...summary.map(r=>`| ${r.caseId} | ${r.seed} | ${r.day} | ${r.status} | ${r.captures} | ${r.battles} | ${r.loop.status} |`),'',
  ...summary.flatMap(r=>[`${r.caseId} / ${r.seed} 最近评审候选检查（含重复目标，不是独立概率）：`,...r.recentAdmission.map(([reason,n])=>`- ${reason}：${n}`),'']),
  '源码指纹：'+source.hash,''].join('\n'));
 return {out,summary};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main(process.argv.slice(2)).then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(e.stack);process.exitCode=1;});
