import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {world} from './balance-v14-lib.mjs';
import {materializeEightTroopsSnapshot} from './eight-troops-snapshot.mjs';
import {join} from 'node:path';
const snapshot=materializeEightTroopsSnapshot(),{TROOPS,TACTICS_BOOK,TACTIC_ROLES}=await world(snapshot.dir);
const dir='docs/eight-troops-v16/',read=tag=>JSON.parse(readFileSync(dir+tag+'-summary.json')),raw=tag=>JSON.parse(gunzipSync(readFileSync(dir+tag+'.json.gz')));
const tags=['verified-combinations','verified-officers','verified-teams','verified-naval','verified-probes','verified-fleet','verified-fleet-officers'];
const summaries=Object.fromEntries(tags.map(tag=>[tag,read(tag)])),data=Object.fromEntries(tags.map(tag=>[tag,raw(tag)]));
for(const [tag,d]of Object.entries(data))for(const f of ['engine.mjs','unit-stats.mjs','tactics.mjs','engagement.mjs','battlefield.mjs','expanded-tactics.mjs','passives.mjs','combat-rules.mjs']){
 const hash=createHash('sha256').update(readFileSync(join(snapshot.dir,f))).digest('hex');if(hash!==d.hashes[f])throw Error(tag+' does not match rule 16 snapshot '+f);
}
const pct=n=>(n*100).toFixed(1)+'%',int=n=>Math.round(n).toLocaleString('en-US'),avg=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const roleName=k=>{const [type,role]=k.split('-');return TROOPS[type].name+' · '+TACTIC_ROLES[type].find(r=>r.id===role).name;};
const kit=ids=>ids.map(id=>TACTICS_BOOK[id].name).join('／');
const combos=[...summaries['verified-combinations'].summary.filter(t=>t.type!=='ship'),...summaries['verified-fleet'].summary];
const officers=summaries['verified-officers'].summary.map(p=>({...p,roles:[...p.roles.filter(r=>!r.role.startsWith('ship-')),...summaries['verified-fleet-officers'].summary.find(x=>x.id===p.id).roles]}));
const officerRows=[...data['verified-officers'].rows.filter(r=>r.type!=='ship'),...data['verified-fleet-officers'].rows];
const contextNames={fire:'坦克＋法弓＋输出弩',care:'坦克＋法弓＋救护弩',breach:'控阵枪＋突击骑＋掩护弓',curse:'咒戟＋疫伤兵器＋后勤'};
const teamNames={classic:'传统远程恢复',physical:'物理混编',curses:'诅咒疫伤混编',illusions:'幻卫掩护',passage:'双骑奇门突破',artillery:'双兵器阵地',medics:'双后勤恢复',counter:'双戟反击',strike:'双突击舰',escort:'护航舰＋突击舰',control:'双策应舰',shore:'双弩岸射'};
const total=Object.values(summaries).reduce((n,s)=>n+s.count,0);
const lines=['# 八兵种与谋略工具验证（规则 16）','',
`本报告针对八兵种规则 16：快照哈希已逐一与所有 verified 原始报告核对。本轮共完成 **${int(total)} 场**对照，另有该版本 252 项自动测试全部通过及浏览器水战、布阵、配装验证。中间调参数据另存 initial／tuned／final 前缀；本报告仅使用 verified 数据。`,'',
'收尾时共享目录中另一项任务已开始接入规则 17 的地形增减益。本报告不覆盖这批并行改动，也不把规则 16 的胜率当作规则 17 的验证。为避免旧统计被新代码污染，已保存完整测试运行快照；本目录审计脚本默认复现该快照，游戏继续使用工作区的最新规则。这不是旧档兼容或存档迁移功能。','',
'## 结论与边界','',
'八兵种、48 个两字基础战法已接入正式战斗，每兵种仍是六选三。诅咒、减疗、承伤幻象、持续恢复、开路与水陆限制均有真实结算、AI 和保存续战验证。专属战法仍四字、占同样一个槽，普通武将保留五项成长。','',
'**机制成立，不等于全局平衡已经完成。** 单槽替换能得到有场景差异的收益；但整队对照里传统远程恢复仍明显偏强，舰船对纯岸射也存在较大劣势。双骑或双兵器队不能仅凭加入新支援就赶上远程阵容。不能据此宣称每个兵种、每个预设都同样可用。','',
'水战目前是双水道和中央桥梁的原型：有舰船（含预备队）即启用；尚无战略港口、海域、航道或水上占点目标。舰船在此地图上的价值受岸上远射支配，这也是当前水军平衡的重要限制。','',
'## 最终工具规则','',
'| 工具 | 生效方式 | 限制与反制 |','|---|---|---|',
'| 衰咒 | 每层攻击、谋略、军纪 −6%，最多三层；咒击期普攻按 0.8 倍谋略续叠 | 要维持接敌，可净化，停攻后过期 |',
'| 枯竭／疫矢 | 10 步减疗 50%；疫矢另有 10 步疫伤 | 不影响护盾；祛厄先净化再治疗；共用真实伤兵预算 |',
'| 幻卫／雾隐 | 三次／每队两次承伤，分担直接命中 50%，每次上限为目标最大兵力 8% | 不增加实体或出场名额、不叠加、不拦截；持续伤害穿透 |',
'| 奇门 | 其他近战队 6 步无视 ZOC，40 战意、28 步冷却，受援者共用 18 步间隔 | 仍受嘲讽、占格、城门、水陆、射程限制；AI 利用窗口切后排 |',
'| 兵器 | 普攻射程 5、两格盲区；架设定点增攻增程；撞城可击破真实城门 | 移动慢，贴身撤步，占点后无法转场 |',
'| 舰船 | 水路行军与冲撞、跨水陆射击、舰队恢复、幻护和控场 | 不能登陆；艨冲要有敌船，接舷要有其他友船 |','',
'完整 48 项效果、门槛、冷却和取舍见[六选三战法设计](../六选三战法设计.md)。','',
'## 测试口径','',
'| 项目 | 场次 | 覆盖 |','|---|---:|---|',
...tags.map(tag=>`| ${tag} | ${int(summaries[tag].count)} | ${({'verified-combinations':'八兵种 × 20 组合 × 四敌阵 × 双阵位 × 双种子 × 镜像','verified-officers':'41 名将＋24 普通将 × 八兵种三预设 × 三敌阵 × 镜像','verified-teams':'八种六队混编，双阵位、双种子、镜像，交叉对战','verified-naval':'三种舰队与岸射队，其他四名队友相同；双阵位、双种子、镜像','verified-probes':'奇门、枯竭、幻卫各自只换一个槽；四敌阵、双阵位、四种子、镜像','verified-fleet':'补充舰船 20 组合：加入其他友船，混合敌舰与岸军场景','verified-fleet-officers':'65 人的三套舰船预设，在有舰队伙伴及舰船敌人的场景复核'})[tag]} |`),'',
'全部从零战意正常开战，六选三合法配装、同兵力 3000、等级 10，直到正式结果或 240 步日暮；胜=1、平=0.5、负=0。没有关闭 ZOC、跳过战意或注入待施放状态。脚本每步检查占格和水陆通行。合成武将四维均为 80；名将／普通将用真实四维与固定被动，军团加成清零，避免任命和专属军略干扰。','',
'舰船主表采用补充舰队组；原始普通对照中只有一艘友船，接舷无合法友船目标，艨冲也没有敌船目标。这些岸线反例仍保留，但不把它们当作舰队预设强度的唯一依据。舰队组的 fire／care 改为含敌船的输出／恢复阵容，breach／curse 保留岸军。','',
'## 单槽替换：收益是否取决于敌阵','',
'两队其余兵种、队友、阵位、种子和优先级均相同。奇门换包扎；枯竭换横扫（保留铁壁＋衰咒）；幻卫换横扫（保留铁壁＋反击）。每格 16 场，样本仍较小，分数不是普适胜率。','',
'| 单槽选择 | 敌阵 | 带新工具 | 换成对照工具 | 变化 |','|---|---|---:|---:|---:|'];
for(const key of ['passage','blight','mirage'])for(const context of ['classic','physical','curses','medics']){
 const rows=data['verified-probes'].rows.filter(r=>r.key===key&&r.context===context),scores=['on','off'].map(v=>avg(rows.filter(r=>r.variant===v).map(r=>r.win)));
 lines.push(`| ${{passage:'奇门 ↔ 包扎',blight:'枯竭 ↔ 横扫',mirage:'幻卫 ↔ 横扫'}[key]} | ${teamNames[context]} | ${pct(scores[0])} | ${pct(scores[1])} | ${((scores[0]-scores[1])*100).toFixed(1)} 个百分点 |`);
}
const phase=summaries['verified-probes'].summary.find(s=>s.key==='passage').variants.find(v=>v.variant==='on');
lines.push('',`奇门组在窗口内对后排的实伤均值为 ${int(phase.phaseRearDamage)}，对照组为 0，证明受援队确实利用了突破窗口。它同时放弃包扎，因此并未在所有敌阵中获益。幻卫的累计吸收属于额外承伤手段，不能反推出能对抗持续伤害；机制测试已确认疫伤不消耗幻卫次数。`,'',
'## 各兵种的 20 种组合','',
'下面是固定三个队员框架下的比较：前排测试者与另一主坦、输出弩并肩；后排测试者由主坦保护。舰船改用另一友船为第三名队友。该框架不适合直接跨兵种比较绝对分数，尤其不能把一个缺少输出伙伴的辅助组三打三排名当作辅助无价值。','',
'| 兵种 | 最高分组合 | 综合分数 | 最低分数 | 距最好不超过 10 个百分点的组合数 |','|---|---|---:|---:|---:|');
for(const t of combos){const sorted=[...t.builds].sort((a,b)=>b.win-a.win||b.margin-a.margin),best=sorted[0];lines.push(`| ${TROOPS[t.type].name} | ${kit(best.ids)} | ${pct(best.win)} | ${pct(sorted.at(-1).win)} | ${sorted.filter(x=>x.win>=best.win-.1).length} / 20 |`);}
lines.push('','这里的“接近最好”只用于描述分布，没有证明 20 种都平衡。三槽优先级固定为池中次序，未穷举每个组合的六种施放顺序，也未自动优化每个武将的站位。','',
'## 名将与普通武将','',
'每人比较八兵种、各三个基础预设；采用同一组基础战法，保留个人属性与被动。**这轮未在统计对战中装备专属战法**，因此衡量的是换兵种、换职责的基础能力，不能据此排出名将含专属战法的全局强度榜。41 人专属发动与存档回归另由自动测试覆盖。','');
const flexible=officers.filter(p=>{const rows=officerRows.filter(r=>r.id===p.id),best=['fire','care','curse'].map(c=>{
 const options=p.roles.map(r=>{const rs=rows.filter(x=>x.context===c&&x.role===r.role);return {role:r.role,win:avg(rs.map(x=>x.win)),margin:avg(rs.map(x=>x.margin))};}).sort((a,b)=>b.win-a.win||b.margin-a.margin);return options[0].role;
});return new Set(best).size>1;});
const comparable=officers.filter(p=>!p.famous&&p.roles.some(r=>{const xs=officers.filter(o=>o.famous).map(o=>o.roles.find(x=>x.role===r.role).win).sort((a,b)=>a-b);return r.win>=xs[Math.floor(xs.length/2)];}));
lines.push(`在三类敌阵分别选综合分数最高、同分以剩余兵力差打破平手的预设，**${flexible.length} / 65** 人的最优预设会改变。**${comparable.length} / 24** 名普通武将在至少一个相同预设下达到名将样本的中位分数。统计使用单个种子、镜像及固定紧凑阵型，每个预设只有六场，不能作为已证明所有武将都有多种强势定位的结论。`,'',
'| 武将 | 类别 | 本框架最好基础预设 | 分数 | 另一种接近的基础预设 | 分数 |','|---|---|---|---:|---|---:|');
for(const name of ['关羽','张飞','赵云','黄忠','诸葛亮','郭嘉','郝昭','王平','满宠','庞德','陈宫','荀彧']){const p=officers.find(p=>p.name===name);if(!p)continue;const sorted=[...p.roles].sort((a,b)=>b.win-a.win||b.margin-a.margin),a=sorted[0],c=sorted.find(r=>r.role.split('-')[0]!==a.role.split('-')[0])||sorted[1];lines.push(`| ${p.name} | ${p.famous?'名将':'普通将'} | ${roleName(a.role)} | ${pct(a.win)} | ${roleName(c.role)} | ${pct(c.win)} |`);}
lines.push('','## 六队混编与水军局限','',
'| 六队模板 | 综合分数 |','|---|---:|',...summaries['verified-teams'].summary.map(t=>`| ${teamNames[t.key]} | ${pct(t.win)} |`),'',
'| 水陆模板 | 综合分数 |','|---|---:|',...summaries['verified-naval'].summary.map(t=>`| ${teamNames[t.key]} | ${pct(t.win)} |`),'',
'这些结果明确保留了尚未解决的问题：传统远程恢复仍占优；双骑和双兵器模板输出或生存不够稳定；当前水道地图上纯岸射对所测舰队具有明显优势。幻卫和减疗提供了有效工具，但没有消除远程体系优势。舰船需要敌舰、队友和岸线地形配合，不能作为通用陆战替代品；现有地图也没有强制争夺水面的战略目标。','',
'## 回归与复现','',
'252 项自动测试通过，涵盖 24 个新增战法逐项发动、真伤兵预算、减疗、净化、诅咒层数、幻卫次数、无反击链、奇门切后排优先级、实体／嘲讽限制、水陆布阵与寻路、兵器盲区与破门、状态序列化与确定性续战。新状态的周期反馈不重复触发施法演出。`npm run check` 通过。浏览器验证了新试炼入口、舰船六选三、后勤取舍、水道桥面和实际运行。','',
'```sh','npm test','npm run check',...tags.map(tag=>`node scripts/eight-troops-audit.mjs ${summaries[tag].mode} ${tag}`),'node scripts/report-eight-troops.mjs','```','',
'原始逐场记录为同目录对应 `.json.gz`，汇总为 `-summary.json`，包含战斗模块 SHA-256、阵容、种子、阵型和镜像标记。规则 16 保留当前保存、导入导出和确定性续战；不迁移旧存档。','');
writeFileSync(dir+'验证报告.md',lines.join('\n'));console.log(JSON.stringify({total,flexible:flexible.length,ordinaryComparable:comparable.length}));
