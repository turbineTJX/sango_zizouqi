import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {TACTICS_BOOK,SPECIAL_TACTICS} from '../tactics.mjs';
import {HERO_CASES} from './hero-redesign-cases.mjs';
const dir='docs/hero-redesign-v44',read=mode=>JSON.parse(readFileSync(`${dir}/${mode}-validation.json`,'utf8'));
const before=read('baseline'),after=read('current'),replacement=read('replacement');
const n=v=>Number(v.toFixed(1)),link=(title,path)=>`[${title}](${resolve(path).replaceAll('\\','/')})`;
for(let i=0;i<after.rows.length;i++){
 const a=after.rows[i],b=before.rows[i];assert.deepEqual(a.draft,b.draft);
 for(const [id,u] of Object.entries(a.units)){
   assert.deepEqual(u.learning.byTroop,b.units[id].learning.byTroop,'普通学习不重抽');
   if(id!=='person-255')assert.deepEqual(u.tactics,b.units[id].tactics,'既有学习及顺序保持');
 }
}
const role={
 cao:'带动其他友军进攻：两队攻防增益，并补少量战意；不鼓舞自身。',
 jia:'专门削减战意，达到60战意的目标受到更强削减；震军延缓输出，无直接伤害。',
 'person-255':'新增王佐救急：为一队其他友军净化、加盾、补战意；保留原内政成长与默认兵种。',
 'person-290':'高门槛范围封技与削战意，衰咒、迟滞铺垫提高伤害；需要前排争取蓄势时间。',
 dun:'提前接敌减伤，削弱当前敌人，并鼓舞一队友军，侧重守线。',
 yuanxia:'远距迟滞追击，利用已破甲或迟滞目标追加伤害。',
 'person-472':'低门槛护身与反击，降低即时伤害，转为承压后的持续输出。',
 'person-636':'两队伤兵救援、防御增益与小额战意补给；无真实伤兵不发动。',
 'person-99':'满战意斩将；已有破甲、迟滞、眩晕时增伤，低于40%兵力时额外收割。',
 'person-433':'高门槛近阵震慑，最多三队受击与眩晕，自身短时减伤。',
 'person-661':'满战意范围强攻，利用破甲或迟滞扩大杀伤，释放消耗70战意。',
 'person-246':'满战意火攻覆盖三队，已有灼烧时追加伤害，再续灼烧与破甲。',
 'person-371':'交锋破甲、自保并鼓舞友军，为后续斩将创造条件。',
 'person-368':'净化两队其他友军、缩短独立战法冷却并减伤，不缩短共用调息。',
 'person-226':'针对高战意目标增加直接伤害与削战意，配合削弱压制其后续输出。',
};
const lines=['# 名将专属重设计与自定义战役验证（规则44）','',
'本轮重做15人：“夏侯”按夏侯惇、夏侯渊两人处理；“刘关张”为刘备、关羽、张飞。荀彧（person-255）新增专属，荀攸的现有专属继续保留。学习规则、普通战法池与共用4步调息沿用规则43。','',
'## 逐人设计','',
'| 武将 / 战法 | 定位 | 门槛 / 消耗 / 冷却 | 设计重点 |','|---|---|---|---|',
...HERO_CASES.map(([id,name])=>{const s=TACTICS_BOOK[SPECIAL_TACTICS[id]];return `| ${name} · ${s.name} | ${s.tempoRole} | ${s.threshold} / ${s.intentCost} / ${s.cooldown}步 | ${role[id]} |`;}),'',
'条件增伤取本次施放前的状态与战意快照。本次技能自己施加的破甲、灼烧，以及本次命中送给目标的受击战意，不能反过来触发本次条件加成。目标选择使用双方共用逻辑，优先合法范围内符合条件的目标，仍受接敌与目标规则约束。没有AI专属收益。','',
'普通战法仍随兵种与等级随机学习；没有给双方补指定低级技能，也没有调整战中自动施放顺序。专属5级必得并额外携带。荀彧的新专属不挤占普通名额，原治政交涉路线保持。','',
'## 自定义战役结果','',
'先以普通混编观察，再固定适合职责的阵容：指挥/支援将搭配张辽和廖化；关羽搭配孙策与简雍；吕布搭配夏侯渊与简雍；周瑜搭配黄盖与简雍；诸葛亮搭配庞统与典韦，其余搭配廖化与简雍。既保留失败局，也不把这些组合当作最优解。最初三个后排的诸葛亮试验缺少可靠前排，后改为由典韦守线；这一选择在独立验证前固定。','',
'探索种子440211＋n×7919，n=0～3；独立验证n=4～7。每组交替采用5级和8级，每种配置均测试均分与主辅分兵、交换出生侧。单人职责测试每方9000兵；支援将非均分为1500、主力5000、守线2500，输出将为5000、搭档2500、辅助1500。六队组合每方18000兵，均分3000×6或5000＋2600×5。','',
'最终保留1392场完整战斗：探索576场、独立前后对照576场、同兵种同兵力李典替换对照240场；第24步续战副本不重复计场次。每场从零战意开始，第24步存读档并逐步确定性续战；核验战意边界、同队施法间隔和学习记录不变。前后普通学习记录逐项相同，荀彧仅新增专属，其余既有战法及顺序保持。玩家侧无额外军略操作，敌方沿用自动军略；换边测试保留这一规则。','',
'以下每人16场，分母包含5/8级、两种分兵与两侧出生；不是16个独立随机种子。不同武将搭档不同，胜局数不可横向当作武将排名。前后版本搭档中的其他名将也可能在本轮重做，故前后胜负是组合对照，不是单一专属的因果归因。李典替换保持其余单位、兵种、等级、分兵、种子和先后侧一致，但李典按自己的适性与记录合法学习，衡量的是整体上场价值。','',
'| 武将 | 旧版胜局 | 新版胜局 | 李典替换胜局 | 新版平均专属次数 | 新版平均专属直接伤害 / 治疗 | 可观察作用 |','|---|---:|---:|---:|---:|---|---|',
...HERO_CASES.map(([id,name])=>{const a=after.summary.find(r=>r.case===name),b=before.summary.find(r=>r.case===name),c=replacement.summary.find(r=>r.case===name);const effects=[];if(a.meanDrain)effects.push(`场均削战意${n(a.meanDrain)}`);if(a.intentRestored)effects.push(`场均补战意${n(a.intentRestored)}`);if(a.shieldGranted)effects.push(`场均授盾${n(a.shieldGranted)}`);if(a.meanHealing)effects.push(`场均救治${n(a.meanHealing)}`);if(a.setup)effects.push(`乘隙命中${a.setup}次`);if(a.highIntent)effects.push(`高战意反制${a.highIntent}次`);if(a.controlSuccess)effects.push(`场均成功控制${n(a.controlSuccess)}次`);if(a.counterDamage)effects.push(`场均反击伤害${n(a.counterDamage)}`);if(a.cooldownEvents)effects.push(`场均缩冷却${n(a.cooldownEvents)}队次`);if(a.cleanseEvents)effects.push(`场均解除减益${n(a.cleanseEvents)}项`);return `| ${name} | ${b.wins}/16 | ${a.wins}/16 | ${c.wins}/16 | ${n(a.meanCasts)} | ${n(a.meanDamage)} / ${n(a.meanHealing)} | ${effects.join('；')||'减伤与削弱守线'} |`;}),'',
'所有15人的专属在各自16场职责样本中均实际发动。直接伤害只统计该专属的即时技能命中，排除普攻和后续灼烧。授盾是赋予量，不等于实际吸收量；反击伤害含该队全部反击来源，不能全部归于典韦专属。控制统计成功的目标判定，不是控制时长。冷却统计被缩短的目标队次，不是所有技能缩短步数之和。条件触发按目标计数。','',
'| 六队阵容 | 旧版胜局 | 新版胜局 | 旧版平均余兵差 | 新版平均余兵差 |','|---|---:|---:|---:|---:|',
...['魏军攻防','蜀军控阵','吴军火攻'].map(name=>{const a=after.summary.find(r=>r.case===name),b=before.summary.find(r=>r.case===name);return `| ${name} | ${b.wins}/16 | ${a.wins}/16 | ${n(b.meanMargin)} | ${n(a.meanMargin)} |`;}),'',
'## 已确认与仍不足之处','',
'- 荀彧新增的净化、护盾与补战意能在真实交战中兑现；诸葛亮有守线队友时能够完成范围封技；典韦确实进入反击状态并参与持续承伤输出。','- 司马懿与郭嘉的高战意反制反复触发，周瑜和夏侯渊的条件增伤也能观察到。低级铺垫并不保证每次决胜技都获得加成。','- 关羽的条件增伤在独立16场中只触发1次；孙策破甲与关羽蓄势、目标和施放时点的衔接还不稳定。不能把这一搭配称为成熟连招。','- 蜀军六队阵容在这组敌阵下由2/16降到0/16，尚未达成理想的守线与爆发节奏；本轮没有为了拉回胜率而倒改通用引擎或统一增强武将。','- 郭嘉、孙权等支援/压制角色虽有实际效果，但本次李典替换对照中，部分阵容余兵或胜局更好；不能据此宣称这些名将已在所有职责样本中取得优势。典韦三队样本仍未取胜。','',
'本轮完成专属重设计、合法自定义实战和行为验收，不代表全部名将/阵容的平衡已经完成。下一步应优先针对关羽的铺垫衔接与蜀军接敌过程继续分析；不以这些小样本把所有武将胜率拉平。','',
'## 试玩与验收','',
'可先进入战略原型的“设置 → 导入存档”，选择下面的规则44文件。导入后会进入自由对战，保留已经确定的学习与布阵，点击“确认布阵 · 开战”即可。文件均为8级、种子479806、均分兵力、玩家侧0；这对应独立验证的一组设置，不是挑选胜局后的存档。','',
...['wei','shu','wu'].map((id,i)=>'- '+link(['魏军攻防','蜀军控阵','吴军火攻'][i],`outputs/hero-v44/playable/${id}.json`)),'',
...HERO_CASES.map(([id,name])=>'- '+link(`${name}职责试战`,`outputs/hero-v44/playable/${id}.json`)),'',
'600项完整回归通过；其中新增17项覆盖荀彧学习、施放前条件判定，以及15名武将自然施法、消耗、目标和确定性续战。语法检查通过。桌面与390px手机界面已验证实际导入、荀彧额外专属与效果说明，未发现横向溢出或页面脚本错误。旧版存档按规则策略提示重新开始。','',
'复测：`node scripts/audit-hero-redesign.mjs current validation`；李典对照：`node scripts/audit-hero-redesign.mjs replacement validation`；导出试玩：`npm run export:hero-battles`；界面：`npm run verify:heroes-ui`（需Playwright）。源代码快照位于 outputs/hero-v44/baseline，逐局轨迹和源码哈希位于本目录各JSON文件。','',
];
writeFileSync(`${dir}/名将设计与实战报告.md`,lines.join('\n'));
writeFileSync(`${dir}/战法完整效果.md`,['# 规则44名将完整效果','',...HERO_CASES.flatMap(([id,name])=>{const s=TACTICS_BOOK[SPECIAL_TACTICS[id]];return [`## ${name} · ${s.name}`,'',s.description,'',s.powerDescription,''];})].join('\n'));
console.log('报告已生成：前后阵容、普通学习与既有施放顺序核验一致。');
