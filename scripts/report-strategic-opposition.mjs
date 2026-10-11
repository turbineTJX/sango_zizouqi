import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {RULES_VERSION} from '../combat-rules.mjs';
import {sourceHash} from './basic-balance-lib.mjs';

const root='work/precombat-validation',folders=['guandu-release','red-cliffs-release'];
const digest=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
const runs=[];
for(const folder of folders){
 const a=JSON.parse(await readFile(join(root,folder,'campaign-audit.json'),'utf8'));
 const s=JSON.parse(await readFile(join(root,folder,'campaign-save.json'),'utf8'));
 assert.equal(s.rulesVersion,RULES_VERSION);assert.equal(s.campaign.ai.version,12);assert.equal(s.campaign.ai.algorithms.battlePredictor,'attrition-v3');
 const sourceDifferences=[];for(const [file,hash]of Object.entries(a.sourceHashes))if(await digest(file)!==hash)sourceDifferences.push(file);
 const executionDifferences=sourceDifferences.filter(file=>file!=='ai-decision-tests.mjs');assert.deepEqual(executionDifferences,[],'Current execution rules differ from '+folder);
 const battles=s.campaign.battles.filter(b=>b.settled).map(b=>{
  const side=b.attackSide,attacker=b.report.stats[side],defender=b.report.stats[1-side];
  const ids=b.armies.filter(a=>a.faction===attacker.faction).map(a=>a.id);
  const p=a.planTrace.find(p=>p.tasks.some(t=>t.kind==='assault'&&t.refs.some(ref=>ids.some(id=>ref==='army:'+id))));
  const goal=a.strategyTrace.find(t=>t.goal?.planId===p?.id&&t.faction===attacker.faction)?.goal;
  return {battleId:b.id,city:b.cityId,start:b.startedDay,end:b.endedDay,attacker:attacker.faction,defender:defender.faction,voluntaryOperation:!!p,
   won:b.report.winner===side,attackerInitial:attacker.initial,defenderInitial:defender.initial,actualWoundedAndKilled:attacker.wounded+attacker.killed,
   actualLossShare:(attacker.wounded+attacker.killed)/Math.max(1,attacker.initial),prediction:goal?.military||null};
 });
 runs.push({folder,...a.metrics,sourceFiles:Object.keys(a.sourceHashes).length,testRegistryDifferences:sourceDifferences,battles,
  neutralCaptures:a.captures.filter(c=>c.from==='neutral').length,voluntaryDepartures:a.departures.filter(d=>d.task==='择敌出征').length});
}
const battles=runs.flatMap(r=>r.battles),voluntary=battles.filter(b=>b.voluntaryOperation);
const unit=JSON.parse(await readFile(join(root,'unit-current','unit-tests.json'),'utf8'));
assert.deepEqual(unit.failed,[]);assert.deepEqual(unit.skipped,[]);assert.deepEqual(unit.missing,[]);
assert.equal(unit.rulesVersion,RULES_VERSION);assert.equal(unit.sourceHash,sourceHash());
const calibration={};for(const batch of ['development','validation']){
 const record=JSON.parse(await readFile(join(root,batch+'-release','report.json'),'utf8'));
 assert.equal(record.summary.rulesVersion,RULES_VERSION);assert.equal(record.summary.sourceHash,sourceHash());calibration[batch]=record.summary;
}
const report={rulesVersion:RULES_VERSION,aiVersion:12,strategyVersion:8,calibration,runs,summary:{gameDays:runs.reduce((n,r)=>n+r.requestedDays,0),factionObservations:runs.reduce((n,r)=>n+r.aiFactions,0),
 settledBattles:battles.length,voluntaryBattles:voluntary.length,attackerWins:voluntary.filter(b=>b.won).length,attackerLosses:voluntary.filter(b=>!b.won).length,
 cityHungerDays:runs.reduce((n,r)=>n+r.cityHungerDays,0),armyHungerDays:runs.reduce((n,r)=>n+r.armyHungerDays,0),deterministicCheckpoints:runs.reduce((n,r)=>n+r.deterministicCheckpoints,0),
 decisionDomains:unit.decisionDomains,unitFiles:unit.files,unitTestsPassed:unit.passed},
 scope:'Two original natural all-AI runs with ordinary fog and incidents, no injected troops, funds, wars or outcomes. Runtime uses symmetric static combat assessment without battle simulation. A power-ratio gate is not a calibrated success probability. Empty occupation, departures and settled battle outcomes are separate. This does not establish universal win rate or eventual unification.'};
await writeFile(join(root,'summary.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));
