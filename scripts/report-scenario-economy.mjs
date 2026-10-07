import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {posix} from 'node:path';
import {NATIONAL_SCENARIOS} from '../national-scenarios.mjs';

const json=async p=>JSON.parse(await readFile(p,'utf8'));
const base='outputs/scenario-economy',manifest=await json(`${base}/runtime-manifest.json`),runtime=manifest.runtimeDirectory,raw=`${runtime}/outputs/scenario-economy`;
const names=(await readdir(raw)).filter(f=>/-360\.json$/.test(f)),runs=await Promise.all(names.map(f=>json(`${raw}/${f}`)));
const warNames=(await readdir(`${raw}/warfare`)).filter(f=>/-180\.json$/.test(f)),warfare=await Promise.all(warNames.map(f=>json(`${raw}/warfare/${f}`)));
assert.equal(runs.length,NATIONAL_SCENARIOS.length*2,'Both natural-operation cases of every scenario must finish');assert.equal(warfare.length,NATIONAL_SCENARIOS.length);
const sources=new Set();
async function dependencies(file){if(sources.has(file))return;sources.add(file);const code=await readFile(`${runtime}/${file}`,'utf8');for(const m of code.matchAll(/\b(?:from|import)\s*['"]([^'"]+)['"]/g)){if(!m[1].startsWith('.'))continue;const next=posix.normalize(posix.join(posix.dirname(file),m[1]));if(manifest.sources[next])await dependencies(next);}}
await dependencies('scripts/audit-scenario-economy.mjs');await dependencies('scripts/audit-scenario-warfare-economy.mjs');
const changedSources=[],changedSnapshotSources=[];for(const file of sources){const hash=createHash('sha256').update(await readFile(file)).digest('hex');if(hash!==manifest.sources[file])changedSources.push(file);if(createHash('sha256').update(await readFile(`${runtime}/${file}`)).digest('hex')!==manifest.sources[file])changedSnapshotSources.push(file);}
assert.equal(changedSnapshotSources.length,0,'Audited snapshot dependencies must remain unchanged: '+changedSnapshotSources.join(', '));
const rows=runs.flatMap(r=>r.factions.map(f=>{
 const own=r.rows.filter(q=>q.faction===f.faction),blocked=own.filter(q=>q.reserveBlockedCities.length),tail=own.filter(q=>q.day>r.completedDay-90),reserveWarning=f.reasons.includes('超过10%的驻兵城日同时缺兵源且有补兵缺额');
 const resolved=reserveWarning&&!tail.some(q=>q.reserveBlockedCities.length)&&f.final.usableManpower>=1000;
 return {...f,scenario:r.scenario,seed:r.seed,runComplete:r.complete,resolvedDevelopmentShortage:resolved,firstReserveBlockDay:blocked[0]?.day??null,lastReserveBlockDay:blocked.at(-1)?.day??null,tailReserveBlockedCityDays:tail.reduce((n,q)=>n+q.reserveBlockedCities.length,0),operatingReasons:f.reasons.filter(reason=>!(resolved&&reason==='超过10%的驻兵城日同时缺兵源且有补兵缺额'))};
}));
const aiRows=rows.filter(r=>r.controller==='AI'),covered=new Set(aiRows.map(r=>r.scenario+':'+r.faction));
assert.equal(covered.size,NATIONAL_SCENARIOS.reduce((n,s)=>n+s.factions.length,0),'Every actual faction must be observed under AI');
const tally=(xs,key)=>xs.reduce((n,x)=>n+x[key],0),stats=xs=>({min:Math.min(...xs),max:Math.max(...xs)});
const scenarios=NATIONAL_SCENARIOS.map(spec=>{
 const cases=runs.filter(r=>r.scenario===spec.id),factions=rows.filter(r=>r.scenario===spec.id),ai=factions.filter(r=>r.controller==='AI'),war=warfare.find(r=>r.scenario===spec.id);
 const battleEvents=new Set(cases.flatMap(r=>r.events.filter(e=>e.category==='battle').map(e=>e.result.battleId||e.sourceId)));
 return {id:spec.id,name:spec.name,factions:spec.factions.length,cases:cases.map(r=>({seed:r.seed,player:r.player,day:r.completedDay,complete:r.complete,error:r.error,stopped:r.stopped,changedSources:r.changedSources})),factionObservations:factions.length,aiObservations:ai.length,resourceWarnings:factions.filter(r=>r.reasons.length).map(r=>({name:r.name,seed:r.seed,reasons:r.reasons,longestLowGold:r.longestLowGold,severeCityHungerDays:r.severeCityHungerDays,severeArmyHungerDays:r.severeArmyHungerDays})),aiGoldRange:stats(ai.map(r=>r.final.gold)),cityHungerDays:tally(factions,'cityHungerDays'),severeCityHungerDays:tally(factions,'severeCityHungerDays'),armyHungerDays:tally(factions,'armyHungerDays'),lowGoldDays:tally(factions,'lowGoldDays'),naturalDepartures:ai.reduce((n,f)=>n+f.departures.length,0),naturalBattleEvents:battleEvents.size,domesticCompleted:tally(factions,'domesticCompleted'),warfare:{day:war.completedDay,complete:war.complete,error:war.error,departures:war.departures.length,battles:war.playerBattles.length,hungerDays:war.hunger.length,replenishment:war.orders.filter(o=>['replenishment','resident-defender'].includes(o.kind)).reduce((n,o)=>({gold:n.gold+o.paid.gold,manpower:n.manpower+o.paid.manpower,grain:n.grain+o.paid.grain}),{gold:0,manpower:0,grain:0}),initial:war.samples[0],final:war.samples.at(-1)}};
});
const warningRow=r=>({scenario:r.scenario,name:r.name,seed:r.seed,reasons:r.reasons,operatingReasons:r.operatingReasons,resolvedDevelopmentShortage:r.resolvedDevelopmentShortage,firstReserveBlockDay:r.firstReserveBlockDay,lastReserveBlockDay:r.lastReserveBlockDay,tailReserveBlockedCityDays:r.tailReserveBlockedCityDays,finalUsableManpower:r.final.usableManpower});
const result={createdAt:new Date().toISOString(),snapshotAt:manifest.createdAt,sourceDifferencesSinceSnapshot:changedSources,stableRuntimeDependencies:sources.size,naturalRuns:runs.length,warfareRuns:warfare.length,scenarioFactionPairs:covered.size,factionObservations:rows.length,aiObservations:aiRows.length,allRunsComplete:[...runs,...warfare].every(r=>r.complete),allNaturalDaysComplete:runs.every(r=>r.completedDay>=361),warnings:rows.filter(r=>r.reasons.length).map(warningRow),operatingWarnings:rows.filter(r=>r.operatingReasons.length).map(warningRow),resolvedDevelopmentShortages:rows.filter(r=>r.resolvedDevelopmentShortage).map(warningRow),scenarios,scope:'Natural operations use unchanged opening layouts and resources, two seeds and rotated selected rulers. Selected player delegates only domestic vacancies; all other factions use real AI. The supplementary warfare profile legally commands a selected player column and uses actual routes, resources, troop losses and saves. Territory losses and local supply incidents are separate from global warehouse totals. One year is not proof of indefinite monetary equilibrium.',sources:Object.fromEntries([...sources].sort().map(f=>[f,manifest.sources[f]]))};
const economicCore=['economy.mjs','domestic.mjs','metropolitan-areas.mjs','strategic-campaign.mjs','strategic-ai.mjs','faction-affairs.mjs','diplomacy.mjs','diplomacy-relations.mjs','talent-core.mjs','talent-lifecycle.mjs','troop-training.mjs','troop-allocation.mjs','troop-capacity.mjs','support-rules.mjs','building-rules.mjs','city-personnel.mjs','national-scenarios.mjs','strategic-movement.mjs','data/design/economy-rules.mjs','data/design/domestic-actions.mjs','data/design/buildings.mjs','data/design/building-effects.mjs','data/design/metropolitan-areas.mjs','data/design/national-scenarios.mjs','data/design/reference-scenario.mjs','data/design/cities.mjs','data/design/atlas-cities.mjs','data/design/troops.mjs','data/design/roads.mjs','data/design/road-network.mjs','data/design/road-distances.mjs','data/design/diplomacy-rules.mjs','data/design/traits.mjs','work-traits.mjs','passives.mjs'];
result.currentWorkspaceFullyVerified=changedSources.length===0;
result.economicCoreSourceDifferences=changedSources.filter(f=>economicCore.includes(f));
result.snapshotDependenciesUnchanged=changedSnapshotSources.length===0;
result.reportScope=process.argv.includes('--snapshot-only')?'fixed snapshot, with all current workspace differences disclosed':'strict current workspace';
await writeFile(`${base}/summary.json`,JSON.stringify(result,null,2));
const commas=n=>Math.round(n).toLocaleString('en-US');
const incomeParts=await json('outputs/economy-income-parts/scenario-followup.json').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
const lines=['# 当前七剧本经济运营验证','',
 ...(incomeParts?.markdownLines||[]),
 '## 年度与真实出征的已记录输入','',
 `已记录的年度输入使用${runs.length}组360天自然运营和${warfare.length}组180天真实出征，覆盖${covered.size}个剧本／势力组合、${rows.length}组逐势力观测，其中${aiRows.length}组由正式AI管理。种子417选择曹操并委任真实内政，种子1709轮换为另一主要势力；每个势力都至少被正式AI管理一次。真实出征使用独立种子2027。`,
 '',`输入快照：${manifest.createdAt}，${sources.size}个实际依赖文件记录SHA-256；${result.allRunsComplete&&result.allNaturalDaysComplete?'所有自然运营均完成360天，所有补充出征均完成180天，并通过当前版本存读档。':'存在未完成或验证失败的运行，见下表与原始结果，不能宣称全部通过。'}`,
 '',`当前源代码与输入快照${changedSources.length?'仍有差异：'+changedSources.join('、')+'。本报告对应记录的快照，不把这些后续改动算作已经验证。':'无实际依赖文件差异。'}`,
 '', '## 年度输入的结论与边界','',
 result.operatingWarnings.length?`仍有${result.operatingWarnings.length}组运营异常，需按城市、日期和实际路线核对，不能仅用势力总库存判为正常：${result.operatingWarnings.map(r=>r.name+'／'+r.scenario+'／'+r.seed+'：'+r.operatingReasons.join('、')).join('；')}。`:'本轮没有资金低于300连续30天或城内、军团饥饿达到3级的观测，也没有期末仍持续的常规整补兵源警报。现有剧本能够维持日常内政、驻兵供养和真实扣费。',
 '',result.resolvedDevelopmentShortages.length?`发展期存在${result.resolvedDevelopmentShortages.length}组兵源紧张记录：${result.resolvedDevelopmentShortages.map(r=>r.name+'／'+r.scenario+'／'+r.seed+'，第'+r.firstReserveBlockDay+'～'+r.lastReserveBlockDay+'天，期末可用兵源'+commas(r.finalUsableManpower)).join('；')}。它们超过年度诊断阈值，但最后90天均未再出现缺兵源与补兵缺额并存；原始警报保留，不解释为永久无法出兵，也不通过补资源消除发展压力。`:'原始年度记录未触发发展期兵源短缺警报。',
 '', '自然运营的自动战争频率很低。空城占领、军团建立和真实战斗分别计数；没有实际战斗的年度不能当作持续战损供养已达标。因此额外执行真实出征，但一支三队军团的作战结果仍不能替代满规模三线长期作战验收，也不代表玩家必胜。',
 '', '钱粮兵源依旧可能在少战阶段积累，尤其是拥有多座无人驻守城市的势力。此处确认的是现有剧本的运营能力，不宣称无限期库存平衡，也不据此改写金1、粮0.13、储备兵0.34的常规作战参考估值。',
 '', '## 自然运营与实际出征','',
 '| 剧本 | 势力数 | 两组年度验收 | AI期末金范围 | 内政完成数 | AI建立军团数 | 自然战果节点 | 补充出征：军团／战斗 | 补充出征饥饿记录 |',
 '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
 ...scenarios.map(r=>`| ${r.name} | ${r.factions} | ${r.cases.every(c=>c.complete&&c.day>=361)?'完成':r.cases.map(c=>c.complete?'完成':'未通过').join('／')} | ${commas(r.aiGoldRange.min)}～${commas(r.aiGoldRange.max)} | ${commas(r.domesticCompleted)} | ${r.naturalDepartures} | ${r.naturalBattleEvents} | ${r.warfare.departures}／${r.warfare.battles} | ${r.warfare.hungerDays} |`),
 '', '表中内政完成数包含不同实际命令，不等同于新增资源次数；军团建立数包含集结和空城占领，不能冒充持续战争。金为势力唯一府库；粮和储备兵同时记录城仓及在途货物，城仓转为携粮不计为实际消耗。',
 '', '## 城市收入上限与内政产能','',
 '本轮加入城市圈与本地上限：经济设施小城2级、普通大城本地3级、富城本地6级，都市圈单类总量最多12。圈内小城、关卡、港口按类型限制建设，小城原有设施与主城外建共用物理位置容量。道路不通或外部小城归敌时，相应设施不产出；失守设施移交实际小城，不重复结算。',
 '', '直接商业、督耕与未编制兵源按每城每类每旬共享价值额度100＋有效设施等级×50结算，多人、协作与特性不能无限增加本地资源。已用额度保存到当前版本存档；进入下一旬后才恢复，查看和读档不会刷新。自动整补预计实际农业人员的受限产量和真实可动用库存，玩家手动编制仍只花金与兵源。',
 '', '四类成熟城市的产出上限、32独立种子的限额收益及120天受控高低战损对照见[单城资源与经济平衡](单城资源与经济调整-2026-09-22.md)和 outputs/metropolitan-economy/results.json。成熟收入是生产上限，受控战损是压力输入，不冒充本表的实际战斗。常规消耗复测维持金1、粮0.13、储备兵0.34基准。',
 '', `经济核心输入与当前工作区${result.economicCoreSourceDifferences.length?'存在差异：'+result.economicCoreSourceDifferences.join('、')+'。':'一致。'}本轮收入拆分和工程延期的独立诊断、逐日复测范围见前节；全体依赖是否一致仍以上方完整差异为准，同期战斗规则改动不计入年度快照的战果与存档验证。`,
 '', '## 已接入的运营修复','',
 '- 群雄割据、公孙瓒、种子417：修复前北平从第118天开始断粮，第121天达到3.654级饥饿并损兵，农业反复抢收、整理已处理灾情，售粮只留约10天口粮。现在救完的灾情不再重复办理，救灾按剩余可避免损失评分；缺粮时优先无垫资的督耕，扩建与非直接产粮事务须留足本次工期及正常延期的口粮，售粮保留本城20天口粮和已承诺的运输／出征粮。使用玩家与AI共用选事规则，没有加资源或禁止战争。',
 '- 群雄集结、种子417：马腾与张绣出现严重断粮。仅按当时库存委任、外交抽走最后一名农业负责人，会使少量武将优先负责军务、练兵、商业而缺乏持续产粮。现在新空缺先按真实现役、待编人员、武将真实兵力上限与农田旬产出规划农业；产出不足时AI外交保留最后一名可实际办事的农业负责人。已有工作不被自动改任，玩家仍可主动选择外交人选。用人回归覆盖小势力及外交机会。',
 '- 群雄讨董、种子1709：中间一轮天水在第341～361天有11个饥饿城日，第351天达到3.088级。战略整补以4500人为初步目标，但军务内政可继续补到武将真实上限；用4500估算粮需会过早放走农官。农业用人现在预测实际完整补兵目标，包括在城军团及尚待编制的合格人员。该轮失败原始记录保存在 runtime-119，不能被最终复测覆盖。',
 '- 群雄集结、种子417：修复前旧合同累计把同一武将的新货记入旧条款，700粮条款被记录为交付3700，3000粮条款被记录为交付6000，导致存档校验失败。卸货现在校验当前合同、条款、运输用途、资源类型及未交付余额；完成的旧条款不再收货。原三项行为回归在修复前均失败，修复后通过。',
 '', '自动回归与界面检查的当前执行范围见本轮复测章节及 outputs/economy-income-parts-*.txt。贷款行为测试提供明确且足够的测试预算，正式剧本模拟不增加预算。设计导出与同步检查顺序执行。本轮未重跑或宣称全仓库测试通过。',
 '', '## 检查口径与复现','',
 '每天记录实际金、粮、储备兵、现役兵力、伤兵、城市及军团饥饿、任职、在途货物和内政成果；每30天及期末验证存档。异常阈值是诊断入口，不自动当成经济改数的目标。兵源短缺的诊断缺额以战略整补4500及真实上限的较低值判断；军务内政仍可以补至真实上限，农业规划使用完整上限，不以降低兵力掩盖粮需。',
 '', '补充出征每次使用三支真实部队，保留实际守备；需要时按正式编制花费金与储备兵补成1000人守备。筹划时为候选部队依法整补至最多3000人，保留1000金及本城20天口粮；通过正式“完成当前事务后执行”下令，完整行军、补给、战斗和伤亡。不缩短道路、不注入粮兵、不指定胜者，不替AI强制进攻。',
 '', '项目根运行 `node scripts/snapshot-scenario-economy-runtime.mjs` 创建新的独立输入目录，按打印的路径进入该目录后执行下列三组模拟；返回项目根运行 `node scripts/report-scenario-economy.mjs` 汇总。快照目录不会覆盖既有记录；模型改动之后须创建新目录复测。',
 '', '```text','npm run audit:scenario-economy -- --days=360 --seed=417','npm run audit:scenario-economy -- --days=360 --seed=1709 --player=alternate','npm run audit:scenario-warfare -- --days=180 --seed=2027','```',
 '', '行为检查在项目根执行 `node --test tests/scenario-economy-operations.test.mjs tests/metropolitan-economy.test.mjs`。相关测试日志见 `outputs/metropolitan-economy-*.txt`。若同期其它任务继续修改工作区，可用 `node scripts/report-scenario-economy.mjs --snapshot-only` 验证已记录的固定输入；此模式仍检查快照所有实际依赖未变化，并披露全部工作区差异，不宣称后续改动已被年度验收覆盖。',
 '', '完整逐日资源、各势力结果、失败输入与代码指纹见 '+base+'/summary.json、'+base+'/runtime-manifest.json 和 '+raw+'；修复前诊断与原始记录保存在 '+base+'/baseline 和 outputs/scenario-economy-gongsun-*.json。'];
await writeFile('docs/当前剧本经济运营验证.md',lines.join('\n')+'\n');
console.log(JSON.stringify({runs:result.naturalRuns,warfare:result.warfareRuns,factions:result.scenarioFactionPairs,complete:result.allRunsComplete,warnings:result.warnings,sourceDifferences:changedSources},null,2));
if(!result.allRunsComplete||!result.allNaturalDaysComplete||changedSources.length&&!process.argv.includes('--snapshot-only')||result.operatingWarnings.length||scenarios.some(r=>!r.warfare.battles||r.warfare.hungerDays))process.exitCode=1;
