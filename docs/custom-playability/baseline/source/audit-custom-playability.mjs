import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {archetypes,opponents,classicCases,plans,allocations,playerTeam,fight,summary} from './custom-playability-lib.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

const count=Number(process.argv[2]||16),label=process.argv[3]||'final';
assert.ok(Number.isInteger(count)&&count>0&&count<=128);
assert.match(label,/^[a-z0-9-]+$/);
const root=new URL('../',import.meta.url),out=new URL(`../docs/custom-playability/${label}/`,import.meta.url);
mkdirSync(out,{recursive:true});
const files=[...readdirSync(root).filter(f=>f.endsWith('.mjs')),...readdirSync(new URL('data/',root)).filter(f=>f.endsWith('.mjs')||f.endsWith('.json')).map(f=>'data/'+f),'scripts/custom-playability-lib.mjs','scripts/audit-custom-playability.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL(f,root))).digest('hex')]));
const before=hashes(),classic=[],players=[],raw=[];
const seeds=Array.from({length:count},(_,i)=>9700000+i*7919);
for(const c of classicCases){
 const runs=[];
 for(const swapped of [false,true])for(const [i,seed] of seeds.entries()){
  const run=fight({terrain:c.terrain,seed,ownTeam:swapped?c.z:c.a,enemyTeam:swapped?c.a:c.z},{controller:'rule',resume:i===0});
  raw.push({case:c.id,swapped,...run});runs.push({...run,units:run.units.map(u=>({...u,side:swapped?1-u.side:u.side})),result:{...run.result,winner:run.result.winner===null?null:swapped?1-run.result.winner:run.result.winner}});
 }
 const s=summary(runs),rate=s.wins/s.n;
 const passed=(c.min===undefined||rate>=c.min)&&(c.max===undefined||rate<=c.max)&&(c.maxTimeout===undefined||s.timeout/s.n<=c.maxTimeout);
 const row={id:c.id,name:c.name,expect:c.expect,passed,...s,aLeftWins:runs.slice(0,count).filter(r=>r.result.winner===0).length,aRightWins:runs.slice(count).filter(r=>r.result.winner===0).length};
 classic.push(row);console.log('AI',JSON.stringify(row));
}
for(const a of archetypes)for(const o of opponents){
 const draft={terrain:o.terrain,ownTeam:a.team,enemyTeam:o.team};
 // Candidate selection only uses a disjoint three-seed practice set.
 const training=allocations.flatMap(allocation=>plans.map(plan=>{
  const runs=[190001,197920,205839].map(seed=>fight({...draft,ownTeam:playerTeam(a,allocation,o),seed},{plan}));
  raw.push(...runs.map(r=>({case:`${a.id}/${o.id}`,phase:'practice',...r})));
  return {plan,allocation,...summary(runs)};
 }));
 training.sort((a,b)=>b.wins-a.wins||(b.remaining-b.enemyRemaining)-(a.remaining-a.enemyRemaining)||a.plan.localeCompare(b.plan));
 const selected=training[0].plan,allocation=training[0].allocation,selectedTeam=playerTeam(a,allocation,o),modes={};
 for(const mode of ['default','same-team-default','designed','no-orders','scattered']){
  const runs=seeds.map((seed,i)=>fight({...draft,ownTeam:mode==='default'?a.team:selectedTeam,seed},{plan:['default','same-team-default'].includes(mode)?'default':selected,scatter:mode==='scattered',controller:mode==='no-orders'?'none':'player',resume:i===0,trace:i===0&&mode==='designed'}));
  modes[mode]=summary(runs);raw.push(...runs.map(r=>({case:`${a.id}/${o.id}`,phase:'holdout',mode,...r})));
  for(const r of runs.filter(r=>r.events))writeFileSync(new URL(`${a.id}-${o.id}-replay.json.gz`,out),gzipSync(JSON.stringify(r)));
 }
 const row={archetype:a.id,name:a.name,opponent:o.id,enemy:o.name,terrain:o.terrain,selected,allocation,selectedTeam,training,modes};players.push(row);console.log('PLAYER',a.name,o.name,allocation,selected,JSON.stringify(Object.fromEntries(Object.entries(modes).map(([k,v])=>[k,`${v.wins}/${v.n}`]))));
 writeFileSync(new URL('progress.json',out),JSON.stringify({classic,players},null,2));
}
assert.deepEqual(hashes(),before,'规则或审计文件在运行中改变，必须重跑');
writeFileSync(new URL('runs.json.gz',out),gzipSync(JSON.stringify(raw)));
const result={createdAt:new Date().toISOString(),rulesVersion:RULES_VERSION,count,seeds,hashes:before,total:raw.length,archetypes,opponents,classicCases,classic,players};
writeFileSync(new URL('results.json',out),JSON.stringify(result,null,2));
const pct=s=>`${(s.wins/s.n*100).toFixed(1)}% (${s.wins}/${s.n})`;
const md=['# 自定义战役：AI、平衡性与配阵可玩性实测','',`规则 ${RULES_VERSION}；${raw.length} 场真实 custom-battle 战斗。复现：node scripts/audit-custom-playability.mjs ${count} ${label}。`,'',
'## 测试方法','',
'电脑侧始终使用现有固定规则引擎。AI 对战使用同一配装与布阵函数的旋转镜像，双方策略统一为均衡并交换左右复测；玩家军略在步前操作，电脑军略在步内积累后施放，存在至多一步时序差异。角色与兵种未被克隆或改属性。典型场景仅是演义战术推演，不是历史考证。',
'玩家侧由 Codex 设计九套公开方案（三种站位战法 × 均分兵力/集中配兵/集中配兵并克制换兵种），在固定三个练习种子上择优后冻结，用不重叠的验证种子复测。玩家战中按独立编写的可见战况优先表发军略，不调用电脑评分器，不读取未来或随机数。所有配装、站位、意图、军令经正式接口执行，没有注入战意、伤兵或冷却。',
'三类玩家阵容均六将、5级，总兵力18000；默认均分每将3000，设计方案可在带兵上限内重新分配。敌阵均六将、每将3000、5级。未建立招募成本模型，因此不是同稀有度/同成本比较。阵法在当前游戏中指格位布阵和战斗意图，没有额外的命名阵法加成。玩家对战保留正式默认的我军均衡/敌军激进策略。',
'全部操作组使用同一玩家军略策略；同阵默认组保留选定配兵与兵种但使用游戏默认站位战法；无军略组保留设计布阵与配装；散阵组只分散站位，保留相同配兵、配装、意图和军略规则。每组首个验证种子校验第20步存档续战。胜率为固定样本观察，不等于全局胜率。','',
'## 预先登记的典型场景预期','',
'| 场景（A方） | 预期 | A方胜率 | 左/右胜局 | 久战 | 结果 |','|---|---|---:|---:|---:|---|',
...classic.map(c=>`| ${c.name} | ${c.expect} | ${pct(c)} | ${c.aLeftWins}/${c.aRightWins} | ${c.timeout}/${c.n} | ${c.passed?'符合':'不符合，需调查'} |`),'',
'## 玩家配阵验证','',...archetypes.map(a=>`- ${a.name}：${a.note}`),'',
'| 玩家思路 | 对手 | 冻结方案 | 均分默认 | 同阵默认 | 设计胜率 | 无军略 | 散阵 | 设计平均步数 |','|---|---|---|---:|---:|---:|---:|---:|---:|',
...players.map(p=>`| ${p.name} | ${p.enemy} | ${p.allocation}/${p.selected} | ${pct(p.modes.default)} | ${pct(p.modes['same-team-default'])} | ${pct(p.modes.designed)} | ${pct(p.modes['no-orders'])} | ${pct(p.modes.scattered)} | ${p.modes.designed.ticks} |`),'',
'## 证据','',
'results.json 保存武将、兵种、总兵力、练习选择、验证种子、运行规则哈希和全部汇总。runs.json.gz 保存每局初始格位/配装、军略时间、每将受损/获治疗/战法次数/受控步数/邻接辅兵步数。每种组合首个设计局另存逐步回放，含实际动作和效果；治疗统计属于获治疗者，不冒充治疗来源贡献。',
'每步检查地形、位置不重叠、合法配装、有效兵力、军略已学与资源消耗，并验证480步内结束与确定性读档。一次场景预期失败不会终止报告或被隐藏。完整版本哈希在批次前后保持一致。',''];
writeFileSync(new URL('测试报告.md',out),md.join('\n'));
console.log('COMPLETE',raw.length,fileURLToPath(out));
