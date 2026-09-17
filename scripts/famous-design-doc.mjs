import {mkdirSync,writeFileSync} from 'node:fs';
import {FAMOUS_OFFICERS} from '../famous-officers.mjs';
import {PASSIVES,SKILL_ROUTES} from '../passives.mjs';
import {TACTICS_BOOK,SPECIAL_TACTICS,recommendedTacticIds} from '../tactics.mjs';
import {makeOfficer,TROOPS} from '../engine.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {OFFICER_MASTER_COLUMNS,OFFICER_MASTER_RECORDS} from './officer-master-data.mjs';
const rows=Object.entries(FAMOUS_OFFICERS);
const overviewKeys=['name','id','courtesy','role','type','formation','leadership','force','intellect','politics','charm','personality','righteousness','compatibility','sex','birth','death','passive0','passive1','passive2','passive3','passive4','special','threshold','cooldown'];
const overviewColumns=overviewKeys.map(key=>OFFICER_MASTER_COLUMNS.find(c=>c.key===key));
const lines=[`# 三国名将技能与专属战法设计（规则 ${RULES_VERSION}）`,'',
'本文件由 `node scripts/famous-design-doc.mjs` 从正式运行数据生成。技能名为游戏化设计，不作为史实叙述。',
'执行 `npm run docs:famous` 会同时更新项目根目录《技能设计表》和 docs 目录完整设计，保持内容与运行数值一致。',
'','## 范围与规则','',
`首批 ${rows.length} 位名将：原有 15 人，以及蜀、吴、魏、群雄代表人物 26 人。共 ${Object.keys(PASSIVES).length} 个被动定义、${Object.keys(TACTICS_BOOK).length} 个战法（26 个通用、41 个专属）。剩余 794 人暂不配置成长路线和专属战法。`,
'',
'- 2 / 3 / 5 / 8 / 10 级各解锁一个被动。原有 15 人成长路线保留；新增 26 人各有一个条件式十级个人技能。',
'- 被动技能不占战法槽，不需要施放、战意或军略进度；按固定路线随等级解锁。换兵种保留成长路线，兵种限定效果按当前兵种判断。',
'- 专属战法按武将编号绑定，1 级即可装备，占三槽之一；跨兵种保留使用权，其他武将不能装备。换兵种后需选择合法配装。',
'- 新局与试炼默认推荐专属＋功能补充＋低门槛战法；玩家手动三槽顺序始终是施放优先级。每步至多施放一次，战意不扣除，冷却彼此独立。',
'- 范围统一使用六边形距离。专属战法不作用于城门，不命中死亡、预备或撤退部队。多段、多目标攻击每次施放最多产生一次攻击战意。',
'- 直接伤害遵守武技对防御、谋略对军纪及兵力平方根衰减；火攻灼烧以施放时兵力快照结算，不产生战意。同一灼烧状态不叠加，弱灼烧不覆盖或续期正在生效的强灼烧。',
'- 援护优先救急，护盾按来源分层，同来源替换、总量不超过目标兵力上限；辅军、护持、解危等加成继续适用。冷却支援不缩短自身冷却。',
'- 眩晕、混乱遵守军纪减免与免控窗口；封技遵守军纪减免。控制与负面状态可以净化。',
'- 黄盖、董卓自损计入战损及伤兵，不产生战意，不被护盾代付，保留至少 1 人。',
'- 延续项目当前存档政策：规则版本升级为 9，仅接受当前规则存档，不迁移旧版。更新后需新开局或重开试炼。',
'','## 名将字段总表','',
`本表合并名将能力、人物资料、默认编制和技能配置。全量 ${OFFICER_MASTER_RECORDS.length} 人、${OFFICER_MASTER_COLUMNS.length} 个字段见 [Excel《三国武将全字段总表》](../outputs/01a0afe4-3c50-7823-bc9c-3c5162ff18bf/三国武将全字段总表.xlsx)。原始来源编号与当前游戏编号分列，未设计技能明确标注，不以通用技能代填。`,
'',
`| ${overviewColumns.map(c=>c.label).join(' | ')} |`,
`| ${overviewColumns.map(()=>'---').join(' | ')} |`,
...OFFICER_MASTER_RECORDS.filter(r=>FAMOUS_OFFICERS[r.id]).map(r=>`| ${overviewColumns.map(c=>r[c.key]??'未载').join(' | ')} |`),
'','## 角色与成长路线','',
'| 武将（编号） | 战术定位 | 推荐兵种 | 2级 | 3级 | 5级 | 8级 | 10级 |',
'| --- | --- | --- | --- | --- | --- | --- | --- |',
...rows.map(([id,p])=>`| ${p.name}（${id}） | ${p.role} | ${TROOPS[p.type].name} | ${SKILL_ROUTES[id].map(k=>PASSIVES[k].name).join(' | ')} |`),
'','## 专属战法与默认配装','',
'数值为连携和被动加成前的基础值。伤害系数不是最终兵力伤害；实际结果还受兵力、属性、减伤和护盾影响。',
'',
'| 武将 | 专属战法 | 战意 | 冷却（步） | 效果 | 默认三槽顺序 |',
'| --- | --- | --- | --- | --- | --- |',
...rows.map(([id,p])=>{const s=TACTICS_BOOK[SPECIAL_TACTICS[id]];return `| ${p.name} | ${s.name} | ${s.threshold} | ${s.cooldown} | ${s.description} | ${recommendedTacticIds(makeOfficer(id)).map(k=>TACTICS_BOOK[k].name).join(' → ')} |`;}),
'','## AI 决策与克制','',
'1. 先检查槽位顺序、战意、冷却和合法目标。高优先级支援无收益时，继续检查下一槽，不空耗一次施法机会。',
'2. 群攻在合法射程内比较实际可覆盖敌军人数；保证主目标先结算。多人相邻容易吃火攻与控制，分散可降低收益。',
'3. 追斩战法优先选择低于 40% 兵力的敌军；破甲、疲弱优先选择尚无同类状态的目标。残兵需及时护盾、轮换。',
'4. 夺气、封技优先考虑高战意敌军；通用混乱避开已眩晕、混乱或免控的目标。军纪与净化可克制控制。',
'5. 支援按净化需求、兵力损失、身边威胁、战意缺口、可缩减冷却评估价值，最多处理两队。不为满状态且未接敌的友军空放护盾，不给同来源未消耗护盾反复续盾。',
'6. 相同收益以距离或稳定武将编号决定顺序；不增加随机选目标，固定种子可以复现。双方使用相同逻辑。',
'7. 个人技能强调条件：武圣依赖高兵力，锦骑、奇兵、飞将针对孤立目标，老当益壮依赖距离，都督与儒将针对灼烧，隐忍在第 40 步生效。可通过集结、接近、净化或压低兵力反制。',
'','## 被动效果表','',
'| 技能 | 类型 | 规则 |','| --- | --- | --- |',
...Object.values(PASSIVES).map(p=>`| ${p.name} | ${p.tier} | ${p.description} |`),
'','## 验证与入口','',
'运行 `npm test`、`npm run check`。平衡复测：`node scripts/skill-audit.mjs 16 docs/famous-v9-final`；设计文档：`npm run docs:famous`。',
'',
'游戏内进入「武将」搜索姓名，查看个人专属战法与五技能成长路线，选择 1～6 人开始试炼。名录展示设计信息；战斗属性、状态与战法记录展示实际生效结果。',
'',
'测试方法、调整前后数据和局限见 [名将平衡验证](名将平衡验证-2026-09-17.md)。',
''];
const dir=new URL('../docs/',import.meta.url);mkdirSync(dir,{recursive:true});
const content=lines.join('\n');
writeFileSync(new URL('名将技能与专属战法设计.md',dir),content);
writeFileSync(new URL('../技能设计表.md',import.meta.url),content
 .replace(`# 三国名将技能与专属战法设计（规则 ${RULES_VERSION}）`,`# 武将技能设计表（规则 ${RULES_VERSION}）`)
 .replace('(../outputs/','(outputs/')
 .replace('(名将平衡验证-2026-09-17.md)','(docs/名将平衡验证-2026-09-17.md)'));
console.log(`Updated both design documents for ${rows.length} officers.`);
