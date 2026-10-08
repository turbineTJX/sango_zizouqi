import {validateTreasureDesigns} from './treasure-design-validation.mjs';
import {TREASURE_DESIGNS,TREASURE_RULES,EYE_ACTIONS} from './data/design/treasures.mjs';
import {WORK_MODIFIERS} from './work-traits.mjs';
import {STRATEGIC_TRAIT_EFFECTS} from './strategic-traits.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {BOND_ASSIGNMENTS,BOND_TRIPLE_OFFICERS} from './data/design/bond-assignments.mjs';
import {TRAIT_EVENTS,TRAIT_EFFECTS} from './trait-mechanics.mjs';
import {ROAD_NETWORK_DESIGN} from './data/design/road-network.mjs';
import {STATUS_DEFINITIONS,REMEDIES} from './data/design/battle-statuses.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {STRATEGIC_SUPPORT_RULES} from './data/design/strategic-support-rules.mjs';
import {MERIT_RULES} from './data/design/progression.mjs';
import {DOMESTIC_INCIDENT_RULES,DOMESTIC_INCIDENTS} from './data/design/domestic-incidents.mjs';
import {validateStrategyDesigns} from './design-strategy-validation.mjs';
import {BUILDING_DESIGNS} from './data/design/buildings.mjs';
import {DOMESTIC_ACTION_DESIGNS,DOMESTIC_DIRECTIONS,DOMESTIC_DIRECTION_STATS} from './data/design/domestic-actions.mjs';
import {NATIONAL_ROAD_DESIGNS,DEMO_ROAD_DESIGNS} from './data/design/roads.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {NATIONAL_MAP as MAP_SOURCE} from './data/national-map.mjs';
import {TRAIT_DESIGNS} from './data/design/traits.mjs';
import {TACTIC_DESIGNS} from './data/design/tactics.mjs';
import {STRATAGEM_DESIGNS} from './data/design/stratagems.mjs';
import {STRATAGEM_ATTRIBUTE_RULES} from './data/design/stratagem-attributes.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {OFFICER_DESIGNS} from './data/design/officers.mjs';
import {CITY_DESIGNS,DEMO_CITY_DESIGNS} from './data/design/cities.mjs';
import {NATIONAL_SCENARIO_DESIGNS,EXTRA_FACTION_DESIGNS,ATLAS_SCENARIO_ANCHORS} from './data/design/national-scenarios.mjs';
import {REFERENCE_SCENARIO} from './data/design/reference-scenario.mjs';
import {OFFICER_ASSIGNMENTS,TROOP_TACTIC_POOLS,INTELLECT_TACTIC_POOLS} from './data/design/assignments.mjs';
import {DESIGN_FIELDS,DESIGN_EFFECTS,ENGINE_TRAIT_IDS} from './data/design/schema.mjs';
import TECHNOLOGIES from './data/design/technologies.mjs';
import {CITY_TECHNOLOGY_PROFILES} from './data/design/city-technologies.mjs';
import {validateTechnologyDesigns} from './technology-design-validation.mjs';
import {DIPLOMACY_RULES,DIPLOMACY_AI,DIPLOMACY_WORK,DIPLOMACY_DIRECTIONS,DIPLOMACY_GOALS,DIPLOMACY_ACTIONS} from './data/design/diplomacy-rules.mjs';
export const DESIGN_TABLES={strategicSupport:STRATEGIC_SUPPORT_RULES,treasures:TREASURE_DESIGNS,treasureRules:TREASURE_RULES,domesticIncidents:{rules:DOMESTIC_INCIDENT_RULES,events:DOMESTIC_INCIDENTS},diplomacy:{rules:DIPLOMACY_RULES,ai:DIPLOMACY_AI,work:DIPLOMACY_WORK,directions:DIPLOMACY_DIRECTIONS,goals:DIPLOMACY_GOALS,actions:DIPLOMACY_ACTIONS},bonds:BOND_DESIGNS,bondAssignments:BOND_ASSIGNMENTS,roadNetwork:ROAD_NETWORK_DESIGN,economy:ECONOMY_RULES,progression:MERIT_RULES,technologies:TECHNOLOGIES,cityTechnologies:CITY_TECHNOLOGY_PROFILES,buildings:BUILDING_DESIGNS,domesticActions:DOMESTIC_ACTION_DESIGNS,directions:DOMESTIC_DIRECTIONS,directionStats:DOMESTIC_DIRECTION_STATS,roads:NATIONAL_ROAD_DESIGNS,demoRoads:DEMO_ROAD_DESIGNS,movement:MOVEMENT_RULES,traits:TRAIT_DESIGNS,tactics:TACTIC_DESIGNS,stratagems:STRATAGEM_DESIGNS,stratagemAttributes:STRATAGEM_ATTRIBUTE_RULES,troops:TROOP_DESIGNS,officers:OFFICER_DESIGNS,cities:CITY_DESIGNS,demoCities:DEMO_CITY_DESIGNS,assignments:OFFICER_ASSIGNMENTS,troopPools:TROOP_TACTIC_POOLS,intellectPools:INTELLECT_TACTIC_POOLS};
export function validateDesignTables(tables=DESIGN_TABLES){
 const errors=[],check=(ok,path,msg)=>{if(!ok)errors.push(path+'：'+msg);},exists=(table,id)=>Object.hasOwn(table,id),numeric=(n,min=0,max=Infinity)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
 const attr=tables.stratagemAttributes;
 check(attr&&Object.keys(attr).sort().join(',')==='doublingPoints,max,min,reference'&&numeric(attr.reference,1,100)&&numeric(attr.doublingPoints,1,100)&&numeric(attr.min,.1,1)&&numeric(attr.max,1,2),'stratagemAttributes','军略属性折算参数无效');
 validateTreasureDesigns(tables,check);
 const diplomacy=tables.diplomacy;
 check(diplomacy&&Object.keys(diplomacy).sort().join(',')==='actions,ai,directions,goals,rules,work','diplomacy','外交设计字段未接入');
 if(diplomacy){for(const group of ['rules','ai']){const source=group==='rules'?DIPLOMACY_RULES:DIPLOMACY_AI;check(Object.keys(diplomacy[group]).sort().join(',')===Object.keys(source).sort().join(','),'diplomacy.'+group,'未接入字段');for(const [key,n]of Object.entries(diplomacy[group]))check(numeric(n,0),'diplomacy.'+group+'.'+key,'参数须为非负有限数');}
  for(const [key,w]of Object.entries(diplomacy.work))check(Object.keys(w).sort().join(',')==='days,fee'&&Number.isSafeInteger(w.days)&&w.days>0&&Number.isSafeInteger(w.fee)&&w.fee>=0,'diplomacy.work.'+key,'工期或接洽费无效');
  check(Object.keys(diplomacy.actions).sort().join(',')===Object.keys(DIPLOMACY_ACTIONS).sort().join(','),'diplomacy.actions','原子动作须有对应履约处理器');
  for(const [key,d]of Object.entries(diplomacy.directions))check(['charm','politics','intellect'].includes(d.stat)&&typeof d.name==='string'&&Object.keys(d).sort().join(',')==='days,fee,name,stat','diplomacy.directions.'+key,'方向须引用唯一主属性');
  check(diplomacy.rules.lightSpeed>diplomacy.rules.captiveSpeed&&diplomacy.rules.grainPrice>0&&diplomacy.rules.offerDays>0,'diplomacy.rules','外交行进、报价或期限无效');}
 const p=tables.progression;check(p&&p.costs?.length===9&&p.costs.every((n,i)=>Number.isSafeInteger(n)&&n>0&&(!i||n>p.costs[i-1]))&&numeric(p.battleDivisor,1),'progression','升级成本须逐级递增且兑换除数有效');
 check(new Set(Object.values(STATUS_DEFINITIONS).map(s=>s.name)).size===Object.keys(STATUS_DEFINITIONS).length,'statuses','状态名称不能重复');
 const ids=(list,table,path)=>{check(Array.isArray(list),path,'必须是ID数组');if(!Array.isArray(list))return;check(new Set(list).size===list.length,path,'重复ID');for(const id of list)check(exists(table,id),path,'未知引用 '+id);};
 for(const [name,rows] of Object.entries(tables)){
  if(!DESIGN_FIELDS[name]&&name!=='demoCities')continue;
  for(const [key,r] of Object.entries(rows)){
   const path=name+'.'+(r?.id||key);check(r&&typeof r==='object'&&!Array.isArray(r),path,'必须为记录');if(!r||typeof r!=='object')continue;
   check(typeof r.name==='string'&&r.name.length>0,path+'.name','名称不能为空');
   const nameLengths={traits:[2],tactics:[2,4],stratagems:[4]}[name];
   if(nameLengths)check(typeof r.name==='string'&&/^\p{Script=Han}+$/u.test(r.name)&&nameLengths.includes([...r.name].length),path+'.name',({traits:'特性名称须为两个汉字',tactics:'战法名称须为两个或四个汉字',stratagems:'军略名称须为四个汉字'})[name]);
   for(const field of Object.keys(r))check((DESIGN_FIELDS[name==='demoCities'?'cities':name]).includes(field),path,'未接入字段 '+field);
  }
 }
 const pool=Object.values(tables.bonds||{});
 check(pool.filter(d=>d.grade==='basic').length===25&&pool.filter(d=>d.grade==='advanced').length===6,'bonds','共享池须为二十五种低级、六种高级');
 check(BOND_TRIPLE_OFFICERS.length<10&&new Set(BOND_TRIPLE_OFFICERS).size===BOND_TRIPLE_OFFICERS.length,'bondAssignments','三羁绊指定名单须少于十人');
 check(Object.values(tables.bondAssignments||{}).filter(a=>Object.keys(a).length===3).length<10,'bondAssignments','三羁绊持有者须少于十人');
 for(const [id,d] of Object.entries(tables.bonds||{})){
  const path='bonds.'+id;
  check(['basic','advanced'].includes(d.grade)&&typeof d.summary==='string'&&d.summary.length>0&&typeof d.tradeoff==='string'&&d.tradeoff.length>0,path,'羁绊定位或组阵取舍无效');
  if(d.special==='valorIntent')check(d.immunityChance?.length===d.thresholds.length&&d.immunityChance.every(n=>numeric(n,0,1))&&d.immunityChance.at(-1)===1,path,'勇武免疫参数无效');
  if(d.special==='distantStrike')check(d.minDistance===2,path,'远击距离无效');
  if(d.special==='finishStrike')check(d.hpThreshold===.5,path,'锐锋兵力阈值无效');
  if(d.special==='lastStand')check(numeric(d.hpThreshold,.1,.5)&&d.protection?.length===d.thresholds.length&&d.protection.every(n=>numeric(n,0,.3)),path,'背水阈值或减伤无效');
  for(const field of ['specialRates','flankRates'])if(d[field])check(d[field].length===d.thresholds.length&&d[field].every(n=>numeric(n,0,.5)),path,'条件效果分档无效');
  if(d.hitStatus)check(['slow','armorBreak'].includes(d.hitStatus)&&d.hitDuration?.length===d.thresholds.length&&d.hitDuration.every(n=>Number.isInteger(n)&&n>=0&&n<=4)&&(!d.targetFamily||d.targetFamily==='cavalry'),path,'羁绊命中异常无效');
  if(d.entryEquipment){const e=d.entryEquipment;check(['orb','heavy'].includes(e.kind)&&Array.isArray(e.charges)&&e.charges.length===d.thresholds.length&&e.charges.every(n=>Number.isInteger(n)&&n>=1&&n<=3)&&typeof e.holder==='boolean'&&Array.isArray(e.families)&&e.families.every(f=>['spear','halberd','cavalry','archer','ship','siege'].includes(f))&&Number.isInteger(e.priority),path,'入场装备或受益资格无效');check(e.kind==='orb'?['fire','curse'].includes(e.skillId):numeric(e.bonus,0,1)&&e.control==='confuse'&&e.steps===1,path,'法球或重击处理器无效');}
  if(['entryZoc','entryPower'].includes(d.special))check(d.entryDuration?.length===d.thresholds.length&&d.entryDuration.every(n=>Number.isInteger(n)&&n>0&&n<=12),path,'入场羁绊时长无效');
  if(d.special==='beautyHit')check(d.intentDrain?.length===d.thresholds.length&&d.intentDrain.every(n=>Number.isInteger(n)&&n>0&&n<=100)&&d.statusChance?.length===d.thresholds.length&&d.statusChance.every(n=>numeric(n,0,1))&&Number.isInteger(d.statusSteps)&&d.statusSteps>0&&d.statusSteps<=6&&Array.isArray(d.statuses)&&d.statuses.length>0&&new Set(d.statuses).size===d.statuses.length&&d.statuses.every(key=>['confuse','seal','disrupted','slow','weaken','armorBreak'].includes(key)),path,'倾国参数无效');
  if(d.special==='entryIntent')check(d.entryIntent?.length===d.thresholds.length&&d.entryIntent.every(n=>Number.isInteger(n)&&n>=0&&n<=100),path,'初始战意无效');
  if(d.special==='commandStrength')check(d.strengthBonus?.length===d.thresholds.length&&d.strengthBonus.every(n=>numeric(n,0,.5))&&d.enhancedEffects?.every(key=>['assault','fortify','disrupt','heal','regenerate','relief','inspire','demoralize','cycle'].includes(key)),path,'军略强化参数无效');
  check(['troop','tactic','rare'].includes(d.category),path,'羁绊分类无效');
  if(d.special==='command')check(Array.isArray(d.commandRate)&&d.commandRate.length===d.thresholds.length&&d.commandRate.every(n=>numeric(n,1,2)),path,'谋主恢复倍率无效');
  const tierNumbers=(key,min,max)=>Array.isArray(d[key])&&d[key].length===d.thresholds.length&&d[key].every(n=>numeric(n,min,max));
  const rounds=key=>Number.isSafeInteger(d[key])&&d[key]>0&&d[key]<=12;
  const basicStat={attackPower:'attack',defenseArmor:'defense',rapidAttack:'attackSpeed'}[d.special];
  if(basicStat)check(d.stat===basicStat&&tierNumbers('values',.01,.5)&&d.extraValue===0,path,'基础数值羁绊属性无效');
  if(d.special==='intentIncome')check(tierNumbers('incomeBonus',.01,2)&&d.values.every(n=>n===0),path,'昂扬战意获取参数无效');
  if(d.special==='hitIntentDeny')check(tierNumbers('chance',0,1)&&d.chance.at(-1)===1&&d.values.every(n=>n===0),path,'截气概率或满档参数无效');
  if(d.special==='swiftBurst')check(d.stat==='move'&&tierNumbers('values',.01,1)&&rounds('period')&&Array.isArray(d.burstSteps)&&d.burstSteps.length===d.thresholds.length&&d.burstSteps.every(n=>Number.isSafeInteger(n)&&n>0&&n<d.period),path,'疾驰突进时长或冷却无效');
  if(d.special==='escort')check(tierNumbers('shieldFraction',0,.3)&&numeric(d.range,1,2)&&numeric(d.hpThreshold,.1,.5)&&rounds('period')&&rounds('shieldSteps')&&d.invincibleSteps===1,path,'护卫护盾或限次参数无效');
  if(d.special==='songAttack')check(tierNumbers('intentGain',1,10)&&numeric(d.range,1,2)&&rounds('shieldSteps')&&numeric(d.overflowShieldRate,0,.02)&&numeric(d.overflowShieldCap,0,.1),path,'战歌参数无效');
  if(['crusherAttack','doubtPulse','lureAttack','fireAttack'].includes(d.special))check(tierNumbers('chance',0,1)&&rounds('statusSteps'),path,'羁绊异常概率或时长无效');
  if(d.special==='crusherAttack')check(numeric(d.intentDrain,1,12),path,'摧锋战意参数无效');
  if(['doubtPulse','fireAttack','chainAttack'].includes(d.special))check(rounds('period')&&numeric(d.range,1,3),path,'羁绊冷却或范围无效');
  if(d.special==='lureAttack')check(numeric(d.range,1,3),path,'诱敌范围无效');
  if(d.special==='fireAttack')check(numeric(d.burnRate,.01,.1),path,'火谋威力无效');
  if(d.special==='chainAttack')check(tierNumbers('fraction',0,.5)&&rounds('statusSteps')&&d.targets?.join(',')==='2,2,3',path,'连环参数无效');
  if(d.special==='distantStrike')check(tierNumbers('controlBonus',0,.3)&&numeric(d.defenseIgnore,0,.5),path,'远击控制利用参数无效');
  if(d.special==='isolatedStrike')check(rounds('phaseSteps'),path,'袭后穿阵时长无效');
  if(d.category==='rare'){const holders=Object.values(tables.bondAssignments||{}).filter(a=>a[id]);check(holders.length===3&&holders.every(a=>a[id]===1)&&d.thresholds.join(',')==='1,2,3',path,'桃园须为指定三人各一点，按一、二、三点激活');}
  const roster=Object.entries(tables.bondAssignments||{}).filter(([,a])=>a[id]);
  if(d.grade==='advanced'){
   check(roster.length>=3&&roster.length<=8&&Array.isArray(d.roster)&&d.roster.length===roster.length&&new Set(d.roster).size===d.roster.length&&roster.every(([person])=>d.roster.includes(person)),path,'高级羁绊须限于三至八名指定稀有武将');
   check(roster.length===({bondValor:6,bondBeauty:4,bondWisdom:8,bondReserve:4,bondLastStand:6,bondPeach:3})[id],path,'高级羁绊须保持指定核心名单规模，不能增添替代挂点');
   const expectedCores={bondValor:'person-661',bondBeauty:'person-425',bondWisdom:'person-290',bondReserve:'person-186',bondLastStand:'person-243',bondPeach:null};
   check(d.core===expectedCores[id]&&roster.every(([person,a])=>a[id]===(person===d.core?2:1)),path,'高级羁绊只允许指定核心二点，其他持有者一点');
   check(roster.every(([person])=>{const o=tables.officers[person];if(!o)return false;if(id==='bondPeach')return ['person-636','person-99','person-433'].includes(person);if(id==='bondBeauty')return ['person-425','person-301','person-388','person-267'].includes(person)&&o.charm>=92;if(id==='bondWisdom')return o.intellect>=94;return Math.max(o.leadership,o.force)>=(id==='bondLastStand'?89:90);}),path,'高级羁绊持有者须达到对应核心资质，不能分给弱将挂点');
   const expectedThresholds={bondValor:'2,4,6',bondBeauty:'2,3,5',bondWisdom:'2,4,6',bondReserve:'2,3,5',bondLastStand:'2,4,7',bondPeach:'1,2,3'};
   const expectedMinimums={bondValor:'1,3,5',bondBeauty:'1,2,4',bondWisdom:'1,3,5',bondReserve:'1,2,4',bondLastStand:'1,3,6',bondPeach:'1,2,3'};
   check(d.thresholds.join(',')===expectedThresholds[id]&&Array.isArray(d.minContributors)&&d.minContributors.join(',')===expectedMinimums[id],path,'高级档位须体现指定核心与搭档的组阵难度');
   const sorted=roster.map(([,a])=>a[id]).sort((a,b)=>b-a);check(Array.isArray(d.minContributors)&&d.minContributors.length===d.thresholds.length&&d.minContributors.every((n,i)=>Number.isInteger(n)&&n>=1&&n<=6&&sorted.slice(0,n-1).reduce((a,b)=>a+b,0)<d.thresholds[i]&&sorted.slice(0,n).reduce((a,b)=>a+b,0)>=d.thresholds[i]),path,'高级羁绊不能用少量高点持有者跳过人数门槛');
  }
  else check(roster.length>=20,path,'低级羁绊须至少二十名持有者，保证常见');const caps=roster.map(([,a])=>a[id]).sort((a,b)=>b-a);
  check(caps.slice(0,6).reduce((a,b)=>a+b,0)>=d.thresholds.at(-1),path,'普通六队上场限制内最高档不可达');
  if(d.grade==='basic'){check(caps.filter(n=>n===3).length<=1&&caps.filter(n=>n===2).length<=16,path,'高等级持有者过多');check(caps.slice(0,5).reduce((a,b)=>a+b,0)<d.thresholds.at(-1),path,'低级羁绊最高档至少需要六人在场');check(caps.slice(0,2).reduce((a,b)=>a+b,0)<d.thresholds[1],path,'低级羁绊第二档至少需要三人在场');}
  if(d.special==='swornLink')check(roster.length===3&&['person-636','person-99','person-433'].every(id=>tables.bondAssignments[id]?.bondPeach===1),path,'桃园名单或救援参数无效');
  if(d.special==='swornLink')check(numeric(d.singleDiscipline,.01,.2),path,'桃园单成员军纪参数无效');
  if(d.special==='swornLink')check(numeric(d.furyPower,0,1)&&numeric(d.furySpeed,0,1)&&Number.isInteger(d.furySteps)&&d.furySteps>0&&d.furySteps<=20&&Number.isInteger(d.invincibleSteps)&&d.invincibleSteps>0&&d.invincibleSteps<=4,path,'桃园强化参数无效');
  if(d.special==='reserveEntry')check(d.slots?.join(',')==='1,2,3'&&Number.isInteger(d.intent)&&d.intent>0&&d.intent<=30&&d.entrySteps===4,path,'蓄锐入场参数无效');
  if(d.special==='formationTiles')check(d.entryDuration?.length===d.thresholds.length&&d.entryDuration.every(n=>Number.isInteger(n)&&n>0&&n<=24)&&numeric(d.holderMultiplier,1,2)&&Number.isInteger(d.fullDuration)&&d.fullDuration>=Math.max(...d.entryDuration)&&d.fullDuration<=30,path,'军阵参数无效');
  if(d.special==='formationTiles')check(['land','forest','hill','marsh','river','naval','mixed'].every(key=>Array.isArray(d.patterns?.[key])&&d.patterns[key].length===3&&new Set(d.patterns[key].map(p=>String(p))).size===3&&d.patterns[key].every(p=>Array.isArray(p)&&p.length===2&&Number.isInteger(p[0])&&p[0]>=0&&p[0]<5&&Number.isInteger(p[1])&&p[1]>=0&&p[1]<8)),path,'军阵阵位无效');
  if(d.special==='routMomentum')check(d.killBonus?.length===d.thresholds.length&&d.killBonus.every(n=>numeric(n,0,.1))&&d.burstSpeed?.length===d.thresholds.length&&d.burstSpeed.every(n=>numeric(n,0,.5))&&Number.isInteger(d.killGoal)&&d.killGoal>=2&&d.killGoal<=5&&Number.isInteger(d.burstDuration)&&d.burstDuration>0&&d.burstDuration<=16,path,'破军参数无效');
  if(d.special==='valorRamp')check(d.stackRates?.length===d.thresholds.length&&d.stackRates.every(n=>numeric(n,0,.1))&&Number.isInteger(d.maxStacks)&&d.maxStacks>0&&d.maxStacks<=8&&numeric(d.rallyIntent,1,30),path,'奋战参数无效');
  check(/^\p{Script=Han}{2}$/u.test(d.name),path,'羁绊名称须为两个汉字');
  check(d.family===null||['spear','cavalry','archer','halberd','siege','ship'].includes(d.family),path,'羁绊兵科无效');
  check(Array.isArray(d.thresholds)&&d.thresholds.length>=2&&d.thresholds.length<=4&&d.thresholds.every((n,i)=>Number.isInteger(n)&&n>0&&(!i||n>d.thresholds[i-1])),path,'羁绊阈值须严格递增');
  check(['attack','defense','move','attackSpeed','siege','martialPower','strategyPower','discipline'].includes(d.stat)&&['attack','defense','move','attackSpeed','siege','martialPower','strategyPower','discipline'].includes(d.extra),path,'羁绊属性未接入');
  check(Array.isArray(d.values)&&d.values.length===d.thresholds.length&&d.values.every(n=>numeric(n,0,1))&&numeric(d.extraValue,0,1),path,'羁绊数值无效');
  check(numeric(d.specialValue,0,1),path,'羁绊特殊效果数值无效');
  check(['attackPower','defenseArmor','rapidAttack','intentIncome','hitIntentDeny','songAttack','crusherAttack','doubtPulse','lureAttack','fireAttack','chainAttack','antiCavalry','ignoreZoc','rearStrike','surrounded','gateStrike','formation','woundedStrike','lowIntent','escort','command','entryZoc','entryPower','entryIntent','commandStrength','beautyHit','swornLink','reserveEntry','valorIntent','swiftBurst','physicalGuard','distantStrike','lastStand','scholarPower','spreadGuard','finishStrike','counterHorse','siegeStrike','steadyDiscipline','nearAllySpeed','isolatedStrike','formationTiles','routMomentum'].includes(d.special),path,'羁绊特殊效果未接入');
 }
 validateTechnologyDesigns(tables,check);const techIds=new Set(tables.technologies.records.map(r=>r.id));
 for(const [id,t] of Object.entries(tables.troops)){
  check(['troop','equipment'].includes(t.category)&&[0,1].includes(t.tier),'troops.'+id,'兵种类别或技术等级无效');
  check(t.category==='troop'?['spear','halberd','cavalry','archer'].includes(t.family):['siege','ship'].includes(t.equipmentSlot),'troops.'+id,'部队兵科或携带装备栏位无效');
  check(t.tier===0?!t.technology:techIds.has(t.technology),'troops.'+id,'技术解锁引用无效');
  check(exists(tables.troops,t.family),'troops.'+id+'.family','适性兵科不存在');
  check(numeric(t.goldPerThousand,1),'troops.'+id+'.goldPerThousand','编制费用须为正数');
  for(const key of ['attack','defense','discipline','range','siegeFactor'])check(numeric(t[key]),'troops.'+id+'.'+key,'须为非负数');
  for(const key of ['move','interval'])check(numeric(t[key],Number.EPSILON),'troops.'+id+'.'+key,'须大于0');
  check(t.beats===null||exists(tables.troops,t.beats),'troops.'+id+'.beats','克制兵种不存在');
 }
 for(const [id,t] of Object.entries(tables.tactics)){
  if(t.effect==='undermine')check(numeric(t.suppression,0,1)&&Number.isInteger(t.steps)&&t.steps>0&&Number.isInteger(t.targets)&&t.targets>0&&numeric(t.range,1)&&numeric(t.radius,0),'tactics.'+id,'抑气比例、范围或持续无效');
  if(t.selfStatus!==undefined)check(Object.hasOwn(STATUS_DEFINITIONS,t.selfStatus)&&Number.isInteger(t.selfStatusSteps)&&t.selfStatusSteps>0,'tactics.'+id+'.selfStatus','自身状态或时长无效');
  if(t.regrowthFraction!==undefined)check(numeric(t.regrowthFraction,0,1)&&Number.isInteger(t.regrowthSteps)&&t.regrowthSteps>0&&t.mode==='support','tactics.'+id+'.regrowth','休整参数无效');
  const namedStatuses=[t.statusKey,t.debuff,t.control,t.selfStatus,...Object.keys(t.buffs||{}),...(t.exploit?.statuses||[]),...(t.regrowthFraction?['regrowth']:[])].filter(Boolean);
  for(const key of namedStatuses)check(!!STATUS_DEFINITIONS[key]&&t.description.includes(STATUS_DEFINITIONS[key].name),'tactics.'+id+'.description','须使用正式状态名称 '+key);
  if(t.targetRear!==undefined)check(typeof t.targetRear==='boolean'&&numeric(t.range,1),'tactics.'+id+'.targetRear','后排偏好须有明确射程');
  if(t.meleeSustain!==undefined){const s=t.meleeSustain;check(s&&Object.keys(s).every(k=>['heal','shield','cap','steps'].includes(k))&&numeric(s.heal,0,1)&&numeric(s.shield,0,1)&&numeric(s.cap,0,1)&&Number.isInteger(s.steps)&&s.steps>0,'tactics.'+id+'.meleeSustain','近战吸血护盾参数无效');}
  if(t.effect==='status')check(Object.hasOwn(STATUS_DEFINITIONS,t.statusKey)&&numeric(t.steps,1),'tactics.'+id,'状态处理器或持续无效');
  if(t.effect==='remedy')check(Object.hasOwn(REMEDIES,t.remedy),'tactics.'+id,'解除动作无效');
  if(t.stasisDays!==undefined)check(['mirage','mist'].includes(t.effect)&&Number.isInteger(t.stasisDays)&&t.stasisDays>0&&numeric(t.stasisHealth,0,1)&&Number.isInteger(t.stasisLockDays)&&t.stasisLockDays>t.stasisDays,'tactics.'+id+'.stasis','避战参数无效');
  check(t.id===id,'tactics.'+id,'记录ID与键不一致');check(DESIGN_EFFECTS.tactics.includes(t.effect),'tactics.'+id+'.effect','引擎尚未支持此效果');
  if(t.effect==='displace')check(t.range===1&&Number.isInteger(t.steps)&&t.steps>=1&&t.steps<=2&&numeric(t.scale,Number.EPSILON),'tactics.'+id,'位移战法须为相邻、最多两格的实际击退');
  check(['low','high','special'].includes(t.learningTier),'tactics.'+id+'.learningTier','无效学习类别');check(['force','intellect','politics'].includes(t.category),'tactics.'+id+'.category','无效能力类别');
  for(const key of ['cooldown','threshold','intentCost','maxUses'])check(numeric(t[key]),'tactics.'+id+'.'+key,'须为非负数');
  check(Number.isInteger(t.maxUses)&&t.maxUses>=0,'tactics.'+id+'.maxUses','须为非负整数');
  check(t.passive?t.maxUses===0:t.maxUses>0,'tactics.'+id+'.maxUses','主动战法须有限次，常驻光环须为0');
 }
 for(const [id,s] of Object.entries(tables.stratagems)){
  const r=s.scope,path='stratagems.'+id+'.scope';
  check(typeof s.ai==='string'&&DESIGN_EFFECTS.stratagems.includes(s.ai)&&s.ai===s.effect,'stratagems.'+id+'.ai','每项军略须明确配置已实现的简单AI触发类型');
  const scaledEffect=['shield','heal','firestorm','tacticRefresh','catastrophe'].includes(s.effect)?'strength':s.effect==='forceReserve'?'count':s.effect==='cleanse'?'resolve':s.disciplineDuration?'disciplineDuration':'duration';
  check(s.weights&&Object.keys(s.weights).sort().join(',')==='intellect,leadership'&&Object.values(s.weights).every(w=>numeric(w,0,1))&&Math.abs(s.weights.leadership+s.weights.intellect-1)<1e-9,'stratagems.'+id+'.weights','军略须按施放者统率与智力折算');
  check(s.scaling===scaledEffect,'stratagems.'+id+'.scaling','军略属性须改变实际主要效果');
  check(['support','offense','control'].includes(s.group),'stratagems.'+id+'.group','军略表现组无效');
  check(r&&['army','reserve','battlefield','circle','rectangle','unit'].includes(r.shape),path,'必须明确施放范围');
  if(r?.shape==='circle')check(numeric(r.radius,.1,10)&&Object.keys(r).every(k=>['shape','radius'].includes(k)),path,'圆形半径或字段无效');
  if(r?.shape==='rectangle')check(numeric(r.width,.1,14)&&numeric(r.height,.1,8)&&Object.keys(r).every(k=>['shape','width','height'].includes(k)),path,'矩形尺寸或字段无效');
  if(['circle','rectangle'].includes(r?.shape))check(['shield','heal','cleanse','invincible','ambush','stun','magicImmunity','rapidAdvance','firestorm','eightFormation'].includes(s.effect||id),path,'该效果尚未支持选区');
  if(r?.shape==='unit')check(s.effect==='rapidAdvance'&&s.side===0&&Object.keys(r).length===1,path,'单队军略无效');
  if(s.effect==='magicImmunity'){const d=s.disciplineDuration;check(s.side===0&&(r?.shape==='circle'&&!d&&s.duration>0||r?.shape==='army'&&d&&Object.keys(d).length===3&&Number.isInteger(d.base)&&d.base>0&&numeric(d.per,1)&&Number.isInteger(d.max)&&d.max>=d.base),'stratagems.'+id,'军纪时长参数无效');}
  else check(s.disciplineDuration===undefined,'stratagems.'+id,'未接入军纪时长');
  if(s.maxUses!==undefined)check(Number.isInteger(s.maxUses)&&s.maxUses>0,'stratagems.'+id+'.maxUses','每场次数无效');
  if(s.effect==='eightFormation'){
   const z=s.zone;check(s.side===1&&s.maxUses===1&&r?.shape==='circle'&&Number.isInteger(s.duration)&&s.duration>0&&!s.field,'stratagems.'+id,'八阵范围或限次无效');
   check(z&&Object.keys(z).every(k=>['statusSteps','chanceScale','minChance','maxChance','statuses'].includes(k))&&Number.isInteger(z.statusSteps)&&z.statusSteps>0&&numeric(z.chanceScale,1)&&numeric(z.minChance,0,1)&&numeric(z.maxChance,z.minChance,1)&&Array.isArray(z.statuses)&&z.statuses.length>0&&new Set(z.statuses).size===z.statuses.length&&z.statuses.every(k=>['confuse','seal','disrupted','slow','weaken','armorBreak'].includes(k)),'stratagems.'+id+'.zone','八阵异常与概率参数无效');
  }else check(s.zone===undefined,'stratagems.'+id+'.zone','该效果未接入持续区域');
  check(DESIGN_EFFECTS.stratagems.includes(s.effect||id),'stratagems.'+id+'.effect','引擎尚未支持此效果');check(numeric(s.duration),'stratagems.'+id+'.duration','持续时间无效');
  const maxDuration=scaledEffect==='duration'?Math.round(s.duration*(attr?.max||2)):scaledEffect==='disciplineDuration'?Math.round(s.disciplineDuration.max*(attr?.max||2)):scaledEffect==='resolve'?Math.round(s.resolve*(attr?.max||2)):s.duration;
  check(Number.isInteger(s.cooldown)&&s.cooldown>=32&&s.cooldown>maxDuration,'stratagems.'+id+'.cooldown','军略须有独立长冷却');
  check(Array.isArray(s.roster)&&s.roster.length>0&&new Set(s.roster).size===s.roster.length&&s.roster.every(id=>exists(tables.officers,id)),'stratagems.'+id+'.roster','军略须有明确人物名单');
  check([0,1,2].includes(s.side),'stratagems.'+id+'.side','军略目标阵营无效');
  if(s.effect==='forceReserve')check(r?.shape==='reserve'&&s.side===0&&s.baseCount===2&&s.maxUses===1&&s.duration===0,'stratagems.'+id,'奇兵出场规则无效');
  if(s.effect==='tacticRefresh')check(r?.shape==='army'&&s.side===0&&numeric(s.baseStrength,.1,.5)&&s.maxUses===1&&s.duration===0,'stratagems.'+id,'战法整备规则无效');
  if(s.effect==='catastrophe')check(r?.shape==='battlefield'&&s.side===2&&s.maxUses===1&&s.duration===0&&s.strikes===8&&s.strikeRadius===2&&s.randomDamage?.min===.75&&s.randomDamage?.max===1.25&&numeric(s.baseStrength,.1,.3),'stratagems.'+id,'雷火范围与随机伤害规则无效');
  if(s.effect!=='catastrophe')check(s.side!==2&&r?.shape!=='battlefield'&&s.strikes===undefined&&s.strikeRadius===undefined&&s.randomDamage===undefined,'stratagems.'+id,'未接入雷火参数');
  if(s.effect!=='forceReserve')check(s.baseCount===undefined,'stratagems.'+id,'未接入额外出场队数');
 }
 for(const [id,t] of Object.entries(tables.traits)){
  if(t.work){const w=t.work,path='traits.'+id+'.work';check(Array.isArray(w.actions)&&w.actions.length>0&&new Set(w.actions).size===w.actions.length&&w.actions.every(k=>tables.domesticActions[k]),path,'未知或重复内政命令');for(const key of Object.keys(w))check(['actions','targets',...WORK_MODIFIERS].includes(key),path,'未接入命令修正 '+key);for(const key of WORK_MODIFIERS)if(w[key]!==undefined)check(numeric(w[key],0,key==='durationDays'?60:key==='secondaryTargets'?2:key==='setbackDays'?5:key==='cooperationMultiplier'?2:1),path,'修正参数越界 '+key);if(w.targets)check(Array.isArray(w.targets)&&w.targets.every(k=>tables.technologies.records.some(r=>r.id===k)),path,'未知研究科技');for(const key of w.actions||[]){const a=tables.domesticActions[key];if(a)check((a.direction||tables.buildings[a.value]?.direction)===t.direction&&t.kinds.includes(a.kind),path,'命令方向或种类错配');}}
  if(t.strategic){const v=t.strategic;check(STRATEGIC_TRAIT_EFFECTS.includes(v.effect),'traits.'+id+'.strategic','战略机制未接入');check(Object.keys(v).every(k=>['effect','days','count','relation','requiredTroops','bonus','capacity','speed','morale','minimum','recovery','chance','damage','actions'].includes(k)),'traits.'+id+'.strategic','战略机制字段未接入');for(const [k,n]of Object.entries(v))if(!['effect','actions'].includes(k))check(numeric(n,0,10000),'traits.'+id+'.strategic.'+k,'战略机制参数无效');if(v.effect==='treasureDiscovery')check(v.chance===TREASURE_RULES.eyeChance&&JSON.stringify(v.actions)===JSON.stringify(EYE_ACTIONS),'traits.'+id,'眼力命令和概率无效');if(v.effect==='treasureCapture')check(v.chance===TREASURE_RULES.plunderChance&&v.damage===TREASURE_RULES.plunderDamage,'traits.'+id,'夺宝概率和贡献门槛无效');if(v.effect==='farmTroops')check(numeric(v.requiredTroops,1)&&numeric(v.bonus,0,.25),'traits.'+id,'军屯参数无效');if(v.effect==='referral')check(Number.isInteger(v.count)&&v.count>=1&&v.count<=2&&numeric(v.relation,60,100),'traits.'+id,'举荐参数无效');if(v.effect==='forcedMarch')check(numeric(v.speed,1,2)&&numeric(v.minimum,1,100)&&numeric(v.morale,1,20)&&Number.isInteger(v.recovery)&&v.recovery>0&&v.recovery<=10,'traits.'+id,'急行参数无效');if(v.effect==='lightMarch')check(numeric(v.capacity,.1,1)&&numeric(v.speed,1,2),'traits.'+id,'轻装参数无效');}
  check(['普通','专属'].includes(t.tier),'traits.'+id+'.tier','独立特性只分普通、专属');
  check(!['stats','effects','chance','quantity','recruitDiscount','politicsStats'].some(k=>Object.hasOwn(t,k))&&(t.work||t.clinicIndependent===true||STRATEGIC_TRAIT_EFFECTS.includes(t.strategic?.effect)||t.mechanics?.some(m=>m.effect!=='commandRate'&&m.effect!=='armySpeed')),'traits.'+id,'独立特性须有非纯数值机制');
  if(t.aura){check(id==='formationSupport'&&Object.keys(t.aura).every(k=>['interval','range','healFraction','intent','basePower','politicsScale'].includes(k)),'traits.'+id+'.aura','未实现的光环参数');for(const key of ['interval','range','healFraction','intent','basePower','politicsScale'])check(numeric(t.aura[key],key==='interval'?1:0),'traits.'+id+'.aura.'+key,'光环参数无效');}
  if(t.politicsStats)check(Object.entries(t.politicsStats).every(([key,v])=>['defense','discipline'].includes(key)&&numeric(v)),'traits.'+id+'.politicsStats','政治特性参数无效');
  if(t.mechanics){check(Array.isArray(t.mechanics)&&t.mechanics.length>0,'traits.'+id+'.mechanics','机制不能为空');for(const m of t.mechanics||[]){
   check(TRAIT_EVENTS.includes(m.event)&&TRAIT_EFFECTS.includes(m.effect),'traits.'+id+'.mechanics','未实现的机制事件或处理器');
   check(Object.keys(m).every(k=>['event','effect','troops','roles','interval','range','health','fraction','steps','status','chance','greater','movedWithin','statuses','steady','multiplier','targets','maxUses','intent','reduction','scale','difference','differenceScale','minChance','maxChance','cap'].includes(k)),'traits.'+id+'.mechanics','未实现的机制字段');
   for(const [key,n]of Object.entries(m))if(!['event','effect','troops','roles','status','greater','statuses','difference'].includes(key))check(numeric(n),'traits.'+id+'.'+key,'机制参数须为非负数');
   for(const key of ['chance','minChance','maxChance','health','fraction','cap'])if(m[key]!==undefined)check(numeric(m[key],0,1),'traits.'+id+'.'+key,'机制比例须在0至1之间');
   for(const key of ['steps','interval','maxUses','targets','steady'])if(m[key]!==undefined)check(Number.isSafeInteger(m[key])&&m[key]>0,'traits.'+id+'.'+key,'机制步数或次数须为正整数');
   if(m.greater!==undefined)check(['force','intellect'].includes(m.greater),'traits.'+id,'机制比较属性无效');
   if(m.difference!==undefined)check(['intellect','charm'].includes(m.difference)&&numeric(m.differenceScale)&&numeric(m.minChance,0,1)&&numeric(m.maxChance,m.minChance,1),'traits.'+id,'机制概率差值参数无效');
   if(m.troops)check(Array.isArray(m.troops)&&m.troops.every(k=>exists(tables.troops,k)),'traits.'+id,'未知兵种');
   if(m.roles)check(Array.isArray(m.roles)&&m.roles.every(k=>['leader','advisor'].includes(k)),'traits.'+id,'未知任职');
   if(m.status&&STATUS_DEFINITIONS[m.status])check(t.description.includes(STATUS_DEFINITIONS[m.status].name),'traits.'+id+'.description','须使用正式状态名称 '+m.status);
   if(m.status)check(Object.hasOwn(STATUS_DEFINITIONS,m.status),'traits.'+id,'未知状态');
   if(m.statuses)check(Array.isArray(m.statuses)&&m.statuses.every(k=>Object.hasOwn(STATUS_DEFINITIONS,k)),'traits.'+id,'未知免疫状态');
  }}
  check(ENGINE_TRAIT_IDS.includes(id)||!!t.work||STRATEGIC_TRAIT_EFFECTS.includes(t.strategic?.effect)||t.domain==='command','traits.'+id,'新特技须先接入效果处理器');
 }
 for(const [id,t] of Object.entries(tables.traits))if(t.domain==='command'){
  check(['leader','advisor'].includes(t.role),'traits.'+id+'.role','无效任职');check(t.scope==='army','traits.'+id+'.scope','任职特技必须作用于军团');
  check(t.stats&&Object.keys(t.stats).length>0,'traits.'+id+'.stats','缺少效果');for(const [key,n] of Object.entries(t.stats||{}))check(['attack','defense','discipline','move','range','siege','attackSpeed','martialPower','strategyPower','supportPower'].includes(key)&&numeric(n),'traits.'+id+'.stats.'+key,'无效或负面加成');
 }
 for(const [id,u] of Object.entries(tables.officers)){
  check(u.id===id,'officers.'+id,'记录ID与键不一致');for(const key of ['leadership','force','intellect','politics','charm'])check(numeric(u[key],0,100),'officers.'+id+'.'+key,'须为0～100');
  check(exists(tables.troops,u.type),'officers.'+id+'.type','兵种不存在');for(const type of ['spear','halberd','cavalry','archer'])check(Number.isInteger(u.aptitudes?.[type])&&numeric(u.aptitudes[type],0,3),'officers.'+id+'.aptitudes.'+type,'适性须为0～3');
  const r=u.relations||{};for(const key of ['fatherId','motherId'])if(r[key])check(exists(tables.officers,r[key]),'officers.'+id+'.relations.'+key,'人物不存在');for(const key of ['spouseIds','swornSiblingIds','likedIds','dislikedIds'])ids(r[key],tables.officers,'officers.'+id+'.relations.'+key);
  check(!!tables.bondAssignments?.[id]&&Object.entries(tables.bondAssignments[id]).every(([key,n])=>tables.bonds?.[key]&&Number.isInteger(n)&&n>=1&&n<=3),'bondAssignments.'+id,'羁绊上限须为1～3且引用共享池');
  const labels=Object.keys(tables.bondAssignments?.[id]||{}).length;check(labels>=1&&labels<=(BOND_TRIPLE_OFFICERS.includes(id)?3:2),'bondAssignments.'+id,'通常一至两种，仅指定稀有武将可有三种羁绊');
  const budget=Object.values(tables.bondAssignments?.[id]||{}).reduce((n,v)=>n+v,0);check(budget>=1&&budget<=6,'bondAssignments.'+id,'个人总点数须为1～6');
  check(exists(tables.assignments,id),'assignments.'+id,'缺少武将能力分配');
 }
 for(const [id,a] of Object.entries(tables.assignments)){
  check(exists(tables.officers,id),'assignments.'+id,'武将不存在');ids(a.traits,tables.traits,'assignments.'+id+'.traits');ids(a.stratagems,tables.stratagems,'assignments.'+id+'.stratagems');
  if(a.specialTactic)check(tables.tactics[a.specialTactic]?.special,'assignments.'+id+'.specialTactic','须引用专属战法');
  const u=tables.officers[id];if(u){check(a.stratagems.length<=(id==='person-290'?2:1),'assignments.'+id+'.stratagems','超过当前军略资格或名额');}
  for(const key of a.stratagems)if(tables.stratagems[key])check(tables.stratagems[key].roster?.includes(id),'assignments.'+id+'.stratagems','不在军略指定人物名单');
 }
 for(const name of ['troopPools','intellectPools']){
  for(const type of Object.keys(tables.troops))ids(tables[name][type],tables.tactics,name+'.'+type);
  for(const type of Object.keys(tables[name]))check(exists(tables.troops,type),name+'.'+type,'兵种不存在');
 }
 for(const type of Object.keys(tables.troops)){
  const all=[...(tables.troopPools[type]||[]),...(tables.intellectPools[type]||[])];
  const small=all.filter(id=>tables.tactics[id]?.learningTier==='low'),big=all.filter(id=>tables.tactics[id]?.learningTier==='high');
  check(all.length===3&&new Set(all).size===3&&small.length===2&&big.length===1,'fixedTactics.'+type,'须固定两个小战法和一个大战法');
  check(small.filter(id=>tables.tactics[id]?.category==='force').length===1&&small.filter(id=>tables.tactics[id]?.category==='intellect').length===1,'fixedTactics.'+type,'小战法须武技、谋略各一项');
 }
 for(const name of ['cities','demoCities']){
  check(new Set(tables[name].map(c=>c.id)).size===tables[name].length,name,'重复据点ID');
  for(const c of tables[name]){check(typeof c.id==='string'&&c.id.length>0,name,'缺少据点ID');for(const key of ['x','y'])check(numeric(c[key]),name+'.'+c.id+'.'+key,'坐标无效');if(name==='cities')check(c.kind==='city'?['large','small'].includes(c.citySize):c.citySize===undefined,name+'.'+c.id+'.citySize','城池规模须为大城或小城，非城市不得设置');}
 }
 const cityIds=new Set(tables.cities.map(c=>c.id));
 const publicSources=new Set(Object.values(tables.officers).filter(u=>u.sourceKind==='common').map(u=>u.sourceId));
 const factions=new Set([...Object.keys(MAP_SOURCE.forces),...Object.keys(EXTRA_FACTION_DESIGNS)]);
 check(REFERENCE_SCENARIO.people.every(p=>publicSources.has(p.sourceId)),'nationalScenarios.reference','来源只能使用公共人物');
 check(new Set(NATIONAL_SCENARIO_DESIGNS.map(s=>s.id)).size===NATIONAL_SCENARIO_DESIGNS.length,'nationalScenarios','剧本ID重复');
 for(const spec of NATIONAL_SCENARIO_DESIGNS){
  check(['historical','fictional'].includes(spec.kind)&&Number.isInteger(spec.year)&&cityIds.has(spec.capital),'nationalScenarios.'+spec.id,'剧本年代、分类或中心城无效');
  const groups=Object.entries(spec.cityGroups||{}),sources=groups.flatMap(([,ids])=>ids);
  check(new Set(sources).size===sources.length&&sources.every(id=>tables.cities.some(c=>c.sourceId===id&&c.kind==='city')),'nationalScenarios.'+spec.id,'城池归属重复或不存在');
  check([...(spec.factions||[]),...groups.map(([f])=>f)].every(f=>factions.has(f)),'nationalScenarios.'+spec.id,'势力不存在');
  check((spec.officerPlacements||[]).every(p=>publicSources.has(p.sourceId)&&cityIds.has(p.cityId)&&factions.has(p.faction)),'nationalScenarios.'+spec.id,'人事引用无效');
 }
 check(Object.entries(ATLAS_SCENARIO_ANCHORS).every(([id,sourceId])=>cityIds.has(id)&&tables.cities.some(c=>c.sourceId===sourceId&&c.kind==='city')),'nationalScenarios.anchors','区域城池引用无效');
 for(const [port,parent] of Object.entries(MAP_SOURCE.portParents))check(cityIds.has(port)&&cityIds.has(parent),'cities.portParents','港口归属引用无效 '+port);
 errors.push(...validateStrategyDesigns(tables));
 return errors;
}
export function assertDesignTables(tables=DESIGN_TABLES){const errors=validateDesignTables(tables);if(errors.length)throw new Error('设计表校验失败：\n'+errors.join('\n'));return tables;}

