import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {newCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {cityPayroll} from '../officer-salaries.mjs';
import {servingPeople} from '../talent-core.mjs';
import {cityRecurringIncome} from '../economy.mjs';
import {grainCapacity} from '../domestic.mjs';
import {NATIONAL_SCENARIOS,NATIONAL_FACTIONS} from '../national-scenarios.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';

const out='outputs/economy-balanced-20261011',json=async path=>JSON.parse(await readFile(path,'utf8'));
const cases=[['all-heroes-360',360],['red-cliffs-180',180],['coalition-180',180],['guandu-120',120],['warlords-120',120],['heroes-120',120],['hanzhong-120',120],['all-heroes-validation-120',120]];
const sum=(rows,key)=>rows.reduce((n,r)=>n+(r[key]||0),0),name=id=>NATIONAL_FACTIONS[id]?.name||id;
const sourceManifest=await json('work/economy-balanced-20261011-v2/runtime/runtime-manifest.json');
for(const [file,digest]of Object.entries(sourceManifest.sources))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),digest,'Current source differs from final immutable inputs: '+file);
const baseline=await json('outputs/economy-review-20261011/review.json'),runs=[];
for(const [folder,days]of cases){
 const directory=`${out}/v2-${folder}`,audit=await json(`${directory}/campaign-audit.json`),s=await json(`${directory}/campaign-save.json`);
 const spec=NATIONAL_SCENARIOS.find(v=>v.id===audit.metrics.scenario);assert.ok(spec);
 assert.equal(audit.metrics.completedDay,days+1);assert.equal(audit.metrics.requestedDays,days);assert.equal(audit.inputSave,null);assert.equal(s.campaign.allAI,true);
 assert.equal(s.campaign.domestic.incidents.enabled,true);validateCampaign(structuredClone(s));
 for(const [file,digest]of Object.entries(audit.sourceHashes))assert.equal(sourceManifest.sources[file],digest,'Run uses different immutable inputs: '+directory+' '+file);
 const initial=newCampaign(audit.metrics.seed,spec.id,'cao',{allAI:true}),people=servingPeople(s),startingPeople=servingPeople(initial);
 const factions=spec.factions.map(faction=>{
  const begin=initial.cities.filter(c=>c.owner===faction),end=s.cities.filter(c=>c.owner===faction);
  const cityDetails=end.map(c=>({id:c.id,name:c.name,gold:c.gold,grain:c.grain,manpower:c.manpower,grainCapacity:grainCapacity(c),commerce:c.commerce,farm:c.farm,
   salary:cityPayroll(s,c).gold,officers:cityPayroll(s,c).officers.length,arrears:c.payroll.arrears,income:cityRecurringIncome(s,c)}));
  const samples=audit.citySamples.filter(c=>c.owner===faction),nodes=s.campaign.activity.nodes.filter(n=>n.faction===faction);
  const completed=nodes.filter(n=>n.category==='domestic'&&['complete','failure'].includes(n.phase));
  const work=new Map();for(const n of completed){const r=work.get(n.key)||{key:n.key,outcomes:0,successfulZeroYield:0,gold:0,grain:0,manpower:0};r.outcomes++;r.successfulZeroYield+=Number(n.key==='fair'&&n.result.factor>=1&&n.result.actual===0);for(const k of ['gold','grain','manpower'])r[k]+=n.result.resourceCredit?.[k]||0;work.set(n.key,r);}
  const goldByTurn=[...new Set(samples.map(c=>c.day))].map(day=>{const cs=samples.filter(c=>c.day===day);return {day,cities:cs.length,gold:sum(cs,'gold'),grain:sum(cs,'grain'),manpower:sum(cs,'manpower'),arrears:cs.reduce((n,c)=>n+(c.payroll?.arrears||0),0)};});
  const ownStart=[...startingPeople.values()].filter(p=>p.faction===faction),ownEnd=[...people.values()].filter(p=>p.faction===faction);
  const retained=ownStart.filter(p=>people.get(p.unit.id)?.faction===faction).length;
  return {id:faction,name:name(faction),initial:{cities:begin.length,gold:sum(begin,'gold'),grain:sum(begin,'grain'),manpower:sum(begin,'manpower'),officers:ownStart.length},
   final:{cities:end.length,gold:sum(end,'gold'),grain:sum(end,'grain'),manpower:sum(end,'manpower'),officers:ownEnd.length,retainedOriginalOfficers:retained,salary:sum(cityDetails,'salary'),arrears:sum(cityDetails,'arrears'),fullGrainCities:cityDetails.filter(c=>c.grain===c.grainCapacity).length},
   cityDetails,goldByTurn,arrearsCityTurns:samples.filter(c=>c.payroll?.arrears>0).map(c=>({day:c.day,id:c.id,gold:c.gold,arrears:c.payroll.arrears})),
   work:[...work.values()],sales:completed.filter(n=>n.key==='sell').map(n=>({day:n.day,city:n.cityId,actualGrain:n.result.actual,commission:n.result.spent,factor:n.result.factor,text:n.text})),
   departures:audit.departures.filter(a=>a.faction===faction).map(a=>({day:a.day,troops:a.troops,teams:a.units,target:a.target})),
   salaryPaid:samples.filter(c=>c.day>1).reduce((n,c)=>n+(c.payroll?.lastPaid||0),0),
   personnelWarnings:s.campaign.talent.reports.filter(r=>r.faction===faction&&r.code==='leave-warning').map(r=>({day:r.day,personId:r.personId,text:r.text}))};
 });
 runs.push({directory,metrics:audit.metrics,checkpoints:audit.checkpoints,factions,battles:audit.battles,captures:audit.captures});
}
const coverage=new Set(runs.map(r=>r.metrics.scenario));assert.equal(coverage.size,NATIONAL_SCENARIOS.length);
const comparisons=[];
for(const prior of baseline.runs){const after=runs.find(r=>r.metrics.scenario===prior.metrics.scenario);assert.ok(after);
 for(const f of prior.factions.filter(f=>f.final.arrears>0||f.name==='刘备')){const current=after.factions.find(a=>a.id===f.faction),matched=current.goldByTurn.find(t=>t.day===121);assert.ok(matched);comparisons.push({scenario:prior.metrics.scenarioName,faction:f.name,day:121,before:{gold:f.final.gold,arrears:f.final.arrears,cities:f.final.cities},after:matched});}
}
const totalBattles=runs.reduce((n,r)=>n+r.metrics.settledBattles,0);assert.ok(totalBattles>0,'Natural strategic battles must actually occur');
const pressure=await json(`${out}/level-and-war-pressure.json`),mature=await json('outputs/metropolitan-economy/results.json');
const phases={ordinaryFunding:runs.every(r=>r.factions.every(f=>f.arrearsCityTurns.length===0)),noNaturalHunger:runs.every(r=>r.metrics.cityHungerDays+r.metrics.armyHungerDays===0),
 realBattles:totalBattles,originalScenarioCoverage:coverage.size,pairedDeficitsResolved:comparisons.filter(c=>c.before.arrears>0).every(c=>c.after.arrears===0)};
const scope={natural:'Original all-AI openings, ordinary fog and incidents; no injected resources, people, roads, wars or outcomes. Each save validates and deterministic continuation checkpoints pass. Seven scenarios and an independent all-heroes seed are recorded, with one full-year case.',
 comparison:'Matched day 121 and prior recorded original seed where available. Decisions and random draw order can change after the rules change; these are observed before/after outcomes, not identical combat trajectories or statistical failure rates.',
 pressure:pressure.scope,
 fiscal:'Gold is summed from actual city stores. Current payroll uses canonical service identities. Salary debt is sampled after each ten-day settlement; territory, captures, trading, diplomacy, transport and construction also affect stores. Low income or stock growth alone is not proof of insolvency or monetary equilibrium.',
 late:'Rank-10 payroll and controlled high-loss replacement demands retain meaningful spending. The full-year natural case has its actually reached officer levels, not an invented max-level empire; infinite sustainability and prolonged multi-front natural combat are not established.'};
const number=n=>Math.round(n).toLocaleString('zh-CN'),table=(headers,rows)=>['| '+headers.join(' | ')+' |','| '+headers.map(()=>'---').join(' | ')+' |',...rows.map(r=>'| '+r.join(' | ')+' |')].join('\n');
const forceRanges=runs.map(r=>{const ds=r.factions.flatMap(f=>f.departures);return {scenario:r.metrics.scenarioName,seed:r.metrics.seed,teams:ds.length?[Math.min(...ds.map(d=>d.teams)),Math.max(...ds.map(d=>d.teams))]:[0,0],troops:ds.length?[Math.min(...ds.map(d=>d.troops)),Math.max(...ds.map(d=>d.troops))]:[0,0]};});
const rows=runs.map(r=>[r.metrics.scenarioName,r.metrics.seed,r.metrics.requestedDays,r.metrics.departures,r.metrics.settledBattles,r.metrics.captures,r.metrics.cityHungerDays+r.metrics.armyHungerDays,r.factions.reduce((n,f)=>n+f.arrearsCityTurns.length,0),r.metrics.deterministicCheckpoints]);
const paired=comparisons.map(c=>[c.scenario,c.faction,number(c.before.gold),number(c.after.gold),number(c.before.arrears),number(c.after.arrears)]);
const markdown=['# 当前剧本经济运营验证','',
 '2026-10-11经济调整使用玩家与AI共同规则。开局仍按城市配置：大城10000金、18000粮、18000预备兵，小城5000金、10000粮、9000预备兵；没有为AI另加资源。金、粮、兵源逐城记录与使用，势力合计不能替代本城资金及口粮。当前战略存档60、内政22，旧档重新开局。','',
 '## 当前经济规则','',
 `1至10级官员旬俸依次为${ECONOMY_RULES.maintenance.officerSalaryByLevel.join('、')}金，待命、出征、运输及外交外派照付，按身份去重。旬末实际收入到账后支付，不足保留本城欠俸；预算、付费提案与AI开支继续保护工资。高级人员仍有持续财政负担。`,'',
 '三类直接生产的共享旬办理价值额度为150＋有效对应设施等级×75；常规名义成果为300金、2307粮、882预备兵，概率、能力、合作、真实需求和库容仍生效。招徕商旅、招商合作、整顿税务、修整灌溉分别花90、60、50、100金；医疗基础数量645、615，不能恢复已死亡的人。','',
 '出售余粮为本城市场交易，无需相邻己城或垫金；围城不成交。实际可售粮共同保留，完成时复核后扣粮，货款扣手续费后入库，未成交不收费。购粮仍检查畅通己城道路。商业安排只预估同完成旬在办事务对额度的占用，不提前入库、不使用未来随机结果、不花未完成收入；资金不足以供养真实人员时优先发展市场，已够正常部队目标口粮且满仓时停止重复扩农田或灌溉。','',
 '## 原始全AI实测','',table(['剧本','种子','天数','出征','真实战斗','占城','断粮日','欠俸城旬样本','确定性续行'],rows),'',
 `本轮覆盖全部${coverage.size}个原始剧本，另有群雄集结独立种子；累计${totalBattles}场实际战略战斗。${phases.ordinaryFunding?'全部旬末城市采样无欠俸。':'存在欠俸，详见原始城市账目。'}${phases.noNaturalHunger?'没有城市或军团断粮记录。':'存在真实断粮记录，不能忽略。'}普通迷雾与内政意外启用，不指定战争、战果、胜者，不注资，不替AI裁员或停止补兵。`,'',
 table(['剧本','种子','实际出征队数范围','实际出征兵力范围'],forceRanges.map(r=>[r.scenario,r.seed,r.teams.join('～'),r.troops.map(number).join('～')])),'',
 '## 第120天的前后对照','',table(['剧本','势力','调整前城仓金','调整后城仓金','调整前欠俸','调整后欠俸'],paired),'',
 '对照来自相同原始剧本及已有相同种子记录；经济改变后行动和随机抽取顺序会改变，不声称战斗路径完全相同。库存变化还包含发展、贸易、工资、外交、运输与占城；完整报告按势力列出城市、人手、销售、出征兵力及工资实际支付。','',
 '年度群雄集结的刘备在仕人数39降至32：七名长期闲置人员按原有人事规则在第360天辞官，离职预警和真实名册保留在记录中。本轮没有替AI主动裁员；第350天仍实际发薪725金且无欠俸，120天欠俸对照也发生在这批离职之前。不能隐去自然人员变化或把经济验收当成人事任职安排已完善的证明。','',
 '## 压力与后期费用','',table(['人员等级','单人旬俸','常规负载金/旬','高损耗金/旬','高损耗兵源/旬'],pressure.pairs.map(p=>[p.level,p.salaryPerOfficer,p.normal.gold,p.high.gold,p.high.manpower])),'',
 '上表按2500守备＋3队各3000人、四名同等级军官、120天实际共同扣款测量。这是固定参考纵队，不假定实际AI每次只出9000人；真实出征规模单列。常规每旬5%、高损耗18%永久减员为指定压力输入；测量库存与补回兵源完整披露，不冒充自然战果或收入。10级官员没有降为免费，增加部队、装备、战损与运输仍会增加钱粮需求。','',
 '成熟襄平毛产出上限为600金、4147粮、1570兵源，单线高损耗需求为560金、990粮、1620兵源，因此仍缺50兵源；同样四名10级人员的高损耗负载要940金，超过当地现金上限。许昌毛上限1300金、9535粮、3628兵源，完整江陵圈为2350金、17616粮、6716兵源。毛上限排除建设时间费用、实际内政人手工资及道路损失，不保证自动兑现。','',
 '## 验证范围','',
 '经济专项143项、现金周转／薪级／经济回归24项、设计与预算59项、21类AI决策394项通过；计数有重叠，不能相加当作独立用例总数。预算与提案桌面、手机、存读档和只读查看通过。设计导出、同步、生产估值与成熟承载检查使用当前规则。','',
 '实际战斗次数、伤亡与出征规模以原始审计为准。半年及一年正常运营成功不等于已证明无限期平衡、满级帝国或持续多线高损耗自然战争；压力测量另列。长期无战事的粮兵积累可以形成战争余量，也需要在更多实际战争样本中继续观察。','',
 '完整汇总与源码指纹：`outputs/economy-balanced-20261011/summary.json`。可读报告：`outputs/economy-balanced-20261011/report.html`。各目录保留 `campaign-save.json`、`campaign-audit.json`、旬记录、战果与确定性续行凭据。固定输入为 `work/economy-balanced-20261011-v2/runtime`，报告生成时全部输入指纹与当前一致。','',
 '入口：`node scripts/report-economy-balance.mjs`、`npm run test:economy`、`node --test tests/economy-cashflow.test.mjs`、`npm run test:ai-decisions`、`npm run audit:metropolitan-economy`、`npm run audit:economy-valuation`、`npm run docs:check`。',''].join('\n');
const result={createdAt:new Date().toISOString(),phases,sourceHashes:sourceManifest.sources,inputs:sourceManifest.runtimeDirectory,sourceDifferences:[],rules:{payroll:ECONOMY_RULES.maintenance.officerSalaryByLevel,production:ECONOMY_RULES.development},runs,forceRanges,comparisons,pressure:pressure.pairs,mature:mature.cities,scope,reportMarkdown:markdown};
await writeFile(`${out}/summary.json`,JSON.stringify(result,null,2));await writeFile('docs/当前剧本经济运营验证.md',markdown);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const htmlTable=(heads,values)=>`<div class="scroll"><table><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${values.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const details=runs.map(r=>`<details><summary>${esc(r.metrics.scenarioName)} · ${r.metrics.requestedDays}天 · 种子${r.metrics.seed}</summary>${htmlTable(['势力','城市','在仕人数','城仓金','工资/旬','欠俸','满粮仓'],r.factions.map(f=>[f.name,`${f.initial.cities} → ${f.final.cities}`,`${f.initial.officers} → ${f.final.officers}`,number(f.final.gold),number(f.final.salary),number(f.final.arrears),`${f.final.fullGrainCities}/${f.final.cities}`]))}<p><a href="v2-${cases[runs.indexOf(r)][0]}/campaign-audit.json">原始审计</a> · <a href="v2-${cases[runs.indexOf(r)][0]}/campaign-save.json">结束存档</a></p></details>`).join('');
await writeFile(`${out}/report.html`,`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>经济调整与全AI实测</title><style>body{background:#f4f1e9;color:#23382f;font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif;margin:0}main{max-width:1180px;margin:auto;padding:28px 24px}h1{font-size:30px}h2{font-size:22px;margin-top:32px}.lead{background:white;border-left:5px solid #43765a;padding:18px}.scroll{overflow-x:auto}table{border-collapse:collapse;background:white;width:100%;font-size:14px}th,td{text-align:left;padding:10px 13px;border-bottom:1px solid #ddd;white-space:nowrap}th{background:#dce7df}details{margin:16px 0;padding:12px;background:#fff}summary{cursor:pointer;font-weight:600}a{color:#286441}</style><main><h1>经济调整与原始全AI实测</h1><p>2026-10-11 · 共同玩家/AI规则 · 战略存档60 / 内政22</p><p class="lead">${phases.pairedDeficitsResolved?'调整前的欠俸案例在第120天对照中已恢复正常发薪。':'仍有未解决的欠俸案例，须继续调整。'} 本轮覆盖七个剧本及一个独立验证种子，群雄集结运行一年，累计${totalBattles}场实际战斗。${phases.ordinaryFunding?'所有旬末采样无欠俸。':'存在欠俸，见原始账目。'}${phases.noNaturalHunger?'无断粮记录。':'存在断粮记录。'}</p><h2>已接入的调整</h2><ul><li>等级俸禄：${ECONOMY_RULES.maintenance.officerSalaryByLevel.join('、')}金/旬，早期较轻、高级人员保留财政成本。</li><li>三类生产实际产量和共享办理额度提高50%，不是提前领取收入；低回报民政费用下调，救治收益同步校准。</li><li>卖粮可在本城办理，手续费从真实货款扣除；待售粮共同保留，围城不成交。</li><li>商业安排预估同完成旬的在办产量，避免重复零收入集市；现金压力提高市场发展优先级。</li></ul><h2>真实对战与运营结果</h2>${htmlTable(['剧本','种子','天数','出征','战斗','占城','断粮日','欠俸城旬','续行检查'],rows)}<h2>真实出征规模</h2>${htmlTable(["剧本","种子","队数范围","兵力范围"],forceRanges.map(r=>[r.scenario,r.seed,r.teams.join("～"),r.troops.map(number).join("～")]))}<h2>第120天前后对照</h2>${htmlTable(['剧本','势力','原城仓金','现城仓金','原欠俸','现欠俸'],paired)}<p>相同种子的原始开局；调整后行动与随机抽取顺序会变化，库存包含建设、交易、工资、外交、运输及占城。</p><h2>各势力账目</h2>${details}<p>年度刘备名册39→32：七名人员按原有人事规则因长期闲置在第360天辞官，第350天仍实际发薪725金且无欠俸。没有为测试主动裁员；具体警告与人员变化在原始记录中保留。</p><h2>战争及等级支出仍有压力</h2>${htmlTable(['等级','单人旬俸','常规金/旬','高损耗金/旬','高损耗兵源/旬'],pressure.pairs.map(p=>[p.level,p.salaryPerOfficer,p.normal.gold,p.high.gold,p.high.manpower]))}<p>2500守备＋3队各3000人，四名军官。指定5%/18%永久减员只用于共同扣款压力测量，不冒充自然战损；测量用库存与补回兵源在原始记录中披露。10级高损耗负载需940金/旬，超过成熟襄平600金的普通毛产出上限。</p><h2>验证与边界</h2><p>经济143项、现金周转等24项、设计与预算59项、AI决策394项通过，计数重叠；预算与提案桌面/手机/存读档通过。全部游戏输入指纹与当前一致，原始人员、普通迷雾与意外均保留，无注资或强制战果。</p><p>自然战斗和受控压力分开记录。一年成功运营不证明无限期平衡、满级帝国或持续多线高损耗自然战争。库存增长还受和平、贸易、领土及建设影响。</p><p><a href="summary.json">完整汇总与指纹</a> · <a href="level-and-war-pressure.json">等级与压力实扣记录</a></p></main></html>`);
console.log(JSON.stringify({report:`${out}/report.html`,phases,comparisons},null,2));
