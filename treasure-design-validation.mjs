import {TREASURE_RULES,TREASURE_IDS,EYE_ACTIONS} from './data/design/treasures.mjs';
import {TREASURE_INITIAL_HOLDERS} from './data/design/national-scenarios.mjs';
import {STATUS_DEFINITIONS} from './data/design/battle-statuses.mjs';
export function validateTreasureDesigns(tables,check){
 const {treasures:t,treasureRules:r,bonds,officers,domesticActions}=tables;
 check(t&&Object.keys(t).sort().join(',')===[...TREASURE_IDS].sort().join(','),'treasures','宝物目录必须是已接入的唯一目录');
 if(t)for(const [id,d] of Object.entries(t)){
  const path='treasures.'+id,fields=['name','kind','category','description',...(d.kind==='bond'?['bondId','bonus']:['status','steps','fraction','cap','totalFraction','totalCap'])];
  check(d&&Object.keys(d).every(k=>fields.includes(k))&&typeof d.name==='string'&&d.name.length>0&&typeof d.description==='string'&&d.description.length>0&&['book','weapon','horse','armor','medicine'].includes(d.category),path,'宝物字段或类别无效');
  if(d.kind==='bond')check(bonds[d.bondId]?.grade==='basic'&&d.bonus===1,path,'宝物只可为低级羁绊增加1点');
  else{check(d.kind==='entry'&&['valor','attackHaste','phase','resolve','longRange','shield','haste','regrowth','nexus'].includes(d.status)&&STATUS_DEFINITIONS[d.status]?.tone==='buff'&&Number.isInteger(d.steps)&&d.steps>0&&d.steps<=8,path,'入场增益或持续时间未接入');if(d.status==='shield')check(d.fraction===.04&&d.cap===400,path,'宝物护盾额度无效');else if(d.status==='regrowth')check(d.fraction===.01&&d.cap===100&&d.totalFraction===.06&&d.totalCap===600&&d.steps<=6,path,'宝物休整额度无效');else check(['fraction','cap','totalFraction','totalCap'].every(k=>d[k]===undefined),path,'该宝物不能另加数值放大');}
 }
 check(t&&new Set(Object.values(t).map(d=>d.name)).size===TREASURE_IDS.length,'treasures','宝物名称不能重复');
 check(r&&Object.keys(r).sort().join(',')===Object.keys(TREASURE_RULES).sort().join(',')&&r.version===1&&r.discoveryChance>=0&&r.discoveryChance<=.02&&r.eyeChance>=r.discoveryChance&&r.eyeChance<=.04&&r.captureChance>=0&&r.captureChance<=.05&&r.plunderChance>=r.captureChance&&r.plunderChance<=.10&&r.discoveryInterval>=30&&r.bondBonus===1&&r.bondCap===3&&r.totalBondCap===6&&JSON.stringify(r.minimumHolders)==='[1,3,6]'&&r.plunderDamage>=.10&&r.plunderDamage<=1,'treasureRules','宝物强度、获取概率或贡献门槛无效');
 check(EYE_ACTIONS.every(k=>domesticActions[k]),'treasureEye','眼力须引用现有命令');
 for(const [id,row] of Object.entries(TREASURE_INITIAL_HOLDERS))check(t?.[id]&&Object.entries(row).every(([key,v])=>['absentBefore','absentAfter'].includes(key)?Number.isInteger(v):!!officers[v]),'treasureHolders.'+id,'宝物历史归属须引用真实人物');
}
