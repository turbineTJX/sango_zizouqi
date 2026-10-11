import assert from 'node:assert/strict';
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {RULES_VERSION} from '../combat-rules.mjs';
import {sourceHash} from './basic-balance-lib.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const root=resolve(args.input||'work/ai-fixes-20261009');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const tacticalFolders=(args.tactical||'tactical-final,tactical-validation').split(',');
const batches=await Promise.all(tacticalFolders.map(dir=>json(join(root,dir,'tactical-audit.json'))));
assert.ok(batches.every(b=>b.rulesVersion===RULES_VERSION&&b.sourceHash===sourceHash()),'Reports do not match the current runtime');
const tactical=batches.flatMap(b=>b.rows),identities=tactical.map(r=>JSON.stringify([r.id,r.seed,r.swapped]));
assert.equal(new Set(identities).size,identities.length,'Duplicate games cannot count as independent observations');
const tacticalSummary=[...new Set(tactical.map(r=>r.id))].map(id=>{
 const rows=tactical.filter(r=>r.id===id),first=rows[0];
 return {id,name:first.name,kind:first.kind,n:rows.length,originalWins:[0,1,null].map(w=>rows.filter(r=>r.originalWinner===w).length),
  expectedWinner:first.expectedWinner,expectedWins:first.expectedWinner===undefined||first.expectedWinner===null?null:rows.filter(r=>r.originalWinner===first.expectedWinner).length,
  byOrientation:[false,true].map(swapped=>({swapped,n:rows.filter(r=>r.swapped===swapped).length,wins:[0,1,null].map(w=>rows.filter(r=>r.swapped===swapped&&r.originalWinner===w).length)})),
  timeouts:rows.filter(r=>r.reason==='久战收兵').length,minTicks:Math.min(...rows.map(r=>r.ticks)),maxTicks:Math.max(...rows.map(r=>r.ticks)),
  maxGlobalQuiet:Math.max(...rows.map(r=>r.maxGlobalQuiet)),unchanged48:rows.filter(r=>Object.values(r.maxStreak).some(n=>n>=48)).length,
  replayed:rows.filter(r=>r.replayed).length,commands:rows.reduce((n,r)=>n+r.commands.length,0)};
});
const reverse=await json(join(root,'wuzhang-reverse-council','tactical-audit.json'));
assert.equal(reverse.sourceHash,sourceHash());assert.equal(reverse.councilMode,'simultaneous');
const normal=tactical.filter(r=>r.id==='wuzhang');
assert.equal(reverse.rows.length,normal.length);
const councilOrderDiagnostic={case:'wuzhang',n:normal.length,defaultWins:[0,1,null].map(w=>normal.filter(r=>r.originalWinner===w).length),
 reverseWins:[0,1,null].map(w=>reverse.rows.filter(r=>r.originalWinner===w).length),pairs:normal.map(r=>{
  const counterpart=reverse.rows.find(c=>c.seed===r.seed&&c.swapped===r.swapped);assert.ok(counterpart);
  const units=rows=>rows.opening.flatMap(s=>s.units).map(u=>[u.id,u.initial,u.type]).sort((a,b)=>a[0].localeCompare(b[0]));
  assert.deepEqual(units(r),units(counterpart),'Order diagnostics must retain every unit and troop count');
  const observed=({batch,replayed,...battle})=>battle;
  assert.deepEqual(observed(r),observed(counterpart),'Simultaneous controllers must retain the entire observed battle after reversing evaluation order');
  return {seed:r.seed,swapped:r.swapped,defaultWinner:r.originalWinner,reverseWinner:counterpart.originalWinner};
 })};
councilOrderDiagnostic.changedWinners=councilOrderDiagnostic.pairs.filter(p=>p.defaultWinner!==p.reverseWinner).length;
const campaigns=[];
for(const entry of await readdir(root,{withFileTypes:true})){
 if(!entry.isDirectory())continue;
 let text;try{text=await readFile(join(root,entry.name,'campaign-audit.json'),'utf8');}catch(error){if(error.code==='ENOENT')continue;throw error;}
 const d=JSON.parse(text),departures=d.departures.filter(a=>!a.existingAtStart),attacks=departures.filter(a=>a.task==='择敌出征');
 for(const [file,hash] of Object.entries(d.sourceHashes))assert.equal(createHash('sha256').update(await readFile(resolve(file))).digest('hex'),hash,'Campaign report differs from current runtime: '+file);
 const uniquePlans=new Map((d.planTrace||d.plans).map(p=>[p.id,p]));
 const decisions={};for(const row of d.decisions){const key=row.kind+':'+row.reason;decisions[key]=(decisions[key]||0)+1;}
 const trace=d.strategyTrace?.filter(r=>r.revision>0)||[];
 campaigns.push({directory:entry.name,...d.metrics,attackArmies:attacks.length,attackUnitDistribution:attacks.map(a=>a.units),attackTroopDistribution:attacks.map(a=>a.troops),
  activePlans:[...uniquePlans.values()].filter(p=>!['complete','cancelled'].includes(p.phase)).length,
  cancelledPlans:[...uniquePlans.values()].filter(p=>p.phase==='cancelled').map(p=>({id:p.id,faction:p.faction,target:p.target,createdDay:p.createdDay,updatedDay:p.updatedDay,reason:p.reason})),
  reviews:trace.length,reviewsWithoutCapture:trace.filter(r=>!r.trace.at(-1).candidates.some(c=>c.kind==='capture')).length,
  goalKinds:trace.reduce((o,r)=>(o[r.goal.kind]=(o[r.goal.kind]||0)+1,o),{}),
  admission:trace.flatMap(r=>r.trace.at(-1).admission).reduce((o,a)=>(o[a.stage]=(o[a.stage]||0)+1,o),{}),decisions});
}
campaigns.sort((a,b)=>a.directory.localeCompare(b.directory));
assert.equal(campaigns.length,4,'The four requested natural runs must all finish');
assert.ok(campaigns.every(c=>c.completedDay===c.startDay+c.requestedDays||c.finished));
const units=await json(join(root,args['unit-tests']||'decision-tests/unit-tests.json'));
assert.equal(units.failed.length,0);assert.equal(units.missing.length,0);
const coalition=await json(join(root,'coalition-190-20261010','campaign-save.json'));
const audit=await json(join(root,'coalition-190-20261010','campaign-audit.json'));
const id='person-461',records=coalition.campaign.activity.records[id];
const personnelEvidence={scenario:'coalition-190',seed:20261010,officerId:id,officer:'陈琳',
 transfers:audit.decisions.filter(d=>d.kind==='transfer'&&d.reason.includes('调任陈琳')),
 domesticRecords:records.filter(r=>['domestic','assigned','governor'].includes(r.snapshot.code)),
 workHistory:coalition.campaign.domestic.workHistory[id]||[],
 staffing:coalition.campaign.ai.staffing.filter(p=>p.officerId===id),
 history:records.map(r=>({fromDay:r.fromDay,toDay:r.toDay,...r.snapshot})),
 deliveries:coalition.campaign.activity.nodes.filter(n=>n.officerId===id&&n.result?.transport).map(n=>({day:n.day,text:n.text,...n.result.transport}))};
const result={date:args.date||'2026-10-10',rulesVersion:RULES_VERSION,sourceHash:sourceHash(),unitTests:{domains:units.decisionDomains,passed:units.passed,failed:units.failed.length,missing:units.missing.length},
 totals:{naturalRuns:campaigns.length,worldDays:campaigns.reduce((n,c)=>n+c.requestedDays,0),tacticalGames:tactical.length,
  replayedTacticalGames:tactical.filter(r=>r.replayed).length,deterministicCampaignCheckpoints:campaigns.reduce((n,c)=>n+c.deterministicCheckpoints,0),
  newArmies:campaigns.reduce((n,c)=>n+c.newDepartures,0),attackArmies:campaigns.reduce((n,c)=>n+c.attackArmies,0),battles:campaigns.reduce((n,c)=>n+c.settledBattles,0),captures:campaigns.reduce((n,c)=>n+c.captures,0),
  cityHungerDays:campaigns.reduce((n,c)=>n+c.cityHungerDays,0),armyHungerDays:campaigns.reduce((n,c)=>n+c.armyHungerDays,0),diagnosticGames:reverse.rows.length},tactical:tacticalSummary,councilOrderDiagnostic,campaigns,personnelEvidence};
if(args.baseline){const baseline=await json(join(resolve(args.baseline),'summary.json'));result.comparison={baselineRules:baseline.rulesVersion,
 councilChangedWinners:{before:baseline.councilOrderDiagnostic.changedWinners,after:councilOrderDiagnostic.changedWinners},
 tactical:tacticalSummary.map(t=>({id:t.id,before:baseline.tactical.find(b=>b.id===t.id)?.originalWins,after:t.originalWins})),
 personnel:{beforeTransfers:baseline.personnelEvidence.transfers.length,afterTransfers:personnelEvidence.transfers.length,beforeDomesticRecords:baseline.personnelEvidence.domesticRecords.length,afterDomesticRecords:personnelEvidence.domesticRecords.length},
 campaigns:campaigns.map(c=>({directory:c.directory,before:baseline.campaigns.find(b=>b.directory===c.directory),after:c}))};}
await mkdir(root,{recursive:true});await writeFile(join(root,'summary.json'),JSON.stringify(result,null,2));
await writeFile(join(root,'personnel-churn.json'),JSON.stringify(personnelEvidence,null,2));
console.log(JSON.stringify({totals:result.totals,tactical:result.tactical,campaigns:campaigns.map(c=>({scenario:c.scenario,seed:c.seed,days:c.requestedDays,newArmies:c.newDepartures,attackArmies:c.attackArmies,battles:c.settledBattles,captures:c.captures,reviews:c.reviews,reviewsWithoutCapture:c.reviewsWithoutCapture})),personnel:{transfers:personnelEvidence.transfers.length,domesticRecords:personnelEvidence.domesticRecords.length,deliveries:personnelEvidence.deliveries.length}},null,2));
