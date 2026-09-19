import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,battleStratagems,STRATAGEMS,issueCommand} from '../engine.mjs';
import {planEnemyArmy,chooseEnemyCommand} from '../battle-ai.mjs';
import {LEARNING_TROOPS,tacticLearningLimits,validTacticLearning} from '../tactic-learning.mjs';
import {validLoadout} from '../tactics.mjs';
import {canOccupy} from '../battlefield.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

const files=['tactic-learning.mjs','tactics.mjs','engine.mjs','battle-ai.mjs','scenarios.mjs','progression.mjs','combat-rules.mjs','expanded-tactics.mjs','unit-stats.mjs','passives.mjs','famous-officers.mjs','officer-catalog.mjs','data/officers-source.json'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')]));
const source=hashes(),runs=[];
const snapshot=b=>b.sides.flatMap(s=>s.units).map(u=>({id:u.id,learning:u.tacticLearning,tactics:u.tactics}));
function tick(b){stepBattle(b);if(!b.result){const command=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);if(command)issueCommand(b,command);}}
for(const [index,type] of LEARNING_TROOPS.entries())for(const level of [1,3,5,8,10])for(const seed of [101,102,103,104]){
 const terrain=type==='ship'?'river':['land','forest','hill'][(seed+index)%3];
 const entry=(id,troops)=>({id,type,troops,level});
 const ids=type==='ship'?['person-246','cao','person-99','person-24','jia','person-93']:['cao','dun','ju','shao','yan','gao'];
 const s=createScenario('custom-battle',seed,20,null,{seed,terrain,ownTeam:ids.slice(0,3).map((id,i)=>entry(id,[3000,1000,500][i])),enemyTeam:ids.slice(3).map((id,i)=>entry(id,[3000,500,1000][i]))}),b=s.battle;
 validateSave(s);const learning=structuredClone(snapshot(b));planEnemyArmy(b);const planned=structuredClone(b);planEnemyArmy(b);assert.deepEqual(b,planned);assert.deepEqual(snapshot(b),learning);
 for(const u of b.sides.flatMap(s=>s.units)){
  assert.ok(validTacticLearning(u)&&validLoadout(u,u.tactics));assert.ok(u.tactics.length<=4);
  for(const troop of LEARNING_TROOPS){const limits=tacticLearningLimits(u,troop),p=u.tacticLearning.byTroop[troop];for(const kind of ['low','high']){assert.ok(p[kind].length<=limits[kind]);if(limits.guarantee&&level>=limits.guarantee)assert.equal(p[kind].length,limits[kind]);}}
 }
 lockDeployment(b);let restored=null;
 while(!b.result){
  tick(b);if(restored)tick(restored.battle);
  const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');assert.equal(new Set(active.map(u=>`${u.x},${u.y}`)).size,active.length);
  for(const u of active)assert.ok(Number.isFinite(u.hp)&&u.hp>0&&canOccupy(b,u,u.x,u.y));
  if(b.tick===20)restored=validateSave(JSON.parse(JSON.stringify(s)));assert.ok(b.tick<=480);
 }
 assert.ok(restored);assert.deepEqual(restored.battle,b);assert.deepEqual(snapshot(b),learning);validateSave(s);
 for(const u of b.sides.flatMap(s=>s.units))assert.ok(Object.keys(u.tacticCasts).every(id=>u.tactics.includes(id)));
 runs.push({type,terrain,level,seed,ticks:b.tick,winner:b.result.winner,casts:b.sides.map(s=>s.units.reduce((n,u)=>n+u.skillCasts,0)),slots:b.sides.map(s=>s.units.map(u=>u.tactics.length))});
}
assert.deepEqual(hashes(),source,'Audit source changed while running');
const result={rulesVersion:RULES_VERSION,passed:true,battles:runs.length,checks:['八兵种、多等级、独立学习种子','非均分兵力、双方固定军略规则','B/C禁学高级、分适性名额与保底','AI重布阵幂等、不更换已学战法','合法占位、只施放所学、学习记录不变','第20步JSON存档续战与最终结果一致'],source,runs};
const output=`docs/tactic-learning-rules${RULES_VERSION}`;
mkdirSync(output,{recursive:true});writeFileSync(`${output}/audit.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:true,battles:runs.length,checks:result.checks}));
