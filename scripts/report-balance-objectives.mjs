import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createScenario} from '../scenarios.mjs';
import {validateSave} from '../engine.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {SPECIAL_TACTICS} from '../tactics.mjs';
import {ROUTES,ENEMIES,ALLOCATIONS,playerCase,VALIDATION_SEEDS} from './balance-objectives-lib.mjs';

const root=new URL('../docs/balance-objectives/',import.meta.url);
const json=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const raw=path=>JSON.parse(gunzipSync(readFileSync(new URL(path,root))));
const before=json('baseline/results.json'),after=json('final/results.json'),br=json('baseline/roles/results.json'),fr=json('final/roles/results.json');
const runs=raw('final/runs.json.gz'),beforeRoles=raw('baseline/roles/runs.json.gz'),roles=raw('final/roles/runs.json.gz'),selection=json('selection.json'),allocations=json('allocations/results.json');
const battleFiles=['engine.mjs','scenarios.mjs','tactics.mjs','combat-rules.mjs','famous-officers.mjs','battle-ai.mjs','unit-stats.mjs','passives.mjs','tactic-power.mjs','expanded-tactics.mjs','officer-catalog.mjs','data/officers-source.json','data/officers.mjs','engagement.mjs','support-rules.mjs'];
for(const f of battleFiles)assert.equal(createHash('sha256').update(readFileSync(new URL('../'+f,import.meta.url))).digest('hex'),after.hashes[f],f+' changed; rerun final audit');
assert.equal(after.rulesVersion,39);assert.deepEqual(before.seeds,after.seeds);assert.deepEqual(br.seeds,fr.seeds);
const diff=Object.keys(before.hashes).filter(f=>before.hashes[f]!==after.hashes[f]);
assert.deepEqual(diff.sort(),['combat-rules.mjs','famous-officers.mjs','scenarios.mjs','tactics.mjs']);
const row=(data,id)=>{const r=data.rows.find(r=>r.id===id);assert.ok(r,id);return r;};
const mean=xs=>xs.reduce((n,x)=>n+x,0)/xs.length;
const pct=n=>(n*100).toFixed(1)+'%';
const margin=r=>r.remaining-r.enemyRemaining;
const won=r=>`${r.wins}/${r.n}`;
const control=(data,id)=>mean(data.filter(r=>r.id===id).map(r=>r.units.find(u=>u.id==='person-433').controlSteps));
const checks=[];
const cavalry=fr.rows.filter(r=>r.id.startsWith('recommendation/')).map(r=>{
 const old=row(br,r.id),id=r.id.split('/')[1],level=r.id.split('/')[2];
 const cast=roles.filter(s=>s.id===r.id).every(s=>{const u=s.units.find(u=>u.id===id);return u.casts.rush>0&&u.casts[SPECIAL_TACTICS[id]]>0;});
 checks.push({id:r.id,passed:(r.wins>old.wins||margin(r)-margin(old)>=.1)&&cast});
 return `| ${OFFICER_BY_ID[id].name} ${level}级 | ${won(old)} | ${won(r)} | ${pct(r.remaining)} |`;
});
const zhang=[5,10].map(level=>{
 const id=`frontline/zhangfei/${level}/full`,old=row(br,id),r=row(fr,id),a=control(beforeRoles,id),z=control(roles,id);
 checks.push({id,passed:z>=a*1.3&&margin(r)>=margin(old)-.05});
 return `| ${level}级 | ${a.toFixed(2)} → ${z.toFixed(2)} | +${pct(z/a-1)} | ${won(old)} → ${won(r)} | ${pct(margin(old))} → ${pct(margin(r))} |`;
});
const player=selection.selected.map(c=>{
 const prefix=`player/${c.route}/${c.enemy}/`,a=row(after,prefix+'default'),z=row(after,prefix+'selected');
 checks.push({id:prefix+'decision',passed:z.wins/z.n-a.wins/a.n>=.25||margin(z)-margin(a)>=.1});
 return `| ${ROUTES.find(r=>r.id===c.route).name} | ${ENEMIES.find(r=>r.id===c.enemy).name} | ${c.allocation} / ${c.plan} | ${won(a)} → ${won(z)} | ${pct(z.remaining)} |`;
});
const weak=row(after,'player/mixed/balanced/selected'),replacement=row(after,'player/mixed/balanced/without-support-role');
checks.push({id:'weak-role-value',passed:margin(weak)>margin(replacement)+.02});
const aux=mean(runs.filter(r=>r.id==='player/mixed/balanced/selected').map(r=>r.units.find(u=>u.id==='person-123').healing));
const exclusive=['liao','chu','jia'].map(id=>{
 const group=roles.filter(r=>r.id===`exclusive/${id}`),casts=mean(group.map(r=>r.units.find(u=>u.id===id).casts[SPECIAL_TACTICS[id]]||0));
 checks.push({id:'exclusive/'+id,passed:casts>0});
 return `| ${OFFICER_BY_ID[id].name} | ${SPECIAL_TACTICS[id]} | ${casts.toFixed(2)} |`;
});
mkdirSync(new URL('presets/',root),{recursive:true});
const presets=[];
for(const c of selection.selected){
 const route=ROUTES.find(r=>r.id===c.route),enemy=ENEMIES.find(r=>r.id===c.enemy),test=playerCase(route,enemy,c.allocation,c.plan),seed=VALIDATION_SEEDS[0];
 const state=createScenario('custom-battle',seed,20,null,{...test.draft,seed});test.options.setup(state);validateSave(structuredClone(state));
 const opening=state.battle.sides.map(s=>s.units.map(u=>({id:u.id,type:u.type,level:u.level,troops:u.initial,x:u.x,y:u.y,tactics:u.tactics})));
 assert.deepEqual(opening,runs.find(r=>r.id===`player/${c.route}/${c.enemy}/selected`&&r.seed===seed).opening.teams,'export matches measured opening');
 const file=`${c.route}-${c.enemy}.json`;writeFileSync(new URL('presets/'+file,root),JSON.stringify(state));
 presets.push(`| ${route.name} / ${enemy.name} | ${ALLOCATIONS[c.allocation].join(' / ')} | [导入开局](presets/${file}) |`);
}
const allocationTable=allocations.rows.map(r=>`| ${r.id} | ${won(r)} | ${pct(r.remaining)} | ${pct(r.enemyRemaining)} |`).join('\n');
const failures=checks.filter(c=>!c.passed),total=before.total+after.total+br.total+fr.total+allocations.total;
const report=`# 平衡目标优化验证 · 规则 39

本轮完成名将配装修复、张飞控场强化与可复用的玩家配阵验证。预先记录的本轮验收 ${checks.length-failures.length}/${checks.length} 项通过。名将、弱将和玩家决策三条目标均获得局部证据，**不代表全游戏平衡已完成**。

## 实际改动

- 修复自由对战玩家侧张辽、许褚、郭嘉的专属遗漏：直接按专属映射查找，不再只接受 unique- 前缀。明确指定的剧本/玩家配装继续优先。
- 名将骑兵通用推荐改为“专属 → 疾驰 → 冲阵”，用奋战槽换取机动与突后能力。战法配置增加“专属搭配”按钮，支持恢复专属、三槽顺序、存储与交战后锁定。
- 张飞“长坂怒喝”基础眩晕 3 → 5 步；仍为相邻最多两队、原伤害、原冷却，受成功率、威力和免控条件约束。没有统一提高名将属性。
- 战斗规则 38 → 39，旧规则存档需要重开；离线缓存更新。

## 名将职责与专属贡献

### 骑兵通用推荐

下表是在相同合法阵位、6000 主核＋1500 枪兵＋1500 辅兵、对枪弓弩各3000时，**显式采用通用推荐函数**的对照。旧通用推荐用专属挤掉疾驰，形成“专属＋冲阵＋奋战”；新推荐保留疾驰。自由对战的原生配装另有角色算法，主矩阵中的 recommended 指原生配装，不能把这张表误解为此前所有自由对战骑兵都失败。六组新推荐的每一局均实际施放专属和冲阵。

| 名将 | 旧推荐胜局 | 新推荐胜局 | 新推荐本军剩余 |
| --- | --- | --- | --- |
${cavalry.join('\n')}

主矩阵还保留了六名将的1/5/10级、专属/一槽基础替换/同职责普通将/原生配装对照。诸葛亮、周瑜以1500兵力的谋略位评价。最初缺少冲阵的骑兵试配败于远程阵，判为配装与克制代价，没有借此提高伤害。

### 张飞守线

张飞枪3000＋马忠弓3000＋李典弩3000，对颜良、文丑、张辽骑兵各3000。控制队步按每步仍存活、实际带有张飞来源眩晕的敌军计数，不是名义持续时间或施放次数。

| 等级 | 平均控制队步（旧 → 新） | 增幅 | 胜局 | 净剩余兵力差 |
| --- | --- | --- | --- | --- |
${zhang.join('\n')}

控制贡献稳定增加，胜率没有同步稳定提高：10级仍从2胜降为1胜，净剩余差变化很小。普通将替换在两档均0/16，张飞基础配装分别1/16；这组强敌中控场特色更清楚，但不足以认定其专属全面胜过基础战法。玩家仍需要保护远程、接敌分工与克制。

### 补回的专属确实施放

在单独的真实零战意三人队战斗中，三人的专属从玩家初始遗漏恢复，并实际触发；未要求这三组强敌压力局必须取胜。

| 武将 | 专属 ID | 平均实际施放 |
| --- | --- | --- |
${exclusive.join('\n')}

## 弱将贡献与玩家决策

总兵力双方9000，双方5级，平原；同一阵容和同一敌人比较默认与练习选中方案。兵力变化仍在武将带兵上限内。core=6000/600/600/600/600/600；thin=4116/2941/1765/60/59/59。mixed的关羽采用原生骑兵，其余阵容见逐局 opening。

| 路线 | 敌人 | 练习选定方案 | 默认 → 针对方案胜局 | 针对方案本军剩余 |
| --- | --- | --- | --- | --- |
${player.join('\n')}

**弱将正收益证据：** 强弱混搭对河北混编，简雍60兵辅兵方案${won(weak)}、本军余${pct(weak.remaining)}；同名额、同武将、同兵力、同等级改为枪兵职责后${won(replacement)}、本军余${pct(replacement.remaining)}，敌余${pct(replacement.enemyRemaining)}。简雍实际战法治疗平均${aux.toFixed(1)}兵。这个对照同时包含兵种、配装和由此改变的支援站位，证明的是整体支援分工，不是单项治疗倍率；不能把胜差全部归给治疗。

**反例也保留：** 多二流协同对河北混编，取消所选战法调整可从9/16变15/16；辅兵改为枪兵也达15/16。赵云主核的薄辅兵在部分局贡献很低；三人骑兵主核的1500兵简雍改前线职责时，剩余兵力反而更高。因此不能宣称带辅兵必优，或所有弱将都有独立不可替代价值。

撤销所选方案中的兵力分配、战法、部署、战前意图、玩家军略、辅助职责，均单独保留16种子对照。撤销一项后的方案若更强，仍只记录，不用验证集重新选冠军。军略以可见状态判断；有些阵容没有合适的已学军略，禁用军略对结果无影响。

### 四类分兵的独立验证

每个路线/敌阵固定练习选中的其他配置，只改变兵力分配。equal=1500×6；dual=3500/3500/500/500/500/500。

| 路线 / 敌阵 / 分兵 | 胜局 | 本军剩余 | 敌军剩余 |
| --- | --- | --- | --- |
${allocationTable}

### 可导入练习开局

以下均导出验证集**第一个固定种子73000009**的开局，不挑最好的一局。在“存档与设置”中导入；保存了部队、兵力、战法、站位和意图，开战后由玩家自行操作军略。脚本的军略策略优先解控、有效治疗、压制敌战意，再按接敌状态使用进攻/防护；重试按钮按原始自定义草案重建，欲恢复完整方案请重新导入本文件。

| 方案 | 按武将顺序的兵力 | 存档 |
| --- | --- | --- |
${presets.join('\n')}

## 验证边界与复现

本报告独立验证共${total}局：规则38/39主矩阵各1920局，职责补充各336局，规则39分兵矩阵384局。另有384局选阵练习、288局角色试配、84局职责练习、40局张飞参数探针；不把练习和验证混成独立样本数。不同组复用16个验证种子，1920不是1920个不同种子。

每组首种子检查第20步（早于结束时）的存读档续战；每局检查合法位置、配装、兵力、结束存档。实际命中按引擎impact事件统计，排除重复连携展示；完整治疗总量见各单位healed，来源治疗计数不含步前玩家军略和协阵光环，不能混用。护盾吸收记录在攻击者事件中，只用于伤害路径诊断，不能视为该攻击者的支援贡献。

两版冻结快照仅${diff.join('、')}改变。与同时进行的战略/内政工作隔离；最终报告生成时核对当前工作区15项关键战斗/武将源文件。源哈希、所有失败局、开局、命中、控制、军略、死亡顺序均在results.json和runs.json.gz中；改动前四文件保留于baseline/source。

预先标准见[验收约定](验收约定.md)。范围仍局限于本批平原阵容；没有水战强度结论，没有覆盖所有41名将的职责胜负，也没有检验所有预算与所有配装排列。主矩阵部署未逐组镜像，侧差不能由主矩阵排除。

另见[384局配阵换边复验](side-check-rules39/换边验证.md)：冻结原练习选定的六组方案，使用与训练、原验证均不重叠的16个新种子，对默认和针对方案分别旋转180度。双方均用固定规则军略，因此它验证配阵收益的换边稳定性，不替代上述Codex玩家操作对照，也不计入4896局主验证。六组方案两侧均改善，但多二流协同对河北混编仍有11/16与6/16的侧差；保留差异，不用新验证结果重新选阵或调数值。使用 npm run audit:balance-sides 可复测，输出目录随规则版本区分。

当前工作区全套回归 **506/506通过**，npm run check及新增脚本语法检查通过。新专属配置入口通过真实浏览器点击、保存、刷新与390像素移动布局验证，截图见outputs/balance-objectives-ui。

复测当前战斗规则（保留历史基线）：

\`\`\`powershell
npm run audit:objectives
node scripts/report-balance-objectives.mjs
\`\`\`

audit:objectives输出到current、roles-validate、allocations目录；报告生成器读取已归档的baseline/final并核对关键源码，不会把新的current结果偷偷当成本轮final。需要重开训练时运行node scripts/audit-balance-objectives.mjs train practice，它在全部源码检查成功后重写selection.json；本轮报告应继续使用归档选择。

本轮两项旧回归随契约更新：战意测试要求每位武将自己的低门槛能力先于其100战意专属，不再依赖已从推荐中移除的奋战；控制协同测试保留原种子网格，检查16局内仍有胜败，不再把某一历史种子的固定败局当成规则。两者均保留真实结算和原控制/物理配装对照。
`;
writeFileSync(new URL('验证报告.md',root),report);
writeFileSync(new URL('acceptance.json',root),JSON.stringify({total,checks,passed:failures.length===0,changedRuntime:diff},null,2));
assert.equal(failures.length,0,JSON.stringify(failures));console.log('PASS',checks.length,'acceptance checks;',total,'validation battles; 6 importable starts');
