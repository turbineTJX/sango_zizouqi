import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {hexDistance} from './hex-grid.mjs';
import {TROOP_INTENT} from './combat-rules.mjs';
import {FAMOUS_OFFICERS,famousPassiveId,ultimateDescription} from './famous-officers.mjs';
// Passive skills are derived from identity and level, never stored as equipped tactics.
export const SKILL_LEVELS = [2, 3, 5, 8, 10];
const skill = (name, tier, description) => ({name, tier, description,domain:'battle'});
const civilSkill=(name,description,effects)=>({...skill(name,'内政',description),domain:'domestic',effects});
const GENERAL_SKILLS={spearGeneral:['枪将','spear'],halberdGeneral:['戟将','halberd'],cavalryGeneral:['骑将','cavalry'],bowGeneral:['弓将','archer']};
const TROOP_TRAINING={
 halberdDrill:{type:'halberd',name:'戟阵',stats:{defense:.15,attackSpeed:.1},description:'本队为戟兵时，防御 +15%、攻速 +10%'},
 logisticsDrill:{type:'logistics',name:'营务',stats:{defense:.2,discipline:.1},description:'本队为辅兵时，防御 +20%、军纪 +10%'},
 siegeDrill:{type:'siege',name:'机巧',stats:{attack:.1,siege:.2},description:'本队为兵器时，攻击 +10%、攻城威力 +20%'},
 shipDrill:{type:'ship',name:'操舵',stats:{defense:.15,move:.1},description:'本队为舰船时，防御 +15%、移速 +10%'},
};
export const PASSIVES = {
  ...Object.fromEntries(Object.entries(GENERAL_SKILLS).map(([id,[name,type]])=>[id,skill(name,'兵种专长',`本队为${{spear:'枪兵',halberd:'戟兵',cavalry:'骑兵',archer:'弓兵'}[type]}时，武技战法对武力低于自己的部队伤害 +20%；不强化普攻、谋略或攻城`)])),
  wealth:civilSkill('富豪','任太守时，本城每旬金收入 +25%；只加成结算收入，不增殖现有府库',{gold:.25}),
  rice:civilSkill('米道','任太守时，本城每旬粮收入 +25%；仍受粮仓容量限制',{grain:.25}),
  administration:civilSkill('能吏','任太守时，本城新开工建设费用 −20%；任命前已支付的费用不返还',{projectDiscount:.2}),
  fame:civilSkill('名声','任太守时，本城每旬兵源恢复 +20%；不增加已编制兵力或征募额度',{manpower:.2}),
  benevolence:civilSkill('仁政','任太守时，本城赈济民心额外 +5，最多 100；仍每旬一次',{relief:5}),
  orator:{...skill('论客','外交预留','外交系统预留：拟影响交涉成功率；当前版本未开放，无战斗或内政加成'),domain:'diplomacy',available:false},
  affinity:{...skill('亲善','外交预留','外交系统预留：拟影响关系改善；当前版本未开放，无战斗或内政加成'),domain:'diplomacy',available:false},
  ...Object.fromEntries(Object.entries(TROOP_TRAINING).map(([id,p])=>[id,skill(p.name,'定位通用',p.description)])),
  assault:skill('强攻','基础通用','攻击 +8%'),
  iron:skill('铁壁','基础通用','防御 +10%'),
  discipline:skill('严整','基础通用','军纪 +12%'),
  martial:skill('勇武','基础通用','武技威力 +10%'),
  scholar:skill('博识','基础通用','谋略威力 +10%'),
  spirit:skill('振奋','基础通用','普攻获得攻击战意时额外 +2'),
  endurance:skill('坚忍','基础通用','获得受击战意时额外 +2，同次多段战法对本队只计一次'),
  interdict:skill('截气','定位通用','本队普攻不让目标获得该次受击战意（含坚忍）；不阻止目标自己攻击或接受友军补给'),
  stifle:skill('断势','定位通用','本队伤害战法不让目标获得该次受击战意（含坚忍）；可配合减战意持续压制，普攻不享受此效果'),
  shelter:skill('护身','基础通用','受到普攻伤害降低 8%'),
  spear:skill('枪阵','定位通用','枪兵相邻有友军时，防御 +15%'),
  rider:skill('骑术','定位通用','骑兵移速 +20%'),
  bow:skill('弓术','定位通用','弓兵相邻无敌军时，攻击 +15%'),
  crossbow:skill('弩术','定位通用','弩兵连续普攻同一目标，从第三次起普攻伤害 +18%；换目标重置'),
  joint:skill('合击','定位通用','普攻目标与其他己方部队相邻时，普攻伤害 +15%'),
  steady:skill('持重','定位通用','连续 3 步未移动，防御 +15%；任何位移重置'),
  desperate:skill('临危','定位通用','兵力低于上限 40% 时，防御、军纪各 +15%'),
  prepared:skill('备战','定位通用','预备队首次入场时，战意 +25；每场一次'),
  shield:skill('护持','定位通用','本队战法提供的护盾量 +20%'),
  combo:skill('协谋','定位通用','作为后续一招触发连携，数值加成额外 +5 个百分点'),
  suppress:skill('挫锐','定位通用','本队战法降低敌方战意的数值 +20%'),
  calm:skill('镇定','定位通用','受到的战意降低效果减弱 20%'),
  veteran:skill('百战','高级通用','攻击、防御各 +15%'),
  valor:skill('骁勇','高级通用','武技威力 +25%'),
  wisdom:skill('深谋','高级通用','谋略威力 +25%'),
  fortress:skill('坚守','高级通用','本队受到所有伤害降低 12%；野战、守城均生效'),
  rapid:skill('疾射','高级通用','弓兵、弩兵攻速 +20%'),
  aid:skill('辅军','高级通用','战法给予其他友军的护盾、战意及冷却缩减量 +25%'),
  command:skill('御众','专属','在场时，周围 2 格内其他友军攻击、防御各 +10%'),
  defiant:skill('刚烈','专属','兵力越低，攻击与武技威力越高；兵力降至 50% 时各达 +25%'),
  isolated:skill('摧锋','专属','目标相邻没有其友军时，普攻、武力战法伤害 +25%'),
  guard:skill('虎卫','专属','相邻其他友军受到普攻、武力战法伤害降低 15%；自身降低 10%'),
  foresight:skill('料敌','专属','对战意低于 60 的敌军部队，谋略伤害 +30%'),
  rescue:skill('解危','专属','战法支援兵力低于 50% 的其他友军时，护盾、战意及冷却缩减量 +35%'),
  swift:skill('神行','专属','相邻无敌军时，移速 +30%、攻速 +20%'),
  adapt:skill('巧变','专属','预备队首次入场后 15 步，攻击、武技威力各 +20%，受到伤害降低 15%'),
};
export const SKILL_ROUTES = {
  cao:['iron','discipline','steady','calm','command'],
  dun:['assault','endurance','spear','desperate','defiant'],
  liao:['martial','spirit','rider','interdict','isolated'],
  chu:['iron','shelter','steady','desperate','guard'],
  jia:['scholar','spirit','suppress','stifle','foresight'],
  yu:['scholar','discipline','shield','calm','rescue'],
  yuanxia:['assault','spirit','bow','joint','swift'],
  jin:['iron','discipline','spear','steady','fortress'],
  shao:['assault','discipline','joint','calm','veteran'],
  yan:['martial','spirit','rider','joint','valor'],
  wen:['assault','martial','rider','desperate','veteran'],
  he:['assault','martial','joint','prepared','adapt'],
  ju:['scholar','discipline','shield','calm','aid'],
  tian:['scholar','spirit','discipline','combo','wisdom'],
  gao:['iron','endurance','spearGeneral','desperate','fortress'],
};
export const COMMON_ROUTES = {
 halberd:['iron','shelter','halberdDrill','halberdGeneral','fortress'],logistics:['scholar','discipline','logisticsDrill','calm','aid'],siege:['assault','scholar','siegeDrill','steady','wisdom'],ship:['iron','discipline','shipDrill','shield','fortress'],
  spear:['iron','discipline','spear','spearGeneral','fortress'],
  cavalry:['assault','martial','rider','cavalryGeneral','veteran'],
  archer:['assault','spirit','bow','interdict','rapid'],
  crossbow:['assault','spirit','crossbow','interdict','rapid'],
  strategist:['scholar','discipline','combo','stifle','wisdom'],
  support:['iron','discipline','shield','calm','aid'],
  domestic:['administration','rice','wealth','benevolence','fame'],
};
// Identity-based civic routes retain the same five unlocks; diplomacy is explicit reserve design.
export const CIVIC_ROUTES={
 'person-443':['rice','discipline','benevolence','fame','administration'],
 'person-533':['wealth','administration','benevolence','affinity','fame'],
 'person-255':['administration','discipline','rice','benevolence','fame'],
 'person-420':['administration','wealth','discipline','fame','benevolence'],
 'person-449':['fame','administration','discipline','wealth','benevolence'],
 'person-567':['benevolence','iron','administration','discipline','fame'],
 'person-212':['administration','rice','wealth','benevolence','fame'],
 'person-634':['wealth','administration','rice','discipline','fame'],
 'person-123':['benevolence','discipline','shield','orator','aid'],
 'person-487':['discipline','benevolence','affinity','administration','orator'],
 'person-283':['administration','benevolence','affinity','calm','orator'],
};
// Ordinary officers also develop five skills. Their catalogue aptitude fixes
// the route, so changing troops trades specialization for a different toolkit.
export function commonRouteKey(u) {
  const source=OFFICER_BY_ID[u.id];
  if(!source)return u.skillRouteType||u.type||'spear';
  if(source.politics>=80&&source.politics>=source.intellect&&source.politics>=source.force+15)return 'domestic';
  if(source.intellect>=65&&source.intellect>=source.force+15)return 'strategist';
  return source.type;
}
export const commonRouteName=u=>CIVIC_ROUTES[u.id]?'治政交涉':({domestic:'治政修习',halberd:'戟阵修习',logistics:'辅军修习',siege:'机巧修习',ship:'水战修习',spear:'步阵修习',cavalry:'骑战修习',archer:'弓术修习',crossbow:'弩术修习',strategist:'谋攻修习',support:'辅军修习'}[commonRouteKey(u)]);
for(const [id,p] of Object.entries(FAMOUS_OFFICERS))if(p.route){
  const key=famousPassiveId(id);
  PASSIVES[key]=skill(p.ultimate.name,'专属',ultimateDescription(p.ultimate));
  SKILL_ROUTES[id]=[...p.route,key];
}
function personalPassive(u){const key=skillRoute(u).find(k=>k.startsWith('hero-')&&hasPassive(u,k));return key?FAMOUS_OFFICERS[key.slice(5)]?.ultimate:null;}
function personalCondition(b,u,target,p){
  if(!p)return false;
  if(p.troops&&!p.troops.includes(u.type))return false;
  switch(p.trigger){
    case 'always':return true;
    case 'engaged':return !!b&&onField(u)&&enemies(b,u).some(a=>adjacent(a,u)===1);
    case 'alone':return !!b&&onField(u)&&!allies(b,u).some(a=>adjacent(a,u)===1);
    case 'formation':return !!b&&onField(u)&&allies(b,u).some(a=>adjacent(a,u)===1);
    case 'steady':return !!b&&onField(u)&&b.tick-(u.passiveState?.lastMoveTick??b.tick)>=3;
    case 'healthy':return hpRatio(u)>=.7;
    case 'wounded':return hpRatio(u)<.5;
    case 'late':return !!b&&b.tick>=40;
    default:return false;
  }
}
export const officerLevel = u => u.level ?? 1;
export const skillRoute = u => SKILL_ROUTES[u.id] || CIVIC_ROUTES[u.id] || COMMON_ROUTES[commonRouteKey(u)] || COMMON_ROUTES.spear;
export const hasPassive = (u,id) => skillRoute(u).some((key,i)=>key===id&&officerLevel(u)>=SKILL_LEVELS[i]);
export const domesticEffects=u=>u?skillRoute(u).filter(id=>hasPassive(u,id)&&PASSIVES[id].domain==='domestic').reduce((sum,id)=>{for(const [key,value]of Object.entries(PASSIVES[id].effects))sum[key]=(sum[key]||0)+value;return sum;},{}):{};
export const intentIncome=u=>({attack:TROOP_INTENT[u.type].attack+(hasPassive(u,'spirit')?2:0),hit:TROOP_INTENT[u.type].hit+(hasPassive(u,'endurance')?2:0)});
export const deniesHitIntent=(u,skill)=>hasPassive(u,skill?'stifle':'interdict');
const adjacent=hexDistance;
const onField=u=>u.status==='active'&&u.hp>0;
const allies=(b,u)=>(b?.sides?.[u.side]?.units||[]).filter(v=>v!==u&&onField(v));
const enemies=(b,u)=>(b?.sides?.[1-u.side]?.units||[]).filter(onField);
export const hpRatio=u=>Math.max(0,Math.min(1,(u.hp??u.troops)/Math.max(1,u.maxHp??3000)));
export const adapting=(b,u)=>onField(u)&&hasPassive(u,'adapt')&&(u.passiveState?.entryUntil||0)>(b?.tick||0);
export function initialPassiveState(tick=0) {
  return {lastMoveTick:tick,targetId:null,shots:0,shotType:null,reserveEntered:false,entryUntil:0};
}
export function moved(b,u,from) {
  if(from.x!==u.x||from.y!==u.y) {u.passiveState ||= initialPassiveState(b.tick);u.passiveState.lastMoveTick=b.tick;}
}
export function recordBasicAttack(u,target) {
  u.passiveState ||= initialPassiveState();
  const p=u.passiveState;
  p.shots=p.targetId===target.id&&p.shotType===u.type?p.shots+1:1;
  p.targetId=target.id;p.shotType=u.type;
}
export function passiveAttributes(b,u) {
  const mods={};
  const add=(key,value,label)=>{(mods[key] ||= []).push({value,label});};
  const has=id=>hasPassive(u,id), field=!!b&&onField(u);
  for(const [id,p] of Object.entries(TROOP_TRAINING))if(has(id)&&u.type===p.type)for(const [key,value] of Object.entries(p.stats))add(key,value,p.name);
  if(has('assault'))add('attack',.08,'强攻');
  if(has('iron'))add('defense',.1,'铁壁');
  if(has('discipline'))add('discipline',.12,'严整');
  if(has('martial'))add('martialPower',.1,'勇武');
  if(has('scholar'))add('strategyPower',.1,'博识');
  if(has('rider')&&u.type==='cavalry')add('move',.2,'骑术');
  if(has('veteran')){add('attack',.15,'百战');add('defense',.15,'百战');}
  if(has('valor'))add('martialPower',.25,'骁勇');
  if(has('wisdom'))add('strategyPower',.25,'深谋');
  if(has('rapid')&&['archer','crossbow'].includes(u.type))add('attackSpeed',.2,'疾射');
  if(has('desperate')&&hpRatio(u)<.4){add('defense',.15,'临危');add('discipline',.15,'临危');}
  if(has('defiant')){const n=Math.min(.25,(1-hpRatio(u))*.5);if(n){add('attack',n,'刚烈');add('martialPower',n,'刚烈');}}
  const personal=personalPassive(u);
  if(personalCondition(b,u,null,personal))for(const [key,value] of Object.entries(personal.stats))add(key,value,personal.name);
  if(field){
    if(has('spear')&&u.type==='spear'&&allies(b,u).some(v=>adjacent(u,v)===1))add('defense',.15,'枪阵');
    if(has('steady')&&b.tick-(u.passiveState?.lastMoveTick??b.tick)>=3)add('defense',.15,'持重');
    if(!enemies(b,u).some(v=>adjacent(u,v)===1)){
      if(has('bow')&&u.type==='archer')add('attack',.15,'弓术');
      if(has('swift')){add('move',.3,'神行');add('attackSpeed',.2,'神行');}
    }
    if(allies(b,u).some(v=>hasPassive(v,'command')&&adjacent(u,v)<=2)){
      add('attack',.1,'御众光环');add('defense',.1,'御众光环');
    }
    if(adapting(b,u)){add('attack',.2,'巧变');add('martialPower',.2,'巧变');}
  }
  return Object.fromEntries(Object.entries(mods).map(([key,items])=>[key,[{label:items.map(m=>`${m.label} +${Math.round(m.value*100)}%`).join('、'),factor:1+items.reduce((n,m)=>n+m.value,0)}]]));
}
export function passiveDamageMultiplier(b,u,target,kind,basic=kind==='basic') {
  let bonus=0;
  if(!basic&&kind==='force'&&target.type!=='gate'&&u.force>target.force&&Object.entries(GENERAL_SKILLS).some(([id,[,type]])=>u.type===type&&hasPassive(u,id)))bonus+=.2;
  if(basic){
    if(hasPassive(u,'crossbow')&&u.type==='crossbow'&&u.passiveState?.shots>=3)bonus+=.18;
    if(hasPassive(u,'joint')&&allies(b,u).some(v=>adjacent(v,target)===1))bonus+=.15;
  }
  if(kind!=='intellect'&&hasPassive(u,'isolated')&&!allies(b,target).some(v=>adjacent(v,target)===1))bonus+=.25;
  if(kind==='intellect'&&target.type!=='gate'&&hasPassive(u,'foresight')&&(target.intent||0)<60)bonus+=.3;
  return 1+bonus;
}
export function passiveDamageTaken(b,u,kind,basic=kind==='basic') {
  let factor=hasPassive(u,'fortress')?.88:1;
  if(adapting(b,u))factor*=.85;
  if(basic&&hasPassive(u,'shelter'))factor*=.92;
  if(['basic','force'].includes(kind)){
    if(hasPassive(u,'guard'))factor*=.9;
    if(onField(u)&&allies(b,u).some(v=>hasPassive(v,'guard')&&adjacent(u,v)===1))factor*=.85;
  }
  return factor;
}
export function supportMultiplier(u,target,kind) {
  let bonus=kind==='shield'&&hasPassive(u,'shield')?.2:0;
  if(u!==target&&u.side===target.side){
    if(hasPassive(u,'aid'))bonus+=.25;
    if(hasPassive(u,'rescue')&&hpRatio(target)<.5)bonus+=.35;
  }
  return 1+bonus;
}
// Describe current eligibility without inventing an active spell or casting state.
export function passiveList(u,b=null) {
  const field=!!b&&onField(u), mods=passiveAttributes(b,u);
  const labels=Object.values(mods).flat().map(m=>m.label).join(' ');
  return skillRoute(u).map((id,i)=>{
    const def=PASSIVES[id], unlocked=officerLevel(u)>=SKILL_LEVELS[i];
    let state=unlocked?'被动生效':`${SKILL_LEVELS[i]} 级解锁`;
    if(unlocked){
      if(def.domain==='domestic')return {id,...def,level:SKILL_LEVELS[i],unlocked,state:b?'内政技能 · 战场不生效':'任太守时生效'};
      if(def.domain==='diplomacy')return {id,...def,level:SKILL_LEVELS[i],unlocked,state:'外交预留 · 未开放'};
      if(GENERAL_SKILLS[id])return {id,...def,level:SKILL_LEVELS[i],unlocked,state:u.type===GENERAL_SKILLS[id][1]?'武技命中时判定':'兵种不符'};
      if(TROOP_TRAINING[id])state=u.type===TROOP_TRAINING[id].type?'已生效':'兵种不符';
      if(id.startsWith('hero-')){
        const p=FAMOUS_OFFICERS[id.slice(5)].ultimate;
        state=p.troops&&!p.troops.includes(u.type)?'兵种不符':personalCondition(b,u,null,p)?'已生效':field?'条件未满足':'待条件满足';
      }
      if(['rider','rapid'].includes(id))state=labels.includes(def.name)?'已生效':'兵种不符';
      else if(['spear','bow'].includes(id)&&u.type!==(id==='spear'?'spear':'archer'))state='兵种不符';
      else if(['spear','bow','steady','desperate','defiant','swift'].includes(id))state=labels.includes(def.name)?'已生效':field?'条件未满足':'待战场判定';
      else if(['crossbow','joint','combo','foresight','isolated','rescue','shield','aid','suppress','spirit','endurance','calm'].includes(id))state=id==='crossbow'&&u.type!=='crossbow'?'兵种不符':'结算时判定';
      else if(id==='prepared')state=u.passiveState?.reserveEntered?'本场已入场':field?'首发不触发':'待预备队入场';
      else if(id==='adapt')state=adapting(b,u)?`生效中 · ${u.passiveState.entryUntil-b.tick} 步`:u.passiveState?.reserveEntered?'本场效果结束':field?'首发不触发':'待预备队入场';
      else if(['command','guard'].includes(id))state=field?'在场生效':'待上场';
    }
    return {id,...def,level:SKILL_LEVELS[i],unlocked,state};
  });
}
