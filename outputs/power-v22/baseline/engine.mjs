import {OFFICER_BY_ID,officerProfile,PROFILE_FIELDS,RELATION_LIST_FIELDS} from './officer-catalog.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {relationshipInfo,validRelationshipScores,validRelationshipTypes} from './relationships.mjs';
import {hexDistance, hexNeighbors, hexBeyond} from './hex-grid.mjs';
import { TROOPS, unitAttributes, disciplineDuration, isRear } from './unit-stats.mjs';
import {intentIncome, deniesHitIntent, hasPassive, initialPassiveState, moved, recordBasicAttack, passiveDamageMultiplier, passiveDamageTaken, supportMultiplier, SKILL_ROUTES, commonRouteName} from './passives.mjs';
import {gainExperience, experienceNeeded, PROGRESSION} from './progression.mjs';
import { blockedTerrain, gateTarget, canOccupy, BATTLE_TERRAINS } from './battlefield.mjs';
import {tacticTerrainEffect,fireTerrainFactor} from './terrain-rules.mjs';
import {planEnemyArmy,chooseEnemyCommand} from './battle-ai.mjs';
import {meleeTargetPool,interceptorsAt,canStrikeFrom,holdsLine} from './engagement.mjs';
import { SCENARIOS } from './scenario-catalog.mjs';
import { COMBAT, RULES_VERSION } from './combat-rules.mjs';
import {snapshotTactic,tacticOutcome} from './tactic-outcomes.mjs';
import {FAMOUS_OFFICERS} from './famous-officers.mjs';
import {famousTargets, expandedSupportTargets, basicSupportTargets, areaTacticTargets, exposedTarget, tauntTarget, pursuitTarget, flankingTarget, supportAnchor} from './tactics.mjs';
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
  heal: { name:'援军急救', group:'support', cost:1, duration:0, description:'救治在场各队本场伤兵，每队最多恢复初始兵力 8%；不复活溃败部队', side:0, icon:'home' },
  regenerate: { name:'休养生息', group:'support', cost:1, duration:12, description:'在场各队每步救治初始兵力 1% 的本场伤兵', side:0, field:'recoveryUntil', icon:'home' },
  range: { name:'引弦远射', group:'offense', cost:1, duration:16, description:'我军弓弩普攻及武力射击战法射程 +2 格，智力战法范围不变', side:0, field:'rangeUntil', icon:'sword' },
  firestorm: { name:'火攻连营', group:'control', cost:1, duration:12, description:'使当前在场敌军每步损失初始兵力 0.6%，可净化、可用护盾吸收；不产生战意', side:1, icon:'wind' },
  assault: { name:'击鼓催锋', group:'offense', cost:1, duration:18, description:'我军全体攻击 +25%', side:0, field:'assaultUntil', icon:'sword' },
  fortify: { name:'坚壁列阵', group:'support', cost:1, duration:18, description:'我军全体防御 +30%', side:0, field:'fortifyUntil', icon:'home' },
  inspire: { name:'擂鼓振军', group:'support', cost:1, duration:0, description:'我军全体战意 +35', side:0, icon:'crown' },
  disrupt: { name:'离间疲敌', group:'control', cost:1, duration:16, description:'敌军全体攻击、防御 −20%', side:1, field:'disruptUntil', icon:'wind' },
  demoralize: { name:'夺气攻心', group:'control', cost:1, duration:0, description:'敌军全体战意 −45（最低为 0），不打断施法', side:1, icon:'wind' },
  cleanse: { name:'鸣金整阵', group:'support', cost:1, duration:0, description:'清除我军控制、灼烧与减益，并获得 3 步控制保护', side:0, icon:'flag' },
  haste: { name:'疾行赴援', group:'offense', cost:1, duration:10, description:'我军移动力 +1，预备队入场时同样受益', side:0, field:'hasteUntil', icon:'wind' },
  cycle: { name:'轮番进击', group:'offense', cost:1, duration:0, description:'我军所有正在冷却的战法缩短 6 步', side:0, icon:'sword' },
  blockade: { name:'烽火断援', group:'control', cost:1, duration:10, description:'延迟敌方预备队补入战场 10 步，不移除敌军', side:1, field:'blockadeUntil', icon:'flag' },
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
};
export const COMMAND_RESOURCE = { capacity:12000 };
export const officerStratagems = id => OFFICER_STRATAGEMS[id] || [];
export function armyCommanders(army) {
  return ['leader','advisor'].flatMap(role=>{const u=army.units.find(u=>u.id===army[role]);return u?[{id:u.id,name:u.name,role,armyId:army.id}]:[];});
}
export const armyStratagems = army => [...new Set(armyCommanders(army).flatMap(c=>officerStratagems(c.id)))];
export const battleStratagems = (b,side=0) => [...new Set((b.sides[side].commanders||[]).flatMap(c=>officerStratagems(c.id)))];
export const commandIntellect = (b,side=0) => b.sides[side].retreat ? 0 : activeUnits(b,side).reduce((n,u)=>n+u.intellect,0);
export function attackRange(b,u) {return unitAttributes(u,b).range;}
export function battleWounded(u) {return Math.max(0,Math.floor((u.battleDamage??u.initial-u.hp)*.35)-(u.healed||0));}
function takeCasualties(u,damage) {
  u.battleDamage ??= u.initial-u.hp;u.healed ??=0;
  damage=Math.min(u.hp,damage);u.hp-=damage;u.battleDamage+=damage;return damage;
}
function healWounded(b,u,fraction,ongoing=false) {
  if(u.status!=='active'||u.hp<=0)return 0;
  const amount=Math.min(battleWounded(u),Math.floor(u.maxHp*fraction*(hasStatus(b,u,'blight')?.5:1)),u.maxHp-u.hp);
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
  cao: { name: '曹操', short: '曹', color: '#79b3a1' },
  yuan: { name: '袁绍', short: '袁', color: '#c17d71' },
  neutral: { name: '地方势力', short: '守', color: '#b29c77' },
};
const OFFICERS = [
  ['cao', '曹操', '孟德', 96, 82, 91, '魏武挥鞭', 'spear', 'front', '雄才大略'],
  ['dun', '夏侯惇', '元让', 88, 92, 62, '拔矢啖睛', 'spear', 'front', '刚烈奋勇'],
  ['liao', '张辽', '文远', 93, 94, 80, '威震逍遥', 'cavalry', 'front', '勇略过人'],
  ['chu', '许褚', '仲康', 80, 98, 40, '虎痴怒击', 'spear', 'middle', '悍勇护主'],
  ['jia', '郭嘉', '奉孝', 79, 42, 98, '奇谋破阵', 'crossbow', 'back', '料敌先机'],
  ['yu', '荀攸', '公达', 83, 45, 96, '声东击西', 'crossbow', 'back', '谋定后动'],
  ['yuanxia', '夏侯渊', '妙才', 88, 91, 70, '疾风奔袭', 'archer', 'back', '神速奔袭'],
  ['jin', '于禁', '文则', 90, 78, 75, '坚壁清野', 'spear', 'middle', '治军严整'],
  ['shao', '袁绍', '本初', 86, 72, 78, '四世三公', 'spear', 'front', '名门雄主'],
  ['yan', '颜良', '公骥', 84, 96, 43, '河北雄锋', 'cavalry', 'front', '勇冠三军'],
  ['wen', '文丑', '子恒', 82, 95, 42, '破阵长驱', 'cavalry', 'front', '锐不可当'],
  ['he', '张郃', '儁乂', 91, 90, 77, '巧变奇袭', 'spear', 'middle', '善识地势'],
  ['ju', '沮授', '公与', 84, 38, 93, '料敌布防', 'crossbow', 'back', '筹略深远'],
  ['tian', '田丰', '元皓', 80, 35, 94, '审势定谋', 'archer', 'back', '刚直多谋'],
  ['gao', '高览', '敬志', 82, 87, 65, '奋武突击', 'spear', 'front', '沉毅善战'],
];
export function makeOfficer(id, troops = 3000, index = 0, level = 1) {
  const source=OFFICER_BY_ID[id];
  if(!Object.hasOwn(OFFICER_BY_ID,id))throw new Error('未知武将');
  const legacy=OFFICERS.find(row=>row[0]===id);
  const unit={...officerProfile(id),id,name:source.name,courtesy:source.courtesy,leadership:source.leadership,force:source.force,intellect:source.intellect,politics:source.politics,
    skill:legacy?.[6]||FAMOUS_OFFICERS[id]?.tactic?.name||'',type:source.type,formation:legacy?.[8]||source.formation,trait:legacy?.[9]||FAMOUS_OFFICERS[id]?.role||commonRouteName({id}),
    troops,wounded:0,first:index<6,loyalty:100,level,experience:0};
  if(!Number.isInteger(level)||level<1||level>10)throw new Error('武将等级须为 1～10');
  if(!Number.isSafeInteger(troops)||troops<0||troops>troopCapacity(unit))throw new Error(`${unit.name}带兵须为 0～${troopCapacity(unit)} 人`);
  // The support officer starts with support even outside the battle lab.
  if(FAMOUS_OFFICERS[id])unit.tactics=recommendedTacticIds(unit);
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
    version: VERSION, rulesVersion:RULES_VERSION, officerDataVersion:2, relationshipScores:{}, relationshipTypes:{}, seed, turn: 1, gold: 3200, grain: 12800, fame: 120,
    cities, roads: [['ye', 'jinyang'], ['ye', 'baima'], ['ye', 'guandu'], ['jinyang', 'luoyang'], ['luoyang', 'guandu'], ['luoyang', 'xuchang'], ['guandu', 'baima'], ['guandu', 'xuchang'], ['baima', 'chenliu'], ['guandu', 'chenliu'], ['chenliu', 'xuchang'], ['chenliu', 'runan'], ['xuchang', 'runan'], ['xuchang', 'wan'], ['luoyang', 'wan'], ['wan', 'runan']],
    armies: [
      { id: 'a1', name: '虎贲军', faction: 'cao', location: 'xuchang', route: [], target: null, supply: 900, morale: 80, tactic: 'balanced', leader: 'cao', advisor: 'jia', deputy: 'dun', units: OFFICERS.slice(0, 8).map((r, i) => makeOfficer(r[0], 3000, i)), task: '驻守' },
      { id: 'a2', name: '河北军', faction: 'yuan', location: 'guandu', route: [], target: null, supply: 900, morale: 75, tactic: 'aggressive', leader: 'shao', advisor: 'ju', deputy: 'yan', units: OFFICERS.slice(8).map((r, i) => makeOfficer(r[0], 2500, i)), task: '驻守' },
    ],
    logs: [], battle: null, report: null, pending: null, nextId: 3, victories: 0, finished: null,
  };
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
function combatUnit(u, armyId, side, morale) {
  return { ...u, ...officerProfile(u.id), level:u.level??1,experience:u.experience??0,skillRouteType:u.skillRouteType||u.type,passiveState:initialPassiveState(),participated:false,attackCarry:0,armyId, side, hp: u.troops, maxHp: u.troops, initial: u.troops, battleDamage:0, healed:0, moveProgress:0, status: 'reserve', x: -1, y: -1, morale, cooldown: 0, intent:0, cast: null, skillReady:{}, tacticCasts:{}, statuses:{}, skillCasts: 0, action: '候命', effect: null };
}
export function configureUnitTactics(state,unitId,ids) {
  if(state.battle&&!isDeploying(state.battle))return '开战后战法锁定，暂停也不能更换';
  const source=state.armies.filter(a=>a.faction==='cao').flatMap(a=>a.units).find(u=>u.id===unitId);
  const live=state.battle?.sides[0].units.find(u=>u.id===unitId);
  if(!source&&!live)return '找不到己方部队';
  if(!validLoadout(live||source,ids))return '请选择本兵种或本武将可用的 3 个不同战法';
  if(source)configureTactics(source,ids);
  if(live) {configureTactics(live,ids);live.skillReady={};live.tacticCasts={};live.cast=null;}
  return null;
}
export function startBattle(state) {
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
    sides[index].units.push(...garrisonUnits(city).map(u => combatUnit(u, `city:${city.id}`, index, 70)));
  }
  state.battle = { id: `battle-${state.turn}-${state.nextId++}`, cityId: city.id, context: { ...p, attackingIds: attacking.map(a => a.id) }, tick: 0, seed: state.seed + state.turn, sides, gridType:'hex', terrain:sides.some(s=>s.units.some(u=>u.type==='ship'))?'river':'land', relationshipScores:structuredClone(state.relationshipScores||{}), relationshipTypes:structuredClone(state.relationshipTypes||{}), comboWindows:[], comboCounts:[0,0], commandProgress:0, commandCooldown: 0, commandReady:{}, commandSerial:0, lastCommand:null, enemyCommand:{commandProgress:0,commandReady:{},commandSerial:0,lastCommand:null}, deploymentLocked:false, logs: [], effects: [], result: null, settled: false };
  fillSlots(state.battle, 0); fillSlots(state.battle, 1);
  planEnemyArmy(state.battle);
  battleLog(state.battle,'敌军已根据兵种、属性和地形选择战法并布阵；开战后独立积累军略。');
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
export function lockDeployment(b) {
  if (!isDeploying(b)) return '当前不在布阵阶段';
  b.deploymentLocked = true;
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
function fillSlots(b, side) {
  if (b.sides[side].retreat) return;
  if((b.sides[side].blockadeUntil||0)>b.tick)return;
  for (const unit of b.sides[side].units.filter(u => u.status === 'reserve' && u.hp > 0)) {
    if ((unit.arrivalTick || 0) > b.tick) continue;
    if (activeUnits(b, side).length >= 6) break;
    if(!spawn(b, unit))continue;
    if((b.sides[side].reliefUntil||0)>b.tick)setStatus(b,unit,'shield',8,{amount:Math.round(unit.maxHp*.15),source:'army:relief',label:'后军固阵'});
    if (b.tick) battleLog(b, `${unit.name}率${TROOPS[unit.type].name}补入战线。`);
  }
}
export function issueCommand(b, command, targetId = null, side = 0) {
  if (!b || b.result) return '战斗已经结束';
  if(![0,1].includes(side))return '无效军团';
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
    else if(command==='firestorm') {const source=activeUnits(b,side)[0];for(const u of activeUnits(b,other))setStatus(b,u,'scorch',12,{sourceId:source.id,amount:Math.max(1,Math.round(u.initial*.006))});}
    else if (strategy.field) b.sides[strategy.side===0?side:other][strategy.field] = b.tick + strategy.duration + 1;
    else for (const u of remainingUnits(b,strategy.side===0?side:other)) {
      if (command === 'demoralize') lowerIntent(u,45);
      else if(command==='cleanse') {for(const key of NEGATIVE_STATUSES)delete u.statuses[key];setStatus(b,u,'resolve',3);}
      else if(command==='cycle') {for(const id of Object.keys(u.skillReady))u.skillReady[id]=Math.max(b.tick,u.skillReady[id]-6);}
      else gainIntent(u,35);
    }
    const description=side?strategy.description.replaceAll('我军','敌方部队').replaceAll('敌军','我方部队'):strategy.description;
    battleLog(b,`${side?'敌军':'我军'}军略 · ${strategy.name}：${description}${strategy.duration ? `，持续 ${strategy.duration} 步` : command==='heal'?'（仅在场部队）':'（含预备队）'}。`);
  }
  if (command === 'focus') {
    const target = [...activeUnits(b, other), gateTarget(b,{side})].filter(Boolean).find(u => u.id === targetId);
    if (!target) return '请选择仍在场的敌方单位';
    b.sides[side].focus = targetId; b.sides[side].focusUntil = b.tick + 18;
    battleLog(b, `${side?'敌军':'我军'}军令 · 重兵合围：提高对${target.name}的攻击倾向，持续 18 步。`);
  }
  if (command === 'reserve') {
    const reserves = b.sides[side].units.filter(u => u.status === 'reserve' && u.hp > 0 && (u.arrivalTick || 0) <= b.tick);
    if (!reserves.length) return '没有可投入的预备队';
    const weakest = [...activeUnits(b, side)].sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0];
    if (activeUnits(b, side).length >= 6) {
      const limit=(b.sides[side].reliefUntil||0)>b.tick?.85:.65;
      if (weakest.hp / weakest.maxHp > limit) return `前线尚稳：满员时仅轮换兵力不高于 ${limit*100}% 的部队`;
      weakest.status = 'withdrawn'; weakest.action = '轮换离场';
      weakest.cast = null;
      battleLog(b, `${weakest.name}脱离前线，由预备队接防。`);
    }
    fillSlots(b, side); battleLog(b, (side?'敌军':'我军')+'军令 · 后军接阵：后军接替前锋。');
  }
  if (command === 'retreat') {
    b.sides[side].retreat = true;
    b.sides[side].units.forEach(u => { u.cast = null; });
    b.sides[side].units.filter(u => u.status === 'reserve').forEach(u => { u.status = 'withdrawn'; });
    battleLog(b, (side?'敌军':'我军')+'军令 · 鸣金收兵：各部向己方边缘撤离，撤离途中仍会受到攻击。');
  }
  if(command!=='retreat')resource.commandProgress=0; resource.commandCooldown = 0; resource.commandReady[command] = b.tick + (STRATAGEMS[command] ? 8 : 3);
  resource.commandSerial = (resource.commandSerial || 0) + 1;
  resource.lastCommand = { key:command, tick:b.tick, serial:resource.commandSerial };
  return null;
}
function pickTarget(b, unit, inRangeOnly = false) {
  const side = b.sides[unit.side];
  const enemies=[...activeUnits(b,1-unit.side),gateTarget(b,unit)].filter(Boolean);
  const forced=tauntTarget(b,unit,attackRange(b,unit));
  const pool=meleeTargetPool(b,unit,enemies);
  const focused=side.focusUntil>b.tick&&pool.some(e=>e.id===side.focus);
  const chase=!focused&&(pursuitTarget(b,unit,enemies)||flankingTarget(b,unit,enemies));
  return (forced?[forced]:chase?[chase]:pool).filter(t=>!inRangeOnly || distance(unit,t) <= attackRange(b,unit)&&distance(unit,t)>=(unitAttributes(unit,b).minRange||0)).sort((a, c) => {
    const score = target => {
      let s = distance(unit, target) * 9 + target.hp / target.maxHp * 7;
      if (counters(unit.type,target.type)) s -= 5;
      if (side.focus === target.id && side.focusUntil > b.tick) s -= 22;
      if (unit.type === 'cavalry' && isRear(target)) s -= 5;
      if (side.tactic === 'defensive') s += Math.abs(target.x - (unit.side === 0 ? 2 : 11)) * 2;
      if (b.siege?.gate.side === unit.side) s += distance(target,b.siege.gate)*4;
      return s;
    };
    return score(a) - score(c) || a.id.localeCompare(c.id);
  })[0];
}
function moveUnit(b, unit, target, retreat = false, supportRange = null) {
  const speed=unitAttributes(unit,b).move;
  if(speed<=0){unit.moveProgress=0;unit.action='固守 / 迟滞';return;}
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
  route ??= contactRoute;
  if (route?.length) {
    unit.moveProgress=(unit.moveProgress||0)+speed;const steps=Math.floor(unit.moveProgress);unit.moveProgress-=steps;
    if(!steps){unit.action='迟滞行军';return;}
    // Stop at first contact, even if speed would otherwise skip this hex.
    const contact=retreat?-1:route.findIndex(p=>interceptorsAt(b,unit,p).length);
    const next = route[Math.min(route.length, steps,contact<0?Infinity:contact+1) - 1];
    const from={x:unit.x,y:unit.y};unit.x = next.x; unit.y = next.y;moved(b,unit,from); unit.action = retreat ? '撤离' : `接近${target.name}`;
  } else unit.action = retreat ? '等待撤离' : defending ? '守护城门' : '调整阵线';
}
function combatEffect(b, attacker, target, skill, damage, phase = 'impact', definition=null, extra={}) {
  b.effects.push({ from: attacker.id, to: target.id, damage, skill, phase, visual: definition?.visual || skillVisual(attacker), troop: attacker.type, side: attacker.side, name: attacker.name, label: definition?.name || attacker.skill, fromX: attacker.x, fromY: attacker.y, x: target.x, y: target.y, ...extra });
}
function counters(a,c) { return TROOPS[a].beats===c || a==='cavalry' && c==='crossbow'; }
function damageGate(b, attacker, scale=1, definition=null) {
  const gate = b.siege.gate, own = unitAttributes(attacker,b);
  const damage = Math.min(gate.hp,Math.max(1,Math.round((own.attack+own.siege)*scale*own.strength*COMBAT.damageScale*(.9+random(b)*.2))));
  gate.hp -= damage;
  attacker.participated = true;
  attacker.cooldown = own.attackInterval-(attacker.attackCarry||0); attacker.attackCarry = 0;
  if(!definition)gainIntent(attacker,intentIncome(attacker).attack);
  attacker.action = `攻击城门 · ${damage}`;
  combatEffect(b,attacker,gate,!!definition,damage,'impact',definition);
  if (!gate.hp) {
    b.result = { winner:b.siege.attackerSide, reason:'城门失守' };
    battleLog(b,'城门耐久归零，守方败北。');
  }
}
function damageUnit(b, attacker, target, skill, scale=1, definition=null, generateIntent=true,allowCounter=true,terrainOverride=null,intentTargets=null) {
  if(!skill)recordBasicAttack(attacker,target);
  attacker.participated=true;target.participated=true;
  const own=unitAttributes(attacker,b),enemy=unitAttributes(target,b);
  const intellectual=skill?definition?.category==='intellect':hasStatus(b,attacker,'strategyAttack')||hasStatus(b,attacker,'cursingAttack');
  const kind=intellectual?'intellect':skill?'force':'basic';
  const power=skill?(intellectual?own.strategyPower:own.martialPower):intellectual?own.strategyPower*.8:own.attack;
  const resistance=intellectual?enemy.discipline:enemy.defense;
  const counter=counters(attacker.type,target.type)?1.28:counters(target.type,attacker.type)?.84:1;
  const pursuitBonus=!skill&&hasStatus(b,attacker,'pursuit')&&isRear(target)?1.35:1;
  const base=power*own.strength*counter*100/(100+resistance)*(1-enemy.damageReduction)*passiveDamageMultiplier(b,attacker,target,kind,!skill)*passiveDamageTaken(b,target,kind,!skill)*pursuitBonus;
  const terrain=skill&&definition?(terrainOverride??tacticTerrainEffect(b,attacker,definition,target)):null;
  let damage=Math.max(1,Math.round(base*(.9+random(b)*.2)*COMBAT.damageScale*scale*(terrain?.damage??1)));
  if(hasStatus(b,target,'illusion')){const illusion=target.statuses.illusion,blocked=Math.min(Math.round(damage*.5),Math.floor(target.maxHp*.08));damage-=blocked;illusion.hits--;combatEffect(b,target,target,true,0,'impact',TACTICS_BOOK.mirage,{text:'幻卫承伤 '+blocked,absorbed:blocked,ongoing:true});if(!illusion.hits)delete target.statuses.illusion;}
  const beforeShield=damage;
  damage=absorbShield(b,target,damage);
  const shieldAbsorbed=beforeShield-damage;
  damage=takeCasualties(target,damage); target.morale = Math.max(15, target.morale - (skill ? 5 : 1));
  attacker.morale = Math.min(100, attacker.morale + 3); if(!skill){attacker.cooldown = own.attackInterval-(attacker.attackCarry||0);attacker.attackCarry=0;}
  // Only normal attacks charge the attacker. A multi-hit tactic charges each victim once.
  if(!skill&&generateIntent)gainIntent(attacker,intentIncome(attacker).attack);
  let intentDenied=0;
  if (allowCounter && target.hp > 0 && damage>0 && !intentTargets?.has(target.id)) {
    if(deniesHitIntent(attacker,skill))intentDenied=intentIncome(target).hit;
    else gainIntent(target,intentIncome(target).hit);
    intentTargets?.add(target.id);
  }
  attacker.action = skill ? definition?.name || attacker.skill : `攻击${target.name}`;
  combatEffect(b, attacker, target, skill, damage,'impact',definition,{shieldAbsorbed,damageKind:intellectual?'intellect':'force',...(terrain?.label?{terrain:terrain.label,terrainFactor:terrain.damage}:{}),...(!allowCounter?{ongoing:true}:{}),...(intentDenied?{intentDenied,intentBlock:skill?'断势':'截气'}:{})});
  if(!skill&&target.hp>0&&hasStatus(b,attacker,'burningAttack')){
    const fire=attacker.statuses.burningAttack;
    setStatus(b,target,'burn',6,{sourceId:attacker.id,amount:Math.round(fire.amount*own.strength*100/(100+enemy.discipline))});
  }
  if(!skill&&target.hp>0&&hasStatus(b,attacker,'cursingAttack'))setStatus(b,target,'curse',10);
  if (target.hp <= 0) { target.status = 'defeated'; target.cast = null; target.action = '溃败'; battleLog(b, `${target.name}所部溃败，战线出现空位。`); }
  if(allowCounter&&target.hp>0&&attacker.hp>0&&distance(attacker,target)===1&&hasStatus(b,target,'riposte')&&target.statuses.riposte.lastTick!==b.tick&&!hasStatus(b,target,'stun')&&!hasStatus(b,target,'confuse')){target.statuses.riposte.lastTick=b.tick;damageUnit(b,target,attacker,true,.55,TACTICS_BOOK.riposte,false,false);}
}
function stun(b,u,steps,key='stun') {
  if(hasStatus(b,u,'resolve'))return;
  setStatus(b,u,key,steps);setStatus(b,u,'resolve',steps+3);
}
// The window is anchored to the first completed cast, never extended by a chain.
function comboCandidate(b,u,s,target) {
  if(['phalanx','gallop','valor','bulwark','riposte','anchor','emplace','passage'].includes(s.effect))return null;
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
  const boosted=(n,t=null,kind=null)=>Math.round(n*(1+bonus/100)*(t?supportMultiplier(u,t,kind):1));
  const duration=n=>n+(bonus?1:0),effectStart=b.effects.length;
  const status=(t,key,steps,extra={})=>{
    const terrain=terrainFor(t),adjusted=terrain.statuses.includes(key)?Math.max(1,Math.round(steps*noteTerrain(t).factor)):steps;
    setStatus(b,t,key,key==='seal'?disciplineDuration(b,t,duration(adjusted)):duration(adjusted),{...extra,...(key==='shield'?{source:u.id+':'+s.id,label:u.name+' · '+s.name}:{})});
  };
  const intentTargets=new Set();
  const hit=(t,scale=1.5,charge=true)=>u.hp>0&&t.hp>0&&damageUnit(b,u,t,true,scale*(1+bonus/100),s,charge,true,noteTerrain(t),intentTargets);
  const signal=(t=u,text=s.name)=>{t.participated=true;const terrain=noteTerrain(t);combatEffect(b,u,t,true,0,'impact',s,{text,...(terrain.label?{terrain:terrain.label}:{})});};
  const heal=(t,fraction)=>{
    const amount=Math.min(battleWounded(t),t.maxHp-t.hp,Math.round(boosted(t.maxHp*fraction,t,'healing')*(hasStatus(b,t,'blight')?.5:1)));
    if(amount<=0||t.status!=='active')return;
    t.hp+=amount;t.healed=(t.healed||0)+amount;u.participated=true;t.participated=true;
    combatEffect(b,u,t,true,0,'impact',s,{text:`救治 +${amount}`,healing:amount});
  };
  const control=(t,steps,key='stun')=>{
    const held=holdsLine(b,t);stun(b,t,steps,key);
    if(held&&!holdsLine(b,t)){
      signal(t,'拦截中断');
      battleLog(b,`${u.name}「${s.name}」使${t.name}暂时失去拦截，骑兵可沿空隙突入；其他前排仍能阻挡。`);
    }
  };
  const start={x:u.x,y:u.y};
  const power=statusPower(u,s,b), strength=unitAttributes(u,b).strength;
  const controlSteps=Math.max(2,Math.min(4,Math.round(2+power/140)));
  switch(s.effect) {
    case 'cleave':activeUnits(b,1-u.side).filter(t=>distance(u,t)===1).sort((a,c)=>a.id.localeCompare(c.id)).slice(0,3).forEach((t,i)=>{if(u.hp>0)hit(t,.95,i===0);});break;
    case 'bulwark':status(u,'bulwark',10);signal();break;
    case 'riposte':status(u,'riposte',8,{lastTick:0});signal();break;
    case 'curse':hit(target,.55);if(target.hp>0)status(target,'curse',10);status(u,'cursingAttack',8);break;
    case 'blight':hit(target,.7);if(target.hp>0)status(target,'blight',10);break;
    case 'mirage':case 'mist':for(const a of expandedSupportTargets(b,u,s)){status(a,'illusion',s.effect==='mirage'?10:8,{hits:s.effect==='mirage'?3:2});signal(a);}break;
    case 'bandage':heal(target,.06);break;
    case 'supply':gainIntent(target,boosted(24,target,'intent'));signal(target);break;
    case 'camp':for(const a of expandedSupportTargets(b,u,s)){status(a,'camp',8);signal(a);}break;
    case 'regrowth':status(target,'regrowth',6,{amount:boosted(target.maxHp*(.015+power/50000),target,'healing'),sourceId:u.id});signal(target);break;
    case 'purify':for(const key of NEGATIVE_STATUSES)delete target.statuses[key];heal(target,.05);signal(target);break;
    case 'passage':setStatus(b,target,'phase',6);setStatus(b,target,'phaseLock',18);signal(target,'奇门 · 可越拦截');break;
    case 'bombard':case 'tremor':case 'broadside':case 'undertow':{
      const targets=areaTacticTargets(b,u,s,target,s.range+(s.effect==='bombard'&&hasStatus(b,u,'emplaced')?1:0)).filter(t=>distance(u,t)>=(s.minRange||0));
      targets.forEach((t,i)=>{if(u.hp<=0)return;hit(t,s.effect==='bombard'?(i?.65:1.45):s.effect==='tremor'?.75:s.effect==='broadside'?1.05:.65,i===0);if(t.hp>0&&s.effect==='tremor')status(t,'shaken',6);if(t.hp>0&&s.effect==='undertow'){status(t,'slow',6);status(t,'curse',10);}});break;
    }
    case 'ram':if(target.type==='gate')damageGate(b,u,3*(1+bonus/100),s);else hit(target,1.1);break;
    case 'emplace':status(u,'emplaced',10);signal();break;
    case 'plague':hit(target,.6);if(target.hp>0){status(target,'blight',10);status(target,'plague',10,{sourceId:u.id,amount:boosted((12+power*.08)*strength*100/(100+unitAttributes(target,b).discipline))});}break;
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
          if(s.control)control(t,disciplineDuration(b,t,duration(s.steps)),s.control);
          if(s.drain)lowerIntent(t,boosted(s.drain),u);
          if(s.burn)status(t,'burn',s.steps,{sourceId:u.id,amount:boosted(s.burn*strength*100/(100+unitAttributes(t,b).discipline))});
        }else{
          if(s.cleanse){for(const key of NEGATIVE_STATUSES)delete t.statuses[key];status(t,'resolve',3);}
          if(s.shield)status(t,'shield',8,{amount:boosted(t.maxHp*s.shield*(.5+power/200),t,'shield')});
          if(s.intent&&t!==u)gainIntent(t,boosted(s.intent,t,'intent'));
          if(s.cooldownReduction&&t!==u)for(const id of Object.keys(t.skillReady||{}))t.skillReady[id]=Math.max(b.tick,t.skillReady[id]-boosted(s.cooldownReduction,t,'cooldown'));
          if(s.ward)status(t,'ward',5,{percent:s.ward});
          if(s.valor)status(t,'valor',5);
        }
        signal(t,s.name);
      }
      if(s.selfCleanse){for(const key of NEGATIVE_STATUSES)delete u.statuses[key];status(u,'resolve',3);}
      if(s.selfWard)status(u,'ward',5,{percent:s.selfWard});
      break;
    }
    case 'confuse':if(s.id==='doubt'){hit(target,1.6);status(u,'strategyAttack',10);}if(target.hp>0){control(target,disciplineDuration(b,target,duration(controlSteps)),'confuse');signal(target,'混乱');}break;
    case 'wildfire': {
      const targets=areaTacticTargets(b,u,s,target,s.range),scale=hasStatus(b,target,'burn')?1.25:.85;
      targets.forEach((t,i)=>{hit(t,scale,i===0);if(t.hp>0)status(t,'burn',6,{sourceId:u.id,amount:boosted((6+power*.04)*100/(100+unitAttributes(t,b).discipline)*strength)});});status(u,'strategyAttack',16);status(u,'burningAttack',12,{amount:Math.round(6+power*.04)});break;
    }
    case 'rally':for(const a of basicSupportTargets(b,u,s)){const amount=boosted(24+Math.round(power*.02),a,'intent');gainIntent(a,amount);signal(a,`战意 +${amount}`);}break;
    case 'taunt':status(target,'taunt',4,{sourceId:u.id});signal(target,'挑衅 · 引战');break;
    case 'cleanse':for(const key of NEGATIVE_STATUSES)delete target.statuses[key];status(target,'resolve',3);status(target,'shield',8,{amount:boosted(target.maxHp*(.08+power/8000),target,'shield')});signal(target,'解围 · 护盾');break;
    case 'screen':for(const a of basicSupportTargets(b,u,s)){heal(a,.08+power/10000);status(a,'shield',6,{amount:boosted(a.maxHp*.04,a,'shield')});signal(a,'救护 · 护盾');}break;
    case 'lure': {
      const cell=lureCell(b,u,target);if(!cell)return false;
      const from={x:target.x,y:target.y};Object.assign(target,cell);moved(b,target,from);status(target,'armorBreak',6);
      combatEffect(b,u,target,true,0,'impact',s,{fromX:from.x,fromY:from.y,text:'诱敌 · 破防'});break;
    }
    case 'harass':{const amount=lowerIntent(target,boosted(24+Math.round(power*.03)),u);status(target,'weaken',6);signal(target,`战意 −${amount}`);break;}
    case 'relay':for(const a of basicSupportTargets(b,u,s)){heal(a,.07+power/10000);for(const id of Object.keys(a.skillReady))a.skillReady[id]=Math.max(b.tick,a.skillReady[id]-boosted(2,a,'cooldown'));status(a,'haste',4);signal(a,'策应 · 冷却缩短');}break;
    case 'ambush':hit(target,.6);if(target.hp>0){status(target,'slow',6);status(target,'weaken',6);}break;
    case 'seal':status(target,'seal',5);signal(target,'封技');break;
    case 'phalanx':status(u,'phalanx',8);signal(u,'方阵 · 减伤');break;
    case 'gallop':{
      status(u,'ward',6,{percent:25});
      const nearest=activeUnits(b,1-u.side).sort((a,c)=>distance(u,a)-distance(u,c)||a.id.localeCompare(c.id))[0];
      if(nearest&&routeTo(b,u,nearest,14)?.length)status(u,'haste',6);
      signal(u,'疾驰 · 减伤');break;
    }
    case 'valor':status(u,'valor',8);status(u,'armorBreak',8);signal(u,'攻击 +25% · 防御 −20%');break;
    case 'fire':hit(target,1.0);if(target.hp>0)status(target,'burn',6,{sourceId:u.id,amount:boosted((6+power*.03)*strength*100/(100+unitAttributes(target,b).discipline))});status(u,'burningAttack',10,{amount:Math.round(6+power*.03)});break;
    case 'scatter': {
      const targets=areaTacticTargets(b,u,s,target,attackRange(b,u));
      targets.forEach((t,i)=>hit(t,.85,i===0));break;
    }
    case 'suppress':hit(target,.7);if(target.hp>0)status(target,'slow',6);break;
    case 'thrust': {
      const next=hexBeyond(u,target);
      const behind=activeUnits(b,1-u.side).find(t=>t.x===next.x&&t.y===next.y);
      hit(target,1.3);if(behind)hit(behind,1.1,false);break;
    }
    case 'strike':hit(target,exposedTarget(b,target)?2.5:1.7);break;
    case 'repeat':hit(target,.95);if(target.hp>0)hit(target,.95,false);break;
    case 'pierce':hit(target,.7);if(target.hp>0)status(target,'armorBreak',8);break;
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
      if(s.effect==='terror' && target.hp>0) {control(target,duration(2));signal(target,'眩晕');}break;
    }
    case 'protect': {
      status(target,'shield',8,{amount:boosted(target.maxHp*.12,target,'shield')});
      const enemy=activeUnits(b,1-u.side).find(e=>distance(target,e)===1);
      if(enemy && !hasStatus(b,enemy,'phalanx')) {
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
  if(castEvents.length)castEvents[0].outcome=tacticOutcome(b,u,before,castEvents);
  if(combo) {
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
    if(hasStatus(b,u,'regrowth')){const regen=u.statuses.regrowth,source=b.sides.flatMap(s=>s.units).find(a=>a.id===regen.sourceId);const amount=Math.min(battleWounded(u),u.maxHp-u.hp,Math.round(regen.amount*(hasStatus(b,u,'blight')?.5:1)));if(amount>0){u.hp+=amount;u.healed+=amount;u.participated=true;if(source)combatEffect(b,source,u,true,0,'impact',TACTICS_BOOK.regrowth,{text:'回春 +'+amount,healing:amount,ongoing:true});}}
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
  for(const side of b.sides)if(side.recoveryUntil>b.tick)for(const u of side.units)healWounded(b,u,.01,true);
  fillSlots(b, 0); fillSlots(b, 1);
  b.commandProgress=Math.min(COMMAND_RESOURCE.capacity,(b.commandProgress||0)+commandIntellect(b));
  b.enemyCommand.commandProgress=Math.min(COMMAND_RESOURCE.capacity,b.enemyCommand.commandProgress+commandIntellect(b,1));
  if(b.enemyCommand.commandProgress>=COMMAND_RESOURCE.capacity){
    const command=chooseEnemyCommand(b,battleStratagems(b,1),STRATAGEMS);
    if(command)issueCommand(b,command,null,1);
  }
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
    const breachGate=gateTarget(b,unit);
    if(breachGate&&unit.type==='siege'&&unitTactics(unit).some(s=>s.id==='ram')&&unit.intent>=TACTICS_BOOK.ram.threshold&&(unit.skillReady.ram||0)<=b.tick&&!tauntTarget(b,unit,attackRange(b,unit))&&!activeUnits(b,1-side).some(e=>distance(unit,e)<=2)&&distance(unit,breachGate)>2){moveUnit(b,unit,breachGate,false,2);continue;}
    const focused=pickTarget(b,unit);
    const explicitFocus=focused && b.sides[side].focus===focused.id && b.sides[side].focusUntil>b.tick;
    const target = (!unit.cooldown && !explicitFocus ? pickTarget(b,unit,true) : null) || focused; if (!target) continue;
    if(distance(unit,target)<(unitAttributes(unit,b).minRange||0)){const cell=retreatCell(b,unit),speed=unitAttributes(unit,b).move;if(cell&&speed>0){unit.moveProgress+=speed;if(unit.moveProgress>=1){unit.moveProgress%=1;const from={x:unit.x,y:unit.y};Object.assign(unit,cell);moved(b,unit,from);}}unit.action='撤离射击盲区';continue;}
    if (distance(unit, target) <= attackRange(b,unit)) {
      if (!unit.cooldown) {
        if (target.type === 'gate') damageGate(b,unit);
        else damageUnit(b, unit, target, false);
        if (b.result) return;
      } else unit.action = '重整攻势';
    } else {
      const anchor=!explicitFocus&&!tauntTarget(b,unit,attackRange(b,unit))&&supportAnchor(b,unit);
      if(anchor){if(distance(unit,anchor)>2)moveUnit(b,unit,anchor,false,2);else unit.action='策应队友';}
      else moveUnit(b,unit,target);
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
    battleLog(b, '战至日暮，按双方可战兵力比例判定战局，诸军收兵。');
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
export function validateSave(value) {
  const require = (condition, message = '存档数据损坏') => { if (!condition) throw new Error(message); };
  const number = (v, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= 0 && v <= max;
  const text = (v, max = 250) => typeof v === 'string' && v.length <= max && !/[<>"'&]/.test(v);
  const faction = v => Object.hasOwn(FACTIONS, v);
  const tactic = v => Object.hasOwn(TACTICS, v);
  const result = r => r && [0, 1, null].includes(r.winner) && ['撤退', '击溃', '久战收兵', '城门失守','坚守成功'].includes(r.reason);
  require(value && value.version === VERSION && number(value.turn) && value.turn > 0 && number(value.seed), '存档版本不兼容或数据损坏');
  require(value.rulesVersion===RULES_VERSION,'存档不是当前规则版本，请重新开始');
  require(value.officerDataVersion===2,'存档不是当前武将数据版本，请重新开始');
  const scenario = value.testScenario && SCENARIOS.find(s => s.id === value.testScenario.id);
  require(value.testScenario === undefined || (scenario && number(value.testScenario.seed,0xffffffff)), '测试战役无效');
  if(scenario?.id==='officer-lab'){
    const ids=value.testScenario.officerIds;
    require(Array.isArray(ids)&&ids.length>=1&&ids.length<=6&&new Set(ids).size===ids.length&&ids.every(id=>Object.hasOwn(OFFICER_BY_ID,id)),'试炼武将阵容无效');
    require(value.armies?.[0]?.units?.map(u=>u.id).join(',')===ids.join(','),'试炼阵容与武将不一致');
  }
  if (scenario) require(number(value.testScenario.shieldPercent,100),'开场护盾比例无效');
  const initial = newGame();
  require(Array.isArray(value.cities) && value.cities.length === initial.cities.length && Array.isArray(value.armies) && value.armies.length <= 15 && Array.isArray(value.logs) && value.logs.length <= 60 && JSON.stringify(value.roads) === JSON.stringify(initial.roads), '存档结构不完整');
  require(validRelationshipTypes(value.relationshipTypes),'人物关系类型无效');
  require(validRelationshipScores(value.relationshipScores,value.relationshipTypes),'人物关系值无效');
  for (const key of ['gold', 'grain', 'fame', 'nextId', 'victories']) require(number(value[key]), '资源数据无效');
  require(value.nextId >= 3 && [null, 'victory', 'defeat'].includes(value.finished));
  for (const entry of value.logs) require(entry && number(entry.turn) && typeof entry.text === 'string' && entry.text.length < 1000 && ['info', 'event', 'order', 'good', 'war'].includes(entry.type));
  const seen = new Set();
  for (const city of value.cities) {
    const source = initial.cities.find(c => c.id === city?.id);
    require(source && faction(city.owner) && number(city.garrison), '城池数据无效');
    for (const key of ['name', 'x', 'y', 'subtitle', 'province']) require(city[key] === source[key], '地图数据不匹配');
  }
  require(new Set(value.cities.map(c => c.id)).size === value.cities.length, '城池编号重复');
  function validateUnit(u, combat = false) {
    if(u?.tactics!==undefined)require(validLoadout(u,u.tactics),'战法配置无效');
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
    require(Array.isArray(army.units) && army.units.length > 0 && army.units.length <= (scenario ? 30 : 15) && Array.isArray(army.route) && army.route.length <= 9 && army.route.every(id => cityById(value, id)) && number(army.supply) && number(army.morale, 100), '军团数据不完整');
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
    require(scenario ? b.maxTicks === scenario.limit : b.maxTicks === undefined, '战斗时限无效');
    require(b.holdUntil===scenario?.holdUntil,'坚守目标无效');
    if(b.result?.reason==='坚守成功')require(b.holdUntil&&b.tick>=b.holdUntil&&b.result.winner===0&&!b.sides[0].retreat&&remainingUnits(b,0).length>0&&b.siege?.gate.side===0&&b.siege.gate.hp>0,'坚守战果无效');
    if (scenario?.gateHp) {
      const siege = b.siege, gate = siege?.gate, attackerSide = scenario.defending || scenario.id === 'defense' ? 1 : 0;
      require(siege && siege.attackerSide === attackerSide && gate && gate.id === 'siege-gate' && gate.name === '城门' && gate.type === 'gate' && gate.side === 1-attackerSide && gate.x === (attackerSide===1?1:12) && gate.y === 4 && gate.maxHp === scenario.gateHp && number(gate.hp,gate.maxHp), '城防数据无效');
      require(gate.hp > 0 || b.result?.winner === attackerSide && b.result?.reason === '城门失守', '城门战果无效');
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
    require(text(b.id) && b.cityId === b.context.cityId && number(b.tick, scenario?.limit || 240) && number(b.seed) && number(b.commandCooldown) && Array.isArray(b.sides) && b.sides.length === 2 && b.settled === false && (b.result === null || result(b.result)), '战斗数据无效');
    const unitIds = new Set(), positions = new Set();
    b.sides.forEach((side, index) => {
      side.commanders=[...new Set([...b.context.attackingIds,...b.context.defenderIds])].map(id=>armyById(value,id)).filter(a=>a.faction===side.faction).flatMap(armyCommanders);
      for (const key of ['rangeUntil','recoveryUntil','assaultUntil','fortifyUntil','disruptUntil','hasteUntil','blockadeUntil','reliefUntil']) require(number(side[key]));
      require(side && faction(side.faction) && tactic(side.tactic) && typeof side.retreat === 'boolean' && number(side.focusUntil) && number(side.inspireUntil) && (side.focus === null || text(side.focus)) && Array.isArray(side.units) && side.units.length <= 30);
      require(side.units.filter(u => u.status === 'active').length <= 6, '战场超出容量');
      require(b.terrain==='river'||!side.units.some(u=>u.type==='ship'),'舰船需要河流战场');
      for (const u of side.units) {
        validateUnit(u, true);
        require(u.arrivalTick === undefined && u.wave === undefined || (scenario && number(u.wave,scenario.waves.length) && u.wave > 0 && u.arrivalTick === scenario.waves[u.wave-1].tick && (u.status === 'reserve' || u.arrivalTick <= b.tick)), '援军到达时间无效');
        require(!unitIds.has(u.id) && u.side === index && typeof u.armyId === 'string' && (armyIds.has(u.armyId) || u.armyId === `city:${b.cityId}`)); unitIds.add(u.id);
        require(number(u.intent,COMBAT.intentCap),'战意数据无效');
        require(Number.isFinite(u.moveProgress)&&u.moveProgress>=0&&u.moveProgress<1,'移动进度无效');
        const ps=u.passiveState;
        require(ps&&typeof ps==='object'&&!Array.isArray(ps)&&number(ps.lastMoveTick,b.tick)&&number(ps.shots,100000)&&typeof ps.reserveEntered==='boolean'&&number(ps.entryUntil,b.tick+15)&&(ps.entryUntil===0||ps.reserveEntered)&&
          (ps.targetId===null||text(ps.targetId,40))&&(ps.shotType===null||Object.hasOwn(TROOPS,ps.shotType))&&Number.isFinite(u.attackCarry)&&u.attackCarry>=0&&u.attackCarry<1&&typeof u.participated==='boolean','被动技能状态无效');
        const strategic=armyById(value,u.armyId)?.units.find(v=>v.id===u.id);
        if(strategic)require(u.level===strategic.level&&u.experience===strategic.experience,'战场等级与武将数据不一致');
        require(number(u.battleDamage)&&number(u.healed)&&u.battleDamage-u.healed===u.initial-u.hp&&u.healed<=Math.floor(u.battleDamage*.35),'伤兵治疗数据无效');
        const skills=unitTactics(u).map(s=>s.id);
        for(const map of [u.skillReady,u.tacticCasts]) {
          require(map && typeof map==='object' && !Array.isArray(map),'战法冷却数据无效');
          for(const [key,n] of Object.entries(map))require(skills.includes(key)&&number(n),'战法冷却数据无效');
        }
        require(u.statuses && typeof u.statuses==='object' && !Array.isArray(u.statuses),'状态数据无效');
        for(const [key,status] of Object.entries(u.statuses)) {
          require(['illusion','curse','cursingAttack','blight','plague','bulwark','riposte','camp','regrowth','phase','phaseLock','emplaced','shaken','nexus','anchored','burningAttack','strategyAttack','phalanx','haste','valor','burn','scorch','slow','armorBreak','shield','stun','resolve','confuse','seal','weaken','ward','taunt','pursuit'].includes(key) && status && number(status.until),'状态数据无效');
          if(key==='curse')require(Number.isInteger(status.stacks)&&status.stacks>=1&&status.stacks<=3,'衰咒层数无效');
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
          if(key==='burningAttack')require(number(status.amount,1000000),'燃击威力无效');
          if(key==='burn')require(number(status.baseAmount,1000000)&&Number.isInteger(status.stacks)&&status.stacks>=1&&status.stacks<=3&&status.amount===status.baseAmount*status.stacks,'燃烧层数无效');
        }
        require(['active', 'reserve', 'defeated', 'withdrawn'].includes(u.status) && number(u.hp) && number(u.initial,troopCapacity(u)) && u.initial > 0 && u.hp <= u.initial && u.maxHp === u.initial && number(u.morale, 100) && Number.isFinite(u.cooldown)&&u.cooldown>=0&&u.cooldown<=Number.MAX_SAFE_INTEGER && number(u.intent,COMBAT.intentCap) && text(u.action), '部队状态无效');
        require(u.skillCasts === undefined || number(u.skillCasts), '战法次数无效');
        require(u.cast===null,'不支持旧版待施放状态，请重新开始');
        for (const key of ['commandBonus', 'deputyBonus', 'advisorBonus']) require(u[key] === undefined || Number.isFinite(u[key]) && u[key] >= 0 && u[key] <= 1);
        if (u.status === 'active') { require(number(u.x, 13) && number(u.y, 7) && canOccupy(b,u,u.x,u.y) && u.hp > 0 && !positions.has(`${u.x},${u.y}`), '战场位置无效'); positions.add(`${u.x},${u.y}`); }
      }
    });
    if (b.siege) unitIds.add(b.siege.gate.id);
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
      if(e.shieldAbsorbed!==undefined)require(number(e.shieldAbsorbed),'护盾吸收数值无效');
      if(e.outcome!==undefined)require(Array.isArray(e.outcome)&&e.outcome.length<=61&&e.outcome.every(t=>t&&unitIds.has(t.id)&&text(t.name)&&number(t.damage)&&number(t.healing)&&number(t.absorbed)&&typeof t.defeated==='boolean'&&Array.isArray(t.changes)&&t.changes.length<=50&&t.changes.every(s=>text(s,500))),'战法结算记录无效');
      if(e.healing!==undefined)require(number(e.healing),'治疗表现数值无效');
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
    require(Array.isArray(r.growth)&&r.growth.length<=(scenario?60:15)&&new Set(r.growth.map(g=>g?.id)).size===r.growth.length&&r.growth.every(g=>g&&(Object.hasOwn(OFFICER_BY_ID,g.id)||scenario&&/^test-\d{1,2}$/.test(g.id))&&text(g.name,20)&&[0,1].includes(g.side)&&number(g.before,10)&&g.before>=1&&number(g.after,10)&&g.after>=g.before&&number(g.gained,150)&&Array.isArray(g.unlocked)&&g.unlocked.length<=5&&g.unlocked.every(s=>text(s,20))),'成长战报无效');
  }
  return value;
}
