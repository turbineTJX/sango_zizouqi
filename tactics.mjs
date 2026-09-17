import {hexDistance, hexNeighbors} from './hex-grid.mjs';
import {unitAttributes} from './unit-stats.mjs';
import {blockedTerrain} from './battlefield.mjs';
import {COMBAT} from './combat-rules.mjs';
import {FAMOUS_OFFICERS,famousTacticId,famousTacticDescription} from './famous-officers.mjs';
// Data and deterministic targeting for the three automatic tactics on each unit.
const tactic = (name, threshold, cooldown, effect, visual, description) => ({ name, threshold, cooldown, effect, visual, description });
const scheme = (name,threshold,cooldown,effect,visual,description,range=3) => ({...tactic(name,threshold,cooldown,effect,visual,description),category:'intellect',range});
export const TACTICS_BOOK = {
  press: tactic('步步进逼',20,8,'press','slash','轻击相邻敌军（0.45 倍武技），叠加破势：每层防御 −4%，最多 3 层，持续 10 步；友军共用层数，重复命中刷新时长'),
  harry: scheme('扰阵轻射',25,8,'harry','volley','轻击 4 格内敌军（0.45 倍谋略），叠加扰阵：每层攻击 −4%，最多 3 层，持续 10 步；友军共用层数，重复命中刷新时长',4),
  smoke: scheme('烽烟惑阵',65,28,'confuse','shockwave','扰乱射程内敌军，使其混乱；时长随谋略威力增长、受军纪减免；混乱时随机转移阵位、无法攻击或施法',4),
  wildfire: scheme('火计连营',90,30,'wildfire','fire','对相邻的最多 2 队施加智力伤害和持续灼烧；灼烧按施放时兵力衰减',4),
  rally: scheme('鸣镝振旅',55,26,'rally','banner','鼓舞 2 格内其他友军，增加战意，数值随谋略威力增长',2),
  doubt: scheme('疑阵扰敌',60,28,'confuse','shockwave','以疑阵使 2 格内敌军混乱；时长随谋略威力增长、受军纪减免',2),
  ward: scheme('八门镇军',70,28,'ward','banner','为自身与 1 格内友军提供随谋略威力增长的减伤，持续 7 步',1),
  cleanse: scheme('整阵解围',80,26,'cleanse','banner','清除 2 格内一队友军的控制与减益，并给予智力护盾',2),
  lure: scheme('佯退诱敌',55,24,'lure','charge','诱使 3 格内敌军向自身移动 1 格，并降低其防御 6 步；方阵不受诱导',3),
  harass: scheme('截辎挫锐',80,28,'harass','banner','降低敌军战意（随谋略威力增长）并削弱其攻击 6 步，不打断当前施法',3),
  relay: scheme('游军策应',90,30,'relay','banner','让 2 格内其他友军战法冷却缩短（随谋略威力增长），并提升其移动力 6 步',2),
  ambush: scheme('伏弩疑兵',65,28,'confuse','shockwave','以伏弩威慑使敌军混乱；时长随谋略威力增长、受军纪减免',4),
  seal: scheme('机括封喉',85,30,'seal','slash','造成智力伤害，并封锁目标后续战法（时长随谋略威力增长、受军纪减免）',4),
  screen: scheme('烟幕掩军',60,26,'screen','banner','为 2 格内最多 2 支受损友军提供智力护盾，持续 8 步',2),
  fire: tactic('燎原火矢',40,22,'fire','fire','射击并灼烧 6 步；灼烧按施放时兵力衰减，不产生战意'),
  scatter: tactic('漫天箭雨',70,26,'scatter','volley','攻击射程内最多 3 支相邻敌军，单队伤害较低'),
  suppress: tactic('穿林阻射',95,24,'suppress','volley','射击并使目标移动减慢 6 步'),
  thrust: tactic('长枪贯阵',40,18,'thrust','slash','刺击相邻目标，并波及其身后一格的敌军'),
  phalanx: tactic('铁壁枪阵',65,26,'phalanx','banner','接敌时列阵 8 步：自身减伤 30%，停止移动并免疫击退'),
  strike: tactic('横枪奋击',90,22,'strike','slash','对相邻敌军进行一次强化攻击'),
  gallop: tactic('风驰电掣',0,22,'gallop','charge','无需战意；有可通行路线且需要接敌时，移动力提高 6 步'),
  rush: tactic('铁骑冲阵',60,24,'rush','charge','沿最多 3 格的空闲路线接敌并发动冲击'),
  valor: tactic('骁骑奋战',85,26,'valor','banner','交战范围内，自身攻击提高 25%，持续 8 步'),
  repeat: tactic('机括连珠',40,22,'repeat','volley','对同一敌军连续射击两次'),
  retreatShot: tactic('且退且射',60,20,'retreatShot','volley','近敌威胁时退至更安全的相邻空格，再射击'),
  pierce: tactic('重矢破甲',90,26,'pierce','slash','射击并降低目标防御 20%，持续 8 步'),
  terror: { ...tactic('八百破阵',100,34,'terror','charge','沿最多 3 格路线突进，冲击并眩晕目标 2 步'), special:true },
  protect: { ...tactic('虎卫折冲',100,32,'protect','shockwave','保护邻近受威胁友军：给其护盾并击退一支贴身敌军'), special:true },
  undermine: { category:'intellect', ...tactic('十胜奇谋',100,30,'undermine','banner','优先打击战意比例最高的敌军，降低其 45 战意；不打断施法'), special:true },
};
for(const [id,p] of Object.entries(FAMOUS_OFFICERS))if(p.tactic)TACTICS_BOOK[famousTacticId(id)]={...p.tactic,effect:'famous',special:true,visual:p.tactic.burn?'fire':p.tactic.mode==='support'?'banner':p.tactic.control?'shockwave':'slash',description:famousTacticDescription(p.tactic)};
for(const [id,s] of Object.entries(TACTICS_BOOK)){s.id=id;s.category ||= 'force';}
export const TROOP_TACTICS = {
  archer:['fire','scatter','suppress'], spear:['thrust','phalanx','strike'],
  cavalry:['gallop','rush','valor'], crossbow:['repeat','retreatShot','pierce'],
};
export const SPECIAL_TACTICS = { liao:'terror', chu:'protect', jia:'undermine' };
for(const [id,p] of Object.entries(FAMOUS_OFFICERS))if(p.tactic)SPECIAL_TACTICS[id]=famousTacticId(id);
export const INTELLECT_TACTICS = {archer:['smoke','wildfire','rally'],spear:['doubt','ward','cleanse'],cavalry:['lure','harass','relay'],crossbow:['ambush','seal','screen']};
export const CATEGORY_NAMES = {force:'武力',intellect:'智力'};
export function availableTactics(unit) {
  return [...(TROOP_TACTICS[unit.type]||TROOP_TACTICS.spear),...(INTELLECT_TACTICS[unit.type]||INTELLECT_TACTICS.spear),(['spear','cavalry'].includes(unit.type)?'press':'harry'),...(SPECIAL_TACTICS[unit.id]?[SPECIAL_TACTICS[unit.id]]:[])].map(id=>TACTICS_BOOK[id]);
}
// Trial presets mix early pressure with higher-impact tactics. Stronger tactics
// get first refusal once ready; the low-threshold slot fills the gaps.
export function recommendedTacticIds(u) {
  const special=SPECIAL_TACTICS[u.id];
  if(special){
    const filler=u.type==='spear'?(u.intellect>u.force?'ward':'phalanx'):u.type==='cavalry'?'rush':u.type==='crossbow'?'seal':u.intellect>u.force?'wildfire':'fire';
    return [special,filler,['spear','cavalry'].includes(u.type)?'press':'harry'];
  }
  if(u.type==='spear')return [u.id==='chu'?'protect':'strike','phalanx','press'];
  if(u.type==='cavalry')return [u.id==='liao'?'terror':'valor','rush','press'];
  if(u.type==='crossbow')return u.intellect>u.force?[u.id==='jia'?'undermine':'screen','seal','harry']:['pierce','repeat','harry'];
  return u.intellect>u.force?['wildfire','smoke','harry']:['scatter','fire','harry'];
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
export const NEGATIVE_STATUSES=['press','harry','stun','confuse','seal','slow','armorBreak','weaken','burn','scorch'];
export const statusPower = (unit,skill,b=null) => {const stats=unitAttributes(unit,b);return skill.category==='intellect'?stats.strategyPower:stats.martialPower;};
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
  if(key==='shield') {
    const source=extra.source||'unattributed',layers=shieldLayers(b,u).filter(l=>l.source!==source);
    const amount=Math.max(0,Math.min(extra.amount,u.maxHp-layers.reduce((n,l)=>n+l.amount,0)));
    if(amount)layers.push({source,label:extra.label||'护盾',amount,until:b.tick+duration+1});
    refreshShield(b,u,layers);return;
  }
  // A weaker fire application must not erase or extend an existing stronger burn.
  if(key==='burn'&&hasStatus(b,u,'burn')&&u.statuses.burn.amount>extra.amount)return;
  u.statuses[key] = { until:b.tick+duration+1,...extra };
}
export function openCell(b,x,y) {
  return x>=0 && x<14 && y>=0 && y<8 && !blockedTerrain(b,x,y) && !b.sides.flatMap(s=>s.units).some(u=>u.status==='active' && u.hp>0 && u.x===x && u.y===y);
}
export function routeTo(b,u,target,max=3) {
  const queue=[{x:u.x,y:u.y,path:[]}],seen=new Set([`${u.x},${u.y}`]);
  while(queue.length) {
    const p=queue.shift();
    if(distance(p,target)===1)return p.path;
    if(p.path.length>=max)continue;
    for(const [x,y] of hexNeighbors(p)) {
      const key=`${x},${y}`;
      const inDefenseLine=!b.siege || ![0,1].includes(u.side) || b.siege.gate.side!==u.side || (u.side===0?x<=4:x>=9);
      if(!seen.has(key)&&inDefenseLine&&openCell(b,x,y)) {seen.add(key);queue.push({x,y,path:[...p.path,{x,y}]});}
    }
  }
  return null;
}
export function retreatCell(b,u) {
  const enemies=living(b,1-u.side);
  const safety=p=>Math.min(...enemies.map(e=>distance(p,e)));
  return hexNeighbors(u).map(([x,y])=>({x,y}))
    .filter(p=>openCell(b,p.x,p.y)&&safety(p)>safety(u)).sort((a,c)=>safety(c)-safety(a))[0];
}
const idOrder=(a,c)=>a.id.localeCompare(c.id);
export function supportUtility(b,u,a,s){
  const negatives=NEGATIVE_STATUSES.filter(k=>hasStatus(b,a,k)).length;
  const threatened=living(b,1-u.side).some(e=>distance(a,e)<=2);
  const missing=1-a.hp/a.maxHp;
  let score=0;
  if(s.cleanse)score+=negatives*45;
  if(s.shield&&(missing>.1||threatened)&&!shieldLayers(b,a).some(l=>l.source===u.id+':'+s.id))score+=20+missing*40;
  if(s.intent&&a!==u&&a.intent<=COMBAT.intentCap-15)score+=Math.min(s.intent,COMBAT.intentCap-a.intent);
  if(s.cooldownReduction&&a!==u)score+=Object.values(a.skillReady||{}).reduce((n,t)=>n+Math.min(s.cooldownReduction,Math.max(0,t-b.tick)),0)*4;
  if(s.ward&&threatened&&!hasStatus(b,a,'ward'))score+=20;
  if(s.valor&&threatened&&!hasStatus(b,a,'valor'))score+=20;
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
export function tacticTarget(b,u,s,range) {
  const enemies=living(b,1-u.side).sort((a,c)=>distance(u,a)-distance(u,c)||a.id.localeCompare(c.id));
  const nearest=enemies[0]; if(!nearest)return null;
  range=s.range ?? range;
  const inRange=enemies.filter(e=>distance(u,e)<=range);
  const allies=living(b,u.side).filter(a=>distance(u,a)<=range);
  if(s.effect==='famous')return famousTarget(b,u,s,enemies);
  switch(s.effect) {
    case 'confuse':return inRange.filter(e=>!hasStatus(b,e,'resolve')&&!hasStatus(b,e,'confuse')&&!hasStatus(b,e,'stun')).sort((a,c)=>c.intent-a.intent||idOrder(a,c))[0]||null;
    case 'ward':return allies.some(a=>!hasStatus(b,a,'ward')) && distance(u,nearest)<=3 ? u:null;
    case 'cleanse':return allies.find(a=>NEGATIVE_STATUSES.some(key=>hasStatus(b,a,key)))||null;
    case 'screen':return allies.filter(a=>a.hp/a.maxHp<.9&&!hasStatus(b,a,'shield')).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0]||null;
    case 'rally':return allies.find(a=>a!==u&&a.intent<COMBAT.intentCap)||null;
    case 'relay':return allies.find(a=>a!==u&&Object.values(a.skillReady||{}).some(t=>t>b.tick))||null;
    case 'harass':return inRange.filter(e=>e.intent>0).sort((a,c)=>c.intent-a.intent)[0]||null;
    case 'seal':return inRange.filter(e=>!hasStatus(b,e,'seal')).sort((a,c)=>c.intent-a.intent||idOrder(a,c))[0]||null;
    case 'lure':return inRange.find(e=>distance(u,e)>1&&!hasStatus(b,e,'phalanx')&&lureCell(b,u,e))||null;
  }
  switch(s.effect) {
    case 'gallop': return distance(u,nearest)>1 && !hasStatus(b,u,'haste') && routeTo(b,u,nearest,14)?.length ? u : null;
    case 'phalanx': return distance(u,nearest)<=range && !hasStatus(b,u,'phalanx') ? u : null;
    case 'valor': return distance(u,nearest)<=2 && !hasStatus(b,u,'valor') ? u : null;
    case 'rush': case 'terror': return enemies.find(e=>distance(u,e)>1 && distance(u,e)<=4 && routeTo(b,u,e,3)?.length) || (s.effect==='terror' ? enemies.find(e=>distance(u,e)===1) : null);
    case 'retreatShot': return distance(u,nearest)<=2 && retreatCell(b,u) ? nearest : null;
    case 'protect': return living(b,u.side).filter(a=>a!==u && distance(u,a)<=2 && enemies.some(e=>distance(a,e)===1))
      .sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0] || null;
    case 'undermine': return inRange.filter(e=>e.intent>0).sort((a,c)=>c.intent-a.intent)[0] || null;
    default: return inRange[0] || null;
  }
}
export function lureCell(b,u,target) {
  return hexNeighbors(target).map(([x,y])=>({x,y})).filter(p=>openCell(b,p.x,p.y)&&distance(p,u)<distance(target,u)).sort((a,c)=>distance(a,u)-distance(c,u))[0];
}
export function readyTactic(b,u,range) {
  if(hasStatus(b,u,'seal'))return null;
  // Player slot order is the priority; blocked tactics never block a later legal one.
  for(const s of unitTactics(u)) {
    if(u.intent<s.threshold || (u.skillReady?.[s.id]||0)>b.tick)continue;
    const target=tacticTarget(b,u,s,range);
    if(target)return {skill:s,target};
  }
  return null;
}
