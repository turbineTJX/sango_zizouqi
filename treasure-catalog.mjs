import {TREASURE_DESIGNS,TREASURE_IDS} from './data/design/treasures.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';

export const TREASURE_EFFECTS=Object.freeze({valor:'奋战',attackHaste:'速攻',phase:'穿阵',resolve:'坚定',longRange:'远射',shield:'护盾',haste:'疾行',regrowth:'休整',nexus:'阵枢',camp:'营垒',bulwark:'坚阵'});
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[<>\u0000-\u001f]/.test(v);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function validateTreasureCatalog(input){
 if(!input||Array.isArray(input)||Object.keys(input).sort().join()!==[...TREASURE_IDS].sort().join())throw Error('宝物目录须包含全部70件宝物');
 const result={},names=new Set();
 for(const id of TREASURE_IDS){
  const d=input[id],fail=message=>{throw Error((TREASURE_DESIGNS[id].name||id)+'：'+message);};
  if(!d||!text(d.name,30)||!text(d.description,500))fail('名称或效果说明无效');
  if(/["'&]/.test(d.name))fail('名称不能包含引号或&符号');
  if(d.name!==d.name.trim()||names.has(d.name))fail('名称不能重复或带首尾空格');names.add(d.name);
  if(d.category!==TREASURE_DESIGNS[id].category)fail('装备类别不能变更');
  const fields=['name','kind','category','description',...(d.kind==='bond'?['bondId','bonus']:['status','steps',...(d.status==='shield'?['fraction','cap']:d.status==='regrowth'?['fraction','cap','totalFraction','totalCap']:[])])];
  if(Object.keys(d).some(k=>!fields.includes(k)))fail('含有未接入字段');
  if(d.kind==='bond'){
   if(BOND_DESIGNS[d.bondId]?.grade!=='basic'||d.bonus!==1)fail('只能选择低级羁绊并增加1点');
  }else{
   if(d.kind!=='entry'||!Object.hasOwn(TREASURE_EFFECTS,d.status)||!Number.isInteger(d.steps)||d.steps<1||d.steps>(d.status==='regrowth'?6:8))fail('入场增益或持续时间无效');
   if(d.status==='shield'&&(d.fraction!==.04||d.cap!==400))fail('护盾须为4%、上限400');
   if(d.status==='regrowth'&&(d.fraction!==.01||d.cap!==100||d.totalFraction!==.06||d.totalCap!==600))fail('休整额度无效');
  }
  result[id]=structuredClone(d);
 }
 return result;
}
export function changeTreasureEffect(d,kind,effect,steps=4){
 const next={name:d.name,category:d.category,kind};
 if(kind==='bond')return {...next,bondId:effect,bonus:1,description:'已获得的'+BOND_DESIGNS[effect].name+'羁绊贡献增加1点，单项最多3点、个人合计最多6点；第二档至少3名、最高档至少6名真实在场持有者。'};
 const descriptions={valor:'攻击提高25%',attackHaste:'普攻间隔缩短20%',phase:'暂时无视敌方拦截，保留占位、水陆与定身限制',resolve:'免疫七种控制，不驱散已有异常',longRange:'远程普攻最大射程增加1，不改变最小射程或战法范围',shield:'护盾额度为初始兵力4%、最多400',haste:'移动力增加1',regrowth:'每回合救治初始兵力1%、最多100名已有伤兵，累计最多6%且不超过600',nexus:'谋略威力及军纪提高20%',camp:'防御提高25%',bulwark:'防御提高30%、军纪提高20%，移动力减半'};
 return {...next,status:effect,steps,description:`本队每场首次实际上场时获得${TREASURE_EFFECTS[effect]}，${descriptions[effect]}，持续${steps}回合；每场一次。`,...(effect==='shield'?{fraction:.04,cap:400}:effect==='regrowth'?{fraction:.01,cap:100,totalFraction:.06,totalCap:600}:{})};
}
export const treasureCatalog=s=>s?.treasureDesigns||TREASURE_DESIGNS;
export function installTreasureCatalog(s,input){
 const catalog=validateTreasureCatalog(input);
 const custom=!same(catalog,TREASURE_DESIGNS);
 function visit(o){
  if(!o||typeof o!=='object')return;
  if(o.sides){if(custom)o.treasureDesigns=structuredClone(catalog);else delete o.treasureDesigns;}
  if(o.name&&o.id&&(Array.isArray(o.treasureIds)||o.treasureId)){
   const ids=o.treasureIds||[o.treasureId];
   if(custom&&ids.length)o.treasureDesigns=Object.fromEntries(ids.map(id=>[id,structuredClone(catalog[id])]));else delete o.treasureDesigns;
  }
  for(const [key,v] of Object.entries(o))if(key!=='treasureDesigns')visit(v);
 }
 if(custom)s.treasureDesigns=catalog;else delete s.treasureDesigns;
 visit(s);return s;
}
// Unit snapshots contain only their equipment; worlds and battle snapshots keep
// the complete catalogue. No process-wide mutable catalogue is used.
export function validateTreasureSnapshots(s){
 const root=s.treasureDesigns?validateTreasureCatalog(s.treasureDesigns):TREASURE_DESIGNS;
 function visit(o,catalog,isRoot=false){
  if(!o||typeof o!=='object')return;
  if(o.sides&&o.treasureDesigns){catalog=validateTreasureCatalog(o.treasureDesigns);if(s.treasureDesigns&&!same(catalog,root))throw Error('战场与世界宝物配置不一致');}
  const ids=Array.isArray(o.treasureIds)?o.treasureIds:o.treasureId?[o.treasureId]:[];
  if(!isRoot&&!o.sides&&o.treasureDesigns){
   if(Object.keys(o.treasureDesigns).sort().join()!==[...ids].sort().join()||ids.some(id=>!same(o.treasureDesigns[id],catalog[id])))throw Error('武将宝物配置与存档不一致');
  }else if(o.name&&o.id&&ids.some(id=>!same(catalog[id],TREASURE_DESIGNS[id]))&&!o.treasureDesigns)throw Error('武将缺少宝物配置');
  for(const [key,v] of Object.entries(o))if(key!=='treasureDesigns')visit(v,catalog);
 }
 visit(s,root,true);return s;
}
export function validateTreasurePack(input){
 if(input?.format!=='sango-treasure-pack'||input.version!==1||Object.keys(input).some(k=>!['format','version','treasures'].includes(k)))throw Error('宝物配置文件版本无效');
 return {format:'sango-treasure-pack',version:1,treasures:validateTreasureCatalog(input.treasures)};
}
export const defaultTreasurePack=()=>({format:'sango-treasure-pack',version:1,treasures:structuredClone(TREASURE_DESIGNS)});
