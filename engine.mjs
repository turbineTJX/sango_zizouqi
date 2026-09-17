// The simulation has no DOM, network, clock, or storage dependencies.
import { TACTICS_BOOK, unitTactics, readyTactic, tacticTarget, hasStatus, setStatus, routeTo, retreatCell, openCell, configureTactics, validLoadout, defaultTacticIds, NEGATIVE_STATUSES, statusPower, lureCell } from './tactics.mjs';
export { TACTICS_BOOK, unitTactics, hasStatus } from './tactics.mjs';
export const VERSION = 1;
export const GRID = { cols: 14, rows: 8 };
export const COMBO = { window:3, doubleBonus:25, tripleBonus:40 };
export const COMBAT = { stepMs: 700, damageScale: .30, attackInterval: 3, skillWindup: 2, intentOnAttack: 12, intentOnHit: 10, intentCap: 160 };
export const SKILL_THRESHOLDS = { cao:110, dun:85, liao:95, chu:80, jia:100, yu:90, yuanxia:85, jin:80, shao:100, yan:85, wen:95, he:90, ju:100, tian:105, gao:85 };
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
  cycle: { name:'轮番进击', group:'offense', cost:1, duration:0, description:'我军所有正在冷却的战法缩短 6 步，蓄势不受影响', side:0, icon:'sword' },
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
};
export const COMMAND_RESOURCE = { capacity:12000 };
export const officerStratagems = id => OFFICER_STRATAGEMS[id] || [];
export function armyCommanders(army) {
  return ['leader','advisor'].flatMap(role=>{const u=army.units.find(u=>u.id===army[role]);return u?[{id:u.id,name:u.name,role,armyId:army.id}]:[];});
}
export const armyStratagems = army => [...new Set(armyCommanders(army).flatMap(c=>officerStratagems(c.id)))];
export const battleStratagems = b => [...new Set((b.sides[0].commanders||[]).flatMap(c=>officerStratagems(c.id)))];
export const commandIntellect = b => b.sides[0].retreat ? 0 : activeUnits(b,0).reduce((n,u)=>n+u.intellect,0);
export function attackRange(b,u) {return TROOPS[u.type].range+(['archer','crossbow'].includes(u.type)&&b.sides[u.side].rangeUntil>b.tick?2:0);}
export function battleWounded(u) {return Math.max(0,Math.floor((u.battleDamage??u.initial-u.hp)*.35)-(u.healed||0));}
function takeCasualties(u,damage) {
  u.battleDamage ??= u.initial-u.hp;u.healed ??=0;
  damage=Math.min(u.hp,damage);u.hp-=damage;u.battleDamage+=damage;return damage;
}
function healWounded(b,u,fraction) {
  if(u.status!=='active'||u.hp<=0)return 0;
  const amount=Math.min(battleWounded(u),Math.floor(u.maxHp*fraction),u.maxHp-u.hp);
  if(amount<=0)return 0;
  u.healed=(u.healed||0)+amount;u.hp+=amount;
  combatEffect(b,u,u,true,0,'impact',{name:'救治伤兵',visual:'banner'},{text:'救治 +'+amount});return amount;
}
export const isDeploying = b => !!b && !b.deploymentLocked && b.tick === 0 && !b.result;
function gainIntent(unit, amount) { unit.intent = Math.min(COMBAT.intentCap, (unit.intent || 0) + amount); }
export function lowerIntent(unit, amount) { unit.intent = Math.max(0,(unit.intent || 0)-Math.max(0,amount)); }
export function skillVisual(unit) {
  if (['jia', 'yu', 'tian'].includes(unit.id)) return 'fire';
  if (['cao', 'shao', 'jin', 'ju'].includes(unit.id)) return 'banner';
  if (['chu', 'dun'].includes(unit.id)) return 'shockwave';
  return unit.type === 'cavalry' ? 'charge' : unit.type === 'archer' ? 'volley' : 'slash';
}
export const TROOPS = {
  spear: { name: '枪兵', icon: '槍', attack: 1.02, defense: 1.15, range: 1, move: 1, beats: 'cavalry' },
  cavalry: { name: '骑兵', icon: '騎', attack: 1.22, defense: 0.95, range: 1, move: 2, beats: 'archer' },
  archer: { name: '弓兵', icon: '弓', attack: 0.88, defense: 0.8, range: 4, move: 1, beats: 'spear' },
  crossbow: { name: '弩兵', icon: '弩', attack: 0.96, defense: 0.8, range: 4, move: 1, beats: 'spear' },
};
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
  ['yuanxia', '夏侯渊', '妙才', 88, 91, 70, '疾风奔袭', 'cavalry', 'front', '神速奔袭'],
  ['jin', '于禁', '文则', 90, 78, 75, '坚壁清野', 'spear', 'middle', '治军严整'],
  ['shao', '袁绍', '本初', 86, 72, 78, '四世三公', 'spear', 'front', '名门雄主'],
  ['yan', '颜良', '公骥', 84, 96, 43, '河北雄锋', 'cavalry', 'front', '勇冠三军'],
  ['wen', '文丑', '子恒', 82, 95, 42, '破阵长驱', 'cavalry', 'front', '锐不可当'],
  ['he', '张郃', '儁乂', 91, 90, 77, '巧变奇袭', 'spear', 'middle', '善识地势'],
  ['ju', '沮授', '公与', 84, 38, 93, '料敌布防', 'archer', 'back', '筹略深远'],
  ['tian', '田丰', '元皓', 80, 35, 94, '审势定谋', 'archer', 'back', '刚直多谋'],
  ['gao', '高览', '敬志', 82, 87, 65, '奋武突击', 'spear', 'front', '沉毅善战'],
];
export function makeOfficer(id, troops = 3000, index = 0) {
  const row = OFFICERS.find(o => o[0] === id);
  if (!row) throw new Error('未知武将');
  const [key, name, courtesy, leadership, force, intellect, skill, type, formation, trait] = row;
  return { id: key, name, courtesy, leadership, force, intellect, politics: Math.round(intellect * .9), charm: Math.round((leadership + intellect) / 2), skill, type, formation, trait, troops, wounded: 0, first: index < 6, loyalty: 100 };
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
    version: VERSION, rulesVersion:2, seed, turn: 1, gold: 3200, grain: 12800, fame: 120,
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
  const need = army.units.reduce((n, u) => n + Math.max(0, 3000 - u.troops - u.wounded), 0);
  const amount = Math.min(need, 4000, Math.floor(state.gold / .25), state.grain);
  if (amount <= 0) return need ? '府库或粮草不足' : '兵员已足，伤兵将逐旬恢复';
  let remaining = amount;
  for (const u of [...army.units].sort((a, b) => a.troops - b.troops)) {
    const add = Math.min(remaining, Math.max(0, 3000 - u.troops - u.wounded));
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
  return Array.from({ length: count }, (_, i) => ({ id: `g-${city.id}-${i}`, name: `${city.name}${['守将', '校尉', '都尉', '偏将', '参军', '牙将'][i]}`, courtesy: '守军', leadership: 72, force: 70, intellect: 65, skill: '据险固守', trait: '守土有责', type: types[i], formation: types[i] === 'archer' ? 'back' : 'front', troops: Math.floor(city.garrison / count) + (i === 0 ? city.garrison % count : 0), wounded: 0, first: true }));
}
function combatUnit(u, armyId, side, morale) {
  return { ...u, armyId, side, hp: u.troops, maxHp: u.troops, initial: u.troops, battleDamage:0, healed:0, status: 'reserve', x: -1, y: -1, morale, cooldown: 0, intent:0, cast: null, skillReady:{}, tacticCasts:{}, statuses:{}, skillCasts: 0, action: '候命', effect: null };
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
  state.battle = { id: `battle-${state.turn}-${state.nextId++}`, cityId: city.id, context: { ...p, attackingIds: attacking.map(a => a.id) }, tick: 0, seed: state.seed + state.turn, sides, comboWindows:[], comboCounts:[0,0], commandProgress:0, commandCooldown: 0, commandReady:{}, commandSerial:0, lastCommand:null, deploymentLocked:false, logs: [], effects: [], result: null, settled: false };
  fillSlots(state.battle, 0); fillSlots(state.battle, 1);
  battleLog(state.battle, `${city.name}之战，诸军待命。请先布置首发部队位置。`);
  state.pending = null; return null;
}
export const activeUnits = (b, side) => b.sides[side].units.filter(u => u.status === 'active' && u.hp > 0);
export function deployUnit(b, unitId, x, y) {
  if (!isDeploying(b)) return '开战后位置锁定，暂停也不能移动部队';
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 4 || y < 0 || y >= GRID.rows) return '请放在左侧绿色布阵区';
  const unit = activeUnits(b,0).find(u=>u.id === unitId);
  if (!unit) return '请选择我军在场部队';
  const occupied = b.sides.flatMap(s=>s.units).find(u=>u.status === 'active' && u.x === x && u.y === y && u !== unit);
  if (occupied?.side === 1) return '不能与敌军重叠';
  if (occupied) { occupied.x = unit.x; occupied.y = unit.y; }
  unit.x = x; unit.y = y; return null;
}
export function resetDeployment(b) {
  if (!isDeploying(b)) return '只能在开战前调整阵型';
  const own = activeUnits(b,0);
  own.forEach(u=>{u.status = 'reserve';u.x=-1;u.y=-1;});
  own.forEach(u=>spawn(b,u)); return null;
}
export function lockDeployment(b) {
  if (!isDeploying(b)) return '当前不在布阵阶段';
  b.deploymentLocked = true;
  battleLog(b,'军阵已定，两军交锋。攻击与受击开始积累战意。'); return null;
}
const remainingUnits = (b, side) => b.sides[side].units.filter(u => ['active', 'reserve'].includes(u.status) && u.hp > 0);
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function battleLog(b, text) { b.logs.unshift({ tick: b.tick, text }); b.logs = b.logs.slice(0, 70); }
function random(b) { b.seed = (Math.imul(b.seed, 1664525) + 1013904223) >>> 0; return b.seed / 4294967296; }
function spawn(b, unit) {
  const x = unit.side === 0 ? ({ front: 3, middle: 2, back: 1, left: 3, right: 3 }[unit.formation]) : ({ front: 10, middle: 11, back: 12, left: 10, right: 10 }[unit.formation]);
  const preferredY = unit.formation === 'left' ? 0 : unit.formation === 'right' ? 7 : 3.5;
  const cells = [];
  for (let y = 0; y < GRID.rows; y++) for (let col = 0; col < GRID.cols; col++) cells.push({ x: col, y });
  const occupied = b.sides.flatMap(s => s.units).filter(u => u.status === 'active');
  const open = cells.filter(c => !occupied.some(u => u.x === c.x && u.y === c.y)).sort((a, c) => Math.abs(a.x - x) * 5 + Math.abs(a.y - preferredY) - Math.abs(c.x - x) * 5 - Math.abs(c.y - preferredY));
  if (!open.length) return false;
  unit.x = open[0].x; unit.y = open[0].y; unit.status = 'active'; unit.action = '列阵'; return true;
}
function fillSlots(b, side) {
  if (b.sides[side].retreat) return;
  if((b.sides[side].blockadeUntil||0)>b.tick)return;
  for (const unit of b.sides[side].units.filter(u => u.status === 'reserve' && u.hp > 0)) {
    if (activeUnits(b, side).length >= 6) break;
    spawn(b, unit);
    if((b.sides[side].reliefUntil||0)>b.tick)setStatus(b,unit,'shield',8,{amount:Math.round(unit.maxHp*.15)});
    if (b.tick) battleLog(b, `${unit.name}率${TROOPS[unit.type].name}补入战线。`);
  }
}
export function issueCommand(b, command, targetId = null) {
  if (!b || b.result) return '战斗已经结束';
  if (isDeploying(b)) return '请先确认布阵，开战后可暂停下达军略';
  if (b.sides[0].retreat) return '全军正在撤退';
  const costs = { ...Object.fromEntries(Object.entries(STRATAGEMS).map(([key,s])=>[key,s.cost])), focus: 1, reserve: 1, retreat: 0 };
  if (!Object.hasOwn(costs,command)) return '未知军令';
  if(STRATAGEMS[command]&&!battleStratagems(b).includes(command))return '主将与军师未掌握此军略';
  b.commandReady ||= {};
  if ((b.commandReady[command] || 0) > b.tick && command !== 'retreat') return '此项军略尚未冷却';
  if(command!=='retreat'&&b.commandProgress<COMMAND_RESOURCE.capacity)return '军略尚未蓄满';
  if(command==='blockade'&&!b.sides[1].units.some(u=>u.status==='reserve'&&u.hp>0))return '敌军没有待命预备队';
  if(command==='relief'&&!b.sides[0].units.some(u=>u.status==='reserve'&&u.hp>0))return '我军没有待命预备队';
  if(command==='heal'&&!activeUnits(b,0).some(u=>battleWounded(u)>0))return '在场部队暂无可救治的本场伤兵';
  if(command==='firestorm'&&(!activeUnits(b,0).length||!activeUnits(b,1).length))return '当前没有合法的火攻目标';
  if (STRATAGEMS[command]) {
    const strategy = STRATAGEMS[command];
    if(command==='heal') {for(const u of activeUnits(b,0))healWounded(b,u,.08);}
    else if(command==='firestorm') {const source=activeUnits(b,0)[0];for(const u of activeUnits(b,1))setStatus(b,u,'scorch',12,{sourceId:source.id,amount:Math.max(1,Math.round(u.initial*.006))});}
    else if (strategy.field) b.sides[strategy.side][strategy.field] = b.tick + strategy.duration + 1;
    else for (const u of remainingUnits(b,strategy.side)) {
      if (command === 'demoralize') lowerIntent(u,45);
      else if(command==='cleanse') {for(const key of NEGATIVE_STATUSES)delete u.statuses[key];setStatus(b,u,'resolve',3);}
      else if(command==='cycle') {for(const id of Object.keys(u.skillReady))u.skillReady[id]=Math.max(b.tick,u.skillReady[id]-6);}
      else gainIntent(u,35);
    }
    battleLog(b,`军略 · ${strategy.name}：${strategy.description}${strategy.duration ? `，持续 ${strategy.duration} 步` : command==='heal'?'（仅在场部队）':'（含预备队）'}。`);
  }
  if (command === 'focus') {
    const target = activeUnits(b, 1).find(u => u.id === targetId);
    if (!target) return '请选择仍在场的敌方单位';
    b.sides[0].focus = targetId; b.sides[0].focusUntil = b.tick + 18;
    battleLog(b, `军令 · 重兵合围：提高对${target.name}的攻击倾向，持续 18 步。`);
  }
  if (command === 'reserve') {
    const reserves = b.sides[0].units.filter(u => u.status === 'reserve' && u.hp > 0);
    if (!reserves.length) return '没有可投入的预备队';
    const weakest = [...activeUnits(b, 0)].sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0];
    if (activeUnits(b, 0).length >= 6) {
      const limit=(b.sides[0].reliefUntil||0)>b.tick?.85:.65;
      if (weakest.hp / weakest.maxHp > limit) return `前线尚稳：满员时仅轮换兵力不高于 ${limit*100}% 的部队`;
      weakest.status = 'withdrawn'; weakest.action = '轮换离场';
      weakest.cast = null;
      battleLog(b, `${weakest.name}脱离前线，由预备队接防。`);
    }
    fillSlots(b, 0); battleLog(b, '军令 · 后军接阵：后军接替前锋。');
  }
  if (command === 'retreat') {
    b.sides[0].retreat = true;
    b.sides[0].units.forEach(u => { u.cast = null; });
    b.sides[0].units.filter(u => u.status === 'reserve').forEach(u => { u.status = 'withdrawn'; });
    battleLog(b, '军令 · 鸣金收兵：各部向己方边缘撤离，撤离途中仍会受到攻击。');
  }
  if(command!=='retreat')b.commandProgress=0; b.commandCooldown = 0; b.commandReady[command] = b.tick + (STRATAGEMS[command] ? 8 : 3);
  b.commandSerial = (b.commandSerial || 0) + 1;
  b.lastCommand = { key:command, tick:b.tick, serial:b.commandSerial };
  return null;
}
function pickTarget(b, unit, inRangeOnly = false) {
  const side = b.sides[unit.side];
  return activeUnits(b, 1 - unit.side).filter(t=>!inRangeOnly || distance(unit,t) <= attackRange(b,unit)).sort((a, c) => {
    const score = target => {
      let s = distance(unit, target) * 9 + target.hp / target.maxHp * 7;
      if (counters(unit.type,target.type)) s -= 5;
      if (side.focus === target.id && side.focusUntil > b.tick) s -= 22;
      if (unit.type === 'cavalry' && ['archer','crossbow'].includes(target.type)) s -= 5;
      if (side.tactic === 'defensive') s += Math.abs(target.x - (unit.side === 0 ? 2 : 11)) * 2;
      return s;
    };
    return score(a) - score(c);
  })[0];
}
function moveUnit(b, unit, target, retreat = false) {
  if (hasStatus(b,unit,'phalanx') || hasStatus(b,unit,'slow') && b.tick%2) {unit.action='固守 / 迟滞';return;}
  const occupied = b.sides.flatMap(s => s.units).filter(u => u.status === 'active' && u !== unit);
  // Breadth-first pathfinding handles blocked allies without passing through them.
  const goal = retreat ? p => p.x === (unit.side === 0 ? 0 : 13) : p => distance(p, target) <= attackRange(b,unit);
  const queue = [{ x: unit.x, y: unit.y, path: [] }], visited = new Set([`${unit.x},${unit.y}`]);
  let route = null;
  while (queue.length) {
    const node = queue.shift();
    if (goal(node)) { route = node.path; break; }
    const neighbors = [[node.x - 1, node.y], [node.x + 1, node.y], [node.x, node.y - 1], [node.x, node.y + 1]];
    neighbors.sort((a, c) => Math.abs(a[0] - target.x) + Math.abs(a[1] - target.y) - Math.abs(c[0] - target.x) - Math.abs(c[1] - target.y));
    for (const [x, y] of neighbors) {
      const key = `${x},${y}`;
      if (x < 0 || y < 0 || x >= GRID.cols || y >= GRID.rows || visited.has(key) || occupied.some(u => u.x === x && u.y === y)) continue;
      visited.add(key); queue.push({ x, y, path: [...node.path, { x, y }] });
    }
  }
  if (route?.length) {
    const next = route[Math.min(route.length, TROOPS[unit.type].move+(hasStatus(b,unit,'haste')||b.sides[unit.side].hasteUntil>b.tick?1:0)) - 1];
    unit.x = next.x; unit.y = next.y; unit.action = retreat ? '撤离' : `接近${target.name}`;
  } else unit.action = retreat ? '等待撤离' : '调整阵线';
}
function combatEffect(b, attacker, target, skill, damage, phase = 'impact', definition=null, extra={}) {
  b.effects.push({ from: attacker.id, to: target.id, damage, skill, phase, visual: definition?.visual || skillVisual(attacker), troop: attacker.type, side: attacker.side, name: attacker.name, label: definition?.name || attacker.skill, fromX: attacker.x, fromY: attacker.y, x: target.x, y: target.y, ...extra });
}
function counters(a,c) { return TROOPS[a].beats===c || a==='cavalry' && c==='crossbow'; }
function damageUnit(b, attacker, target, skill, scale=1, definition=null, generateIntent=true) {
  const type = TROOPS[attacker.type], defense = TROOPS[target.type];
  const counter = counters(attacker.type,target.type) ? 1.28 : counters(target.type,attacker.type) ? .84 : 1;
  const ownTactic = b.sides[attacker.side].tactic, enemyTactic = b.sides[target.side].tactic;
  const attackBuff = ownTactic === 'aggressive' ? 1.18 : ownTactic === 'defensive' ? .92 : 1;
  const defenseBuff = enemyTactic === 'defensive' ? 1.15 : enemyTactic === 'aggressive' ? .91 : 1;
  const own = b.sides[attacker.side], enemy = b.sides[target.side];
  const armyAttack = (own.assaultUntil > b.tick ? 1.25 : 1) * (own.disruptUntil > b.tick ? .8 : 1);
  const armyDefense = (enemy.fortifyUntil > b.tick ? 1.3 : 1) * (enemy.disruptUntil > b.tick ? .8 : 1);
  const strength = .5 + .5 * Math.sqrt(attacker.hp / attacker.maxHp);
  const stat = definition?.category==='intellect' ? attacker.intellect : attacker.force;
  const officerBonus = 1 + (attacker.commandBonus || 0) + (attacker.deputyBonus || 0) + (skill ? attacker.advisorBonus || 0 : 0);
  const base = (85 + stat * 1.65 + attacker.leadership * .5) * strength * type.attack * counter * attackBuff * armyAttack * officerBonus;
  const mitigation = defense.defense * defenseBuff * armyDefense * (.8 + (definition?.category==='intellect'?target.intellect:target.leadership) / 200);
  let damage = Math.max(1, Math.round(base / mitigation * (.9 + random(b) * .2) * COMBAT.damageScale * scale * (hasStatus(b,attacker,'valor')?1.25:1) * (hasStatus(b,attacker,'weaken')?.8:1) * (hasStatus(b,target,'phalanx')?.7:1) * (hasStatus(b,target,'ward')?1-target.statuses.ward.percent/100:1) / (hasStatus(b,target,'armorBreak')?.8:1)));
  if (hasStatus(b,target,'shield')) { const shield=target.statuses.shield; const blocked=Math.min(shield.amount,damage);shield.amount-=blocked;damage-=blocked; }
  damage=takeCasualties(target,damage); target.morale = Math.max(15, target.morale - (skill ? 5 : 1));
  attacker.morale = Math.min(100, attacker.morale + 3); attacker.cooldown = COMBAT.attackInterval;
  if(generateIntent)gainIntent(attacker,COMBAT.intentOnAttack);
  if (target.hp > 0 && damage>0) gainIntent(target,COMBAT.intentOnHit);
  attacker.action = skill ? definition?.name || attacker.skill : `攻击${target.name}`;
  combatEffect(b, attacker, target, skill, damage,'impact',definition);
  if (target.hp <= 0) { target.status = 'defeated'; target.cast = null; target.action = '溃败'; battleLog(b, `${target.name}所部溃败，战线出现空位。`); }
}
function cancelCast(b,u) {
  if(u.cast?.skillId)u.skillReady[u.cast.skillId]=b.tick+TACTICS_BOOK[u.cast.skillId].cooldown;
  u.cast=null;
}
function stun(b,u,steps,key='stun') {
  if(hasStatus(b,u,'resolve'))return;
  cancelCast(b,u);setStatus(b,u,key,steps);setStatus(b,u,'resolve',steps+3);
}
// The window is anchored to the first completed cast, never extended by a chain.
function comboCandidate(b,u,s,target) {
  if(['phalanx','gallop','valor','ward'].includes(s.effect))return null;
  const units=b.sides[u.side].units;
  const previous=(b.comboWindows||[]).find(c=>c.side===u.side&&c.targetId===target.id&&b.tick-c.tick<=COMBO.window);
  const actors=(previous?.actors||[]).filter(a=>units.some(v=>v.id===a.id&&v.status==='active'&&v.hp>0));
  if(actors.some(a=>a.id===u.id))return null; // Multi-hit and the same officer cannot link with itself.
  const actor={id:u.id,name:u.name,skillId:s.id,x:u.x,y:u.y};
  return {side:u.side,targetId:target.id,tick:actors.length?previous.tick:b.tick,actors:[...actors,actor]};
}
function finishTactic(b,u,s,target) {
  const combo=comboCandidate(b,u,s,target),level=combo?Math.min(3,combo.actors.length):1;
  const bonus=level===3?COMBO.tripleBonus:level===2?COMBO.doubleBonus:0;
  const boosted=n=>Math.round(n*(1+bonus/100));
  const duration=n=>n+(bonus?1:0),effectStart=b.effects.length;
  const status=(t,key,steps,extra={})=>setStatus(b,t,key,duration(steps),extra);
  const hit=(t,scale=1.5,charge=true)=>damageUnit(b,u,t,true,scale*(1+bonus/100),s,charge);
  const signal=(t=u,text=s.name)=>combatEffect(b,u,t,true,0,'impact',s,{text});
  const start={x:u.x,y:u.y};
  const power=statusPower(u,s), friends=activeUnits(b,u.side).filter(a=>distance(u,a)<=(s.range??2));
  const controlSteps=Math.max(2,Math.min(4,Math.round(2+(u.intellect-target.intellect)/30)));
  switch(s.effect) {
    case 'confuse':stun(b,target,duration(controlSteps),'confuse');signal(target,'混乱');break;
    case 'wildfire': {
      const targets=activeUnits(b,1-u.side).filter(t=>distance(target,t)<=1&&distance(u,t)<=s.range).slice(0,2);
      targets.forEach((t,i)=>{hit(t,.85,i===0);if(t.hp>0)status(t,'burn',6,{sourceId:u.id,amount:boosted(8+u.intellect*.2)});});break;
    }
    case 'rally':for(const a of friends.filter(a=>a!==u)){const amount=boosted(16+Math.round(power*.16));gainIntent(a,amount);signal(a,`战意 +${amount}`);}break;
    case 'ward':for(const a of friends){status(a,'ward',7,{percent:15+Math.round(power*.15)});signal(a,'八门 · 减伤');}break;
    case 'cleanse':for(const key of NEGATIVE_STATUSES)delete target.statuses[key];status(target,'resolve',3);status(target,'shield',8,{amount:boosted(target.maxHp*(.05+power/1000))});signal(target,'解围 · 护盾');break;
    case 'screen':for(const a of friends.filter(a=>a.hp/a.maxHp<.9&&!hasStatus(b,a,'shield')).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp).slice(0,2)){status(a,'shield',8,{amount:boosted(a.maxHp*(.05+power/1000))});signal(a,'烟幕 · 护盾');}break;
    case 'lure': {
      const cell=lureCell(b,u,target);if(!cell)return false;
      const from={x:target.x,y:target.y};Object.assign(target,cell);status(target,'armorBreak',6);
      combatEffect(b,u,target,true,0,'impact',s,{fromX:from.x,fromY:from.y,text:'诱敌 · 破防'});break;
    }
    case 'harass':{const amount=boosted(20+Math.round(power*.2));lowerIntent(target,amount);status(target,'weaken',6);signal(target,`战意 −${amount}`);break;}
    case 'relay':for(const a of friends.filter(a=>a!==u)){for(const id of Object.keys(a.skillReady))a.skillReady[id]=Math.max(b.tick,a.skillReady[id]-boosted(3+Math.round(power*.03)));status(a,'haste',6);signal(a,'策应 · 冷却缩短');}break;
    case 'seal':hit(target,1.1);if(target.hp>0)status(target,'seal',controlSteps+1);signal(target,'封技');break;
    case 'phalanx':status(u,'phalanx',8);signal(u,'方阵 · 减伤');break;
    case 'gallop':status(u,'haste',6);signal(u,'疾驰 · 加速');break;
    case 'valor':status(u,'valor',8);signal(u,'攻击 +25%');break;
    case 'fire':hit(target,1.2);if(target.hp>0)status(target,'burn',6,{sourceId:u.id,amount:boosted(Math.max(8,Math.round(u.maxHp*.008)))});break;
    case 'scatter': {
      const targets=activeUnits(b,1-u.side).filter(t=>distance(target,t)<=2&&distance(u,t)<=attackRange(b,u)).slice(0,3);
      targets.forEach((t,i)=>hit(t,.85,i===0));break;
    }
    case 'suppress':hit(target,1.1);if(target.hp>0)status(target,'slow',6);break;
    case 'thrust': {
      const dx=target.x-u.x,dy=target.y-u.y;
      const behind=activeUnits(b,1-u.side).find(t=>t.x===target.x+dx&&t.y===target.y+dy);
      hit(target,1.6);if(behind)hit(behind,1.1,false);break;
    }
    case 'strike':hit(target,2);break;
    case 'repeat':hit(target,.95);if(target.hp>0)hit(target,.95,false);break;
    case 'pierce':hit(target,1.3);if(target.hp>0)status(target,'armorBreak',8);break;
    case 'retreatShot': {
      const cell=retreatCell(b,u);if(!cell)return false;
      Object.assign(u,cell);hit(target,1.3);
      combatEffect(b,u,u,true,0,'impact',s,{fromX:start.x,fromY:start.y,text:'退射',visual:'charge'});break;
    }
    case 'rush':case 'terror': {
      const route=routeTo(b,u,target,3);if(route===null)return false;
      if(route.length)Object.assign(u,route.at(-1));
      hit(target,s.effect==='terror'?1.8:1.6);
      // Keep the original path in the visual event even after moving the simulation unit.
      Object.assign(b.effects.at(-1),{fromX:start.x,fromY:start.y});
      if(s.effect==='terror' && target.hp>0) {stun(b,target,duration(2));signal(target,'眩晕');}break;
    }
    case 'protect': {
      status(target,'shield',8,{amount:boosted(target.maxHp*.12)});
      const enemy=activeUnits(b,1-u.side).find(e=>distance(target,e)===1);
      if(enemy && !hasStatus(b,enemy,'phalanx')) {
        const from={x:enemy.x,y:enemy.y},dx=enemy.x-target.x,dy=enemy.y-target.y;
        for(let i=0;i<2;i++) {const x=enemy.x+dx,y=enemy.y+dy;if(!openCell(b,x,y))break;enemy.x=x;enemy.y=y;}
        combatEffect(b,u,enemy,true,0,'impact',s,{fromX:from.x,fromY:from.y,text:'击退'});
      }
      signal(target,'护盾');break;
    }
    case 'undermine':lowerIntent(target,boosted(45));signal(target,'战意 −'+boosted(45));break;
    default:return false;
  }
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
      battleLog(b,title+' · '+combo.actors.map(a=>a.name).join(' → ')+' 对 '+target.name+' 发动「'+s.name+'」，伤害及数值效果 +'+bonus+'%，控制与状态持续 +1 步。');
    }
  }
  u.skillCasts=(u.skillCasts||0)+1;u.tacticCasts[s.id]=(u.tacticCasts[s.id]||0)+1;
  u.action=s.name;battleLog(b,`${u.name}发动「${s.name}」：${s.description}。`);return true;
}
function tickStatuses(b) {
  for(const u of b.sides.flatMap(s=>s.units)) {
    u.statuses ||= {};u.skillReady ||= {};u.tacticCasts ||= {};
    for(const [key,status] of Object.entries(u.statuses))if(status.until<=b.tick)delete u.statuses[key];
    if(u.status!=='active'||u.hp<=0)continue;
    for(const key of ['burn','scorch'])if(u.hp>0&&hasStatus(b,u,key)) {
      const burn=u.statuses[key],source=b.sides.flatMap(s=>s.units).find(s=>s.id===burn.sourceId);
      let damage=burn.amount;
      if(hasStatus(b,u,'shield')) {const shield=u.statuses.shield,blocked=Math.min(shield.amount,damage);shield.amount-=blocked;damage-=blocked;}
      damage=takeCasualties(u,damage);
      if(source)combatEffect(b,u,u,false,damage,'impact',TACTICS_BOOK.fire,{text:key==='scorch'?'火攻':'灼烧'});
      if(u.hp<=0) {u.status='defeated';u.cast=null;u.action='溃败';battleLog(b,`${u.name}所部在灼烧中溃败。`);}
    }
  }
}
export function stepBattle(b) {
  if (!b || b.result) return;
  if (isDeploying(b)) lockDeployment(b);
  b.tick++; b.effects = [];
  b.comboWindows=(b.comboWindows||[]).filter(c=>b.tick-c.tick<=COMBO.window&&b.sides.flatMap(s=>s.units).some(u=>u.id===c.targetId&&u.status==='active'&&u.hp>0));
  b.comboCounts ||= [0,0];
  tickStatuses(b);
  for(const side of b.sides)if(side.recoveryUntil>b.tick)for(const u of side.units)healWounded(b,u,.01);
  fillSlots(b, 0); fillSlots(b, 1);
  b.commandProgress=Math.min(COMMAND_RESOURCE.capacity,(b.commandProgress||0)+commandIntellect(b));
  // Alternate initiative each step so one faction does not always act first.
  const sequence = b.tick % 2 ? [0, 1] : [1, 0];
  for (const side of sequence) for (const unit of [...activeUnits(b, side)]) {
    if (unit.status !== 'active') continue;
    unit.cooldown = Math.max(0, unit.cooldown - 1);
    if(hasStatus(b,unit,'stun')) {unit.action='眩晕';continue;}
    if(hasStatus(b,unit,'confuse')) {
      const cells=[[unit.x-1,unit.y],[unit.x+1,unit.y],[unit.x,unit.y-1],[unit.x,unit.y+1]].filter(([x,y])=>openCell(b,x,y));
      if(cells.length&&!hasStatus(b,unit,'phalanx')){const [x,y]=cells[Math.floor(random(b)*cells.length)];unit.x=x;unit.y=y;}
      unit.action='混乱 · 阵位失序';continue;
    }
    if (b.sides[side].retreat) {
      unit.cast = null;
      moveUnit(b, unit, { x: side === 0 ? 0 : 13, y: unit.y }, true);
      if (unit.x === (side === 0 ? 0 : 13)) { unit.status = 'withdrawn'; unit.action = '已撤离'; battleLog(b, `${unit.name}所部成功撤离。`); }
      continue;
    }
    if (unit.cast) {
      unit.cast.remaining--;
      if (unit.cast.remaining <= 0) {
        const s=TACTICS_BOOK[unit.cast.skillId];
        // The intent gate was checked when casting began; lowering intent is not an interrupt.
        const legal=tacticTarget(b,unit,s,attackRange(b,unit));
        const original=b.sides.flatMap(s=>s.units).find(t=>t.id===unit.cast.targetId && t.status==='active' && t.hp>0);
        const targeted=s.category!=='intellect'&&!['gallop','phalanx','valor','protect','rush','terror','retreatShot'].includes(s.effect);
        const target=targeted && original && distance(unit,original)<=attackRange(b,unit) ? original : legal;
        if (target) finishTactic(b,unit,s,target); else unit.action = '收势待机';
        unit.skillReady[unit.cast.skillId]=b.tick+s.cooldown;
        unit.cast = null;
      } else unit.action = `蓄势 · ${TACTICS_BOOK[unit.cast.skillId].name}`;
      continue;
    }
    const ready = readyTactic(b,unit,attackRange(b,unit));
    if (ready) {
      const {skill:s,target}=ready;
      unit.cast = { skillId:s.id, targetId:target.id, remaining:COMBAT.skillWindup };
      unit.action = `蓄势 · ${s.name}`;
      combatEffect(b,unit,target,true,0,'cast',s); continue;
    }
    const target = pickTarget(b, unit); if (!target) continue;
    if (distance(unit, target) <= attackRange(b,unit)) {
      if (!unit.cooldown) {
        damageUnit(b, unit, target, false);
      } else unit.action = '重整攻势';
    } else moveUnit(b, unit, target);
  }
  fillSlots(b, 0); fillSlots(b, 1);
  const a = remainingUnits(b, 0).length, c = remainingUnits(b, 1).length;
  if (!a || !c) b.result = { winner: !a && !c ? null : a ? 0 : 1, reason: b.sides[0].retreat ? '撤退' : '击溃' };
  if (!b.result && b.tick >= 240) {
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
  const stats = b.sides.map(s => ({ faction: s.faction, initial: 0, remaining: 0, wounded: 0, killed: 0 }));
  for (let side = 0; side < 2; side++) for (const unit of b.sides[side].units) {
    const lost = unit.initial - unit.hp, wounded = battleWounded(unit);
    stats[side].initial += unit.initial; stats[side].remaining += unit.hp; stats[side].wounded += wounded; stats[side].killed += lost - wounded;
    if (!unit.armyId.startsWith('city:')) {
      const army = armyById(state, unit.armyId), source = army?.units.find(u => u.id === unit.id);
      if (source) { source.troops = unit.hp; source.wounded += wounded; }
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
  state.report = { id: b.id, city: city.name, winner: b.result.winner, reason: b.result.reason, tick: b.tick, stats, captured: oldOwner !== city.owner, owner: city.owner, reward: b.result.winner === 0 ? 300 : 0 };
  log(state, `${city.name}之战${b.result.winner === 0 ? '告捷' : b.result.winner === 1 ? '失利' : '未分胜负'}，我军阵亡 ${stats[0].killed} 人，伤兵 ${stats[0].wounded} 人。`, b.result.winner === 0 ? 'good' : 'war');
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
  const result = r => r && [0, 1, null].includes(r.winner) && ['撤退', '击溃', '久战收兵'].includes(r.reason);
  require(value && value.version === VERSION && number(value.turn) && value.turn > 0 && number(value.seed), '存档版本不兼容或数据损坏');
  const initial = newGame();
  require(Array.isArray(value.cities) && value.cities.length === initial.cities.length && Array.isArray(value.armies) && value.armies.length <= 15 && Array.isArray(value.logs) && value.logs.length <= 60 && JSON.stringify(value.roads) === JSON.stringify(initial.roads), '存档结构不完整');
  if(value.rulesVersion===undefined) {
    // Old archer was displayed and played as 弩兵. Preserve that choice when splitting the types.
    const groups=[...value.armies,...(Array.isArray(value.battle?.sides)?value.battle.sides:[])];
    for(const group of groups)if(Array.isArray(group?.units))for(const u of group.units)if(u?.type==='archer')u.type='crossbow';
    value.rulesVersion=2;
  }
  require(value.rulesVersion===2,'战斗规则版本不兼容');
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
    if (OFFICERS.some(o => o[0] === u.id)) {
      const source = makeOfficer(u.id);
      for (const key of ['name', 'courtesy', 'leadership', 'force', 'intellect', 'politics', 'charm', 'skill', 'trait', 'loyalty']) require(u[key] === source[key], '武将基础数据不匹配');
    } else {
      require(combat && /^g-[a-z]+-\d$/.test(u.id) && text(u.name, 20) && text(u.skill) && number(u.leadership, 100) && number(u.force, 100) && number(u.intellect, 100), '守军数据无效');
    }
  }
  const armyIds = new Set();
  for (const army of value.armies) {
    require(army && /^a\d+$/.test(army.id) && !armyIds.has(army.id) && faction(army.faction) && cityById(value, army.location) && tactic(army.tactic) && text(army.name, 30) && text(army.task, 20), '军团数据无效');
    armyIds.add(army.id);
    require(Array.isArray(army.units) && army.units.length > 0 && army.units.length <= 15 && Array.isArray(army.route) && army.route.length <= 9 && army.route.every(id => cityById(value, id)) && number(army.supply) && number(army.morale, 100), '军团数据不完整');
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
    // Version-1 saves from earlier prototypes remain playable under the new rules.
    if(b.points!==undefined) {b.commandProgress=b.tick===0&&!b.deploymentLocked?0:b.points>0?COMMAND_RESOURCE.capacity:0;delete b.points;}
    b.commandProgress ??=0;
    require(number(b.commandProgress,COMMAND_RESOURCE.capacity),'军略积累数据无效');
    b.deploymentLocked ??= b.tick > 0; b.commandReady ??= {}; b.commandSerial ??= 0; b.lastCommand ??= null;
    require(typeof b.deploymentLocked === 'boolean' && (b.tick === 0 || b.deploymentLocked) && b.commandReady && !Array.isArray(b.commandReady) && typeof b.commandReady === 'object' && number(b.commandSerial));
    for (const [key, ready] of Object.entries(b.commandReady)) require([...Object.keys(STRATAGEMS),'focus','reserve','retreat'].includes(key) && number(ready));
    if (b.lastCommand) require([...Object.keys(STRATAGEMS),'focus','reserve','retreat'].includes(b.lastCommand.key) && number(b.lastCommand.tick) && number(b.lastCommand.serial));
    require(!value.pending && !value.report && Array.isArray(b.context.attackingIds) && b.context.attackingIds.includes(b.context.attackerId) && b.context.attackingIds.every(id => armyIds.has(id)));
    require(text(b.id) && b.cityId === b.context.cityId && number(b.tick, 240) && number(b.seed) && number(b.commandCooldown) && Array.isArray(b.sides) && b.sides.length === 2 && b.settled === false && (b.result === null || result(b.result)), '战斗数据无效');
    const unitIds = new Set(), positions = new Set();
    b.sides.forEach((side, index) => {
      side.commanders=[...new Set([...b.context.attackingIds,...b.context.defenderIds])].map(id=>armyById(value,id)).filter(a=>a.faction===side.faction).flatMap(armyCommanders);
      for (const key of ['rangeUntil','recoveryUntil','assaultUntil','fortifyUntil','disruptUntil','hasteUntil','blockadeUntil','reliefUntil']) { side[key] ??= 0; require(number(side[key])); }
      require(side && faction(side.faction) && tactic(side.tactic) && typeof side.retreat === 'boolean' && number(side.focusUntil) && number(side.inspireUntil) && (side.focus === null || text(side.focus)) && Array.isArray(side.units) && side.units.length <= 30);
      require(side.units.filter(u => u.status === 'active').length <= 6, '战场超出容量');
      for (const u of side.units) {
        validateUnit(u, true);
        require(!unitIds.has(u.id) && u.side === index && typeof u.armyId === 'string' && (armyIds.has(u.armyId) || u.armyId === `city:${b.cityId}`)); unitIds.add(u.id);
        u.intent ??= 0;
        u.battleDamage ??= u.initial-u.hp;u.healed ??=0;
        require(number(u.battleDamage)&&number(u.healed)&&u.battleDamage-u.healed===u.initial-u.hp&&u.healed<=Math.floor(u.battleDamage*.35),'伤兵治疗数据无效');
        u.skillReady ??= {};u.tacticCasts ??= {};u.statuses ??= {};
        const skills=unitTactics(u).map(s=>s.id);
        for(const map of [u.skillReady,u.tacticCasts]) {
          require(map && typeof map==='object' && !Array.isArray(map),'战法冷却数据无效');
          for(const [key,n] of Object.entries(map))require(skills.includes(key)&&number(n),'战法冷却数据无效');
        }
        require(u.statuses && typeof u.statuses==='object' && !Array.isArray(u.statuses),'状态数据无效');
        for(const [key,status] of Object.entries(u.statuses)) {
          require(['phalanx','haste','valor','burn','scorch','slow','armorBreak','shield','stun','resolve','confuse','seal','weaken','ward'].includes(key) && status && number(status.until),'状态数据无效');
          if(key==='ward')require(number(status.percent,80));
          if(key==='shield')require(number(status.amount,u.maxHp));
          if(key==='burn'||key==='scorch')require(number(status.amount,1000000) && typeof status.sourceId==='string');
        }
        if(u.cast && !u.cast.skillId) {
          if(u.cast.cost!==undefined) {require(u.cast.cost===(SKILL_THRESHOLDS[u.id]||80),'旧战法消耗无效');gainIntent(u,u.cast.cost);delete u.cast.cost;}
          u.cast.skillId=skills[0];
        }
        require(['active', 'reserve', 'defeated', 'withdrawn'].includes(u.status) && number(u.hp) && number(u.initial) && u.initial > 0 && u.hp <= u.initial && u.maxHp === u.initial && number(u.morale, 100) && number(u.cooldown) && number(u.intent,COMBAT.intentCap) && text(u.action), '部队状态无效');
        require(u.skillCasts === undefined || number(u.skillCasts), '战法次数无效');
        if (u.cast != null) require(u.status === 'active' && u.hp > 0 && text(u.cast.targetId) && number(u.cast.remaining, COMBAT.skillWindup) && u.cast.remaining > 0, '蓄势状态无效');
        if (u.cast) require(skills.includes(u.cast.skillId) && u.cast.cost===undefined, '战法编号无效');
        for (const key of ['commandBonus', 'deputyBonus', 'advisorBonus']) require(u[key] === undefined || Number.isFinite(u[key]) && u[key] >= 0 && u[key] <= 1);
        if (u.status === 'active') { require(number(u.x, 13) && number(u.y, 7) && u.hp > 0 && !positions.has(`${u.x},${u.y}`), '战场位置无效'); positions.add(`${u.x},${u.y}`); }
      }
    });
    require(Array.isArray(b.logs) && b.logs.length <= 70 && b.logs.every(l => l && number(l.tick) && typeof l.text === 'string' && l.text.length < 1000));
    for(const u of b.sides.flatMap(s=>s.units))for(const key of ['burn','scorch'])if(u.statuses[key])require(unitIds.has(u.statuses[key].sourceId),'灼烧来源无效');
    require(Array.isArray(b.effects) && b.effects.length <= 128 && b.effects.every(e => e && unitIds.has(e.from) && unitIds.has(e.to) && number(e.damage) && typeof e.skill === 'boolean' && number(e.x, 13) && number(e.y, 7) && (e.text===undefined || text(e.text))));
    const comboActors = (actors,side) => Array.isArray(actors)&&actors.length>0&&actors.length<=6&&new Set(actors.map(a=>a.id)).size===actors.length&&actors.every(a=>{
      const u=b.sides[side].units.find(u=>u.id===a.id);
      return u&&a.name===u.name&&Object.hasOwn(TACTICS_BOOK,a.skillId)&&number(a.x,13)&&number(a.y,7);
    });
    b.comboWindows ??=[];b.comboCounts ??=[0,0];
    require(Array.isArray(b.comboCounts)&&b.comboCounts.length===2&&b.comboCounts.every(n=>number(n,10000)),'连携计数无效');
    require(Array.isArray(b.comboWindows)&&b.comboWindows.length<=120,'连携窗口无效');
    const comboKeys=new Set();
    for(const c of b.comboWindows) {
      require(c&&[0,1].includes(c.side)&&unitIds.has(c.targetId)&&number(c.tick,b.tick)&&comboActors(c.actors,c.side),'连携记录无效');
      const key=c.side+':'+c.targetId;require(!comboKeys.has(key),'连携记录重复');comboKeys.add(key);
    }
    for(const e of b.effects) {
      if(e.comboLevel!==undefined)require([2,3].includes(e.comboLevel),'连携等级无效');
      if(e.combo) {const c=e.combo;require(e.phase==='impact'&&e.skill&&[2,3].includes(c.level)&&c.bonus===(c.level===2?COMBO.doubleBonus:COMBO.tripleBonus)&&comboActors(c.actors,e.side)&&c.actors.length>=c.level&&text(c.targetName,20),'连携特效无效');}
    }
    for (const e of b.effects) if (e.phase !== undefined) require(['cast', 'impact'].includes(e.phase) && ['charge', 'fire', 'shockwave', 'banner', 'volley', 'slash'].includes(e.visual) && Object.hasOwn(TROOPS, e.troop) && [0, 1].includes(e.side) && text(e.name) && text(e.label) && number(e.fromX, 13) && number(e.fromY, 7), '战法表现事件无效');
  }
  if (value.report !== null) {
    const r = value.report;
    require(result(r) && text(r.id) && initial.cities.some(c => c.name === r.city) && faction(r.owner) && typeof r.captured === 'boolean' && number(r.tick, 240) && number(r.reward) && Array.isArray(r.stats) && r.stats.length === 2, '战报数据无效');
    for (const s of r.stats) { require(s && faction(s.faction)); for (const key of ['initial', 'remaining', 'wounded', 'killed']) require(number(s[key])); require(s.initial === s.remaining + s.wounded + s.killed); }
  }
  return value;
}
