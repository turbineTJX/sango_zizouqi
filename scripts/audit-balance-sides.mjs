import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,battleIntent,configureBattleIntent,battleStratagems,STRATAGEMS,COMMAND_RESOURCE,issueCommand} from '../engine.mjs';
import {configureTactics,validLoadout} from '../tactics.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {canOccupy} from '../battlefield.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {ROUTES,ENEMIES,playerCase} from './balance-objectives-lib.mjs';

// Freeze the already trained choices. These new seeds are never used to pick
// another build. Both controllers use production rule commands in this check.
const root=new URL('../',import.meta.url),selection=JSON.parse(readFileSync(new URL('docs/balance-objectives/selection.json',root)));
const seeds=Array.from({length:16},(_,i)=>85000019+i*104729);
assert.ok(seeds.every(s=>![...selection.trainingSeeds,...selection.validationSeeds].includes(s)));
const files=['engine.mjs','scenarios.mjs','tactics.mjs','battle-ai.mjs','combat-rules.mjs','famous-officers.mjs','unit-stats.mjs','passives.mjs','tactic-power.mjs','engagement.mjs','support-rules.mjs','scripts/balance-objectives-lib.mjs','scripts/custom-playability-lib.mjs','scripts/audit-balance-sides.mjs','docs/balance-objectives/selection.json'];
const hash=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL(f,root))).digest('hex')]));
const hashes=hash(),runs=[],rows=[];
const out=new URL(`docs/balance-objectives/side-check-rules${RULES_VERSION}/`,root);mkdirSync(out,{recursive:true});
function run(c,seed,swapped,resume){
 const original=createScenario('custom-battle',seed,20,null,{...c.draft,seed});c.options.setup?.(original);
 const state=swapped?createScenario('custom-battle',seed,20,null,{...c.draft,seed,ownTeam:c.draft.enemyTeam,enemyTeam:c.draft.ownTeam}):original,b=state.battle;
 if(swapped)for(const [side,s] of original.battle.sides.entries()){
  assert.equal(configureBattleIntent(b,battleIntent(original.battle,side),1-side),null);
  for(const u of s.units){
   const v=b.sides[1-side].units.find(a=>a.id===u.id);
   assert.equal(configureTactics(v,u.tactics),null);Object.assign(v,{x:13-u.x,y:7-u.y,formation:u.formation});
  }
 }
 const testedSide=swapped?1:0;
 validateSave(structuredClone(state));
 const opening=b.sides.map(s=>s.units.map(u=>({id:u.id,type:u.type,troops:u.initial,level:u.level,x:u.x,y:u.y,tactics:u.tactics})));
 lockDeployment(b);let saved;
 const command=b=>b.commandProgress>=COMMAND_RESOURCE.capacity?chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0):null;
 while(!b.result){
  const key=command(b);if(saved)assert.equal(command(saved.battle),key);
  if(key){assert.equal(issueCommand(b,key),null);if(saved)assert.equal(issueCommand(saved.battle,key),null);}
  stepBattle(b);if(saved)stepBattle(saved.battle);
  const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
  assert.equal(new Set(active.map(u=>`${u.x},${u.y}`)).size,active.length);
  for(const u of active){assert.ok(canOccupy(b,u,u.x,u.y));assert.ok(validLoadout(u,u.tactics));assert.ok(Number.isFinite(u.hp)&&u.hp>0&&u.hp<=u.maxHp);}
  if(resume&&b.tick===20)saved=validateSave(structuredClone(state));assert.ok(b.tick<=480);
 }
 if(saved)assert.deepEqual(saved.battle,b);validateSave(state);
 const remaining=side=>b.sides[side].units.reduce((n,u)=>n+u.hp,0)/9000;
 return {seed,swapped,testedSide,win:b.result.winner===testedSide,result:b.result,ticks:b.tick,remaining:remaining(testedSide),enemyRemaining:remaining(1-testedSide),opening};
}
for(const choice of selection.selected){
 const route=ROUTES.find(r=>r.id===choice.route),enemy=ENEMIES.find(e=>e.id===choice.enemy);
 for(const mode of ['default','selected'])for(const swapped of [false,true]){
  const c=mode==='default'?playerCase(route,enemy):playerCase(route,enemy,choice.allocation,choice.plan);
  const group=seeds.map((seed,i)=>run(c,seed,swapped,i===0)),id=`${choice.route}/${choice.enemy}/${mode}/${swapped?'right':'left'}`;
  runs.push(...group.map(r=>({id,...r})));
  rows.push({id,n:group.length,wins:group.filter(r=>r.win).length,timeouts:group.filter(r=>r.result.reason==='久战收兵').length,remaining:group.reduce((n,r)=>n+r.remaining,0)/group.length,enemyRemaining:group.reduce((n,r)=>n+r.enemyRemaining,0)/group.length});
 }
 console.log('Checked',choice.route,choice.enemy);
}
assert.deepEqual(hash(),hashes,'Source or selected builds changed during audit');
writeFileSync(new URL('results.json',out),JSON.stringify({rulesVersion:RULES_VERSION,seeds,total:runs.length,hashes,rows,controller:'Both sides use fixed rule commands; these are configuration side controls, not player timing replays.'},null,2));
writeFileSync(new URL('runs.json.gz',out),gzipSync(JSON.stringify(runs)));
const lines=['# 规则 '+RULES_VERSION+' 配阵换边复验','',`独立新种子 ${seeds[0]} 起、步长 104729，共 16 个；总计 ${runs.length} 局。沿用原练习选定方案，不重新挑选配置。双方均使用固定规则军略，比较同一开局布局和配装旋转 180 度后的结果；不代替原报告中的 Codex 玩家军略时机验证。`,'','| 配阵路线 / 敌阵 | 左侧 默认→针对方案 | 右侧 默认→针对方案 |','| --- | --- | --- |'];
for(const choice of selection.selected){const prefix=choice.route+'/'+choice.enemy;const cells=['left','right'].map(side=>['default','selected'].map(mode=>{const r=rows.find(r=>r.id===prefix+'/'+mode+'/'+side);return `${r.wins}/${r.n}`;}).join(' → '));lines.push(`| ${ROUTES.find(r=>r.id===choice.route).name} / ${ENEMIES.find(e=>e.id===choice.enemy).name} | ${cells.join(' | ')} |`);}
lines.push('','每局检查合法格位、配装、兵力和存档；每组首种子校验第 20 步存读档续战。所有胜负和超时均保留。有限种子换边结果不证明引擎完全对称，也不据此自动修改技能或武将数值。');
writeFileSync(new URL('换边验证.md',out),lines.join('\n')+'\n');
console.log('COMPLETE',runs.length,'side-control battles');
