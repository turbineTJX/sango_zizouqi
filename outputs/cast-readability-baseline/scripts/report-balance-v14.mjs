import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {TACTICS_BOOK} from '../tactics.mjs';
import {TROOPS} from '../unit-stats.mjs';
import {COMMON_ROUTES,PASSIVES,SKILL_ROUTES,commonRouteKey} from '../passives.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
const dir='docs/balance-v14',read=name=>JSON.parse(name.endsWith('.gz')?gunzipSync(readFileSync(`${dir}/${name}`)):readFileSync(`${dir}/${name}`,'utf8'));
const before=read('before-profiles.json.gz'),candidate=read('candidate-profiles.json.gz'),valid=read('common-validated.json.gz'),extra=read('extra-validated.json.gz'),formation=read('formations.json.gz'),mixed=read('mixed.json.gz'),role=read('role-search.json.gz');
const variants=['pressure75','pressure65','pressure75guard'].map(name=>({name,...read(`${name}.json.gz`)}));
const mean=xs=>xs.reduce((n,x)=>n+x,0)/xs.length,round=n=>Math.round(n*100)/100,pct=n=>round(n*100)+'%',formatIds=ids=>ids.map(id=>TACTICS_BOOK[id].name).join(' → ');
const rows=[...valid.rows,...extra.rows],count=before.count+candidate.count+valid.count+extra.count+formation.rows.length+mixed.count+role.count+variants.reduce((n,v)=>n+v.rows.length,0);
const formalHashes=Object.fromEntries(Object.keys(extra.hashes).map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
assert.deepEqual(formalHashes,extra.hashes,'Final runtime differs from final holdout audit');
const summary=candidate.catalog.map(g=>{
 const screen=candidate.summary.find(x=>x.id===g.id),selected=screen.builds[0],builds=[...new Set(rows.filter(r=>r.id===g.id).map(r=>r.build))].map(build=>({build,ids:screen.builds.find(b=>b.key===build).ids,levels:[3,10].map(level=>{const rs=rows.filter(r=>r.id===g.id&&r.build===build&&r.level===level);return {level,games:rs.length,win:mean(rs.map(r=>r.win)),margin:mean(rs.map(r=>r.margin)),damage:mean(rs.map(r=>r.damage)),zeroCast:mean(rs.map(r=>Object.keys(r.casts).length?0:1)),matchups:Object.fromEntries([...new Set(rs.map(r=>r.enemy))].map(enemy=>[enemy,mean(rs.filter(r=>r.enemy===enemy).map(r=>r.win))]))};})}));
 return {...g,selected:selected.key,builds};
});
const result=(g,level=10)=>g.builds.find(b=>b.build===g.selected).levels.find(r=>r.level===level);
const specialGap=g=>{const spec=g.builds.find(b=>b.build.endsWith('Special')),basic=g.builds.find(b=>!b.build.endsWith('Special'));return spec?spec.levels[1].margin-basic.levels[1].margin:null;};
const ordinary=summary.filter(g=>!g.famous),named=summary.filter(g=>g.famous),selectedSpecial=named.filter(g=>g.selected.endsWith('Special')).length;
const routeCounts={};for(const u of OFFICER_CATALOG.filter(u=>!SKILL_ROUTES[u.id])){const k=commonRouteKey(u);routeCounts[k]=(routeCounts[k]||0)+1;}
const labels=formation.labels;
const budget={screening:before.count+candidate.count,officerValidation:valid.count+extra.count,formations:formation.rows.length,rejectedVariants:variants.reduce((n,v)=>n+v.rows.length,0),mixed:mixed.count,roleSearch:role.count,total:count};
writeFileSync(`${dir}/summary.json`,JSON.stringify({budget,formalHashes,routeCounts,selectedSpecial,officers:summary,formations:formation.summary,mixed:mixed.summary,roles:role.summary},null,2));
const tableOfficers=gs=>['| 武将 | 被测兵种 | 筛选后固定配装 | 3级得分率 | 10级得分率 | 10级专属方案－基础方案余兵差 |','|---|---|---|---:|---:|---:|',...gs.map(g=>`| ${g.name} | ${TROOPS[g.type].name} | ${formatIds(g.builds.find(b=>b.build===g.selected).ids)} | ${pct(result(g,3).win)} | ${pct(result(g).win)} | ${specialGap(g)===null?'—':round(specialGap(g))} |`)];
const groupName={famousA:'名将甲',famousB:'名将乙',famousC:'名将丙',commonA:'通用甲',commonB:'通用乙',commonC:'通用丙',mixedA:'混编甲',mixedB:'混编乙'};
const lines=['# 阵容、名将与普通武将平衡验证（规则 14）','',`本轮 ${count.toLocaleString('en-US')} 场战斗，另有 225 项回归测试及语法检查通过。正式修改是为其余 794 人补齐五项通用成长；首批 41 位名将的基础属性、个人被动及专属参数保持本轮开始时的数值。ZOC 及挑衅、追击保持规则 13 行为。`,'','## 结论与已落实的修改','',
'1. **普通武将的成长缺口已补上。** 之前首批 41 人之外的武将路线为空，即使升到 10 级也没有成长技能。现在全部 835 人均有五项技能，普通人物按能力特点获得兵种修习、谋攻或辅军路线。不是将每个人改成同样属性；通用高阶技能与名将条件式专属保留不同优势。',
'2. **普通武将有可验证的上场价值，尚不能证明全员任意配装均衡。** 在独立种子和新增敌阵的六类对手中，郝昭枪兵护卫队得分率 81.25%，王平弓兵输出队 97.92%，满宠弩兵护卫队 47.57%。这些是该武将配固定队友的部队成绩；不同兵种使用的队友不同，不可按这些数跨兵种做单将强度排名。24 位普通样本之外只做了全量成长合法性和现有名录回归，不声称其余 770 人都完成平衡实战。',
'3. **名将不等于必选，专属也不是必带。** 在预设配装筛选中，41 人有 '+selectedSpecial+' 人选出含专属的最高余兵差方案；其余选择三通用。夏侯渊、黄忠在受保护弓兵模板中接近满分，王平也接近同水平，说明强度不能只归功于专属。沮授、荀攸的专属支援对所测方案有正收益；许褚、于禁等在护卫任务中换掉关键通用技能后明显吃亏，不能据此认定本人弱。',
'4. **阵容仍不均衡，不能宣布平衡完成。** 三队双前排＋输出得分率 92.81%，六队控制火攻 90.94%；三骑分别 12.66%／14.84%。控制火攻对双前排在三队为 53.13%、六队为 96.88%，说明“双前排无敌”不成立，但优势仍集中在保护＋持续输出。纯辅助阵容不强，并不代表具体辅助组合没有过高收益。',
'5. **换配装与换兵种能改变职责，但目前收益不够普遍。** 关羽与黄忠、诸葛亮同队，针对三骑时枪兵方案得分率 100%，骑兵方案 25%；对双前排两者均为 0%。郝昭对三骑改用贯阵→枪阵→奋击，相比固定通用方案多出约 1026 余兵差，能承担更主动的输出职责。若某个场景选择在独立种子或分散站位上反而变差，也一并记录，没有只保留成功例子。',
'6. **未采用三组近战压制方案。** 弓弩贴身普攻 −25%／−35% 虽提高突破队成绩，却使三队双前排由 92.81% 升到 96.25%／96.88%；再降低枪阵减伤也没有消除火攻阵优势。正式规则没有加入这些削弱，避免拿一个偏差换另一个偏差。','',
'## 普通成长如何区分','',
'均在 2／3／5／8／10 级解锁，不占三战法槽。路线按名录源数据固定，换兵种保留路线，兵种限定技能随当前兵种决定是否生效。优先辅军条件：政治≥80，且政治≥智力、政治≥武力+15；其次谋攻条件：智力≥65 且智力≥武力+15；其余按来源兵种。未改原始人物属性，未给普通人物添加专属战法或军略。','',
'| 路线 | 五项技能 | 当前普通人物数 |','|---|---|---:|',...Object.entries(COMMON_ROUTES).map(([key,ids])=>`| ${{spear:'步阵',cavalry:'骑战',archer:'弓术',crossbow:'弩术',strategist:'谋攻',support:'辅军'}[key]} | ${ids.map(id=>PASSIVES[id].name).join(' → ')} | ${routeCounts[key]||0} |`),'',
'弩术通用路线保留供通用单位使用；当前名录中普通人物没有以弩兵作为源兵种的条目，谋士可改为弩兵但仍沿用个人谋攻／辅军路线。','',
'## 名将强度表：六类对手的独立复核','',
'每个配装、每个等级 144 场：四类原场景各 6 新种子，另外控制火攻／双破甲弩各 6 新种子，均两阵形、交换先后手。表内固定方案来自筛选种子，不是在复核结果中重新挑出的最高值。“专属差”比较预先选定的最佳基础方案和最佳含专属方案，是配装机会成本，不是简单关闭专属技能的增益。','',
...tableOfficers(named),'','## 未设专属的 24 位代表武将','',...tableOfficers(ordinary),'',
'“普通”仅指本原型未进入首批 41 位专属设计的人，不是对历史知名度或才干的判断。低分仍有明确问题，例如普通骑兵与骑兵名将在单前排模板中都较弱；补齐成长并没有自动修复其阵容反制。','',
'## 11 种阵容：三队与六队','',
'| 阵容 | 三队得分率 | 六队得分率 | 三队对双前排 | 六队对双前排 |','|---|---:|---:|---:|---:|',
...formation.summary[0].teams.map(t=>{const s=formation.summary[1].teams.find(x=>x.team===t.team);return `| ${t.label} | ${pct(t.win)} | ${pct(s.win)} | ${t.team==='doubleFront'?'—':pct(t.matchups.doubleFront)} | ${t.team==='doubleFront'?'—':pct(s.matchups.doubleFront)} |`;}),'',
'每个兵种模板四维 80、每队 3000 人、10 级，保留通用被动。11 种阵容两两交手，贴身／分散两种站位，8 种子、交换双方，共 3520 场。六队为每套三队重复一组，仍受同一地图空间约束。与前轮 85 四维、8 阵容实验的百分比不能直接作因果比较。','',
'## 六队名将、普通与混编对局','',
'统一两枪、一骑、两弓、一弩的结构及阵位，各自保留实际四维与个人路线。两级别、两阵型、8 个额外种子，双向对局。含重复武将身份的两队不交手，因此只比较共同对手或下面完整矩阵，不用缺失场次填败场。军团主副将加成与主动军略关闭，人物初始关系仍参与连携。','',
'| 队伍 | 六人名单 |','|---|---|',...Object.entries(mixed.groups).map(([key,names])=>`| ${groupName[key]} | ${names.join('、')} |`),'',
...mixed.summary.flatMap(s=>['### '+s.level+' 级','',`| 我方／敌方 | ${Object.values(groupName).join(' | ')} |`,`|---|${Object.keys(groupName).map(()=>'---:').join('|')}|`,...s.teams.map(t=>`| ${groupName[t.key]} | ${Object.keys(groupName).map(k=>t.matchups[k]===undefined?'—':pct(t.matchups[k])).join(' | ')} |`),'']),
'10 级通用甲对名将甲得分率 87.5%，对名将乙 29.69%；混编乙对名将乙 43.75%。普通人物有竞争力，较强名将组合仍有优势。通用丙几乎全败，说明不能只看“已有五技能”就认定配将合理；其弓位含辅军路线荀彧、转兵种文聘，无法获得普通弓手同样的完整被动收益。','',
'## 全组合筛选与换兵种复核','',
'选取关羽、吕布、张飞、郝昭、王平、满宠、庞德，合计 9 个兵种／队友配置。每个配置穷举六基础选三的 20 组合；有专属则穷举七选三的 35 组合，按门槛排序施放，另加入角色预设顺序。不是穷举每种组合的全部 6 个槽位排列。筛选只用贴身阵形与 2 个种子；复核改用 6 个独立种子和两阵形，比较按敌阵挑选的方案与固定方案。','',
'| 武将／兵种 | 对手 | 按场景选择 | 固定方案得分率 | 场景方案得分率 | 余兵差变化 |','|---|---|---|---:|---:|---:|',
...role.summary.flatMap(g=>g.contexts.map(c=>`| ${g.name}／${TROOPS[g.type].name} | ${labels[c.enemy]} | ${formatIds(c.selected)} | ${pct(c.fixedResult.win)} | ${pct(c.selectedResult.win)} | ${round(c.selectedResult.margin-c.fixedResult.margin)} |`)),'',
'关羽使用黄忠＋诸葛亮真实队友；吕布与庞德骑兵配置把一个远程队友换成控制枪兵。其余用统一通用队友。关羽对双前排仍无法取胜、部分按场景选择在新站位变差，说明多定位与组合取舍只得到部分支持。','',
'## 未采用方案的对照','',
'| 规则 | 三队双前排 | 三队突破 | 六队双前排 | 六队火攻 | 六队突破 |','|---|---:|---:|---:|---:|---:|',
...[{name:'正式：无近战普攻惩罚',...formation},...variants].map(v=>{const get=(n,t)=>pct(v.summary.find(s=>s.count===n).teams.find(r=>r.team===t).win);return `| ${v.name} | ${get(3,'doubleFront')} | ${get(3,'breach')} | ${get(6,'doubleFront')} | ${get(6,'flames')} | ${get(6,'breach')} |`;}),'',
'pressure75：弓弩贴身面对仍有 ZOC 的敌方近战时，普攻攻击力 ×0.75；pressure65 改为 ×0.65；pressure75guard 另将枪阵减伤从 30% 降至 20%。均仅在隔离副本实验。','',
'## 方法边界与后续优先项','',
`- 场数：前后筛选 ${budget.screening}；普通／名将独立复核 ${budget.officerValidation}；阵容 ${budget.formations}；未采用方案 ${budget.rejectedVariants}；真人混编 ${budget.mixed}；配装全组合及复核 ${budget.roleSearch}。总计 ${budget.total}。`,
'- 所有对局合法配装、零战意开始，用正式 lockDeployment／stepBattle 跑到结算，无旧式待施放状态、无瞬移开战、无预置控制。得分率胜=1、平=0.5、败=0；余兵差=己方存活兵力－敌方存活兵力。单将伤害列只计可直接归属该武将的效果事件，不以其替代团队收益。',
'- 名将／普通样本的三队模板：近战人物配弓、弩；远程人物配护卫枪、弓。模板不同使跨兵种总榜不成立。武将属性保持真实，通用队友和敌军统一 80 四维；来源兵种不含普通弩兵，所以部分普通谋士合法改为弩兵，前后版本做相同改动。',
'- 初筛每人三个基础角色预设，有专属则增加三个含专属预设。独立复核固定两类最佳候选，不遍历 41 人全部兵种／战法组合；全组合只在上列 7 人展开。选择依据是全队余兵差，不能将表内低得分直接等同于人物全局强度。',
'- 配对、镜像和独立种子减少先后手与筛选偏差，但未给本有限场景样本伪造全游戏置信区间。未覆盖玩家手动军略、援军轮换、攻城、全名录 835 人的所有组合或经济招募成本。',
'- 待处理的平衡重点：保护＋火攻／弓兵持续输出仍过强；骑兵突破阵的伤害／存活窗口不足；部分名将专属与护卫槽位冲突。应分别测试接敌路径与出手窗口、火攻阵的克制手段、专属替换不同槽位，避免全局削弱弓弩后反而让双前排更强。',
'- 已完成：794 人成长缺口修复，名录与技能文档同步，普通人物不同路线、换兵种取舍、真实施法和确定性续战回归。225 项测试通过，浏览器已确认满宠显示铁壁／严整／护持／镇定／辅军。未增加旧档迁移。','',
'## 数据与复测','',
'原始逐场数据压缩存于本目录 *.json.gz，摘要为 *-summary.json；summary.json 汇总全部结果。每个运行副本保留根模块 SHA-256。早期实验快照尚标规则 13，但已包含候选通用成长；最后新增敌阵复核使用正式规则 14，源文件散列与当前代码一致。改号前后仅版本号、人物标签和文案不同，核心战斗与成长参数一致。','',
'```powershell',
'node scripts/officer-balance-audit.mjs candidate',
'node scripts/officer-balance-validation.mjs common-validated',
'node scripts/officer-balance-validation.mjs extra-validated . --extra',
'node scripts/formation-balance-audit.mjs',
'node scripts/mixed-officer-teams.mjs',
'node scripts/officer-role-search.mjs',
'node scripts/report-balance-v14.mjs',
'npm test',
'npm run check',
'```','',
'旧规则前测需显式传入当时规则 13 的运行目录；baseline-path.txt 为本机快照路径。实验方案由 balance-variants.mjs 创建隔离目录，路径记录在 variant-paths.json，传给 formation-balance-audit.mjs 即可复测。报告需要保留前测和未采用方案的数据，不覆盖历史目录。',''];
writeFileSync(`${dir}/平衡验证报告.md`,lines.join('\n'));
console.log(JSON.stringify({budget,routeCounts,selectedSpecial,ordinary:ordinary.map(g=>({name:g.name,win:result(g).win})),named:named.map(g=>({name:g.name,win:result(g).win,specialGap:specialGap(g)}))},null,2));
