import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {newCampaign,validateCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {cityPayroll} from '../officer-salaries.mjs';
import {servingPeople} from '../talent-core.mjs';
import {cityRecurringIncome} from '../economy.mjs';
import {NATIONAL_SCENARIOS,NATIONAL_FACTIONS} from '../national-scenarios.mjs';

const out='outputs/economy-sustainability-20261011',old='outputs/talent-economy-20261011';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const originalManifest=await json('work/talent-economy-20261011/runtime/runtime-manifest.json');
const manifest=await json('work/economy-sustainability-20261011-fixed/runtime/runtime-manifest.json');
const changed=Object.keys(manifest.sources).filter(file=>manifest.sources[file]!==originalManifest.sources[file]);assert.deepEqual(changed,['talent-lifecycle.mjs']);
const oldLifecycle=(await readFile(`${originalManifest.runtimeDirectory}/talent-lifecycle.mjs`,'utf8')).replaceAll('\r\n','\n');
const currentLifecycle=(await readFile('talent-lifecycle.mjs','utf8')).replaceAll('\r\n','\n');
const cleanup=' // A former employee cannot retain a staffing promise after leaving service.\n // Release it in this transition so a same-day year-end save remains valid.\n if(s.campaign.ai)s.campaign.ai.staffing=s.campaign.ai.staffing.filter(p=>p.officerId!==o.unit.id);\n';
assert.equal(currentLifecycle.replace(cleanup,''),oldLifecycle,'Only the proved former-employee staffing cleanup may differ');
for(const [file,digest]of Object.entries(manifest.sources))assert.equal(hash(await readFile(file)),digest,'Current runtime differs: '+file);
const pressure=await json(`${out}/operating-pressure.json`),logistics=await json(`${out}/logistics-pressure.json`);
assert.deepEqual(pressure.sourceHashes,manifest.sources);
assert.equal(pressure.auditScriptSha256,hash(await readFile('scripts/audit-economy-sustainability.mjs')),'Controlled audit script changed');
const cases=[['all-heroes-fixed-annual','all-heroes-120'],['red-cliffs-annual','red-cliffs-120'],['coalition-annual','coalition-60'],['guandu-annual','guandu-60'],['warlords-annual','warlords-60'],['heroes-annual','heroes-60'],['hanzhong-annual','hanzhong-60'],['all-heroes-validation-annual','all-heroes-validation-120']];
const sum=(rows,key)=>rows.reduce((n,r)=>n+(r[key]||0),0),number=n=>Math.round(n).toLocaleString('zh-CN');
const unique=(rows,key)=>[...new Map(rows.map(r=>[key(r),r])).values()];
const runs=[];
for(const [folder,previous]of cases){
 const dir=`${out}/${folder}`,prior=await json(`${old}/${previous}/campaign-audit.json`),audit=await json(`${dir}/campaign-audit.json`),saved=await readFile(`${dir}/campaign-save.json`,'utf8');
 const s=validateCampaign(JSON.parse(saved));assert.equal(serializeCampaign(s),saved);
 assert.equal(audit.metrics.completedDay,361);assert.equal(prior.inputSave,null);assert.equal(audit.inputSave.sha256,hash(await readFile(`${old}/${previous}/campaign-save.json`)));
 assert.equal(audit.inputSave.day,prior.metrics.completedDay);assert.equal(audit.metrics.startDay,prior.metrics.completedDay);
 assert.equal(audit.metrics.seed,prior.metrics.seed);assert.equal(s.campaign.allAI,true);assert.equal(s.campaign.domestic.incidents.enabled,true);
 for(const source of [prior,audit]){const expected=source.sourceHashes['talent-lifecycle.mjs']===manifest.sources['talent-lifecycle.mjs']?manifest:originalManifest;for(const [file,digest]of Object.entries(source.sourceHashes))assert.equal(expected.sources[file],digest,folder+' '+file);}
 const spec=NATIONAL_SCENARIOS.find(r=>r.id===audit.metrics.scenario),initial=newCampaign(audit.metrics.seed,spec.id,'cao',{allAI:true});
 const citySamples=unique([...prior.citySamples,...audit.citySamples],r=>r.day+':'+r.id),initialPeople=[...servingPeople(initial).values()],people=[...servingPeople(s).values()];
 const factions=spec.factions.map(id=>{
  const start=initial.cities.filter(c=>c.owner===id),cities=s.cities.filter(c=>c.owner===id),original=initialPeople.filter(o=>o.faction===id),staff=people.filter(o=>o.faction===id),income=cities.map(c=>cityRecurringIncome(s,c));
  const own=citySamples.filter(c=>c.owner===id),days=[...new Set(own.map(c=>c.day))].sort((a,b)=>a-b);
  const timeline=days.map(day=>{const rows=own.filter(c=>c.day===day);return {day,cities:rows.length,gold:sum(rows,'gold'),grain:sum(rows,'grain'),manpower:sum(rows,'manpower'),salaryDue:rows.reduce((n,c)=>n+c.payroll.lastDue,0),salaryPaid:rows.reduce((n,c)=>n+c.payroll.lastPaid,0),arrears:rows.reduce((n,c)=>n+c.payroll.arrears,0),troops:rows.flatMap(c=>c.units).reduce((n,u)=>n+u.troops,0)};});
  const tail=timeline.filter(r=>r.day>=271),thin=own.filter(c=>c.day>=271&&c.payroll.lastDue>0&&c.gold<c.payroll.lastDue*2);
  return {id,name:NATIONAL_FACTIONS[id]?.name||id,initial:{cities:start.length,gold:sum(start,'gold'),officers:original.length},final:{cities:cities.length,gold:sum(cities,'gold'),grain:sum(cities,'grain'),manpower:sum(cities,'manpower'),officers:staff.length,retainedOriginalOfficers:staff.filter(o=>original.some(v=>v.unit.id===o.unit.id)).length,salary:sum(cities.map(c=>cityPayroll(s,c)),'gold'),recurringGold:sum(income,'gold'),arrears:cities.reduce((n,c)=>n+c.payroll.arrears,0)},unretainedOriginalOfficers:original.filter(o=>!staff.some(v=>v.unit.id===o.unit.id)).map(o=>({id:o.unit.id,name:o.unit.name,currentStatus:s.campaign.domestic.people.find(p=>p.id===o.unit.id)?.status})),salaryPaid:timeline.filter(r=>r.day>1).reduce((n,r)=>n+r.salaryPaid,0),peakPaidSalary:Math.max(...timeline.map(r=>r.salaryPaid)),salaryBeforeYearEnd:timeline.find(r=>r.day===351)?.salaryPaid??null,lastQuarter:{minGold:tail.length?Math.min(...tail.map(r=>r.gold)):null,goldChange:tail.length?tail.at(-1).gold-tail[0].gold:null,thinCityTurns:thin.map(c=>({day:c.day,city:c.id,gold:c.gold,paidSalary:c.payroll.lastDue}))},arrearsCityTurns:own.filter(c=>c.payroll.arrears>0),timeline};
 });
 const departures=unique([...prior.departures,...audit.departures],r=>r.id),battles=unique([...prior.battles,...audit.battles],r=>r.id),captures=unique([...prior.captures,...audit.captures],r=>JSON.stringify(r)),checkpoints=unique([...prior.checkpoints,...audit.checkpoints],r=>r.day);
 assert.equal(checkpoints.length,12);assert.ok(checkpoints.every(r=>r.deterministic));
 runs.push({directory:dir,scenario:spec.id,name:spec.name,seed:audit.metrics.seed,days:360,completedDay:361,runSourceHashes:audit.sourceHashes,afterCleanup:audit.sourceHashes['talent-lifecycle.mjs']===manifest.sources['talent-lifecycle.mjs'],departures:departures.length,battles:battles.length,captures:captures.length,cityHungerDays:prior.metrics.cityHungerDays+audit.metrics.cityHungerDays,armyHungerDays:prior.metrics.armyHungerDays+audit.metrics.armyHungerDays,checkpoints,factions,continuation:{input:audit.inputSave,originalDirectory:`${old}/${previous}`}});
}
assert.equal(new Set(runs.map(r=>r.scenario)).size,NATIONAL_SCENARIOS.length);
const originalFailure=await json(`${out}/all-heroes-annual/failed-save.json`),fixedYear=await json(`${out}/all-heroes-fixed-annual/campaign-save.json`);
assert.deepEqual(originalFailure.campaign.ai.staffing.map(p=>p.officerId),['person-356']);
originalFailure.campaign.ai.staffing=fixedYear.campaign.ai.staffing;
assert.equal(serializeCampaign(originalFailure),serializeCampaign(fixedYear),'Actual full-year rerun may differ only by the released former-employee promise');
for(const profile of new Set(pressure.runs.map(r=>r.profile)))for(const seed of new Set(pressure.runs.map(r=>r.seed))){
 const pair=pressure.runs.filter(r=>r.profile===profile&&r.seed===seed);assert.equal(pair.length,2);assert.deepEqual(pair[0].atStart,pair[1].atStart,'Paired pressure branches must have identical funded warmup');assert.equal(pair[0].warmStateSha256,pair[1].warmStateSha256,'Full warmup save and RNG must match');
}
const normal=pressure.runs.filter(r=>r.lossPerTurn===.05),high=pressure.runs.filter(r=>r.lossPerTurn===.18),lateHigh=high.filter(r=>r.initialLevel===10);
assert.equal(pressure.runs.length,24);assert.ok(normal.every(r=>r.assembled&&!r.firstShortfall&&!r.firstArrears&&!r.hungerDays&&r.tail.goldChange>0&&r.final.troops===r.targetTroops));
assert.ok(lateHigh.every(r=>r.assembled&&r.firstShortfall&&r.final.troops<r.targetTroops&&r.meanPerTurn.stockGoldChange<0));
assert.ok(pressure.runs.every(r=>!r.firstArrears));
const previousPressure=await json(`${out}/operating-pressure-before-cleanup.json`),previousLogistics=await json(`${out}/logistics-pressure-before-cleanup.json`);
assert.deepEqual(pressure.runs,previousPressure.runs,'The staffing cleanup must not change controlled economic observations');assert.deepEqual(logistics.logistics,previousLogistics.logistics);
assert.equal(logistics.logistics[0].firstHunger,null);assert.ok(logistics.logistics[1].firstHunger>0);
assert.ok(logistics.logistics.every(r=>r.samples.every(s=>s.armies.reduce((n,a)=>n+a.in,0)<=r.roadDailyCap)));
const stats=rows=>({min:Math.min(...rows),max:Math.max(...rows)}),range=rows=>{const r=stats(rows);return number(r.min)+(r.min===r.max?'':'—'+number(r.max));};
const profiles=[...new Set(pressure.runs.map(r=>r.profile))].map(id=>{
 const rows=pressure.runs.filter(r=>r.profile===id),a=rows.filter(r=>r.lossPerTurn===.05),b=rows.filter(r=>r.lossPerTurn===.18);
 return {id,name:rows[0].name,roster:rows[0].fullRoster,initialLevel:rows[0].initialLevel,targetTroops:rows[0].targetTroops,facilities:rows[0].facilities,normal:{cashChangePerTurn:stats(a.map(r=>r.meanPerTurn.stockGoldChange)),endingGold:stats(a.map(r=>r.final.gold)),allFullStrength:a.every(r=>r.final.troops===r.targetTroops)},high:{cashChangePerTurn:stats(b.map(r=>r.meanPerTurn.stockGoldChange)),firstShortfall:b.map(r=>r.firstShortfall),endingTroops:stats(b.map(r=>r.final.troops)),endingGold:stats(b.map(r=>r.final.gold))}};
});
const phases={originalScenarioCoverage:new Set(runs.map(r=>r.scenario)).size,naturalRuns:runs.length,days:sum(runs,'days'),realBattles:sum(runs,'battles'),departures:sum(runs,'departures'),captures:sum(runs,'captures'),deterministicCheckpoints:runs.reduce((n,r)=>n+r.checkpoints.length,0),ordinaryFunding:runs.every(r=>r.factions.every(f=>!f.arrearsCityTurns.length)),noNaturalHunger:runs.every(r=>!r.cityHungerDays&&!r.armyHungerDays),controlledCases:pressure.runs.length,normalControlledFullStrength:true,highRankPressureShortfalls:true,roadPressure:true};
const findings={normal:'成熟设施和匹配驻兵规模的受控正常方案均连续盈余，实际补满兵力、完整发薪。原始自然年度另列，不能以受控成熟设施代替原始开局。',pressure:'高等级及大规模持续损耗会消耗资金并出现真实补兵缺口；俸禄优先，零欠薪不表示维持了满编战力。',grain:'成熟后方城市粮仓经常满仓；实际前线压力主要出现在通路、道路容量和围城中。三军团共享道路出现有仓粮但送不到的实际缺粮。',limitations:'本轮自然战斗仍偏少，不能证明长期高强度自然AI战争的平衡。发展初期和前线单城的资金缓冲须区别于全势力府库。闲置辞官、俘虏等自然人员变化如实报告，不用减少名册证明满员运营；固定完整名册的满级压力试验另列。未证明所有城市能够供养任意规模的满级人员和军队。'};
const table=(h,rows)=>['| '+h.join(' | ')+' |','| '+h.map(()=>'---').join(' | ')+' |',...rows.map(r=>'| '+r.join(' | ')+' |')].join('\n');
const naturalRows=runs.map(r=>[r.name,r.seed,r.days,r.departures,r.battles,r.captures,r.cityHungerDays+r.armyHungerDays,r.factions.reduce((n,f)=>n+f.arrearsCityTurns.length,0)]);
const pressureRows=profiles.map(p=>{const rows=pressure.runs.filter(r=>r.profile===p.id),a=rows.filter(r=>r.lossPerTurn===.05),b=rows.filter(r=>r.lossPerTurn===.18);return [p.name,p.initialLevel,p.roster,number(p.targetTroops),range(a.map(r=>r.meanPerTurn.stockGoldChange)),range(b.map(r=>r.meanPerTurn.stockGoldChange)),b.every(r=>r.firstShortfall)?range(b.map(r=>r.firstShortfall-60))+'天':'180天内未出现',range(b.map(r=>r.final.troops))];});
const focused=runs.flatMap(r=>r.factions.filter(f=>['曹操','刘备','袁术','张鲁'].includes(f.name)).map(f=>[r.name,r.seed,f.name,f.initial.officers+'→'+f.final.officers,number(f.final.gold),number(f.final.salary),number(f.final.recurringGold),number(f.lastQuarter.minGold??0),f.final.retainedOriginalOfficers+'/'+f.initial.officers]));
const changes=runs.flatMap(r=>r.factions.filter(f=>f.unretainedOriginalOfficers.length).map(f=>[r.name,r.seed,f.name,f.initial.officers,f.final.officers,f.unretainedOriginalOfficers.map(o=>o.name+'（'+o.currentStatus+'）').join('、'),number(f.salaryBeforeYearEnd??0),number(f.salaryPaid)]));
const markdown=['# 当前剧本经济运营验证','',
 `当前规则的八组原始全AI开局已运行完整360天，覆盖${phases.originalScenarioCoverage}个剧本，共${phases.days}个模拟日。结论：正常运营与高压力之间已能形成差距，仍不能宣布长期自然战争平衡全部通过。`,'',
 '## 原始全AI年度','',table(['剧本','种子','天数','真实出征','真实战斗','占城','断粮日','欠俸城旬'],naturalRows),'',
 '第一次群雄集结种子20261013在第360天辞官后残留祖茂的调任承诺，导致年末存档校验失败，原始失败保存及堆栈保留在 all-heroes-annual。已在转为在野的共同入口同步解除本人的承诺；不改变钱粮、成果或其他人计划，新回归验证年末保存合法。该组从本轮120天合法存档以修复后运行时重新完成年度；其余七组来自修复前完全相同的经济参数，最终保存另由当前代码严格验证。不是把失败保存改写为成功，也不是八组全部按修复后代码重新模拟。两份快照只允许这一处离职清理差异，报告生成器逐字核对；24组经济及粮道测量按修复后快照重跑，数值与清理前逐项一致。','',
 `普通迷雾、内政意外启用；不注资、不改人员或道路、不指定战争或战果。从前一轮当前规则原始保存精确续行，链路保存SHA-256核对。共${phases.deterministicCheckpoints}次保存后继续一天的确定性对照，最终保存往返一致、库存整数且非负。${phases.ordinaryFunding?'全部旬末城市采样无欠俸。':'存在欠俸。'}${phases.noNaturalHunger?'自然年度无城市或军团断粮记录。':'存在自然断粮。'}`,'',
 '## 正常与持续损耗：受控实际运营','',
 '成熟设施为明确的受控初始条件，建设费用及工期不在本表。10000金、18000粮、18000预备兵开局；四名民政官员（太守、两商业、一农业），另按实际列出的守备及前线官员完整发薪。60天实际付费编制、办事与工资后，连续180天测量；后续不发资源、不裁人、不免费补兵。正常／压力对照使用相同种子和完全一致的60天筹建末状态。真实共用完成结算、日常口粮、旬俸、编制与补兵入口；全部库存变化逐项对账。','',
 '正常每旬指定损失前线名义兵力5%，压力18%，是受控消耗输入，不是AI自然战果。按实际可负担资源补兵，未补满会真实降低战力；表内金净变化已经包含工资、补兵、付费经营与实际贸易收入，粮满仓损失也按实际结算。','',
 table(['城市条件','初始等级','完整官员数','现役目标','正常金净增/旬','压力金净增/旬','压力首次补兵缺口（测量期）','压力结束现役'],pressureRows),'',
 '全部12个正常方案持续满编、最后60天金继续净增，无欠俸和断粮。满级富城两万现役、满级都市圈37500现役的六个压力样本全部出现补兵缺口，不能用其后来更低的补兵开支宣称满编可持续。一级至十级仍按真实等级支付，正常办事允许真实升降级，不强制重置。','',
 '## 粮道容量与粮食用途','',
 '粮道受控测量先实际付费运行150天，55,000现役目标实际形成54,208人；没有为达到目标免费补足。把这些已编人员中的实际部队分成一或三军团，部署到现有道路的固定位置以隔离补给吞吐；携粮从仓库实际扣除。后方继续真实生产和发薪，不模拟行军或战果。','',
 table(['军团','实际前线兵力','共用道路日容量','第一次前线缺粮','120天末后方仓粮'],logistics.logistics.map(r=>[r.columns,number(r.actualFrontTroops),r.roadDailyCap,r.firstHunger===null?'120天内没有':'第'+r.firstHunger+'天',number(r.samples.at(-1).warehouse)])),'',
 '该粮道每军团的请求仍共用360粮/日。三路前线实际日口粮超过500，带粮只能缓冲，仓满也不能无限送粮。此处实际缺粮来自共用每日补给执行；自然对局没有人为布置断粮。成熟后方农业总体偏宽裕，不能把道路缺粮写成全国粮食总产不足。','',
 '## 完整名册、旬俸与资金余量','',table(['剧本','种子','势力','人员初始→年末','年末仓金','当前旬俸','经常金/旬','末季最低仓金','原班人员保留'],focused),'',
 '经常金尚未扣工资、建设、科研、征补及外交，也未计直接办事和卖粮。府库合计不能替代单城预算；薄资金城市定义为末季旬末金不足本城两旬已应付俸禄，仅衡量工资缓冲，不能代替完整军费承载。','',
 '自然人员变化单列：','',table(['剧本','种子','势力','原人数','年末人数','原班未留人员及当前状态','第350天实发俸禄','年度采样实付俸禄'],changes.length?changes:[['—','—','—','—','—','没有原班人员流失','—','—']]),'',
 '## 人才价值与验收边界','',
 '当前政治80／90、满级、一级设施的普通直接生产，在32个真实成败种子中额外价值仍高于100金旬俸；农业和兵源按军事需求参考折价，不是可消费金。180天商业个人测量排除全部城市基础及开局资金后仍有净贡献。个人成果与太守增产原始样本保留在 outputs/talent-economy-20261011/talent-value.json，当前根模块输入指纹与本次年度完全相同。','',
 ...Object.values(findings).map(x=>x+'\n'),
 '原始年度保存及审计、受控逐旬账目、名册工资、粮道逐日供给保存于 outputs/economy-sustainability-20261011。报告由 scripts/report-economy-sustainability.mjs 生成；改动任何当前运行时输入后必须重跑，旧结果不能继续当作当前验收。'].join('\n');
const result={createdAt:new Date().toISOString(),sourceHashes:manifest.sources,originalRuntimeHashes:originalManifest.sources,cleanup:{file:'talent-lifecycle.mjs',before:originalManifest.sources['talent-lifecycle.mjs'],after:manifest.sources['talent-lifecycle.mjs'],economyObservationsUnchanged:true,fullYearRerunOnlyReleasedOnePromise:true,failedRun:'all-heroes-annual',rerun:'all-heroes-fixed-annual'},phases,runs,profiles,findings,scope:pressure.scope,reportMarkdown:markdown};
await writeFile(`${out}/summary.json`,JSON.stringify(result,null,2));await writeFile('docs/当前剧本经济运营验证.md',markdown+'\n');
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const ht=(h,rows)=>'<div class="scroll"><table><thead><tr>'+h.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
await writeFile(`${out}/report.html`,`<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>经济年度与持续压力验证</title><style>body{margin:0;background:#f5f3ed;color:#253a37;font:16px/1.7 system-ui,sans-serif}main{max-width:1160px;margin:auto;padding:32px 20px}h1{font-size:30px}h2{font-size:23px;margin-top:34px}.scroll{overflow:auto;border:1px solid #ddd;border-radius:8px;background:white}table{border-collapse:collapse;white-space:nowrap;width:100%}th,td{padding:10px 14px;text-align:right;border-bottom:1px solid #eee}th{background:#e4eee8}td:first-child,th:first-child{text-align:left}.finding{background:#e4eee8;padding:16px;border-radius:8px}a{color:#276a55}details{padding:10px;background:white;margin:10px 0}@media(max-width:600px){main{padding:18px 12px}h1{font-size:25px}th,td{padding:8px}}</style><main><h1>经济年度与持续压力验证</h1><p class="finding">正常运营与高压力之间已能形成差距。八组自然AI年度无欠俸、无断粮；持续高损耗能消耗满级城市积蓄，粮道容量会限制前线。但自然战斗样本仍少，尚不能宣布长期战争平衡全部通过。</p><h2>原始全AI年度：${phases.days}天 · ${phases.realBattles}场战斗</h2>${ht(['剧本','种子','天数','出征','战斗','占城','断粮日','欠俸城旬'],naturalRows)}<p>年末发现并修复了辞官后的调任承诺残留。失败组从原始120天合法存档重新模拟；其余七组是清理修复前的同一经济参数，最终保存由当前代码严格复核。两份运行时只允许这一处清理差异；24组经济与粮道测量已按修复后代码重跑，逐项数值相同。</p><p>七剧本，普通迷雾与意外开启。原始保存精确续行，无资源、人员、道路或战果注入。${phases.deterministicCheckpoints}次确定性续行。</p><h2>满员发薪、实际付费补兵的180天对照</h2><p>成熟设施为受控初始条件，开局10000金／18000粮／18000预备兵，先真实付费筹建60天，再测180天；后续无资助。每旬5%与18%为指定永久损耗，和AI战果分开。</p>${ht(['城市','初始等级','全体官员','现役目标','正常金净增/旬','高损耗金净增/旬','首次补兵缺口','压力结束现役'],pressureRows)}<p>正常12例全部持续满编并有财政结余。满级高损耗六例均无法持续补满；工资照付，实际战力下降。粮食入库、卖粮、任务费用与产出均按真实完成结算。</p><h2>仓库有粮，前线也可能缺粮</h2>${ht(['军团','真实前线兵力','道路粮/日','第一次前线缺粮','末日后方仓粮'],logistics.logistics.map(r=>[r.columns,number(r.actualFrontTroops),r.roadDailyCap,r.firstHunger===null?'120天内没有':'第'+r.firstHunger+'天',number(r.samples.at(-1).warehouse)]))}<p>先实际筹建150天，再把已形成部队部署到现有道路固定位置测补给；实际携粮从仓库扣除。三军团日需求超过500粮，共用道路只能送360。没有模拟行军或战斗结果。</p><h2>资金差距与真实工资</h2>${ht(['剧本','种子','势力','人员初始→当前','仓金','旬俸','经常金/旬','末季最低金','原班保留'],focused)}<p>经常金未扣工资与军费，也未计直接办理或卖粮；全势力库存不代表每城资金都宽裕。自然辞官及俘虏等人员变化在下方完整名册中记录，满级受控测试保持完整发薪。</p><h2>验证边界</h2>${Object.values(findings).map(x=>'<p>'+esc(x)+'</p>').join('')}<h2>完整势力凭据</h2>${runs.map(r=>'<details><summary>'+esc(r.name)+' · '+r.seed+'</summary>'+ht(['势力','城市','仓金','初始人员','当前人员','原班流失','年度实付工资','末季薄资金城旬'],r.factions.map(f=>[f.name,f.final.cities,number(f.final.gold),f.initial.officers,f.final.officers,f.unretainedOriginalOfficers.length,number(f.salaryPaid),f.lastQuarter.thinCityTurns.length]))+'<p><a href="'+r.directory.split('/').at(-1)+'/campaign-audit.json">年度续行审计</a> · <a href="'+r.directory.split('/').at(-1)+'/campaign-save.json">最终保存</a></p></details>').join('')}<p><a href="operating-pressure.json">运营逐旬完整账目</a> · <a href="logistics-pressure.json">粮道逐日记录</a> · <a href="summary.json">年度汇总与输入指纹</a></p></main></html>`);
console.log(JSON.stringify({phases,thin:runs.flatMap(r=>r.factions.filter(f=>f.lastQuarter.thinCityTurns.length).map(f=>({scenario:r.name,name:f.name,count:f.lastQuarter.thinCityTurns.length,gold:f.final.gold}))),changes:changes.length}));
