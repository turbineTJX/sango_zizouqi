import {isTargetable} from './engagement.mjs';
import {formationAuraFactor} from './support-rules.mjs';
import {troopFamily} from './troop-training.mjs';
import {hexDistance} from './hex-grid.mjs';
import {TROOP_INTENT} from './combat-rules.mjs';
import {FAMOUS_OFFICERS} from './famous-officers.mjs';
import {COMMAND_TRAITS,activeCommandTraits,WORK_TRAITS,BATTLE_TRAITS,COMMON_TRAITS,CIVIC_TRAITS,officerTraits,aptitudeKey} from './officer-traits.mjs';
// Fixed identity traits are available from level one.
const GENERAL_SKILLS={spearGeneral:['枪将','spear'],halberdGeneral:['戟将','halberd'],cavalryGeneral:['骑将','cavalry'],bowGeneral:['弓将','archer']};
const TROOP_TRAINING={
 halberdDrill:{type:'halberd',name:'戟阵',stats:{defense:.15,attackSpeed:.1},description:'本队为戟兵时，防御 +15%、攻速 +10%'},
 siegeDrill:{type:'siege',name:'机巧',stats:{attack:.1,siege:.2},description:'本队为兵器时，攻击 +10%、攻城威力 +20%'},
 shipDrill:{type:'ship',name:'操舵',stats:{defense:.15,move:.1},description:'本队为舰船时，防御 +15%、移速 +10%'},
};
import {TRAIT_DESIGNS} from './data/design/traits.mjs';
export const PASSIVES=structuredClone(TRAIT_DESIGNS);
export const SKILL_ROUTES = Object.fromEntries(Object.keys(BATTLE_TRAITS).map(id=>[id,officerTraits({id})]));
export const COMMON_ROUTES = COMMON_TRAITS;
export const CIVIC_ROUTES = CIVIC_TRAITS;
export const commonRouteKey=aptitudeKey;
export const commonRouteName=u=>CIVIC_ROUTES[u.id]?'治政人才专长':({domestic:'治政专长',halberd:'戟阵专长',siege:'攻城专长',ship:'水战专长',spear:'日阵专长',cavalry:'骑战专长',archer:'弓术专长',crossbow:'弩术专长',strategist:'谋略专长',support:'支援专长'}[commonRouteKey(u)]);
for(const [id,p] of Object.entries(FAMOUS_OFFICERS))if(p.route){


  SKILL_ROUTES[id]=officerTraits({id});
}
function personalPassive(u){const key=skillRoute(u).find(k=>k.startsWith('hero-')&&hasPassive(u,k));return key?PASSIVES[key]?.personal:null;}
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
export const skillRoute = officerTraits;
export const hasPassive = (u,id) => skillRoute(u).includes(id);
export const domesticEffects=u=>u?skillRoute(u).filter(id=>hasPassive(u,id)&&PASSIVES[id].effects).reduce((sum,id)=>{for(const [key,value]of Object.entries(PASSIVES[id].effects))sum[key]=(sum[key]||0)+value;return sum;},{}):{};
export const intentIncome=u=>({attack:TROOP_INTENT[u.type].attack+(hasPassive(u,'spirit')?2:0),hit:TROOP_INTENT[u.type].hit+(hasPassive(u,'endurance')?2:0)});
export const deniesHitIntent=(u,skill)=>hasPassive(u,skill?'stifle':'interdict');
const adjacent=hexDistance;
const onField=u=>u.status==='active'&&u.hp>0;
const allies=(b,u)=>(b?.sides?.[u.side]?.units||[]).filter(v=>v!==u&&onField(v));
const enemies=(b,u)=>(b?.sides?.[1-u.side]?.units||[]).filter(v=>onField(v)&&isTargetable(b,v));
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
  for(const id of activeCommandTraits(b,u))for(const [key,value] of Object.entries(COMMAND_TRAITS[id].stats))add(key,value,COMMAND_TRAITS[id].name);
  for(const [id,p] of Object.entries(TROOP_TRAINING))if(has(id)&&(u.type===p.type||troopFamily(u.type)===p.type))for(const [key,value] of Object.entries(p.stats))add(key,value,p.name);
  for(const id of skillRoute(u))for(const [key,scale] of Object.entries(PASSIVES[id]?.politicsStats||{}))add(key,Math.max(0,Math.min(100,u.politics||0))*scale,PASSIVES[id].name);
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
      if(has('bow')&&troopFamily(u.type)==='archer')add('attack',.15,'弓术');
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
  if(!basic&&kind==='force'&&target.type!=='gate'&&u.force>target.force&&Object.entries(GENERAL_SKILLS).some(([id,[,type]])=>(u.type===type||troopFamily(u.type)===type)&&hasPassive(u,id)))bonus+=.2;
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
    const def=PASSIVES[id], unlocked=true;
    let state='条件生效';
    if(unlocked){
      if(def.domain==='command')return {id,...def,level:1,unlocked,state:b?(activeCommandTraits(b,u).includes(id)&&b.sides[u.side].commanders.some(c=>c.id===u.id&&c.armyId===u.armyId&&c.role===def.role)?'军团任职生效':'未担任对应军团职务'):'仅任'+(def.role==='leader'?'军团长':'军师')+'时对所属军团生效'};
      if(def.domain==='domestic')return {id,...def,level:1,unlocked,state:b?'内政特性 · 战场不生效':def.scope==='cooperation'?'同城同方向协作时判定':def.scope==='actor'?'本人办理对应事务时生效':['administration','benevolence'].includes(id)?'本人办理或任太守时生效':'任太守时生效'};
      if(def.domain==='movement'||def.domain==='personality')return {id,...def,level:1,unlocked,state:b?'战场不生效':def.domain==='movement'?'实际行程中生效':'内政选事时生效'};
      if(def.domain==='diplomacy')return {id,...def,level:1,unlocked,state:'外交预留 · 未开放'};
      if(def.aura){const factor=formationAuraFactor(u);return {id,...def,description:def.description+'；当前每次最多救治目标兵力上限 '+(def.aura.healFraction*factor*100).toFixed(2)+'% 的已有伤兵，恢复 '+Math.round(def.aura.intent*factor)+' 战意',level:1,unlocked,state:field?((b.sides[u.side].retreat||['confuse','confuse'].some(k=>(u.statuses?.[k]?.until||0)>b.tick))?'已中断':'相邻友军范围内生效'):'待上场 · 不限兵种'};}
      if(def.politicsStats)return {id,...def,level:1,unlocked,state:'已生效 · 政治 '+(u.politics||0)};
      if(GENERAL_SKILLS[id])return {id,...def,level:1,unlocked,state:(u.type===GENERAL_SKILLS[id][1]||troopFamily(u.type)===GENERAL_SKILLS[id][1])?'武技命中时判定':'兵种不符'};
      if(TROOP_TRAINING[id])state=(u.type===TROOP_TRAINING[id].type||troopFamily(u.type)===TROOP_TRAINING[id].type)?'已生效':'兵种不符';
      if(id.startsWith('hero-')){
        const p=PASSIVES[id].personal;
        state=p.troops&&!p.troops.includes(u.type)?'兵种不符':personalCondition(b,u,null,p)?'已生效':field?'条件未满足':'待条件满足';
      }
      if(['rider','rapid'].includes(id))state=labels.includes(def.name)?'已生效':'兵种不符';
      else if(['spear','bow'].includes(id)&&u.type!==(id==='spear'?'spear':'archer'))state='兵种不符';
      else if(['spear','bow','steady','desperate','defiant','swift'].includes(id))state=labels.includes(def.name)?'已生效':field?'条件未满足':'待战场判定';
      else if(['crossbow','joint','combo','foresight','isolated','rescue','shield','aid','suppress','spirit','endurance','calm'].includes(id))state=id==='crossbow'&&u.type!=='crossbow'?'兵种不符':'结算时判定';
      else if(id==='prepared')state=u.passiveState?.reserveEntered?'本场已入场':field?'首发不触发':'待预备队入场';
      else if(id==='adapt')state=adapting(b,u)?`生效中 · ${u.passiveState.entryUntil-b.tick} 日`:u.passiveState?.reserveEntered?'本场效果结束':field?'首发不触发':'待预备队入场';
      else if(['command','guard'].includes(id))state=field?'在场生效':'待上场';
    }
    return {id,...def,level:1,unlocked,state};
  });
}
