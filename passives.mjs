// Passive skills are derived from identity and level, never stored as equipped tactics.
export const SKILL_LEVELS = [2, 3, 5, 8, 10];
const skill = (name, tier, description) => ({name, tier, description});
export const PASSIVES = {
  assault:skill('强攻','基础通用','攻击 +8%'),
  iron:skill('铁壁','基础通用','防御 +10%'),
  discipline:skill('严整','基础通用','军纪 +12%'),
  martial:skill('勇武','基础通用','武技威力 +10%'),
  scholar:skill('博识','基础通用','谋略威力 +10%'),
  spirit:skill('振奋','基础通用','正常获得攻击战意时额外 +2'),
  endurance:skill('坚忍','基础通用','正常获得受击战意时额外 +2'),
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
  fortress:skill('坚城','高级通用','受到所有伤害降低 12%'),
  rapid:skill('疾射','高级通用','弓兵、弩兵攻速 +20%'),
  aid:skill('辅军','高级通用','战法给予其他友军的护盾、战意及冷却缩减量 +25%'),
  command:skill('御众','专属','在场时，周围 2 格内其他友军攻击、防御各 +10%'),
  defiant:skill('刚烈','专属','兵力越低，攻击与武技威力越高；兵力降至 50% 时各达 +25%'),
  isolated:skill('摧锋','专属','目标相邻没有其友军时，普攻、武力战法伤害 +25%'),
  guard:skill('虎卫','专属','相邻其他友军受到普攻、武力战法伤害降低 15%；自身降低 10%'),
  foresight:skill('料敌','专属','对战意低于最低战法门槛的目标，智力战法伤害 +30%'),
  rescue:skill('解危','专属','战法支援兵力低于 50% 的其他友军时，护盾、战意及冷却缩减量 +35%'),
  swift:skill('神行','专属','相邻无敌军时，移速 +30%、攻速 +20%'),
  adapt:skill('巧变','专属','预备队首次入场后 15 步，攻击、武技威力各 +20%，受到伤害降低 15%'),
};
export const SKILL_ROUTES = {
  cao:['iron','discipline','steady','calm','command'],
  dun:['assault','endurance','spear','desperate','defiant'],
  liao:['martial','spirit','rider','joint','isolated'],
  chu:['iron','shelter','steady','desperate','guard'],
  jia:['scholar','spirit','suppress','combo','foresight'],
  yu:['scholar','discipline','shield','calm','rescue'],
  yuanxia:['assault','spirit','bow','joint','swift'],
  jin:['iron','discipline','spear','steady','fortress'],
  shao:['assault','discipline','joint','calm','veteran'],
  yan:['martial','spirit','rider','joint','valor'],
  wen:['assault','martial','rider','desperate','veteran'],
  he:['assault','martial','joint','prepared','adapt'],
  ju:['scholar','discipline','shield','calm','aid'],
  tian:['scholar','spirit','suppress','combo','wisdom'],
  gao:['iron','endurance','spear','desperate','fortress'],
};
export const COMMON_ROUTES = {
  spear:['iron','discipline','spear','steady','fortress'],
  cavalry:['assault','martial','rider','joint','veteran'],
  archer:['assault','spirit','bow','joint','rapid'],
  crossbow:['assault','spirit','crossbow','joint','rapid'],
};
export const officerLevel = u => u.level ?? 1;
export const skillRoute = u => SKILL_ROUTES[u.id] || COMMON_ROUTES[u.skillRouteType || u.type] || COMMON_ROUTES.spear;
export const hasPassive = (u,id) => skillRoute(u).some((key,i)=>key===id&&officerLevel(u)>=SKILL_LEVELS[i]);
const adjacent=(a,c)=>Math.abs(a.x-c.x)+Math.abs(a.y-c.y);
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
export function passiveDamageMultiplier(b,u,target,kind,threshold=0) {
  let bonus=0;
  if(kind==='basic'){
    if(hasPassive(u,'crossbow')&&u.type==='crossbow'&&u.passiveState?.shots>=3)bonus+=.18;
    if(hasPassive(u,'joint')&&allies(b,u).some(v=>adjacent(v,target)===1))bonus+=.15;
  }
  if(kind!=='intellect'&&hasPassive(u,'isolated')&&!allies(b,target).some(v=>adjacent(v,target)===1))bonus+=.25;
  if(kind==='intellect'&&hasPassive(u,'foresight')&&(target.intent||0)<threshold)bonus+=.3;
  return 1+bonus;
}
export function passiveDamageTaken(b,u,kind) {
  let factor=hasPassive(u,'fortress')?.88:1;
  if(adapting(b,u))factor*=.85;
  if(kind==='basic'&&hasPassive(u,'shelter'))factor*=.92;
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
