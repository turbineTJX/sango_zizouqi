import fs from 'node:fs';
const rows=[417,643].flatMap(seed=>JSON.parse(fs.readFileSync(`outputs/normal-ai-audit-${seed}/summary.json`)));
const groups={};for(const r of rows)for(const [f,m] of Object.entries(r.metrics)){const g=groups[f]??={name:m.name,work:[],captures:[],attack:[]};g.work.push(m.completed);g.captures.push(m.captures);g.attack.push(m.decisions.attack||0);}
const range=x=>`${Math.min(...x)}–${Math.max(...x)}`;
const table=Object.values(groups).map(g=>`| ${g.name} | ${range(g.work)} | ${range(g.attack)} | ${range(g.captures)} |`).join('\n');
const detailed=rows.filter(r=>r.seed===643);const hungry=detailed.flatMap(r=>r.shortages.filter(x=>x.men>0&&!x.besieged));
const text=`# 普通模式 AI 行为审计（2026-09-22）

结论：能开展内政并攻略据点，现阶段不能判定整体行为验收通过。突出问题是非围城驻军缺粮；需结合用户新确认的单城资源承载目标继续校准。

## 方法

官渡风云、英雄集结；种子417、643；各轮换曹操和袁绍为玩家势力，玩家不下战略命令，遭遇交给真实自动战斗引擎。共8局，每局从第1天推进至第121天，合计960个战略日。覆盖剧本内全部五种可操作势力的AI控制。未增加资源、跳过战斗或强制胜负。每旬及终局校验当前存档。97项势力相关回归和56项战略/内政回归全部通过。

## 各势力实际表现

下表为单次120日观察的范围；样本初始领土与人才不同，不是同预算强弱排名。占领次数包含据点易手，非净增城池；内政完成数为complete事件，含生效加成，不等价于资源净收益。

| 势力 | 内政完成事件 | 进攻命令记录 | 占领据点次数 |
| --- | ---: | ---: | ---: |
${table}

8局均到达第121天，无存档校验异常、跨城错误任职或事务方向错配。已有机制测试覆盖强敌不攻、保留防御兵力、救援到达时限、缺粮回撤、忙碌人员等待、优先空闲武将以及共用推荐选人。战败本身不等于送死，以上也不能证明所有实战攻击都合理。

## 明确未通过：驻军供养

种子643的4局中，共观察到${hungry.length}个“非围城、仍有现役驻军、饥饿值≥1”的城市日，其中${hungry.filter(x=>x.hunger>=3).length}个城市日达到饥饿值≥3。样本按推进后的日界面采样，数值是累计城市日而非独立城市数。

- 官渡、玩家曹操，第70天：刘表江陵无围城，粮食0，驻军20423，饥饿3.996，无在途粮食。实际进入饥饿减员区间。
- 官渡、玩家袁绍，第59天：孙策建业无围城，粮食0，驻军24500，仍有募兵事务剩余2天。
- 英雄集结、玩家袁绍，第88天：刘备江陵无围城，粮食0，驻军38103，同时办理募兵和购粮，均剩余3天，无在途粮食。

这些记录证明补兵、产出、库存与运输没有形成足够的保障；不能简单通过提升进攻欲望或禁止补兵认定已修复。

## 代码诊断线索（待对照验证）

1. strategic-ai.mjs的整补粮食下限主要取2500与作战预留，未依据整补后驻军的逐日消耗计算。
2. domestic.mjs的征募候选与最终结算允许消耗可用粮食，但未保留完成募兵后存量驻军的口粮。
3. logistics仅挑选零兵、非太守且未被计划占用的在城人员运输，且采用事务完成后出发；库存不足不代表能及时得到运输。
4. 当前基础粮产为600+农田等级×600/旬，之后应用太守与临时效果；资源承载目标尚无显式验收。不能仅靠模拟无异常来证明经济合理。

## 用户确认的后续承载目标

- 单城内政人才充足且能力强：可支撑三线作战。
- 人才总数足够、擅长内政的人才少：可支撑单线至双线作战。
- 人才数量、质量都差：守城有余。
- 必须一并考察金、粮、预备兵、兵损补充、持续运力与留守兵力；玩家和AI共用产出和消耗规则。
- 一线军团规模、持续作战补充强度及发展阶段是待明确的验收口径，不把建议数字当作用户已确认规则。

## 复现与证据

\`node scripts/audit-normal-ai.mjs 121 643\`。可依次追加输出目录、剧本ID、玩家势力。退出码0为本脚本未发现异常，1为执行/状态错误，2为观察到非围城驻军缺粮。脚本是行为审计，0不表示覆盖所有合理性要求。

原始数据：outputs/normal-ai-audit-417/summary.json、outputs/normal-ai-audit-643/summary.json；后者包含逐日缺粮和当时内政事务记录。回归日志：outputs/normal-ai-review-tests.txt、outputs/normal-ai-domestic-tests.txt。

本轮基线审计没有修改战斗数值、资源产出或战略AI规则。
`;
fs.writeFileSync('docs/普通模式AI行为审计-2026-09-22.md',text);
