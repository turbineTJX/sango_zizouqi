import {mkdirSync,writeFileSync} from 'node:fs';
import {FAMOUS_OFFICERS} from '../famous-officers.mjs';
import {PASSIVES,SKILL_ROUTES,CIVIC_ROUTES} from '../passives.mjs';
import {TACTICS_BOOK,SPECIAL_TACTICS,recommendedTacticIds} from '../tactics.mjs';
import {makeOfficer,TROOPS,STRATAGEMS,OFFICER_STRATAGEMS} from '../engine.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {OFFICER_MASTER_COLUMNS,OFFICER_MASTER_RECORDS} from './officer-master-data.mjs';
import {exportGameOfficerTable,GAME_COLUMNS} from './game-officer-table.mjs';
const rows=Object.entries(FAMOUS_OFFICERS);
const overviewKeys=['name','id','courtesy','status','role','type','formation','leadership','force','intellect','politics','charm','personality','righteousness','compatibility','sex','birth','death','passive0','passive1','passive2','passive3','passive4','special','threshold','cooldown'];
const overviewColumns=overviewKeys.map(key=>OFFICER_MASTER_COLUMNS.find(c=>c.key===key));
const lines=[`# 三国名将技能与专属战法设计（规则 ${RULES_VERSION}）`,'',
'本文件由 `node scripts/famous-design-doc.mjs` 从正式运行数据生成。技能名为游戏化设计，不作为史实叙述。',
'人物字段采用来源剧本覆盖后的设定；性格、义理及关系修正见 [武将字段核对](武将字段核对-2026-09-19.md)。',
'当前先讨论 [共享基础技能池](基础技能池-设计草案.md)。本表记录运行数据，不表示人物分配已定稿；普通武将无需配备专属或强力技能。',
'执行 `npm run docs:famous` 会同时更新 CSV 武将总表、字段说明、项目根目录《技能设计表》和 docs 目录完整设计，保持内容与运行数值一致。',
'技能参考《三国志11》的战斗、内政与外交特技；专属战法重点参考《12》《14》；军略承担全军指挥。具体结算与外交预留边界见 [规则31：武将特技与军略](武将特技与军略-规则31.md)。历史参考资料见 [系列参考与机制适配](系列参考与机制适配.md)。',
'','## 范围与规则','',
`共有 ${rows.length} 位名将拥有专属战法。共 ${Object.keys(PASSIVES).length} 项技能定义（含内政和外交预留）、${Object.keys(TACTICS_BOOK).length} 个战法（${Object.values(TACTICS_BOOK).filter(s=>!s.special).length} 个通用、${Object.values(TACTICS_BOOK).filter(s=>s.special).length} 个专属）。另有 ${Object.keys(CIVIC_ROUTES).length} 位武将拥有固定内政交涉路线；其余普通武将按人物能力和默认兵种确定五项成长。`,
'',
'- 2 / 3 / 5 / 8 / 10 级各解锁一个被动。所有武将保留五项成长结构，部分八级节点替换为截气／断势；26 位扩展名将的十级技能改为本队面板强化；戟兵、后勤、兵器、舰船补充兵种专精。',
'- 三层分工：技能涵盖战斗、内政和外交预留；战法偏向单体或附近主动效果；军略以全军、全体敌军及援军调度为作用范围。战法仍由战意和冷却自动触发。',
'- 内政技能只有武将任本城太守时生效，收入仍受围城停产与库存上限约束；在城待命但未任太守不加成。太守每个正常结算旬获得 100 治政经验，外交预留技能当前无实际加成。',
'- 被动技能不占战法槽，不需要施放、战意或军略进度；按固定路线随等级解锁。换兵种保留成长路线，兵种限定效果按当前兵种判断。',
'- 专属战法按武将编号绑定，1 级即可装备，占三槽之一；跨兵种保留使用权，其他武将不能装备。换兵种后需选择合法配装。',
'- 新局与试炼提供初始配装；每兵种六个基础战法，配装页可按输出、护卫或控场定位自由改配，也可放弃专属。玩家手动三槽顺序始终是施放优先级。每步至多施放一次，战意不扣除，冷却彼此独立。',
'- 范围统一使用六边形距离。专属战法不作用于城门，不命中死亡、预备或撤退部队。伤害战法不为施法者增加攻击战意；同次多段战法对同一目标只计一次受击战意。',
'- 直接伤害遵守武技对防御、谋略对军纪及当前现役兵力对应的面板威力；火攻灼烧以施放时兵力快照结算，不产生战意。灼烧最多三层，每次施加增加一层并刷新持续时间，保留较强的单层快照；净化清空整组层数，停止续叠后会过期。',
'- 辅助专属分工：曹操为附近两队加盾与攻防；荀攸净化并加盾；于禁为附近两队减伤；袁绍为附近两队增攻；沮授单队厚盾；刘备为附近最多两队伤兵救治并增加攻防；孙权单队解控与缩冷却；鲁肃单队补充战意。均受施法距离和目标数限制，军略保持全局覆盖。',
'- 援护优先救急，护盾按来源分层，同来源替换、总量不超过目标兵力上限；辅军、护持、解危等加成继续适用。冷却支援不缩短自身冷却。',
'- 谋略控制遵守军纪减免，眩晕、混乱遵守免控窗口；封技遵守军纪减免。控制与负面状态可以净化。',
'- 黄盖、董卓自损计入战损及伤兵，不产生战意，不被护盾代付，保留至少 1 人。',
`- 延续项目当前存档政策：当前规则版本 ${RULES_VERSION}，仅接受当前规则存档，不迁移旧版。更新后需新开局或重开试炼。`,
'','## 全量武将总表','',
`完整大表：[武将总表 CSV](武将总表-本游戏.csv)，共 ${OFFICER_MASTER_RECORDS.length} 人、${GAME_COLUMNS.length} 个字段；口径见 [字段说明](武将总表-字段说明.md)。包含人物资料、五项技能及效果、专属战法、默认与推荐配装、军略、1级和10级属性、带兵上限、战意收入及战役出场。下表列出全部武将的主要字段。无专属是当前有效配置，不是待补设计。`,
'',
`| ${overviewColumns.map(c=>c.label).join(' | ')} |`,
`| ${overviewColumns.map(()=>'---').join(' | ')} |`,
...OFFICER_MASTER_RECORDS.map(r=>`| ${overviewColumns.map(c=>r[c.key]??(['threshold','cooldown'].includes(c.key)?'不适用':'未载')).join(' | ')} |`),
'','## 角色与成长路线','',
'| 武将（编号） | 战术定位 | 推荐兵种 | 2级 | 3级 | 5级 | 8级 | 10级 |',
'| --- | --- | --- | --- | --- | --- | --- | --- |',
...rows.map(([id,p])=>`| ${p.name}（${id}） | ${p.role} | ${TROOPS[p.type].name} | ${SKILL_ROUTES[id].map(k=>PASSIVES[k].name).join(' | ')} |`),
'','## 内政交涉固定路线','',
'五个节点同样在 2／3／5／8／10 级解锁。外交预留条目即使达到等级也不生效。鲁肃、刘备等名将的混合路线列于上表。','',
'| 武将 | 2级 | 3级 | 5级 | 8级 | 10级 |',
'| --- | --- | --- | --- | --- | --- |',
...Object.entries(CIVIC_ROUTES).map(([id,route])=>`| ${makeOfficer(id).name} | ${route.map(key=>PASSIVES[key].name+(PASSIVES[key].available===false?'（外交预留）':'')).join(' | ')} |`),
'','## 专属战法与默认配装','',
'数值为连携和被动加成前的基础值。伤害系数不是最终兵力伤害；实际结果还受兵力、属性、减伤和护盾影响。',
'',
'| 武将 | 专属战法 | 战意 | 冷却（步） | 效果 | 默认三槽顺序 |',
'| --- | --- | --- | --- | --- | --- |',
...rows.map(([id,p])=>{const s=TACTICS_BOOK[SPECIAL_TACTICS[id]];return `| ${p.name} | ${s.name} | ${s.threshold} | ${s.cooldown} | 基础效果：${s.description}；威力及概率详见 [统一规则](战法威力与概率规则.md) | ${recommendedTacticIds(makeOfficer(id)).map(k=>TACTICS_BOOK[k].name).join(' → ')} |`;}),
'','## 通用战法完整表','',
'每兵种六选三；专属可替换其中一槽。以下为基础效果，威力成长、概率、地形与连携继续按统一规则结算。','',
'| 战法 | 类别 | 战意 | 冷却（步） | 效果 |',
'| --- | --- | --- | --- | --- |',
...Object.values(TACTICS_BOOK).filter(s=>!s.special).map(s=>`| ${s.name} | ${s.category==='force'?'武技':'谋略'} | ${s.threshold} | ${s.cooldown} | ${s.description} |`),
'','## 军略完整表','',
'军略由主将、军师提供，使用军略条手动发动；敌军由 AI 使用相同规则。每次需蓄满 12000 进度并消耗整条，同一军略冷却 8 步。持续时间以战斗步计；军略不占个人战法槽，也不消耗个人战意。','',
'即时鼓舞、夺气、镇静、缩冷却覆盖在场及预备队；救疗与火攻仅处理施放时在场部队。全军属性效果在持续期内也作用于后续入场者，持续救疗仅处理当步在场伤兵。断援和后军固阵作用于预备队调度。','',
'| 军略 | 用途 | 持续（步） | 效果 | 提供武将（须任主将或军师） |',
'| --- | --- | --- | --- | --- |',
...Object.entries(STRATAGEMS).map(([id,s])=>`| ${s.name} | ${{support:'支援',offense:'进攻',control:'压制'}[s.group]} | ${s.duration||'即时'} | ${s.description} | ${Object.entries(OFFICER_STRATAGEMS).filter(([,ids])=>ids.includes(id)).map(([officer])=>makeOfficer(officer).name).join('、')} |`),
'','## AI 决策与克制','',
'1. 先检查槽位顺序、战意、冷却和合法目标。高优先级支援无收益时，继续检查下一槽，不空耗一次施法机会。',
'2. 群攻在合法射程内比较实际可覆盖敌军人数；保证主目标先结算。多人相邻容易吃火攻与控制，分散可降低收益。',
'3. 追斩战法优先选择低于 40% 兵力的敌军；破甲、疲弱优先选择尚无同类状态的目标。残兵需及时护盾、轮换。',
'4. 夺气、封技优先考虑高战意敌军；通用混乱避开已眩晕、混乱或免控的目标。军纪与净化可克制控制。',
'5. 支援按净化需求、兵力损失、身边威胁、战意缺口、可缩减冷却评估价值，最多处理两队。不为满状态且未接敌的友军空放护盾，不给同来源未消耗护盾反复续盾。',
'6. 相同收益以距离或稳定武将编号决定顺序；不增加随机选目标，固定种子可以复现。双方使用相同逻辑。',
'7. 个人技能直接强化本队面板：武圣强化骑兵攻击与攻速，龙胆强化骑兵防御与军纪；老当益壮与儒将依赖驻足，奇兵与飞将依赖本队相邻无友军，隐忍在第 40 步生效。换兵种保留路线，但不符合兵种时失效。即使不装备专属战法，符合条件的面板加成仍生效。',
'','## 被动效果表','',
'| 技能 | 类型 | 领域 | 实现状态 | 规则 |','| --- | --- | --- | --- | --- |',
...Object.values(PASSIVES).map(p=>`| ${p.name} | ${p.tier} | ${{battle:'战斗',domestic:'内政',diplomacy:'外交'}[p.domain]} | ${p.available===false?'预留未开放':'已实现'} | ${p.description} |`),
'','## 验证与入口','',
'运行 `npm test`、`npm run check`。平衡复测：`node scripts/skill-audit.mjs 16 docs/famous-v9-final`；设计文档：`npm run docs:famous`。',
'',
'游戏内进入「武将」搜索姓名，查看个人专属战法与五技能成长路线，选择 1～6 人开始试炼。名录展示设计信息；战斗属性、状态与战法记录展示实际生效结果。',
'',
'早期版本的测试方法、调整前后数据和局限见 [名将平衡验证（历史报告）](名将平衡验证-2026-09-17.md)，不作为当前规则版本的强度结论。',
''];
const dir=new URL('../docs/',import.meta.url);mkdirSync(dir,{recursive:true});
const content=lines.join('\n');
exportGameOfficerTable();
writeFileSync(new URL('名将技能与专属战法设计.md',dir),content);
writeFileSync(new URL('../技能设计表.md',import.meta.url),content
 .replace(`# 三国名将技能与专属战法设计（规则 ${RULES_VERSION}）`,`# 武将技能设计表（规则 ${RULES_VERSION}）`)
 .replace('(../outputs/','(outputs/')
 .replaceAll('(武将总表-本游戏.csv)','(docs/武将总表-本游戏.csv)')
 .replaceAll('(武将总表-字段说明.md)','(docs/武将总表-字段说明.md)')
 .replaceAll('(武将字段核对-2026-09-19.md)','(docs/武将字段核对-2026-09-19.md)')
 .replaceAll('(战法威力与概率规则.md)','(docs/战法威力与概率规则.md)')
 .replaceAll('(系列参考与机制适配.md)','(docs/系列参考与机制适配.md)')
 .replaceAll('(武将特技与军略-规则31.md)','(docs/武将特技与军略-规则31.md)')
 .replaceAll('(基础技能池-设计草案.md)','(docs/基础技能池-设计草案.md)')
 .replace('(名将平衡验证-2026-09-17.md)','(docs/名将平衡验证-2026-09-17.md)'));
console.log(`Updated both design documents for ${OFFICER_MASTER_RECORDS.length} officers (${rows.length} with special tactics).`);
