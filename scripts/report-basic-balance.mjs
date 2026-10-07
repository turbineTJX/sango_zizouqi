import {readFileSync,writeFileSync} from 'node:fs';
import {famous,BY,sourceHash} from './basic-balance-lib.mjs';
const dir=new URL('../outputs/basic-balance/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
const currentHash=sourceHash(),sourceMatches=currentHash===manifest.hash;
const read=name=>readFileSync(new URL(name+'.jsonl',dir),'utf8').trim().split('\n').map(JSON.parse);
const dev=read('development'),val=read('validation'),follow=read('followups');
for(const [rows,n]of [[dev,1440],[val,912],[follow,576]]){
 if(rows.length!==n)throw Error('Incomplete audit');
 const keys=rows.map(r=>JSON.stringify([r.hero,r.kind,r.control,r.focal,r.type,r.level,r.seed,r.swapped,r.variant]));
 if(new Set(keys).size!==n)throw Error('Duplicate audit rows');
 for(const r of rows){const totals=['ownTeam','enemyTeam'].map(k=>r.draft[k].reduce((s,u)=>s+u.troops,0));if(totals[0]!==totals[1])throw Error('Unequal soldiers');}
}
const pct=x=>(x*100).toFixed(1)+'%';
const rate=rs=>`${rs.filter(r=>r.win).length}/${rs.length}`;
const mean=(rs,key)=>rs.reduce((n,r)=>n+r[key],0)/rs.length;
const names=id=>BY[id]?.name??id;
const lines=[
'# 基础强度与胜负归因诊断',
'',`规则 ${manifest.rulesVersion}；共 2,928 场：开发筛查 1,440、独立种子验证 912、追加归因 576。源文件 SHA-256：\`${manifest.hash}\`。`,
'',
'## 方法与边界',
'',
'全部通过自定义战役生成器生成。单挑双方各 2,000 兵，同兵种、同等级；混编双方各 12,000 兵，替换核心时保持其余队友、敌军和兵种结构不变。开发等级 1/5/10，验证等级 5/10，每个种子交换左右方。保留全部败局。开发与验证种子见 manifest.json。合法基线执行存档校验，开发样本检查确定性续战。',
'',
sourceMatches?'报告生成时源码与测试快照一致。':`注意：三阶段运行结束时各自通过源码哈希检查，但报告生成时工作区源码已变化。本报告仅对应上述测试快照，不代表随后修改的版本已验收。当前哈希：${currentHash}。`,
'',
'名将样本为 16 名专属持有者及 8 名常见战将，共 24 人。“普通对照”按数据筛选：无专属、不属于上述样本，统率/武力/智力均不超过 80，武智最高项至少 65；基线要求同兵种适性至少 A，按角色匹配后取评分中位与较高分位。这个标签不代表历史评价。',
'',
'两侧使用相同军略选择规则，但玩家侧下令在步进前、敌侧在引擎步进内，时序不完全一致；关闭军略用于排除此因素。所有测试均无预备队，不能据此评价援军 AI。镜像站位、关闭羁绊或专属等为机制消融，不能并入合法玩法胜率。关闭羁绊同时影响双方，只说明整体交互变化，不能归因于某一个羁绊。',
'',
'## 开发筛查',
'',
'|武将|同兵种单挑胜场|混编本人胜场|普通替换合计胜场|',
'|---|---:|---:|---:|',
...famous.map(h=>{const rs=dev.filter(r=>r.hero===h.id);return `|${h.name}|${rate(rs.filter(r=>r.kind==='duel'))}|${rate(rs.filter(r=>r.kind==='squad'&&r.focal===h.id))}|${rate(rs.filter(r=>r.kind==='squad'&&r.focal!==h.id))}|`;}),
'',
'这不是总体胜率排名：每位武将的对手与阵容可能不同。普通替换合计包含两种对照，各 12 场。20 人单挑 24/24，乐进 23/24；突出异常是郭嘉、许褚、典韦。不能由这一有限样本宣称全游戏已平衡。',
'',
'## 独立验证：单挑原因',
'',
'下表每格 16 场；括号为平均敌方剩余兵力比例。',
'',
'|武将／对手|正常|镜像站位|关闭双方羁绊|关闭军略|镜像且关闭军略|',
'|---|---:|---:|---:|---:|---:|',
...['郭嘉','许褚','典韦'].map(name=>{const h=famous.find(h=>h.name===name),rs=val.filter(r=>r.hero===h.id&&r.kind==='duel');return `|${name}／${names(rs[0].control)}|`+['default','mirror','bonds-off','commands-off','mirror-no-commands'].map(v=>{const a=rs.filter(r=>r.variant===v);return `${rate(a)}（${pct(mean(a,'enemyRemaining'))}）`;}).join('|')+'|';}),
'',
'- **郭嘉：当前弩兵配置与单挑职责不匹配。** 统率 51、智力 98，普攻攻击与防御主要取统率；十胜奇谋与疑兵侧重控制、支援，单挑没有队友可支援。正常配置对张承 0/16，敌方平均剩余约 52%，属于本样本的明显压制。统一站位、关闭羁绊或军略均未逆转。仅任军师的混编补测为 2/16，对照 3/16，也没有在这套阵容体现明显优势。',
'- **许褚、典韦：高武力没有转化为持续普攻优势。** 武力提高武技威力，但普攻攻击与防御主要看统率，有限次数的战法难以主导长时间消耗战。关闭羁绊后败局更重，说明羁绊在这些单挑中反而提供补偿。混编中仍可取胜，不能概括为全面弱于普通武将。',
'',
'公式依据：unit-stats.mjs 中攻击含统率 × 1.6、防御含统率 × 0.65，武技威力含武力 × 2，谋略威力含智力 × 2；实际伤害还受兵力、兵种、羁绊等共同影响。日志的 basicDamage 包含法球普攻，不等于纯物理输出。',
'',
'## 兵种与布阵追查',
'',
'郭嘉保持同一对手张承，双方一起改为戟兵后胜 10/16；其余七兵种均 0/16。这说明可利用智力的战法配置会改变结果。换兵种也同时改变双方适性与技能，不能把差异全部归给某一技能。许褚换戟兵 7/16、弩兵 2/16，其余 0/16；典韦八兵种均 0/16。',
'',
'进一步把混编双方站位镜像、关闭所有羁绊与军略：',
'',
'|核心|本人胜场（左／右）|普通替换胜场（左／右）|',
'|---|---:|---:|',
...['郭嘉','许褚','典韦'].map(name=>{const h=famous.find(h=>h.name===name),rs=follow.filter(r=>r.hero===h.id&&r.variant==='mirror-bonds-off-no-commands');const fmt=a=>`${rate(a)}（${rate(a.filter(r=>!r.swapped))}／${rate(a.filter(r=>r.swapped))}）`;return `|${name}|${fmt(rs.filter(r=>r.focal===h.id))}|${fmt(rs.filter(r=>r.focal!==h.id))}|`;}),
'',
'左右方敏感性在这些消融后仍存在，不能只归因于初始配阵、羁绊或军略选择。引擎按奇偶步交换先行动方，同侧部队顺序行动；移动寻路、同分目标选择和随机数消耗顺序也可能参与结果。当前实验没有独立证明某一项是错误，应继续追踪首次接敌、集火对象和行动顺序，不能把这一现象直接称为敌方 AI 作弊。',
'',
'## 结论',
'',
'本轮不修改武将属性或技能倍率。明确发现郭嘉当前弩兵战斗位在所测阵容中的角色收益偏弱，以及许褚、典韦高武力在持久战中的收益受统率主导的普攻机制限制；这两类应分别评估支援贡献和武技定位。羁绊并非上述单挑失败的统一原因，混编则同时存在组合交互与左右方敏感性。优先定位后者，再判断需要修正机制还是调整数值；不以名将必须获胜作为验收标准。',
'',
'复现顺序：node scripts/audit-basic-balance.mjs → node scripts/validate-basic-balance.mjs → node scripts/probe-basic-balance.mjs → node scripts/report-basic-balance.mjs。原始逐局结果保存于同目录的三个 JSONL 文件，包含阵容、开局属性与羁绊、伤害贡献、施法次数、胜负和双方剩余兵力。',
];
writeFileSync(new URL('report.md',dir),lines.join('\n')+'\n');
console.log('Verified 2928 unique rows; sourceMatches='+sourceMatches+'; report.md written');
