// Derived report and in-conversation replay; never changes registered experiments.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readJSON,sha,exists,verifySnapshot} from '../ai-validation/storage.mjs';
import {packReplayData,unpackReplayData} from './visual-payload.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');assert.ok(args.out);
const out=resolve(root,args.out),reg=await readJSON(join(out,'registration.json')),summary=await readJSON(join(out,'summary.json')),source=await readJSON(join(out,'source.json'));
assert.equal(summary.sourceHash,'153111aae8bc07dc64ab89e5c9ed7d59803267495e3ef01b86bc3aa27e38387a','The written interpretation is specific to the 2026-11-02 experiment; review new evidence before reusing it.');
assert.equal(sha(JSON.stringify(reg)),(await readJSON(join(out,'registration.seal.json'))).sha);await verifySnapshot(reg.baseline);await verifySnapshot(source);
const rows=[];for(const phase of ['development','validation'])for(const f of Object.keys(reg.FAMILIES))for(const v of ['A','B'])rows.push(...await readJSON(join(out,phase,f+'-'+v,'results.json')));
assert.equal(rows.length,576);for(const a of rows.filter(r=>r.version==='A')){const b=rows.find(r=>r.version==='B'&&r.key===a.key);assert.ok(b);assert.deepEqual(a.trainingGold,b.trainingGold);}
const equivalent=await readJSON(join(out,'baseline-equivalence.json'));
const testStatus=async name=>{const log=await readFile(join(out,name),'utf8');return{tests:Number(log.match(/ℹ tests (\d+)/)?.[1]),pass:Number(log.match(/ℹ pass (\d+)/)?.[1]),fail:Number(log.match(/ℹ fail (\d+)/)?.[1]),failed:[...new Set([...log.matchAll(/^✖ (.+?) \(/gm)].map(m=>m[1]))]};};
const checks={baseline:await testStatus('baseline-tests.log'),compatible:await testStatus('compatible-tests.log'),baselineEquivalence:equivalent.results,deterministicCheckpoints:summary.deterministicCheckpoints};
assert.deepEqual(checks.baseline.failed,checks.compatible.failed,'New compatibility regression; do not label unchanged');
await writeFile(join(out,'checks.json'),JSON.stringify(checks,null,2)+'\n');
const names={control:'普通控制',protection:'普通防护',burst:'强力组合'},contexts={physical:'混合物理／平原',casters:'火攻谋略／林地',ranged:'远程主核／丘陵'},fmt=n=>n.toFixed(2),pp=n=>(n>=0?'+':'')+fmt(n*100);
const lines=['# 战法设计 A/B 局部实验','', '日期：2026-11-02。结论：三组新效果均实际生效，但本轮没有建立更好玩的结论。保留候选与回放，未采用到正式运行数据。','',
  '## 实验与边界','',
  '- 192场开发对局、384场独立验证，共576场；每组A/B在同一名单、等级、整数兵力、装备费用、任命、地图、布阵、出生侧和种子下配对。每场双方共同使用A或B规则。',
  '- 开发种子2个、独立验证种子4个；交换双方出生侧，分别组合紧凑／分散的我方与对方布阵。每个表格单元A、B各32场，种子才是独立随机样本，不把同种子的布局变体视为32个独立种子。',
  '- 总兵力双方各18000，10级；对手名单、兵种费用及实力允许不对称。只称A/B同成本，不声称我方与对手同培养成本。',
  '- 战斗AI、军略固定条件、羁绊、人物、道路、经济及既有测试均冻结；没有注入战意、伤兵、状态、资源、强制胜负或在线搜索。仅战前通过共同入口设置已登记布阵，战中由正式引擎执行。',
  '- 3回合魔免、2回合基准眩晕和25%伤害折损是实验初值。控制继续使用共同成败、威力／军纪时长、坚定及受控保护，实际时长并非一律两回合。',
  '- 本地效果实验独立于仅允许修改battle-ai.mjs的战斗策略协议2；没有更改其裁判、门槛或采用范围。本轮没有全国自然局或真人试玩验收。','',
  '## 三组方案','', '| 组别 | A | B | 试图回答 |','| --- | --- | --- | --- |',
  ...Object.entries(reg.FAMILIES).map(([id,f])=>'| '+names[id]+' | '+f.A+' | '+f.B+' | '+f.question+' |'),'',
  '## 独立验证结果','',
  '余兵差＝（我方全部剩余兵力－对方全部剩余兵力）÷18000；变化为B减A，单位为百分点。布阵影响＝紧凑与分散我方布阵的平均余兵差之差的绝对值。较大影响只说明结果敏感，不能单独认定选择更有趣。','',
  '| 对照／对手 | A胜局 | B胜局 | 余兵差变化 | 平均时长A／B | 布阵影响A／B |','| --- | --- | --- | --- | --- | --- |'];
for(const a of summary.groups.filter(g=>g.version==='A')){const b=summary.groups.find(g=>g.family===a.family&&g.context===a.context&&g.version==='B');lines.push('| '+names[a.family]+'／'+contexts[a.context]+' | '+a.wins+'/32 | '+b.wins+'/32 | '+pp(b.meanMargin-a.meanMargin)+' | '+fmt(a.meanTicks)+'／'+fmt(b.meanTicks)+' | '+fmt(a.layoutSensitivity*100)+'／'+fmt(b.layoutSensitivity*100)+' |');}
lines.push('', '## 对趣味性的解释','',
  '### 普通短眩晕：新增控制已生效，配合收益尚未建立','',
  '物理场景平均敌军硬控队回合从5.56增至11.56，远程场景从4.75增至10.13；余兵差均基本持平。关羽首次专属没有提前。源码复核发现，青龙偃月的乘隙条件只有破甲、混乱、迟滞，尚不包含眩晕。因此当前B增加了行动限制，不能声称已经建立“眩晕铺垫—关羽条件增伤”的配合。远距挑衅与近距短控仍可作为不同用途保留讨论，不能直接认定短控应替代挑衅。','',
  '### 普通短魔免：确实改变行动和布阵，当前前排代价偏高','',
  '物理场景平均余兵差下降13.20个百分点，4个独立种子的平均差均为负。赵云首次专属平均由16.84提前到12.00回合，但核心总伤害下降，说明更早行动没有抵偿失去长时间方阵的代价。',
  '紧凑布阵胜局A/B均为10/16；分散布阵由7/16降为2/16。整体布阵影响从6.44升到28.47个百分点，主要来自分散方案的损失扩大。这里能观察到阵线依赖，尚不能把这种惩罚直接当作趣味提升。',
  '魔免保留本项目现有语义：解除战斗异常、只承受物理普攻，也阻挡物理战法。火攻谋略对手的名单过强，A/B均0/32，约48回合结束，赵云只有2/32局实际发动专属；这组属于明显强弱不对称的局面，本轮不足以确认魔免的反制价值。','',
  '### 群伤加眩晕：组合成立，当前伤害交换不足以增加稳定收益','',
  'B在两个场景增加了平均9.94和6.31敌军硬控队回合，但平均余兵差下降4.09和1.30个百分点，布阵影响没有一致提高。物理场景主核伤害略升，同时整队结果下降，说明可以有局部配合收益，却没有抵偿整队的伤害代价。结论仅针对“原贯阵伤害降低25%换2回合基准眩晕”的初值，不能外推到其他群伤控制设计。','',
  '## 当前保留与后续设计依据','',
  '1. 保留普通战法覆盖魔免、眩晕及位移的设计空间；每项需要独立的作用、来源和可得性，不能将覆盖目录直接视为完成趣味设计。',
  '2. 优先检查新状态的受益者和真实时序，例如强力战法能否利用眩晕、位移能否帮助既有蓄势命中；下一版应先登记具体行为链。',
  '3. 短魔免后续应在较均衡的谋略对手及专门保护位置中验证；本次不调整数值追求过关，不将碾压样本改称有效反制验收。',
  '4. 同步示意回放固定选择首个验证种子912101、我方出生侧0、双方紧凑布阵，每组两个场景共6对。没有根据胜负挑选。示意只包含真实结算的位置、兵力、战意、控制和魔免，事件栏保留该局前160条重要事件；不代替正式游戏画面的真人体验。',
  '5. 玩家观看后可记录更想尝试A、B或难判断；主观反馈尚未收集。本轮没有自动采用新战法或修改正式存档规则。','',
  '## 检查与证据','',
  '- 24场自然执行机制探针：三组效果均实际触发；新增眩晕保留共同受控保护；普通魔免的合法来源与时长可保存，伪造来源或时长被拒绝。',
  '- 12场兼容性对照：原冻结引擎与实验公共接入层在A配置下的逐局登记指标一致。',
  '- 576/576场通过8回合断点确定性续战与存档校验。续战副本不计为独立对局。',
  '- 基线及实验兼容层均为127/128项通过，同一个既有失败是“reserve entry preview and rejection do not change soldiers, order or an active troop”：后备界面HTML未匹配测试期待的reserve-entry-select。未修改此测试或据此声称全回归通过，本轮六队首发对照不测后备界面。',
  '- 01、02、03目录保留接入失败：效果目录引用、普通魔免来源校验、实验字段接入。只将04目录正式样本计入统计；未基于这些试跑调整方案数值。',
  '- 实验存档须使用同一冻结实验来源及配置复现，不作为正式版本普通存档。', '',
  '基线指纹：`'+summary.baselineHash+'`。实验来源指纹：`'+summary.sourceHash+'`。登记指纹：`'+summary.protocolHash+'`。','',
  '逐局结果、配对差值和种子信息见本目录summary.json、development与validation目录；完整登记见registration.json，来源字节指纹见source.json，回归日志为baseline-tests.log及compatible-tests.log。','',
  '复现命令（在项目根目录；新实验须选新的out目录）：','', '```powershell',
  'node scripts/battle-design-ab/run.mjs --out=.local/<new-id> --stage=init',
  'node scripts/battle-design-ab/run.mjs --out=.local/<new-id> --stage=mechanisms',
  'node scripts/battle-design-ab/run.mjs --out=.local/<new-id> --stage=development',
  'node scripts/battle-design-ab/run.mjs --out=.local/<new-id> --stage=validation',
  'node scripts/battle-design-ab/run.mjs --out=.local/<new-id> --stage=report','```','');
await writeFile(join(out,'report.md'),lines.join('\n'));
const evidence={};async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const path=join(dir,e.name);if(e.isDirectory())await walk(path);else evidence[relative(out,path).replaceAll('\\','/')]=sha(await readFile(path));}}
for(const phase of ['mechanisms','development','validation','baseline-equivalence'])await walk(join(out,phase));
for(const name of ['registration.json','registration.seal.json','source.json','summary.json','checks.json','baseline-tests.log','compatible-tests.log','baseline-equivalence.json'])evidence[name]=sha(await readFile(join(out,name)));
await writeFile(join(out,'evidence-manifest.json'),JSON.stringify(evidence,null,2)+'\n');
if(args.visual){
  const visual=resolve(args.visual),templatePath=join(out,'review-template.html');if(!await exists(templatePath))await writeFile(templatePath,await readFile(visual));
  const pairs=[];for(const [family,f]of Object.entries(reg.FAMILIES))for(const context of f.contexts){const key=[family,context,reg.PROTOCOL.validationSeeds[0],0,'compact','compact'].join('-'),pair={family,context};for(const v of ['A','B']){const r=await readJSON(join(out,'validation',family+'-'+v,key+'-replay.json'));delete r.input;pair[v]=r;}pairs.push(pair);}
  const data={summary:{battles:summary.battles,validationBattles:summary.validationBattles,groups:summary.groups},families:Object.fromEntries(Object.entries(reg.FAMILIES).map(([k,f])=>[k,{A:f.A,B:f.B}])),pairs};
  const template=await readFile(templatePath,'utf8');assert.ok(template.includes('<!--AB_PAYLOAD-->'),'Use the compact replay template');
  const packed=packReplayData(data),restored=unpackReplayData(packed);
  for(let i=0;i<data.pairs.length;i++)for(const arm of ['A','B']){assert.deepEqual(restored.pairs[i][arm].frames,data.pairs[i][arm].frames);assert.deepEqual(restored.pairs[i][arm].events,data.pairs[i][arm].events);}
  const payload=JSON.stringify(packed).replaceAll('&','\\u0026').replaceAll('<','\\u003c').replaceAll('>','\\u003e');
  const html=template.replace('<!--AB_PAYLOAD-->',payload).replace('/*AB_DECODER*/',unpackReplayData.toString());assert.ok(Buffer.byteLength(html)<256000);await writeFile(visual,html);
  console.log(JSON.stringify({visual,bytes:Buffer.byteLength(html),pairs:pairs.length}));
}
console.log(JSON.stringify({report:join(out,'report.md'),checks,evidenceFiles:Object.keys(evidence).length}));
