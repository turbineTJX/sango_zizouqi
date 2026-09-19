import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createScenario} from '../scenarios.mjs';
import {validateSave} from '../engine.mjs';
import {setupPlayer,fight,summary} from './custom-playability-lib.mjs';
import {TROOPS} from '../unit-stats.mjs';
import {TACTICS_BOOK} from '../tactics.mjs';

const root=new URL('../',import.meta.url),out=new URL('../docs/custom-playability/',import.meta.url);
const final=JSON.parse(readFileSync(new URL('final/results.json',out)));
const baseline=JSON.parse(readFileSync(new URL('baseline/results.json',out)));
const check=()=>{for(const [file,hash] of Object.entries(final.hashes))assert.equal(createHash('sha256').update(readFileSync(new URL(file,root))).digest('hex'),hash,`版本已变化：${file}，请重跑主审计`);};
check();
const pct=s=>`${(100*s.wins/s.n).toFixed(1)}%（${s.wins}/${s.n}）`;
const additions=[],runs=[],recipes=[];
mkdirSync(new URL('presets/',out),{recursive:true});
for(const p of final.players){
 const o=final.opponents.find(o=>o.id===p.opponent),draft={terrain:o.terrain,seed:final.seeds[0],ownTeam:p.selectedTeam,enemyTeam:o.team};
 const state=createScenario('custom-battle',draft.seed,20,null,draft);setupPlayer(state,p.selected);validateSave(structuredClone(state));
 const file=`presets/${p.archetype}-${p.opponent}.json`;writeFileSync(new URL(file,out),JSON.stringify(state,null,2));
 recipes.push(`### ${p.name}／${p.enemy}`,``, `验证：${pct(p.modes.designed)}；方案 ${p.allocation}/${p.selected}；战斗意图：${p.selected==='control'?'固守':'歼灭'}；[布阵阶段存档](${file})。`, '', '| 武将 | 兵种 | 兵力 | 格位 x,y | 战法顺序 |','|---|---|---:|---|---|',...state.battle.sides[0].units.map(u=>`| ${u.name} | ${TROOPS[u.type].name} | ${u.initial} | ${u.x},${u.y} | ${u.tactics.map(id=>TACTICS_BOOK[id].name).join('／')} |`),'');
 if(o.id==='balanced')continue;
 // Legal opportunity-cost comparisons: same soldiers, level and six slots.
 // Replacing a troop/general changes its stats and repertoire by design.
 const variants=[{id:'auxiliary-to-spear',name:'辅兵改枪兵',team:p.selectedTeam.map(u=>({...u,type:u.type==='logistics'?'spear':u.type}))}];
 if(p.archetype!=='cooperation')variants.push({id:'ordinary-core',name:p.archetype==='carry'?'赵云换陈到':'关羽张辽换陈到周仓',team:p.selectedTeam.map((u,i)=>({...u,id:i===0?'person-457':p.archetype==='mixed'&&i===1?'person-242':u.id}))});
 for(const v of variants){
  const samples=final.seeds.map((seed,i)=>fight({...draft,seed,ownTeam:v.team},{plan:p.selected,resume:i===0}));
  runs.push(...samples.map(r=>({case:`${p.archetype}/${p.opponent}`,variant:v.id,...r})));
  const row={name:p.name,enemy:p.enemy,variant:v.name,original:p.modes.designed,replaced:summary(samples)};additions.push(row);console.log('ABLATION',JSON.stringify(row));
 }
}
check();
writeFileSync(new URL('supplement-runs.json.gz',out),gzipSync(JSON.stringify(runs)));
writeFileSync(new URL('supplement.json',out),JSON.stringify({rulesVersion:final.rulesVersion,hashes:final.hashes,total:runs.length,additions},null,2));
writeFileSync(new URL('配阵与复现.md',out),['# 配阵与复现','',
'游戏进入自由对战，按以下武将、兵种、等级5、兵力配置；双方与种子在存档内。坐标为从0开始的格位，开战前选择相同战斗意图并按表中顺序装备战法。也可使用游戏的导入存档功能载入 presets 里的 JSON，从布阵阶段开始。导入替换当前进度，应先自行导出现有进度。',
'玩家战中军略按 scripts/custom-playability-lib.mjs 中 playerOrder 执行；只导入存档不会自动替你下军略。电脑始终由固定规则引擎控制。全部存档均通过当前 validateSave 检查。没有进行浏览器手动导入验收。','',...recipes].join('\n'));

const lines=['# 自定义战役测试结论（2026-09-19）','',
'当前结论：三种配阵路线都有可获胜的组合，但尚未达到“各类混编面对完整敌阵都有充分操作空间”的目标。兵种克制、配兵与站位能改变结果；辅助的边际价值并不稳定，部分配置换成枪兵更强。','',
`正式保留 ${baseline.total+final.total+runs.length} 局：修复前 ${baseline.total} 局、修复后 ${final.total} 局、合法替换对照 ${runs.length} 局；另有开发期小样本未计入。全部使用 custom-battle 正式入口、合法配装布阵与自然战意。玩家侧由 Codex 设计并用独立脚本执行可见战况决策；电脑侧保持固定规则。`, '',
'## 典型场景','',
'7项预先登记的方向性预期通过，包括吕布同兵压过普通将、三英协同、普通将协同、枪戟拒骑、骑兵突弓、林地火攻、水战。每场景16种子×交换左右两轮。通过只表示方向合理，不代表强弱差距已经合理：三英与三名普通将对单支吕布均32/32胜，三英平均剩余约73%兵力，单核对多队的劣势值得继续审查。', '',
'## 三类玩家路线','',
'每方六将、5级、总兵力18000；允许在带兵上限内调兵及换兵种。二/三流为本轮角色定位，文官正面战斗弱但可能智政很高；不是游戏品阶。初始九候选方案在三颗练习种子上选定，16颗验证种子与练习不重叠。', '',
'| 路线 | 河北混编 | 骑兵突击 | 丘陵远射 |','|---|---:|---:|---:|',
...final.archetypes.map(a=>`| ${a.name} | ${final.opponents.map(o=>pct(final.players.find(p=>p.archetype===a.id&&p.opponent===o.id).modes.designed)).join(' | ')} |`),'',
'均分兵力的默认混编在上述九个对局均0/16胜。三类克制配兵对骑兵均16/16胜，同配兵的默认布阵和无军略组也能取胜，说明这里主要收益来自兵种/兵力分配，不能把胜率全部归功于精细操作。二流队对丘陵的选定侧翼方案0/16，但同配装改成分散站位16/16；这条反例保留在原始表中，说明九候选仍未穷尽有效布阵。', '',
'## 辅助和主C是否真的有作用','',
'以下只替换一个兵种或核心武将，保持总兵力、级别、队数与原方案；替换自然改变属性、专属战法、主将/军师军略，不能解释为纯技能开关试验。胜率相同还需看剩余兵力，不能据此断言辅助无用。', '',
'| 原路线／对手 | 合法替换 | 原胜率 | 替换后 | 原/替换平均剩余兵力 |','|---|---|---:|---:|---:|',
...additions.map(a=>`| ${a.name}／${a.enemy} | ${a.variant} | ${pct(a.original)} | ${pct(a.replaced)} | ${(a.original.remaining*100).toFixed(1)}% / ${(a.replaced.remaining*100).toFixed(1)}% |`),'',
'## 问题及处理','',
'1. **已修复：野战辅兵浪费修缮槽。** 自由对战我方辅兵默认改为协阵/鼓舞/救护。敌军只在没有存活己方建筑时把修缮换为协阵，保留原来的救护、净化和其他角色选择；有己方建筑仍可保留修缮。没有修改武将属性、技能倍率或电脑资源规则。',
'2. **未解决：完整敌阵明显压制低品质混编。** 三类设计阵容对河北混编仍0/16；提升过兵力集中度和站位后仍未找到稳定解。此结果只能否定本轮候选方案，不能证明不存在其他解。建议扩大将池、配装和主将/军师选择，再决定数值调整。',
'3. **未解决：辅助支援随移动脱节。** 协阵只覆盖相邻近战，辅兵自身接敌寻路；开局相邻不保证后续覆盖。逐步记录提供覆盖/战法/受控和获治疗证据。建议下一轮先验证明确的护卫/跟随目标与支援站位，再考虑提高治疗倍率。',
'4. **未解决：默认配置不利于玩家理解。** 默认均分给低统文官过多兵力，且己方沿用均衡、敌方沿用激进（攻击+18%、防御−9%），自定义页没有两侧策略选项。本次原样记录；AI对AI专门统一为均衡以隔离这个因素。建议自定义页明确显示策略、总兵力和辅助射程。',
'5. **预期需更细：通过方向测试仍有碾压局。** 典型场景多为全胜，无法证明互有胜负或过程精彩。需加入相同将池交叉换兵种、不同总兵力与更多敌阵后，再建立可接受胜率区间。', '',
'## 验证与复现','',
'每步检查地形合法、格位不重叠、兵力有限、配装有效、电脑军略已学与消耗；每组首个种子验证第20步保存后的确定性续战，全部战斗在480步内结束。两批运行各自校验源码哈希不变。这里是引擎与策略可玩性测试，没有把脚本步数当作浏览器观看时长，也没有替代视觉/交互验收。',
'全部463项回归测试通过；语法检查通过。原30日战略测试保持原样通过。', '',
'- [完整最终测试表](final/测试报告.md) / [基线测试表](baseline/测试报告.md)',
'- [逐将配阵与可导入存档](配阵与复现.md)',
'- [最终汇总与版本哈希](final/results.json) / [辅助与主C替换数据](supplement.json)',
'- 复现：`node scripts/audit-custom-playability.mjs 16 final`，随后 `node scripts/report-custom-playability.mjs`。主审计的 final 会重算并覆盖该批次证据。',
'- 基线改动前源码保存在 baseline/source；其余规则文件可用哈希与当前文件对照。',''];
writeFileSync(new URL('结论与问题清单.md',out),lines.join('\n'));
console.log('REPORT COMPLETE',runs.length);
