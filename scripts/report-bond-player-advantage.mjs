import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const base=resolve(process.argv[2]||'outputs/bond-player-advantage');
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const before=json('work/bond-player-advantage-before-20261010/manifest.json');
const after=json('work/bond-player-advantage-final-20261010/manifest.json');
const campaignSource=json('work/bond-player-advantage-final2-20261010/manifest.json');
const runtimeChanges=Object.keys(campaignSource.hashes).filter(k=>campaignSource.hashes[k]!==after.hashes[k]);
assert.deepEqual(runtimeChanges,['strategic-planner.mjs'],'The battle runtime must match the final campaign runtime');
const rows=[],totals={validationBattles:0,developmentBattles:0,saveChecks:0,replayChecks:0,draws:0,timeouts:0,losses:0};
for(const group of ['bonds','traits']){
 const old=json(join(base,'before-'+group,group+'-summary.json')),now=json(join(base,'after-'+group,group+'-summary.json'));
 assert.equal(old.rulesVersion,122);assert.equal(now.rulesVersion,123);
 for(const phase of ['before','after']){
  const pairs=readFileSync(join(base,phase+'-'+group,group+'-pairs.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  for(const p of pairs){
   assert.equal(p.phase,'validation');assert.equal(p.on.budget,p.off.budget);assert.equal(p.on.trainingGold,p.off.trainingGold);
   totals.validationBattles+=2;totals.saveChecks++;totals.replayChecks+=Number(p.on.replayChecked);
   for(const r of [p.on,p.off]){totals.draws+=Number(r.draw);totals.timeouts+=Number(r.reason==='久战收兵');totals.losses+=Number(!r.win&&!r.draw);}
  }
 }
 for(const r of now.rows){const previous=old.rows.find(x=>x.id===r.id);assert.ok(previous);rows.push({group,id:r.id,name:r.name,before:previous.validation,after:r.validation,contexts:r.contexts});}
}
for(const [folder,group] of [['dev-bonds','bonds'],['dev-traits','traits'],['dev-traits-v2','traits']])totals.developmentBattles+=json(join(base,folder,group+'-summary.json')).battles;
assert.equal(totals.validationBattles,640);assert.equal(totals.replayChecks,40);
const ai=json(join(base,'ai-decisions-complete/unit-tests.json'));assert.equal(ai.failed.length,0);assert.equal(ai.missing.length,0);assert.equal(ai.skipped.length,0);
const natural=json(join(base,'natural-all-ai-final/campaign-audit.json'));assert.equal(natural.metrics.completedDay,61);assert.equal(natural.metrics.deterministicCheckpoints,2);
assert.equal(natural.sourceHashes['strategic-planner.mjs'],campaignSource.hashes['strategic-planner.mjs']);
const ui=json(join(base,'ui/verification.json'));assert.equal(ui.rows.length,6);assert.deepEqual(ui.errors,[]);
const scope=[
 'AI 出征评估、编组推荐、首发替补排序和布阵不使用己方或敌方羁绊的点数、档位、入场收益及属性增量；真实战斗双方仍结算羁绊和特性。',
 '每种能力在两种固定阵容环境、四个独立验证种子和双方交换下进行启用／禁用对照，每版本每种能力 32 场。己方阵容、兵力和训练费用在每组对照中一致。特性对照保留羁绊，羁绊对照保留特性。',
 '剩余兵力优势收益 = 启用与禁用的（己方剩余兵力－敌方剩余兵力）差，除以己方初始兵力。单位为百分点，可超过100；它不是胜率或成功概率。置信区间为八个场景与种子簇的近似95%区间，样本较小。',
 '规则123同时修改AI评分、六项高级羁绊及三项战斗特性；跨版本差异代表整套规则的变化，不能全部归因于单项数值。不同能力使用不同阵容，不能把此表当成武将或羁绊的通用排名。',
 '开发样本只用于确定增强方案；独立验证开始后没有根据结果继续调数值。640场独立验证之外另有224场开发对局。失败局、平局及超时局均保留在原始JSONL与failures目录。禁用局是诊断消融，不能当作合法玩家操作。',
 '战场冻结运行时与最终全国AI运行时只相差战略评分模型编号的存档校验。首次全国续行在旧校验处失败，记录保留在natural-all-ai；修复后的同种子自然续行通过。60日样本不证明长期统一能力或全年可持续性。'
];
const report={rulesVersion:123,createdAt:new Date().toISOString(),totals,source:{before:before.sourceHash,battleAfter:after.sourceHash,campaignAfter:campaignSource.sourceHash,runtimeChanges},ai:{domains:ai.decisionDomains,passed:ai.passed},natural:natural.metrics,ui:ui.rows,scope,rows};
writeFileSync(join(base,'comparison.json'),JSON.stringify(report,null,2));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const changes={
 bondValor:'增伤20%／35%／50%，低战意免伤40%／65%／100%。',
 bondWisdom:'谋略20%／35%／50%，挫志法球2／4／6次；满档军纪20%及低战意谋略增伤40%。',
 bondBeauty:'削减12／18／24战意，40%／55%／70%概率附加3回合异常。',
 bondPeach:'军纪15%／25%／35%；两／三档直接减伤15%／30%再分担，溃败奋战16回合，独存无敌5回合。',
 bondReserve:'锁定1／2／3名后备，入场战意30／45／60，疾行速攻6／8／10回合，护盾10%／20%／30%。',
 bondLastStand:'60%兵力开始生效，输出35%／55%／80%，直接减伤15%／25%／40%。',
 'hero-person-368':'真实军略后每8回合清除两类异常，提供5回合坚定与12%护盾。',
 'hero-person-668':'每6回合帮助至多两队解除两类异常，提供3回合坚定与10%护盾。',
 'hero-person-226':'敌方真实军略后每8回合返还25%指挥条。',
 'hero-cao':'奸雄继续提供合法第七队。'
};
const bars=(value,color)=>`<span class="bar ${color}" style="width:${Math.max(0,Math.min(100,value/150*100))}%"></span>`;
const table=group=>`<div class="scroll"><table><thead><tr><th>能力</th><th>剩余兵力优势收益 · 旧→新</th><th>新规则约95%区间</th><th>旧启用／禁用胜局</th><th>新启用／禁用胜局</th></tr></thead><tbody>${rows.filter(r=>r.group===group).map(r=>`<tr><td><b>${esc(r.name)}</b><small>${esc(changes[r.id]||'任职与真实战斗按共同规则生效。')}</small></td><td class="measure"><div>${bars(r.before.marginGainPP,'old')}<span>${r.before.marginGainPP.toFixed(2)}</span></div><div>${bars(r.after.marginGainPP,'new')}<span>${r.after.marginGainPP.toFixed(2)}</span></div></td><td>${r.after.approx95.map(v=>v.toFixed(2)).join('～')}</td><td>${r.before.onWins}／${r.before.offWins}（各16局）</td><td>${r.after.onWins}／${r.after.offWins}（各16局）</td></tr>`).join('')}</tbody></table></div>`;
writeFileSync(join(base,'report.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>羁绊与特性 · 规则123验证</title><style>
body{margin:0;background:#f3f4f0;color:#263731;font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1160px;margin:auto;padding:32px 20px}h1{font-size:30px;margin:0}h2{margin:28px 0 10px;font-size:22px}p{margin:12px 0}.lead{color:#536961}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}.card{background:white;border:1px solid #dde3df;border-radius:12px;padding:16px}.card b{display:block;font-size:27px;color:#24765a}.card small{color:#64776e}table{width:100%;border-collapse:collapse;background:white}th,td{text-align:left;padding:14px;border-bottom:1px solid #e0e6e2;vertical-align:top}th{background:#e7eee8;font-size:14px}td:first-child{max-width:320px}td small{display:block;font-size:13px;color:#64776e}.scroll{overflow:auto;border-radius:10px}.measure{min-width:195px}.measure div{height:28px;position:relative;background:#f4f5f3;margin-bottom:4px}.bar{display:inline-block;height:21px;vertical-align:middle}.old{background:#a8b7ae}.new{background:#26846b}.measure span:last-child{font:13px system-ui;position:absolute;right:5px;top:3px;background:#ffffffe0;padding:0 3px}.note{background:white;padding:18px 22px;border-radius:12px;margin-top:18px}li{margin-bottom:10px}a{color:#24765a}@media(max-width:680px){main{padding:18px 12px}h1{font-size:24px}.cards{grid-template-columns:repeat(2,1fr)}td:first-child{min-width:180px}table{min-width:850px}}
</style><main><h1>羁绊与特性 · 规则123验证</h1><p class="lead">AI忽略羁绊评分，玩家通过阵容与任职组合取得优势。实际战斗双方使用相同增强效果。</p><div class="cards"><div class="card"><b>${totals.validationBattles}</b><small>独立验证对局 · 旧新各320</small></div><div class="card"><b>${totals.replayChecks}</b><small>战斗读档后完整复现</small></div><div class="card"><b>${ai.passed}</b><small>AI回归通过 · ${ai.decisionDomains}类决策</small></div><div class="card"><b>60日</b><small>原始官渡全国全AI续行</small></div></div>
<p>灰色为旧规则，绿色为新规则。桃园、蓄锐和背水的实际收益明显增强；勇武仍十分强势。倾国在测试阵容中仍未取胜，碧眼与隐忍单项收益有限；组合与对局条件仍有价值。</p><h2>六种高级羁绊</h2>${table('bonds')}<h2>四项直接战斗特性</h2>${table('traits')}
<h2>验证范围</h2><div class="note"><ul>${scope.map(s=>'<li>'+esc(s)+'</li>').join('')}</ul><p>全国续行：${natural.metrics.newDepartures}次新出征，${natural.metrics.settledBattles}场已结算战斗，${natural.metrics.activeBattles}场仍在进行，${natural.metrics.captures}次城池易主；${natural.metrics.deterministicCheckpoints}次确定性续行通过。高级羁绊说明的桌面与手机显示均通过。总计${totals.saveChecks}个启用局验证当前存档；全部对照保留${totals.losses}个败局、${totals.draws}个平局、${totals.timeouts}个久战收兵结果。</p><p><a href="comparison.json">完整统计JSON</a> · <a href="natural-all-ai-final/campaign-audit.json">全国AI记录</a> · <a href="ai-decisions-complete/unit-tests.json">AI单元回归</a> · <a href="ui/verification.json">界面核验</a></p></div></main></html>`);
console.log(JSON.stringify({report:join(base,'report.html'),...totals,aiPassed:ai.passed,natural:natural.metrics}));
