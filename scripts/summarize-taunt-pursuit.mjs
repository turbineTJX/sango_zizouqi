import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='docs/taunt-pursuit-v13',d=JSON.parse(readFileSync(`${dir}/audit.json`,'utf8'));
assert.ok(d.tauntControl?.length);
const mean=xs=>xs.reduce((s,x)=>s+x,0)/xs.length,round=n=>Math.round(n*100)/100;
const stats=rows=>Object.fromEntries(['win','margin','rearHp','rearBasic','followup','dives','taunts'].map(k=>[k,mean(rows.map(r=>r[k]))]));
const pct=n=>round(n*100)+'%';
function teamRows(team,world){return d.tournament.filter(r=>r.world===world&&(r.left===team||r.right===team)).map(r=>r.left===team?r:{...r,win:1-r.win,margin:-r.margin,rearBasic:r.enemyRearBasic,followup:r.enemyFollowup,dives:r.enemyDives});}
function paired(after,before,metric){
  const key=r=>[r.left,r.right,r.level,r.formation,r.seed,r.mirror].join('|'),base=new Map(before.map(r=>[key(r),r]));
  const bySeed=new Map();for(const r of after){const old=base.get(key(r));assert.ok(old);const xs=bySeed.get(r.seed)||[];xs.push(r[metric]-old[metric]);bySeed.set(r.seed,xs);}
  const xs=[...bySeed.values()].map(mean),avg=mean(xs),sd=Math.sqrt(xs.reduce((n,x)=>n+(x-avg)**2,0)/(xs.length-1)),half=2.201*sd/Math.sqrt(xs.length);
  return {mean:avg,low:avg-half,high:avg+half};
}
const ranges=['range3','range4','range5','range6'].map(world=>({world,...stats(d.ranges.filter(r=>r.world===world)),teams:Object.fromEntries(['fireline','balanced'].map(t=>[t,stats(d.ranges.filter(r=>r.world===world&&r.left===t))]))}));
const taunt=['fireline','balanced'].map(team=>{const after=d.ranges.filter(r=>r.world==='range5'&&r.left===team),before=d.tauntControl.filter(r=>r.left===team);return {team,after:stats(after),before:stats(before),win:paired(after,before,'win'),rearHp:paired(after,before,'rearHp')};});
const tournament=Object.keys(d.teams).map(team=>({team,before:stats(teamRows(team,'before')),noPursuit:stats(teamRows(team,'noPursuit')),after:stats(teamRows(team,'range5'))}));
const pursuit=['riders','breach'].map(team=>({team,win:paired(teamRows(team,'range5'),teamRows(team,'noPursuit'),'win'),followup:paired(teamRows(team,'range5'),teamRows(team,'noPursuit'),'followup')}));
const trial=['before','noPursuit','range5'].map(world=>({world,...stats(d.trial.filter(r=>r.world===world))}));
writeFileSync(`${dir}/summary.json`,JSON.stringify({count:d.count,ranges,taunt,tournament,pursuit,trial},null,2));
const ci=(x,scale=1)=>`${round(x.mean*scale)} [${round(x.low*scale)}, ${round(x.high*scale)}]`;
const lines=['# 远距挑衅与后阵追击验证（规则 13）','',`共 ${d.count.toLocaleString('en-US')} 场完整战斗，正式采用单体 5 格挑衅和突入后 8 步追击。ZOC 保持隐藏。`,'','## 本轮结论','',
'- **挑衅具有 ZOC 之外的用途，但大范围不自动等于高胜率。** 5 格内的弓弩即使当前射程不足，也会沿合法路线接近施法者；不能穿越有效 ZOC。相对我方该槽不施放，一坦两输出的得分率从 70.18% 到 72.92%，后两队平均多保留 276.25 兵；坦克＋输出＋辅助从 67.97% 到 67.25%，后两队多保留 88.80 兵。保护后排与赢得对局并不总是同步。',
'- **范围测试存在边际收益平台。** 3→5 格使坦克＋输出＋辅助由 65.04% 到 67.25%，一坦两输出由 75.26% 到 72.92%；4／5／6 格的汇总得分率相同。选择 5 格是为了覆盖弩兵普通 4 格射程外的一圈，并非宣称它是统计最优。更远引战会改变选敌、行动时机与承伤分配，本实验没有分别归因。',
'- **追击行为已改善，阵容强度改善有限。** 固定 5 格挑衅，只开关追击选敌，控制突破队突入后的对后排普攻伤害由 420.36 到 434.36（+3.33%），得分率由 26.93% 到 27.08%。纯骑对应伤害由 1289.69 到 1299.15（+0.73%），得分率均为 17.86%。不能把行为测试通过说成突破阵容已经足够强。',
'- **后排平衡仍有未解决项。** 固定配装循环赛中，双前排＋输出达到 100% 得分率（336 场），一坦两输出为 73.81%，坦克＋输出＋辅助为 75.60%。一坦两辅助仅 34.82%。本次结果依然指向特定保护与输出组合偏强，而不是所有后排／辅助都过强；没有据此继续修改全局伤害。',
'- **替换有明确代价。** 枪兵原「镇军」槽正式改为「挑衅」，舍弃原范围战法减伤，换成单体引战。与规则 12 的比较包含此替换和 AI 两项变化，不能单独归因于扩大范围。六个基础战法及三槽限制保持不变。','',
'## 正式规则','',
'挑衅：35 战意、24 步冷却，5 格内单体持续 4 步；无伤害、无减伤。优先选择威胁己方后排的敌军，其次弓弩；坚定免疫、净化解除，来源溃败／撤退后不再牵引。强制敌对战法的主目标；不禁止自身／友军支援，也不取消范围伤害波及。没有合法路线时不能强行穿越别人的 ZOC。枪阵固守单位不会被直接拖走。',
'追击：骑兵冲阵／对应专属突进实际突入弓弩后获得 8 步状态。优先继续追原目标，目标溃败后转攻距离 4 格以内、至多 4 格合法路径可接近的弓弩。有效嘲讽优先；与新前排接战、道路封锁及状态到期会限制追击。保留合法的玩家集火优先级，不增加伤害、移速或穿人能力。',
'只在部队状态中显示「被嘲讽／后阵追击」，保持战场无 ZOC 覆盖色和开关。规则版本升为 13，旧规则存档失效；新状态引用参与存档校验，当前版本确定性续战保留。','',
'## 范围扫描（6,144 场）','',
'| 嘲讽范围 | 汇总得分率 | 一坦两输出 | 坦克＋输出＋辅助 | 后两队平均余兵 |','|---|---:|---:|---:|---:|',
...ranges.map(r=>`| ${r.world.slice(-1)} 格 | ${pct(r.win)} | ${pct(r.teams.fireline.win)} | ${pct(r.teams.balanced.win)} | ${round(r.rearHp)} |`),'',
'## 挑衅自身收益（追加 1,536 场空槽对照）','',
'双方其余规则和敌方配装不变，仅禁用我方挑衅槽，与已有 5 格结果逐场配对；禁用并不释放槽位，不代表最佳替代战法。','',
'| 我方阵容 | 空槽得分率 | 挑衅得分率 | 得分率变化／百分点 [95%区间] | 后排余兵变化 [95%区间] |','|---|---:|---:|---:|---:|',
...taunt.map(r=>`| ${d.labels[r.team]} | ${pct(r.before.win)} | ${pct(r.after.win)} | ${ci(r.win,100)} | ${ci(r.rearHp)} |`),'',
'## 规则与追击对照（4,032 场循环赛）','',
'| 阵容 | 规则12 | 5格挑衅但关闭追击 | 正式规则13 |','|---|---:|---:|---:|',
...tournament.map(r=>`| ${d.labels[r.team]} | ${pct(r.before.win)} | ${pct(r.noPursuit.win)} | ${pct(r.after.win)} |`),'',
'| 阵容 | 追击引起的得分率变化／百分点 [95%区间] | 突入后普攻伤害变化 [95%区间] |','|---|---:|---:|',
...pursuit.map(r=>`| ${d.labels[r.team]} | ${ci(r.win,100)} | ${ci(r.followup)} |`),'',
'## 名将控阵突击试炼（36 场）','',
'使用关羽、张飞、黄忠原试炼属性、配装和零战意开局。每版本 12 种子，样本小，不作为胜率改善依据。','',
'| 版本 | 得分率 | 每场突入次数 | 突入后对后排普攻伤害 |','|---|---:|---:|---:|',
...trial.map(r=>`| ${{before:'规则12',noPursuit:'5格挑衅但关闭追击',range5:'正式规则13'}[r.world]} | ${pct(r.win)} | ${round(r.dives)} | ${round(r.followup)} |`),'',
'## 方法、回归与复测','',
'- 8 种固定三队阵容，四维均 85、每队 3000 兵、主副将加成归零，保留兵种被动、正常战意、关系连携及自动军略蓄力；不手动施放军略。范围扫描为 1／10 级，贴身／分散两阵型，12 固定种子双方镜像；循环赛为 10 级、同样阵型和种子，排除自身内战。范围扫描会改变双方挑衅范围，反映整套规则变化；空槽对照只禁用被测一方的挑衅。',
'- 全部模拟从合法三槽、零战意开始，调用正式 lockDeployment／stepBattle 至结算；没有注入待施放状态。实验模块在临时副本中修改，原始及现行模块 SHA-256 存于 audit.json。',
'- 得分率：胜=1，平=0.5，败=0。后排余兵指被测阵容后两队合计。突入后普攻伤害仅统计该骑兵首次实际突入之后对弓弩的普攻，不含突进战法伤害；统计直到战斗结束，不限于追击状态持续期。',
'- 区间按种子合并所有配对场景与镜像，再对 12 个种子均值计算近似 95% t 区间；不涵盖阵容选择偏差，未作多重比较校正。未搜索全部 20 种配装，也未复测六队、援军和攻城平衡。',
'- 行为回归覆盖：5 格弩兵主动接近、范围与坚定限制、敌对战法转向、净化与来源失效、不可穿越 ZOC、实际冲阵后追踪退射、击溃后更换目标、新 ZOC／到期中止、实际嘲讽压过追击、嘲讽／追击快照确定性续战及非法同阵营引用拒绝。`npm test` 共 222 项通过，`npm run check` 通过。',
'- 复测：`node scripts/taunt-pursuit-audit.mjs <规则12运行目录>`，接着 `node scripts/taunt-pursuit-audit.mjs <规则12运行目录> --taunt-only`，再运行 `node scripts/summarize-taunt-pursuit.mjs`。基线目录需要当时的根目录 .mjs 文件和 data；baseline-path.txt 记录本机本次快照位置，其他机器须提供同版本快照。原始逐场结果见 audit.json，汇总见 summary.json。',''];
writeFileSync(`${dir}/验证报告.md`,lines.join('\n'));
console.log(JSON.stringify({count:d.count,taunt,pursuit},null,2));
