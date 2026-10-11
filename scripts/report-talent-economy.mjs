import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {newCampaign,validateCampaign,CAMPAIGN} from '../strategic-campaign.mjs';
import {cityPayroll} from '../officer-salaries.mjs';
import {servingPeople} from '../talent-core.mjs';
import {cityRecurringIncome} from '../economy.mjs';
import {NATIONAL_SCENARIOS,NATIONAL_FACTIONS} from '../national-scenarios.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {ACTIONS} from '../domestic.mjs';
const out='outputs/talent-economy-20261011',json=async p=>JSON.parse(await readFile(p,'utf8'));
// Keep the current annual report when regenerating the underlying talent probe.
const annual=await json('outputs/economy-sustainability-20261011/summary.json').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
if(annual){for(const [file,digest]of Object.entries(annual.sourceHashes))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),digest,'Annual report needs current inputs: '+file);await writeFile('docs/当前剧本经济运营验证.md',annual.reportMarkdown+'\n');console.log('Current annual economy report restored.');process.exit(0);}
const cases=[['all-heroes-120',120],['red-cliffs-120',120],['coalition-60',60],['guandu-60',60],['warlords-60',60],['heroes-60',60],['hanzhong-60',60],['all-heroes-validation-120',120]];
const manifest=await json('work/talent-economy-20261011/runtime/runtime-manifest.json'),prior=await json('outputs/economy-balanced-20261011/summary.json'),value=await json(`${out}/talent-value.json`);
for(const [file,digest]of Object.entries(manifest.sources))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),digest,'Current game input differs: '+file);
const sum=(rows,key)=>rows.reduce((n,r)=>n+(r[key]||0),0),name=id=>NATIONAL_FACTIONS[id]?.name||id,runs=[];
for(const [folder,days]of cases){
 const directory=`${out}/${folder}`,audit=await json(`${directory}/campaign-audit.json`),s=validateCampaign(await json(`${directory}/campaign-save.json`)),spec=NATIONAL_SCENARIOS.find(v=>v.id===audit.metrics.scenario);
 assert.ok(spec);assert.equal(audit.metrics.completedDay,days+1);assert.equal(audit.inputSave,null);assert.equal(s.campaign.allAI,true);assert.equal(s.campaign.domestic.incidents.enabled,true);
 for(const [file,digest]of Object.entries(audit.sourceHashes))assert.equal(manifest.sources[file],digest,'Run fingerprint differs: '+directory+' '+file);
 const initial=newCampaign(audit.metrics.seed,spec.id,'cao',{allAI:true}),people=servingPeople(s),initialPeople=servingPeople(initial);
 const factions=spec.factions.map(id=>{
  const cities=s.cities.filter(c=>c.owner===id),start=initial.cities.filter(c=>c.owner===id),staff=[...people.values()].filter(o=>o.faction===id),original=[...initialPeople.values()].filter(o=>o.faction===id);
  const incomes=cities.map(c=>cityRecurringIncome(s,c)),salary=cities.reduce((n,c)=>n+cityPayroll(s,c).gold,0),samples=audit.citySamples.filter(c=>c.owner===id),nodes=s.campaign.activity.nodes.filter(n=>n.faction===id);
  const wages=samples.filter(c=>c.day>1).reduce((n,c)=>n+(c.payroll?.lastPaid||0),0);
  return {id,name:name(id),initial:{cities:start.length,gold:sum(start,'gold'),officers:original.length},final:{cities:cities.length,gold:sum(cities,'gold'),grain:sum(cities,'grain'),manpower:sum(cities,'manpower'),officers:staff.length,retainedOriginalOfficers:staff.filter(o=>original.some(v=>v.unit.id===o.unit.id)).length,incomeGold:sum(incomes,'gold'),salary,afterSalary:sum(incomes,'gold')-salary,arrears:cities.reduce((n,c)=>n+c.payroll.arrears,0)},sampledCitySalaryPaid:wages,
   arrearsCityTurns:samples.filter(c=>c.payroll?.arrears>0).map(c=>({day:c.day,city:c.id,gold:c.gold,arrears:c.payroll.arrears})),
   work:nodes.filter(n=>n.category==='domestic'&&['complete','failure'].includes(n.phase)).map(n=>({day:n.day,officer:n.officerId,key:n.key,result:n.result})),
   personnelWarnings:s.campaign.talent.reports.filter(r=>r.faction===id&&r.kind==='leave-warning')};
 });
 runs.push({directory,metrics:audit.metrics,checkpoints:audit.checkpoints,factions,battles:audit.battles,departures:audit.departures,captures:audit.captures});
}
const coverage=new Set(runs.map(r=>r.metrics.scenario));assert.equal(coverage.size,NATIONAL_SCENARIOS.length);
const comparisons=[];
for(const r of runs){const old=prior.runs.find(p=>p.metrics.scenario===r.metrics.scenario&&p.metrics.seed===r.metrics.seed);if(!old)continue;
 for(const f of r.factions.filter(f=>['曹操','刘备','袁绍'].includes(f.name))){const before=old.factions.find(v=>v.id===f.id)?.goldByTurn.find(t=>t.day===r.metrics.completedDay);if(before)comparisons.push({scenario:r.metrics.scenarioName,seed:r.metrics.seed,days:r.metrics.requestedDays,faction:f.name,before,after:f.final});}
}
const phases={originalScenarioCoverage:coverage.size,days:sum(runs.map(r=>({days:r.metrics.requestedDays})),'days'),realBattles:sum(runs.map(r=>({b:r.metrics.settledBattles})),'b'),ordinaryFunding:runs.every(r=>r.factions.every(f=>!f.arrearsCityTurns.length)),noNaturalHunger:runs.every(r=>!r.metrics.cityHungerDays&&!r.metrics.armyHungerDays)};
const scope='当前输入的原始全AI开局，普通迷雾与内政意外启用，无注资、裁员、改路、指定战争或战果。实际出征、占城、人员变化和工资均按公共规则结算。60—120天只能说明本轮观察期表现，不能证明年度或无限期平衡；零欠俸不代表所有城市所有时刻预算宽裕。个人等能力、满级测量是受控机制验证，和自然剧本分列。';
const number=n=>Math.round(n).toLocaleString('zh-CN'),table=(h,rows)=>['| '+h.join(' | ')+' |','| '+h.map(()=>'---').join(' | ')+' |',...rows.map(r=>'| '+r.join(' | ')+' |')].join('\n');
const rows=runs.map(r=>[r.metrics.scenarioName,r.metrics.seed,r.metrics.requestedDays,r.metrics.departures,r.metrics.settledBattles,r.metrics.captures,r.metrics.cityHungerDays+r.metrics.armyHungerDays,r.factions.reduce((n,f)=>n+f.arrearsCityTurns.length,0)]);
const personal=value.direct.filter(r=>r.ability>=80).map(r=>[r.ability,r.level,ACTIONS[r.key].name,number(r.meanResourceValue),r.salary,number(r.afterSalary)]);
const governors=value.governors.map(r=>[r.ability,number(r.value),r.salary,number(r.afterSalary)]);
const management=value.management.filter(r=>r.ability===90).map(r=>[ACTIONS[r.key].name,number(r.gross),r.cost,r.salary,number(r.afterSalary)]);
const calendars=value.calendars.map(r=>[r.ability,r.seed,r.days,number(r.cityBasePaid),number(r.salaryPaid),number(r.personalAfterSalary)]);
const finance=runs.flatMap(r=>r.factions.filter(f=>['曹操','刘备'].includes(f.name)).map(f=>[r.metrics.scenarioName,r.metrics.seed,f.name,f.final.cities,number(f.final.gold),number(f.final.incomeGold),number(f.final.salary),number(f.final.afterSalary)]));
const paired=comparisons.map(c=>[c.scenario,c.days,c.faction,number(c.before.gold),number(c.after.gold),number(c.before.arrears),number(c.after.arrears)]);
const markdown=['# 当前剧本经济运营验证','',
 `2026-10-11人才经济修正。当前战略存档${CAMPAIGN.version}、内政23，旧档重新开局。玩家与AI共用开局资源、城市产能、提案费用及工资规则。`,'',
 '## 当前修正','',
 '优秀人才在合适岗位、有真实需求和可用产能时，扣除办事费用后的额外资源价值应高于俸禄。太守政治增产为政治÷250；招徕商旅、整顿税务、修整灌溉基础加成为0.35、0.25、0.45，经营建设优惠基础0.3，均按对应单一主属性倍率和实际成败结算。太守必须真实在城；临时加成最高1、建设总折扣最高0.5，三类直接办理仍共享城市旬额度150＋有效对应设施等级×75。','',
 '选事估计有效期内的新增收益，扣除费用，单列占用办理周期的俸禄。不办理预期净亏损的经营；灌溉排除预计溢仓，折扣评估真实尚可建设的同方向设施，须在期限内实际使用才能产生节省。估计只用公开概率和当前实际能力，不读取随机种子或未来结果、不提前发钱。已付费在办事务按原流程结算。','',
 `1至10级旬俸仍为${ECONOMY_RULES.maintenance.officerSalaryByLevel.join('、')}金，待命、出征及外派照付；欠俸保存并补发。农业、军务收益按金1、粮0.13、预备兵0.34的军事需求参考折算，不等于可消费金。科研、人才、军事作用按实际长期效果衡量，未按人数自动发钱。`,'',
 '## 个人价值受控测量','',
 '一级经济设施、足够实际需求，32个独立种子完成真实事务，含失败及部分成果。下表排除城市建设基础收入；工资按满级100金/旬扣除。','',table(['主属性','等级','事务','平均新增价值/旬','俸禄','扣俸后价值'],personal),'',
 '实际驻城太守的额外资源价值，仍按一级设施、入库有余量测量：','',table(['政治','新增价值/旬','俸禄','扣俸后价值'],governors),'',
 '政治90、满级负责人办理一项10天经营的公开预期。增产计未来3次实际结算，届时不继续占用办事人；俸禄只归入该任务实际占用的周期，后续工作另计。优惠须被实际建设使用，不能将未用优惠记作现金收益。','',table(['事务','完整有效期增量','费用','办理周期俸禄','扣费及俸后价值'],management),'',
 '另以一名初始满级商业负责人、一级设施、10000金测量库存、正常集市／商旅／税务选择实际运行180天，按真实等级发薪；未开启工程、贸易或外交，以隔离商业运营。基础收入及开局金均从个人净收益中排除。失败导致真实降级时仍记录原有等级变化，不强制回满级；按全程满级参考工资再扣差额，80及90能力样本仍有正的净贡献。','',table(['政治','种子','天数','已排除城市基础金','实际俸禄','扣费及俸后个人净金'],calendars),'',
 '受控输入不冒充自然AI剧本。原始逐旬工资、成败及成果见 `outputs/talent-economy-20261011/talent-value.json`，回归见 `tests/talent-economy.test.mjs`。','',
 '## 原始全AI复测','',table(['剧本','种子','天数','出征','实际战斗','占城','断粮日','欠俸城旬'],rows),'',
 `八组原始开局覆盖${coverage.size}个剧本，共${phases.days}天、${phases.realBattles}场真实战斗。${phases.ordinaryFunding?'全部旬末城市采样无欠俸。':'存在欠俸，见原始账目。'}${phases.noNaturalHunger?'无城市及军团断粮记录。':'存在断粮，见原始记录。'}`,'',
 '## 势力经济差距','',table(['剧本','种子','势力','城市','城仓金合计','经常金/旬','旬俸','扣俸后经常金'],finance),'',
 '扣俸后经常金尚未扣建设、科研、征补、装备、外交等支出，未计直接办事及卖粮收入。财政差距来自真实领地、设施、任职及经营，库存还受军费、贸易与占城影响，不能只以府库排名判断人才价值。','',
 '## 同种子开局前后观察','',table(['剧本','天数','势力','修正前城仓金','修正后城仓金','修正前欠俸','修正后欠俸'],paired),'',
 '比较同种子、同日数的原始开局；改变收益和选事后，行动及随机抽取顺序会变化，不能当作相同战斗轨迹的统计因果对照。','',
 '## 验证边界','',scope,'',
 '原始保存、审计、出征规模、人员名册、实际工资和确定性续行记录保存于 `outputs/talent-economy-20261011`。当前报告生成器核对全部输入指纹及保存合法性；前一轮年度结果不用于证明本次新参数的年度稳定性。'].join('\n');
const result={createdAt:new Date().toISOString(),phases,sourceHashes:manifest.sources,rules:ECONOMY_RULES,runs,comparisons,value,scope,reportMarkdown:markdown};
await writeFile(`${out}/summary.json`,JSON.stringify(result,null,2));await writeFile('docs/当前剧本经济运营验证.md',markdown+'\n');
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const ht=(h,r)=>'<div class="table"><table><thead><tr>'+h.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+r.map(a=>'<tr>'+a.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
await writeFile(`${out}/report.html`,`<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>人才价值与经济实测</title><style>body{margin:0;background:#f5f3ed;color:#253a37;font:16px/1.65 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:36px 22px}h1{font-size:32px}h2{margin-top:36px;font-size:23px}p{max-width:960px}.table{overflow:auto;background:white;border:1px solid #deddd2;border-radius:8px}table{border-collapse:collapse;width:100%;white-space:nowrap}th,td{text-align:right;padding:10px 14px;border-bottom:1px solid #eee}th{background:#e4eee8}td:first-child,th:first-child{text-align:left}a{color:#276a55}details{background:white;padding:12px;margin:10px 0;border-radius:8px}@media(max-width:600px){main{padding:20px 12px}h1{font-size:26px}th,td{padding:8px}}</style><main><h1>优秀人才应当创造超过俸禄的价值</h1><p>已增强实际太守与经营贡献，并将费用、办理周期俸禄和预计溢仓纳入选事评估。城市产能及等级工资仍有上限。</p><h2>真实完成的个人资源生产</h2><p>一级设施，32个独立种子，含失败与部分成果；排除建设基础。粮与兵源按军事需求参考折合价值。</p>${ht(['能力','等级','事务','新增价值/旬','工资','扣俸后价值'],personal)}<h2>太守增产与经营预期</h2>${ht(['政治','新增价值/旬','工资','扣俸后价值'],governors)}<p>下表是一项10天经营在完整有效期的公开预期；未来增产与优惠不提前到账。优惠必须被真实建设使用。</p>${ht(['事务','有效期增量','费用','办理周期俸禄','扣费及俸后价值'],management)}<h2>180天真实办理与发薪（受控测量）</h2><p>一名负责人、一级设施，按实际成败与等级支付工资，已扣除开局库存、城市基础收入及全部经营费用。</p>${ht(["政治","种子","天数","排除的基础金","实际俸禄","个人净金"],calendars)}<h2>原始全AI复测：${phases.days}天</h2>${ht(['剧本','种子','天数','出征','实际战斗','占城','断粮日','欠俸城旬'],rows)}<p>${esc(scope)}</p><h2>曹操与刘备的实际财政</h2>${ht(['剧本','种子','势力','城市','城仓金','经常金/旬','工资/旬','扣俸后经常金'],finance)}<p>尚未扣除建设、征补、科研与外交，未计办事和卖粮收入。</p><h2>各势力原始凭据</h2>${runs.map(r=>`<details><summary>${esc(r.metrics.scenarioName)} · ${r.metrics.seed} · ${r.metrics.requestedDays}天</summary>${ht(['势力','城市','人员：初始→当前','保留原有人数','城仓金','旬俸','欠俸'],r.factions.map(f=>[f.name,f.final.cities,f.initial.officers+'→'+f.final.officers,f.final.retainedOriginalOfficers,number(f.final.gold),number(f.final.salary),f.final.arrears]))}<p><a href="${r.directory.split('/').at(-1)}/campaign-audit.json">真实审计</a> · <a href="${r.directory.split('/').at(-1)}/campaign-save.json">最终保存</a></p></details>`).join('')}<p><a href="talent-value.json">个人价值原始样本与估计边界</a> · <a href="summary.json">完整汇总与当前输入指纹</a></p></main></html>`);
console.log(JSON.stringify({out,phases,comparisons:comparisons.length}));
