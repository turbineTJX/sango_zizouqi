import {NATIONAL_FACTIONS,nationalWorld} from './national-scenarios.mjs';
import {formationAura,AURA_INTERVAL} from './support-rules.mjs';
import {battleBuildings} from './building-rules.mjs';
import {ATTACK_ORBS} from './attack-orbs.mjs';
import {OFFICER_BY_ID,officerProfile,PROFILE_FIELDS,RELATION_LIST_FIELDS} from './officer-catalog.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {validateCustomBattle} from './custom-battle.mjs';
import {relationshipInfo,validRelationshipScores,validRelationshipTypes} from './relationships.mjs';
import {hexDistance, hexNeighbors, hexBeyond} from './hex-grid.mjs';
import { TROOPS, unitAttributes, disciplineDuration, isRear } from './unit-stats.mjs';
import {intentIncome, deniesHitIntent, hasPassive, initialPassiveState, moved, recordBasicAttack, passiveDamageMultiplier, passiveDamageTaken, supportMultiplier, SKILL_ROUTES, commonRouteName} from './passives.mjs';
import {gainExperience, experienceNeeded, PROGRESSION} from './progression.mjs';
import {initializeTacticLearning,validTacticLearning} from './tactic-learning.mjs';
import { blockedTerrain, gateTarget, canOccupy, BATTLE_TERRAINS } from './battlefield.mjs';
import {tacticTerrainEffect,fireTerrainFactor} from './terrain-rules.mjs';
import {planEnemyArmy,chooseEnemyCommand,rankEnemyReserves} from './battle-ai.mjs';
import {meleeTargetPool,interceptorsAt,canStrikeFrom,holdsLine} from './engagement.mjs';
import { SCENARIOS } from './scenario-catalog.mjs';
import { COMBAT, RULES_VERSION, CAMPAIGN_TIME } from './combat-rules.mjs';
import {snapshotTactic,tacticOutcome} from './tactic-outcomes.mjs';
import {powerFactor,powerDuration,effectChance,criticalChance,statusFraction,DURATION_POWER_STATUSES,CHANCE_EFFECT_NAMES,POWER_RULES} from './tactic-power.mjs';
import {FAMOUS_OFFICERS} from './famous-officers.mjs';
import {famousTargets, expandedSupportTargets, basicSupportTargets, areaTacticTargets, exposedTarget, tauntTarget, pursuitTarget, flankingTarget, supportApproach, repairTarget} from './tactics.mjs';
export { TROOPS, unitAttributes, disciplineDuration, isRear } from './unit-stats.mjs';
// The simulation has no DOM, network, clock, or storage dependencies.
import { TACTICS_BOOK, unitTactics, readyTactic, hasStatus, setStatus, routeTo, retreatCell, openCell, configureTactics, validLoadout, defaultTacticIds, recommendedTacticIds, NEGATIVE_STATUSES, statusPower, lureCell, absorbShield, refreshShield } from './tactics.mjs';
export { TACTICS_BOOK, unitTactics, hasStatus } from './tactics.mjs';
export const VERSION = 2;
export const GRID = { cols: 14, rows: 8 };
export const COMBO = { window:3, doubleBonus:25, tripleBonus:40 };
export { COMBAT } from './combat-rules.mjs';
export const SKILL_THRESHOLDS = { cao:100, dun:85, liao:95, chu:80, jia:100, yu:90, yuanxia:85, jin:80, shao:100, yan:85, wen:95, he:90, ju:100, tian:100, gao:85 };
export const skillThreshold = unit => Math.min(...unitTactics(unit).map(s=>s.threshold));
export const STRATAGEMS = {
  heal: { name:'三军救疗', group:'support', cost:1, duration:0, description:'救治在场各队本场伤兵，每队最多恢复兵力上限 8%；不复活溃败部队', side:0, icon:'home' },
  regenerate: { name:'休养生息', group:'support', cost:1, duration:12, description:'在场各队每步救治兵力上限 1% 的本场伤兵', side:0, field:'recoveryUntil', icon:'home' },
  range: { name:'引弦远射', group:'offense', cost:1, duration:16, description:'我军弓弩普攻及武力射击战法射程 +2 格，智力战法范围不变', side:0, field:'rangeUntil', icon:'sword' },
  firestorm: { name:'火攻连营', group:'control', cost:1, duration:12, description:'按我军在场部队的谋略威力生成总火势，均分给当前敌军持续 12 步；可净化、可用护盾吸收，不产生战意', side:1, icon:'wind' },
  assault: { name:'全军猛攻', group:'offense', cost:1, duration:18, description:'我军全体攻击 +25%', side:0, field:'assaultUntil', icon:'sword' },
  fortify: { name:'坚壁之策', group:'support', cost:1, duration:18, description:'我军全体防御、军纪 +20%；持续期间后续入场者同样受益', side:0, field:'fortifyUntil', icon:'home' },
  inspire: { name:'鼓舞三军', group:'support', cost:1, duration:0, description:'我军全体战意 +35', side:0, icon:'crown' },
  disrupt: { name:'虚实之策', group:'control', cost:1, duration:16, description:'敌军全体攻击、防御、军纪 −15%；持续期间后续入场者同样受益', side:1, field:'disruptUntil', icon:'wind' },
  demoralize: { name:'攻心夺气', group:'control', cost:1, duration:0, description:'敌军全体战意 −45（最低为 0），不打断施法', side:1, icon:'wind' },
  cleanse: { name:'镇静全军', group:'support', cost:1, duration:0, description:'清除我军控制、灼烧与减益，并获得 3 步控制保护', side:0, icon:'flag' },
  haste: { name:'疾行赴援', group:'offense', cost:1, duration:10, description:'我军移动力 +1，预备队入场时同样受益', side:0, field:'hasteUntil', icon:'wind' },
  cycle: { name:'连环之策', group:'offense', cost:1, duration:0, description:'我军全体战意 +15，正在冷却的战法缩短 4 步；包括预备队，仍须满足个人战意门槛', side:0, icon:'sword' },
  blockade: { name:'断敌援路', group:'control', cost:1, duration:10, description:'延迟敌方预备队补入战场 10 步，不移除敌军', side:1, field:'blockadeUntil', icon:'flag' },
  relief: { name:'后军固阵', group:'support', cost:1, duration:16, description:'预备队入场获 15% 护盾；期间主动轮换门槛放宽到 85%', side:0, field:'reliefUntil', icon:'home' },
};
// Each officer contributes only while appointed leader or advisor.
export const OFFICER_STRATAGEMS = {
  cao:['assault','inspire','fortify'], dun:['assault','haste'], liao:['haste','cycle','range'],
  chu:['fortify','relief'], jia:['demoralize','blockade','firestorm'], yu:['heal','range','cleanse'],
  yuanxia:['haste','range'], jin:['fortify','relief','regenerate'], shao:['inspire','assault'],
  yan:['assault','haste'], wen:['assault','disrupt'], he:['cycle','relief','range'],
  ju:['fortify','regenerate','blockade'], tian:['disrupt','demoralize','firestorm'], gao:['fortify','cleanse'],
  'person-246':['firestorm','cycle','inspire'], // 周瑜
  'person-603':['firestorm','disrupt','fortify'], // 陆逊
  'person-610':['fortify','heal'], // 李典
  'person-368':['inspire','fortify','assault'], // 孙权
  'person-636':['inspire','heal','fortify'], // 刘备
  'person-662':['disrupt','cleanse','cycle'], // 吕蒙
  'person-167':['fortify','cleanse'], // 黄权
  'person-661':['assault','haste'], // 吕布
  'person-447':['disrupt','cleanse','cycle'], // 陈宫
  'person-290':['fortify','cleanse','cycle'], // 诸葛亮
  'person-226':['disrupt','blockade','cycle'], // 司马懿
  'person-668':['heal','inspire','relief'], // 鲁肃
  'person-443':['regenerate','heal','inspire'], // 张鲁
};
export const COMMAND_RESOURCE = { capacity:12000 };
export const officerStratagems = id => OFFICER_STRATAGEMS[id] || [];
// Automatic appointment must consider commands that the leader cannot supply.
// Explicit appointments in campaigns and player-managed armies stay untouched.
export function chooseArmyAdvisor(army) {
  const known=new Set(officerStratagems(army.leader));
  const added=u=>officerStratagems(u.id).filter(key=>!known.has(key)).length;
  return [...army.units].filter(u=>u.troops>0).sort((a,b)=>added(b)-added(a)||b.intellect-a.intellect||a.id.localeCompare(b.id))[0]?.id;
}
export function armyCommanders(army) {
  return ['leader','advisor'].flatMap(role=>{const u=army.units.find(u=>u.id===army[role]);return u?[{id:u.id,name:u.name,role,armyId:army.id}]:[];});
}
export const armyStratagems = army => [...new Set(armyCommanders(army).flatMap(c=>officerStratagems(c.id)))];
export const battleStratagems = (b,side=0) => [...new Set((b.sides[side].commanders||[]).flatMap(c=>officerStratagems(c.id)))];
export const commandIntellect = (b,side=0) => b.sides[side].retreat ? 0 : activeUnits(b,side).reduce((n,u)=>n+u.intellect,0);
export function attackRange(b,u) {return unitAttributes(u,b).range;}
export function battleWounded(u) {return Math.max(0,Math.floor(((u.battleDamage??u.initial-u.hp)-(u.battleDeserted||0))*.35)-(u.healed||0));}
function takeCasualties(u,damage) {
  u.battleDamage ??= u.initial-u.hp;u.healed ??=0;
  damage=Math.min(u.hp,damage);u.hp-=damage;u.battleDamage+=damage;return damage;
}
function healWounded(b,u,fraction,ongoing=false) {
  if(u.status!=='active'||u.hp<=0)return 0;
  const amount=Math.min(battleWounded(u),Math.floor(u.maxHp*fraction*(hasStatus(b,u,'blight')?1-statusFraction(u,'blight',.5):1)),u.maxHp-u.hp);
  if(amount<=0)return 0;
  u.healed=(u.healed||0)+amount;u.hp+=amount;
  combatEffect(b,u,u,true,0,'impact',{name:'救治伤兵',visual:'banner'},{text:'救治 +'+amount,healing:amount,ongoing});return amount;
}
export const isDeploying = b => !!b && !b.deploymentLocked && b.tick === 0 && !b.result;
function gainIntent(unit, amount) { unit.intent = Math.min(COMBAT.intentCap, (unit.intent || 0) + amount); }
export function lowerIntent(unit, amount, source=null) {
  const before=unit.intent||0;
  const adjusted=Math.round(Math.max(0,amount)*(source&&hasPassive(source,'suppress')?1.2:1)*(hasPassive(unit,'calm')?.8:1));
  unit.intent=Math.max(0,before-adjusted);return before-unit.intent;
}
export function skillVisual(unit) {
  if (['jia', 'yu', 'tian'].includes(unit.id)) return 'fire';
  if (['cao', 'shao', 'jin', 'ju'].includes(unit.id)) return 'banner';
  if (['chu', 'dun'].includes(unit.id)) return 'shockwave';
  return unit.type === 'cavalry' ? 'charge' : unit.type === 'archer' ? 'volley' : 'slash';
}
export const TACTICS = { balanced: '稳健', aggressive: '激进', defensive: '防守' };
export const FACTIONS = {
  ...NATIONAL_FACTIONS,
  cao: { ...NATIONAL_FACTIONS.cao, name: '曹操', short: '曹', color: '#79b3a1' },
  yuan: { ...NATIONAL_FACTIONS.yuan, name: '袁绍', short: '袁', color: '#c17d71' },
  neutral: { name: '地方势力', short: '守', color: '#b29c77' },
};
const OFFICERS = [
  ['cao', '曹操', '孟德', 96, 82, 91, '魏武之强', 'spear', 'front', '雄才大略'],
  ['dun', '夏侯惇', '元让', 88, 92, 62, '拔矢啖睛', 'spear', 'front', '刚烈奋勇'],
  ['liao', '张辽', '文远', 93, 94, 80, '威震逍遥', 'cavalry', 'front', '勇略过人'],
  ['chu', '许褚', '仲康', 80, 98, 40, '虎痴怒击', 'spear', 'middle', '悍勇护主'],
  ['jia', '郭嘉', '奉孝', 79, 42, 98, '奇谋破阵', 'crossbow', 'back', '料敌先机'],
  ['yu', '荀攸', '公达', 83, 45, 96, '声东击西', 'crossbow', 'back', '谋定后动'],
  ['yuanxia', '夏侯渊', '妙才', 88, 91, 70, '疾风奔袭', 'archer', 'back', '神速奔袭'],
  ['jin', '于禁', '文则', 90, 78, 75, '坚壁清野', 'spear', 'middle', '治军严整'],
  ['shao', '袁绍', '本初', 86, 72, 78, '名门号令', 'spear', 'front', '名门雄主'],
  ['yan', '颜良', '公骥', 84, 96, 43, '河北雄锋', 'cavalry', 'front', '勇冠三军'],
  ['wen', '文丑', '子恒', 82, 95, 42, '破阵长驱', 'cavalry', 'front', '锐不可当'],
  ['he', '张郃', '儁乂', 91, 90, 77, '巧变奇袭', 'spear', 'middle', '善识地势'],
  ['ju', '沮授', '公与', 84, 38, 93, '料敌布防', 'crossbow', 'back', '筹略深远'],
  ['tian', '田丰', '元皓', 80, 35, 94, '审势定谋', 'archer', 'back', '刚直多谋'],
  ['gao', '高览', '敬志', 82, 87, 65, '奋武突击', 'spear', 'front', '沉毅善战'],
];
export function makeOfficer(id, troops = 3000, index = 0, level = 1, learningSeed = 521200) {
  const source=OFFICER_BY_ID[id];
  if(!Object.hasOwn(OFFICER_BY_ID,id))throw new Error('未知武将');
  const legacy=OFFICERS.find(row=>row[0]===id);
  const unit={...officerProfile(id),id,name:source.name,courtesy:source.courtesy,leadership:source.leadership,force:source.force,intellect:source.intellect,politics:source.politics,
    skill:legacy?.[6]||FAMOUS_OFFICERS[id]?.tactic?.name||'',type:source.type,formation:legacy?.[8]||source.formation,trait:legacy?.[9]||FAMOUS_OFFICERS[id]?.role||commonRouteName({id}),
    troops,wounded:0,first:index<6,loyalty:100,level,experience:0};
  if(!Number.isInteger(level)||level<1||level>10)throw new Error('武将等级须为 1～10');
  if(!Number.isSafeInteger(troops)||troops<0||troops>troopCapacity(unit))throw new Error(`${unit.name}带兵须为 0～${troopCapacity(unit)} 人`);
  initializeTacticLearning(unit,learningSeed);
  return unit;
}
export function newGame(seed = 521200) {
  const cities = [
    ['ye', '邺城', 660, 118, 'yuan', 6600, '河北重镇', '冀州'],
    ['jinyang', '晋阳', 365, 98, 'yuan', 3800, '北地雄关', '并州'],
    ['baima', '白马', 774, 259, 'yuan', 4000, '黄河渡口', '兖州'],
    ['guandu', '官渡', 570, 340, 'yuan', 1800, '兵家必争', '兖州'],
    ['luoyang', '洛阳', 243, 330, 'neutral', 3600, '故都遗址', '司隶'],
    ['chenliu', '陈留', 825, 456, 'cao', 4200, '中原粮仓', '兖州'],
    ['xuchang', '许昌', 506, 545, 'cao', 6000, '天子所在', '豫州'],
    ['runan', '汝南', 742, 693, 'neutral', 3300, '汝水之南', '豫州'],
    ['wan', '宛城', 275, 687, 'neutral', 4200, '南阳门户', '荆州'],
  ].map(([id, name, x, y, owner, garrison, subtitle, province]) => ({ id, name, x, y, owner, garrison, subtitle, province }));
  const state = {
    version: VERSION, rulesVersion:RULES_VERSION, officerDataVersion:3, relationshipScores:{}, relationshipTypes:{}, seed, turn: 1, gold: 3200, grain: 12800, fame: 120,
    cities, roads: [['ye', 'jinyang'], ['ye', 'baima'], ['ye', 'guandu'], ['jinyang', 'luoyang'], ['luoyang', 'guandu'], ['luoyang', 'xuchang'], ['guandu', 'baima'], ['guandu', 'xuchang'], ['baima', 'chenliu'], ['guandu', 'chenliu'], ['chenliu', 'xuchang'], ['chenliu', 'runan'], ['xuchang', 'runan'], ['xuchang', 'wan'], ['luoyang', 'wan'], ['wan', 'runan']],
    armies: [
      { id: 'a1', name: '虎贲军', faction: 'cao', location: 'xuchang', route: [], target: null, supply: 900, morale: 80, tactic: 'balanced', leader: 'cao', advisor: 'jia', deputy: 'dun', units: OFFICERS.slice(0, 8).map((r, i) => makeOfficer(r[0], 3000, i)), task: '驻守' },
      { id: 'a2', name: '河北军', faction: 'yuan', location: 'guandu', route: [], target: null, supply: 900, morale: 75, tactic: 'aggressive', leader: 'shao', advisor: 'ju', deputy: 'yan', units: OFFICERS.slice(8).map((r, i) => makeOfficer(r[0], 2500, i)), task: '驻守' },
    ],
    logs: [], battle: null, report: null, pending: null, nextId: 3, victories: 0, finished: null,
  };
  for(const u of state.armies.flatMap(a=>a.units))initializeTacticLearning(u,seed);
  log(state, '建安五年，袁曹相争。立足许昌，调兵北上，逐鹿中原。', 'event');
  return state;
}
export function log(state, text, type = 'info') { state.logs.unshift({ turn: state.turn, text, type }); state.logs = state.logs.slice(0, 60); }
export const armyTroops = army => army.units.reduce((n, u) => n + u.troops, 0);
export const cityById = (s, id) => s.cities.find(c => c.id === id);
export const armyById = (s, id) => s.armies.find(a => a.id === id);
export function findRoute(state, start, end) {
  const queue = [[start]], seen = new Set([start]);
  while (queue.length) {
    const path = queue.shift(), last = path.at(-1);
    if (last === end) return path.slice(1);
    for (const [a, b] of state.roads) {
      const next = a === last ? b : b === last ? a : null;
      if (next && !seen.has(next)) { seen.add(next); queue.push([...path, next]); }
    }
  }
  return null;
}
export function orderArmy(state, armyId, target) {
  if (state.battle || state.pending || state.finished) return '当前无法调动军团';
  const army = armyById(state, armyId), city = cityById(state, target);
  if (!army || army.faction !== 'cao' || !city) return '请选择己方军团与目的地';
  if (!armyTroops(army)) return '军团兵力不足，请先补充兵员';
  if (army.location === target) { army.route = []; army.target = null; army.task = '驻守'; return null; }
  const route = findRoute(state, army.location, target);
  if (!route) return '道路不通';
  army.route = route; army.target = target; army.task = city.owner === army.faction ? '移动' : '出征';
  log(state, `${army.name}奉命${army.task}${city.name}，预计 ${route.length} 旬抵达。`, 'order');
  return null;
}
export function recruit(state, armyId) {
  if (state.battle || state.pending) return '交战期间无法补充兵员';
  const army = armyById(state, armyId);
  if (!army || army.faction !== 'cao' || cityById(state, army.location).owner !== 'cao') return '须在己方城池补充兵员';
  const need = army.units.reduce((n, u) => n + Math.max(0, troopCapacity(u) - u.troops - u.wounded), 0);
  const amount = Math.min(need, 4000, Math.floor(state.gold / .25), state.grain);
  if (amount <= 0) return need ? '府库或粮草不足' : '兵员已足，伤兵将逐旬恢复';
  let remaining = amount;
  for (const u of [...army.units].sort((a, b) => a.troops - b.troops)) {
    const add = Math.min(remaining, Math.max(0, troopCapacity(u) - u.troops - u.wounded));
    u.troops += add; remaining -= add;
  }
  state.gold -= Math.ceil(amount * .25); state.grain -= amount;
  army.supply = Math.min(900, army.supply + 150);
  log(state, `${army.name}补充兵员 ${amount} 人。`, 'good');
  return null;
}
export function splitArmy(state, armyId, ids) {
  const army = armyById(state, armyId);
  if (state.battle || state.pending || !army || army.faction !== 'cao' || army.route.length || cityById(state, army.location).owner !== 'cao') return '只能在己方城池拆分驻守军团';
  const chosen = army.units.filter(u => ids.includes(u.id));
  if (!chosen.length || chosen.length === army.units.length || !chosen.some(u => u.troops > 0) || !army.units.some(u => !ids.includes(u.id) && u.troops > 0)) return '两支军团均需保留有兵力的武将';
  const supply = Math.floor(army.supply * chosen.length / army.units.length);
  army.units = army.units.filter(u => !ids.includes(u.id)); army.supply -= supply;
  const id = `a${state.nextId++}`;
  const created = { ...army, id, name: `${chosen[0].name}军`, units: chosen, route: [], target: null, leader: chosen[0].id, advisor: chosen.at(-1).id, deputy: chosen[1]?.id || null, supply };
  normalizeRoles(army); normalizeRoles(created);
  state.armies.push(created); log(state, `分兵立营，${created.name}于${cityById(state, army.location).name}组建。`, 'order');
  return null;
}
function normalizeRoles(army) {
  if (!army.units.some(u => u.id === army.leader)) army.leader = army.units[0]?.id;
  if (!army.units.some(u => u.id === army.advisor)) army.advisor = [...army.units].sort((a, b) => b.intellect - a.intellect)[0]?.id;
  if (!army.units.some(u => u.id === army.deputy)) army.deputy = army.units.find(u => u.id !== army.leader)?.id || null;
  if (!army.units.some(u => u.first)) army.units.slice(0, 6).forEach(u => { u.first = true; });
}
export function mergeArmies(state, intoId, fromId) {
  const a = armyById(state, intoId), b = armyById(state, fromId);
  if (state.battle || state.pending || !a || !b || a === b || a.faction !== 'cao' || b.faction !== a.faction || a.location !== b.location || a.route.length || b.route.length) return '须选择同城驻守的两支己方军团';
  b.units.forEach(u => { u.first = false; }); a.units.push(...b.units); a.supply += b.supply;
  state.armies = state.armies.filter(x => x !== b); log(state, `${b.name}并入${a.name}。`, 'order'); return null;
}
function scheduleEncounter(state, attacker, city, defenders, origin) {
  state.pending = { attackerId: attacker.id, defenderIds: defenders.map(a => a.id), cityId: city.id, origin, defenderFaction: defenders[0]?.faction || city.owner };
  attacker.route = []; attacker.target = null; attacker.task = '交战';
  defenders.forEach(a => { a.route = []; a.target = null; a.task = '交战'; });
  log(state, `${attacker.name}抵达${city.name}，战事一触即发。`, 'war');
}
export function advanceTurn(state) {
  if (state.battle || state.pending || state.report || state.finished) return '请先处理当前战事';
  state.turn++;
  const owned = state.cities.filter(c => c.owner === 'cao').length;
  state.gold += owned * 160; state.grain += owned * 600;
  for (const army of state.armies) {
    const friendly = cityById(state, army.location).owner === army.faction;
    const consumption = Math.max(3, Math.ceil(armyTroops(army) / 1800));
    if (friendly && army.faction === 'cao') {
      const refill = Math.min(120, state.grain, Math.max(0, 900 - army.supply));
      army.supply += refill; state.grain -= refill;
    }
    army.supply = Math.max(0, army.supply - consumption);
    if (!army.supply) { army.morale = Math.max(20, army.morale - 12); log(state, `${army.name}粮草告罄，士气受损。`, 'war'); }
    else army.morale = Math.min(100, army.morale + 2);
    if (friendly) for (const u of army.units) { const healed = Math.min(u.wounded, 180); u.wounded -= healed; u.troops += healed; }
  }
  // The enemy launches a predictable offensive after a short preparation period.
  for (const enemy of state.armies.filter(a => a.faction === 'yuan' && armyTroops(a) > 3000)) {
    if (!enemy.route.length && state.turn >= 5 && state.turn % 4 === 1) {
      const target = state.cities.filter(c => c.owner === 'cao').sort((a, b) => findRoute(state, enemy.location, a.id).length - findRoute(state, enemy.location, b.id).length || Number(b.id === 'xuchang') - Number(a.id === 'xuchang'))[0];
      if (target) { enemy.route = findRoute(state, enemy.location, target.id); enemy.target = target.id; enemy.task = '出征'; log(state, `斥候来报：${enemy.name}向${target.name}进军。`, 'war'); }
    }
  }
  // Sequential road resolution prevents armies from passing through one another.
  for (const army of [...state.armies].sort((a, b) => Number(b.faction === 'cao') - Number(a.faction === 'cao'))) {
    if (!army.route.length || !armyTroops(army)) continue;
    const origin = army.location, destination = army.route.shift(), city = cityById(state, destination);
    const defenders = state.armies.filter(a => a.id !== army.id && a.location === destination && a.faction !== army.faction && armyTroops(a) > 0);
    army.location = destination;
    if (defenders.length || (city.owner !== army.faction && city.garrison > 0)) { scheduleEncounter(state, army, city, defenders, origin); return null; }
    if (city.owner !== army.faction) { city.owner = army.faction; log(state, `${army.name}接管${city.name}。`, 'good'); }
    log(state, `${army.name}抵达${city.name}${army.route.length ? '，继续行军' : '，就地驻守'}。`);
    if (!army.route.length) { army.task = '驻守'; army.target = null; }
  }
  checkCampaign(state); return null;
}
function garrisonUnits(city) {
  const count = Math.min(6, Math.max(1, Math.ceil(city.garrison / 2400)));
  const types = ['spear', 'archer', 'spear', 'cavalry', 'archer', 'spear'];
  return Array.from({ length: count }, (_, i) => ({ id: `g-${city.id}-${i}`, name: `${city.name}${['守将', '校尉', '都尉', '偏将', '参军', '牙将'][i]}`, courtesy: '守军', leadership: 72, force: 70, intellect: 65, politics:65, skill: '据险固守', trait: '守土有责', type: types[i], formation: types[i] === 'archer' ? 'back' : 'front', troops: Math.floor(city.garrison / count) + (i === 0 ? city.garrison % count : 0), wounded: 0, first: true }));
}
export function combatUnit(u, armyId, side, morale) {
  return { ...u, ...officerProfile(u.id), level:u.level??1,experience:u.experience??0,skillRouteType:u.skillRouteType||u.type,passiveState:initialPassiveState(),participated:false,attackCarry:0,armyId, side, hp: u.troops, maxHp: u.troops, initial: u.troops, battleDamage:0, healed:0, moveProgress:0, status: 'reserve', x: -1, y: -1, morale, cooldown: 0, intent:0, cast: null, skillReady:{}, tacticCasts:{}, statuses:{}, skillCasts: 0, action: '候命', effect: null };
}
export function configureUnitTactics(state,unitId,ids) {
  if(state.battle&&!isDeploying(state.battle))return '开战后战法锁定，暂停也不能更换';
  const source=state.armies.filter(a=>a.faction==='cao').flatMap(a=>a.units).find(u=>u.id===unitId);
  const live=state.battle?.sides[0].units.find(u=>u.id===unitId);
  if(!source&&!live)return '找不到己方部队';
  if(!validLoadout(live||source,ids))return '自动携带当前兵种全部已学战法与已学专属，只能调整顺序';
  if(source)configureTactics(source,ids);
  if(live) {configureTactics(live,ids);live.skillReady={};live.tacticCasts={};live.cast=null;}
  return null;
}
export function startBattle(state,{deferEnemyDeployment=false}={}) {
  if (!state.pending || state.battle) return '没有待处理的战斗';
  const p = state.pending, attacker = armyById(state, p.attackerId), city = cityById(state, p.cityId);
  const defenders = p.defenderIds.map(id => armyById(state, id)).filter(Boolean);
  const supporters = state.armies.filter(a => a.id !== attacker.id && a.faction === attacker.faction && a.location === city.id);
  const attacking = [attacker, ...supporters];
  const friendlyAttack = attacker.faction === 'cao';
  const own = friendlyAttack ? attacking : defenders, enemy = friendlyAttack ? defenders : attacking;
  const makeSide = (armies, index, faction) => ({ faction, commanders:armies.flatMap(armyCommanders), rangeUntil:0, recoveryUntil:0, tactic: armies[0]?.tactic || 'defensive', retreat: false, focus: null, focusUntil: 0, inspireUntil: 0, assaultUntil:0, fortifyUntil:0, disruptUntil:0, hasteUntil:0, blockadeUntil:0, reliefUntil:0, units: armies.flatMap(a => {
    const leader = a.units.find(u => u.id === a.leader), advisor = a.units.find(u => u.id === a.advisor), deputy = a.units.find(u => u.id === a.deputy);
    return [...a.units].sort((a, b) => Number(b.first) - Number(a.first)).filter(u => u.troops > 0).map(u => ({ ...combatUnit(u, a.id, index, a.morale), commandBonus: (leader?.leadership || 60) / 1000, deputyBonus: (deputy?.force || 0) / 2000, advisorBonus: (advisor?.intellect || 0) / 1000 }));
  }) });
  const sides = [makeSide(own, 0, 'cao'), makeSide(enemy, 1, friendlyAttack ? p.defenderFaction : attacker.faction)];
  if (city.garrison > 0 && city.owner !== attacker.faction) {
    const index = city.owner === 'cao' ? 0 : 1;
    sides[index].units.push(...garrisonUnits(city).map(u => combatUnit(initializeTacticLearning({...u,level:1,experience:0},state.seed), `city:${city.id}`, index, 70)));
  }
  state.battle = { id: `battle-${state.turn}-${state.nextId++}`, cityId: city.id, context: { ...p, attackingIds: attacking.map(a => a.id) }, tick: 0, seed: state.seed + state.turn, sides, gridType:'hex', terrain:sides.some(s=>s.units.some(u=>u.type==='ship'))?'river':'land', relationshipScores:structuredClone(state.relationshipScores||{}), relationshipTypes:structuredClone(state.relationshipTypes||{}), comboWindows:[], comboCounts:[0,0], commandProgress:0, commandCooldown: 0, commandReady:{}, commandSerial:0, lastCommand:null, enemyCommand:{commandProgress:0,commandReady:{},commandSerial:0,lastCommand:null}, deploymentLocked:false, logs: [], effects: [], buildings: [], result: null, settled: false };
  fillSlots(state.battle, 0);
  if(!deferEnemyDeployment){fillSlots(state.battle, 1);planEnemyArmy(state.battle);}
  battleLog(state.battle,'敌军携带已学战法，依据兵力、分工和战况择序出阵并布阵；开战后独立积累军略。');
  battleLog(state.battle, `${city.name}之战，诸军待命。请先布置首发部队位置。`);
  state.pending = null; return null;
}
export const activeUnits = (b, side) => b.sides[side].units.filter(u => u.status === 'active' && u.hp > 0);
export function deployUnit(b, unitId, x, y) {
  if (!isDeploying(b)) return '开战后位置锁定，暂停也不能移动部队';
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 4 || y < 0 || y >= GRID.rows) return '请放在左侧绿色布阵区';
  if (blockedTerrain(b,x,y)) return '城门所在格不能布置部队';
  const unit = activeUnits(b,0).find(u=>u.id === unitId);
  if (!unit) return '请选择我军在场部队';
  if(!canOccupy(b,unit,x,y))return '舰船只能布置在水道，陆军只能布置在陆地或桥面';
  const occupied = b.sides.flatMap(s=>s.units).find(u=>u.status === 'active' && u.x === x && u.y === y && u !== unit);
  if (occupied?.side === 1) return '不能与敌军重叠';
  if(occupied&&!canOccupy(b,occupied,unit.x,unit.y))return '交换后的部队不符合水陆限制';
  if (occupied) { occupied.x = unit.x; occupied.y = unit.y; }
  unit.x = x; unit.y = y; return null;
}
export function resetDeployment(b) {
  if (!isDeploying(b)) return '只能在开战前调整阵型';
  const own = activeUnits(b,0);
  own.forEach(u=>{u.status = 'reserve';u.x=-1;u.y=-1;});
  own.forEach(u=>spawn(b,u)); return null;
}
export function configureBattleTerrain(b,terrain) {
  if(!b||!isDeploying(b))return '只能在开战前选择地形';
  if(!Object.hasOwn(BATTLE_TERRAINS,terrain))return '未知战场地形';
  if(terrain!=='river'&&b.sides.some(s=>s.units.some(u=>u.type==='ship')))return '有舰船参战时必须保留河流战场';
  if(b.terrain===terrain)return null;
  b.terrain=terrain;
  // Reset both armies so changing water lanes cannot strand either side.
  const units=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
  for(const u of units){u.status='reserve';u.x=-1;u.y=-1;u.moveProgress=0;}
  for(const u of units)spawn(b,u);
  planEnemyArmy(b);
  battleLog(b,`战场地形：${BATTLE_TERRAINS[terrain]}，双方重新列阵。`);
  return null;
}
export const BATTLE_INTENTS = { annihilate:'歼灭', hold:'固守', siege:'攻城' };
export function battleIntent(b, side=0) {
  return b.sides[side].battleIntent || (b.siege ? (b.siege.attackerSide===side?'siege':'hold') : b.sides[side].tactic==='defensive'?'hold':'annihilate');
}
export function configureBattleIntent(b, intent, side=0) {
  if(!isDeploying(b))return '战斗意图已锁定，开战后不可更改';
  if(![0,1].includes(side)||!Object.hasOwn(BATTLE_INTENTS,intent))return '无效战斗意图';
  if(intent==='siege'&&(!b.siege||b.siege.attackerSide!==side))return '只有攻城方可以选择攻城';
  b.sides[side].battleIntent=intent;
  return null;
}
export function lockDeployment(b) {
  if (!isDeploying(b)) return '当前不在布阵阶段';
  for(const side of [0,1])b.sides[side].battleIntent=battleIntent(b,side);
  b.deploymentLocked = true;
  if(b.domesticOpening&&!b.domesticOpening.applied){const p=b.domesticOpening;for(const u of activeUnits(b,p.side)){u.intent=Math.min(COMBAT.intentCap,u.intent+Math.floor(p.intent));setStatus(b,u,'shield',b.maxTicks+1,{amount:Math.round(u.initial*p.shield),source:'siege:opening',label:'守城首发护盾'});}p.applied=true;}
  battleLog(b,'军阵已定，两军交锋。攻击与受击开始积累战意。'); return null;
}
const remainingUnits = (b, side) => b.sides[side].units.filter(u => ['active', 'reserve'].includes(u.status) && u.hp > 0);
const distance = hexDistance;
function battleLog(b, text) { b.logs.unshift({ tick: b.tick, text }); b.logs = b.logs.slice(0, 70); }
function random(b) { b.seed = (Math.imul(b.seed, 1664525) + 1013904223) >>> 0; return b.seed / 4294967296; }
function spawn(b, unit) {
  const x = unit.side === 0 ? ({ front: 3, middle: 2, back: 1, left: 3, right: 3 }[unit.formation]) : ({ front: 10, middle: 11, back: 12, left: 10, right: 10 }[unit.formation]);
  const preferredY = unit.formation === 'left' ? 0 : unit.formation === 'right' ? 7 : 3.5;
  const cells = [];
  for (let y = 0; y < GRID.rows; y++) for (let col = 0; col < GRID.cols; col++) cells.push({ x: col, y });
  const occupied = b.sides.flatMap(s => s.units).filter(u => u.status === 'active');
  const open = cells.filter(c => canOccupy(b,unit,c.x,c.y) && !occupied.some(u => u.x === c.x && u.y === c.y)).sort((a, c) => Math.abs(a.x - x) * 5 + Math.abs(a.y - preferredY) - Math.abs(c.x - x) * 5 - Math.abs(c.y - preferredY));
  if (!open.length) return false;
  unit.x = open[0].x; unit.y = open[0].y; unit.status = 'active'; unit.action = '列阵';
  unit.passiveState ||= initialPassiveState(b.tick);unit.passiveState.lastMoveTick=b.tick;
  if(b.tick>0&&!unit.passiveState.reserveEntered){
    unit.passiveState.reserveEntered=true;
    if(hasPassive(unit,'prepared')){gainIntent(unit,25);battleLog(b,`${unit.name}「备战」：入场战意 +25。`);}
    if(hasPassive(unit,'adapt')){unit.passiveState.entryUntil=b.tick+15;battleLog(b,`${unit.name}「巧变」：接战增益持续 15 步。`);}
  }
  return true;
}
export function fillSlots(b, side) {
  if (b.sides[side].retreat) return;
  if((b.sides[side].blockadeUntil||0)>b.tick)return;
  if(activeUnits(b,side).length>=6)return;
  const waiting=b.sides[side].units.filter(u=>u.status==='reserve'&&u.hp>0&&(u.arrivalTick||0)<=b.tick);
  while(waiting.length&&activeUnits(b,side).length<6){
    const unit=side===1?rankEnemyReserves(b,waiting)[0]:waiting[0];
    waiting.splice(waiting.indexOf(unit),1);
    if(!spawn(b, unit))continue;
    if((b.sides[side].reliefUntil||0)>b.tick)setStatus(b,unit,'shield',8,{amount:Math.round(unit.maxHp*.15),source:'army:relief',label:'后军固阵'});
    if (b.tick) battleLog(b, `${unit.name}率${TROOPS[unit.type].name}补入战线。`);
  }
}
export function issueCommand(b, command, targetId = null, side = 0) {
  if (!b || b.result) return '战斗已经结束';
  if(![0,1].includes(side))return '无效军团';
  if(command==='focus'||command==='reserve')return '基础军令仅保留全军撤退';
  const resource=side===0?b:b.enemyCommand,other=1-side;
  if (isDeploying(b)) return '请先确认布阵，开战后可暂停下达军略';
  if (b.sides[side].retreat) return '全军正在撤退';
  const costs = { ...Object.fromEntries(Object.entries(STRATAGEMS).map(([key,s])=>[key,s.cost])), focus: 1, reserve: 1, retreat: 0 };
  if (!Object.hasOwn(costs,command)) return '未知军令';
  if(STRATAGEMS[command]&&!battleStratagems(b,side).includes(command))return '主将与军师未掌握此军略';
  resource.commandReady ||= {};
  if ((resource.commandReady[command] || 0) > b.tick && command !== 'retreat') return '此项军略尚未冷却';
  if(command!=='retreat'&&resource.commandProgress<COMMAND_RESOURCE.capacity)return '军略尚未蓄满';
  if(command==='blockade'&&!b.sides[other].units.some(u=>u.status==='reserve'&&u.hp>0))return '敌军没有待命预备队';
  if(command==='relief'&&!b.sides[side].units.some(u=>u.status==='reserve'&&u.hp>0))return '我军没有待命预备队';
  if(command==='heal'&&!activeUnits(b,side).some(u=>battleWounded(u)>0))return '在场部队暂无可救治的本场伤兵';
  if(command==='firestorm'&&(!activeUnits(b,side).length||!activeUnits(b,other).length))return '当前没有合法的火攻目标';
  if (STRATAGEMS[command]) {
    const strategy = STRATAGEMS[command];
    if(command==='heal') {for(const u of activeUnits(b,side))healWounded(b,u,.08);}
    else if(command==='firestorm') {
      const allies=activeUnits(b,side),targets=activeUnits(b,other),source=allies[0];
      const totalPower=allies.reduce((sum,u)=>sum+unitAttributes(u,b).strategyPower,0);
      const amount=Math.max(0,Math.floor(totalPower*(18/280)/targets.length));
      for(const u of targets)setStatus(b,u,'scorch',12,{sourceId:source.id,sourceName:'军团军略',sourceSkillName:strategy.name,amount});
    }
    else if (strategy.field) b.sides[strategy.side===0?side:other][strategy.field] = b.tick + strategy.duration + 1;
    else for (const u of remainingUnits(b,strategy.side===0?side:other)) {
      if (command === 'demoralize') lowerIntent(u,45);
      else if(command==='cleanse') {for(const key of NEGATIVE_STATUSES)delete u.statuses[key];setStatus(b,u,'resolve',3,{sourceName:'军团军略',sourceSkillName:strategy.name});}
      else if(command==='cycle') {gainIntent(u,15);for(const id of Object.keys(u.skillReady))u.skillReady[id]=Math.max(b.tick,u.skillReady[id]-4);}
      else gainIntent(u,35);
    }
    const description=side?strategy.description.replaceAll('我军','敌方部队').replaceAll('敌军','我方部队'):strategy.description;
    battleLog(b,`${side?'敌军':'我军'}军略 · ${strategy.name}：${description}${strategy.duration ? `，持续 ${strategy.duration} 步` : command==='heal'?'（仅在场部队）':'（含预备队）'}。`);
  }
  if (command === 'retreat') {
    b.sides[side].retreat = true;
    b.sides[side].units.forEach(u => { u.cast = null; });
    b.sides[side].units.filter(u => u.status === 'reserve').forEach(u => { u.status = 'withdrawn'; });
    battleLog(b, (side?'敌军':'我军')+'军令 · 全军撤退：各部向己方边缘撤离，撤离途中仍会受到攻击。');
  }
  if(command!=='retreat')resource.commandProgress=0; resource.commandCooldown = 0; resource.commandReady[command] = b.tick + (STRATAGEMS[command] ? 8 : 3);
  resource.commandSerial = (resource.commandSerial || 0) + 1;
  resource.lastCommand = { key:command, tick:b.tick, serial:resource.commandSerial };
  return null;
}
function pickTarget(b, unit, inRangeOnly = false, reachableOnly = false) {
  const side = b.sides[unit.side];
  const enemies=[...activeUnits(b,1-unit.side),gateTarget(b,unit)].filter(Boolean)
    .filter(target=>!reachableOnly||findMoveRoute(b,unit,target).route!==null);
  const forced=tauntTarget(b,unit,attackRange(b,unit));
  const pool=meleeTargetPool(b,unit,enemies);
  const focused=side.focusUntil>b.tick&&pool.some(e=>e.id===side.focus);
  const chase=!focused&&(pursuitTarget(b,unit,enemies)||flankingTarget(b,unit,enemies));
  return (forced?[forced]:chase?[chase]:pool).filter(t=>!inRangeOnly || distance(unit,t) <= attackRange(b,unit)&&distance(unit,t)>=(unitAttributes(unit,b).minRange||0)).sort((a, c) => {
    const score = target => {
      let s = distance(unit, target) * 9 + target.hp / target.maxHp * 7;
      if(target.id==='siege-gate')s += battleIntent(b,unit.side)==='siege'?-24:24;
      if (counters(unit.type,target.type)) s -= 5;
      if (side.focus === target.id && side.focusUntil > b.tick) s -= 22;
      if (unit.type === 'cavalry' && isRear(target)) s -= 5;
      if (battleIntent(b,unit.side) === 'hold') s += Math.abs(target.x - (unit.side === 0 ? 2 : 11)) * 2;
      if (b.siege?.gate.side === unit.side) s += distance(target,b.siege.gate)*4;
      return s;
    };
    return score(a) - score(c) || a.id.localeCompare(c.id);
  })[0];
}
function findMoveRoute(b, unit, target, retreat = false, supportRange = null) {
  const occupied = b.sides.flatMap(s => s.units).filter(u => u.status === 'active' && u !== unit);
  // Breadth-first pathfinding handles blocked allies without passing through them.
  const defending = !retreat && b.siege?.gate.side === unit.side;
  const inLine = p => !defending || (unit.side===0 ? p.x<=4 : p.x>=9);
  const goal = retreat ? p => p.x === (unit.side === 0 ? 0 : 13) : p => inLine(p) && distance(p, target) <= (supportRange??attackRange(b,unit)) && (supportRange!==null||distance(p,target)>=(unitAttributes(unit,b).minRange||0)&&canStrikeFrom(b,unit,target,p));
  const queue = [{ x: unit.x, y: unit.y, path: [] }], visited = new Set([`${unit.x},${unit.y}`]);
  let route = null, contactRoute = null;
  while (queue.length) {
    const node = queue.shift();
    if (goal(node)) { route = node.path; break; }
    if(!retreat&&interceptorsAt(b,unit,node).length){
      // An unreachable focus behind a complete line still advances to contact.
      contactRoute ??= node.path;
      continue;
    }
    const neighbors = hexNeighbors(node);
    neighbors.sort((a, c) => distance({x:a[0],y:a[1]},target) - distance({x:c[0],y:c[1]},target));
    for (const [x, y] of neighbors) {
      const key = `${x},${y}`;
      if (x < 0 || y < 0 || x >= GRID.cols || y >= GRID.rows || (!retreat && !inLine({x,y})) || !canOccupy(b,unit,x,y) || visited.has(key) || occupied.some(u => u.x === x && u.y === y)) continue;
      visited.add(key); queue.push({ x, y, path: [...node.path, { x, y }] });
    }
  }
  return {route,contactRoute};
}
function moveUnit(b, unit, target, retreat = false, supportRange = null) {
  const speed=unitAttributes(unit,b).move;
  if(speed<=0){unit.moveProgress=0;unit.action='固守 / 迟滞';return true;}
  const paths=findMoveRoute(b,unit,target,retreat,supportRange),route=paths.route??paths.contactRoute;
  if (route?.length) {
    unit.moveProgress=(unit.moveProgress||0)+speed;const steps=Math.floor(unit.moveProgress);unit.moveProgress-=steps;
    if(!steps){unit.action='迟滞行军';return true;}
    // Stop at first contact, even if speed would otherwise skip this hex.
    const contact=retreat?-1:route.findIndex(p=>interceptorsAt(b,unit,p).length);
    const next = route[Math.min(route.length, steps,contact<0?Infinity:contact+1) - 1];
    const from={x:unit.x,y:unit.y};unit.x = next.x; unit.y = next.y;moved(b,unit,from); unit.action = retreat ? '撤离' : `接近${target.name}`;
  } else unit.action = retreat ? '等待撤离' : b.siege?.gate.side===unit.side ? '守护城门' : '调整阵线';
  return route!==null;
}
function combatEffect(b, attacker, target, skill, damage, phase = 'impact', definition=null, extra={}) {
  b.effects.push({ from: attacker.id, to: target.id, damage, skill, phase, visual: definition?.visual || skillVisual(attacker), troop: attacker.type, side: attacker.side, name: attacker.name, label: definition?.name || attacker.skill, fromX: attacker.x, fromY: attacker.y, x: target.x, y: target.y, ...extra });
}
function counters(a,c) { return TROOPS[a].beats===c || a==='cavalry' && c==='crossbow'; }
function damageGate(b, attacker, scale=1, definition=null) {
  const gate = b.siege.gate, own = unitAttributes(attacker,b);
  const damage = Math.min(gate.hp,Math.max(1,Math.round(((definition?own.martialPower:own.attack)+own.siege)*scale*(definition?.critical?POWER_RULES.criticalMultiplier:1)*COMBAT.damageScale*(.9+random(b)*.2))));
  gate.hp -= damage;gate.lastDamagedTick=b.tick;
  attacker.participated = true;
  attacker.cooldown = own.attackInterval-(attacker.attackCarry||0); attacker.attackCarry = 0;
  if(!definition)gainIntent(attacker,intentIncome(attacker).attack);
  attacker.action = `攻击城门 · ${damage}`;
  combatEffect(b,attacker,gate,!!definition,damage,'impact',definition,definition?.critChance?{critical:definition.critical,critChance:definition.critChance}:{});
  if (!gate.hp) {
    b.result = { winner:b.siege.attackerSide, reason:'城门失守' };
    battleLog(b,'城门耐久归零，守方败北。');
  }
}
function damageUnit(b, attacker, target, skill, scale=1, definition=null, generateIntent=true,allowCounter=true,terrainOverride=null,intentTargets=null,attack=null) {
  if(!skill&&!attack)recordBasicAttack(attacker,target);
  attacker.participated=true;target.participated=true;
  const own=attack?.attributes||unitAttributes(attacker,b),enemy=unitAttributes(target,b);
  const orb=!skill&&hasStatus(b,attacker,'attackOrb')?attacker.statuses.attackOrb:null,orbProfile=orb?ATTACK_ORBS[orb.skillId]:null;
  const orbTerrain=orb?tacticTerrainEffect(b,attacker,TACTICS_BOOK[orb.skillId],target):null;
  const intellectual=skill?definition?.category==='intellect':orb?orb.skillId==='curse':hasStatus(b,attacker,'strategyAttack');
  const kind=intellectual?'intellect':skill?'force':'basic';
  const power=skill?(intellectual?own.strategyPower:own.martialPower):orb?(orb.skillId==='curse'?own.strategyPower:own.attack+own.martialPower*orbProfile.bonus*(orbTerrain?.damage??1)):intellectual?own.strategyPower*.8:own.attack;
  const resistance=intellectual?enemy.discipline:enemy.defense;
  const counter=counters(attacker.type,target.type)?1.28:counters(target.type,attacker.type)?.84:1;
  const pursuitBonus=!skill&&hasStatus(b,attacker,'pursuit')&&isRear(target)?1.35:1;
  const base=power*counter*100/(100+resistance)*(1-enemy.damageReduction)*passiveDamageMultiplier(b,attacker,target,kind,!skill)*passiveDamageTaken(b,target,kind,!skill)*pursuitBonus;
  const terrain=skill&&definition?(terrainOverride??tacticTerrainEffect(b,attacker,definition,target)):null;
  const raw=base*(attack?.roll??(.9+random(b)*.2))*COMBAT.damageScale*(terrain?.damage??1)*(definition?.critical?POWER_RULES.criticalMultiplier:1);
  let damage;
  if(attack){
    // Round the combined budget, not each target's minimum-one share.
    attack.total+=Math.max(1,raw)*scale;
    damage=Math.round(attack.total)-attack.rounded;attack.rounded+=damage;
  }else damage=Math.max(1,Math.round(raw*scale));
  if(hasStatus(b,target,'illusion')){const illusion=target.statuses.illusion,blocked=Math.min(Math.round(damage*statusFraction(target,'illusion',.5)),Math.floor(target.maxHp*statusFraction(target,'illusion',.08)));damage-=blocked;illusion.hits--;combatEffect(b,target,target,true,0,'impact',TACTICS_BOOK.mirage,{text:'幻卫承伤 '+blocked,absorbed:blocked,ongoing:true});if(!illusion.hits)delete target.statuses.illusion;}
  const beforeShield=damage;
  damage=absorbShield(b,target,damage);
  const shieldAbsorbed=beforeShield-damage;
  damage=takeCasualties(target,damage); target.morale = Math.max(15, target.morale - (skill ? 5 : 1));
  if(!attack){attacker.morale = Math.min(100, attacker.morale + 3); if(!skill){attacker.cooldown = own.attackInterval-(attacker.attackCarry||0);attacker.attackCarry=0;}}
  // Only normal attacks charge the attacker. A multi-hit tactic charges each victim once.
  if(!skill&&generateIntent&&!attack)gainIntent(attacker,intentIncome(attacker).attack);
  let intentDenied=0;
  if (allowCounter && target.hp > 0 && damage>0 && !intentTargets?.has(target.id)) {
    if(deniesHitIntent(attacker,skill))intentDenied=intentIncome(target).hit;
    else gainIntent(target,intentIncome(target).hit);
    intentTargets?.add(target.id);
  }
  attacker.action = skill ? definition?.name || attacker.skill : `攻击${target.name}`;
  combatEffect(b, attacker, target, skill, damage,'impact',orb?TACTICS_BOOK[orb.skillId]:definition,{...(orb?{attackOrb:orb.skillId,orbRemaining:orb.charges-1,text:orbProfile.name+' · 余 '+(orb.charges-1)+' 次',...(orbTerrain.label?{terrain:orbTerrain.label+'（仅附加威力）',terrainFactor:orbTerrain.damage}:{})}:{}),shieldAbsorbed,damageKind:intellectual?'intellect':'force',...(definition?.critChance?{critical:definition.critical,critChance:definition.critChance}:{}),...(terrain?.label?{terrain:terrain.label,terrainFactor:terrain.damage}:{}),...(!allowCounter?{ongoing:true}:{}),...(intentDenied?{intentDenied,intentBlock:skill?'断势':'截气'}:{})});
  if(orb){
    if(target.hp>0){
      const extra={sourceId:attacker.id,sourceName:attacker.name,sourceSkillName:orbProfile.name,potency:orb.potency};
      if(orb.skillId==='fire')extra.amount=Math.round(own.martialPower*(6/280+.03)*100/(100+enemy.discipline)*scale);
      setStatus(b,target,orbProfile.status,orbProfile.steps,extra);
    }
    if(!attack){orb.charges--;if(!orb.charges)delete attacker.statuses.attackOrb;}
  }
  if(!skill&&!orb&&target.hp>0&&hasStatus(b,attacker,'burningAttack')){
    const fire=attacker.statuses.burningAttack;
    setStatus(b,target,'burn',6,{sourceId:attacker.id,sourceName:attacker.name,sourceSkillName:fire.sourceSkillName,amount:Math.round(own[fire.powerStat]*fire.rate*100/(100+enemy.discipline)*scale)});
  }
  if (target.hp <= 0) { target.status = 'defeated'; target.cast = null; target.action = '溃败'; battleLog(b, `${target.name}所部溃败，战线出现空位。`); }
  if(attack)attack.targets.push(target);
  else if(allowCounter)counterAttack(b,attacker,target);
}
function counterAttack(b,attacker,target){
  if(target.hp>0&&attacker.hp>0&&distance(attacker,target)===1&&hasStatus(b,target,'riposte')&&target.statuses.riposte.lastTick!==b.tick&&!hasStatus(b,target,'stun')&&!hasStatus(b,target,'confuse')){target.statuses.riposte.lastTick=b.tick;damageUnit(b,target,attacker,true,.55,TACTICS_BOOK.riposte,false,false);}
}
function contactTargets(b,u){
  const stats=unitAttributes(u,b);
  if(stats.range<1||stats.minRange>1)return [];
  return activeUnits(b,1-u.side).filter(e=>distance(u,e)===1).sort((a,c)=>a.id.localeCompare(c.id));
}
function basicAttack(b,u,target,contacts){
  if(contacts.length<2){damageUnit(b,u,target,false);return;}
  // One attack budget, shared across every touching enemy. Resolve all shares
  // before retaliation so array order cannot cancel the remaining contacts.
  recordBasicAttack(u,target);
  const attack={attributes:unitAttributes(u,b),roll:.9+random(b)*.2,targets:[],total:0,rounded:0};
  const orb=hasStatus(b,u,'attackOrb')?u.statuses.attackOrb:null;
  const start=b.effects.length;
  for(const enemy of contacts)damageUnit(b,u,enemy,false,1/contacts.length,null,true,true,null,null,attack);
  for(const effect of b.effects.slice(start))if(effect.from===u.id&&!effect.skill){effect.sharedTargets=contacts.length;effect.damageShare=1/contacts.length;}
  u.morale=Math.min(100,u.morale+3);
  u.cooldown=attack.attributes.attackInterval-(u.attackCarry||0);u.attackCarry=0;
  gainIntent(u,intentIncome(u).attack);
  if(orb){orb.charges--;if(!orb.charges)delete u.statuses.attackOrb;}
  u.action=`分击 ${contacts.length} 队 · 各分摊 1/${contacts.length}`;
  for(const enemy of attack.targets)counterAttack(b,u,enemy);
}
function pulseSupportAuras(b){
  if(b.tick%AURA_INTERVAL)return;
  for(const target of b.sides.flatMap(side=>side.units)){
    const aura=formationAura(b,target);if(!aura)continue;
    const healing=Math.min(battleWounded(target),target.maxHp-target.hp,Math.round(target.maxHp*.005*aura.factor*(hasStatus(b,target,'blight')?1-statusFraction(target,'blight',.5):1)));
    const prior=target.intent;gainIntent(target,Math.round(2*aura.factor));
    const intentRestored=target.intent-prior;
    if(healing>0){target.hp+=healing;target.healed+=healing;}
    if(healing>0||intentRestored>0){
      target.participated=true;aura.source.participated=true;
      combatEffect(b,aura.source,target,true,0,'impact',TACTICS_BOOK.passage,{healing,intentRestored,ongoing:true,text:'协阵'+(healing?' · 救治 +'+healing:'')+(intentRestored?' · 战意 +'+intentRestored:'')});
    }
  }
}
function stun(b,u,steps,key='stun',source={}) {
  if(hasStatus(b,u,'resolve'))return;
  setStatus(b,u,key,steps,source);setStatus(b,u,'resolve',steps+3,{...source,sourceNote:'受控保护'});
}
// The window is anchored to the first completed cast, never extended by a chain.
function comboCandidate(b,u,s,target) {
  if(s.attackOrb||s.effect==='repair'||['phalanx','gallop','valor','bulwark','riposte','anchor','emplace','passage'].includes(s.effect))return null;
  const units=b.sides[u.side].units;
  const previous=(b.comboWindows||[]).find(c=>c.side===u.side&&c.targetId===target.id&&b.tick-c.tick<=COMBO.window);
  const actors=(previous?.actors||[]).filter(a=>units.some(v=>v.id===a.id&&v.status==='active'&&v.hp>0));
  if(actors.some(a=>a.id===u.id))return null; // Multi-hit and the same officer cannot link with itself.
  const actor={id:u.id,name:u.name,skillId:s.id,x:u.x,y:u.y};
  return {side:u.side,targetId:target.id,tick:actors.length?previous.tick:b.tick,actors:[...actors,actor]};
}
function finishTactic(b,u,s,target) {
  // Invalid movement casts must not consume a relationship roll.
  if(s.effect==='lure'&&!lureCell(b,u,target)||s.effect==='retreatShot'&&!retreatCell(b,u)||['rush','terror'].includes(s.effect)&&routeTo(b,u,target,3)===null)return false;
  const before=snapshotTactic(b);
  const power=statusPower(u,s,b),factor=powerFactor(power);
  const origin={...u},terrainPath=['rush','terror'].includes(s.effect)?routeTo(b,u,target,3):[];
  const terrainFor=t=>tacticTerrainEffect(b,origin,s,t,terrainPath);
  const terrainNotes=new Set();
  const noteTerrain=t=>{const terrain=terrainFor(t);if(terrain.label)terrainNotes.add(terrain.label);return terrain;};
  const combo=comboCandidate(b,u,s,target);
  const partner=combo?.actors.at(-2);
  const relation=partner?relationshipInfo(partner.id,u.id,b.relationshipScores,b.relationshipTypes):null;
  const linked=relation&&(relation.chance===100||relation.chance>0&&random(b)<relation.chance/100);
  if(partner&&!linked){combo.actors=[combo.actors.at(-1)];combo.tick=b.tick;}
  const level=combo?Math.min(3,combo.actors.length):1;
  const bonus=(level===3?COMBO.tripleBonus:level===2?COMBO.doubleBonus:0)+(level>1&&hasPassive(u,'combo')?5:0);
  const boosted=(n,t=null,kind=null,scalePower=true)=>Math.round(n*(scalePower?factor:1)*(1+bonus/100)*(t?supportMultiplier(u,t,kind):1));
  const duration=n=>n+(bonus?1:0),effectStart=b.effects.length;
  const attempt=(t,key)=>{
    const immune=['stun','confuse','taunt'].includes(key)&&hasStatus(b,t,'resolve');
    const resistance=unitAttributes(t,b)[s.category==='intellect'?'discipline':'defense'];
    const chance=immune?0:effectChance(power,resistance),success=!immune&&random(b)<chance;
    const text=CHANCE_EFFECT_NAMES[key]+(immune?'免疫':success?'成功':'未成功');
    combatEffect(b,u,t,true,0,'impact',s,{text,resolution:{effect:key,chance,success,immune}});
    return success;
  };
  const status=(t,key,steps,extra={})=>{
    if(['seal','taunt'].includes(key)&&!attempt(t,key))return false;
    if(DURATION_POWER_STATUSES.has(key))steps=powerDuration(steps,power);
    const terrain=terrainFor(t),adjusted=terrain.statuses.includes(key)?Math.max(1,Math.round(steps*noteTerrain(t).factor)):steps;
    setStatus(b,t,key,key==='seal'?disciplineDuration(b,t,duration(adjusted)):duration(adjusted),{sourceId:u.id,sourceName:u.name,sourceSkillName:s.name,potency:factor,...extra,...(key==='ward'?{percent:Math.min(80,Math.round(extra.percent*factor))}:{}),...(key==='shield'?{source:u.id+':'+s.id,label:u.name+' · '+s.name}:{})});
    return true;
  };
  const intentTargets=new Set();
  const criticalTargets=new Map();
  const definitionFor=t=>{
    if(!s.power.critical)return s;
    if(!criticalTargets.has(t.id)){
      const chance=criticalChance(power);
      criticalTargets.set(t.id,{...s,critChance:chance,critical:random(b)<chance});
    }
    return criticalTargets.get(t.id);
  };
  const hit=(t,scale=1.5,charge=true)=>u.hp>0&&t.hp>0&&damageUnit(b,u,t,true,scale*(1+bonus/100),definitionFor(t),charge,true,noteTerrain(t),intentTargets);
  const signal=(t=u,text=s.name)=>{t.participated=true;const terrain=noteTerrain(t);combatEffect(b,u,t,true,0,'impact',s,{text,...(terrain.label?{terrain:terrain.label}:{})});};
  const heal=(t,fraction,scalePower=true)=>{
    const amount=Math.min(battleWounded(t),t.maxHp-t.hp,Math.round(boosted(t.maxHp*fraction,t,'healing',scalePower)*(hasStatus(b,t,'blight')?1-statusFraction(t,'blight',.5):1)));
    if(amount<=0||t.status!=='active')return;
    t.hp+=amount;t.healed=(t.healed||0)+amount;u.participated=true;t.participated=true;
    combatEffect(b,u,t,true,0,'impact',s,{text:`救治 +${amount}`,healing:amount});
  };
  const control=(t,steps,key='stun')=>{
    if(!attempt(t,key))return false;
    const held=holdsLine(b,t),scaled=duration(powerDuration(steps,power));
    stun(b,t,s.category==='intellect'?disciplineDuration(b,t,scaled):scaled,key,{sourceId:u.id,sourceName:u.name,sourceSkillName:s.name});
    if(held&&!holdsLine(b,t)){
      signal(t,'拦截中断');
      battleLog(b,`${u.name}「${s.name}」使${t.name}暂时失去拦截，骑兵可沿空隙突入；其他前排仍能阻挡。`);
    }
    signal(t,CHANCE_EFFECT_NAMES[key]);return true;
  };
  const start={x:u.x,y:u.y};
  const controlSteps=4;
  if(s.attackOrb){
    setStatus(b,u,'attackOrb',Math.max(0,(b.maxTicks||240)-b.tick),{skillId:s.id,charges:ATTACK_ORBS[s.id].charges,potency:factor,sourceId:u.id,sourceName:u.name,sourceSkillName:s.name});
    combatEffect(b,u,u,true,0,'impact',s,{enchantment:true,text:s.name+' · 装填 '+ATTACK_ORBS[s.id].charges+' 次'});
  }else switch(s.effect) {
    case 'cleave':activeUnits(b,1-u.side).filter(t=>distance(u,t)===1).sort((a,c)=>a.id.localeCompare(c.id)).slice(0,3).forEach((t,i)=>{if(u.hp>0)hit(t,.95,i===0);});break;
    case 'bulwark':status(u,'bulwark',10);signal();break;
    case 'riposte':status(u,'riposte',8,{lastTick:0});signal();break;
    case 'blight':hit(target,.7);if(target.hp>0)status(target,'blight',10);break;
    case 'mirage':case 'mist':for(const a of expandedSupportTargets(b,u,s)){status(a,'illusion',s.effect==='mirage'?10:8,{hits:s.effect==='mirage'?3:2});signal(a);}break;
    case 'repair':{
      if(repairTarget(b,u,s.range)!==target)return false;
      const contested=target.lastDamagedTick!==undefined&&b.tick-target.lastDamagedTick<=3;
      const repaired=Math.min(target.maxHp-target.hp,Math.round(target.maxHp*.04*factor*(contested?.5:1)));
      target.hp+=repaired;u.participated=true;u.cooldown=unitAttributes(u,b).attackInterval;u.attackCarry=0;
      combatEffect(b,u,target,true,0,'impact',s,{text:'修缮 +'+repaired,repaired});
      break;
    }
    case 'bandage':heal(target,.06);break;
    case 'supply':gainIntent(target,boosted(24,target,'intent'));signal(target);break;
    case 'camp':for(const a of expandedSupportTargets(b,u,s)){status(a,'camp',8);signal(a);}break;
    case 'regrowth':status(target,'regrowth',6,{amount:boosted(target.maxHp*(.015+power/50000),target,'healing',false),sourceId:u.id});signal(target);break;
    case 'purify':for(const key of NEGATIVE_STATUSES)delete target.statuses[key];heal(target,.05);signal(target);break;
    case 'passage':status(target,'phase',6);setStatus(b,target,'phaseLock',18,{sourceId:u.id,sourceName:u.name,sourceSkillName:s.name});signal(target,'奇门 · 可越拦截');break;
    case 'bombard':case 'tremor':case 'broadside':case 'undertow':{
      const targets=areaTacticTargets(b,u,s,target,s.range+(s.effect==='bombard'&&hasStatus(b,u,'emplaced')?1:0)).filter(t=>distance(u,t)>=(s.minRange||0));
      targets.forEach((t,i)=>{if(u.hp<=0)return;hit(t,s.effect==='bombard'?(i?.65:1.45):s.effect==='tremor'?.75:s.effect==='broadside'?1.05:.65,i===0);if(t.hp>0&&s.effect==='tremor')status(t,'shaken',6);if(t.hp>0&&s.effect==='undertow'){status(t,'slow',6);status(t,'curse',10);}});break;
    }
    case 'ram':if(target.type==='gate')damageGate(b,u,3*(1+bonus/100),definitionFor(target));else hit(target,1.1);break;
    case 'emplace':status(u,'emplaced',10);signal();break;
    case 'plague':hit(target,.6);if(target.hp>0){status(target,'blight',10);status(target,'plague',10,{sourceId:u.id,amount:boosted(power*(12/280+.08)*100/(100+unitAttributes(target,b).discipline),null,null,false)});}break;
    case 'nexus':status(target,'nexus',8);signal(target);break;
    case 'navalRam':{const path=routeTo(b,u,target,2);if(!path?.length)return false;Object.assign(u,path.at(-1));moved(b,u,start);hit(target,1.7);break;}
    case 'anchor':status(u,'anchored',8);signal();break;
    case 'boarding':heal(target,.1);gainIntent(target,boosted(20,target,'intent'));signal(target);break;
    case 'famous': {
      const targets=famousTargets(b,u,s,target);
      if(!targets.length)return false;
      if(s.selfCost){
        const loss=takeCasualties(u,Math.min(u.hp-1,Math.floor(u.hp*s.selfCost)));
        if(loss)combatEffect(b,u,u,true,loss,'impact',s,{text:'自损'});
      }
      let charged=false;
      for(const t of targets){
        if(s.mode==='attack'){
          const scale=s.scale+(s.execute&&t.hp/t.maxHp<.4?s.execute:0);
          for(let i=0;i<(s.hits||1)&&t.hp>0;i++){hit(t,scale,!charged);charged=true;}
          if(t.hp<=0)continue;
          if(s.debuff)status(t,s.debuff,s.steps);
          if(s.control)control(t,s.steps,s.control);
          if(s.drain)lowerIntent(t,boosted(s.drain),u);
          if(s.burn)status(t,'burn',s.steps,{sourceId:u.id,amount:boosted(s.burn*power/280*100/(100+unitAttributes(t,b).discipline),null,null,false)});
        }else{
          if(s.heal)heal(t,s.heal);
          if(s.cleanse){for(const key of NEGATIVE_STATUSES)delete t.statuses[key];status(t,'resolve',3);}
          if(s.shield)status(t,'shield',8,{amount:boosted(t.maxHp*s.shield*(.5+power/200),t,'shield',false)});
          if(s.intent&&t!==u)gainIntent(t,boosted(s.intent,t,'intent'));
          if(s.cooldownReduction&&t!==u)for(const id of Object.keys(t.skillReady||{}))t.skillReady[id]=Math.max(b.tick,t.skillReady[id]-boosted(s.cooldownReduction,t,'cooldown'));
          if(s.ward)status(t,'ward',5,{percent:s.ward});
          if(s.valor)status(t,'valor',5);
          if(s.buffs)for(const [key,potency]of Object.entries(s.buffs))if(!hasStatus(b,t,key)||(t.statuses[key].potency??1)<=factor*potency)status(t,key,s.buffSteps,{potency:factor*potency});
        }
        signal(t,s.name);
      }
      if(s.selfCleanse){for(const key of NEGATIVE_STATUSES)delete u.statuses[key];status(u,'resolve',3);}
      if(s.selfWard)status(u,'ward',5,{percent:s.selfWard});
      if(s.allyIntent)for(const ally of activeUnits(b,u.side).filter(a=>a!==u&&hexDistance(u,a)<=s.allyRange&&a.intent<COMBAT.intentCap).sort((a,c)=>a.intent-c.intent||a.id.localeCompare(c.id)).slice(0,s.allyTargets)){
        gainIntent(ally,boosted(s.allyIntent,ally,'intent'));signal(ally,`鼓舞 · 战意 +${boosted(s.allyIntent,ally,'intent')}`);
      }
      break;
    }
    case 'confuse':if(s.id==='doubt'){hit(target,1.6);status(u,'strategyAttack',10);}if(target.hp>0)control(target,controlSteps,'confuse');break;
    case 'wildfire': {
      const targets=areaTacticTargets(b,u,s,target,s.range),scale=hasStatus(b,target,'burn')?1.25:.85;
      targets.forEach((t,i)=>{hit(t,scale,i===0);if(t.hp>0)status(t,'burn',6,{sourceId:u.id,amount:boosted(power*(6/280+.04)*100/(100+unitAttributes(t,b).discipline),null,null,false)});});status(u,'strategyAttack',16);status(u,'burningAttack',12,{powerStat:'strategyPower',rate:6/280+.04});break;
    }
    case 'rally':for(const a of basicSupportTargets(b,u,s)){const amount=boosted(24+Math.round(power*.02),a,'intent',false);gainIntent(a,amount);signal(a,`战意 +${amount}`);}break;
    case 'taunt':if(status(target,'taunt',4,{sourceId:u.id}))signal(target,'挑衅 · 引战');break;
    case 'cleanse':for(const key of NEGATIVE_STATUSES)delete target.statuses[key];status(target,'resolve',3);status(target,'shield',8,{amount:boosted(target.maxHp*(.08+power/8000),target,'shield',false)});signal(target,'解围 · 护盾');break;
    case 'screen':for(const a of basicSupportTargets(b,u,s)){heal(a,.08+power/10000,false);status(a,'shield',6,{amount:boosted(a.maxHp*.04,a,'shield')});signal(a,'救护 · 护盾');}break;
    case 'lure': {
      const cell=lureCell(b,u,target);if(!cell)return false;
      if(!attempt(target,'lure'))break;
      const from={x:target.x,y:target.y};Object.assign(target,cell);moved(b,target,from);status(target,'armorBreak',6);
      combatEffect(b,u,target,true,0,'impact',s,{fromX:from.x,fromY:from.y,text:'诱敌 · 破防'});break;
    }
    case 'harass':{const amount=lowerIntent(target,boosted(24+Math.round(power*.03),null,null,false),u);status(target,'weaken',6);signal(target,`战意 −${amount}`);break;}
    case 'relay':for(const a of basicSupportTargets(b,u,s)){heal(a,.07+power/10000,false);for(const id of Object.keys(a.skillReady))a.skillReady[id]=Math.max(b.tick,a.skillReady[id]-boosted(2,a,'cooldown'));status(a,'haste',4);signal(a,'策应 · 冷却缩短');}break;
    case 'ambush':hit(target,.6);if(target.hp>0){status(target,'slow',6);status(target,'weaken',6);}break;
    case 'seal':if(status(target,'seal',5))signal(target,'封技');break;
    case 'phalanx':status(u,'phalanx',8);signal(u,'方阵 · 减伤');break;
    case 'gallop':{
      status(u,'ward',6,{percent:25});
      const nearest=activeUnits(b,1-u.side).sort((a,c)=>distance(u,a)-distance(u,c)||a.id.localeCompare(c.id))[0];
      if(nearest&&routeTo(b,u,nearest,14)?.length)status(u,'haste',6);
      signal(u,'疾驰 · 减伤');break;
    }
    case 'valor':status(u,'valor',8);status(u,'armorBreak',8,{potency:1});signal(u,`攻击 +${(25*factor).toFixed(1)}% · 防御 −20%`);break;
    case 'scatter': {
      const targets=areaTacticTargets(b,u,s,target,attackRange(b,u));
      targets.forEach((t,i)=>hit(t,.85,i===0));break;
    }
    case 'thrust': {
      const next=hexBeyond(u,target);
      const behind=activeUnits(b,1-u.side).find(t=>t.x===next.x&&t.y===next.y);
      hit(target,1.3);if(behind)hit(behind,1.1,false);break;
    }
    case 'strike':hit(target,exposedTarget(b,target)?2.5:1.7);break;
    case 'repeat':hit(target,.95);if(target.hp>0)hit(target,.95,false);break;
    case 'retreatShot': {
      const cell=retreatCell(b,u);if(!cell)return false;
      Object.assign(u,cell);moved(b,u,start);hit(target,1.3);
      combatEffect(b,u,u,true,0,'impact',s,{fromX:start.x,fromY:start.y,text:'退射',visual:'charge'});break;
    }
    case 'rush':case 'terror': {
      const route=routeTo(b,u,target,3);if(route===null)return false;
      if(route.length){Object.assign(u,route.at(-1));moved(b,u,start);}
      hit(target,s.effect==='terror'?1.8:isRear(target)?2.2:1.6);
      // Keep the original path in the visual event even after moving the simulation unit.
      Object.assign(b.effects.at(-1),{fromX:start.x,fromY:start.y});
      if(route.length&&isRear(target)){
        if(u.type==='cavalry')status(u,'pursuit',8,{targetId:target.id});
        signal(u,'突入后阵');
        battleLog(b,`${u.name}「${s.name}」沿${route.length}格空隙突入后阵，攻击${target.name}。`);
      }
      if(s.effect==='terror' && target.hp>0)control(target,2);break;
    }
    case 'protect': {
      status(target,'shield',8,{amount:boosted(target.maxHp*.12,target,'shield')});
      const enemy=activeUnits(b,1-u.side).find(e=>distance(target,e)===1);
      const next=enemy?hexBeyond(target,enemy):null;
      if(enemy && !hasStatus(b,enemy,'phalanx') && openCell(b,next.x,next.y,enemy) && attempt(enemy,'knockback')) {
        const from={x:enemy.x,y:enemy.y};
        for(let i=0;i<2;i++) {const {x,y}=hexBeyond(target,from,i+1);if(!openCell(b,x,y,enemy))break;enemy.x=x;enemy.y=y;}
        moved(b,enemy,from);
        combatEffect(b,u,enemy,true,0,'impact',s,{fromX:from.x,fromY:from.y,text:'击退'});
      }
      signal(target,'护盾');break;
    }
    case 'undermine':{const amount=lowerIntent(target,boosted(45),u);signal(target,'战意 −'+amount);break;}
    default:return false;
  }
  const castEvents=b.effects.slice(effectStart).filter(e=>e.from===u.id&&!e.ongoing);
  if(castEvents.length){castEvents[0].outcome=tacticOutcome(b,u,before,castEvents);castEvents[0].castPower=power;}
  const effective=castEvents.some(e=>e.damage>0||e.healing>0||e.shieldAbsorbed>0||e.resolution?.success)||b.sides.flatMap(side=>side.units).some(t=>{
    const old=before.get(t.id);return old&&(t.intent!==old.intent||t.x!==old.x||t.y!==old.y||JSON.stringify(t.statuses)!==JSON.stringify(old.statuses)||JSON.stringify(t.skillReady)!==JSON.stringify(old.ready));
  });
  if(combo&&effective) {
    b.comboWindows ||= [];b.comboCounts ||= [0,0];
    b.comboWindows=b.comboWindows.filter(c=>!(c.side===u.side&&c.targetId===target.id));
    b.comboWindows.push(combo);
    if(bonus) {
      b.comboCounts[u.side]++;
      for(const e of b.effects.slice(effectStart))e.comboLevel=level;
      const title=level===3?'三连携':'二连携';
      const detail={level,bonus,actors:combo.actors.map(a=>({...a})),targetName:target.name};
      combatEffect(b,u,target,true,0,'impact',s,{label:title,visual:'shockwave',combo:detail,text:'效果 +'+bonus+'%'});
      battleLog(b,'关系 '+relation.score+' · 连携概率 '+relation.chance+'% · '+title+' · '+combo.actors.map(a=>a.name).join(' → ')+' 对 '+target.name+' 发动「'+s.name+'」，伤害及数值效果 +'+bonus+'%，控制与状态持续 +1 步。');
    }
  }
  if(partner&&!linked)battleLog(b,partner.name+' → '+u.name+'：关系 '+relation.score+'，'+relation.chance+'% 连携判定未成功，战法正常生效。');
  if(['relay','screen','bandage','regrowth','purify','boarding'].includes(s.effect)){u.cooldown=unitAttributes(u,b).attackInterval;u.attackCarry=0;}
  u.participated=true;target.participated=true;
  u.skillCasts=(u.skillCasts||0)+1;u.tacticCasts[s.id]=(u.tacticCasts[s.id]||0)+1;
  u.action=s.name;battleLog(b,`${u.name}发动「${s.name}」：${s.description}。${terrainNotes.size?'【地形】'+[...terrainNotes].join('；'):''}`);return true;
}
function tickStatuses(b) {
  for(const u of b.sides.flatMap(s=>s.units)) {
    u.statuses ||= {};u.skillReady ||= {};u.tacticCasts ||= {};refreshShield(b,u);
    for(const [key,status] of Object.entries(u.statuses))if(status.until<=b.tick)delete u.statuses[key];
    if(u.status!=='active'||u.hp<=0)continue;
    if(hasStatus(b,u,'regrowth')){const regen=u.statuses.regrowth,source=b.sides.flatMap(s=>s.units).find(a=>a.id===regen.sourceId);const amount=Math.min(battleWounded(u),u.maxHp-u.hp,Math.round(regen.amount*(hasStatus(b,u,'blight')?1-statusFraction(u,'blight',.5):1)));if(amount>0){u.hp+=amount;u.healed+=amount;u.participated=true;if(source)combatEffect(b,source,u,true,0,'impact',TACTICS_BOOK.regrowth,{text:'休整 +'+amount,healing:amount,ongoing:true});}}
    for(const key of ['burn','scorch','plague'])if(u.hp>0&&hasStatus(b,u,key)) {
      const burn=u.statuses[key],source=b.sides.flatMap(s=>s.units).find(s=>s.id===burn.sourceId);
      const terrainFactor=key==='plague'?1:fireTerrainFactor(b,u);
      let damage=Math.round(burn.amount*passiveDamageTaken(b,u,'dot')*terrainFactor);u.participated=true;
      damage=absorbShield(b,u,damage);
      damage=takeCasualties(u,damage);
      if(source)combatEffect(b,source,u,false,damage,'impact',(key==='plague'?TACTICS_BOOK.plague:TACTICS_BOOK.fire),{text:key==='plague'?'疫伤':key==='scorch'?'火攻':`灼烧 ${burn.stacks||1}层`,damageKind:'dot',fromX:u.x,fromY:u.y});
      if(u.hp<=0) {u.status='defeated';u.cast=null;u.action='溃败';battleLog(b,`${u.name}所部在持续伤害中溃败。`);}
    }
  }
}
export function stepBattle(b) {
  if (!b || b.result) return;
  if (isDeploying(b)) lockDeployment(b);
  b.tick++; b.effects = [];
  for (const side of b.sides) for (const u of side.units) {
    u.intent=Math.min(COMBAT.intentCap,Math.max(0,u.intent||0));
    if (u.wave && u.arrivalTick === b.tick && side.units.find(v => v.wave === u.wave) === u)
      battleLog(b, `${u.side === 0 ? '我军' : '敌军'}第 ${u.wave} 批援军抵达，有空位时补入战线。`);
  }
  b.comboWindows=(b.comboWindows||[]).filter(c=>b.tick-c.tick<=COMBO.window&&b.sides.flatMap(s=>s.units).some(u=>u.id===c.targetId&&u.status==='active'&&u.hp>0));
  b.comboCounts ||= [0,0];
  tickStatuses(b);
  pulseSupportAuras(b);
  for(const side of b.sides)if(side.recoveryUntil>b.tick)for(const u of side.units)healWounded(b,u,.01,true);
  fillSlots(b, 0); fillSlots(b, 1);
  b.commandProgress=Math.min(COMMAND_RESOURCE.capacity,(b.commandProgress||0)+commandIntellect(b));
  b.enemyCommand.commandProgress=Math.min(COMMAND_RESOURCE.capacity,b.enemyCommand.commandProgress+commandIntellect(b,1));
  // Alternate initiative each step so one faction does not always act first.
  const sequence = b.tick % 2 ? [0, 1] : [1, 0];
  for (const side of sequence) for (const unit of [...activeUnits(b, side)]) {
    if (unit.status !== 'active') continue;
    unit.attackCarry=unit.cooldown>1e-9&&unit.cooldown<1?1-unit.cooldown:0;
    unit.cooldown = unit.cooldown-1<1e-9?0:unit.cooldown-1;
    if(hasStatus(b,unit,'stun')) {unit.action='眩晕';continue;}
    if(hasStatus(b,unit,'confuse')) {
      const cells=hexNeighbors(unit).filter(([x,y])=>openCell(b,x,y,unit));
      if(cells.length&&unitAttributes(unit,b).move>0){const from={x:unit.x,y:unit.y};const [x,y]=cells[Math.floor(random(b)*cells.length)];unit.x=x;unit.y=y;moved(b,unit,from);}
      unit.action='混乱 · 阵位失序';continue;
    }
    if (b.sides[side].retreat) {
      unit.cast = null;
      moveUnit(b, unit, { x: side === 0 ? 0 : 13, y: unit.y }, true);
      if (unit.x === (side === 0 ? 0 : 13)) { unit.status = 'withdrawn'; unit.action = '已撤离'; battleLog(b, `${unit.name}所部成功撤离。`); }
      continue;
    }
    const ready = readyTactic(b,unit,attackRange(b,unit));
    if (ready) {
      const {skill:s,target}=ready;
      if(!finishTactic(b,unit,s,target))continue;
      if(b.result)return;
      unit.skillReady[s.id]=b.tick+s.cooldown;
      continue;
    }
    const repairBuilding=unitTactics(unit).some(s=>s.effect==='repair')&&repairTarget(b,unit,Infinity);
    if(repairBuilding&&unit.intent>=TACTICS_BOOK.camp.threshold&&(unit.skillReady.camp||0)<=b.tick&&distance(unit,repairBuilding)>2&&!activeUnits(b,1-side).some(e=>distance(unit,e)<=1)){moveUnit(b,unit,repairBuilding,false,2);continue;}
    const breachGate=gateTarget(b,unit);
    if(breachGate&&unit.type==='siege'&&unitTactics(unit).some(s=>s.id==='ram')&&unit.intent>=TACTICS_BOOK.ram.threshold&&(unit.skillReady.ram||0)<=b.tick&&!tauntTarget(b,unit,attackRange(b,unit))&&!activeUnits(b,1-side).some(e=>distance(unit,e)<=2)&&distance(unit,breachGate)>2){moveUnit(b,unit,breachGate,false,2);continue;}
    const focused=pickTarget(b,unit);
    const explicitFocus=focused && b.sides[side].focus===focused.id && b.sides[side].focusUntil>b.tick;
    const contacts=contactTargets(b,unit);
    const target = (contacts.length>1?contacts.find(e=>e.id===focused?.id)||contacts[0]:null) || (!unit.cooldown && !explicitFocus ? pickTarget(b,unit,true) : null) || focused; if (!target) continue;
    if(distance(unit,target)<(unitAttributes(unit,b).minRange||0)){const cell=retreatCell(b,unit),speed=unitAttributes(unit,b).move;if(cell&&speed>0){unit.moveProgress+=speed;if(unit.moveProgress>=1){unit.moveProgress%=1;const from={x:unit.x,y:unit.y};Object.assign(unit,cell);moved(b,unit,from);}}unit.action='撤离射击盲区';continue;}
    if (distance(unit, target) <= attackRange(b,unit)) {
      if (!unit.cooldown) {
        if (target.type === 'gate') damageGate(b,unit);
        else basicAttack(b,unit,target,contacts);
        if (b.result) return;
      } else unit.action = '重整攻势';
    } else {
      const support=!explicitFocus&&!tauntTarget(b,unit,attackRange(b,unit))&&supportApproach(b,unit);
      if(support){if(distance(unit,support.target)>support.range)moveUnit(b,unit,support.target,false,support.range);else unit.action='策应队友';}
      else if(!moveUnit(b,unit,target)&&!explicitFocus&&!tauntTarget(b,unit,attackRange(b,unit))){
        // An unreachable scored target must not suppress a reachable threat.
        // Reuse the actual movement search, including guard bounds, occupancy,
        // minimum range and ZOC, rather than granting a special pursuit path.
        const alternative=pickTarget(b,unit,false,true);
        if(alternative&&alternative.id!==target.id)moveUnit(b,unit,alternative);
      }
    }
  }
  fillSlots(b, 0); fillSlots(b, 1);
  const counts = [0,1].map(side => remainingUnits(b,side).length + (b.siege?.gate.side === side && b.siege.gate.hp > 0 && !b.sides[side].retreat ? 1 : 0));
  if (!counts[0] || !counts[1]) b.result = { winner: !counts[0] && !counts[1] ? null : counts[0] ? 0 : 1, reason: b.sides[0].retreat ? '撤退' : '击溃' };
  if(!b.result&&b.holdUntil){
    if(!remainingUnits(b,0).length)b.result={winner:1,reason:b.sides[0].retreat?'撤退':'击溃'};
    else if(b.tick>=b.holdUntil&&!b.sides[0].retreat&&b.siege?.gate.side===0&&b.siege.gate.hp>0){
      b.result={winner:0,reason:'坚守成功'};battleLog(b,'守军保住城门，完成限时坚守目标。');
    }
  }
  if (!b.result && b.tick >= (b.maxTicks || 240)) {
    const ratios = b.sides.map(s => s.units.reduce((n, u) => n + (['active', 'reserve'].includes(u.status) ? u.hp : 0), 0) / Math.max(1, s.units.reduce((n, u) => n + u.initial, 0)));
    b.result = { winner: Math.abs(ratios[0] - ratios[1]) < .05 ? null : ratios[0] > ratios[1] ? 0 : 1, reason: '久战收兵' };
    battleLog(b, '达到战斗时限，按双方可战兵力比例判定战局，诸军收兵。');
  }
  // Both controllers spend newly earned gauge at the completed-step boundary.
  // The AI must not affect unit actions in the same step that filled its gauge;
  // the player can only respond after stepBattle returns. Finished fights do
  // not accept a last order that could alter the already resolved outcome.
  if(!b.result&&b.enemyCommand.commandProgress>=COMMAND_RESOURCE.capacity){
    const command=chooseEnemyCommand(b,battleStratagems(b,1),STRATAGEMS);
    if(command)issueCommand(b,command,null,1);
  }
}
function retreatArmy(state, army, preferred) {
  const friends = state.cities.filter(c => c.owner === army.faction);
  const destination = friends.find(c => c.id === preferred) || friends.sort((a, b) => findRoute(state, army.location, a.id).length - findRoute(state, army.location, b.id).length)[0];
  if (destination) { army.location = destination.id; army.task = '休整'; army.route = []; army.target = null; }
  else { state.armies = state.armies.filter(a => a.id !== army.id); }
}
export function settleBattle(state) {
  const b = state.battle;
  if (!b?.result || b.settled) return null;
  b.settled = true;
  const city = cityById(state, b.cityId), context = b.context;
  const attacker = armyById(state, context.attackerId), attackerSide = attacker.faction === 'cao' ? 0 : 1;
  const attackWon = b.result.winner === attackerSide;
  const growth=[];
  const stats = b.sides.map(s => ({ faction: s.faction, initial: 0, remaining: 0, wounded: 0, killed: 0 }));
  for (let side = 0; side < 2; side++) for (const unit of b.sides[side].units) {
    const lost = unit.initial - unit.hp, wounded = battleWounded(unit);
    stats[side].initial += unit.initial; stats[side].remaining += unit.hp; stats[side].wounded += wounded; stats[side].killed += lost - wounded;
    if (!unit.armyId.startsWith('city:')) {
      const army = armyById(state, unit.armyId), source = army?.units.find(u => u.id === unit.id);
      if (source) {
        source.troops = unit.hp; source.wounded += wounded;
        if(unit.participated){
          const result=gainExperience(source,PROGRESSION.participation+(b.result.winner===side?PROGRESSION.victory:0));
          if(result.gained)growth.push({id:source.id,name:source.name,side,...result});
          if(result.after>result.before)log(state,`${source.name}升至 ${result.after} 级${result.unlocked.length?'，习得「'+result.unlocked.join('」「')+'」':''}。`,'good');
        }
      }
    }
  }
  const oldOwner = city.owner;
  if (attackWon) { city.owner = attacker.faction; city.garrison = 0; }
  else city.garrison = b.sides.flatMap(s => s.units).filter(u => u.armyId === `city:${city.id}`).reduce((n, u) => n + u.hp, 0);
  for (const id of [...context.attackingIds, ...context.defenderIds]) {
    const army = armyById(state, id); if (!army) continue;
    const isAttacker = context.attackingIds.includes(id), won = b.result.winner === (army.faction === 'cao' ? 0 : 1);
    army.morale = Math.max(25, Math.min(100, army.morale + (won ? 8 : -18))); army.route = []; army.target = null; army.task = '休整';
    if ((isAttacker && !attackWon) || (!isAttacker && attackWon)) retreatArmy(state, army, isAttacker ? context.origin : null);
  }
  if (b.result.winner === 0) { state.victories++; state.fame += 30; state.gold += 300; }
  state.report = { id: b.id, city: city.name, winner: b.result.winner, reason: b.result.reason, tick: b.tick, stats, growth, captured: oldOwner !== city.owner, owner: city.owner, reward: b.result.winner === 0 ? 300 : 0 };
  log(state, `${city.name}之战${b.result.winner === 0 ? '告捷' : b.result.winner === 1 ? '失利' : '未分胜负'}，我军阵亡 ${stats[0].killed} 人，伤兵 ${stats[0].wounded} 人。`, b.result.winner === 0 ? 'good' : 'war');
  if (b.siege) state.report.gate = { remaining:b.siege.gate.hp, initial:b.siege.gate.maxHp, side:b.siege.gate.side };
  state.battle = null;
  checkCampaign(state); return state.report;
}
function checkCampaign(state) {
  if (state.cities.every(c => c.owner === 'cao')) state.finished = 'victory';
  else if (!state.cities.some(c => c.owner === 'cao')) state.finished = 'defeat';
}
export function validateSave(value, { strategic = false } = {}) {
  const require = (condition, message = '存档数据损坏') => { if (!condition) throw new Error(message); };
  const number = (v, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= 0 && v <= max;
  const text = (v, max = 250) => typeof v === 'string' && v.length <= max && !/[<>"'&]/.test(v);
  const faction = v => Object.hasOwn(FACTIONS, v);
  const tactic = v => Object.hasOwn(TACTICS, v);
  const result = r => r && [0, 1, null].includes(r.winner) && ['撤退', '击溃', '久战收兵', '城门失守','坚守成功'].includes(r.reason);
  require(value && value.version === VERSION && number(value.turn) && value.turn > 0 && number(value.seed), '存档版本不兼容或数据损坏');
  require(value.rulesVersion===RULES_VERSION,'存档不是当前规则版本，请重新开始');
  require(value.officerDataVersion===3,'存档不是当前武将数据版本，请重新开始');
  const scenario = value.testScenario && SCENARIOS.find(s => s.id === value.testScenario.id);
  require(value.testScenario === undefined || (scenario && number(value.testScenario.seed,0xffffffff)), '测试战役无效');
  if(scenario?.id==='officer-lab'){
    const ids=value.testScenario.officerIds;
    require(Array.isArray(ids)&&ids.length>=1&&ids.length<=6&&new Set(ids).size===ids.length&&ids.every(id=>Object.hasOwn(OFFICER_BY_ID,id)),'试炼武将阵容无效');
    require(value.armies?.[0]?.units?.map(u=>u.id).join(',')===ids.join(','),'试炼阵容与武将不一致');
  }
  if (scenario) require(number(value.testScenario.shieldPercent,100),'开场护盾比例无效');
  if(scenario?.custom)validateCustomBattle(value.testScenario.customBattle);
  const initial = strategic && value.campaign?.scenarioId ? nationalWorld(value.campaign.scenarioId) : newGame();
  require(Array.isArray(value.cities) && value.cities.length === initial.cities.length && Array.isArray(value.armies) && value.armies.length <= (strategic?Object.keys(OFFICER_BY_ID).length:15) && Array.isArray(value.logs) && value.logs.length <= 60 && JSON.stringify(value.roads) === JSON.stringify(initial.roads), '存档结构不完整');
  require(validRelationshipTypes(value.relationshipTypes),'人物关系类型无效');
  require(validRelationshipScores(value.relationshipScores,value.relationshipTypes),'人物关系值无效');
  for (const key of ['gold', 'grain', 'fame', 'nextId', 'victories']) require(number(value[key]), '资源数据无效');
  require(value.nextId >= 3 && [null, 'victory', 'defeat'].includes(value.finished));
  for (const entry of value.logs) require(entry && number(entry.turn) && typeof entry.text === 'string' && entry.text.length < 1000 && ['info', 'event', 'order', 'good', 'war'].includes(entry.type));
  const seen = new Set();
  for (const city of value.cities) {
    const source = initial.cities.find(c => c.id === city?.id);
    require(source && faction(city.owner) && number(city.garrison), '城池数据无效');
    for (const key of ['name', 'x', 'y', 'subtitle', 'province',...(strategic&&value.campaign?.scenarioId?['kind','sourceId','water']:[])]) require(city[key] === source[key], '地图数据不匹配');
  }
  require(new Set(value.cities.map(c => c.id)).size === value.cities.length, '城池编号重复');
  function validateUnit(u, combat = false) {
    require(validTacticLearning(u),'战法学习记录无效');
    require(validLoadout(u,u.tactics),'战法配置无效');
    require(u && Object.hasOwn(TROOPS, u.type) && ['front', 'middle', 'back', 'left', 'right'].includes(u.formation) && number(u.troops) && number(u.wounded) && typeof u.first === 'boolean', '武将数据无效');
    require(u.troops+u.wounded<=troopCapacity(u),'现役与伤兵总数超过武将带兵上限');
    const profile=officerProfile(u.id);
    for(const key of PROFILE_FIELDS)require(u[key]===profile[key],'武将人物资料不匹配');
    const relation=u.relations;
    require(relation&&typeof relation==='object'&&!Array.isArray(relation)&&Object.keys(relation).length===6,'人物关系数据无效');
    for(const key of ['fatherId','motherId'])require(relation[key]===profile.relations[key],'人物关系数据无效');
    for(const key of RELATION_LIST_FIELDS)require(Array.isArray(relation[key])&&relation[key].length===profile.relations[key].length&&relation[key].every((id,i)=>id===profile.relations[key][i]),'人物关系数据无效');
    require(number(u.level,10)&&u.level>=1&&number(u.experience)&&((u.level===10&&u.experience===0)||(u.level<10&&u.experience<experienceNeeded(u.level))),'武将等级或经验无效');
    require(u.skillRouteType===undefined||Object.hasOwn(TROOPS,u.skillRouteType),'通用技能路线无效');
    if (Object.hasOwn(OFFICER_BY_ID,u.id)) {
      const source=makeOfficer(u.id);
      const keys=['name','courtesy','leadership','force','intellect','politics','skill','trait','loyalty'];
      for(const key of keys)require(u[key]===source[key],'武将基础数据不匹配');
    } else {
      require(((combat && /^g-[a-z]+-\d$/.test(u.id)) || (scenario && /^test-\d{1,2}$/.test(u.id))) && text(u.name, 20) && text(u.skill) && number(u.leadership, 100) && number(u.force, 100) && number(u.intellect, 100) && number(u.politics,100), '守军数据无效');
    }
  }
  const armyIds = new Set();
  for (const army of value.armies) {
    require(army && /^a\d+$/.test(army.id) && !armyIds.has(army.id) && faction(army.faction) && cityById(value, army.location) && tactic(army.tactic) && text(army.name, 30) && text(army.task, 20), '军团数据无效');
    armyIds.add(army.id);
    require(Array.isArray(army.units) && army.units.length > 0 && army.units.length <= (strategic ? Object.keys(OFFICER_BY_ID).length : scenario ? 30 : 15) && Array.isArray(army.route) && army.route.length <= initial.cities.length && army.route.every(id => cityById(value, id)) && number(army.supply) && number(army.morale, 100), '军团数据不完整');
    require(army.target === null || cityById(value, army.target));
    require(!army.route.length || army.target === army.route.at(-1));
    for (const role of ['leader', 'advisor']) require(army.units.some(u => u.id === army[role]));
    require(army.deputy === null || army.units.some(u => u.id === army.deputy));
    for (const u of army.units) {
      validateUnit(u); require(!seen.has(u.id), '武将重复'); seen.add(u.id);
    }
  }
  const context = p => {
    require(p && armyIds.has(p.attackerId) && cityById(value, p.cityId) && cityById(value, p.origin) && faction(p.defenderFaction) && Array.isArray(p.defenderIds) && p.defenderIds.every(id => armyIds.has(id)), '交战信息无效');
  };
  if (value.pending !== null) context(value.pending);
  if (value.battle !== null) {
    const b = value.battle; context(b?.context);
    require(validRelationshipTypes(b.relationshipTypes),'战场人物关系类型无效');
    require(validRelationshipScores(b.relationshipScores,b.relationshipTypes),'战场人物关系值无效');
    for(const field of ['relationshipScores','relationshipTypes'])require(b.result||Object.keys({...value[field],...b[field]}).every(key=>value[field][key]===b[field][key]),'战场与存档人物关系值或类型不一致');
    require(b.gridType==='hex'&&Object.hasOwn(BATTLE_TERRAINS,b.terrain),'战场网格或地形无效');
    const battleLimit=scenario?.limit||(strategic?CAMPAIGN_TIME.stepsPerDay*CAMPAIGN_TIME.maxBattleDays:240);
    require(scenario ? b.maxTicks === scenario.limit : strategic ? b.maxTicks === battleLimit : b.maxTicks === undefined, '战斗时限无效');
    require(b.holdUntil===scenario?.holdUntil,'坚守目标无效');
    if(b.result?.reason==='坚守成功')require(b.holdUntil&&b.tick>=b.holdUntil&&b.result.winner===0&&!b.sides[0].retreat&&remainingUnits(b,0).length>0&&b.siege?.gate.side===0&&b.siege.gate.hp>0,'坚守战果无效');
    if (scenario?.gateHp) {
      const siege = b.siege, gate = siege?.gate, attackerSide = scenario.defending || scenario.id === 'defense' ? 1 : 0;
      require(siege && siege.attackerSide === attackerSide && gate && gate.id === 'siege-gate' && gate.name === '城门' && gate.type === 'gate' && gate.side === 1-attackerSide && gate.x === (attackerSide===1?1:12) && gate.y === 4 && gate.maxHp === scenario.gateHp && number(gate.hp,gate.maxHp), '城防数据无效');
      if(gate.lastDamagedTick!==undefined)require(number(gate.lastDamagedTick,b.tick),'城门受击时间无效');
      require(gate.hp > 0 || b.result?.winner === attackerSide && b.result?.reason === '城门失守', '城门战果无效');
    } else if (strategic && b.siege) {
      const g=b.siege.gate;
      require(g && g.id==='siege-gate' && g.type==='gate' && [0,1].includes(g.side) && b.siege.attackerSide===1-g.side && g.x===(g.side===0?1:12) && g.y===4 && number(g.maxHp) && g.maxHp>0 && number(g.hp,g.maxHp),'城防数据无效');
    } else require(b.siege === undefined, '城防数据无效');
    require(b.enemyCommand&&typeof b.enemyCommand==='object'&&!Array.isArray(b.enemyCommand),'敌军军略数据无效');
    for(const resource of [b,b.enemyCommand]){
      require(number(resource.commandProgress,COMMAND_RESOURCE.capacity),'军略积累数据无效');
      require(resource.commandReady&&typeof resource.commandReady==='object'&&!Array.isArray(resource.commandReady)&&number(resource.commandSerial),'军略冷却数据无效');
      for(const [key,ready] of Object.entries(resource.commandReady))require([...Object.keys(STRATAGEMS),'focus','reserve','retreat'].includes(key)&&number(ready),'军略冷却数据无效');
      require(resource.lastCommand===null||resource.lastCommand&&[...Object.keys(STRATAGEMS),'focus','reserve','retreat'].includes(resource.lastCommand.key)&&number(resource.lastCommand.tick,b.tick)&&resource.lastCommand.serial===resource.commandSerial,'军略记录无效');
    }
    require(typeof b.deploymentLocked === 'boolean' && (b.tick === 0 || b.deploymentLocked) && b.commandReady && !Array.isArray(b.commandReady) && typeof b.commandReady === 'object' && number(b.commandSerial));
    for (const [key, ready] of Object.entries(b.commandReady)) require([...Object.keys(STRATAGEMS),'focus','reserve','retreat'].includes(key) && number(ready));
    if (b.lastCommand) require([...Object.keys(STRATAGEMS),'focus','reserve','retreat'].includes(b.lastCommand.key) && number(b.lastCommand.tick) && number(b.lastCommand.serial));
    require(!value.pending && !value.report && Array.isArray(b.context.attackingIds) && b.context.attackingIds.includes(b.context.attackerId) && b.context.attackingIds.every(id => armyIds.has(id)));
    require(text(b.id) && b.cityId === b.context.cityId && number(b.tick, battleLimit) && number(b.seed) && number(b.commandCooldown) && Array.isArray(b.sides) && b.sides.length === 2 && b.settled === false && (b.result === null || result(b.result)), '战斗数据无效');
    if(b.domesticOpening!==undefined){const p=b.domesticOpening;require(strategic&&b.siege&&p&&p.side===1-b.siege.attackerSide&&Number.isFinite(p.intent)&&p.intent>=0&&p.intent<=30&&Number.isFinite(p.shield)&&p.shield>=0&&p.shield<=.35&&typeof p.applied==='boolean'&&p.applied===b.deploymentLocked&&(p.intentId===null||number(p.intentId))&&(p.shieldId===null||number(p.shieldId)),'守城内政开场状态无效');}
    const unitIds = new Set(), positions = new Set();
    b.sides.forEach((side, index) => {
      side.commanders=[...new Set([...b.context.attackingIds,...b.context.defenderIds])].map(id=>armyById(value,id)).filter(a=>a.faction===side.faction).flatMap(armyCommanders);
      for (const key of ['rangeUntil','recoveryUntil','assaultUntil','fortifyUntil','disruptUntil','hasteUntil','blockadeUntil','reliefUntil']) require(number(side[key]));
      require(side&&((side.battleIntent===undefined&&!b.deploymentLocked)||Object.hasOwn(BATTLE_INTENTS,side.battleIntent)),'战斗意图无效');
      require(side && faction(side.faction) && tactic(side.tactic) && typeof side.retreat === 'boolean' && number(side.focusUntil) && number(side.inspireUntil) && (side.focus === null || text(side.focus)) && Array.isArray(side.units) && side.units.length <= (strategic ? Object.keys(OFFICER_BY_ID).length : 30));
      require(side.units.filter(u => u.status === 'active').length <= 6, '战场超出容量');
      require(b.terrain==='river'||!side.units.some(u=>u.type==='ship'),'舰船需要河流战场');
      for (const u of side.units) {
        validateUnit(u, true);
        require(u.arrivalTick === undefined && u.wave === undefined || (strategic && number(u.wave,Object.keys(OFFICER_BY_ID).length) && u.wave>0 && number(u.arrivalTick,b.tick)) || (scenario && number(u.wave,scenario.waves.length) && u.wave > 0 && u.arrivalTick === scenario.waves[u.wave-1].tick && (u.status === 'reserve' || u.arrivalTick <= b.tick)), '援军到达时间无效');
        require(!unitIds.has(u.id) && u.side === index && typeof u.armyId === 'string' && (armyIds.has(u.armyId) || u.armyId === `city:${b.cityId}`)); unitIds.add(u.id);
        require(number(u.intent,COMBAT.intentCap),'战意数据无效');
        require(Number.isFinite(u.moveProgress)&&u.moveProgress>=0&&u.moveProgress<1,'移动进度无效');
        const ps=u.passiveState;
        require(ps&&typeof ps==='object'&&!Array.isArray(ps)&&number(ps.lastMoveTick,b.tick)&&number(ps.shots,100000)&&typeof ps.reserveEntered==='boolean'&&number(ps.entryUntil,b.tick+15)&&(ps.entryUntil===0||ps.reserveEntered)&&
          (ps.targetId===null||text(ps.targetId,40))&&(ps.shotType===null||Object.hasOwn(TROOPS,ps.shotType))&&Number.isFinite(u.attackCarry)&&u.attackCarry>=0&&u.attackCarry<1&&typeof u.participated==='boolean','被动技能状态无效');
        const sourceOfficer=armyById(value,u.armyId)?.units.find(v=>v.id===u.id);
        if(sourceOfficer){require(u.level===sourceOfficer.level&&u.experience===sourceOfficer.experience,'战场等级与武将数据不一致');require(JSON.stringify(u.tacticLearning)===JSON.stringify(sourceOfficer.tacticLearning),'战场战法学习与武将数据不一致');}
        require(number(u.battleDamage)&&number(u.healed)&&number(u.battleDeserted||0,u.battleDamage)&&(strategic||!u.battleDeserted)&&u.battleDamage-u.healed===u.initial-u.hp&&u.healed<=Math.floor((u.battleDamage-(u.battleDeserted||0))*.35),'伤兵治疗数据无效');
        const skills=unitTactics(u).map(s=>s.id);
        for(const map of [u.skillReady,u.tacticCasts]) {
          require(map && typeof map==='object' && !Array.isArray(map),'战法冷却数据无效');
          for(const [key,n] of Object.entries(map))require(skills.includes(key)&&number(n),'战法冷却数据无效');
        }
        require(u.statuses && typeof u.statuses==='object' && !Array.isArray(u.statuses),'状态数据无效');
        for(const [key,status] of Object.entries(u.statuses)) {
          for(const field of ['sourceName','sourceSkillName','sourceNote'])if(status?.[field]!==undefined)require(text(status[field],100),'状态来源无效');
          if(status?.origins!==undefined)require(Array.isArray(status.origins)&&status.origins.length<=512&&status.origins.every(o=>o&&text(o.sourceSkillName,100)&&(o.sourceName===undefined||text(o.sourceName,100))),'叠层状态来源无效');
          require(['attackOrb','illusion','curse','blight','plague','bulwark','riposte','camp','regrowth','phase','phaseLock','emplaced','shaken','nexus','anchored','burningAttack','strategyAttack','phalanx','haste','valor','burn','scorch','slow','armorBreak','shield','stun','resolve','confuse','seal','weaken','ward','taunt','pursuit'].includes(key) && status && number(status.until),'状态数据无效');
          if(key==='attackOrb')require(ATTACK_ORBS[status.skillId]&&skills.includes(status.skillId)&&Number.isInteger(status.charges)&&status.charges>=1&&status.charges<=ATTACK_ORBS[status.skillId].charges&&status.until===(b.maxTicks||240)+1&&text(status.sourceSkillName,100)&&status.sourceId===u.id,'强化普攻次数或来源无效');
          if(key==='curse')require(Number.isInteger(status.stacks)&&status.stacks>=1&&status.stacks<=3,'衰咒层数无效');
          if(status.potency!==undefined)require(Number.isFinite(status.potency)&&status.potency>=POWER_RULES.minFactor*(['valor','camp'].includes(key)?.4:1)&&status.potency<=POWER_RULES.maxFactor,'战法威力快照无效');
          if(key==='illusion')require(Number.isInteger(status.hits)&&status.hits>=1&&status.hits<=3,'幻卫次数无效');
          if(key==='riposte')require(number(status.lastTick,b.tick),'反击步数无效');
          if(['plague','regrowth'].includes(key))require(number(status.amount,1000000)&&text(status.sourceId,40),'持续效果无效');
          if(key==='taunt')require(text(status.sourceId,40),'嘲讽来源无效');
          if(key==='pursuit')require(u.type==='cavalry'&&text(status.targetId,40),'追击目标无效');
          if(key==='ward')require(number(status.percent,80));
          if(key==='shield') {
            require(number(status.amount,u.maxHp));
            require(Array.isArray(status.layers)&&status.layers.length>0&&status.layers.length<=60&&status.layers.every(l=>l&&number(l.amount,u.maxHp)&&l.amount>0&&number(l.until)&&text(l.source)&&text(l.label)), '护盾层无效');require(new Set(status.layers.map(l=>l.source)).size===status.layers.length,'护盾来源重复');require(status.amount===status.layers.reduce((n,l)=>n+l.amount,0)&&status.until===Math.max(...status.layers.map(l=>l.until)),'护盾汇总无效');
          }
          if(key==='burn'||key==='scorch')require(number(status.amount,1000000) && typeof status.sourceId==='string');
          if(key==='burningAttack')require(['martialPower','strategyPower'].includes(status.powerStat)&&[6/280+.03,6/280+.04].includes(status.rate),'燃击威力无效');
          if(key==='burn')require(number(status.baseAmount,1000000)&&Number.isInteger(status.stacks)&&status.stacks>=1&&status.stacks<=3&&status.amount===status.baseAmount*status.stacks,'燃烧层数无效');
        }
        require(['active', 'reserve', 'defeated', 'withdrawn'].includes(u.status) && number(u.hp) && number(u.initial,troopCapacity(u)) && u.initial > 0 && u.hp <= u.initial && u.maxHp === u.initial && number(u.morale, 100) && Number.isFinite(u.cooldown)&&u.cooldown>=0&&u.cooldown<=Number.MAX_SAFE_INTEGER && number(u.intent,COMBAT.intentCap) && text(u.action), '部队状态无效');
        require(u.skillCasts === undefined || number(u.skillCasts), '战法次数无效');
        require(u.cast===null,'不支持旧版待施放状态，请重新开始');
        for (const key of ['commandBonus', 'deputyBonus', 'advisorBonus']) require(u[key] === undefined || Number.isFinite(u[key]) && u[key] >= 0 && u[key] <= 1);
        if (u.status === 'active') { require(number(u.x, 13) && number(u.y, 7) && canOccupy(b,u,u.x,u.y) && u.hp > 0 && !positions.has(`${u.x},${u.y}`), '战场位置无效'); positions.add(`${u.x},${u.y}`); }
      }
    });
    require(Array.isArray(b.buildings)&&b.buildings.length<=111,'建筑列表无效');
    const buildingCells=new Set();
    for(const a of battleBuildings(b)){
      require(a&&text(a.id,40)&&!unitIds.has(a.id)&&text(a.name,20)&&[0,1].includes(a.side)&&number(a.x,13)&&number(a.y,7)&&number(a.maxHp)&&a.maxHp>0&&number(a.hp,a.maxHp),'建筑数据无效');
      if(a!==b.siege?.gate)require(a.type==='building'&&text(a.kind,40)&&a.kind.trim().length>0,'建筑分类无效');
      if(a.lastDamagedTick!==undefined)require(number(a.lastDamagedTick,b.tick),'建筑受击时间无效');
      const key=a.x+':'+a.y;require(!buildingCells.has(key),'建筑位置重复');buildingCells.add(key);unitIds.add(a.id);
    }
    require(Array.isArray(b.logs) && b.logs.length <= 70 && b.logs.every(l => l && number(l.tick) && typeof l.text === 'string' && l.text.length < 1000));
    for(const u of b.sides.flatMap(s=>s.units))require(u.passiveState.targetId===null||unitIds.has(u.passiveState.targetId),'普攻连续目标无效');
    for(const u of b.sides.flatMap(s=>s.units))for(const key of ['burn','scorch','plague','regrowth'])if(u.statuses[key])require(unitIds.has(u.statuses[key].sourceId),'灼烧来源无效');
    for(const u of b.sides.flatMap(s=>s.units))for(const [key,field] of [['taunt','sourceId'],['pursuit','targetId']])if(u.statuses[key])require(b.sides[1-u.side].units.some(e=>e.id===u.statuses[key][field]),'引战或追击目标阵营无效');
    require(Array.isArray(b.effects) && b.effects.length <= 256 && b.effects.every(e => e && unitIds.has(e.from) && unitIds.has(e.to) && number(e.damage) && typeof e.skill === 'boolean' && number(e.x, 13) && number(e.y, 7) && (e.text===undefined || text(e.text))));
    const comboActors = (actors,side) => Array.isArray(actors)&&actors.length>0&&actors.length<=6&&new Set(actors.map(a=>a.id)).size===actors.length&&actors.every(a=>{
      const u=b.sides[side].units.find(u=>u.id===a.id);
      return u&&a.name===u.name&&Object.hasOwn(TACTICS_BOOK,a.skillId)&&number(a.x,13)&&number(a.y,7);
    });
    require(Array.isArray(b.comboCounts)&&b.comboCounts.length===2&&b.comboCounts.every(n=>number(n,10000)),'连携计数无效');
    require(Array.isArray(b.comboWindows)&&b.comboWindows.length<=120,'连携窗口无效');
    const comboKeys=new Set();
    for(const c of b.comboWindows) {
      require(c&&[0,1].includes(c.side)&&unitIds.has(c.targetId)&&number(c.tick,b.tick)&&comboActors(c.actors,c.side),'连携记录无效');
      const key=c.side+':'+c.targetId;require(!comboKeys.has(key),'连携记录重复');comboKeys.add(key);
    }
    for(const e of b.effects) {
      if(e.sharedTargets!==undefined||e.damageShare!==undefined)require(!e.skill&&Number.isInteger(e.sharedTargets)&&e.sharedTargets>=2&&e.sharedTargets<=6&&e.damageShare===1/e.sharedTargets,'普攻分摊记录无效');
      if(e.castPower!==undefined)require(Number.isFinite(e.castPower)&&e.castPower>=0&&e.castPower<=100000,'战法威力记录无效');
      if(e.critical!==undefined||e.critChance!==undefined)require(typeof e.critical==='boolean'&&Number.isFinite(e.critChance)&&e.critChance>=.05&&e.critChance<=.3&&e.skill&&!e.ongoing,'暴击判定无效');
      if(e.resolution!==undefined){const r=e.resolution;require(r&&Object.hasOwn(CHANCE_EFFECT_NAMES,r.effect)&&Number.isFinite(r.chance)&&typeof r.success==='boolean'&&typeof r.immune==='boolean'&&(r.immune?r.chance===0&&!r.success:r.chance>=.25&&r.chance<=.95),'效果成功判定无效');}
      if(e.shieldAbsorbed!==undefined)require(number(e.shieldAbsorbed),'护盾吸收数值无效');
      if(e.outcome!==undefined)require(Array.isArray(e.outcome)&&e.outcome.length<=61&&e.outcome.every(t=>t&&unitIds.has(t.id)&&text(t.name)&&number(t.damage)&&number(t.healing)&&number(t.absorbed)&&typeof t.defeated==='boolean'&&Array.isArray(t.changes)&&t.changes.length<=50&&t.changes.every(s=>text(s,500))),'战法结算记录无效');
      if(e.healing!==undefined)require(number(e.healing),'治疗表现数值无效');
      if(e.repaired!==undefined)require(number(e.repaired),'修缮表现数值无效');
      if(e.intentRestored!==undefined)require(number(e.intentRestored,COMBAT.intentCap),'恢复战意数值无效');
      if(e.intentDenied!==undefined||e.intentBlock!==undefined)require(number(e.intentDenied,10)&&e.intentDenied>0&&['截气','断势'].includes(e.intentBlock),'战意压制表现无效');
      if(e.damageKind!==undefined)require(['force','intellect','dot'].includes(e.damageKind),'伤害类型无效');
      if(e.comboLevel!==undefined)require([2,3].includes(e.comboLevel),'连携等级无效');
      if(e.combo) {const c=e.combo,source=b.sides[e.side]?.units.find(u=>u.id===e.from);require(e.phase==='impact'&&e.skill&&[2,3].includes(c.level)&&c.bonus===(c.level===2?COMBO.doubleBonus:COMBO.tripleBonus)+(source&&hasPassive(source,'combo')?5:0)&&comboActors(c.actors,e.side)&&c.actors.length>=c.level&&text(c.targetName,20),'连携特效无效');}
    }
    for (const e of b.effects) if (e.phase !== undefined) require(['cast', 'impact'].includes(e.phase) && ['charge', 'fire', 'shockwave', 'banner', 'volley', 'slash'].includes(e.visual) && Object.hasOwn(TROOPS, e.troop) && [0, 1].includes(e.side) && text(e.name) && text(e.label) && number(e.fromX, 13) && number(e.fromY, 7), '战法表现事件无效');
  }
  if (value.report !== null) {
    const r = value.report;
    if(r?.reason==='坚守成功')require(scenario?.holdUntil&&r.tick>=scenario.holdUntil&&r.winner===0&&r.gate?.side===0&&r.gate.remaining>0&&r.stats?.[0]?.remaining>0,'坚守战报无效');
    require(result(r) && text(r.id) && initial.cities.some(c => c.name === r.city) && faction(r.owner) && typeof r.captured === 'boolean' && number(r.tick, scenario?.limit || 240) && number(r.reward) && Array.isArray(r.stats) && r.stats.length === 2, '战报数据无效');
    if (scenario?.gateHp) require(r.gate && r.gate.initial === scenario.gateHp && number(r.gate.remaining,r.gate.initial) && r.gate.side === (scenario.defending||scenario.id==='defense'?0:1), '城门战报无效');
    else require(r.gate === undefined && r.reason !== '城门失守', '城门战报无效');
    for (const s of r.stats) { require(s && faction(s.faction)); for (const key of ['initial', 'remaining', 'wounded', 'killed']) require(number(s[key])); require(s.initial === s.remaining + s.wounded + s.killed); }
    require(Array.isArray(r.growth)&&r.growth.length<=(scenario?60:15)&&new Set(r.growth.map(g=>g?.id)).size===r.growth.length&&r.growth.every(g=>g&&(Object.hasOwn(OFFICER_BY_ID,g.id)||scenario&&/^test-\d{1,2}$/.test(g.id))&&text(g.name,20)&&[0,1].includes(g.side)&&number(g.before,10)&&g.before>=1&&number(g.after,10)&&g.after>=g.before&&number(g.gained,150)&&Array.isArray(g.unlocked)&&g.unlocked.length<=30&&g.unlocked.every(s=>text(s,20))),'成长战报无效');
  }
  return value;
}
