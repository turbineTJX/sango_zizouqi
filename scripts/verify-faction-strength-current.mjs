import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {generateBattle} from '../battle-generator.mjs';
import {swapCustomBattle} from '../custom-battle.mjs';
import {planBattleCouncilsAI,lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
const base=resolve(process.argv[2]||'outputs/faction-strength-20261011');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const dirs=readdirSync(base).filter(n=>/^shard-\d+$/.test(n));
if(!dirs.length)dirs.push('.');
const data=read(join(base,dirs[0],'cases.json'));
assert.equal(data.rulesVersion,RULES_VERSION);
const rows=dirs.flatMap(d=>readFileSync(join(base,d,'battles.jsonl'),'utf8').trim().split('\n').map(s=>({...JSON.parse(s),dir:d})));
const selected=data.cases.filter(c=>
 c.mode==='main10'&&c.a==='cao'&&(c.z==='force-2'||c.mapId==='plain-open')||
 c.mode!=='main10'&&c.a==='cao'&&c.z==='force-2'||
 c.mode==='main10'&&c.mapId==='plain-open'&&c.a==='force-2'&&c.z==='force-3');
const checks=[],start=Date.now();
for(const c of selected)for(const swapped of [false,true]){
 const expected=rows.find(r=>r.caseId===c.id&&r.phase==='validation'&&r.seed===data.seeds.validation[0]&&r.swapped===swapped);
 assert.ok(expected?.sample,'Missing completed sample '+c.id);
 let draft={...structuredClone(c.draft),seed:expected.seed};if(swapped)draft=swapCustomBattle(draft);
 const state=generateBattle(draft);planBattleCouncilsAI(state.battle,[0,1]);assert.equal(lockDeployment(state.battle),null);
 while(!state.battle.result)stepBattle(state.battle,{aiSides:[0,1]});
 validateSave(state);const saved=read(join(base,expected.dir,expected.sample));
 assert.deepEqual(state.battle,saved.battle,'Live source differs from frozen battle '+c.id+' '+swapped);
 checks.push({caseId:c.id,swapped,ticks:state.battle.tick,result:state.battle.result});
 console.log(JSON.stringify(checks.at(-1)));
}
writeFileSync(join(base,'current-check.json'),JSON.stringify({rulesVersion:RULES_VERSION,checks:checks.length,allEqual:true,seconds:(Date.now()-start)/1000,rows:checks},null,2));
console.log(JSON.stringify({done:true,checks:checks.length,seconds:(Date.now()-start)/1000}));
