import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const out='docs/roles-v15',read=tag=>JSON.parse(gunzipSync(readFileSync(`${out}/${tag}.json.gz`))),mean=xs=>xs.reduce((n,x)=>n+x,0)/xs.length,pct=x=>(100*x).toFixed(1)+'%',num=x=>Math.round(x).toLocaleString('en-US');
const a=read('final-officers'),c=read('final-counters'),s=read('final-specials'),t=read('final-teams'),g=read('final-guan'),m=read('final-mixed');
const rows=[...a.rows,...c.rows],roleNames={tank:'纯坦',physicalTank:'物理战坦',magicTank:'法术战坦',assassin:'刺客',mage:'法术后排',shooter:'物理后排',frontMedic:'前排医辅',backMedic:'后排医辅'},roles=Object.keys(roleNames),contexts=[...new Set(rows.map(r=>r.context))],ids=[...new Set(rows.map(r=>r.id))];
const names={doubleFront:'双前排＋弩手',spellFront:'双坦谋攻',fireline:'坦＋法＋物',breach:'控阵＋刺客＋法师',riders:'全刺客',ranged:'纯远程',frontCare:'坦＋前医＋弩手',rearCare:'坦＋后医＋弩手',doubleCare:'坦＋双医',controlFire:'法坦＋双法',leanFire:'双坦双法双物',dualControl:'双法坦四法',frontSupport:'一坦一前医双法双物',rearSupport:'双坦双法一物一后医',breachSix:'双坦一刺客一法双物',combinedCare:'一坦一前医双法一物一后医',brawlers:'双战坦一刺客一法一物一后医',allMixed:'纯坦、法坦、刺客、法、物、前医'};
const metrics=rs=>Object.fromEntries(['win','margin','damage','magic','dot','healing','taken','alive','allyHp','ticks'].map(k=>[k,mean(rs.map(r=>r[k]))]));
const summary=ids.map(id=>({id,name:rows.find(r=>r.id===id).name,roles:roles.map(role=>{const rs=rows.filter(r=>r.id===id&&r.role===role);return {role,...metrics(rs),contexts:Object.fromEntries(contexts.map(c=>[c,metrics(rs.filter(r=>r.context===c))]))};})}));
const validation=ids.filter(id=>id!=='generic').map(id=>{
 const local=rows.filter(r=>r.id===id),train=local.filter(r=>r.seed===4001),test=local.filter(r=>r.seed===4103);
 const best=rs=>roles.map(role=>({role,margin:mean(rs.filter(r=>r.role===role).map(r=>r.margin))})).sort((x,y)=>y.margin-x.margin)[0].role;
 const fixed=best(train),choices=Object.fromEntries(contexts.map(c=>[c,best(train.filter(r=>r.context===c))]));
 return {id,name:local[0].name,fixed,choices,fixedResult:metrics(test.filter(r=>r.role===fixed)),adaptResult:metrics(test.filter(r=>r.role===choices[r.context]))};
});
const teamSummary=data=>[...new Set(data.rows.map(r=>r.count))].map(count=>({count,teams:Object.keys(data.groups).map(key=>{const rs=data.rows.filter(r=>r.count===count&&(r.left===key||r.right===key));return {key,win:mean(rs.map(r=>r.left===key?r.win:1-r.win)),timeout:mean(rs.map(r=>r.timeout)),games:rs.length};})}));
const teams=teamSummary(t),mixed=teamSummary(m)[0],total=rows.length+s.rows.length+t.rows.length+g.rows.length+m.rows.length;
writeFileSync(`${out}/combined-summary.json`,JSON.stringify(summary,null,2));writeFileSync(`${out}/role-validation.json`,JSON.stringify(validation,null,2));
const lines=['# 规则15：八类定位、持续叠层与武将强度验证','',
`最终规则完成 **${total.toLocaleString('en-US')} 场**完整自动对战，另有迭代过程试跑。战斗均从零战意、合法三槽和正式布阵锁定开始，未注入待施放状态。机制与续战回归 **236 项全部通过**，语法检查通过；浏览器已验证新定位说明和火矢预设实际应用。`,'',
'## 结论','',
'八类职责已有不同的实际能力和代价：纯坦更侧重保队友，物理战坦增加直接伤害，法术战坦有谋略普攻期与混乱；刺客在真实缺口中追击；法师可以持续叠燃；前后医辅分别提供短程双目标与远程单目标恢复，并消耗普攻时间。',
'这轮证明了换定位可以改变收益，也保留了明显短板；没有证明全部武将、20种基础组合与所有阵位已经均衡。纯坦、前医和刺客的价值高度依赖队伍缺口，不能按一张总胜率表选人。','',
'## 测试范围与读数','',
`- 武将基础配装：${rows.length.toLocaleString('en-US')} 场，41 名有专属的名将＋24 名普通代表＋四维80对照；八种定位，六种敌阵，两种阵形，两枚种子，双方镜像。`,
`- 专属替换：${s.rows.length.toLocaleString('en-US')} 场。每名将按战法性质选择两种职责，把一项基础能力换成专属；专属始终占三槽之一。`,
`- 阵容轮转：${t.rows.length.toLocaleString('en-US')} 场，十种三队模板，3v3／6v6（六队将三队模板重复），两种阵形，四枚种子，镜像。`,
`- 六人混编：${m.rows.length.toLocaleString('en-US')} 场，八种包含前医、后医、刺客的非重复职责结构，两阵形、四种子、镜像。`,
`- 关羽＋黄忠＋诸葛亮：${g.rows.length} 场，关羽切换八种基础定位，其他两人固定。`,
'- 统一10级、每队3000人、无军团属性加成，不施放玩家军略。武将保留真实四维与成长；普通人使用当前通用成长。进攻方得分为胜1、平0.5、负0，表中“得分率”包含平局。',
'- 武将轮换试验固定两个队友：四维80纯坦和物理弩手。被测者在相同的第二阵位，因此测试的是阵容中的补充职责；这不等同于每人独自承担主坦。关羽三人组另测主坦场景。',
'- 每个武将／定位共48场，但阵容、地形和种子有限；不是全局排位。普通弓兵的纯物理火矢配置、所有20组合、全部优先级、全部835名武将、攻守城与军略没有被穷举。','',
'## 关羽确实可以用输出换保护','',
'黄忠固定火矢＋阻射＋百步穿杨，诸葛亮固定救护＋封喉＋八阵奇门；仅切换关羽。四类敌阵、两种布阵、两种子、镜像，每种定位32场。','',
'| 关羽定位 | 得分率 | 自身造成伤害 | 自身累计承伤 | 存活步数 | 两位队友战后兵力 |','|---|---:|---:|---:|---:|---:|'];
for(const role of ['tank','physicalTank','magicTank','assassin','frontMedic']){const r=metrics(g.rows.filter(r=>r.role===role));lines.push(`| ${roleNames[role]} | ${pct(r.win)} | ${num(r.damage)} | ${num(r.taken)} | ${num(r.alive)} | ${num(r.allyHp)} |`);}
lines.push('','纯坦关羽伤害较低，但两位队友剩余兵力更高；物理战坦换来更高个人伤害。这里把关羽改成刺客或前医会留下主坦空缺，成绩很差，不能把“可以换定位”误读为“任何三人组随便换都一样强”。累计承伤可以超过3000，因为受治疗后还会继续受伤。','',
'## 同一武将是否值得按对手换定位','',
'用种子4001按平均兵力差选方案：一套在六类敌阵中固定使用，另一套按敌阵选择。只在未参与选择的种子4103上比较，每名将每个策略24场。','',
`65 名代表中，${validation.filter(r=>r.adaptResult.win>r.fixedResult.win).length} 人的按敌阵切换得分高于固定方案，${validation.filter(r=>r.adaptResult.win===r.fixedResult.win).length} 人相同，${validation.filter(r=>r.adaptResult.win<r.fixedResult.win).length} 人更低；平均差值 ${(100*mean(validation.map(r=>r.adaptResult.win-r.fixedResult.win))).toFixed(1)} 个百分点。样本只分离了随机种子，没有分离敌阵，因此说明这些已知对局可受益，不代表对未知阵容同样有效。`,'',
'| 武将 | 固定方案得分 | 按敌阵换定位得分 |','|---|---:|---:|');
for(const name of ['关羽','诸葛亮','郝昭','王平','满宠']){const r=validation.find(r=>r.name===name);lines.push(`| ${name} | ${pct(r.fixedResult.win)} | ${pct(r.adaptResult.win)} |`);}
lines.push('','## 八类职责的实际贡献','',
'四维80对照，和同一纯坦、物理弩手配队；每种职责面对同一批敌人。谋略伤害列为直接伤害及谋攻普攻，DOT单列，二者均已包含在总伤害内。控制持续时间受全队影响，未把全队控制冒算成个人贡献。','',
'| 职责 | 得分率 | 总伤害 | 谋略伤害 | 持续伤害 | 实际治疗 |','|---|---:|---:|---:|---:|---:|');
for(const r of summary.find(p=>p.id==='generic').roles)lines.push(`| ${roleNames[r.role]} | ${pct(r.win)} | ${num(r.damage)} | ${num(r.magic)} | ${num(r.dot)} | ${num(r.healing)} |`);
lines.push('','燃烧不是一次大伤害的延迟特效：火矢／火计提供燃击，后续攻击实际逐层增加灼烧，最多三层。测试验证了净化清零、停火过期、换目标重新积累以及精确续战。重复施加不增加无限独立实例。救护和策应共享真实伤兵预算，治疗时重置攻击间隔。','',
'## 六人混编比较','',
'比“把一个三人队复制两遍”更接近六人队的职责配置。各结构对其余七队轮转，各112场。','',
'| 结构 | 得分率 | 超时率 |','|---|---:|---:|');
for(const r of mixed.teams)lines.push(`| ${names[r.key]} | ${pct(r.win)} | ${pct(r.timeout)} |`);
lines.push('','## 极端阵容与克制','',
'| 三人模板（6v6时重复） | 3v3得分率 | 6v6得分率 |','|---|---:|---:|');
for(const r of teams[0].teams)lines.push(`| ${names[r.key]} | ${pct(r.win)} | ${pct(teams[1].teams.find(x=>x.key===r.key).win)} |`);
lines.push('','全刺客对无前排纯远程有明确优势，对完整前排很弱；ZOC没有被伤害补强或侧翼AI绕过。双医模板缺少输出，未形成无敌拖延。后排治疗不再拥有几乎无代价的额外恢复，但远程主力仍更适合得到完整前排保护。','',
'## 武将基础定位全表','',
'这是同队友、同敌阵的基础八方案比较，不包含专属替换，也不是人物综合排名。低统率谋士不能被高智力自动补成强坦克；高武力将依然能用固定底效承担辅助，但不保证胜过适配的谋士。','',
'| 武将 | '+roles.map(r=>roleNames[r]).join(' | ')+' |','|---|'+roles.map(()=>'---:').join('|')+'|');
for(const p of summary.filter(p=>p.id!=='generic'))lines.push(`| ${p.name} | ${p.roles.map(r=>pct(r.win)).join(' | ')} |`);
lines.push('','## 专属替换效果','',
'每个专属选两种适配职责，保留该职责前两项基础战法，把第三项替换为专属并前置施放优先级。因此收益同时包含技能替换及槽位优先级变化。这里用同一批四敌阵，和匹配的基础方案对照，未混入后追加的两种克制阵。','',
'| 武将 | 职责 | 基础得分 | 带专属得分 |','|---|---|---:|---:|');
for(const id of [...new Set(s.rows.map(r=>r.id))])for(const role of [...new Set(s.rows.filter(r=>r.id===id).map(r=>r.role))]){const rs=s.rows.filter(r=>r.id===id&&r.role===role),base=a.rows.filter(r=>r.id===id&&r.role===role);lines.push(`| ${rs[0].name} | ${roleNames[role]} | ${pct(mean(base.map(r=>r.win)))} | ${pct(mean(rs.map(r=>r.win)))} |`);}
lines.push('','## 边界与后续验证重点','',
'- 目前普通代表有可用的输出、医辅与承伤方案；不是给普通将“陪跑”的空成长。名将专属在不同职责中有赚有亏，不是免费第四槽。',
'- 法师、远程主力在稳固前排保护下仍偏强；近战输出与前医需要更精细的职责比例和阵位。不能凭这批样本宣称所有八类平均强度相等。',
'- 一个八定位总榜不能证明单兵种20组合都有效；这次重点补齐职责能力与持续叠层，并验证换定位收益。八类方案都合法，数值优劣仍取决于敌阵。',
'- 本轮胜率来自无玩家军略的10级小样本环境；军略净化、阵形调整、等级成长阶段、特殊地形和人物关系会改变火攻与治疗价值。',
'- 部分早期试跑未统计来源正确的DOT，且规则仍在调整，不能把 first／second／third 与最终总伤害直接作同比；最终报告只统计 final 前缀数据。','',
'## 复现与原始数据','',
'```sh',
'node scripts/roles-v15-audit.mjs full final-officers',
'node scripts/roles-v15-audit.mjs counters final-counters',
'node scripts/roles-v15-audit.mjs special final-specials',
'node scripts/roles-v15-audit.mjs teams final-teams',
'node scripts/roles-v15-audit.mjs mixed final-mixed',
'node scripts/roles-v15-audit.mjs guan final-guan',
'node scripts/report-roles-v15.mjs',
'npm test','npm run check','```','',
'同目录 final-*.json.gz 保留每场结果、战法、兵种和运行模块哈希；combined-summary.json 为基础武将汇总，role-validation.json 为不同种子选择／验证。审计运行期间之后只有文案、存档字段验证和测试补充，战斗数值与AI保持一致。','');
writeFileSync(`${out}/平衡验证报告.md`,lines.join('\n'));console.log('report',total,'battles');
