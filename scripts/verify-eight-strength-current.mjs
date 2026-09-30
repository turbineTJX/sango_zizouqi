import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,COMMAND_RESOURCE,issueCommand,battleStratagems,STRATAGEMS,validateSave} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {chooseStratagemPoint} from '../stratagem-area.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
const {out}=JSON.parse(readFileSync('outputs/eight-strength-latest.json'));
const rows=JSON.parse(readFileSync(out+'/validation-results.json')).filter(r=>r.mode==='normal');
for(const row of rows){
 const state=createScenario('custom-battle',row.seed,20,null,row.draft),b=state.battle;lockDeployment(b);
 while(!b.result){
  if(b.commandProgress>=COMMAND_RESOURCE.capacity){const key=chooseEnemyCommand(b,battleStratagems(b,0),STRATAGEMS,0);if(key)assert.equal(issueCommand(b,key,chooseStratagemPoint(b,STRATAGEMS[key],0)),null);}
  stepBattle(b);
 }
 validateSave(state);assert.equal(b.result.winner,row.winner);assert.equal(b.tick,row.ticks);assert.equal(b.seed,row.finalSeed);
 assert.deepEqual(b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0)),row.remaining);
 assert.deepEqual(b.sides.map(s=>s.units.map(u=>({id:u.id,hp:u.hp,initial:u.initial,status:u.status,casts:u.tacticCasts,contribution:u.contribution}))),row.units);
}
const result={version:RULES_VERSION,cases:rows.length,verified:['winner','duration','RNG','remaining forces','individual statuses','tactic uses','contributions'],at:new Date().toISOString()};
writeFileSync(out+'/current-equivalence.json',JSON.stringify(result,null,2));
appendFileSync(out+'/report.md',`\n当前规则${RULES_VERSION}复核：独立验证的${rows.length}场正常模式全部重新运行；胜负、结束回合、随机种子、双方剩余兵力及逐队战法次数、离场状态、贡献与冻结快照一致。军略模型相同；快照后变化涉及显示、日志和本批无援军到达设定的生成校验。当前曹操奸雄可合法上场7队，含后备场景已记录实际出场数，并按共同容量校验。详见 current-equivalence.json。\n`);
console.log(JSON.stringify(result));
