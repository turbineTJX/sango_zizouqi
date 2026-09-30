import {traitImmune} from './trait-mechanics.mjs';
import {STATUS_DEFINITIONS,REMEDIES,CONTROL_STATUSES,needsRemedy,createDecoy,decoyTargets} from './battle-status-rules.mjs';
import {battleBuildings} from './building-rules.mjs';
import {defenseLine} from './defense-line.mjs';
import {describeTacticTempo,tacticUsesLeft,useRecoveryTargets} from './tactic-tempo.mjs';
import {learnedTacticIds} from './tactic-learning.mjs';
import {attackOrbDescription} from './attack-orbs.mjs';
import {EXPANDED_ROLES} from './expanded-tactics.mjs';
import {hexDistance, hexNeighbors, hexBeyond} from './hex-grid.mjs';
import {unitAttributes,isRear} from './unit-stats.mjs';
import {blockedTerrain,canOccupy,gateTarget} from './battlefield.mjs';
import {COMBAT} from './combat-rules.mjs';
import {tacticPowerProfile,tacticPowerDescription} from './tactic-power.mjs';
import {terrainTacticDescription} from './terrain-rules.mjs';
import {isTargetable,meleeTargetPool,interceptorsAt,canStrikeFrom,holdsLine,isMelee} from './engagement.mjs';
import {FAMOUS_OFFICERS,famousTacticId,famousTacticDescription} from './famous-officers.mjs';
// Design table stores final combat parameters; no hidden second tuning pass.
import {TACTIC_DESIGNS} from './data/design/tactics.mjs';
import {TROOP_TACTIC_POOLS,INTELLECT_TACTIC_POOLS,OFFICER_ASSIGNMENTS} from './data/design/assignments.mjs';
export const TACTICS_BOOK=structuredClone(TACTIC_DESIGNS);
for(const s of Object.values(TACTICS_BOOK)){s.tempoDescription=describeTacticTempo(s);s.description+='；'+s.tempoDescription;}
for(const [id,s] of Object.entries(TACTICS_BOOK)){s.id=id;s.category ||= 'force';s.terrainDescription=terrainTacticDescription(s);s.power=tacticPowerProfile(s);s.powerDescription=tacticPowerDescription(s);}
export const TROOP_TACTICS=structuredClone(TROOP_TACTIC_POOLS);
export const INTELLECT_TACTICS=structuredClone(INTELLECT_TACTIC_POOLS);
export const SPECIAL_TACTICS=Object.fromEntries(Object.entries(OFFICER_ASSIGNMENTS).filter(([,a])=>a.specialTactic).map(([id,a])=>[id,a.specialTactic]));
export const CATEGORY_NAMES = {force:'武力',intellect:'智力',politics:'政治'};
export function availableTactics(unit) {
  return [...(TROOP_TACTICS[unit.type]||TROOP_TACTICS.spear),...(INTELLECT_TACTICS[unit.type]||INTELLECT_TACTICS.spear),...(SPECIAL_TACTICS[unit.id]?[SPECIAL_TACTICS[unit.id]]:[])].map(id=>TACTICS_BOOK[id]);
}
// Roles are available to every officer; stats affect output, never role eligibility.
export const TACTIC_ROLES = {...EXPANDED_ROLES,
  spear:[{id:'assault',name:'物理战坦',ids:['phalanx','strike','thrust'],position:'前排承伤，配合破防队友输出；可将奋击换挑衅偏控制',cost:'放弃嘲讽、谋略伤害与镇静'},
    {id:'guard',name:'纯坦克',ids:['cleanse','phalanx','ward'],position:'站在主力前方，方阵承伤、挑衅吸引火力',cost:'放弃全部直接伤害战法与混乱控制'},
    {id:'control',name:'法术战坦',ids:['phalanx','doubt','ward'],position:'在前线以军纪抵御谋攻，疑阵输出并控制，挑衅保护队友',cost:'放弃物理爆发、穿透与镇静'}],
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
  return learnedTacticIds(u);
}
export function defaultTacticIds(unit,category='force') {
  return learnedTacticIds(unit);
}
export function validLoadout(unit,ids) {
  const allowed=new Set(learnedTacticIds(unit));
  return Array.isArray(ids)&&ids.length===allowed.size&&new Set(ids).size===ids.length&&ids.every(id=>allowed.has(id));
}
export function unitTactics(unit) {
  const ids=validLoadout(unit,unit.tactics)?unit.tactics:defaultTacticIds(unit);
  return ids.map(id=>TACTICS_BOOK[id]);
}
export function configureTactics(unit,ids) {
  if(!validLoadout(unit,ids))return '自动携带当前兵种全部固定战法与专属战法，只能调整顺序';
  unit.tactics=[...ids];return null;
}
export const NEGATIVE_STATUSES=Object.keys(STATUS_DEFINITIONS).filter(k=>['debuff','control','damage'].includes(STATUS_DEFINITIONS[k].tone));
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
  if(!STATUS_DEFINITIONS[key]||u.isDecoy||traitImmune(u,key))return false;
  if(NEGATIVE_STATUSES.includes(key)&&(hasStatus(b,u,'stasis')||key!=='hunger'&&hasStatus(b,u,'magicImmune')))return false;
  if(CONTROL_STATUSES.includes(key)&&hasStatus(b,u,'resolve'))return false;
  if(key==='decoy')return createDecoy(b,u,extra,duration);
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
  if(key==='ward'&&hasStatus(b,u,'ward')&&u.statuses.ward.percent>extra.percent)return;
  const prior=hasStatus(b,u,key)?u.statuses[key]:null;
  const magnitude=v=>['powerDown','armorBreak','weaken'].includes(key)?(v.fraction??.2*(v.potency??1)):(v.percent??v.amount??v.fraction??v.potency??1);
  const next={until:b.tick+duration+1,...extra};
  if(prior&&magnitude(prior)>magnitude(next))return;
  u.statuses[key]={...next,until:Math.max(prior?.until||0,next.until)};
}
export function openCell(b,x,y,actor=null) {
  return x>=0 && x<14 && y>=0 && y<8 && !blockedTerrain(b,x,y) && (!actor||canOccupy(b,actor,x,y)) && !b.sides.flatMap(s=>s.units).some(u=>u.status==='active' && u.hp>0 && u.x===x && u.y===y);
}
export function routeTo(b,u,target,max=3,{range=1,charging=true,ignoreZoc=false,requireStrike=true}={}) {
  const inLine=defenseLine(b,u,target);
  const queue=[{x:u.x,y:u.y,path:[]}],seen=new Set([`${u.x},${u.y}`]);
  while(queue.length) {
    const p=queue.shift();
    if(distance(p,target)<=range&&(ignoreZoc||!requireStrike||canStrikeFrom(b,u,target,p,charging)))return p.path;
    if(!ignoreZoc&&interceptorsAt(b,u,p,charging).length)continue;
    if(p.path.length>=max)continue;
    for(const [x,y] of hexNeighbors(p)) {
      const key=`${x},${y}`;
      const inDefenseLine=inLine({x,y});
      if(!seen.has(key)&&inDefenseLine&&openCell(b,x,y,u)) {seen.add(key);queue.push({x,y,path:[...p.path,{x,y}]});}
    }
  }
  return null;
}
export function tauntTarget(b,u,range) {
  const status=u.statuses?.taunt;
  if(!status||status.until<=b.tick)return null;
  const source=living(b,1-u.side).filter(e=>isTargetable(b,e)).find(e=>e.id===status.sourceId);
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
  const enemies=living(b,1-u.side).filter(e=>isTargetable(b,e));
  const safety=p=>Math.min(...enemies.map(e=>distance(p,e)));
  return hexNeighbors(u).map(([x,y])=>({x,y}))
    .filter(p=>openCell(b,p.x,p.y,u)&&safety(p)>safety(u)).sort((a,c)=>safety(c)-safety(a))[0];
}
const idOrder=(a,c)=>a.id.localeCompare(c.id);
export const exposedTarget=(b,u)=>['confuse','slow','armorBreak'].some(k=>hasStatus(b,u,k));
const threatened=(b,u)=>living(b,1-u.side).filter(e=>isTargetable(b,e)).some(e=>distance(u,e)<=2);
export const recoverableWounded=u=>Math.max(0,Math.min(u.maxHp-u.hp,Math.floor(((u.battleDamage??u.initial-u.hp)-(u.battleDeserted||0))*.35)-(u.healed||0)));
export function supportAnchor(b,u) {
  return supportApproach(b,u)?.target||null;
}
export function supportApproach(b,u) {
  if(hasStatus(b,u,'seal'))return null;
  const skills=unitTactics(u),medical=skills.filter(s=>['screen','relay','bandage','regrowth','purify','supply','boarding','mist','nexus'].includes(s.effect)&&tacticUsesLeft(u,s)>0&&u.intent>=s.threshold&&(u.skillReady?.[s.id]||0)<=b.tick);
  // A charger may carry relay without becoming a stationary medic. Offensive
  // cavalry must still close with enemies when its support targets are not ready.
  // Pure guard/control cavalry (gallop/relay/harass, lure/harass/relay) still anchor.
  if(u.type==='cavalry'&&skills.some(s=>s.category==='force'&&!['gallop','valor'].includes(s.effect)&&!(s.effect==='famous'&&s.mode==='support')))return null;
  if(!medical.length||skills.filter(s=>s.category==='force'&&!['gallop','phalanx','valor','protect','bandage','supply','camp','bulwark','riposte','anchor','emplace'].includes(s.effect)).length>1)return null;
  // Reuse casting eligibility with distance relaxed, then require a real path
  // to the skill's actual range. Mere ownership of a heal never causes waiting.
  const candidates=medical.flatMap(s=>{
    const targetSkill={...s,range:Infinity};
    const targets=['screen','relay'].includes(s.effect)?basicSupportTargets(b,u,targetSkill):expandedSupportTargets(b,u,targetSkill);
    return targets.filter(a=>a!==u&&routeTo(b,u,a,112,{range:s.range,charging:false,requireStrike:false})!==null).map(target=>({target,range:s.range}));
  });
  const front=candidates.filter(p=>isMelee(p.target));
  return (front.length?front:candidates).sort((a,c)=>Number(threatened(b,c.target))-Number(threatened(b,a.target))||recoverableWounded(c.target)-recoverableWounded(a.target)||distance(u,a.target)-distance(u,c.target)||idOrder(a.target,c.target)||c.range-a.range)[0]||null;
}
export function basicSupportTargets(b,u,s) {
  const allies=living(b,u.side).filter(a=>distance(u,a)<=s.range);
  if(s.effect==='rally')return allies.filter(a=>a!==u&&a.intent<=COMBAT.intentCap-15).sort((a,c)=>a.intent-c.intent||idOrder(a,c)).slice(0,1);
  if(s.effect==='relay'){
    const value=a=>recoverableWounded(a)/20+unitTactics(a).filter(k=>tacticUsesLeft(a,k)>0).reduce((n,k)=>n+Math.min(2,Math.max(0,(a.skillReady?.[k.id]||0)-b.tick)),0);
    return allies.filter(a=>a!==u&&value(a)>0).sort((a,c)=>value(c)-value(a)||idOrder(a,c)).slice(0,1);
  }
  if(s.effect==='screen')return allies.filter(a=>recoverableWounded(a)>=a.maxHp*.02||threatened(b,a)&&!shieldLayers(b,a).some(l=>l.source===u.id+':'+s.id)).sort((a,c)=>recoverableWounded(c)/c.maxHp-recoverableWounded(a)/a.maxHp||a.hp/a.maxHp-c.hp/c.maxHp||idOrder(a,c)).slice(0,1);
  return [];
}
export function areaTacticTargets(b,u,s,target,range) {
  return [target,...living(b,1-u.side).concat(decoyTargets(b,1-u.side)).filter(e=>!hasStatus(b,e,'stasis')).filter(t=>t!==target&&distance(target,t)<=(s.effect==='scatter'?2:1)&&distance(u,t)<=range).sort(idOrder)].slice(0,s.effect==='tremor'?1:['scatter','bombard'].includes(s.effect)?3:2);
}
export function supportUtility(b,u,a,s){
  if(s.useEffect&&(a===u||!useRecoveryTargets(a,unitTactics(a),s.useEffect).length))return 0;
  if(s.requiresWounded&&recoverableWounded(a)<=0)return 0;
  const negatives=REMEDIES.calm.filter(k=>hasStatus(b,a,k)).length;
  const threatened=living(b,1-u.side).filter(e=>isTargetable(b,e)).some(e=>distance(a,e)<=2);
  const missing=1-a.hp/a.maxHp;
  let score=0;
  if(s.useEffect&&a!==u)score+=useRecoveryTargets(a,unitTactics(a),s.useEffect).length*60;
  if(s.cleanse)score+=negatives*45;
  if(s.regrowthFraction&&!hasStatus(b,a,'regrowth'))score+=Math.min(recoverableWounded(a),a.maxHp*s.regrowthFraction*s.regrowthSteps)/10;
  if(s.heal)score+=Math.min(recoverableWounded(a),a.maxHp*s.heal)/10;
  if(s.shield&&(missing>.1||threatened)&&!shieldLayers(b,a).some(l=>l.source===u.id+':'+s.id))score+=20+missing*40;
  if(s.intent&&a!==u&&a.intent<=COMBAT.intentCap-15)score+=Math.min(s.intent,COMBAT.intentCap-a.intent);
  if(s.cooldownReduction&&a!==u)score+=unitTactics(a).filter(k=>tacticUsesLeft(a,k)>0).reduce((n,k)=>n+Math.min(s.cooldownReduction,Math.max(0,(a.skillReady?.[k.id]||0)-b.tick)),0)*4;
  if(s.ward&&threatened&&!hasStatus(b,a,'ward'))score+=20;
  if(s.valor&&threatened&&!hasStatus(b,a,'valor'))score+=20;
  if(s.buffs&&threatened)for(const key of Object.keys(s.buffs))if(!hasStatus(b,a,key))score+=20;
  return score;
}
// Selection and resolution share this list: the chosen anchor always receives the effect.
export function famousTargets(b,u,s,target=null){
  const pool=living(b,s.mode==='support'?u.side:1-u.side).filter(a=>(s.mode==='support'||isTargetable(b,a))&&distance(u,a)<=s.range&&(!s.excludeSelf||a!==u));
  if(s.mode==='support')return pool.filter(a=>supportUtility(b,u,a,s)>0)
    .sort((a,c)=>supportUtility(b,u,c,s)-supportUtility(b,u,a,s)||idOrder(a,c)).slice(0,s.targets||1);
  if(!target)return [];
  return [target,...pool.filter(a=>a!==target&&distance(target,a)<=(s.radius??0))
    .sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp||idOrder(a,c))].slice(0,s.targets||1);
}
export function tacticOpening(b,s,target){
  const setup=!!s.exploit?.statuses.some(key=>hasStatus(b,target,key));
  const highIntent=!!s.highIntent&&target.intent>=s.highIntent.threshold;
  return {setup,highIntent,scale:(setup?s.exploit.scale||0:0)+(highIntent?s.highIntent.scale||0:0),drain:highIntent?s.highIntent.drain||0:0};
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
    const opening=tacticOpening(b,s,e);
    if(opening.setup)value+=25;
    if(opening.highIntent)value+=20;
    return value;
  };
  return enemies.filter(e=>distance(u,e)<=s.range).sort((a,c)=>score(c)-score(a)||distance(u,a)-distance(u,c)||idOrder(a,c))[0]||null;
}
export function expandedSupportTargets(b,u,s){
  let allies=living(b,u.side).filter(a=>distance(u,a)<=s.range);
  const wound=a=>recoverableWounded(a),negative=a=>needsRemedy(b,a,'rally');
  switch(s.effect){
    case 'bandage': allies=allies.filter(a=>wound(a)>=a.maxHp*.02||needsRemedy(b,a,'aid'));break;
    case 'regrowth':allies=allies.filter(a=>wound(a)>=a.maxHp*.02&&!hasStatus(b,a,'regrowth'));break;
    case 'purify':allies=allies.filter(negative);break;
    case 'supply':return allies.filter(a=>a!==u&&a.intent<=COMBAT.intentCap-15).sort((a,c)=>a.intent-c.intent||idOrder(a,c)).slice(0,1);
    case 'camp':case 'mirage':case 'mist':allies=allies.filter(a=>threatened(b,a)&&(!hasStatus(b,a,s.effect==='camp'?'camp':'decoy')||(s.stasisDays&&a.hp/a.maxHp<=s.stasisHealth&&!hasStatus(b,a,'stasisLock'))));break;
    case 'boarding':allies=allies.filter(a=>a!==u&&a.type==='ship'&&(wound(a)>=a.maxHp*.02||a.intent<=COMBAT.intentCap-20));break;
    case 'nexus':return allies.filter(a=>a!==u&&!hasStatus(b,a,'nexus')&&(threatened(b,a)||unitTactics(a).some(t=>t.category==='intellect'))).sort((a,c)=>unitAttributes(c,b).strategyPower-unitAttributes(a,b).strategyPower||idOrder(a,c)).slice(0,1);
    default:return [];
  }
  return allies.sort((a,c)=>wound(c)/c.maxHp-wound(a)/a.maxHp||a.hp/a.maxHp-c.hp/c.maxHp||idOrder(a,c)).slice(0,s.effect==='camp'?2:1);
}
export function repairTarget(b,u,range=2){
  if(tacticUsesLeft(u,TACTICS_BOOK.camp)<=0)return null;
  return battleBuildings(b).filter(a=>a.side===u.side&&a.hp>0&&a.hp<a.maxHp&&distance(u,a)<=range).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp||distance(u,a)-distance(u,c)||a.id.localeCompare(c.id))[0]||null;
}
export function tacticTarget(b,u,s,range) {
  // Personal shooting-range states affect basic attacks only. Army range and
  // explicit weapon-setup rules retain their existing tactic semantics.
  if(hasStatus(b,u,'longRange')||hasStatus(b,u,'shortRange'))range=unitAttributes({...u,statuses:{...u.statuses,longRange:undefined,shortRange:undefined}},b).range;
  if(s.effect==='status'||s.effect==='remedy'){
    const friendly=s.mode==='support',forced=friendly?null:tauntTarget(b,u,s.range);
    const candidates=(forced?[forced]:living(b,friendly?u.side:1-u.side)).filter(t=>(friendly||isTargetable(b,t))&&distance(u,t)<=s.range);
    if(s.effect==='remedy')return candidates.find(t=>needsRemedy(b,t,s.remedy))||null;
    return candidates.filter(t=>(!CONTROL_STATUSES.includes(s.statusKey)||!hasStatus(b,t,'resolve'))&&(!['longRange','shortRange'].includes(s.statusKey)||unitAttributes(t,b).minRange>0||['archer','crossbow','siege','tower','ship'].includes(t.type))&&!hasStatus(b,t,s.statusKey)&&(!s.excludeSelf||t!==u)).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp||idOrder(a,c))[0]||null;
  }
  if(s.passive)return null;
  if(s.effect==='repair')return repairTarget(b,u,s.range);
  if(s.attackOrb&&hasStatus(b,u,'attackOrb'))return null;
  if(['bandage','regrowth','purify','supply','camp','mirage','mist','boarding','nexus'].includes(s.effect))return expandedSupportTargets(b,u,s)[0]||null;
  // Friendly support does not require a living enemy troop. Siege combat may
  // continue against a gate while survivors still have real wounds/cooldowns.
  if(s.effect==='famous'&&s.mode==='support')return famousTargets(b,u,s)[0]||null;
  if(['screen','rally','relay'].includes(s.effect))return basicSupportTargets(b,u,s)[0]||null;
  if(s.effect==='cleanse')return living(b,u.side).find(a=>distance(u,a)<=(s.range??range)&&needsRemedy(b,a,'calm'))||null;
  if(s.effect==='ram'){const gate=gateTarget(b,u);if(gate&&distance(u,gate)<=s.range&&(!tauntTarget(b,u,s.range)))return gate;}
  let enemies=living(b,1-u.side).concat(decoyTargets(b,1-u.side)).filter(e=>isTargetable(b,e)).sort((a,c)=>distance(u,a)-distance(u,c)||a.id.localeCompare(c.id));
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
  let inRange=targets.filter(e=>distance(u,e)<=range&&distance(u,e)>=(s.minRange||0));
  if(s.targetRear&&inRange.some(isRear))inRange=inRange.filter(isRear);
  if(s.effect==='famous')return famousTarget(b,u,s,inRange);
  switch(s.effect) {
    case 'confuse': {
      // Support a nearby equipped charger; control protection still rules out a target.
      const opening=e=>holdsLine(b,e)&&living(b,u.side).some(a=>a!==u&&a.type==='cavalry'&&distance(a,e)<=2&&unitTactics(a).some(t=>['rush','terror'].includes(t.effect)));
      const eligible=inRange.filter(e=>!hasStatus(b,e,'resolve')&&!hasStatus(b,e,'confuse'));
      return (eligible.length?eligible:s.id==='doubt'?inRange:[]).sort((a,c)=>Number(opening(c))-Number(opening(a))||c.intent-a.intent||idOrder(a,c))[0]||null;
    }
    case 'taunt': {
      const rear=living(b,u.side).filter(a=>a!==u&&isRear(a));
      const threat=e=>Number(rear.some(a=>distance(e,a)<=2))*3+Number(isRear(e));
      return inRange.filter(e=>!hasStatus(b,e,'resolve')&&!hasStatus(b,e,'taunt'))
        .sort((a,c)=>threat(c)-threat(a)||c.intent-a.intent||distance(u,a)-distance(u,c)||idOrder(a,c))[0]||null;
    }
    case 'harass':return inRange.filter(e=>e.intent>0||!hasStatus(b,e,'weaken')||holdsLine(b,e)&&!hasStatus(b,e,'resolve')).sort((a,c)=>Number(holdsLine(b,c)&&!hasStatus(b,c,'resolve'))-Number(holdsLine(b,a)&&!hasStatus(b,a,'resolve'))||Number(threatened(b,c))-Number(threatened(b,a))||c.intent-a.intent||idOrder(a,c))[0]||null;
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
    case 'curse':return inRange.sort(idOrder)[0]||null;
    case 'blight':case 'plague':return inRange.sort((a,c)=>Number(hasStatus(b,a,'plague'))-Number(hasStatus(b,c,'plague'))||recoverableWounded(c)-recoverableWounded(a)||idOrder(a,c))[0]||null;
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
  if(u.withdrawing||u.disengage||b.sides[u.side].retreat)return null;
  if(hasStatus(b,u,'seal') || hasStatus(b,u,'stealth') || (u.tacticRecoveryUntil||0)>b.tick)return null;
  // Player slot order is the priority; blocked tactics never block a later legal one.
  for(const s of unitTactics(u)) {
    if(tacticUsesLeft(u,s)<=0 || u.intent<Math.max(s.threshold,s.intentCost) || (u.skillReady?.[s.id]||0)>b.tick)continue;
    const target=tacticTarget(b,u,s,range);
    if(hasStatus(b,u,'phase')){const rear=flankingTarget(b,u,living(b,1-u.side).filter(e=>isTargetable(b,e)));if(rear&&(!target||target.side===u.side||!isRear(target)))continue;}
    if(target)return {skill:s,target};
  }
  return null;
}
