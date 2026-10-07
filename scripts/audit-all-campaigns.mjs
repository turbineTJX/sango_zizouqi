import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {HISTORICAL_CAMPAIGNS} from '../historical-campaigns.mjs';
import {TACTICAL_CAMPAIGNS,scenarioTroops} from '../tactical-campaigns.mjs';
import {sample,fight} from './tactical-balance-lib.mjs';
import {RULES_VERSION,COMBAT} from '../combat-rules.mjs';
const count=Number(process.argv[2]||128),start=2700000;
assert.ok(Number.isInteger(count)&&count>0);
const root=new URL('../',import.meta.url),out=new URL('docs/campaign-review/',root);
const files=[...readdirSync(root).filter(f=>f.endsWith('.mjs')),...readdirSync(new URL('data/',root)).filter(f=>f.endsWith('.mjs')).map(f=>'data/'+f),'scripts/tactical-balance-lib.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL(f,root))).digest('hex')]));
const before=hashes(),previous=JSON.parse(readFileSync(new URL('docs/tactical-campaigns/audit.json',root),'utf8'));
const avg=xs=>Math.round(xs.reduce((a,b)=>a+b,0)/xs.length);
const results=[];
for(const c of [...HISTORICAL_CAMPAIGNS,...TACTICAL_CAMPAIGNS]){
  const modes=[];
  for(const orders of [false,true]){
    const r=sample(c.id,count,start,{orders});
    for(const run of r.runs){assert.ok(run.ticks<=c.limit);assert.ok(run.remaining.every(n=>Number.isFinite(n)&&n>=0));}
    const reasons=Object.fromEntries([...new Set(r.runs.map(r=>r.reason))].map(reason=>[reason,r.runs.filter(r=>r.reason===reason).length]));
    modes.push({...r,orders,meanRemaining:[0,1].map(side=>avg(r.runs.map(r=>r.remaining[side]))),minTicks:Math.min(...r.runs.map(r=>r.ticks)),maxTicks:Math.max(...r.runs.map(r=>r.ticks)),reasons,meanOrders:r.runs.reduce((n,r)=>n+r.ordersUsed,0)/count,meanGate:c.gateHp?avg(r.runs.map(r=>r.gate)):null});
    console.log(c.name,orders?'军略':'无军略',`${r.wins}/${r.losses}/${r.draws}`,r.meanTicks);
  }
  results.push({id:c.id,name:c.name,own:scenarioTroops(c,0),enemy:scenarioTroops(c,1),historical:c.historical,modes,defaultSeed:c.seed,defaultRuns:[false,true].map(orders=>({orders,...fight(c.id,c.seed,{orders})}))});
}
assert.deepEqual(hashes(),before,'Rules changed during audit; rerun');
const changes=Object.keys(previous.hashes).filter(f=>before[f]!==previous.hashes[f]);
const comparison=results.filter(r=>!r.historical).map(r=>{
  const old=previous.results.find(p=>p.id===r.id),current=r.modes.find(m=>m.orders===old.orders);
  return {name:r.name,orders:old.orders,oldCount:old.count,oldWins:old.wins,newCount:count,newWins:current.wins,oldTicks:old.meanTicks,newTicks:current.meanTicks,sameSeeds:old.start===start&&old.count===count};
});
mkdirSync(out,{recursive:true});
writeFileSync(new URL('audit.json',out),JSON.stringify({createdAt:new Date().toISOString(),rulesVersion:RULES_VERSION,combat:COMBAT,count,start,seedMethod:'2700000 + i * 7919',hashes:before,changedSincePreviousAudit:changes,results,comparison},null,2));
const percent=(n,d)=>`${(n/d*100).toFixed(1)}%`;
const rows=results.map(r=>{const [a,b]=r.modes;return `| ${r.name} | ${r.own} / ${r.enemy} | ${percent(a.wins,count)} | ${percent(b.wins,count)} | ${b.wins}/${b.losses}/${b.draws} | ${a.meanTicks} / ${b.meanTicks} | ${b.meanRemaining.join(' / ')} |`;});
writeFileSync(new URL('战役复测.md',out),`# 当前规则九场战役复测\n\n规则版本 ${RULES_VERSION}。每场 ${count} 个种子，各测试有／无玩家军略两种条件，共 ${count*18} 场抽样，另测九场预设种子共 18 场。种子为 2700000 + i × 7919。\n\n使用正式 createScenario → lockDeployment → stepBattle 流程、预设阵容和布阵；敌方保持正式 AI。有军略组仅在资源积累足够后，用现有 AI 评分通过 issueCommand 下达合法军略，不注入资源或控制状态。未优化玩家布阵与配装，抽样胜率不是实际玩家胜率。\n\n| 战役 | 我/敌初始兵力 | 无军略胜率 | 有军略胜率 | 有军略胜/负/平 | 平均步数（无/有） | 有军略平均余兵（我/敌） |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\n平均余兵包含全部胜负结果。蜀军拒曹守到 240 步即可能获胜；其他战役到时限按引擎规则判定，日暮不能等同于击溃。\n\n## 结局分布与默认种子\n\n${results.map(r=>`- ${r.name}：有军略 ${JSON.stringify(r.modes[1].reasons)}；默认种子 ${r.defaultSeed}，无／有军略：${r.defaultRuns.map(x=>`${x.winner===0?'胜':x.winner===1?'负':'平'}（${x.ticks} 步，${x.reason}）`).join(' / ')}${r.modes[1].meanGate!==null?`；有军略平均城门耐久 ${r.modes[1].meanGate}`:''}。`).join('\n')}\n\n## 与上一份演义抽样对照\n\n按旧报告每场使用的军略条件比较。${changes.length?`记录的运行文件中发生变化：${changes.join('、')}。`:'旧报告记录的运行文件哈希与本次一致，没有检测到这些文件在两次报告之间变化。'}\n\n| 战役 | 旧胜率 | 本次胜率 | 旧/新平均步数 | 相同种子集 |\n| --- | --- | --- | --- | --- |\n${comparison.map(r=>`| ${r.name} | ${percent(r.oldWins,r.oldCount)} | ${percent(r.newWins,r.newCount)} | ${r.oldTicks} / ${r.newTicks} | ${r.sameSeeds?'是':'否'} |`).join('\n')}\n\n逐场结果与运行文件 SHA-256 见 [audit.json](audit.json)。仅复测，未修改战斗规则或战役配置。\n`);
console.log('Report: docs/campaign-review/战役复测.md');
