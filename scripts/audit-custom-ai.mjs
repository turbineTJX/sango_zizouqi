import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,issueCommand,battleStratagems,STRATAGEMS,COMMAND_RESOURCE,validateSave} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {canOccupy} from '../battlefield.mjs';
import {validLoadout} from '../tactics.mjs';
const count=Number(process.argv[2]||16);
assert.ok(Number.isInteger(count)&&count>0);
const unit=(id,type)=>({id,type,troops:3000,level:5});
const army=(ids,types)=>ids.map((id,i)=>unit(id,types[i]));
const a=['cao','liao','chu','jia','dun','yu'],z=['shao','yan','wen','he','ju','tian'];
const mixed=['spear','cavalry','halberd','crossbow','archer','logistics'];
const cases=[
  {name:'枪兵单挑',terrain:'land',ownTeam:[unit('cao','spear')],enemyTeam:[unit('shao','spear')]},
  {name:'骑兵对远程',terrain:'land',ownTeam:army(a.slice(0,3),['cavalry','cavalry','cavalry']),enemyTeam:army(z.slice(0,3),['archer','crossbow','siege'])},
  {name:'枪戟对骑兵',terrain:'land',ownTeam:army(a.slice(0,3),['spear','halberd','spear']),enemyTeam:army(z.slice(0,3),['cavalry','cavalry','cavalry'])},
  ...['land','forest','hill','marsh'].map(terrain=>({name:'六兵种协同 · '+terrain,terrain,ownTeam:army(a,mixed),enemyTeam:army(z,mixed)})),
  {name:'兵器与辅兵',terrain:'hill',ownTeam:army(a,['spear','siege','siege','crossbow','halberd','logistics']),enemyTeam:army(z,mixed)},
  {name:'水陆混编',terrain:'river',ownTeam:army(a,['ship','ship','spear','crossbow','cavalry','logistics']),enemyTeam:army(z,['ship','ship','halberd','archer','siege','logistics'])},
  {name:'六舰对决',terrain:'river',ownTeam:army(a,Array(6).fill('ship')),enemyTeam:army(z,Array(6).fill('ship'))},
];
const files=['engine.mjs','battle-ai.mjs','tactics.mjs','unit-stats.mjs','combat-rules.mjs','scenarios.mjs','custom-battle.mjs','engagement.mjs','support-rules.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL('../'+f,import.meta.url))).digest('hex')]));
const before=hashes(),results=[];
for(const c of cases){
 const runs=[];
 for(const swapped of [false,true])for(let i=0;i<count;i++){
  const seed=919000+i*7919,draft={...c,seed,ownTeam:swapped?c.enemyTeam:c.ownTeam,enemyTeam:swapped?c.ownTeam:c.enemyTeam};
  const state=createScenario('custom-battle',seed,20,null,draft),b=state.battle;
  const known=battleStratagems(b,1),commands={},actions={},targets={},firstDamage=[null,null];
  let still=0,maxStill=0,resumed=null,lastEnemySerial=0;
  const snapshot=()=>JSON.stringify(b.sides.map(s=>s.units.map(u=>[u.x,u.y,u.hp,u.status])));
  const initial=b.sides.map(s=>s.units.map(u=>({id:u.id,type:u.type,x:u.x,y:u.y,tactics:u.tactics})));
  lockDeployment(b);
  while(!b.result){
   if(b.commandProgress>=COMMAND_RESOURCE.capacity){const key=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);if(key){assert.equal(issueCommand(b,key),null);if(resumed)assert.equal(issueCommand(resumed.battle,key),null);}}
   const previous=snapshot();stepBattle(b);if(resumed)stepBattle(resumed.battle);
   assert.ok(b.tick<=480);
   const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
   assert.equal(new Set(active.map(u=>`${u.x},${u.y}`)).size,active.length);
   for(const u of active){assert.ok(canOccupy(b,u,u.x,u.y));assert.ok(Number.isFinite(u.hp)&&u.hp>0);assert.ok(validLoadout(u,u.tactics));}
   if(b.enemyCommand.commandSerial!==lastEnemySerial){const key=b.enemyCommand.lastCommand.key;assert.ok(known.includes(key));assert.equal(b.enemyCommand.commandProgress,0);commands[key]=(commands[key]||0)+1;lastEnemySerial=b.enemyCommand.commandSerial;}
   for(let side=0;side<2;side++)if(firstDamage[side]===null&&b.sides[side].units.some(u=>u.battleDamage>0))firstDamage[side]=b.tick;
   for(const u of b.sides[1].units.filter(u=>u.status==='active')){actions[u.action]=(actions[u.action]||0)+1;if(u.passiveState.targetId)targets[u.id+':'+u.passiveState.targetId]=(targets[u.id+':'+u.passiveState.targetId]||0)+1;}
   still=previous===snapshot()?still+1:0;maxStill=Math.max(maxStill,still);
   if(i===0&&b.tick===20)resumed=validateSave(JSON.parse(JSON.stringify(state)));
  }
  if(resumed)assert.deepEqual(resumed.battle,b);
  validateSave(JSON.parse(JSON.stringify(state)));
  runs.push({seed,swapped,result:b.result,ticks:b.tick,firstDamage,maxStill,commands,actions,targets,initial,enemyUnits:b.sides[1].units.map(u=>({id:u.id,name:u.name,type:u.type,hp:u.hp,casts:u.skillCasts,damageTaken:u.battleDamage,healed:u.healed}))});
 }
 const summary={name:c.name,runs:runs.length,enemyWins:runs.filter(r=>r.result.winner===1).length,timeout:runs.filter(r=>r.result.reason==='久战收兵').length,meanTicks:Math.round(runs.reduce((n,r)=>n+r.ticks,0)/runs.length),enemyCommands:runs.reduce((n,r)=>n+Object.values(r.commands).reduce((a,b)=>a+b,0),0),maxStill:Math.max(...runs.map(r=>r.maxStill)),enemyCasts:runs.reduce((n,r)=>n+r.enemyUnits.reduce((n,u)=>n+u.casts,0),0)};
 results.push({config:c,summary,runs});console.log(JSON.stringify(summary));
}
const after=hashes(),stable=JSON.stringify(before)===JSON.stringify(after);
const out=new URL('../docs/custom-ai-review/',import.meta.url);mkdirSync(out,{recursive:true});
writeFileSync(new URL('results.json',out),JSON.stringify({count,stable,hashes:before,after,results},null,2));
const md=['# 自由对战 AI 实测','',`使用 createScenario("custom-battle") 的真实流程，${cases.length} 组阵容 × ${count} 个种子 × 正反双方，共 ${cases.length*count*2} 局。每将 3000 兵、5 级。敌军自动决策，我军仅在军略资源满时使用同一评分器下令；未注入战意或待施放状态。`,'','胜率受武将、先后手与双方布阵差异影响，仅用于观察，不代表平衡结论。每组首个种子在第 20 步保存并验证确定性续战。','',`运行期间规则文件${stable?'未变化':'发生变化，本轮不能用于统一版本结论'}。`,'','| 配置 | 局数 | 敌军获胜 | 时限结算 | 平均步数 | 敌军军略 | 敌军战法 | 最长位置/血量静止步数 |','|---|---:|---:|---:|---:|---:|---:|---:|',...results.map(({summary:s})=>`| ${s.name} | ${s.runs} | ${s.enemyWins} | ${s.timeout} | ${s.meanTicks} | ${s.enemyCommands} | ${s.enemyCasts} | ${s.maxStill} |`),'','检查：合法地形、无部队重叠、有限正血量、合法配装、已学军略与资源消耗、480 步内结算、存档校验。动作和目标统计是逐步采样，不等于独立决策次数。','',`复现：node scripts/audit-custom-ai.mjs ${count}。全部阵容、种子、初始布阵、军略与动作统计见 results.json。`];
writeFileSync(new URL('自由对战AI测试.md',out),md.join('\n')+'\n');
assert.ok(stable,'运行期间规则发生变化，请重新测试');
console.log('PASS '+cases.length*count*2+' custom battles');
