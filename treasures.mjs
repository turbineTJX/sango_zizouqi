import {TREASURE_DESIGNS,TREASURE_IDS,TREASURE_RULES,EYE_ACTIONS,TREASURE_HIDE_REGIONS,DISCOVERY_CATEGORIES,treasureDesign,validTreasureId} from './data/design/treasures.mjs';
import {TREASURE_INITIAL_HOLDERS,NATIONAL_SCENARIO_DESIGNS} from './data/design/national-scenarios.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {hasStrategicTrait} from './strategic-traits.mjs';
import {mapNode,mapNodes} from './road-network.mjs';
import {roadCost} from './strategic-movement.mjs';
import {appendActivityNode} from './activity-nodes.mjs';
import {playerFaction,isAIControlled} from './player-faction.mjs';
import {DOMESTIC_ACTION_DESIGNS} from './data/design/domestic-actions.mjs';
import {ACTIONS} from './domestic-designs.mjs';
import {treasureBondBonus} from './treasure-battle.mjs';
import {bondLevels} from './bonds.mjs';

const integer=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const state=s=>s.campaign?.treasures;
const day=s=>s.campaign.day;
const hash=value=>{let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
function random(s){const t=state(s);t.seed=(Math.imul(t.seed,1664525)+1013904223)>>>0;return t.seed/4294967296;}
export function treasureOfficerRows(s){
 const rows=[];
 for(const c of s.cities)for(const unit of c.units||[])rows.push({unit,faction:c.owner,location:c.id,kind:'city'});
 for(const a of s.armies)for(const unit of a.units)rows.push({unit,faction:a.faction,location:a.location,kind:'army',army:a});
 for(const o of s.campaign.idle)rows.push({unit:o.unit,faction:o.faction,location:o.location,kind:o.destination||o.retreating?'travel':'city',idle:o});
 for(const p of s.campaign.domestic.people)if(p.unit)rows.push({unit:p.unit,faction:p.fate?.originalFaction||'neutral',location:p.cityId,kind:p.status==='CAPTIVE'?'captive':p.status==='FREE'?'free':p.status==='DEAD'?'dead':'unavailable',person:p});
 return rows;
}
export const treasureOfficer=(s,id)=>treasureOfficerRows(s).find(o=>o.unit.id===id)||null;
export function treasureResident(s,id,faction){
 const o=treasureOfficer(s,id),c=o&&s.cities.find(c=>c.id===o.location);
 return o&&o.kind==='city'&&!o.unit.mission&&c?.owner===o.faction&&(!faction||o.faction===faction)&&!s.campaign.battles.some(r=>!r.settled&&r.cityId===c.id)?o:null;
}
// Civil travel does not lock allocation. Deployed and withdrawing soldiers do.
export function treasureRecipient(s,id,faction){
 const o=treasureOfficer(s,id);
 return o&&['city','travel'].includes(o.kind)&&!o.idle?.retreating&&(!faction||o.faction===faction)&&!s.campaign.battles.some(r=>!r.settled&&r.battle.sides.some(side=>side.units.some(u=>u.id===id&&!u.retreatDispatched&&u.status!=='withdrawn')))?o:null;
}
export const treasureRecord=(s,id)=>state(s)?.items.find(t=>t.id===id)||null;
export function treasureLocation(s,t){
 const o=t.holderId&&treasureOfficer(s,t.holderId);
 return {faction:['person','captive'].includes(t.state)?o?.faction||null:t.state==='city'?mapNode(s,t.cityId)?.owner:null,cityId:o?.location||t.cityId,officer:o};
}
export function closestTreasureCity(s,nodeId){
 if(s.cities.some(c=>c.id===nodeId))return nodeId;
 const distances=new Map([[nodeId,0]]),todo=[nodeId],seen=new Set();
 while(todo.length){
  todo.sort((a,b)=>distances.get(a)-distances.get(b)||a.localeCompare(b));const id=todo.shift();if(seen.has(id))continue;seen.add(id);
  if(s.cities.some(c=>c.id===id))return id;
  for(const [a,b] of s.roads){const to=a===id?b:b===id?a:null;if(!to||seen.has(to))continue;const n=distances.get(id)+roadCost(s,id,to);if(n<(distances.get(to)??Infinity)){distances.set(to,n);todo.push(to);}}
 }
 return null;
}
function announce(s,id,phase,faction,officerId,cityId,text,result={}){
 appendActivityNode(s,{sourceId:'treasure:'+id,category:'treasure',phase,faction,officerId,cityId,text,result});
}
export function initializeTreasures(s){
 const spec=NATIONAL_SCENARIO_DESIGNS.find(x=>x.id===s.campaign.scenarioId),year=spec?.year||200,fictional=spec?.kind==='fictional',towns=[...s.cities].sort((a,b)=>a.id.localeCompare(b.id));
 s.campaign.treasures={version:TREASURE_RULES.version,seed:hash(s.seed+':treasures'),items:[],events:[],sources:[],lastDiscovery:{},lastTurn:{}};
 for(const id of TREASURE_IDS){
  const h=TREASURE_INITIAL_HOLDERS[id],holder=h&&(fictional?h.fictional||h.all:h[year]||h.all||(year<200?h.early:h.late)),o=holder&&treasureOfficer(s,holder);
  const absent=!fictional&&(h?.absentBefore>year||h?.absentAfter<year);
  const regions=TREASURE_HIDE_REGIONS[TREASURE_DESIGNS[id].category],regional=towns.filter(c=>regions.includes(c.province)),places=regional.length?regional:towns;
  const t={id,state:absent?'absent':o&&['city','army','free'].includes(o.kind)?'person':'hidden',holderId:null,cityId:places[hash(s.seed+':hide:'+id)%places.length].id};
  if(t.state==='person'){t.holderId=holder;t.cityId=null;}
  state(s).items.push(t);
 }
 const preferred=['skyHalberd','greenDragon','serpentSpear','twinSwords','mengde','ancientBlade','medicineBook','peaceBook','blueSteel'];
 for(const id of preferred){const t=treasureRecord(s,id),o=t.state==='person'&&treasureOfficer(s,t.holderId);if(o&&!o.unit.treasureId)o.unit.treasureId=id;}
}
function clearEquipped(s,id){for(const o of treasureOfficerRows(s))if(o.unit.treasureId===id)o.unit.treasureId=null;}
function moveItem(s,t,next){clearEquipped(s,t.id);Object.assign(t,{holderId:null,cityId:null},next);}
export function treasureDistributionError(s,id,faction=playerFaction(s)){
 const t=treasureRecord(s,id);if(!t)return '宝物不存在';
 if(!['person','city'].includes(t.state))return t.state==='captive'?'宝物随俘虏封存，不能分配':'该宝物尚不可使用';
 const at=treasureLocation(s,t);if(at.faction!==faction)return '只能分配本势力宝物';
 if(t.state==='person'&&!treasureRecipient(s,t.holderId,faction))return '武将已出征或正在撤离，随身宝物锁定，回城交接后可分配';
 if(t.state==='city'&&s.campaign.battles.some(r=>!r.settled&&r.cityId===at.cityId))return '围城或交战期间不能分配库藏宝物';
 return null;
}
function editable(s,faction,automatic){return !s.finished&&(automatic||!s.campaign.allAI&&s.campaign.phase==='planning')&&(!automatic||isAIControlled(s,faction));}
export function grantTreasure(s,id,recipientId,{equip=false,faction=playerFaction(s),automatic=false,checkOnly=false}={}){
 if(!editable(s,faction,automatic))return '须在筹划阶段授予宝物';
 const error=treasureDistributionError(s,id,faction);if(error)return error;
 const to=treasureRecipient(s,recipientId,faction);if(!to)return '只能授予本势力未出征的武将，参战或撤离者不可选择';
 const t=treasureRecord(s,id);
  if(checkOnly)return null;
  moveItem(s,t,{state:'person',holderId:recipientId});
  if(equip)to.unit.treasureId=id;
  announce(s,'grant:'+id+':'+day(s)+':'+state(s).events.length,'granted',faction,recipientId,to.location,treasureDesign(id).name+'已授予'+to.unit.name+'。',{treasureId:id});
  state(s).events.push({id:'grant:'+id+':'+day(s)+':'+state(s).events.length,day:day(s),kind:'grant',faction,treasureId:id,officerId:recipientId});
  return null;
}
export function equipTreasure(s,officerId,id,{faction=playerFaction(s),automatic=false}={}){
 if(!editable(s,faction,automatic))return '须在筹划阶段装备宝物';
 const o=treasureRecipient(s,officerId,faction);if(!o)return '出征、参战或撤离期间不能换装';
 if(id){const t=treasureRecord(s,id);if(t?.state!=='person'||t.holderId!==officerId)return '只能装备本人实际携带的宝物';}
 o.unit.treasureId=id||null;return null;
}
export function storeTreasure(s,id,{faction=playerFaction(s),automatic=false}={}){
 if(!editable(s,faction,automatic))return '须在筹划阶段收回宝物';
 const error=treasureDistributionError(s,id,faction);if(error)return error;
 const t=treasureRecord(s,id),at=treasureLocation(s,t);if(t.state==='person'&&!treasureResident(s,t.holderId,faction))return '收回至城库须等待携带者实际回城';moveItem(s,t,{state:'city',cityId:at.cityId});return null;
}
export function loseTreasureTransport(s,o,nodeId){
 for(const t of state(s)?.items||[])if(t.holderId===o.unit.id&&t.state==='person')moveItem(s,t,{state:'hidden',cityId:closestTreasureCity(s,nodeId)||s.cities[0].id});
}
export function treasureFate(s,officerId,result,nodeId){
 for(const t of state(s)?.items||[])if(t.holderId===officerId&&['person','captive'].includes(t.state)){
  if(result==='DEAD')moveItem(s,t,{state:'hidden',cityId:closestTreasureCity(s,nodeId)||s.cities[0].id});
  else if(result==='CAPTIVE'){clearEquipped(s,t.id);t.state='captive';}
  else if(result==='RELEASE')t.state='person';
 }
}
const atHidden=(s,cityId,categories=null)=>state(s).items.filter(t=>t.state==='hidden'&&t.cityId===cityId&&(!categories||categories.includes(treasureDesign(t.id).category)));
export function recordTreasureWork(s,{id,key,officerId,faction,cityId,siteId,factor,productive,finished}){
 if(!state(s)||!finished||factor<=0||!productive)return;
 if(state(s).sources.some(x=>x.id===id))return;
 const unit=treasureOfficer(s,officerId)?.unit,location=unit?.mission?.location||siteId||cityId,actualCity=closestTreasureCity(s,location);
 state(s).sources.push({id,key,officerId,faction,cityId:actualCity,siteId:location,day:day(s),away:!!unit?.mission,eye:!!unit&&hasStrategicTrait(unit,'treasureDiscovery')&&EYE_ACTIONS.includes(key)});
}
function discoveryAvailable(s,faction){return state(s).lastDiscovery[faction]===undefined||day(s)-state(s).lastDiscovery[faction]>=TREASURE_RULES.discoveryInterval;}
function rollEvent(s,id,kind,faction,candidate,probability,officerId,sourceId=null){
 const t=state(s);if(t.events.some(e=>e.id===id))return null;
 const roll=random(s),won=roll<probability,e={id,day:day(s),kind,faction,treasureId:candidate?.id||null,officerId,sourceId,probability,roll,won};t.events.push(e);return e;
}
function receive(s,item,faction,cityId,holderId,event){
 event.recipientId=holderId||null;event.cityId=cityId;
 moveItem(s,item,holderId?{state:'person',holderId}:{state:'city',cityId});
 if(event.kind!=='capture')state(s).lastDiscovery[faction]=day(s);
 announce(s,event.id,'acquired',faction,holderId||event.officerId,cityId,(OFFICER_BY_ID[event.officerId]?.name||mapNode(s,cityId)?.name||'本方')+(event.kind==='capture'?'缴获':'发现')+treasureDesign(item.id).name+'。',{treasureId:item.id,kind:event.kind,sourceId:event.sourceId});
}
export function finishTreasureTurn(s){
 const t=state(s),turn=Math.floor((day(s)-1)/10)+1;if(!t)return;
 const sources=t.sources.filter(x=>x.day>=day(s)-9&&x.day<=day(s));
 for(const faction of [...new Set(sources.map(x=>x.faction))].sort()){
  if(t.lastTurn[faction]>=turn)continue;t.lastTurn[faction]=turn;
  if(!discoveryAvailable(s,faction))continue;
  const eligible=sources.filter(x=>x.faction===faction&&(!x.away&&mapNode(s,x.cityId)?.owner===faction||x.away&&treasureOfficer(s,x.officerId)?.faction===faction&&treasureOfficer(s,x.officerId)?.unit.mission?.location===x.siteId)&&atHidden(s,x.cityId).length).sort((a,b)=>a.day-b.day||a.cityId.localeCompare(b.cityId)||a.id.localeCompare(b.id));if(!eligible.length)continue;
  const source=eligible[Math.floor(random(s)*eligible.length)],preferred=atHidden(s,source.cityId,DISCOVERY_CATEGORIES[ACTIONS[source.key]?.direction]),pool=preferred.length?preferred:atHidden(s,source.cityId),item=pool[Math.floor(random(s)*pool.length)];
  const e=rollEvent(s,'domestic:'+turn+':'+faction,'discovery',faction,item,source.eye?TREASURE_RULES.eyeChance:TREASURE_RULES.discoveryChance,source.officerId,source.id);
  if(e)e.workSource=structuredClone(source);
  if(e?.won)receive(s,item,faction,source.cityId,source.away?source.officerId:null,e);
 }
 t.sources=t.sources.filter(x=>x.day>day(s));
}
export function treasureCaptureCandidates(s,b){
 if(!state(s)||b.result?.winner===null||b.result?.winner===undefined)return [];
 const defeated=new Set(b.sides[1-b.result.winner].units.filter(u=>!u.isDecoy&&u.status==='defeated'&&u.hp===0&&u.bondEntry).map(u=>u.id));
 return state(s).items.filter(t=>['person','captive'].includes(t.state)&&defeated.has(t.holderId)).map(t=>({id:t.id,holderId:t.holderId}));
}
const contribution=u=>Object.values(u.contribution||{}).reduce((a,b)=>a+b,0);
export function settleBattleTreasures(s,r,candidates){
 const b=r.battle,t=state(s);if(!t||t.events.some(e=>e.id==='battle:'+r.id+':done'))return [];
 const winner=b.result?.winner;if(winner===null||winner===undefined)return [];
 const winning=b.sides[winner],cityId=closestTreasureCity(s,r.cityId),survivors=winning.units.filter(u=>u.bondEntry&&!u.isDecoy&&u.status!=='withdrawn'&&treasureOfficer(s,u.id)&&!['dead','captive','unavailable'].includes(treasureOfficer(s,u.id).kind)),carrier=survivors.filter(u=>u.hp>0).sort((a,b)=>b.hp-a.hp||a.id.localeCompare(b.id))[0],faction=carrier?treasureOfficer(s,carrier.id).faction:winning.faction,fighters=survivors.filter(u=>treasureOfficer(s,u.id).faction===faction),awards=[];
 const enemy=b.sides[1-winner].units.some(u=>u.bondEntry&&!u.isDecoy&&u.initial>0);
 if(carrier&&enemy&&cityId){
  if(candidates.length){
   const selected=candidates[Math.floor(random(s)*candidates.length)],target=b.sides[1-winner].units.find(u=>u.id===selected.holderId),plunder=fighters.filter(u=>hasStrategicTrait(u,'treasureCapture')&&(u.treasureDamage?.[target.id]||0)>=target.initial*TREASURE_RULES.plunderDamage).sort((a,b)=>(b.treasureDamage?.[target.id]||0)-(a.treasureDamage?.[target.id]||0)||a.id.localeCompare(b.id))[0];
   const e=rollEvent(s,'battle:'+r.id+':capture','capture',faction,selected,plunder?TREASURE_RULES.plunderChance:TREASURE_RULES.captureChance,plunder?.id||carrier.id,selected.holderId);
   if(e)e.battleSource={battleId:r.id,enemyId:target.id,initial:target.initial,damage:plunder?.treasureDamage?.[target.id]||0,entryTick:plunder?.bondEntry.tick??carrier.bondEntry.tick};
   if(e?.won){receive(s,treasureRecord(s,selected.id),faction,cityId,carrier.id,e);awards.push(selected.id);}
  }
  const pool=atHidden(s,cityId).filter(t=>!candidates.some(c=>c.id===t.id));
  if(!awards.length&&pool.length&&discoveryAvailable(s,faction)){
   const eye=fighters.filter(u=>hasStrategicTrait(u,'treasureDiscovery')&&contribution(u)>0).sort((a,b)=>contribution(b)-contribution(a)||a.id.localeCompare(b.id))[0],item=pool[Math.floor(random(s)*pool.length)];
   const e=rollEvent(s,'battle:'+r.id+':discovery','discovery',faction,item,eye?TREASURE_RULES.eyeChance:TREASURE_RULES.discoveryChance,eye?.id||carrier.id,r.id);
   if(e)e.battleSource={battleId:r.id,contribution:eye?contribution(eye):0,entryTick:eye?.bondEntry.tick??carrier.bondEntry.tick};
   if(e?.won){receive(s,item,faction,cityId,carrier.id,e);awards.push(item.id);}
  }
 }
 t.events.push({id:'battle:'+r.id+':done',day:day(s),kind:'settled',faction,treasureId:null,officerId:null});return awards;
}
export function manageTreasuresAI(s){
 const t=state(s);if(!t)return;
 for(const item of t.items.filter(t=>['city','person'].includes(t.state))){
  const at=treasureLocation(s,item),faction=at.faction;if(!isAIControlled(s,faction)||treasureDistributionError(s,item.id,faction))continue;
  const current=item.state==='person'?treasureOfficer(s,item.holderId):null;
  if(current?.unit.treasureId)continue;
  const candidates=treasureOfficerRows(s).filter(o=>!o.unit.treasureId&&treasureRecipient(s,o.unit.id,faction));
  const d=treasureDesign(item.id),good=o=>d.kind==='bond'?!!treasureBondBonus({...o.unit,treasureId:item.id},bondLevels(o.unit)):d.status==='longRange'?['archer','crossbow','longbow'].includes(o.unit.type):true;
  const selected=candidates.filter(good).sort((a,b)=>Number(b.unit.troops>0)-Number(a.unit.troops>0)||a.unit.id.localeCompare(b.unit.id))[0];
  if(selected)grantTreasure(s,item.id,selected.unit.id,{faction,automatic:true,equip:true});
 }
}
export function validateTreasures(s,fail){
 const t=state(s);fail(t?.version===TREASURE_RULES.version&&integer(t.seed,0xffffffff)&&Array.isArray(t.items)&&t.items.length===TREASURE_IDS.length,'宝物存档版本或目录无效');
 const ids=new Set(),rows=treasureOfficerRows(s),get=id=>rows.find(o=>o.unit.id===id);
 for(const item of t.items){
  fail(item&&TREASURE_DESIGNS[item.id]&&!ids.has(item.id),'宝物实体重复或未知');ids.add(item.id);
  fail(['absent','hidden','city','person','captive'].includes(item.state),'宝物位置状态无效');
  if(['absent','hidden','city'].includes(item.state))fail(item.holderId===null&&s.cities.some(c=>c.id===item.cityId)&&!Object.hasOwn(item,'delivery'),'宝物城市引用无效');
  else{const o=get(item.holderId);fail(!!o&&item.cityId===null,'宝物携带者无效');
   if(item.state==='person')fail(!['dead','unavailable','captive'].includes(o.kind)&&!Object.hasOwn(item,'delivery'),'宝物持有人状态无效');
   if(item.state==='captive')fail(o.kind==='captive'&&!Object.hasOwn(item,'delivery'),'宝物封存状态无效');
  }
 }
 const equipped=new Set();for(const o of rows){fail(validTreasureId(o.unit.treasureId),'武将宝物无效');if(!o.unit.treasureId)continue;const item=treasureRecord(s,o.unit.treasureId);fail(item.state==='person'&&item.holderId===o.unit.id&&!equipped.has(item.id),'宝物装备与原物不一致');equipped.add(item.id);}
 for(const o of s.campaign.idle)fail(!o.cargo?.treasureIds,'不再使用宝物货队');
 fail(t.lastDiscovery&&Object.values(t.lastDiscovery).every(n=>integer(n,day(s)))&&t.lastTurn&&Object.values(t.lastTurn).every(n=>integer(n,Math.floor((day(s)-1)/10)+1)),'宝物获取日期无效');
 fail(Array.isArray(t.sources)&&new Set(t.sources.map(x=>x.id)).size===t.sources.length&&t.sources.every(x=>typeof x.id==='string'&&DOMESTIC_ACTION_DESIGNS[x.key]&&OFFICER_BY_ID[x.officerId]&&s.cities.some(c=>c.id===x.cityId)&&mapNode(s,x.siteId)&&integer(x.day,day(s))&&x.day>0&&typeof x.eye==='boolean'&&(!x.eye||hasStrategicTrait({id:x.officerId},'treasureDiscovery')&&EYE_ACTIONS.includes(x.key))),'宝物内政来源无效');
 fail(Array.isArray(t.events)&&new Set(t.events.map(e=>e.id)).size===t.events.length,'宝物结算重复');
 for(const e of t.events){
  if(e.workSource){const x=e.workSource;fail(e.kind==='discovery'&&e.sourceId===x.id&&e.officerId===x.officerId&&e.faction===x.faction&&DOMESTIC_ACTION_DESIGNS[x.key]&&s.cities.some(c=>c.id===x.cityId)&&mapNode(s,x.siteId)&&integer(x.day,e.day)&&x.day>0&&typeof x.eye==='boolean'&&e.probability===(x.eye?TREASURE_RULES.eyeChance:TREASURE_RULES.discoveryChance)&&(!x.eye||hasStrategicTrait({id:e.officerId},'treasureDiscovery')&&EYE_ACTIONS.includes(x.key)),'宝物内政判定来源无效');}
  if(e.battleSource){const x=e.battleSource;fail(typeof x.battleId==='string'&&e.id.startsWith('battle:'+x.battleId+':')&&integer(x.entryTick),'宝物战场来源无效');if(e.kind==='capture')fail(e.sourceId===x.enemyId&&OFFICER_BY_ID[x.enemyId]&&integer(x.initial)&&x.initial>0&&integer(x.damage)&&e.probability===(x.damage>=x.initial*TREASURE_RULES.plunderDamage&&hasStrategicTrait({id:e.officerId},'treasureCapture')?TREASURE_RULES.plunderChance:TREASURE_RULES.captureChance),'夺宝判定贡献无效');else fail(e.kind==='discovery'&&Number.isFinite(x.contribution)&&x.contribution>=0&&e.probability===(x.contribution>0&&hasStrategicTrait({id:e.officerId},'treasureDiscovery')?TREASURE_RULES.eyeChance:TREASURE_RULES.discoveryChance),'眼力战场贡献无效');}
  if(e.roll!==undefined)fail(!!e.workSource!==!!e.battleSource,'宝物随机判定缺少唯一来源');
  if(e.won)fail(s.cities.some(c=>c.id===e.cityId)&&(e.recipientId===null||!!OFFICER_BY_ID[e.recipientId]),'宝物接收凭据无效');
  fail(typeof e.id==='string'&&integer(e.day,day(s))&&e.day>0&&['grant','capture','discovery','settled'].includes(e.kind)&&typeof e.faction==='string'&&(e.treasureId===null||!!TREASURE_DESIGNS[e.treasureId])&&(e.officerId===null||!!OFFICER_BY_ID[e.officerId]),'宝物结算来源无效');if(e.roll!==undefined)fail(Number.isFinite(e.roll)&&e.roll>=0&&e.roll<1&&[.02,.04,.05,.10].includes(e.probability)&&typeof e.won==='boolean'&&e.won===(e.roll<e.probability),'宝物判定或随机结果无效');}
}
