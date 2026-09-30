import {bondRosterAudit} from './bond-roster-report.mjs';
import {traitExpansionMarkdown} from './trait-expansion-report.mjs';
import {bondRecipients,bondTierText} from '../bond-reference.mjs';
import {buildRoadNetwork,mapNode} from '../road-network.mjs';
import STATUS_TABLE from '../data/design/battle-statuses.mjs';
import {BATTLE_PRESETS} from '../data/design/battles.mjs';
import {BATTLE_VALIDATION_CASES} from '../data/design/battle-validation.mjs';
import {scenarioDraft} from '../scenarios.mjs';
import {validateCustomBattle} from '../custom-battle.mjs';
import {resolveDomesticActions} from '../domestic-designs.mjs';
import {roadDistance,campaignRoads} from '../strategic-movement.mjs';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {DESIGN_TABLES as d,assertDesignTables} from '../design-catalog.mjs';
import {DESIGN_NOTES} from '../data/design/notes.mjs';
import {PENDING_DESIGN_TABLES} from '../data/design/pending-tables.mjs';
import {assertPendingDesignTables} from '../design-pending-validation.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),folder=resolve(root,'docs/design-tables'),mode=process.argv[2]||'check';
assertDesignTables();
for(const preset of BATTLE_PRESETS){
 scenarioDraft(preset.id);
 if(preset.own!==preset.ownTeam.length||preset.enemy!==preset.enemyTeam.length)throw new Error(preset.id+'：战役队数与编制不一致');
 for(const unit of [...preset.ownTeam,...preset.enemyTeam])for(const key of Object.keys(unit))if(!['id','type','troops','level','formation','first'].includes(key))throw new Error(preset.id+'：未接入的战役部队字段 '+key);
}
for(const group of BATTLE_VALIDATION_CASES)for(const variant of group.variants)validateCustomBattle(variant.draft);
assertPendingDesignTables(PENDING_DESIGN_TABLES,d,root);
const cell=v=>String(v??'—').replaceAll('|','\\|').replaceAll('\r','').replaceAll('\n','<br>');
const table=(head,rows)=>'| '+head.map(cell).join(' | ')+' |\n| '+head.map(()=>'---').join(' | ')+' |\n'+rows.map(r=>'| '+r.map(cell).join(' | ')+' |').join('\n')+'\n';
const note=(type,id)=>{const n=DESIGN_NOTES[type]?.[id];return n?Object.entries(n).map(([k,v])=>`${k}：${v}`).join('；'):'';};
const names=(ids,pool)=>ids.map(id=>pool[id]?.name||id).join('、')||'—';
const holders=(key,id)=>Object.entries(d.assignments).filter(([,a])=>key==='specialTactic'?a[key]===id:a[key].includes(id)).map(([officer])=>d.officers[officer].name+'（'+officer+'）').join('、')||'—';
const params=(value,omit=[])=>JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key])=>!omit.includes(key))));
const page=(title,file,body)=>`# ${title}\n\n数据源：\`data/design/${file}.mjs\`。本页由 \`npm run design:export\` 生成，请修改数据源后重新生成。内部分类与设计备注不进入游戏界面。\n\n${body}`;
const domesticActions=resolveDomesticActions(d.domesticActions,d.buildings);
const statNames={leadership:'统率',force:'武力',intellect:'智力',politics:'政治',charm:'魅力'};
const actionKinds={build:'建设／扩建',cash:'现金收益',effect:'阶段产出加成',discount:'建设折扣',trade:'粮食买卖',grain:'粮食产出',rescue:'处置灾损',research:'研发进度',trial:'试制解锁',recruit:'补充兵员',heal:'真实伤兵救治',repair:'修复城防',prepare:'守城准备',explore:'发现人才',hire:'登用人才',persuade:'劝说人才',reassure:'提升忠诚'};
const roadWorlds=[['全国',{cities:d.cities,...buildRoadNetwork(d.cities,d.roads)}],['入门地图',{cities:d.demoCities,roads:d.demoRoads}]];
const roadRows=roadWorlds.flatMap(([scope,state])=>state.roads.map(([a,b])=>[scope,a,mapNode(state,a).name,b,mapNode(state,b).name,roadDistance(state,a,b),campaignRoads(state,a,b).map(r=>r.name+'：'+r.cost).join('；')]));
const tacticUse=id=>Object.keys(d.troops).filter(type=>[...d.troopPools[type],...d.intellectPools[type]].includes(id)).map(type=>d.troops[type].name).join('、')||(Object.values(d.assignments).some(a=>a.specialTactic===id)?'名将专属':'未配置到部队（效果库）');
const pages={
 '功绩成长一览表.md':page('功绩成长','progression',table(['当前等级','升级功绩'],d.progression.costs.map((n,i)=>[i+1,n]))+'\n战斗贡献分除以 '+d.progression.battleDivisor+' 兑换功绩，获胜乘 1.25；无贡献不得功绩。\n'),
 '战役预设一览表.md':page('战役预设','battles',table(['ID','名称','类别','地形','双方队数','双方兵力','时限','援军批次','生成配置'],BATTLE_PRESETS.map(s=>[s.id,s.name,s.battleKind,s.terrain,s.ownTeam.length+' / '+s.enemyTeam.length,s.ownTeam.reduce((n,u)=>n+u.troops,0)+' / '+s.enemyTeam.reduce((n,u)=>n+u.troops,0),s.limit,JSON.stringify(s.waves),JSON.stringify(scenarioDraft(s.id))]))),
 '战斗验证对照表.md':page('战斗验证对照','battle-validation',table(['ID','问题','方案','配置'],BATTLE_VALIDATION_CASES.flatMap(g=>g.variants.map(v=>[g.id,g.question,v.id,JSON.stringify(v.draft)])))),
 '内政动作一览表.md':page('内政动作库','domestic-actions',Object.entries(d.directions).map(([direction,name])=>'## '+name+'\n\n'+table(['ID','动作','主属性','基础费用','工期（天）','处理类型','效果参数','协作','机会前提'],Object.entries(domesticActions).filter(([,a])=>a.direction===direction).map(([id,a])=>[id,a.name,statNames[a.stat],a.cost,a.days,actionKinds[a.kind],params(a,['name','direction','cost','days','stat','cooperation','opportunity']),a.cooperation,a.opportunity||'由动作处理器判断']))).join('\n')+'\n费用为基础费用，征兵等仍有按人数计算的追加费用。建设动作的名称、方向、费用、工期来自建筑表；可用条件、成功率与自动选事权重目前仍由内政引擎判断。\n'),
 '建筑一览表.md':page('城市建筑一览表','buildings',table(['ID','建筑','内政方向','基础费用','工期（天）','现有效果说明','工程名称'],Object.entries(d.buildings).map(([id,b])=>[id,b.name,d.directions[b.direction],b.cost,b.days,b.description,b.projectName]))+'\n费用、工期和名称已接入建设及工程流程；每级收益、上限等效果系数仍在对应结算代码，不能只改说明来改变效果。\n'),
 '大地图道路一览表.md':page('大地图道路一览表','roads',table(['地图','起点ID','起点','终点ID','终点','基础距离','当前双路行动代价'],roadRows)+'\n每行是一条双向实际路段，含城外路口与横向小路；分段官道保留原总距离，横向小路按道路网络表计价。港口之间为水路，连接关隘为山道，其余为陆路。本表不预存每座城到其它城市的完整路径，寻路由引擎按连接和代价计算。\n'),
 '移动规则一览表.md':page('大地图移动规则','movement-rules','## 道路距离\n\n'+table(['参数','值'],Object.entries(d.movement.distance))+'\n## 道路类型\n\n'+table(['道路ID','类型','名称','代价倍率','曲线偏移'],Object.entries(d.movement.roadVariants).flatMap(([id,r])=>Object.entries(r.names).map(([terrain,name])=>[id,terrain,name,r.costFactors[terrain],r.offset])))+'\n## 军团行军\n\n'+table(['兵种','基础速度'],Object.entries(d.movement.army.speedByTroop).map(([id,n])=>[d.troops[id].name,n]))+'\n军团取有兵力部队的最低基础速度，乘统率、士气、缺粮及军团长行军特性修正。神速在军团长所部有兵力时乘1.25。统率修正='+d.movement.army.command.base+'＋统率×'+d.movement.army.command.perPoint+'；士气修正='+d.movement.army.morale.base+'＋士气×'+d.movement.army.morale.perPoint+'。\n\n'+table(['缺粮阈值','边界','减速比例'],d.movement.army.hunger.map(r=>[r.minimum,r.inclusive?'≥':'>',r.penalty]))+'\n## 人才与运输\n\n'+table(['参数','值'],Object.entries(d.movement.personnel))+'\n此表只定义行军，不改变运输遇敌损失、内政外出返程和围城阻断规则；战斗内移速仍由兵种表和战场规则控制。\n'),
 '军团特技一览表.md':page('军团特技一览表','traits',table(['ID','名称','任职','效果','持有武将','内部设计备注'],Object.entries(d.traits).filter(([,t])=>t.domain==='command'||t.mechanics?.some(m=>m.roles)).map(([id,t])=>[id,t.name,[...new Set(t.role?[t.role]:t.mechanics.flatMap(m=>m.roles||[]))].map(role=>({leader:'军团长',advisor:'军师'})[role]).join('／'),t.description,holders('traits',id),note('traits',id)]))),
 '羁绊成长一览表.md':page('羁绊与个人成长','bonds',bondRosterAudit(d)+table(['ID','羁绊','受益部队','激活档位与属性效果','完整效果（含最高档特殊效果）'],Object.entries(d.bonds).map(([id,b])=>[id,b.name,bondRecipients(b),b.thresholds.map((n,i)=>n+'点：'+bondTierText(b,i)).join('\n'),b.description]))+'\n'+table(['武将','满级总点数','满级上限'],Object.entries(d.bondAssignments).map(([id,caps])=>[d.officers[id].name,Object.values(caps).reduce((n,v)=>n+v,0),Object.entries(caps).map(([key,n])=>d.bonds[key].name+' '+n).join('、')]))),
 '特技一览表.md':page('特技一览表','traits',table(['ID','名称','作用领域 / 范围','任职条件','效果','持有武将','数据参数','内部设计备注'],Object.entries(d.traits).map(([id,t])=>[id,t.name,[t.domain,t.scope].filter(Boolean).join(' / '),{leader:'军团长',advisor:'军师'}[t.role]||'—',t.description,holders('traits',id),params(t,['name','description']),note('traits',id)]))),
 '战法一览表.md':page('战法一览表','tactics',table(['ID','名称','当前携带范围','战法类别','门槛 / 消耗','冷却 / 次数','专属持有者','效果','参数','内部设计备注'],Object.entries(d.tactics).map(([id,t])=>[id,t.name,tacticUse(id),t.learningTier,`${t.threshold} / ${t.intentCost}`,`${t.cooldown} / ${t.passive?'常驻':t.maxUses}`,holders('specialTactic',id),t.description,params(t,['name','description']),note('tactics',id)]))),
 '军略一览表.md':page('军略一览表','stratagems',table(['ID','名称','普通 / 专属','持续步数','效果','持有武将','参数','内部设计备注'],Object.entries(d.stratagems).map(([id,t])=>[id,t.name,t.pool,t.duration,t.description,holders('stratagems',id),params(t,['name','description']),note('stratagems',id)]))),
 '科技与兵种解锁一览表.md':page('科技与兵种解锁一览表','technologies',table(['科技','解锁兵种','研究进度','需要试制','需要水域'],d.technologies.records.map(r=>[r.name,d.troops[r.parameters.troopId].name,r.parameters.requiredProgress,r.parameters.requiresTrial?'是':'否',r.parameters.waterRequired?'是':'否']))),
 '兵种一览表.md':page('兵种一览表','troops',table(['ID','兵种','攻击','防御','军纪','移动','攻击间隔','射程','攻城系数','克制','全部参数'],Object.entries(d.troops).map(([id,t])=>[id,t.name,t.attack,t.defense,t.discipline,t.move,t.interval,t.range,t.siegeFactor,d.troops[t.beats]?.name||'—',params(t)]))),
 '武将一览表.md':page('武将一览表','officers',table(['ID','姓名','字','统','武','智','政','魅','默认兵种','各兵种适性','特技','军略','专属战法','内部设计备注'],Object.entries(d.officers).map(([id,u])=>[id,u.name,u.courtesy,u.leadership,u.force,u.intellect,u.politics,u.charm,d.troops[u.type].name,Object.entries(u.aptitudes).map(([type,n])=>d.troops[type].name+['C','B','A','S'][n]).join('、'),names(d.assignments[id].traits,d.traits),names(d.assignments[id].stratagems,d.stratagems),d.tactics[d.assignments[id].specialTactic]?.name||'—',note('officers',id)]))),
 '城市一览表.md':page('城市与据点一览表','cities',table(['数据集','ID','名称','类型','州','坐标','来源归属','全部参数'],[...d.cities.map(c=>['全国',c]),...d.demoCities.map(c=>['入门地图',c])].map(([scope,c])=>[scope,c.id,c.name,c.kind||'据点',c.province,`${c.x}, ${c.y}`,c.owner,params(c)]))+'\n全国表含城市、关隘、港口。此处 owner 为基础来源归属；剧本仍会指定开局归属、人员和资源，不是进行中存档的城市状态。\n'),
 '能力分配一览表.md':page('能力分配一览表','assignments',table(['武将ID','姓名','特技ID','军略ID','专属战法ID'],Object.entries(d.assignments).map(([id,a])=>[id,d.officers[id].name,a.traits.join('、'),a.stratagems.join('、'),a.specialTactic]))+'\n## 固定普通战法\n\n'+table(['兵种','武技小战法','谋略小战法','大战法'],Object.keys(d.troops).map(id=>{const ids=[...d.troopPools[id],...d.intellectPools[id]];return [d.troops[id].name,...[ids.find(k=>d.tactics[k].learningTier==='low'&&d.tactics[k].category==='force'),ids.find(k=>d.tactics[k].learningTier==='low'&&d.tactics[k].category==='intellect'),ids.find(k=>d.tactics[k].learningTier==='high')].map(k=>d.tactics[k].name+'（'+k+'）')];}))),
};
pages[STATUS_TABLE.name+'.md']='# 战斗状态与效果一览表\n\n正式来源：data/design/battle-statuses.mjs，已接入共享引擎。\n\n'+table(['ID','状态','效果','参数'],STATUS_TABLE.records.map(r=>[r.id,r.name,r.parameters.description,JSON.stringify(r.parameters)]));
pages['经济规则一览表.md']='# 经济规则一览表\n\n正式来源：data/design/economy-rules.mjs，已接入共享引擎。每旬10天；太守政治、适用任职特性和有效临时效果在基础收入之后计算。\n\n'+table(['分组','参数','值'],Object.entries(d.economy).flatMap(([group,row])=>Object.entries(row).map(([key,value])=>[group,key,typeof value==='object'?JSON.stringify(value):value])));
for(const t of PENDING_DESIGN_TABLES){

 const rows=t.records.map(r=>[r.id,r.name,Object.entries(r.parameters).map(([k,v])=>k+'：'+(v===null?'待完善':typeof v==='object'?JSON.stringify(v):v)).join('；'),r.source,r.todo]);
 pages[t.name+'.md']=page(t.name,t.id,'**接入状态：设计底稿，待接入主程序。** 修改本表暂不改变游戏行为。空值表示待设计，不表示零、禁用或无限制。\n\n'+table(['ID','条目','现有配置／待填字段','当前实现来源','后续工作'],rows));
}
pages['待接入设计表目录.md']='# 待接入设计表目录\n\n这些表已建立为可独立编辑的数据底稿，先整理现有配置，后续逐表细化并接入主程序。本目录及一览表由 npm run design:export 生成。\n\n'+table(['一览表','数据文件','条目数','状态'],PENDING_DESIGN_TABLES.map(t=>['['+t.name+']('+t.name+'.md)','['+t.id+'.mjs](../../data/design/'+t.id+'.mjs)',t.records.length,'已建表，待接入']))+'\n统一字段：schemaVersion、id、name、integration、description、records；每个条目包含稳定ID、名称、parameters、source、todo。source是追溯位置，parameters中的公式目前是设计说明，不执行。null专指尚未提取或设计的内容。\n\n后续修改数据文件后运行 design:check、design:export、design:verify；接入时增加明确字段约束、实际引擎读取和行为验证，再将该表移入已接入目录。导出操作不会从引擎重新抓取或覆盖数据文件。\n';
pages['内政命令特性一览表.md']=traitExpansionMarkdown();
const counts={战役预设:BATTLE_PRESETS.length,待接入表:PENDING_DESIGN_TABLES.length,内政动作:Object.keys(d.domesticActions).length,建筑:Object.keys(d.buildings).length,全国道路:roadWorlds[0][1].roads.length,野外路口:roadWorlds[0][1].junctions.length,横向小路:d.roadNetwork.bypasses.length,入门道路:d.demoRoads.length,特技:Object.keys(d.traits).length,战法:Object.keys(d.tactics).length,军略:Object.keys(d.stratagems).length,兵种:Object.keys(d.troops).length,武将:Object.keys(d.officers).length,全国据点:d.cities.length,入门据点:d.demoCities.length};
if(mode==='export'||mode==='verify'){
 if(mode==='export')mkdirSync(folder,{recursive:true});
 for(const [name,content] of Object.entries(pages)){const path=resolve(folder,name);if(mode==='export')writeFileSync(path,content);else if(readFileSync(path,'utf8')!==content)throw new Error('一览表未同步：'+name+'；运行 npm run design:export');}
}else if(mode!=='check')throw new Error('用法：node scripts/design-tables.mjs check|export|verify');
console.log('设计表'+({check:'校验',export:'导出',verify:'同步检查'})[mode]+'通过：'+JSON.stringify(counts));
