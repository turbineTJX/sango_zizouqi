import {battleBuildings} from './building-rules.mjs';
import {attackOrbDescription} from './attack-orbs.mjs';
import {EXPANDED_TACTICS,EXPANDED_FORCE,EXPANDED_INTELLECT,EXPANDED_ROLES} from './expanded-tactics.mjs';
import {hexDistance, hexNeighbors, hexBeyond} from './hex-grid.mjs';
import {unitAttributes,isRear} from './unit-stats.mjs';
import {blockedTerrain,canOccupy,gateTarget} from './battlefield.mjs';
import {COMBAT} from './combat-rules.mjs';
import {tacticPowerProfile,tacticPowerDescription} from './tactic-power.mjs';
import {terrainTacticDescription} from './terrain-rules.mjs';
import {meleeTargetPool,interceptorsAt,canStrikeFrom,holdsLine,isMelee} from './engagement.mjs';
import {FAMOUS_OFFICERS,famousTacticId,famousTacticDescription} from './famous-officers.mjs';
// Data and deterministic targeting for the three automatic tactics on each unit.
const tactic = (name, threshold, cooldown, effect, visual, description) => ({ name, threshold, cooldown, effect, visual, description });
const scheme = (name,threshold,cooldown,effect,visual,description,range=3) => ({...tactic(name,threshold,cooldown,effect,visual,description),category:'intellect',range});
export const TACTICS_BOOK = {
  ...EXPANDED_TACTICS,
  smoke: scheme('扰乱',55,28,'confuse','shockwave','扰乱射程内敌军，使其混乱；时长随谋略威力增长、受军纪减免；混乱时随机转移阵位、无法攻击或施法',4),
  wildfire: scheme('火计',85,30,'wildfire','fire','对相邻最多 2 队造成 0.85 倍谋略伤害并灼烧 6 步；主目标已燃烧时命中伤害提高至 1.25 倍；灼烧每层为当前谋略威力×(6/280＋0.04)，受军纪抵御；燃击 12 步，普攻续叠灼烧（最多 3 层、刷新 6 步）；自身谋攻 16 步，普攻改用 0.8 倍谋略威力、受军纪抵御',4),
  rally: scheme('振旅',15,22,'rally','banner','为 2 格内最多 2 队其他友军增加 24＋谋略威力×0.02 战意；仅在友军缺少至少 15 战意时发动',2),
  doubt: scheme('疑阵',65,26,'confuse','shockwave','攻击 2 格内敌军（1.6 倍谋略）并使其混乱；自身谋攻 10 步，普攻改用 0.8 倍谋略威力、受军纪抵御；需在前线承伤',2),
  ward: scheme('挑衅',25,24,'taunt','banner','嘲讽 5 格内一队敌军 4 步：优先攻击或合法接近自身，可吸引弓弩；受坚定保护、可净化，不越过有效 ZOC；不附带减伤',5),
  cleanse: scheme('解围',30,22,'cleanse','banner','清除 2 格内一队友军的控制与减益，给予兵力上限×(8%＋谋略威力/8000)护盾，持续 8 步；无减益不发动',2),
  lure: scheme('诱敌',40,24,'lure','charge','诱使 3 格内敌军向自身移动 1 格，并降低其防御 6 步；方阵不受诱导',3),
  harass: scheme('挫锐',15,22,'harass','banner','优先压制 3 格内威胁友军的敌人：降低 24＋谋略威力×0.03 战意，并使攻击 −20% 持续 6 步；不造成伤害',3),
  relay: scheme('策应',25,26,'relay','banner','为 2 格内最多 2 队其他友军恢复兵力上限×(7%＋谋略威力/10000)的伤兵，冷却缩短 2 步，并加速 4 步；不治疗自身，不复活；施放后重置普攻间隔',2),
  ambush: scheme('伏弩',35,18,'ambush','shockwave','伏击 2 格内敌人（0.6 倍谋略），使其移速减半、攻击 −20%，持续 6 步；优先尚未被削弱的敌人',2),
  seal: scheme('扰策',60,26,'seal','slash','封锁 4 格内敌人的后续战法；基础 5 步，受军纪减免；优先战意高者，不造成伤害',4),
  screen: scheme('救护',25,24,'screen','banner','为 3 格内一队受损友军恢复兵力上限×(8%＋谋略威力/10000)的伤兵，附加 4% 护盾 6 步；无伤兵时仅保护接敌者，不复活；施放后重置普攻间隔',3),
  fire: {...tactic('火矢',25,22,'fire','fire',attackOrbDescription('fire')),attackOrb:true},
  scatter: tactic('乱射',75,26,'scatter','volley','攻击射程内最多 3 支相邻敌军，单队伤害较低'),
  suppress: {...tactic('阻射',20,18,'suppress','volley',attackOrbDescription('suppress')),attackOrb:true},
  thrust: tactic('贯阵',45,18,'thrust','slash','刺击相邻目标（1.3 倍武技），波及其身后一格敌军（1.1 倍）；优先可贯穿的阵列'),
  phalanx: tactic('方阵',25,26,'phalanx','banner','接敌时列阵 8 步：自身减伤 30%，停止移动并免疫击退'),
  strike: tactic('奋击',80,22,'strike','slash','攻击相邻敌军（1.7 倍武技）；目标被控制、迟滞或破防时提高至 2.5 倍，优先符合条件者'),
  gallop: tactic('疾驰',0,22,'gallop','charge','无需战意；行军接敌或 2 格内有敌人时发动：自身减伤 25% 持续 6 步；有接敌路线时额外移速 +1；不造成伤害'),
  rush: tactic('冲阵',65,24,'rush','charge','沿最多 3 格空闲路线冲击（1.6 倍武技，对弓弩 2.2 倍），优先可达后排；骑兵突入后追击 8 步，对弓弩普攻 +35%；不能穿过有效 ZOC'),
  valor: tactic('奋战',20,26,'valor','banner','交战范围内，自身攻击提高 25%，同时自身破防（防御 −20%），持续 8 步；适合侧翼持续输出'),
  repeat: tactic('连射',55,22,'repeat','volley','对同一敌军连续射击两次'),
  retreatShot: tactic('退射',50,20,'retreatShot','volley','近敌威胁时退至更安全的相邻空格，再射击'),
  pierce: {...tactic('破甲',25,22,'pierce','slash',attackOrbDescription('pierce')),attackOrb:true},
  terror: { ...tactic('八百破阵',100,34,'terror','charge','沿最多 3 格路线突进，冲击并眩晕目标 2 步'), special:true },
  protect: { ...tactic('虎卫折冲',100,32,'protect','shockwave','保护邻近受威胁友军：给其护盾并击退一支贴身敌军'), special:true },
  undermine: { category:'intellect', ...tactic('十胜奇谋',100,30,'undermine','banner','优先打击战意比例最高的敌军，降低其 45 战意；不打断施法'), special:true },
};

for(const [id,p] of Object.entries(FAMOUS_OFFICERS))if(p.tactic)TACTICS_BOOK[famousTacticId(id)]={...p.tactic,effect:'famous',special:true,visual:p.tactic.burn?'fire':p.tactic.mode==='support'?'banner':p.tactic.control?'shockwave':'slash',description:famousTacticDescription(p.tactic)};
for(const [id,s] of Object.entries(TACTICS_BOOK)){s.id=id;s.category ||= 'force';s.terrainDescription=terrainTacticDescription(s);s.power=tacticPowerProfile(s);s.powerDescription=tacticPowerDescription(s);}
export const TROOP_TACTICS = {...EXPANDED_FORCE,
  archer:['fire','scatter','suppress'], spear:['thrust','phalanx','strike'],
  cavalry:['gallop','rush','valor'], crossbow:['repeat','retreatShot','pierce'],
};
export const SPECIAL_TACTICS = { liao:'terror', chu:'protect', jia:'undermine' };
for(const [id,p] of Object.entries(FAMOUS_OFFICERS))if(p.tactic)SPECIAL_TACTICS[id]=famousTacticId(id);
export const INTELLECT_TACTICS = {...EXPANDED_INTELLECT,archer:['smoke','wildfire','rally'],spear:['doubt','ward','cleanse'],cavalry:['lure','harass','relay'],crossbow:['ambush','seal','screen']};
export const CATEGORY_NAMES = {force:'武力',intellect:'智力',politics:'政治'};
const TOOL_NOTES = {
  thrust:['纵列穿透','敌军分散时只命中一队'],phalanx:['定点承伤','列阵期间无法移动，追击与转场受限'],strike:['配合收割','无控制或破防铺垫时伤害较低'],
  doubt:['近程谋攻','需靠近前线；控制受军纪和控制保护限制'],ward:['远距引战','只影响一队，吸引火力但不减伤；需队友护盾或方阵承伤'],cleanse:['解除压制','无减益时不发动，无法预先套盾'],
  gallop:['机动承伤','无伤害；自身减伤不保护队友'],rush:['乘隙追击','需空闲路径；追击仍受新接战、嘲讽与封路限制'],valor:['持续输出','强化普攻但自身防御下降，正面集火时更脆弱'],
  lure:['牵引破防','无伤害；无法拉动方阵或贴身敌人'],harass:['压制敌方输出','无伤害；只削弱一队且不提供自身减伤'],relay:['前线治疗策应','只治疗其他友军已有伤兵；短射程，无伤害、不治疗自身'],
  fire:['叠燃消耗','需连续攻击同一目标；停火、换目标或被净化会损失积累'],scatter:['范围覆盖','单体倍率低；敌军分散时收益低'],suppress:['阻击减速','需普攻兑现三次迟滞，贴身肉搏时减速价值下降'],
  smoke:['远程混乱','无直接伤害；控制保护期间无法重复控制'],wildfire:['谋攻叠燃','门槛高、冷却长；持续射击才能叠满灼烧，净化清空层数'],rally:['启动友军战法','不鼓舞自身，队友满战意时无收益'],
  repeat:['单体爆发','不破甲、不控制，也无法自保'],retreatShot:['撤步自保','需要安全空格，会离开原有支援阵位'],pierce:['集火破甲','降防在普攻命中后生效，需要物理队友跟进'],
  ambush:['近身反制','只有 2 格射程，无法远程先手'],seal:['封锁战法','不造成伤害，也不阻止敌人普攻移动'],screen:['单体救护','只恢复已有伤兵；单目标，无伤害、不解控'],
};
for(const [id,[role,tradeoff]] of Object.entries(TOOL_NOTES))Object.assign(TACTICS_BOOK[id],{role,tradeoff});
export function availableTactics(unit) {
  return [...(TROOP_TACTICS[unit.type]||TROOP_TACTICS.spear),...(INTELLECT_TACTICS[unit.type]||INTELLECT_TACTICS.spear),...(SPECIAL_TACTICS[unit.id]?[SPECIAL_TACTICS[unit.id]]:[])].map(id=>TACTICS_BOOK[id]);
}
// Roles are available to every officer; stats affect output, never role eligibility.
export const TACTIC_ROLES = {...EXPANDED_ROLES,
  spear:[{id:'assault',name:'物理战坦',ids:['phalanx','strike','thrust'],position:'前排承伤，配合破防队友输出；可将奋击换挑衅偏控制',cost:'放弃嘲讽、谋略伤害与净化'},
    {id:'guard',name:'纯坦克',ids:['cleanse','phalanx','ward'],position:'站在主力前方，方阵承伤、挑衅吸引火力',cost:'放弃全部直接伤害战法与混乱控制'},
    {id:'control',name:'法术战坦',ids:['phalanx','doubt','ward'],position:'在前线以军纪抵御谋攻，疑阵输出并控制，挑衅保护队友',cost:'放弃物理爆发、穿透与净化'}],
  cavalry:[{id:'assault',name:'近战刺客',ids:['gallop','rush','valor'],position:'侧翼等前排打开缺口，再突入弓弩；不适合正面主坦',cost:'放弃治疗、削弱与牵引；奋战期间防御下降'},
    {id:'guard',name:'前排医辅',ids:['gallop','relay','harass'],position:'靠近主坦接战获得战意，再贴近队友治疗与策应',cost:'放弃冲阵和强化输出；无法治疗自身'},
    {id:'control',name:'诱敌策应',ids:['lure','harass','relay'],position:'侧翼牵引敌人进入友军射界，靠近队友策应',cost:'放弃自身减伤、冲锋与攻击强化'}],
  archer:[{id:'assault',name:'物理后排',ids:['fire','scatter','suppress'],position:'在前排保护下射击，迟滞追击者',cost:'放弃谋略爆发、混乱与鼓舞'},
    {id:'guard',name:'阻击掩护',ids:['smoke','suppress','rally'],position:'留在主力 2 格内，拖慢接近后排的敌人',cost:'放弃燃烧与范围火力'},
    {id:'control',name:'法术后排',ids:['smoke','wildfire','rally'],position:'后排控制与火攻，鼓舞队友形成连携',cost:'放弃物理爆发、减速自保与治疗'}],
  crossbow:[{id:'assault',name:'物理后排',ids:['pierce','repeat','retreatShot'],position:'与物理主力集火，预留退射空格',cost:'放弃封技、近身伏击与救护'},
    {id:'guard',name:'后排医辅',ids:['screen','seal','ambush'],position:'与主坦保持 3 格内，治疗并压制靠近的敌军',cost:'放弃连射、破甲与撤步自保'},
    {id:'control',name:'游走狙击',ids:['retreatShot','pierce','seal'],position:'侧后方留出撤步空格',cost:'放弃连射爆发、伏击削弱与救护'}],
};
export function roleTacticIds(u,role) {return [...TACTIC_ROLES[u.type].find(r=>r.id===role).ids];}
export function recommendedTacticIds(u) {
  const ids=roleTacticIds(u,'assault'),special=SPECIAL_TACTICS[u.id];
  if(special)ids[0]=special;
  return ids;
}
export function defaultTacticIds(unit,category='force') {
  const pool=category==='intellect'?INTELLECT_TACTICS:TROOP_TACTICS;
  const ids=[...(pool[unit.type]||pool.spear)];
  const special=SPECIAL_TACTICS[unit.id];
  if(special && (category==='force'||TACTICS_BOOK[special].category===category))ids[2]=special;
  return ids;
}
export function validLoadout(unit,ids) {
  const allowed=new Set(availableTactics(unit).map(s=>s.id));
  return Array.isArray(ids)&&ids.length===3&&new Set(ids).size===3&&ids.every(id=>allowed.has(id));
}
export function unitTactics(unit) {
  const ids=validLoadout(unit,unit.tactics)?unit.tactics:defaultTacticIds(unit);
  return ids.map(id=>TACTICS_BOOK[id]);
}
export function configureTactics(unit,ids) {
  if(!validLoadout(unit,ids))return '请选择本兵种或本武将可用的 3 个不同战法';
  unit.tactics=[...ids];return null;
}
export const NEGATIVE_STATUSES=['stun','confuse','seal','slow','armorBreak','weaken','burn','scorch','taunt','curse','blight','plague','shaken'];
export const statusPower = (unit,skill,b=null) => {const stats=unitAttributes(unit,b);if(skill.passive)return (80+(unit.intellect||0)*1.4+(unit.politics||0)*.6)*Math.max(0,unit.hp??unit.troops??0)/3000*(1-(unit.supplyPenalty||0));return skill.category==='politics'?stats.supportPower:skill.category==='intellect'?stats.strategyPower:stats.martialPower;};
export const distance = hexDistance;
export const living = (b,side) => b.sides[side].units.filter(u=>u.status==='active' && u.hp>0);
export function shieldLayers(b,u) {
  const shield=u.statuses?.shield;if(!shield)return [];
  return shield.layers.filter(l=>l.until>b.tick&&l.amount>0).map(l=>({...l}));
}
export const shieldAmount=(b,u)=>shieldLayers(b,u).reduce((n,l)=>n+l.amount,0);
export function refreshShield(b,u,layers=shieldLayers(b,u)) {
  if(!layers.length){if(u.statuses)delete u.statuses.shield;return;}
  u.statuses ||= {};u.statuses.shield={until:Math.max(...layers.map(l=>l.until)),amount:layers.reduce((n,l)=>n+l.amount,0),layers};
}
export function absorbShield(b,u,damage) {
  const layers=shieldLayers(b,u).sort((a,c)=>a.until-c.until||a.source.localeCompare(c.source));
  for(const l of layers){const used=Math.min(l.amount,damage);l.amount-=used;damage-=used;if(!damage)break;}
  refreshShield(b,u,layers.filter(l=>l.amount>0));return damage;
}
export const hasStatus = (b,u,key) => key==='shield'?shieldAmount(b,u)>0:(u.statuses?.[key]?.until||0)>b.tick;
export function setStatus(b,u,key,duration,extra={}) {
  u.statuses ||= {};
  const provenance=previous=>{
    const origins=[...(previous?.origins||[]),...(extra.sourceSkillName?[{sourceName:extra.sourceName,sourceSkillName:extra.sourceSkillName}]:[])];
    return [...new Map(origins.map(o=>[JSON.stringify(o),o])).values()];
  };
  if(key==='shield') {
    const source=extra.source||'unattributed',layers=shieldLayers(b,u).filter(l=>l.source!==source);
    const amount=Math.max(0,Math.min(extra.amount,u.maxHp-layers.reduce((n,l)=>n+l.amount,0)));
    if(amount)layers.push({source,label:extra.label||'护盾',amount,until:b.tick+duration+1});
    refreshShield(b,u,layers);return;
  }
  // Independent applications build one bounded fire, not unlimited DOT instances.
  // Retain the stronger per-layer snapshot; follow-up hits refresh only six steps.
  if(key==='burn') {
    const current=hasStatus(b,u,'burn')?u.statuses.burn:null;
    const oldBase=current?.baseAmount??0;
    const stacks=Math.min(3,(current?.stacks||0)+1),baseAmount=Math.max(oldBase,extra.amount);
    const sourceId=oldBase>extra.amount?current.sourceId:extra.sourceId;
    const origin=oldBase>extra.amount?current:extra;
    u.statuses.burn={until:Math.max(current?.until||0,b.tick+duration+1),sourceId,sourceName:origin.sourceName,sourceSkillName:origin.sourceSkillName,origins:provenance(current),baseAmount,stacks,amount:baseAmount*stacks};return;
  }
  if(key==='curse'){const current=hasStatus(b,u,'curse')?u.statuses.curse:null;const stacks=Math.min(3,(current?.stacks||0)+1);const origin=(current?.potency??0)>(extra.potency??1)?current:extra;u.statuses.curse={until:b.tick+duration+1,sourceId:origin.sourceId,sourceName:origin.sourceName,sourceSkillName:origin.sourceSkillName,origins:provenance(current),stacks,potency:Math.max(current?.potency??0,extra.potency??1)};return;}
  if(key==='ward'&&hasStatus(b,u,'ward')&&u.statuses.ward.percent>extra.percent)return;
  u.statuses[key] = { until:b.tick+duration+1,...extra };
}
export function openCell(b,x,y,actor=null) {
  return x>=0 && x<14 && y>=0 && y<8 && !blockedTerrain(b,x,y) && (!actor||canOccupy(b,actor,x,y)) && !b.sides.flatMap(s=>s.units).some(u=>u.status==='active' && u.hp>0 && u.x===x && u.y===y);
}
export function routeTo(b,u,target,max=3,{range=1,charging=true,ignoreZoc=false}={}) {
  const queue=[{x:u.x,y:u.y,path:[]}],seen=new Set([`${u.x},${u.y}`]);
  while(queue.length) {
    const p=queue.shift();
    if(distance(p,target)<=range&&(ignoreZoc||canStrikeFrom(b,u,target,p,charging)))return p.path;
    if(!ignoreZoc&&interceptorsAt(b,u,p,charging).length)continue;
    if(p.path.length>=max)continue;
    for(const [x,y] of hexNeighbors(p)) {
      const key=`${x},${y}`;
      const inDefenseLine=!b.siege || ![0,1].includes(u.side) || b.siege.gate.side!==u.side || (u.side===0?x<=4:x>=9);
      if(!seen.has(key)&&inDefenseLine&&openCell(b,x,y,u)) {seen.add(key);queue.push({x,y,path:[...p.path,{x,y}]});}
    }
  }
  return null;
}
export function tauntTarget(b,u,range) {
  const status=u.statuses?.taunt;
  if(!status||status.until<=b.tick)return null;
  const source=living(b,1-u.side).find(e=>e.id===status.sourceId);
  if(!source||b.sides[source.side].retreat)return null;
  if(distance(u,source)>range&&unitAttributes(u,b).move<=0)return null;
  return routeTo(b,u,source,14,{range,charging:false})!==null?source:null;
}
export function pursuitTarget(b,u,enemies) {
  const pursuit=u.statuses?.pursuit;
  if(u.type!=='cavalry'||!pursuit||pursuit.until<=b.tick||interceptorsAt(b,u).length)return null;
  return enemies.filter(e=>isRear(e)&&distance(u,e)<=4&&routeTo(b,u,e,4)!==null)
    .sort((a,c)=>Number(c.id===pursuit.targetId)-Number(a.id===pursuit.targetId)||distance(u,a)-distance(u,c)||a.hp/a.maxHp-c.hp/c.maxHp||a.id.localeCompare(c.id))[0]||null;
}
// A charger may spend time flanking an exposed rear, but cannot leave a live
// interception or take an unbounded detour. Ordinary melee keeps its front focus.
export function flankingTarget(b,u,enemies) {
  if(interceptorsAt(b,u).length||!(hasStatus(b,u,'phase')&&isMelee(u))&&(u.type!=='cavalry'||!unitTactics(u).some(s=>['rush','terror'].includes(s.effect))))return null;
  const nearest=Math.min(...enemies.map(e=>distance(u,e)));
  return enemies.filter(e=>isRear(e)&&distance(u,e)<=6)
    .map(target=>({target,path:routeTo(b,u,target,Math.min(6,nearest+2))}))
    .filter(p=>p.path!==null).sort((a,c)=>a.path.length-c.path.length||a.target.hp/a.target.maxHp-c.target.hp/c.target.maxHp||idOrder(a.target,c.target))[0]?.target||null;
}
export function retreatCell(b,u) {
  const enemies=living(b,1-u.side);
  const safety=p=>Math.min(...enemies.map(e=>distance(p,e)));
  return hexNeighbors(u).map(([x,y])=>({x,y}))
    .filter(p=>openCell(b,p.x,p.y,u)&&safety(p)>safety(u)).sort((a,c)=>safety(c)-safety(a))[0];
}
const idOrder=(a,c)=>a.id.localeCompare(c.id);
export const exposedTarget=(b,u)=>['stun','confuse','slow','armorBreak'].some(k=>hasStatus(b,u,k));
const threatened=(b,u)=>living(b,1-u.side).some(e=>distance(u,e)<=2);
export const recoverableWounded=u=>Math.max(0,Math.min(u.maxHp-u.hp,Math.floor(((u.battleDamage??u.initial-u.hp)-(u.battleDeserted||0))*.35)-(u.healed||0)));
export function supportAnchor(b,u) {
  if(u.type==='logistics')return null; // Auxiliaries fight in melee, rather than parking behind an ally.
  const skills=unitTactics(u),medical=skills.filter(s=>['screen','relay','bandage','regrowth','purify','passage','supply','camp','boarding','mist','nexus'].includes(s.effect));
  // A charger may carry relay without becoming a stationary medic. Offensive
  // cavalry must still close with enemies when its support targets are not ready.
  // Pure guard/control cavalry (gallop/relay/harass, lure/harass/relay) still anchor.
  if(u.type==='cavalry'&&skills.some(s=>s.category==='force'&&!['gallop','valor'].includes(s.effect)&&!(s.effect==='famous'&&s.mode==='support')))return null;
  if(!medical.length||u.intent<Math.min(...medical.map(s=>s.threshold))||skills.filter(s=>s.category==='force'&&!['gallop','phalanx','valor','protect','bandage','supply','camp','bulwark','riposte','anchor','emplace'].includes(s.effect)).length>1)return null;
  const allies=living(b,u.side).filter(a=>a!==u),front=allies.filter(isMelee);
  return (front.length?front:allies).sort((a,c)=>Number(threatened(b,c))-Number(threatened(b,a))||recoverableWounded(c)-recoverableWounded(a)||distance(u,a)-distance(u,c)||idOrder(a,c))[0]||null;
}
export function basicSupportTargets(b,u,s) {
  const allies=living(b,u.side).filter(a=>distance(u,a)<=s.range);
  if(s.effect==='rally')return allies.filter(a=>a!==u&&a.intent<=COMBAT.intentCap-15).sort((a,c)=>a.intent-c.intent||idOrder(a,c)).slice(0,2);
  if(s.effect==='relay'){
    const value=a=>recoverableWounded(a)/20+Object.values(a.skillReady||{}).reduce((n,t)=>n+Math.min(2,Math.max(0,t-b.tick)),0);
    return allies.filter(a=>a!==u&&value(a)>0).sort((a,c)=>value(c)-value(a)||idOrder(a,c)).slice(0,2);
  }
  if(s.effect==='screen')return allies.filter(a=>recoverableWounded(a)>=a.maxHp*.02||threatened(b,a)&&!shieldLayers(b,a).some(l=>l.source===u.id+':'+s.id)).sort((a,c)=>recoverableWounded(c)/c.maxHp-recoverableWounded(a)/a.maxHp||a.hp/a.maxHp-c.hp/c.maxHp||idOrder(a,c)).slice(0,1);
  return [];
}
export function areaTacticTargets(b,u,s,target,range) {
  return [target,...living(b,1-u.side).filter(t=>t!==target&&distance(target,t)<=(s.effect==='scatter'?2:1)&&distance(u,t)<=range).sort(idOrder)].slice(0,['scatter','bombard'].includes(s.effect)?3:2);
}
export function supportUtility(b,u,a,s){
  if(s.requiresWounded&&recoverableWounded(a)<=0)return 0;
  const negatives=NEGATIVE_STATUSES.filter(k=>hasStatus(b,a,k)).length;
  const threatened=living(b,1-u.side).some(e=>distance(a,e)<=2);
  const missing=1-a.hp/a.maxHp;
  let score=0;
  if(s.cleanse)score+=negatives*45;
  if(s.heal)score+=Math.min(recoverableWounded(a),a.maxHp*s.heal)/10;
  if(s.shield&&(missing>.1||threatened)&&!shieldLayers(b,a).some(l=>l.source===u.id+':'+s.id))score+=20+missing*40;
  if(s.intent&&a!==u&&a.intent<=COMBAT.intentCap-15)score+=Math.min(s.intent,COMBAT.intentCap-a.intent);
  if(s.cooldownReduction&&a!==u)score+=Object.values(a.skillReady||{}).reduce((n,t)=>n+Math.min(s.cooldownReduction,Math.max(0,t-b.tick)),0)*4;
  if(s.ward&&threatened&&!hasStatus(b,a,'ward'))score+=20;
  if(s.valor&&threatened&&!hasStatus(b,a,'valor'))score+=20;
  if(s.buffs&&threatened)for(const key of Object.keys(s.buffs))if(!hasStatus(b,a,key))score+=20;
  return score;
}
// Selection and resolution share this list: the chosen anchor always receives the effect.
export function famousTargets(b,u,s,target=null){
  const pool=living(b,s.mode==='support'?u.side:1-u.side).filter(a=>distance(u,a)<=s.range);
  if(s.mode==='support')return pool.filter(a=>supportUtility(b,u,a,s)>0)
    .sort((a,c)=>supportUtility(b,u,c,s)-supportUtility(b,u,a,s)||idOrder(a,c)).slice(0,s.targets||1);
  if(!target)return [];
  return [target,...pool.filter(a=>a!==target&&distance(target,a)<=(s.radius??0))
    .sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp||idOrder(a,c))].slice(0,s.targets||1);
}
function famousTarget(b,u,s,enemies){
  if(s.mode==='support')return famousTargets(b,u,s)[0]||null;
  const score=e=>{
    let value=(1-e.hp/e.maxHp)*12;
    const hits=famousTargets(b,u,s,e);
    value+=(hits.length-1)*30;
    if(s.execute&&e.hp/e.maxHp<.4)value+=25;
    if(s.drain)value+=Math.min(e.intent,s.drain)*.4;
    if(s.debuff==='seal')value+=!hasStatus(b,e,'seal')?e.intent*.2:0;
    if(s.control)value+=!hasStatus(b,e,'resolve')?22:0;
    if(s.debuff&&!hasStatus(b,e,s.debuff))value+=8;
    return value;
  };
  return enemies.filter(e=>distance(u,e)<=s.range).sort((a,c)=>score(c)-score(a)||distance(u,a)-distance(u,c)||idOrder(a,c))[0]||null;
}
export function expandedSupportTargets(b,u,s){
  let allies=living(b,u.side).filter(a=>distance(u,a)<=s.range);
  const wound=a=>recoverableWounded(a),negative=a=>NEGATIVE_STATUSES.some(k=>hasStatus(b,a,k));
  switch(s.effect){
    case 'bandage': allies=allies.filter(a=>wound(a)>=a.maxHp*.02);break;
    case 'regrowth':allies=allies.filter(a=>wound(a)>=a.maxHp*.02&&!hasStatus(b,a,'regrowth'));break;
    case 'purify':allies=allies.filter(negative);break;
    case 'supply':return allies.filter(a=>a!==u&&a.intent<=COMBAT.intentCap-15).sort((a,c)=>a.intent-c.intent||idOrder(a,c)).slice(0,1);
    case 'camp':case 'mirage':case 'mist':allies=allies.filter(a=>threatened(b,a)&&!hasStatus(b,a,s.effect==='camp'?'camp':'illusion'));break;
    case 'boarding':allies=allies.filter(a=>a!==u&&a.type==='ship'&&(wound(a)>=a.maxHp*.02||a.intent<=COMBAT.intentCap-20));break;
    case 'nexus':return allies.filter(a=>a!==u&&!hasStatus(b,a,'nexus')&&(threatened(b,a)||unitTactics(a).some(t=>t.category==='intellect'))).sort((a,c)=>unitAttributes(c,b).strategyPower-unitAttributes(a,b).strategyPower||idOrder(a,c)).slice(0,1);
    case 'passage':return allies.filter(a=>a!==u&&isMelee(a)&&unitAttributes(a,b).move>0&&!hasStatus(b,a,'phaseLock')&&!hasStatus(b,a,'taunt')&&living(b,1-u.side).some(e=>isRear(e)&&distance(a,e)<=6&&routeTo(b,a,e,6,{ignoreZoc:true})!==null&&routeTo(b,a,e,6)===null)).sort((a,c)=>Number(c.type==='cavalry')-Number(a.type==='cavalry')||idOrder(a,c)).slice(0,1);
    default:return [];
  }
  return allies.sort((a,c)=>wound(c)/c.maxHp-wound(a)/a.maxHp||a.hp/a.maxHp-c.hp/c.maxHp||idOrder(a,c)).slice(0,['camp','mist'].includes(s.effect)?2:1);
}
export function repairTarget(b,u,range=2){
  if((u.tacticCasts?.camp||0)>=3)return null;
  return battleBuildings(b).filter(a=>a.side===u.side&&a.hp>0&&a.hp<a.maxHp&&distance(u,a)<=range).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp||distance(u,a)-distance(u,c)||a.id.localeCompare(c.id))[0]||null;
}
export function tacticTarget(b,u,s,range) {
  if(s.passive)return null;
  if(s.effect==='repair')return repairTarget(b,u,s.range);
  if(s.attackOrb&&hasStatus(b,u,'attackOrb'))return null;
  if(['bandage','regrowth','purify','supply','camp','mirage','mist','boarding','nexus','passage'].includes(s.effect))return expandedSupportTargets(b,u,s)[0]||null;
  if(s.effect==='ram'){const gate=gateTarget(b,u);if(gate&&distance(u,gate)<=s.range&&(!tauntTarget(b,u,s.range)))return gate;}
  let enemies=living(b,1-u.side).sort((a,c)=>distance(u,a)-distance(u,c)||a.id.localeCompare(c.id));
  const offensive=['cleave','curse','blight','bombard','ram','plague','tremor','navalRam','broadside','undertow','confuse','harass','ambush','suppress','pierce','strike','thrust','scatter','wildfire','seal','lure','undermine','rush','terror','retreatShot','repeat','fire','taunt'].includes(s.effect)||s.effect==='famous'&&s.mode==='attack';
  const forced=offensive?tauntTarget(b,u,range):null;
  if(forced){
    const charging=['rush','terror'].includes(s.effect),reach=charging?4:(s.range??range);
    if(distance(u,forced)>reach||charging&&routeTo(b,u,forced,3)===null)return null;
    enemies=[forced];
  }
  const nearest=enemies[0]; if(!nearest)return null;
  const physicalAttack=s.category==='force'&&!['gallop','phalanx','valor','protect','bandage','supply','camp','bulwark','riposte','anchor','emplace'].includes(s.effect)&&!(s.effect==='famous'&&s.mode==='support');
  const targets=physicalAttack?meleeTargetPool(b,u,enemies):enemies;
  range=(s.range ?? range)+(hasStatus(b,u,'emplaced')&&s.category==='force'&&['bombard'].includes(s.effect)?1:0);
  const inRange=targets.filter(e=>distance(u,e)<=range&&distance(u,e)>=(s.minRange||0));
  const allies=living(b,u.side).filter(a=>distance(u,a)<=range);
  if(s.effect==='famous')return famousTarget(b,u,s,targets);
  switch(s.effect) {
    case 'confuse': {
      // Support a nearby equipped charger; control protection still rules out a target.
      const opening=e=>holdsLine(b,e)&&living(b,u.side).some(a=>a!==u&&a.type==='cavalry'&&distance(a,e)<=2&&unitTactics(a).some(t=>['rush','terror'].includes(t.effect)));
      const eligible=inRange.filter(e=>!hasStatus(b,e,'resolve')&&!hasStatus(b,e,'confuse')&&!hasStatus(b,e,'stun'));
      return (eligible.length?eligible:s.id==='doubt'?inRange:[]).sort((a,c)=>Number(opening(c))-Number(opening(a))||c.intent-a.intent||idOrder(a,c))[0]||null;
    }
    case 'taunt': {
      const rear=living(b,u.side).filter(a=>a!==u&&isRear(a));
      const threat=e=>Number(rear.some(a=>distance(e,a)<=2))*3+Number(isRear(e));
      return inRange.filter(e=>!hasStatus(b,e,'resolve')&&!hasStatus(b,e,'taunt'))
        .sort((a,c)=>threat(c)-threat(a)||c.intent-a.intent||distance(u,a)-distance(u,c)||idOrder(a,c))[0]||null;
    }
    case 'cleanse':return allies.find(a=>NEGATIVE_STATUSES.some(key=>hasStatus(b,a,key)))||null;
    case 'screen':case 'rally':case 'relay':return basicSupportTargets(b,u,s)[0]||null;
    case 'harass':return inRange.filter(e=>e.intent>0||!hasStatus(b,e,'weaken')).sort((a,c)=>Number(threatened(b,c))-Number(threatened(b,a))||c.intent-a.intent||idOrder(a,c))[0]||null;
    case 'ambush':return inRange.filter(e=>!hasStatus(b,e,'weaken')||!hasStatus(b,e,'slow'))[0]||null;
    case 'suppress':return inRange.sort((a,c)=>Number(hasStatus(b,a,'slow'))-Number(hasStatus(b,c,'slow'))||Number(threatened(b,c))-Number(threatened(b,a))||distance(u,a)-distance(u,c)||idOrder(a,c))[0]||null;
    case 'pierce':return inRange.sort((a,c)=>Number(hasStatus(b,a,'armorBreak'))-Number(hasStatus(b,c,'armorBreak'))||unitAttributes(c,b).defense-unitAttributes(a,b).defense||idOrder(a,c))[0]||null;
    case 'strike':return inRange.sort((a,c)=>Number(exposedTarget(b,c))-Number(exposedTarget(b,a))||idOrder(a,c))[0]||null;
    case 'thrust':{
      const lined=e=>{const p=hexBeyond(u,e);return enemies.some(t=>t.x===p.x&&t.y===p.y);};
      return inRange.sort((a,c)=>Number(lined(c))-Number(lined(a))||idOrder(a,c))[0]||null;
    }
    case 'bombard':case 'tremor':case 'broadside':case 'undertow':case 'scatter':case 'wildfire':{
      const score=e=>areaTacticTargets(b,u,s,e,range).length*10+(s.effect==='wildfire'&&hasStatus(b,e,'burn')?5:0);
      return inRange.sort((a,c)=>score(c)-score(a)||idOrder(a,c))[0]||null;
    }
    case 'seal':return inRange.filter(e=>!hasStatus(b,e,'seal')).sort((a,c)=>c.intent-a.intent||idOrder(a,c))[0]||null;
    case 'lure':return inRange.find(e=>distance(u,e)>1&&!hasStatus(b,e,'phalanx')&&lureCell(b,u,e))||null;
  }
  switch(s.effect) {
    case 'bulwark':case 'riposte':return distance(u,nearest)<=2&&!hasStatus(b,u,s.effect)?u:null;
    case 'emplace':return distance(u,nearest)>=2&&distance(u,nearest)<=range&&!hasStatus(b,u,'emplaced')?u:null;
    case 'anchor':return distance(u,nearest)<=range&&!hasStatus(b,u,'anchored')?u:null;
    case 'navalRam':return enemies.find(e=>e.type==='ship'&&distance(u,e)>1&&distance(u,e)<=3&&routeTo(b,u,e,2)?.length)||null;
    case 'curse':return inRange.sort((a,c)=>(a.statuses.curse?.stacks||0)-(c.statuses.curse?.stacks||0)||idOrder(a,c))[0]||null;
    case 'blight':case 'plague':return inRange.sort((a,c)=>Number(hasStatus(b,a,'blight'))-Number(hasStatus(b,c,'blight'))||recoverableWounded(c)-recoverableWounded(a)||idOrder(a,c))[0]||null;
    case 'gallop': return !hasStatus(b,u,'ward') && (distance(u,nearest)<=2 || !hasStatus(b,u,'haste') && routeTo(b,u,nearest,14)?.length) ? u : null;
    case 'phalanx': return distance(u,nearest)<=range && !hasStatus(b,u,'phalanx') ? u : null;
    case 'valor': return distance(u,nearest)<=2 && !hasStatus(b,u,'valor') ? u : null;
    case 'rush': case 'terror': {
      // A charge exploits a legal gap even beside a disabled frontliner. Every
      // path cell (including the starting cell) still respects live interceptors.
      const reachable=enemies.filter(e=>distance(u,e)>1&&distance(u,e)<=4&&routeTo(b,u,e,3)?.length);
      const rear=e=>isRear(e);
      return reachable.sort((a,c)=>Number(rear(c))-Number(rear(a))||distance(u,a)-distance(u,c)||idOrder(a,c))[0] || (s.effect==='terror'?targets.find(e=>distance(u,e)===1):null);
    }
    case 'retreatShot': return distance(u,nearest)<=2 && retreatCell(b,u) ? nearest : null;
    case 'protect': return living(b,u.side).filter(a=>a!==u && distance(u,a)<=2 && enemies.some(e=>distance(a,e)===1))
      .sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0] || null;
    case 'undermine': return inRange.filter(e=>e.intent>0).sort((a,c)=>c.intent-a.intent)[0] || null;
    default: return inRange[0] || null;
  }
}
export function lureCell(b,u,target) {
  return hexNeighbors(target).map(([x,y])=>({x,y})).filter(p=>openCell(b,p.x,p.y,target)&&distance(p,u)<distance(target,u)).sort((a,c)=>distance(a,u)-distance(c,u))[0];
}
export function readyTactic(b,u,range) {
  if(hasStatus(b,u,'seal'))return null;
  // Player slot order is the priority; blocked tactics never block a later legal one.
  for(const s of unitTactics(u)) {
    if(u.intent<s.threshold || (u.skillReady?.[s.id]||0)>b.tick)continue;
    const target=tacticTarget(b,u,s,range);
    if(hasStatus(b,u,'phase')){const rear=flankingTarget(b,u,living(b,1-u.side));if(rear&&(!target||target.side===u.side||!isRear(target)))continue;}
    if(target)return {skill:s,target};
  }
  return null;
}
