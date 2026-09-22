import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const annual=await read('outputs/talent-audit/results-360-peaceful.json'),combat=await read('outputs/talent-audit/results-11.json'),ui=await read('outputs/talent-ui/result.json');
for(const run of [annual,combat]){assert.equal(run.results.length,6);for(const [path,hash]of Object.entries(run.sources))assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),hash,`audit source changed: ${path}`);}
const full=await readFile('outputs/talent-full-tests.txt','utf8'),focused=await readFile('outputs/talent-tests.txt','utf8');
assert.match(full,/fail 0/);assert.match(focused,/fail 0/);assert.equal(ui.passed,true);assert.deepEqual(ui.errors,[]);
const count=text=>Number(text.match(/tests (\d+)/)?.[1]),number=n=>n===null?'—':Math.round(n),names={'small-map':'小地图','guandu-200':'官渡风云','heroes-251':'英雄集结'};
const rows=annual.results.map(r=>`| ${names[r.scenario]} | ${r.seed} | ${r.newHires} | ${r.resigned} | ${number(r.cost.mean)} | ${number(r.elapsed.mean)} | ${r.reassurance.spent} |`).join('\n');
await writeFile('docs/人才循环实现与验证.md',`# 人才循环实现与验证

日期：2026-09-20。规则以[人才循环实施方案](人才循环实施方案.md)为准。本报告由 scripts/report-talent.mjs 从审计输出生成，并逐一核对审计源文件 SHA-256 与当前工作区一致。

## 已接入

- 意愿W、软性人数需求D、旧主顾虑、合法性硬门槛；W不足不生成付费登用。
- 按人物/势力保存接洽项目、实际累计费用、冷却、进度衰减；换负责人续接；满进度免费复核。
- 同旬统一签约与逐笔重算人数，近似平局使用稳定随机优先级；一人不能归属两方。
- 分期求仕、按势力的位置情报、逐道路迁居；历史剧本年龄和登场日期、英雄集结的无年代约束。
- 全局835条记录去重；其中695条三国人物定义自动参与人才循环，背景角色、空槽、额外古武将及自定义记录不自动进入。
- 失去城市且没有有效军团/未结战役才处理灭国；保留原武将对象、学习记录和关系，事件幂等。
- 到任宽限、按实际日数累计任职/闲置、离职预警与辞官，空军团不能规避。非旬首到任不会造成忠诚重复下降或永不下降。
- 全国敌方自动委任人才负责人，独立府库扣费；玩家不获得敌方探索情报。
- 界面展示参考需求、态度、意愿、接洽进度、旧主顾虑、失效位置和重要报告。离职预警提示需要任用。
- 战略版本7、内政版本3、人才版本1；不迁移旧档。新版本自动保存、读取、导入导出及确定性续行继续使用原入口。

## 回归与界面

| 检查 | 结果 |
| --- | --- |
| npm test | ${count(full)}项通过，0失败 |
| npm run test:talent | ${count(focused)}项通过，0失败 |
| npm run check | 通过，含两个新人才模块 |
| 桌面1440×1000、手机390×844 | 信息、进度、刷新恢复通过，无横向溢出、无浏览器异常 |
| 六组真实战斗短程样本 | 三种规模×两个种子，推进11天，存档校验通过 |
| 六组固定边界年度样本 | 三种规模×两个种子，推进360天，每月及结束时校验通过 |

重点回归包括100旬意愿门槛、Q90十次普通结果达到120进度、同目标锁、按势力冷却、改派续接、费用累计、满进度免费签约、多方竞争、签约后人数更新、迁居失效线索、空槽排除、君主保护、连续30日挽留、真实战役跨旬及存读档一致性。

桌面和手机截图：[桌面](../outputs/talent-ui/desktop.png)、[手机](../outputs/talent-ui/mobile.png)。

## 初步经济诊断

年度样本冻结出征规划，保留实际城市产出、征募、军粮、人才事务及日历，专门观察人才循环；不能把它当成完整战役胜负或经济平衡验收。新入仕和辞官为所有势力合计，费用只统计已签约项目的实际支出。

| 场景 | 种子 | 新入仕 | 辞官 | 平均登用支出（金） | 平均接洽耗时（天） | 安抚总开销（金） |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${rows}

各势力逐月N/D、费用和耗时分位数、重要事件及源码哈希见[年度数据](../outputs/talent-audit/results-360-peaceful.json)；实际交战样本见[实战数据](../outputs/talent-audit/results-11.json)。

这些样本用于发现重复人物、非法付费、失效线索和数值异常，不据此宣称各规模已平衡。本次固定边界年度样本不产生灭国；灭国去重与旧主顾虑有规则回归，但仍需后续完整战役补充灭国后30/90/180天去向分布。当前360天/11天审计均可用 npm run audit:talent 和 npm run audit:talent:combat 重现。
`);
console.log('Talent report generated; audit hashes match current implementation.');
