import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),base=resolve(process.argv[2]||'outputs/battle-strength-20261010-r122');
const previous=process.argv[3]?resolve(process.argv[3]):null;
const parts=[['bonds','bonds'],['tactics-0','tactics'],['tactics-1','tactics'],['traits','traits']];
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const groups=parts.map(([dir,kind])=>({...read(join(base,dir,kind+'-summary.json')),dir,kind}));
const version=groups[0].rulesVersion;
assert.ok(groups.every(g=>g.rulesVersion===version));
const rows=groups.flatMap(g=>g.rows.map(r=>({...r,kind:g.kind,source:g.dir+'/'+g.kind+'-pairs.jsonl'})));
assert.equal(new Set(rows.map(r=>r.kind+':'+r.id)).size,81);
assert.equal(rows.length,81);
const manifestPath=join(root,`work/battle-strength-20261010-r${version}/manifest.json`),manifest=read(manifestPath);
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const [p,h]of Object.entries(manifest.hashes))assert.equal(sha(readFileSync(join(manifest.runtime,p))),h,'Snapshot changed: '+p);
const verification={battles:0,pairs:0,replayChecks:0,baselineSaveChecks:0,baselineTimeouts:0,ablationTimeouts:0,baselineDraws:0,savedUnsuccessfulBaselines:0,validationSeeds:[],snapshotHash:manifest.sourceHash};
const seeds=new Set();
for(const g of groups){
 const pairs=readFileSync(join(base,g.dir,g.kind+'-pairs.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(pairs.length*2,g.battles);assert.equal(pairs.length,g.rows.length*16);
 verification.pairs+=pairs.length;verification.battles+=g.battles;
 verification.savedUnsuccessfulBaselines+=readdirSync(join(base,g.dir,'failures')).length;
 for(const p of pairs){
  assert.equal(p.phase,'validation');seeds.add(p.seed);
  assert.equal(p.on.budget,p.off.budget);assert.equal(p.on.trainingGold,p.off.trainingGold);
  assert.equal(p.on.subject,p.off.subject);
  verification.baselineSaveChecks++;
  verification.replayChecks+=Number(p.on.replayChecked);
  verification.baselineTimeouts+=Number(p.on.reason==='久战收兵');
  verification.ablationTimeouts+=Number(p.off.reason==='久战收兵');
  verification.baselineDraws+=Number(p.on.draw);
 }
}
verification.validationSeeds=[...seeds].sort((a,b)=>a-b);
assert.equal(verification.battles,2592);assert.equal(verification.replayChecks,162);assert.equal(seeds.size,4);
const oldRows=previous?parts.flatMap(([dir,kind])=>read(join(previous,dir,kind+'-summary.json')).rows.map(r=>({...r,kind}))):[];
const comparison=rows.map(r=>{const old=oldRows.find(o=>o.kind===r.kind&&o.id===r.id);return old?{kind:r.kind,id:r.id,name:r.name,oldGain:old.validation.marginGainPP,newGain:r.validation.marginGainPP,change:+(r.validation.marginGainPP-old.validation.marginGainPP).toFixed(2),oldWins:old.validation.onWins,newWins:r.validation.onWins}:null;}).filter(Boolean);
const levelPath=join(base,'level3-bonds','bonds-summary.json');
const levelRows=existsSync(levelPath)?read(levelPath).rows.map(r=>({...r,kind:'bonds'})):[];
const mapRows=['forest-ravine','hill-pass'].flatMap(map=>{
 const p=join(base,'map-'+map,'bonds-summary.json');return existsSync(p)?read(p).rows.map(r=>({...r,kind:'bonds',map})):[];
});
const supplemental={level3Battles:levelRows.reduce((n,r)=>n+r.validation.battles,0),mapBattles:mapRows.reduce((n,r)=>n+r.validation.battles,0),replayChecks:[...levelRows,...mapRows].reduce((n,r)=>n+r.validation.replayChecks,0)};
for(const [dir,list]of [['level3-bonds',levelRows],...[...new Set(mapRows.map(r=>r.map))].map(map=>['map-'+map,mapRows.filter(r=>r.map===map)])]){
 if(!list.length)continue;
 const ps=readFileSync(join(base,dir,'bonds-pairs.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(ps.length,list.length*16);
 for(const p of ps){assert.equal(p.phase,'validation');assert.equal(p.on.budget,p.off.budget);assert.equal(p.on.trainingGold,p.off.trainingGold);}
}
const knownNotes={
 bondValor:'高级羁绊。满档需要6点及至少5名指定持有者；本轮六名全部入队。伤害增幅与对低战意来源的免疫共同带来很大增量，凑将成本须计入。',
 bondEscort:'低级羁绊，但最高档仍需六名真实持有者。邻接护盾及一次破盾免伤在当前团战中贡献突出。',
 bondFire:'本阵容六名持有者专门使用弓兵，持续普攻容易触发灼烧；该结果不能直接外推到近战或不持续攻击的军团。',
 bondChain:'本阵容专门使用弓兵，检验火攻／连环的实际配合。',
 bondPeach:'三名持有者已满档。收益小可能来自分担、邻接和溃败窗口；不等于三个武将本体弱。',
 bondReserve:'双方八队、真实后备补位。现有 AI 不刻意保存档位或安排额外次数的受益者。',
 bondSiegebreak:'虽携带攻城装备，但多数战斗在打到城门前结束。无城门贡献时，不能据此判定攻城倍率太低。',
 'tiger-charge':'本场景负收益信号；应复核突进位置、受击暴露及高档战意消耗，暂不按一个样本直接改倍率。',
 'hero-cao':'同样八队、总兵力18000；只比较六／七队同时在场的实际容量差。',
 'hero-person-368':'记录实际特性触发，低边际收益不等于特性未生效。',
 'hero-person-668':'解控是条件效应；本轮没有测出稳定胜负收益。',
 'hero-person-226':'记录实际返还指挥条；返还必须进一步转化成军略才会改变战果。',
};
function note(r){return [knownNotes[r.id],r.kind==='tactics'&&r.validation.sharedSlot.length>1?'装备与本体共用战法槽。本轮禁用对照封锁整个共享槽，差值不可归因于这一项单战法。':null,r.kind==='tactics'&&r.validation.zeroCastPct===100?'基准组全部未施放；无法据此估计单次强度。':null].filter(Boolean).join(' ');}
const summary={createdAt:new Date().toISOString(),rulesVersion:version,verification,supplemental,method:{level:10,paired:'Identical roster, troops and training gold within each feature-on/off pair; each seed swaps sides.',contextsPerAbility:2,validationSeeds:verification.validationSeeds,ablation:'Diagnostic only; feature-off armies are not legal player choices.',margin:'(Own remaining troops - enemy remaining troops) / own initial troops * 100; reported gain is on minus off, not win probability.',uncertainty:'Approximate 95% interval over eight context/seed clusters after averaging side swaps; small sample, no multiplicity correction.',equipment:'Shared-slot ablation; excluded from single-tactic ranking.',scope:'Fixed AI, maximum growth rosters. Not a natural national self-play distribution, early-game tier list, or causal comparison between different ability rosters.'},rows:rows.map(r=>({...r,note:note(r)})),comparison,level3:levelRows,maps:mapRows};
writeFileSync(join(base,'summary.json'),JSON.stringify(summary,null,2));
const cols=['kind','id','name','grade','marginGainPP','approx95Low','approx95High','onWins','offWins','pairs','winGainPP','averageCasts','zeroCastPct','damageGain','healingGain','protectionGain','controlStepGain','ownControlStepReduction','averageTraitUses','commandRestored','note'];
const csv=x=>'"'+String(x??'').replaceAll('"','""')+'"';
const flat=rows.map(r=>({...r,...r.validation,approx95Low:r.validation.approx95[0],approx95High:r.validation.approx95[1],note:note(r)}));
writeFileSync(join(base,'results.csv'),'\uFEFF'+[cols.join(','),...flat.map(r=>cols.map(k=>csv(r[k])).join(','))].join('\r\n'));
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const signed=n=>(n>0?'+':'')+n.toFixed(2);
const contextNames={mixed:'混合兵种',elite:'名将对手',cavalry:'骑兵对手',spell:'谋略对手',frontline:'枪戟前线','rear-defense':'远程守城','ambush-pressure':'三次合法伏兵压力'};
function table(list,extra=''){
 const extraLabel=extra==='tactics'?'平均施放／零施放率':extra==='traits'?'平均特性触发／指挥条返还':'开场档位';
 return '<div class="scroll"><table><thead><tr><th>能力</th><th>剩余兵力差改善</th><th>近似95%区间</th><th>开启胜局</th><th>禁用胜局</th><th>'+extraLabel+'</th><th>说明与分场景数据</th></tr></thead><tbody>'+list.sort((a,b)=>b.validation.marginGainPP-a.validation.marginGainPP).map(r=>{
  const s=r.validation,slot=extra==='tactics'?s.sharedSlot.length>1:false;
  const usage=extra==='tactics'?s.averageCasts+' 次 / '+s.zeroCastPct+'%':extra==='traits'?s.averageTraitUses+' 次 / '+s.commandRestored:s.openingTiers.join('、')+' 档';
  const details=r.contexts.map(c=>`${contextNames[c.context]||c.context}：差值 ${signed(c.marginGainPP)} pp；开启 ${c.onWins}/${c.pairs}，禁用 ${c.offWins}/${c.pairs}`).join('<br>');
  return `<tr><td><strong>${esc(r.name)}</strong>${slot?'<small>共享槽对照</small>':''}</td><td class="num ${s.approx95[0]>0?'positive':s.approx95[1]<0?'negative':''}">${signed(s.marginGainPP)} pp</td><td class="num">[${s.approx95.join(', ')}]</td><td class="num">${s.onWins}/${s.pairs}</td><td class="num">${s.offWins}/${s.pairs}</td><td>${usage}</td><td><details><summary>查看</summary><p>${esc(note(r)||'固定阵容条件下的边际收益，不代表不同阵容的绝对排行。')}</p>${details}<p>团队输出增量 ${s.damageGain}；治疗 ${s.healingGain}；保护 ${s.protectionGain}；敌方受控队回合增量 ${s.controlStepGain}；己方受控队回合减少 ${s.ownControlStepReduction}。</p></details></td></tr>`;
 }).join('')+'</tbody></table></div>';
}
const byId=id=>rows.find(r=>r.id===id),stat=id=>byId(id).validation;
const brief=(id)=>`${byId(id).name} ${signed(stat(id).marginGainPP)} pp（开启 ${stat(id).onWins}/16，禁用 ${stat(id).offWins}/16）`;
const highTactics=rows.filter(r=>r.kind==='tactics'&&r.grade==='exclusive').sort((a,b)=>b.validation.marginGainPP-a.validation.marginGainPP).slice(0,3);
const comparisonTable=comparison.sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,12);
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>战斗强度测试 · 规则${version}</title><style>
body{font:16px/1.65 system-ui,"Microsoft YaHei",sans-serif;color:#26333a;background:#f5f4f0;margin:0}main{max-width:1280px;margin:auto;padding:36px 24px 80px}h1{font-size:32px;margin-bottom:4px}h2{font-size:23px;margin:36px 0 12px}.sub,small{color:#687078}small{display:block;font-size:12px}.card{background:white;padding:20px 24px;border:1px solid #dcdedb;border-radius:8px;margin:18px 0}.scroll{overflow:auto}table{width:100%;border-collapse:collapse;background:white;font-size:14px}th,td{padding:10px 12px;border-bottom:1px solid #e1e5e3;text-align:left;vertical-align:top}th{background:#e8ede9;white-space:nowrap}.num{font-variant-numeric:tabular-nums;white-space:nowrap}.positive{color:#176a47}.negative{color:#a14232}details p{margin:8px 0}summary{cursor:pointer}a{color:#235e89}li{margin:8px 0}code{overflow-wrap:anywhere;font-size:12px}@media print{body{background:white}main{padding:0}.scroll{overflow:visible}details{display:block}}
</style><main><h1>战斗强度测试</h1><div class="sub">2026-10-10 · 冻结规则${version} · ${verification.battles}局独立验证对照 · 31羁绊 / 46可携带战法 / 4直接战斗特性</div>
<div class="card"><p><strong>核心发现：</strong>${brief('bondValor')}；${brief('bondEscort')}；${brief('bondFire')}。这三项的满档效果值得优先做跨阵容平衡复核。</p><p>名将专属中，本轮边际收益前三为 ${highTactics.map(r=>brief(r.id)).join('、')}。独立特性里${brief('hero-cao')}。</p><p>桃园、蓄锐、碧眼和济军未测出稳定收益。这里评估的是当前 AI 能转化成战果的效果；不能直接等同于理论单次效果，更不能据此评价武将全部内政价值。</p></div>
<h2>测试方法与阅读口径</h2><ul><li>全体10级；羁绊使用真实持有者凑最高档，战法使用实际可携带者，保留真实兵种、名将能力及其它羁绊。通常双方各6队×3000兵；蓄锐8队×3000，奸雄8队×2250（总18000）。</li><li>每项能力2类对手 × 4个独立验证种子 × 双方互换 × 开启／禁用，共32局。配对内人员、初始兵力、兵种训练开销完全相同。不同羁绊阵容不作本体属性相同的假设，双方训练开销也不声明必然相同。</li><li>真实 generateBattle、双方战前军议及固定 AI 战斗流程。禁用组仅用于机制消融诊断，不能当作玩家合法配装。军略、后备、无敌与魔免的现有规则均保留。</li><li>主要指标是“剩余兵力差改善”：(己方剩余兵力 − 敌方剩余兵力) ÷ 己方初始兵力，开启结果减去禁用结果。可大于100个百分点；它<strong>不是胜率改善</strong>。本指标不完整刻画拆城价值，攻城另看城门贡献。</li><li>近似95%区间以场景＋种子为8个小样本簇，先平均左右互换；未作多重检验校正。弱信号和跨零区间不据此认定增强、削弱或 BUG。</li><li>现有装备战法与本体共享冷却／次数槽，禁用会封锁同槽其它技能。装备行只评价共享槽机会，排除在单战法强度结论之外。未施放不能推断技能伤害太低。</li><li>这是特定满成长阵容的受控测试。没有穷举全部武将、宝物、21张地图、各等级或所有战法组合；不是普通全国 AI 对局的自然出场胜率。</li></ul>
<h2>羁绊</h2>${table(rows.filter(r=>r.kind==='bonds'))}
<h2>名将专属战法</h2>${table(rows.filter(r=>r.kind==='tactics'&&r.grade==='exclusive'),'tactics')}
<h2>普通与兵种／装备战法</h2>${table(rows.filter(r=>r.kind==='tactics'&&r.grade==='ordinary'),'tactics')}
<h2>武将独立特性</h2><p>只测4项直接改变交战过程的特性。其余内政、出征、运输、战后类特性需要对应长期场景，不能用这份战斗胜率表评低。</p>${table(rows.filter(r=>r.kind==='traits'),'traits')}
${levelRows.length?'<h2>三级补充测试</h2><p>同样对照方法，改为双方真实三级成长。低级羁绊开场档位与上表可能不同；用于检查满档结论在成长中期是否仍明显。</p>'+table(levelRows):''}
${mapRows.length?'<h2>复杂地图补充测试</h2><p>满档勇武、护卫、火谋在以下复杂地图上重复相同种子、双方互换和两类对手。只能与本能力的原地图对照，不以不同阵容绝对胜率直接排名。</p>'+[...new Set(mapRows.map(r=>r.map))].map(map=>'<h3>'+({'forest-ravine':'林地 · 曲折山谷','hill-pass':'丘陵 · 狭口雄关'}[map])+'</h3>'+table(mapRows.filter(r=>r.map===map))).join(''):''}
${comparison.length?'<h2>121 → 122地图更新对照</h2><p>测试期间工作区地图更新，旧版2592局保留并完整重跑当前版本。这里列出变化最大的12项。</p><div class="scroll"><table><tr><th>能力</th><th>121差值</th><th>122差值</th><th>变化</th></tr>'+comparisonTable.map(r=>`<tr><td>${esc(r.name)}</td><td>${signed(r.oldGain)} pp</td><td>${signed(r.newGain)} pp</td><td>${signed(r.change)} pp</td></tr>`).join('')+'</table></div>':''}
<h2>验证与复现</h2><p>全部${verification.baselineSaveChecks}个开启基准通过当前存档校验，${verification.replayChecks}个第20回合存读档续战与不中断结果逐字段一致；逐回合检查存活部队占位唯一、地形合法和兵力有限。基准限时收兵${verification.baselineTimeouts}局，禁用对照限时收兵${verification.ablationTimeouts}局；这些均保留计入，未丢弃失败结果。</p><p>此外三级补充${supplemental.level3Battles}局，复杂地图补充${supplemental.mapBattles}局，补充续战一致性检查${supplemental.replayChecks}组。它们不混入主要81项统计。</p><p>验证种子：${verification.validationSeeds.join('、')}。完整数据：<a href="summary.json">汇总JSON</a> · <a href="results.csv">CSV</a>。逐局JSONL及${verification.savedUnsuccessfulBaselines}份未胜基准完整存档保存在各分组目录。</p><p>源码快照：<code>${esc(manifest.runtime)}</code><br>SHA-256：<code>${manifest.sourceHash}</code></p><p>复现示例：<code>node scripts/audit-battle-strength.mjs --group=bonds --phase=validation --out=&lt;new-output-directory&gt;</code>（在上述冻结 runtime 目录运行）。不同源码版本不可沿用旧存档或混在同一统计中。</p><p>本次增加测试和报告工具，没有修改战斗平衡参数。优先复核满档勇武、护卫、火谋的跨阵容效果；对桃园与低施放率专属，应先复核触发、距离、目标和可用时机，再决定是否调数值。</p></main></html>`;
writeFileSync(join(base,'report.html'),html);
console.log(JSON.stringify({rulesVersion:version,report:join(base,'report.html'),verification,topBonds:rows.filter(r=>r.kind==='bonds').sort((a,b)=>b.validation.marginGainPP-a.validation.marginGainPP).slice(0,6).map(r=>({name:r.name,...r.validation})),topTactics:highTactics.map(r=>({name:r.name,...r.validation}))},null,2));
