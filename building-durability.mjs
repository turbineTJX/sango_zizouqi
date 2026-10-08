import {BUILDING_DESIGNS,AUXILIARY_BUILDINGS} from './data/design/buildings.mjs';
import {buildingCombatState} from './building-rules.mjs';

export const DURABLE_BUILDINGS={...BUILDING_DESIGNS,...AUXILIARY_BUILDINGS};
export const buildingUnitHp=key=>DURABLE_BUILDINGS[key].durability;
const completedLevel=(c,key,siteId)=>AUXILIARY_BUILDINGS[key]?(siteId===c.id&&c.domestic.techs.includes('watchtower')?c.domestic.techs.includes('beaconNetwork')?2:1:0):siteId===c.id?Math.max(0,c[key]-(c.domestic.buildingSites[key]||[]).length):(c.domestic.buildingSites[key]||[]).filter(id=>id===siteId).length;
export const completedBuildingHp=(c,key,siteId=c.id)=>(key==='walls'&&siteId===c.id?12000:0)+completedLevel(c,key,siteId)*buildingUnitHp(key);
export const buildingDurability=(c,key,siteId=c.id)=>c.buildings?.[key]?.[siteId]||{hp:0,maxHp:0};
export const gateDurability=c=>buildingDurability(c,'walls');
export function completeTechnologyBuilding(c,id){
 if(!['watchtower','beaconNetwork'].includes(id))return;
 const a=buildingDurability(c,'watchtower'),maxHp=completedBuildingHp(c,'watchtower');
 c.buildings.watchtower[c.id]={hp:a.hp+Math.max(0,maxHp-a.maxHp),maxHp};
}
export function initializeBuildingDurability(c){
 c.buildings=Object.fromEntries(Object.keys(DURABLE_BUILDINGS).map(key=>[key,{}]));
 for(const key of Object.keys(DURABLE_BUILDINGS)){
  const maxHp=completedBuildingHp(c,key);if(maxHp)c.buildings[key][c.id]={hp:maxHp,maxHp};
 }
}
export function buildingWorkMode(c,key,siteId=c.id){
 const a=buildingDurability(c,key,siteId);
 return a.maxHp>completedBuildingHp(c,key,siteId)?'resume':a.hp<a.maxHp?'repair':'build';
}
export function buildingWorkQuote(c,key,siteId,cost,days){
 const a=buildingDurability(c,key,siteId),mode=buildingWorkMode(c,key,siteId),unit=buildingUnitHp(key);
 const missing=mode==='build'?unit:a.maxHp-a.hp;
 return {mode,cost:mode==='resume'?0:mode==='repair'?Math.ceil(cost*missing/unit*.5):cost,days:Math.max(1,Math.ceil(missing/unit*days)),hpPerDay:unit/days};
}
export function beginBuildingWork(c,key,siteId,quote,extra={}){
 const prior=c.project?.key===key&&c.project.siteId===siteId?c.project:null;
 const a=c.buildings[key][siteId]||{hp:0,maxHp:0};
 if(quote.mode==='build')a.maxHp+=buildingUnitHp(key);
 c.buildings[key][siteId]=a;
 const mode=a.maxHp>completedBuildingHp(c,key,siteId)?'build':'repair';
 c.project={key,siteId,mode,startedHp:prior?.startedHp??a.hp,hpPerDay:quote.hpPerDay,remaining:quote.days/10,...extra,...(prior?.merit?{merit:prior.merit,meritOriginHp:prior.meritOriginHp}:{})};
 return c.project;
}
export function restoreBuilding(c,key,siteId,amount,{finish=true}={}){
 const a=buildingDurability(c,key,siteId),before=a.hp;
 if(!a.maxHp)return 0;
 const cap=a.maxHp-(finish?0:1);if(a.hp>=cap)return 0;
 a.hp=Math.min(cap,Math.max(0,Math.round(a.hp+amount)));
 return a.hp-before;
}
export function transferBuildingDurability(from,to,key,siteId){
 const source=buildingDurability(from,key,siteId),unit=buildingUnitHp(key),hp=Math.min(unit,Math.floor(source.hp*unit/Math.max(1,source.maxHp)));
 if(source.maxHp<unit)throw new Error('移交设施缺少实际耐久记录');
 source.hp-=hp;source.maxHp=Math.max(0,source.maxHp-unit);
 if(!source.maxHp)delete from.buildings[key][siteId];
 const target=to.buildings[key][siteId]||{hp:0,maxHp:0};target.hp+=hp;target.maxHp+=unit;to.buildings[key][siteId]=target;
}
export function siteBuildingDurability(s,siteId,key){
 return s.cities.reduce((sum,c)=>{const a=buildingDurability(c,key,siteId);sum.hp+=a.hp;sum.maxHp+=a.maxHp;return sum;},{hp:0,maxHp:0});
}
export function campaignBattleBuildings(s,siteId,side,factions=null){
 const result=[];
 for(const c of s.cities)for(const key of Object.keys(DURABLE_BUILDINGS)){
  const a=c.buildings[key][siteId];if(!a||key==='walls')continue;
  const ownerSide=factions?factions.indexOf(c.owner):side;if(ownerSide<0)continue;
  result.push({id:'city-building-'+result.length,name:DURABLE_BUILDINGS[key].name,type:'building',kind:key,side:ownerSide,x:0,y:0,hp:a.hp,maxHp:a.maxHp,...buildingCombatState(key,completedLevel(c,key,siteId)),source:{cityId:c.id,siteId,key},initialHp:a.hp});
 }
 // Rear cells keep buildings outside initial troop deployment and the gate lane.
 for(const ownerSide of [0,1]){
  const placements={arrowTower:{x:ownerSide===0?2:11,y:1},musicStage:{x:ownerSide===0?2:11,y:2},aidCamp:{x:ownerSide===0?2:11,y:6}},own=result.filter(a=>a.side===ownerSide),preferred=new Map(Object.keys(placements).map(key=>[key,own.find(a=>a.kind===key)?.id])),reserved=[...preferred].filter(([,id])=>id).map(([key])=>placements[key]);
  const cells=[0,1,2,3].flatMap(dx=>[0,1,2,3,5,6,7].map(y=>({x:ownerSide===0?dx:13-dx,y}))).filter(p=>!reserved.some(q=>q.x===p.x&&q.y===p.y));
  if(own.length>cells.length+reserved.length)throw new Error('战场建筑超过实际可用位置');
  let index=0;for(const a of own)Object.assign(a,preferred.get(a.kind)===a.id?placements[a.kind]:cells[index++]);
 }
 return result;
}
export function writeBattleBuildingDamage(s,b){
 const changed=[];
 for(const a of [...(b.siege?.gate?[b.siege.gate]:[]),...(b.buildings||[])]){
  const source=a.source;if(!source)continue;
  const c=s.cities.find(c=>c.id===source.cityId),record=c?.buildings?.[source.key]?.[source.siteId];
  if(!record||record.maxHp!==a.maxHp)throw new Error('战场建筑与建设地点不一致');
  record.hp=a.hp;
  if(a.hp!==a.initialHp)changed.push({...source,before:a.initialHp,hp:a.hp,maxHp:a.maxHp});
 }
 return changed;
}
export function validateBattleBuildingSources(s,r,fail){
 const b=r.battle,seen=new Set();
 for(const a of [...(b.siege?.gate?[b.siege.gate]:[]),...(b.buildings||[])]){
  const p=a.source,c=s.cities.find(c=>c.id===p?.cityId),record=c?.buildings?.[p?.key]?.[p?.siteId],id=p?.cityId+':'+p?.siteId+':'+p?.key;
  fail(p&&p.siteId===r.cityId&&DURABLE_BUILDINGS[p.key]&&a.type===(p.key==='walls'?'gate':'building')&&(a.type==='gate'||a.kind===p.key)&&!seen.has(id),'战场建筑来源无效或重复');seen.add(id);
  if(!r.settled&&BUILDING_DESIGNS[p.key]?.combat)fail(a.level===completedLevel(c,p.key,p.siteId),'战场建筑等级与原址不一致');
  if(!r.settled)fail(record&&a.initialHp===record.hp&&a.maxHp===record.maxHp,'战场建筑与原址耐久不一致');
 }
 fail(b.buildingSiteId===null||b.buildingSiteId===r.cityId,'战场建筑地点无效');
 if(r.kind==='siege')fail(b.buildingSiteId===r.cityId,'攻城战缺少实际建筑地点');
 if(!b.buildingSiteId)fail(!b.buildings.length,'道路遭遇战不能带入城市建筑');
 if(!r.settled&&b.buildingSiteId){
  const expected=campaignBattleBuildings(s,r.cityId,1-r.attackSide,b.sides.map(side=>side.faction));
  fail(expected.length===b.buildings.length&&expected.every(a=>b.buildings.some(v=>v.source.cityId===a.source.cityId&&v.source.siteId===a.source.siteId&&v.source.key===a.source.key&&v.side===a.side&&v.x===a.x&&v.y===a.y&&v.name===a.name)),'战场遗漏实际建筑');
 }
}
export function validateBuildingDurability(s,fail){
 const kinds=Object.keys(DURABLE_BUILDINGS);
 for(const c of s.cities){
  fail(!Object.hasOwn(c,'gateHp'),'旧城门字段不能与实际建筑耐久并存');
  fail(c.buildings&&Object.keys(c.buildings).length===kinds.length&&kinds.every(key=>c.buildings[key]&&typeof c.buildings[key]==='object'&&!Array.isArray(c.buildings[key])),'建筑耐久列表无效');
  for(const key of kinds){
   const sites=new Set([c.id,...(c.domestic.buildingSites[key]||[]),...Object.keys(c.buildings[key])]);
   for(const siteId of sites){
    const a=c.buildings[key][siteId],built=completedBuildingHp(c,key,siteId);
    if(!a){fail(built===0,'建成建筑缺少耐久');continue;}
    fail(Object.keys(a).sort().join(',')==='hp,maxHp','建筑耐久字段无效');
    const pending=a.maxHp-built;
    fail(Number.isSafeInteger(a.hp)&&a.hp>=0&&Number.isSafeInteger(a.maxHp)&&a.maxHp>0&&a.hp<=a.maxHp&&(pending===0||pending===buildingUnitHp(key)),'建筑耐久或建设上限无效');
    fail(!pending||c.project?.key===key&&c.project.siteId===siteId,'未完成建筑缺少对应工程');
    fail(siteId===c.id||[...s.cities,...(s.junctions||[])].some(n=>n.id===siteId),'建筑耐久地点无效');
   }
  }
  if(c.project){const p=c.project,a=buildingDurability(c,p.key,p.siteId);
   fail(['build','repair'].includes(p.mode)&&Number.isFinite(p.hpPerDay)&&p.hpPerDay>0&&p.hpPerDay<=buildingUnitHp(p.key)&&a.maxHp>0&&(p.mode==='build'?a.maxHp===completedBuildingHp(c,p.key,p.siteId)+buildingUnitHp(p.key):a.maxHp===completedBuildingHp(c,p.key,p.siteId)),'工程与建筑耐久不一致');
  }
 }
}
