import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {RULES_VERSION} from '../combat-rules.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const root=resolve(args.root||'work/ai-long-fixes-20261010'),out=resolve(args.out||join(root,'integrated-guandu')),longOut=join(root,'travel-verified-guandu');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const [result,config,save,tests]=await Promise.all([
 json(join(out,'unification-result.json')),json(join(out,'run-config.json')),json(join(out,'campaign-save.json')),
 json(join(root,'integrated-decision-tests/unit-tests.json'))]);
const [long,longConfig]=await Promise.all([json(join(longOut,'unification-result.json')),json(join(longOut,'run-config.json'))]);
assert.equal(result.rulesVersion,RULES_VERSION);assert.equal(result.sourceHash,config.sourceHash);
assert.equal(long.sourceHash,longConfig.sourceHash);
const registryChanges=[];
for(const [file,hash]of Object.entries(config.sourceHashes)){
 assert.equal(createHash('sha256').update(await readFile(join(config.source,file))).digest('hex'),hash,'Frozen source changed: '+file);
 const current=createHash('sha256').update(await readFile(join(process.cwd(),file))).digest('hex');
 // This module is imported only by the test runner, never by game execution.
 if(file==='ai-decision-tests.mjs'&&current!==hash)registryChanges.push(file);else assert.equal(current,hash,'Game execution no longer matches the natural run: '+file);
}
for(const [file,hash]of Object.entries(longConfig.sourceHashes))assert.equal(createHash('sha256').update(await readFile(join(longConfig.source,file))).digest('hex'),hash,'Long-run source changed: '+file);
assert.equal(tests.failed.length,0);assert.equal(tests.missing.length,0);assert.equal(tests.skipped.length,0);
const totals=async name=>{const log=await readFile(join(root,name),'utf8'),get=k=>Number(log.match(new RegExp('ℹ '+k+' (\\d+)'))?.[1]);const t={tests:get('tests'),pass:get('pass'),fail:get('fail')};assert.ok(t.tests>0&&t.pass===t.tests&&t.fail===0);return t;};
const [strategic,shared,design]=await Promise.all(['travel-strategic-tests.log','shared-regressions.log','design-tests.log'].map(totals));
const currentDocument=await readFile(resolve('docs/AI互战行为与决策审计.md'),'utf8');
const victorySection=currentDocument.match(/## 当前统一目标与执行[\s\S]*?(?=\n## )/)?.[0]||'';
const uiPassed=(await readFile(join(root,'diplomacy-ui-final.log'),'utf8')).includes('PASS diplomacy');assert.ok(uiPassed,'Diplomacy UI did not pass');
const successors=new Map();
for(const p of save.campaign.diplomacy.contracts.filter(p=>p.status==='signed'&&!p.failure))for(const c of p.clauses.filter(c=>c.renews&&['waiting','active'].includes(c.status))){const key=[c.renews,c.kind,c.from,c.to].join(':');const ids=successors.get(key)||new Set();ids.add(p.id);successors.set(key,ids);}
const duplicateRenewals=[...successors].filter(([,ids])=>ids.size>1).map(([key,ids])=>({key,contracts:[...ids]}));assert.equal(duplicateRenewals.length,0);
const stocks=save.cities.filter(c=>c.manpower>30000).map(c=>({id:c.id,name:c.name,manpower:c.manpower}));
const recentAdmission=Object.entries(result.recentAdmission).sort((a,b)=>b[1]-a[1]).slice(0,8);
const evidence={rulesVersion:RULES_VERSION,sourceHash:config.sourceHash,sourceFiles:Object.keys(config.sourceHashes).length,sourceUnchanged:true,testRegistryOnlyChanges:registryChanges,natural:result.status,day:result.completedDay,elapsedGameDays:result.elapsedGameDays,seconds:result.seconds,long:{rulesVersion:long.rulesVersion,sourceHash:long.sourceHash,day:long.completedDay,elapsedGameDays:long.elapsedGameDays,seconds:long.seconds,status:long.status,captures:long.captures,newArmies:long.newArmies,settledBattles:long.settledBattles,cityHungerDays:long.cityHungerDays,armyHungerDays:long.armyHungerDays},duplicateRenewals,returnedReserveOverflow:stocks,tests:{ai:tests.passed,diplomacyUI:uiPassed,repairSnapshot118:{strategic,shared,design}},recentAdmission};
await writeFile(join(root,'repair-verification.json'),JSON.stringify(evidence,null,2));
const names={neutral:'中立',cao:'曹操',yuan:'袁绍','force-7':'刘表',sunce:'孙策'};
const territory=Object.entries(result.territory).map(([f,n])=>`${names[f]||f}${n}`).join('、');
const text=`# AI 互战修复与当前验收

核对日期：2026-10-10。当前规则${RULES_VERSION}、战略存档${save.campaign.version}、AI结构${save.campaign.ai.version}、战略目标结构${Object.values(save.campaign.ai.factions)[0].strategy.version}。以下区分机制修复、冻结长局与当前合并版本的短期复核，不把回归通过视为必然统一。

${victorySection}

## 已修复的机制

| 问题 | 当前处理 | 共同规则与实际边界 |
| --- | --- | --- |
| 退兵后库存被旬末压回上限，收获记录出现负入库量 | 30000限制新增生产，真实返兵超额存量保留；满额时不新增 | 不删除真实士兵、不生成额外资源，恢复生产须先依法消耗存量 |
| 把整城驻军与远距离道路邻城当成近期进攻 | 潜在出征保留至少一半驻军，并核对十日内真实可达性；反攻也核对到达时间 | 来袭军团完整计入；己方已实际驻城军团补足守备，在途与盟约不能提前补足 |
| 必须携带全程口粮，忽略真实可持续粮道 | 分段检查己方粮仓、口粮预留、既有外军、仓库与道路吞吐量 | 不计敌仓、未来收入或待发运输；营地只是供给端点；生效与每日继续实际校验 |
| 开发目标不能组织具体备战 | 检查32组目标、最多保留8项可准备候选；跨路口按整条实际路线比较远近；守备缺口生成真实调任，前线可提前依法购置器械 | 保留来源守备、经济负责人及太守；已有在途与等待命令避免重复派人，到达后下一旬重评 |
| 同一条约重复续约与付款 | 生成报价及共同签署前均检查同一原条款的已签后继 | 等待或生效后继阻止重复；正常后续续约仍可执行；不新增兵源的外交不因返兵超额而被拒绝 |
| 每日多次扫描整个历史记录 | 按事实来源、势力与日期建立追加索引，保留实时对象引用，查询列表返回副本 | 不存档缓存、不改随机或结果；读档重建；索引不截断历史。路线缓存仅在一次同步评审中复用 |

实际军团仍按共用出征、队数、行军、补给与战斗规则执行。每十日完整战略评审一次，旬内推进已有任务并复核安全；没有按停战天数强迫宣战、加钱粮、赋予战力倍率或指定胜方。

同势力城市救援、野外战场增援、粮路护卫、多城集结及外交援军继续使用现有真实任务与共同处理器。建立救援意向不等于军团已经抵达，本轮不把总战斗数当作所有军团协作场景都已覆盖的证明。

## 冻结修复版的长局与当前版本复核

机制修复期间，规则${long.rulesVersion}的冻结快照以普通官渡、种子${long.seed}从第1天完成${long.elapsedGameDays}个自然游戏日，终点第${long.completedDay}天，耗时${long.seconds}秒，${long.captures}次易主、${long.newArmies}支新军团、${long.settledBattles}场已结算战斗。全部存档往返与实际读档续行检查通过，没有城市或军团缺粮记录，越过原第900天的收获记录故障点；窗口内未统一。该快照位于 \`source-travel-final/\`，结果位于 \`travel-verified-guandu/\`。

此后工作区同时接入另一项任务的最终获胜目标、区域收益及合法宣战评估，并补齐跨路口排序。上述长局未包含这些后续改动，不能作为当前规则${RULES_VERSION}已完成长局或统一的证据。以下是当前游戏执行源码匹配的独立种子短期复核；冻结快照自身所有指纹保持一致，测试清单文件的后续登记变化单独记录。

普通官渡风云、种子${result.seed}，从第${result.startDay}天开始四势力全AI、普通迷雾及正常内政意外。原始统一条件仍是全部${result.cities}座城市归属同一非中立势力。每${config.checkpointDays}日核对存档往返，达到180日时另核对内存与读档后的实际续行；${evidence.sourceFiles}个冻结程序与设计文件指纹在运行及报告生成时一致，当前游戏执行源与该快照匹配。

| 项目 | 当前实测 |
| --- | --- |
| 终点 | 第${result.completedDay}天，实际推进${result.elapsedGameDays}日 |
| 本机无界面耗时 | ${Math.round(result.seconds)}秒，约${(result.seconds/60).toFixed(1)}分钟；不代表界面播放时间 |
| 全国统一 | ${result.status==='unified'?`已统一，胜方${result.winnerName}`:'窗口内未统一，不能给出有效统一用时'} |
| 城池 | ${territory} |
| 实际军事变化 | ${result.captures}次易主、${result.newArmies}支新军团、${result.settledBattles}场已结算战斗 |
| 最近军事进展 | 易主第${result.lastCaptureDay}天、战斗第${result.lastBattleDay}天、新军团第${result.lastDepartureDay}天 |
| 当前连续无上述军事变化 | ${result.completedDay-Math.max(result.lastCaptureDay,result.lastBattleDay,result.lastDepartureDay)}天；窗口内最长${result.maxQuietDays}天 |
| 缺粮观察 | 城市${result.cityHungerDays}个日样本、军团${result.armyHungerDays}个日样本 |
| 存档 | ${result.checkpoints.filter(c=>c.roundTrip).length}次往返及${result.checkpoints.filter(c=>c.liveContinuation).length}次实际续行一致 |
| 已签续约重复 | 终点仍等待或生效的同原条款后继${duplicateRenewals.length}组重复 |

新增军团包括集结、支援等真实实例，易主包含空城抵达占领；这些数量分别报告。当前复核的源代码与完整存档在 \`work/ai-long-fixes-20261010/source-integrated/\` 和 \`work/ai-long-fixes-20261010/integrated-guandu/\`。终点准入分布保存在 \`repair-verification.json\`，不能把未枚举的机会解释为已经检查。

## 回归与边界

当前合并版本AI决策${tests.decisionDomains}类、${tests.passed}项通过，无失败、缺项或跳过。机制修复的规则118快照另通过战略规划${strategic.pass}项、资源外交与记录${shared.pass}项、设计${design.pass}项；该记录不冒充当前119专项结果。各命令存在重复覆盖，不将其相加为独立测试总数。新增9项针对性用例覆盖真实返兵与续存、事实索引、续约与旧案签署、超额存量外交、远城及来袭守备、实际持续供给、真实守备调运、器械准备和跨路口候选排序。

当前外交桌面与手机界面通过真实任命、方案只读、奏报核阅、明确批准、实际签署和存档校验，未发现浏览器错误。该检查使用明确有资金且缺粮的受控夹具，关闭首次指引以检查外交流程；自然模拟使用原始开局，没有注入这些测试资源。

历史查询索引原型另有70个逐日完整状态一致对照，长局10日样本93.34秒降至21.24秒；这是索引局部性能证据，不能当作本轮整体运行速度或统一时间。自然长局耗时也受实际出兵、战斗和机器负载影响。

本轮补齐了真实守备调运与器械准备，尚未形成完整的替代内政人手、编制、训练与作战顺序搜索。冻结长局仍存在长期军事停滞；当前新目标版本的短期结果不能证明该问题已彻底解决。战损、攻城与目标收益仍使用启发式，未以独立大规模战斗样本校准；不能保证每个剧本或种子最终统一。人才劝说仍有单独的观察边界问题，详见 [AI架构与决策评价方法](AI架构与决策评价方法.md)。每旬完整评审、共同执行和固定军略条件继续保持。

## 复现

冻结修复版长局：\`node scripts/audit-ai-unification.mjs --source=work/ai-long-fixes-20261010/source-travel-final --scenario=guandu-200 --seed=20261010 --days=1080 --out=work/ai-long-fixes-20261010/replay-long\`。

当前合并版短期：\`node scripts/audit-ai-unification.mjs --source=work/ai-long-fixes-20261010/source-integrated --scenario=guandu-200 --seed=20261011 --days=120 --checkpoint=30 --out=work/ai-long-fixes-20261010/replay-current\`。

机制检查：\`npm run test:ai-decisions\`、\`npm run test:strategic-planning\`、\`node --test tests/ai-long-campaign-fixes.test.mjs\`。报告入口 \`node scripts/report-ai-long-fixes.mjs\` 会核对当前程序与自然运行的源码指纹，拒绝把旧源码结果写成当前验收。
`;
await writeFile(resolve('docs/AI互战行为与决策审计.md'),text);
console.log(JSON.stringify(evidence));
