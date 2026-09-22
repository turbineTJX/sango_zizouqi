import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {BATTLE_VALIDATION_CASES,BATTLE_VALIDATION_SEEDS} from '../data/design/battle-validation.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {validateSave,lockDeployment,stepBattle,battleStratagems,STRATAGEMS,issueCommand} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
const directory=new URL('../outputs/battle-generator/',import.meta.url);mkdirSync(directory,{recursive:true});
const rows=[];
for(const group of BATTLE_VALIDATION_CASES)for(const variant of group.variants)for(const [batch,seeds] of Object.entries(BATTLE_VALIDATION_SEEDS))for(const seed of seeds)for(const swapped of [false,true]){
 const draft=structuredClone(variant.draft);draft.seed=seed;
 if(swapped)for(const suffix of ['', 'Roles','Tactic'])[draft['ownTeam'+suffix],draft['enemyTeam'+suffix]]=[draft['enemyTeam'+suffix],draft['ownTeam'+suffix]];
 const state=generateBattle(draft),b=state.battle;validateSave(state);lockDeployment(b);
 let replay=null;const casts={},hits={},commands=[0,0];
 while(!b.result){
  // Both armies use the same fixed command conditions. No future RNG or
  // scenario-specific optimization, tactic replacement or resource injection.
  const command=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);
  if(command){const error=issueCommand(b,command);if(!error){commands[0]++;if(replay)assert.equal(issueCommand(replay.battle,command),null);}}
  stepBattle(b);if(replay)stepBattle(replay.battle);
  for(const s of b.sides)assert.ok(s.units.filter(u=>u.status==='active').length<=6);
  for(const e of b.effects){if(e.phase==='cast')casts[e.label]=(casts[e.label]||0)+1;if(e.damage>0&&e.skill)hits[e.label]=(hits[e.label]||0)+e.damage;}
  if(!replay&&b.tick>=12)replay=validateSave(structuredClone(state));
 }
 if(replay)assert.deepEqual(b,replay.battle);validateSave(state);
 rows.push({case:group.id,variant:variant.id,batch,seed,swapped,winner:b.result.winner,subjectWon:b.result.winner===(swapped?1:0),reason:b.result.reason,ticks:b.tick,
  remaining:b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0)),casts,hits,
  units:b.sides.map(s=>s.units.map(u=>({id:u.id,type:u.type,initial:u.initial,remaining:u.hp,casts:u.tacticCasts,contribution:u.contribution||u.contributions}))),draft});
}
writeFileSync(new URL('results.json',directory),JSON.stringify({rulesVersion:RULES_VERSION,seeds:BATTLE_VALIDATION_SEEDS,rows},null,2));
let report='# 自定义生成器战斗诊断\n\n规则版本：'+RULES_VERSION+'。双方共用固定军略决策；每局验证当前存档和确定性续战。交换双方包含玩家队列与敌方择序差异，分别列出结果。\n\n此为诊断样本，不设五五开目标，不据此宣称平衡完成。骑兵对照同时改变对应兵种的合法已学战法，不是单一战法消融。\n\n| 对照 | 方案 | 种子组 | 受测方位置 | 胜 / 局 | 平局 | 平均日数 |\n|---|---|---|---|---|---|---|\n';
for(const g of BATTLE_VALIDATION_CASES)for(const v of g.variants)for(const batch of Object.keys(BATTLE_VALIDATION_SEEDS))for(const swapped of [false,true]){
 const runs=rows.filter(r=>r.case===g.id&&r.variant===v.id&&r.batch===batch&&r.swapped===swapped);
 report+=`| ${g.name} | ${v.id} | ${batch} | ${swapped?'敌方':'我方'} | ${runs.filter(r=>r.subjectWon).length} / ${runs.length} | ${runs.filter(r=>r.winner===null).length} | ${(runs.reduce((n,r)=>n+r.ticks,0)/runs.length).toFixed(1)} |\n`;
}
report+='\n每局完整配置、胜负、剩余兵力、战法施放与伤害、人员贡献见 results.json；全部失败局保留。\n';
writeFileSync(new URL('report.md',directory),report);console.log(`${rows.length} battles validated: outputs/battle-generator/report.md`);
