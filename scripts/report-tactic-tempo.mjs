import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {TACTICS_BOOK} from '../tactics.mjs';
const root='docs/tactic-tempo-v43',read=name=>JSON.parse(readFileSync(`${root}/${name}.json`,'utf8'));
const before=read('baseline-validation'),after=read('validation');
for(let i=0;i<before.rows.length;i++){
  assert.equal(before.rows[i].seed,after.rows[i].seed);
  assert.deepEqual(before.rows[i].equipped,after.rows[i].equipped,'paired battles retain identical learned skills and order');
}
const decisive=new Set(Object.values(TACTICS_BOOK).filter(s=>s.tempoRole==='决胜专属').map(s=>s.id));
function finishers(data){
  const casts=data.rows.flatMap(r=>r.casts.filter(c=>decisive.has(c.id))),first=[],gaps=[];
  let equipped=0,used=0;
  for(const r of data.rows)for(const e of r.equipped.filter(e=>decisive.has(e.id))){
    equipped++;const list=r.casts.filter(c=>c.unit===e.unit&&c.id===e.id);
    if(list.length){used++;first.push(list[0].tick);for(let i=1;i<list.length;i++)gaps.push(list[i].tick-list[i-1].tick);}
  }
  const mean=a=>a.reduce((a,b)=>a+b,0)/a.length;
  return {casts:casts.length,equipped,used,first:mean(first),gap:mean(gaps),damage:mean(casts.map(c=>c.damage))};
}
const a=finishers(before),b=finishers(after),fixed=n=>n.toFixed(2),percent=n=>(100*n).toFixed(1)+'%';
writeFileSync(`${root}/设计与验证.md`,[
'# 战法分层与战意循环（规则43）','',
'学习系统仍为低级普通、高级普通、额外专属。高级普通就是本次讨论的“中级”战斗定位，不增加第三种普通学习等级。保留两低一高、B/C仅低级、随机学习与保底规则。原学习池在调整实战门槛之前记录为 learningTier，界面和学习系统使用该分类。','',
'## 实际规则','',
'| 类别 | 门槛 | 消耗 | 重复节奏 |','|---|---:|---:|---|',
'| 低级普通 | 保留原0～35 | 通常3；疾驰/协阵0；振旅/鼓舞/接舷5 | 主动冷却为原来的1.25倍，向上取整 |',
'| 高级普通 | 原门槛限制在45～65 | 25 | 保留独立冷却，释放后重新积累 |',
'| 持续专属 | 35～60，按职责逐项设置 | 5～20 | 提前提供护卫、净化、补给和压制 |',
'| 交锋专属 | 保留原60～75 | 25 | 保留各自机制与冷却 |',
'| 决胜专属 | 100 | 60 | 施放后回落，重新蓄势；不保证每局都能发动 |','',
'每队两次主动施法至少间隔4步（2.8模拟秒），普攻不受这条间隔限制；医疗战法原有重置普攻间隔仍适用。调息独立于战法冷却，连环之策及策应不缩短它。未找到合法目标不扣费；完成施法后扣费，控制判定失败也支付费用。消耗固定，不被威力、连携或镇定减免。攻击、受击、军略及补给的战意规则不变。','',
'低级范围效果收束：振旅、策应、雾隐各作用于一队友军；震军作用于一队敌军。火矢、破甲、衰咒等已有强化普攻和状态叠加继续作为铺垫。协阵保留其相邻光环机制与槽位成本。高级普通保留范围、连击、控制、反击或条件增伤等不同职责，不强行把治疗与位移都改成范围伤害。','',
'许褚虎卫折冲改为40门槛/10消耗，郭嘉十胜奇谋为55/15；鲁肃榻上定策为35/5；赵云七进七出与甘宁百骑劫营为50/15。完整专属分工见逐项调整表。','',
'决胜技单次直接伤害加强：八百破阵1.8→2.7倍；神火计0.8→1.25倍；火烧连营0.95→1.35倍；人中吕布1→1.6倍；黄天当立0.85→1.4倍。保留原目标数、控制、灼烧与地形约束；未统一增强所有名将。','',
'## 验证方法','',
'先完成零战意自然施法的扣费、调息、普攻和调息中存读档回归，再调整冷却及决胜技倍率。修改前完整回归571项通过；最终完整回归582项通过（工作区同时存在其他功能测试）；npm run check通过。新增用例不注入待施放状态。旧用例中“不扣战意”“连续两步施法”“策应治疗两队”的断言更新为当前规则；修缮及多战法测试等待真实调息。旧自由配装锁死对手的压制例改为当前合法学习下的实际压制验证，不再要求固定种子永久无法施法。','',
'对照使用修改前源码快照及当前引擎，探索8种子、独立验证另8种子；混编/决胜阵容/水战，5级与8级，均分2500×6与单核5000＋2000×5，双方各15000兵。每组96场，前后合计384场，续战副本不重复计数。前后逐局核对装备与顺序一致；AI遵守原固定规则，不替换战法。玩家侧不额外下达军略，保留原敌方自动军略。所有战斗从零战意开始，第30步存读档并逐步确定性续战，检查战意边界、同队施法间隔与学习记录不变。','',
'探索种子430100＋n×7919（n=0～7）；独立验证n=8～15。以下只报告独立验证结果，决胜技对比使用前后相同的五种战法，避免把旧100门槛的护卫/压制专属算进决胜技后造成混淆。','',
'| 指标 | 修改前 | 修改后 |','|---|---:|---:|',
`| 每100个部队在场步数的施法次数 | ${fixed(before.summary.castsPer100ActiveSteps)} | ${fixed(after.summary.castsPer100ActiveSteps)} |`,
`| 在场步数中满战意占比 | ${percent(before.summary.cappedShare)} | ${percent(after.summary.cappedShare)} |`,
`| 同队间隔不足4步的施法次数 | ${before.summary.adjacentCasts} | ${after.summary.adjacentCasts} |`,
`| 平均战斗步数 | ${fixed(before.summary.averageTicks)} | ${fixed(after.summary.averageTicks)} |`,
`| 五种决胜技总施放次数 | ${a.casts} | ${b.casts} |`,
`| 已携带且至少发动一次的决胜技 | ${a.used}/${a.equipped} | ${b.used}/${b.equipped} |`,
`| 决胜技首次施放平均步数（实际发动者） | ${fixed(a.first)} | ${fixed(b.first)} |`,
`| 同一决胜技重复施放平均间隔 | ${fixed(a.gap)} | ${fixed(b.gap)} |`,
`| 决胜技平均单次直接伤害 | ${fixed(a.damage)} | ${fixed(b.damage)} |`,'',
'单次伤害为实际命中合计，包含目标数量、兵力、地形和抵抗差异，不含后续灼烧；它不等于同条件技能倍率比较。决胜阵容有专门支援，因此大多数决胜技仍能在整场战斗中发动；本轮证明更晚启动、更少连放与更高单次收益，不声称所有对局都很难发动，也不声称重复施放间隔大幅拉长。','',
'这轮是节奏平衡及行为验收，不是全部武将胜率验收。水路拥堵单独保留，未据其胜负调整属性；未穷举所有弱将协同，也没有证明所有名将或以弱胜强组合都已平衡。','',
'桌面与390px手机端验证了门槛/消耗/定位显示、已学战法排序、保存刷新及无页面脚本错误；截图在 outputs/tempo-v43/ui。规则升级为43，旧规则存档提示重新开始；当前版本保存、读取与确定性续战保持可用。','',
'复测：`npm test`、`npm run check`、`npm run audit:tempo`；界面：`npm run verify:tempo-ui`（需可用Playwright）。对照源码保存在 outputs/tempo-v43/baseline；逐局原始记录为 baseline.json/current.json 与 baseline-validation.json/validation.json。','',
].join('\n'));
const baseline=await import('../outputs/tempo-v43/baseline/tactics.mjs');
writeFileSync(`${root}/战法调整表.md`,['# 规则43逐项战法表','','门槛与冷却列为“原→现”；消耗均为当前固定消耗。低级/高级指学习等级。完整当前效果由同一运行数据生成。','','| 战法 | 学习类别 / 战斗定位 | 门槛 | 消耗 | 冷却（步） | 当前效果 |','|---|---|---:|---:|---:|---|',...Object.values(TACTICS_BOOK).map(s=>{const old=baseline.TACTICS_BOOK[s.id];return `| ${s.name} | ${{low:'低级',high:'高级',special:'专属'}[s.learningTier]} / ${s.tempoRole} | ${old.threshold}→${s.threshold} | ${s.intentCost} | ${old.cooldown}→${s.cooldown} | ${s.description.replaceAll('|','／')} |`; }), ''].join('\n'));
console.log('报告和逐项战法表已生成；前后学习与顺序一致。');
