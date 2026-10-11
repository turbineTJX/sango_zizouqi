import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {newCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {NATIONAL_SCENARIOS,NATIONAL_FACTIONS} from '../national-scenarios.mjs';
import {cityPayroll} from '../officer-salaries.mjs';
import {cityRecurringIncome,cityWorkLimit} from '../economy.mjs';
import {actionCandidates,grainCapacity,ACTIONS} from '../domestic.mjs';

// This report reads completed natural runs. It neither advances the campaign
// nor changes resources, personnel, wars, facilities or economic parameters.
const out='outputs/economy-review-20261011';
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const hash=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
const sum=(rows,key)=>rows.reduce((n,r)=>n+r[key],0);
const name=id=>NATIONAL_FACTIONS[id]?.name||id;
function cities(s,faction){
 return s.cities.filter(c=>c.owner===faction).map(c=>{
  const payroll=cityPayroll(s,c),income=cityRecurringIncome(s,c);
  return {id:c.id,name:c.name,gold:c.gold,grain:c.grain,grainCapacity:grainCapacity(c),manpower:c.manpower,
   officers:payroll.officers.length,salary:payroll.gold,arrears:payroll.arrears,recurringGold:income.gold,
   recurringGrain:income.grain,ordinaryGoldWorkAllowance:cityWorkLimit(s,c,'gold'),commerce:c.commerce,farm:c.farm};
 });
}
function fiscalSummary(rows){return {cities:rows.length,officers:sum(rows,'officers'),gold:sum(rows,'gold'),grain:sum(rows,'grain'),manpower:sum(rows,'manpower'),
 salary:sum(rows,'salary'),arrears:sum(rows,'arrears'),recurringGold:sum(rows,'recurringGold'),
 ordinaryGoldWorkAllowance:sum(rows,'ordinaryGoldWorkAllowance'),fullGrainCities:rows.filter(c=>c.grain===c.grainCapacity).length};}
const opening=NATIONAL_SCENARIOS.map(spec=>{
 const s=newCampaign(20261013,spec.id,'cao',{allAI:true});
 return {scenario:spec.id,name:spec.name,factions:spec.factions.map(faction=>{
  const local=cities(s,faction),totals=fiscalSummary(local);
  return {faction,name:name(faction),...totals,ordinaryCapacityMargin:totals.recurringGold+totals.ordinaryGoldWorkAllowance-totals.salary,
   salaryIfAllLevel10:totals.officers*100,cityDetails:local};
 })};
});
const inputs=[`${out}/all-heroes-natural-120`,`${out}/red-cliffs-natural-120`,
 'outputs/economic-headroom-20261011/natural-guandu-salaries-final'];
const runs=[];
for(const directory of inputs){
 const audit=await json(`${directory}/campaign-audit.json`),s=await json(`${directory}/campaign-save.json`),spec=NATIONAL_SCENARIOS.find(v=>v.id===audit.metrics.scenario);
 assert.equal(audit.inputSave,null,'Only original openings belong in this assessment');
 assert.equal(audit.metrics.completedDay,121);assert.equal(audit.metrics.requestedDays,120);
 assert.equal(s.campaign.allAI,true);assert.equal(s.campaign.domestic.incidents.enabled,true);
 const currentDifferences=[];
 for(const [file,digest] of Object.entries(audit.sourceHashes))if(await hash(file)!==digest)currentDifferences.push(file);
 assert.deepEqual(currentDifferences,[],`Natural run differs from current game: ${directory}`);
 // Validate a copy: validation is not allowed to silently alter the evidence.
 validateCampaign(structuredClone(s));
 const initial=newCampaign(audit.metrics.seed,spec.id,'cao',{allAI:true});
 const factions=spec.factions.map(faction=>{
  const start=cities(initial,faction),end=cities(s,faction),nodes=s.campaign.activity.nodes.filter(n=>n.faction===faction&&n.category==='domestic');
  const starts=nodes.filter(n=>n.phase==='start'),completed=nodes.filter(n=>['complete','failure'].includes(n.phase));
  const workCosts={};
  // Delayed construction can emit several outcomes for one paid action. A
  // repeated result.spent is not another debit; sum actual start charges only.
  for(const node of starts){const item=workCosts[node.key]??={name:ACTIONS[node.key]?.name||node.key,starts:0,upfrontGold:0};item.starts++;item.upfrontGold+=node.result.cost||0;}
  const zeroCashWork=completed.filter(n=>ACTIONS[n.key]?.kind==='cash'&&n.result.actual===0&&n.result.factor>=1);
  return {faction,name:name(faction),initial:fiscalSummary(start),final:fiscalSummary(end),cityDetails:end,
   completedWorkCredits:{gold:completed.reduce((n,x)=>n+(x.result.resourceCredit?.gold||0),0),grain:completed.reduce((n,x)=>n+(x.result.resourceCredit?.grain||0),0),manpower:completed.reduce((n,x)=>n+(x.result.resourceCredit?.manpower||0),0)},
   workCosts,successfulZeroCashWork:zeroCashWork.length,
   arrearsHistory:audit.citySamples.filter(c=>c.owner===faction&&c.payroll?.arrears>0).map(c=>({day:c.day,cityId:c.id,gold:c.gold,grain:c.grain,arrears:c.payroll.arrears})),
   goldByTurn:[...new Set(audit.citySamples.map(c=>c.day))].map(day=>{const cs=audit.citySamples.filter(c=>c.day===day&&c.owner===faction);return {day,cities:cs.length,gold:sum(cs,'gold'),arrears:cs.reduce((n,c)=>n+(c.payroll?.arrears||0),0)};})};
 });
 const payrollPaid=audit.citySamples.filter(c=>c.day>1).reduce((n,c)=>n+(c.payroll?.lastPaid||0),0);
 runs.push({directory,metrics:audit.metrics,sourceFiles:Object.keys(audit.sourceHashes).length,currentDifferences,payrollPaid,factions});
}
const heroes=await json(`${inputs[0]}/campaign-save.json`),city=heroes.cities.find(c=>c.id==='town-31');
const assignment=heroes.campaign.domestic.assignments.find(a=>a.cityId===city.id&&a.officerId==='person-533');
const before=JSON.stringify(heroes),normal=actionCandidates(heroes,assignment),withoutBudgetFilter=actionCandidates(heroes,assignment,{ignoreFunds:true});
assert.equal(JSON.stringify(heroes),before,'Candidate inspection must not alter the natural save');
const sell=withoutBudgetFilter.find(c=>c.key==='sell');
assert.ok(sell&&sell.cost===30&&sell.amount===1200);assert.ok(!normal.some(c=>c.key==='sell'));
const fairEvidence=heroes.campaign.activity.nodes.filter(n=>n.cityId===city.id&&n.day===120&&n.key==='fair'&&n.phase==='complete')
 .map(n=>({officerId:n.officerId,day:n.day,gold:n.result.actual,text:n.text}));
assert.deepEqual(fairEvidence.map(n=>n.gold),[300,0,0]);
const liquidityProbe={cityId:city.id,city:city.name,gold:city.gold,grain:city.grain,grainCapacity:grainCapacity(city),arrears:city.payroll.arrears,
 allowedCandidates:normal.map(c=>({key:c.key,cost:c.cost,score:c.score})),candidateWithOnlyBudgetFilterDisabled:{key:sell.key,cost:sell.cost,grain:sell.amount,score:sell.score},fairEvidence,
 scope:'Read-only comparison of the same real save. ignoreFunds changes candidate inspection only; no proposal was approved and no sale, free money or scenario continuation was simulated.'};
const war=await json('outputs/economic-headroom-20261011/costs-and-opening.json');
for(const [file,digest] of Object.entries(war.sources))assert.equal(await hash(file),digest,`War cost inputs stale: ${file}`);
const result={createdAt:new Date().toISOString(),verdict:'Not yet balanced: original natural campaigns can accumulate salary arrears without sustained war; full grain stores do not resolve local gold shortages.',
 opening,runs,liquidityProbe,warCostRanges:war.costRanges.filter(r=>[3,6].includes(r.teams)),
 scope:{natural:'Three original, current-source all-AI scenarios, 120 days each, ordinary fog and incidents. No injected stocks, people or wars; deterministic continuations checked by the runner. One seed per scenario cannot establish prevalence or optimal player performance.',
 opening:'Actual original roster, payroll and recurring income. Ordinary work allowance is shared physical capacity, not guaranteed output; traits may raise it and real staffing, failures and timing may lower production. This margin excludes trade, spending, construction and logistics.',
 expense:'Domestic upfront start charges are diagnostic categories, not a full treasury reconciliation. Delayed construction can repeat the same cost in several outcomes, so those result.spent fields are not summed as new debits. Salaries are separate. Formation, equipment, diplomacy, transports, captures and refunds can also change gold.',
 late:'Level-10 salaries hold the opening roster fixed. They are an illustrative wage projection, not a natural late-game campaign. Civil political stats and work traits do not scale with officer level, while salaries do. Infrastructure and territory can still increase revenue.',
 warfare:war.scope.loss+' '+war.scope.warPrices},
 recommendations:['Make emergency grain sales feasible without spendable upfront gold, using net settlement of the real sale cost and real grain.',
 'Account for pending work against shared cash capacity; assign spare commerce personnel to useful trade or construction rather than duplicate zero-yield fairs.',
 'Prioritize the cash-producing development needed to cover the actual roster salary before optional spending, while retaining genuine food and defense needs.',
 'Calibrate salary progression against attainable city income and realistic large rosters; an extra opening grant alone cannot repair a recurring deficit.',
 'Retest high-roster small territories and actual sustained campaigns before changing grain production or claiming late-game sustainability.']};
await writeFile(`${out}/review.json`,JSON.stringify(result,null,2));
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),num=n=>n.toLocaleString('zh-CN');
const table=(headers,rows)=>`<div class="scroll"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const focus=runs.flatMap(r=>r.factions.filter(f=>f.final.arrears>0).map(f=>({run:r,faction:f})));
const naturalRows=focus.map(({run:r,faction:f})=>[r.metrics.scenarioName,f.name,`${f.initial.cities} → ${f.final.cities}`,`${f.initial.officers} → ${f.final.officers}`,num(f.final.gold),num(f.final.recurringGold),num(f.final.salary),num(f.final.arrears)]);
const openingRows=opening.flatMap(s=>s.factions.filter(f=>f.ordinaryCapacityMargin<0).map(f=>[s.name,f.name,f.cities,f.officers,num(f.gold),num(f.recurringGold),num(f.ordinaryGoldWorkAllowance),num(f.salary),num(f.ordinaryCapacityMargin)]));
const observedRows=runs.map(r=>[r.metrics.scenarioName,r.metrics.seed,r.metrics.completedDay-1,r.metrics.newDepartures,r.metrics.settledBattles,r.metrics.captures,r.metrics.cityHungerDays+r.metrics.armyHungerDays,r.factions.filter(f=>f.final.arrears>0).length,r.metrics.deterministicCheckpoints]);
const links=runs.map(r=>`<li>${esc(r.metrics.scenarioName)}：<a href="../../${r.directory}/campaign-audit.json">原始审计</a> · <a href="../../${r.directory}/campaign-save.json">结束存档</a>，${r.sourceFiles}项游戏输入指纹与当前一致。</li>`).join('');
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>当前经济审查</title>
<style>body{margin:0;background:#f4f1ea;color:#243330;font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1120px;margin:auto;padding:36px 24px}h1{font-size:30px;line-height:1.3}h2{margin-top:36px;font-size:22px}.lead{font-size:19px;padding:18px 22px;background:#fff;border-left:5px solid #b26535}.scroll{overflow-x:auto}table{border-collapse:collapse;background:#fff;width:100%;font-size:14px}th,td{padding:11px 14px;border-bottom:1px solid #ddd;text-align:left;white-space:nowrap}th{background:#dfe8e2}a{color:#21634e}.muted{color:#596963;font-size:14px}li{margin:8px 0}code{background:#e5e8e0;padding:2px 5px}</style><main>
<h1>当前经济：开局有余量，持续收支仍失衡</h1><p class="muted">2026-10-11 · 当前完整规则 · 3个原始全AI剧本，各运行120天</p>
<p class="lead">还不能判为合理。人多城少的势力会出现持续欠俸；已经满仓的粮食不能可靠地转成救急资金。官渡样本能正常发薪，但不能据此推断所有剧本都可持续。</p>
<h2>自然运行中已经出现的欠俸</h2><p>以下为第121天现存城市合计；周期收入和应付工资均按每旬10天计算。资金按城市独立结算，势力有余额也不代表欠俸城能够直接使用。</p>
${table(['剧本','势力','城市','在仕人数','城仓金','周期收入/旬','工资/旬','欠俸'],naturalRows)}
<p>赤壁样本没有实际战斗，刘备仍欠俸，说明工资缺口不能只归因于战损。群雄集结有2场实际战斗，其占城、伤亡和开支均保留在原始记录中；这些样本不代表连续多线战争。</p>
<h2>两个可复现的卡点</h2><ol><li><strong>卖粮救急被前置费用挡住。</strong>群雄集结的江陵有${num(city.grain)}粮，容量${num(grainCapacity(city))}，但金为0、欠俸${num(city.payroll.arrears)}。真实候选查询只留下免费集市；仅在查询中忽略资金过滤后，才出现“出售1200粮、先付30金”。没有执行任何虚构销售。</li>
<li><strong>多个商业官员重复争用同一城市额度。</strong>第120天，糜竺、马良、孙乾的集市均显示成功，实际收入却为300、0、0。当前选择器没有把已经在办的集市产量充分计入剩余额度，闲置人力未转向出售余粮或其他有效工作。</li></ol>
<p>江陵第51—121天欠俸从430增至${num(city.payroll.arrears)}。结束时市场仅1级、农田3级，粮仓已满；发展没有先解决实际现金缺口。等级升高还会增加工资，但政治属性与命令特性不会随等级同比提高，后期需要单独校准。</p>
<h2>开局持续收入与工资的压力</h2><p>下表筛出“周期收入＋普通商业办理额度”仍低于工资的势力。办理额度是假设完全用满的容量，不是承诺收入；特性可以有界提高额度，贸易可以补缺口，工作失败、费用及缺人会降低净收益。它用于定位风险，不用于宣布某势力必然破产。</p>
${table(['剧本','势力','城市','在仕人数','开局金','周期金/旬','普通办理额度','工资/旬','额度口径余量'],openingRows)}
<h2>战争成本与后期用途</h2><p>已有部队出征不重交编制费。以每队3000人计算：3队新编需2250—4500金及9000预备兵，30—60天耗粮2700—5400；6队相应为4500—9000金、18000预备兵及5400—10800粮。永久损失10%—30%的假设下，3队补兵需225—1350金，6队450—2700金，另消耗相应兵源；这是假设费用范围，不是真实战损概率。人员工资在和平时期也应付，不能全部算成额外战争费。</p>
<p>钱有工资、扩建、研究、征补和装备等持续用途；粮在行军、守军、长途供给和断粮压力下有用。目前自然样本均无断粮，部分粮仓满仓，但实际战争很少，因此尚不能证明粮食在高压及后期都已平衡，也不宜直接降低产粮。</p>
<h2>建议调整顺序</h2><ol><li>让真实余粮能够换成救急资金，交易手续费从成交金里扣除，保留实际粮食与交易成本。</li><li>商业选择计入在办产量与城市共享额度，让多余官员转做有收益的贸易或发展。</li><li>根据实际工资缺口优先发展现金收入，控制可选开支，同时保住真实农业和防守需求。</li><li>再校准等级工资曲线、可达城市收入和大名册负担；增加开局库存只能延后持续亏损。</li><li>用人多城少的剧本与持续实际战争重新验收，分别检验和平净结余、战时库存消耗和后期工资。</li></ol>
<h2>验证范围与证据</h2>${table(['剧本','种子','运行天数','出征','实际战斗','占城','断粮日','结束欠俸势力','续行检查'],observedRows)}
<p>均使用原始人员与库存、普通迷雾、内政意外和共同玩家/AI经济规则，没有注资、指定战争、强制战果或替AI裁员。每个剧本仅一个种子，能证明存在失败，不能证明失败率、最佳玩家策略或无限期承载。本次没有调整经济参数。</p>
<ul>${links}<li><a href="review.json">完整汇总JSON</a>：包含各势力库存、每城工资、欠俸过程、内政开始时的扣款分类、零收入商业次数及只读候选对照。工程延期可能重复报告同笔费用，只统计实际开始扣款。内政分类不是完整金流对账；外交、编制、装备、运输、占城和退款另有影响。</li></ul></main></html>`;
await writeFile(`${out}/review.html`,html);
console.log(JSON.stringify({report:`${out}/review.html`,runs:runs.map(r=>({scenario:r.metrics.scenarioName,days:r.metrics.completedDay-1,battles:r.metrics.settledBattles,arrears:r.factions.filter(f=>f.final.arrears>0).map(f=>({name:f.name,amount:f.final.arrears}))})),liquidityProbe},null,2));
