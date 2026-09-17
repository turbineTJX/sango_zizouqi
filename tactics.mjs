import {unitAttributes} from './unit-stats.mjs';
// Data and deterministic targeting for the three automatic tactics on each unit.
const tactic = (name, threshold, cooldown, effect, visual, description) => ({ name, threshold, cooldown, effect, visual, description });
const scheme = (name,threshold,cooldown,effect,visual,description,range=3) => ({...tactic(name,threshold,cooldown,effect,visual,description),category:'intellect',range});
export const TACTICS_BOOK = {
  smoke: scheme('烽烟惑阵',65,28,'confuse','shockwave','扰乱射程内敌军，使其混乱；时长随谋略威力增长、受军纪减免；混乱时随机转移阵位、无法攻击或施法',4),
  wildfire: scheme('火计连营',90,30,'wildfire','fire','对相邻的最多 2 队施加智力伤害和持续灼烧',4),
  rally: scheme('鸣镝振旅',55,26,'rally','banner','鼓舞 2 格内其他友军，增加战意，数值随谋略威力增长',2),
  doubt: scheme('疑阵扰敌',60,28,'confuse','shockwave','以疑阵使 2 格内敌军混乱；时长随谋略威力增长、受军纪减免',2),
  ward: scheme('八门镇军',70,28,'ward','banner','为自身与 1 格内友军提供随谋略威力增长的减伤，持续 7 步',1),
  cleanse: scheme('整阵解围',80,26,'cleanse','banner','清除 2 格内一队友军的控制与减益，并给予智力护盾',2),
  lure: scheme('佯退诱敌',55,24,'lure','charge','诱使 3 格内敌军向自身移动 1 格，并降低其防御 6 步；方阵不受诱导',3),
  harass: scheme('截辎挫锐',80,28,'harass','banner','降低敌军战意（随谋略威力增长）并削弱其攻击 6 步，不打断当前施法',3),
  relay: scheme('游军策应',90,30,'relay','banner','让 2 格内其他友军战法冷却缩短（随谋略威力增长），并提升其移动力 6 步',2),
  ambush: scheme('伏弩疑兵',65,28,'confuse','shockwave','以伏弩威慑使敌军混乱；时长随谋略威力增长、受军纪减免',4),
  seal: scheme('机括封喉',85,30,'seal','slash','造成智力伤害，并封锁目标后续战法（时长随谋略威力增长、受军纪减免）；不取消已经蓄势的战法',4),
  screen: scheme('烟幕掩军',60,26,'screen','banner','为 2 格内最多 2 支受损友军提供智力护盾，持续 8 步',2),
  fire: tactic('燎原火矢',40,22,'fire','fire','射击并灼烧 6 步；灼烧不产生战意'),
  scatter: tactic('漫天箭雨',70,26,'scatter','volley','攻击射程内最多 3 支相邻敌军，单队伤害较低'),
  suppress: tactic('穿林阻射',95,24,'suppress','volley','射击并使目标移动减慢 6 步'),
  thrust: tactic('长枪贯阵',40,18,'thrust','slash','刺击相邻目标，并波及其身后一格的敌军'),
  phalanx: tactic('铁壁枪阵',65,26,'phalanx','banner','接敌时列阵 8 步：自身减伤 30%，停止移动并免疫击退'),
  strike: tactic('横枪奋击',90,22,'strike','slash','对相邻敌军进行一次强化攻击'),
  gallop: tactic('风驰电掣',30,22,'gallop','charge','有可通行路线且需要接敌时，移动力提高 6 步'),
  rush: tactic('铁骑冲阵',60,24,'rush','charge','沿最多 3 格的空闲路线接敌并发动冲击'),
  valor: tactic('骁骑奋战',85,26,'valor','banner','交战范围内，自身攻击提高 25%，持续 8 步'),
  repeat: tactic('机括连珠',40,22,'repeat','volley','对同一敌军连续射击两次'),
  retreatShot: tactic('且退且射',60,20,'retreatShot','volley','近敌威胁时退至更安全的相邻空格，再射击'),
  pierce: tactic('重矢破甲',90,26,'pierce','slash','射击并降低目标防御 20%，持续 8 步'),
  terror: { ...tactic('八百破阵',110,34,'terror','charge','沿最多 3 格路线突进，冲击并眩晕目标 2 步'), special:true },
  protect: { ...tactic('虎卫折冲',100,32,'protect','shockwave','保护邻近受威胁友军：给其护盾并击退一支贴身敌军'), special:true },
  undermine: { category:'intellect', ...tactic('十胜奇谋',105,30,'undermine','banner','优先打击战意比例最高的敌军，降低其 45 战意；不打断施法'), special:true },
};
for(const [id,s] of Object.entries(TACTICS_BOOK)){s.id=id;s.category ||= 'force';}
export const TROOP_TACTICS = {
  archer:['fire','scatter','suppress'], spear:['thrust','phalanx','strike'],
  cavalry:['gallop','rush','valor'], crossbow:['repeat','retreatShot','pierce'],
};
export const SPECIAL_TACTICS = { liao:'terror', chu:'protect', jia:'undermine' };
export const INTELLECT_TACTICS = {archer:['smoke','wildfire','rally'],spear:['doubt','ward','cleanse'],cavalry:['lure','harass','relay'],crossbow:['ambush','seal','screen']};
export const CATEGORY_NAMES = {force:'武力',intellect:'智力'};
export function availableTactics(unit) {
  return [...(TROOP_TACTICS[unit.type]||TROOP_TACTICS.spear),...(INTELLECT_TACTICS[unit.type]||INTELLECT_TACTICS.spear),...(SPECIAL_TACTICS[unit.id]?[SPECIAL_TACTICS[unit.id]]:[])].map(id=>TACTICS_BOOK[id]);
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
export const NEGATIVE_STATUSES=['stun','confuse','seal','slow','armorBreak','weaken','burn','scorch'];
export const statusPower = (unit,skill,b=null) => {const stats=unitAttributes(unit,b);return skill.category==='intellect'?stats.strategyPower:stats.martialPower;};
export const distance = (a,b) => Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
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
  u.statuses[key] = { until:b.tick+duration+1,...extra };
}
export function openCell(b,x,y) {
  return x>=0 && x<14 && y>=0 && y<8 && !b.sides.flatMap(s=>s.units).some(u=>u.status==='active' && u.hp>0 && u.x===x && u.y===y);
}
export function routeTo(b,u,target,max=3) {
  const queue=[{x:u.x,y:u.y,path:[]}],seen=new Set([`${u.x},${u.y}`]);
  while(queue.length) {
    const p=queue.shift();
    if(distance(p,target)===1)return p.path;
    if(p.path.length>=max)continue;
    for(const [x,y] of [[p.x-1,p.y],[p.x+1,p.y],[p.x,p.y-1],[p.x,p.y+1]]) {
      const key=`${x},${y}`;
      if(!seen.has(key)&&openCell(b,x,y)) {seen.add(key);queue.push({x,y,path:[...p.path,{x,y}]});}
    }
  }
  return null;
}
export function retreatCell(b,u) {
  const enemies=living(b,1-u.side);
  const safety=p=>Math.min(...enemies.map(e=>distance(p,e)));
  return [[u.x-1,u.y],[u.x+1,u.y],[u.x,u.y-1],[u.x,u.y+1]].map(([x,y])=>({x,y}))
    .filter(p=>openCell(b,p.x,p.y)&&safety(p)>safety(u)).sort((a,c)=>safety(c)-safety(a))[0];
}
export function tacticTarget(b,u,s,range) {
  const enemies=living(b,1-u.side).sort((a,c)=>distance(u,a)-distance(u,c)||a.id.localeCompare(c.id));
  const nearest=enemies[0]; if(!nearest)return null;
  range=s.range ?? range;
  const inRange=enemies.filter(e=>distance(u,e)<=range);
  const allies=living(b,u.side).filter(a=>distance(u,a)<=range);
  switch(s.effect) {
    case 'confuse':return inRange.find(e=>!hasStatus(b,e,'resolve'))||null;
    case 'ward':return allies.some(a=>!hasStatus(b,a,'ward')) && distance(u,nearest)<=3 ? u:null;
    case 'cleanse':return allies.find(a=>NEGATIVE_STATUSES.some(key=>hasStatus(b,a,key)))||null;
    case 'screen':return allies.filter(a=>a.hp/a.maxHp<.9&&!hasStatus(b,a,'shield')).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0]||null;
    case 'rally':return allies.find(a=>a!==u&&a.intent<160)||null;
    case 'relay':return allies.find(a=>a!==u&&Object.values(a.skillReady||{}).some(t=>t>b.tick))||null;
    case 'harass':return inRange.filter(e=>e.intent>0).sort((a,c)=>c.intent-a.intent)[0]||null;
    case 'seal':return inRange.find(e=>!hasStatus(b,e,'seal'))||null;
    case 'lure':return inRange.find(e=>distance(u,e)>1&&!hasStatus(b,e,'phalanx')&&lureCell(b,u,e))||null;
  }
  switch(s.effect) {
    case 'gallop': return distance(u,nearest)>1 && !hasStatus(b,u,'haste') && routeTo(b,u,nearest,14)?.length ? u : null;
    case 'phalanx': return distance(u,nearest)<=2 && !hasStatus(b,u,'phalanx') ? u : null;
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
  return [[target.x-1,target.y],[target.x+1,target.y],[target.x,target.y-1],[target.x,target.y+1]].map(([x,y])=>({x,y})).filter(p=>openCell(b,p.x,p.y)&&distance(p,u)<distance(target,u)).sort((a,c)=>distance(a,u)-distance(c,u))[0];
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
