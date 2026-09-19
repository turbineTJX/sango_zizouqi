import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {OFFICER_MASTER_COLUMNS,OFFICER_MASTER_RECORDS} from './officer-master-data.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {makeOfficer,unitAttributes,officerStratagems,STRATAGEMS,TROOPS,FACTIONS} from '../engine.mjs';
import {skillRoute,SKILL_LEVELS,PASSIVES,intentIncome,commonRouteKey,SKILL_ROUTES,CIVIC_ROUTES} from '../passives.mjs';
import {availableTactics,unitTactics,recommendedTacticIds,validLoadout,TACTIC_ROLES,TACTICS_BOOK,SPECIAL_TACTICS} from '../tactics.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {RULES_VERSION,COMBAT} from '../combat-rules.mjs';
import {HISTORICAL_CAMPAIGNS} from '../historical-campaigns.mjs';
import {newCampaign} from '../strategic-campaign.mjs';

// Export the implemented game model, not a speculative replacement for source data.
const omit=new Set(['campaign','available','spearLv','halberdLv','crossbowLv','rideLv','machineLv','waterLv','features']);
const retained=OFFICER_MASTER_COLUMNS.filter(c=>!omit.has(c.key)&&!c.key.startsWith('source-'));
const notes={
 status:'专属成长=固定名将路线；内政交涉成长=按人物身份配置的混合路线；通用成长=按来源人物能力和默认兵种确定。外交预留以技能状态列为准。',
 role:'名将取正式战术定位，其他武将取通用成长路线名称。不是玩家必须选择的配装。',
 charm:'本游戏名录保留的魅力值，仅展示和排序，不参与战斗公式。',
 stratagem:'任主将或军师时解锁；无配置者写“无个人军略”，不推测未实现技能。',
 special:'无个人专属是当前有效配置，仍能使用兵种通用战法，不属于漏填。',
 personality:'武将库人物采用来源 Scenario.personSet 的性格覆盖值；自建人物采用自建库。未作为战斗AI性格参数。',
 righteousness:'武将库人物采用来源 Scenario.personSet 的义理覆盖值；自建人物采用自建库。未执行原库的背叛概率，也不是当前忠诚。',
 personalityCode:'性格原始编号；1胆小、2冷静、3刚胆、4莽撞。自建0表示未设置。',
 righteousnessCode:'义理原始编号；1容易背叛、2无情义、3普通、4情理坚定、5不会背叛。自建0表示未设置。',
 sourceId:'来源人物编号；与来源类别共同确定人物，不按姓名连接。',
 compatibility:'来源人物相性资料，不能当作当前两将关系分值。',
 birth:'人物资料年份；空值为来源未载，不代表0年。',death:'人物资料年份；空值为来源未载。',
 bio:'人物资料文本，供名录阅读，不自动产生技能。',
 trait:'makeOfficer 返回的角色说明，不是额外可叠加被动。',
};
export const GAME_COLUMNS=retained.map(c=>({key:c.key,label:c.label,group:c.group,description:notes[c.key]||(
 c.key.startsWith('base-')?'默认兵种、1级、3000现役、无军团/地形/战斗状态加成的面板快照。':
 c.key.startsWith('passiveEffect')?'对应等级被动的当前效果说明；需达到等级及满足说明中的条件。':
 c.key.startsWith('passive')?'按实际 skillRoute 读取，非从原始 FeatureList 推测。':
 c.key.startsWith('initial-')?'makeOfficer 的新建默认值；不代表任一进行中的存档。':
 c.key.startsWith('equipped')?'新建武将实际默认配装，顺序即自动战法优先级。':
 c.key.startsWith('recommended')?'固定展示种子下1级已学战法，实际随开局种子与升级变化。':
 c.group==='关系'?'初始人物关系，姓名带游戏ID区分同名人物；运行存档中可有另外设置。':
 c.group==='战法'?'当前战法定义；数值为基础值，实际结算还受威力、抗性、连携、状态与地形影响。':
 '按当前游戏人物数据读取。')}));
const add=(key,label,group,description)=>GAME_COLUMNS.push({key,label,group,description});
add('rules','规则版本','口径','生成时的运行规则版本。');
add('routeKey','成长路线编号','成长','固定名将记录其武将ID，普通人物记录通用路线键。换兵种不重置已确定的成长路线。');
for(let i=0;i<5;i++)add(`passiveId${i}`,`${SKILL_LEVELS[i]}级技能编号`,'成长','与效果列逐项对应的正式被动ID。');
for(let i=0;i<5;i++){
 add(`passiveDomain${i}`,`${SKILL_LEVELS[i]}级技能领域`,'成长','战斗、内政或外交；内政仅任太守时生效。');
 add(`passiveAvailability${i}`,`${SKILL_LEVELS[i]}级技能实现状态`,'成长','已实现或预留未开放；达到解锁等级不等于外交系统已开放。');
}
for(const level of [1,10]){
 add(`capacity${level}`,`${level}级带兵上限`,'部队','floor((3000 + 统率×50 + (等级−1)×200)/100)×100；伤兵也占名额。');
 add(`intentAttack${level}`,`${level}级普攻战意`,'部队','一次普攻命中的基础战意收入，包含该等级已解锁振奋。伤害战法不给施法者攻击战意。');
 add(`intentHit${level}`,`${level}级受击战意`,'部队','存活受直接伤害时的基础收入，包含坚忍。同次多段只计一次；截气、断势等可阻止收入。');
}
for(const [key,label] of [['attack','攻击'],['defense','防御'],['martialPower','武技威力'],['strategyPower','谋略威力'],['discipline','军纪'],['move','移速'],['range','射程'],['attackSpeed','每秒普攻次数'],['siege','攻城属性']])
 add('level10-'+key,`10级${label}`,'部队','默认兵种、3000兵、无战场/军团/地形状态，包含静态及满兵条件被动；邻接、孤立、预备入场等须在战场结算。');
add('attackInterval','普攻间隔（步）','部队',`1级兵种间隔，1步=${COMBAT.stepMs}毫秒；10级攻速受已解锁被动影响。`);
add('minRange','普攻最小射程','部队','兵器等兵种的普攻盲区限制，0表示无额外最小距离限制。');
add('beats','克制兵种','部队','TROOPS.beats 的本游戏兵种关系；无表示没有指定基础克制对象。');
add('availableIds','可选战法编号','战法','默认兵种的六个基础战法，加本人专属（如有）。改兵种后需重新按合法池配装。');
add('availableNames','可选战法','战法','与可选战法编号顺序一致。');
add('specialId','专属战法编号','战法','未配置个人专属时为空，其他武将不能装备本人的专属。');
add('specialPower','专属威力与概率','战法','游戏统一威力成长、控制命中与暴击规则；不是固定伤害结果。');
add('specialTerrain','专属地形影响','战法','当前战法的地形规则说明。');
for(let i=0;i<4;i++)for(const [part,label] of [['id','编号'],['category','类别'],['threshold','战意门槛'],['cooldown','冷却（步）'],['description','基础效果'],['powerDescription','威力与概率'],['terrainDescription','地形影响']])
 add(`equipped${i}-${part}`,`默认槽${i+1}${label}`,'战法','对应默认战法的当前运行定义；效果随实际兵力、威力、抗性和地形变化。');
for(const [key,label] of [['assault','输出'],['guard','护卫'],['control','控场']])add(`role-${key}`,`${label}配装方案`,'战法','历史职责模板，仅供解释战法分工；规则40按已学战法自动携带，不能自由套用。');
add('stratagemIds','个人军略编号','军略','与主将/军师解锁军略列对应。未配置为空。');
add('stratagemEffects','个人军略效果','军略','按当前 STRATAGEMS 读取，不把专属自动战法等同于军略。');
add('campaignPlacement','默认战役开局位置','战役','按 newCampaign 初始化结果读取在编或待命、势力和城池；未出现不等于已招募。');
add('historicalPlacement','历史战役出场','战役','按现有历史战役配置逐一列出阵营与兵种覆盖；不据史实推测归属。');

const campaign=newCampaign(521200);
const factionName=id=>FACTIONS[id]?.name||id;
const cityName=id=>campaign.cities.find(c=>c.id===id)?.name||id;
const placements=new Map();
for(const army of campaign.armies)for(const u of army.units)placements.set(u.id,`${factionName(army.faction)}／${army.name}／${cityName(army.location)}／在编`);
for(const item of campaign.campaign.idle)placements.set(item.unit.id,`${factionName(item.faction)}／${cityName(item.location)}／待命`);
const tidy=v=>typeof v==='number'?Number(v.toFixed(6)):v;
export const GAME_RECORDS=OFFICER_MASTER_RECORDS.map(base=>{
 const u=makeOfficer(base.id),high={...u,level:10},stats=unitAttributes(u),highStats=unitAttributes(high),route=skillRoute(u),special=TACTICS_BOOK[SPECIAL_TACTICS[u.id]];
 const r=Object.fromEntries(retained.map(c=>[c.key,base[c.key]]));
 r.stratagem=officerStratagems(u.id).map(k=>STRATAGEMS[k].name).join('、')||'无个人军略';
 r.special=special?.name||'无专属（使用兵种通用战法）';
 r.rules=RULES_VERSION;r.routeKey=SKILL_ROUTES[u.id]||CIVIC_ROUTES[u.id]?u.id:commonRouteKey(u);
 route.forEach((key,i)=>{r[`passiveId${i}`]=key;r[`passiveDomain${i}`]={battle:'战斗',domestic:'内政',diplomacy:'外交'}[PASSIVES[key].domain];r[`passiveAvailability${i}`]=PASSIVES[key].available===false?'预留未开放':'已实现';});
 for(const level of [1,10]){const unit={...u,level},intent=intentIncome(unit);r[`capacity${level}`]=troopCapacity(unit);r[`intentAttack${level}`]=intent.attack;r[`intentHit${level}`]=intent.hit;}
 for(const key of ['attack','defense','martialPower','strategyPower','discipline','move','range','attackSpeed','siege'])r['level10-'+key]=highStats[key];
 r.attackInterval=stats.attackInterval;r.minRange=stats.minRange;r.beats=TROOPS[TROOPS[u.type].beats]?.name||'无';
 const available=availableTactics(u);r.availableIds=available.map(s=>s.id).join('、');r.availableNames=available.map(s=>s.name).join('、');
 r.specialId=special?.id||'';r.specialPower=special?.powerDescription||'不适用';r.specialTerrain=special?.terrainDescription||'不适用';
 for(let i=0;i<4;i++)for(const part of ['id','category','threshold','cooldown','description','powerDescription','terrainDescription'])r[`equipped${i}-${part}`]='未学会';
 unitTactics(u).forEach((s,i)=>{for(const part of ['id','category','threshold','cooldown','description','powerDescription','terrainDescription'])r[`equipped${i}-${part}`]=part==='category'?(s.category==='force'?'武力':'智力'):(s[part]??'无额外地形规则');});
 for(const role of TACTIC_ROLES[u.type])r[`role-${role.id}`]=`${role.name}：${role.ids.map(k=>TACTICS_BOOK[k].name).join(' → ')}；${role.position}；代价：${role.cost}`;
 const stratagems=officerStratagems(u.id);r.stratagemIds=stratagems.join('、');r.stratagemEffects=stratagems.map(k=>`${STRATAGEMS[k].name}：${STRATAGEMS[k].description}`).join('；')||'无个人军略';
 r.campaignPlacement=placements.get(u.id)||'未编入默认战役';
 r.historicalPlacement=HISTORICAL_CAMPAIGNS.flatMap(s=>['own','enemy'].flatMap(side=>s[side+'Team'].filter(t=>t.id===u.id).map(t=>`${s.name}／${s[side+'Name']}／${TROOPS[t.type].name}`))).join('；')||'未配置历史战役出场';
 assert.equal(route.length,5,u.id);assert.ok(route.every(k=>PASSIVES[k]),u.id);
 assert.ok(validLoadout(u,unitTactics(u).map(s=>s.id))&&validLoadout(u,recommendedTacticIds(u)),u.id);
 assert.ok(GAME_COLUMNS.every(c=>r[c.key]!==undefined),u.id+' missing fields');
 return Object.fromEntries(Object.entries(r).map(([k,v])=>[k,tidy(v)]));
});

const csvCell=v=>`"${String(v??'').replaceAll('"','""')}"`;
export function exportGameOfficerTable(){
 assert.equal(GAME_RECORDS.length,OFFICER_CATALOG.length);
 assert.equal(new Set(GAME_RECORDS.map(r=>r.id)).size,OFFICER_CATALOG.length);
 assert.equal(new Set(GAME_COLUMNS.map(c=>c.label)).size,GAME_COLUMNS.length);
 const dir=new URL('../docs/',import.meta.url);mkdirSync(dir,{recursive:true});
 const rows=[GAME_COLUMNS.map(c=>c.label),...GAME_RECORDS.map(r=>GAME_COLUMNS.map(c=>r[c.key]))];
 writeFileSync(new URL('武将总表-本游戏.csv',dir),'\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n','utf8');
 const common=GAME_RECORDS.filter(r=>!SPECIAL_TACTICS[r.id]).length;
 const doc=[`# 武将总表说明（本游戏规则 ${RULES_VERSION}）`,'',
 `[打开完整 CSV](武将总表-本游戏.csv)｜${GAME_RECORDS.length} 人，${GAME_COLUMNS.length} 列。由当前运行模块生成，非旧版 Excel 转存。`,'',
 `全部 ${GAME_RECORDS.length} 人均有 2、3、5、8、10 级五项成长。${GAME_RECORDS.length-common} 人有本人专属战法，${common} 人使用通用成长和兵种战法；“无专属”“无个人军略”是当前实现配置，不是未填。`,'',
 '- 表中默认属性以新建1级、3000现役为基准；另列10级同兵力静态面板、1级与10级带兵上限，便于比较。带兵上限不等于开局现役。',
 '- 兵力影响攻击、武技、谋略和攻城面板，不能把3000兵的数值当作满编队伍数值。无军团、地形、战斗状态修正；条件被动仍需按说明在战场判定。',
 '- 默认兵种与默认阵位取 makeOfficer；战役临时兵种覆盖单列。八种兵种都可在配装系统选择，不能把尚未默认使用某兵种理解为该兵种未实现。',
 '- 新建默认、推荐、输出/护卫/控场方案分列。门槛和冷却是战法基础数据，实际效果需看附带的威力/概率/地形规则。',
 '- 个人军略只有在任命为主将或军师时提供解锁；普通自动战法随等级学习，普通名额按适性为两低一高或三个低级，专属额外携带，各有独立冷却。',
 '- 默认战役位置取当前战略开局；历史战役出场取实际预设。没有将原始资料的势力/城池编号当作游戏归属。',
 '- 人物姓名、字、四维、魅力、性格、义理、相性、年份、关系和生平保留本游戏名录字段；魅力、性格、义理和年份不因此获得额外战斗机制。关系列是初始资料，不是当前玩家存档修改后的关系。',
 '- 人物字段已按来源项目的“公共库加载后再读剧本”顺序核对。832条公共库记录采用 Scenario.personSet 人物资料，3条自建记录独立读取；剧本势力、官职、忠诚和当前状态不作为本游戏开局。详见 [武将字段核对](武将字段核对-2026-09-19.md)。',
 '- 原库官职编号、旧等级/忠诚、FeatureList、素材编号、原库兵种适性等没有直接对应当前战斗配置的技术字段不混入主表。源数据仍保留在项目武将库。',
 '- CSV 使用 UTF-8 BOM、逗号分隔、双引号转义，保留中文。空数值只表示未记载/不适用；有真实0值的字段保持0。浮点值保留至多6位小数。',
 '', '重新生成：`npm run docs:officers`；`npm run docs:famous` 同时更新 CSV、字段说明和两份技能设计文档。','',
 '## 字段字典','', '| 字段 | 分类 | 本游戏口径 |','| --- | --- | --- |',
 ...GAME_COLUMNS.map(c=>`| ${c.label} | ${c.group} | ${c.description} |`),''];
 writeFileSync(new URL('武将总表-字段说明.md',dir),doc.join('\n'));
 console.log(`Exported game officer CSV: ${GAME_RECORDS.length} officers, ${GAME_COLUMNS.length} fields, rules ${RULES_VERSION}.`);
 return {rows,columns:GAME_COLUMNS,records:GAME_RECORDS};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))exportGameOfficerTable();
