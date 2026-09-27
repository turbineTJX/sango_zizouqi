import {mapNode,mapNodes} from './road-network.mjs';
import {defenseLine} from './defense-line.mjs';
import {STATUS_DEFINITIONS,CONTROL_STATUSES,statusValue,hidden,detected,breakStealth,remedy,needsRemedy,createDecoy,decoyTargets,hitDecoy,armEntryStatuses,contactIntentFactor,statusNotice} from './battle-status-rules.mjs';
import {shieldLayers} from './tactics.mjs';
import {DEMO_ROAD_DESIGNS} from './data/design/roads.mjs';
import {assertDesignTables} from './design-catalog.mjs';
import {DEMO_CITY_DESIGNS} from './data/design/cities.mjs';
import {playerFaction} from './player-faction.mjs';
import {NATIONAL_FACTIONS,nationalWorld} from './national-scenarios.mjs';
import {formationAura,AURA_INTERVAL,FORMATION_AURA} from './support-rules.mjs';
import {battleBuildings} from './building-rules.mjs';
import {ATTACK_ORBS} from './attack-orbs.mjs';
import {OFFICER_BY_ID,officerProfile,PROFILE_FIELDS,RELATION_LIST_FIELDS} from './officer-catalog.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {validateCustomBattle} from './custom-battle.mjs';
import {relationshipInfo,validRelationshipScores,validRelationshipTypes} from './relationships.mjs';
import {hexDistance, hexNeighbors, hexBeyond} from './hex-grid.mjs';
import { TROOPS, unitAttributes, disciplineDuration, isRear } from './unit-stats.mjs';
import {intentIncome, deniesHitIntent, hasPassive, initialPassiveState, moved, recordBasicAttack, passiveDamageMultiplier, passiveDamageTaken, supportMultiplier, SKILL_ROUTES, commonRouteName} from './passives.mjs';
import {TACTIC_RECOVERY_STEPS,tacticUsesLeft,tacticUseLimit,canRestoreTactic,useRecoveryTargets,recoverTacticUses} from './tactic-tempo.mjs';
import {gainMerit, meritNeeded, emptyContribution, recordContribution, battleMerit} from './progression.mjs';
import {initializeTacticLearning,validTacticLearning} from './tactic-learning.mjs';
import { blockedTerrain, gateTarget, canOccupy, BATTLE_TERRAINS } from './battlefield.mjs';
import {tacticTerrainEffect,fireTerrainFactor} from './terrain-rules.mjs';
import {planEnemyArmy,chooseEnemyCommand,rankEnemyReserves} from './battle-ai.mjs';
import {isTargetable,meleeTargetPool,interceptorsAt,canStrikeFrom,holdsLine} from './engagement.mjs';
import { SCENARIOS } from './scenario-catalog.mjs';
import { COMBAT, RULES_VERSION, CAMPAIGN_TIME } from './combat-rules.mjs';
import {snapshotTactic,tacticOutcome} from './tactic-outcomes.mjs';
import {powerFactor,powerDuration,effectChance,criticalChance,statusFraction,DURATION_POWER_STATUSES,CHANCE_EFFECT_NAMES,POWER_RULES} from './tactic-power.mjs';
import {FAMOUS_OFFICERS} from './famous-officers.mjs';
import {famousTargets, tacticOpening, expandedSupportTargets, basicSupportTargets, areaTacticTargets, exposedTarget, tauntTarget, pursuitTarget, flankingTarget, supportApproach, repairTarget} from './tactics.mjs';
export { TROOPS, unitAttributes, disciplineDuration, isRear } from './unit-stats.mjs';
// The simulation has no DOM, network, clock, or storage dependencies.
import { TACTICS_BOOK, unitTactics, readyTactic, hasStatus, setStatus, routeTo, retreatCell, openCell, configureTactics, validLoadout, defaultTacticIds, recommendedTacticIds, NEGATIVE_STATUSES, statusPower, lureCell, absorbShield, refreshShield } from './tactics.mjs';
export { TACTICS_BOOK, unitTactics, hasStatus } from './tactics.mjs';
assertDesignTables();
export const VERSION = 2;
export const GRID = { cols: 14, rows: 8 };
export const COMBO = { window:3, doubleBonus:25, tripleBonus:40 };
export { COMBAT } from './combat-rules.mjs';
export const SKILL_THRESHOLDS = { cao:100, dun:85, liao:95, chu:80, jia:100, yu:90, yuanxia:85, jin:80, shao:100, yan:85, wen:95, he:90, ju:100, tian:100, gao:85 };
export const skillThreshold = unit => Math.min(...unitTactics(unit).map(s=>s.threshold));
import {availableBattleCommanders,STRATAGEMS,OFFICER_STRATAGEMS,officerStratagems,commanderStratagems,selectStratagemSource,stratagemProfile,stratagemEffectText} from './stratagems.mjs';
export {STRATAGEMS,OFFICER_STRATAGEMS,officerStratagems} from './stratagems.mjs';
export const COMMAND_RESOURCE = { capacity:12000 };
// Automatic appointment must consider commands that the leader cannot supply.
// Explicit appointments in campaigns and player-managed armies stay untouched.
export function chooseArmyAdvisor(army) {
  const known=new Set(officerStratagems(army.leader));
  const added=u=>commanderStratagems({id:u.id,role:'advisor'}).filter(key=>!known.has(key)).length;
  return [...army.units].filter(u=>u.troops>0).sort((a,b)=>added(b)-added(a)||b.intellect-a.intellect||a.id.localeCompare(b.id))[0]?.id;
}
export function armyCommanders(army) {
  return ['leader','advisor'].flatMap(role=>{const u=army.units.find(u=>u.id===army[role]&&u.troops>0);return u?[{id:u.id,name:u.name,role,armyId:army.id,leadership:u.leadership,intellect:u.intellect,politics:u.politics,charm:u.charm??OFFICER_BY_ID[u.id]?.charm}]:[];});
}
export const armyStratagems = army => [...new Set(armyCommanders(army).flatMap(commanderStratagems))];
export const battleCommanders = (b,side=0) => availableBattleCommanders(b.sides[side]);
export const battleStratagemSource = (b,key,side=0) => selectStratagemSource(battleCommanders(b,side),key);
export const battleStratagems = (b,side=0) => [...new Set(battleCommanders(b,side).flatMap(commanderStratagems))];
export const commandIntellect = (b,side=0) => b.sides[side].retreat ? 0 : activeUnits(b,side).reduce((n,u)=>n+u.intellect,0);
export function attackRange(b,u) {return unitAttributes(u,b).range;}
export function battleWounded(u) {return Math.max(0,Math.floor(((u.battleDamage??u.initial-u.hp)-(u.battleDeserted||0))*.35)-(u.healed||0));}
function takeCasualties(u,damage) {
  u.battleDamage ??= u.initial-u.hp;u.healed ??=0;
  damage=Math.min(u.hp,damage);u.hp-=damage;u.battleDamage+=damage;return damage;
}
function healWounded(b,u,fraction,ongoing=false,source=u) {
  if(u.status!=='active'||u.hp<=0)return 0;
  const amount=Math.min(battleWounded(u),Math.floor(u.maxHp*fraction*(hasStatus(b,u,'plague')?1-statusFraction(u,'plague',.5):1)),u.maxHp-u.hp);
  if(amount<=0)return 0;
  u.healed=(u.healed||0)+amount;u.hp+=amount;
  combatEffect(b,source,u,true,0,'impact',{name:'救治伤兵',visual:'banner'},{text:'救治 +'+amount,healing:amount,ongoing});return amount;
}
export const isDeploying = b => !!b && !b.deploymentLocked && b.tick === 0 && !b.result;
function gainIntent(unit, amount,source=null) { const before=unit.intent||0;unit.intent = Math.min(COMBAT.intentCap,before+Math.round(amount));if(source&&source!==unit&&unit.intent>before)recordContribution(source,'support',1); }
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
const STARTER_OFFICER_IDS=['cao','dun','liao','chu','jia','yu','yuanxia','jin','shao','yan','wen','he','ju','tian','gao'];
export function makeOfficer(id, troops = 3000, index = 0, level = 1, learningSeed = 521200) {
  const source=OFFICER_BY_ID[id];
  if(!Object.hasOwn(OFFICER_BY_ID,id))throw new Error('未知武将');
  const unit={...officerProfile(id),id,name:source.name,courtesy:source.courtesy,leadership:source.leadership,force:source.force,intellect:source.intellect,politics:source.politics,charm:source.charm,
    skill:source.skill,type:source.type,formation:source.formation,trait:source.trait,
    troops,wounded:0,first:index<6,loyalty:100,level,merit:0};
  if(!Number.isInteger(level)||level<1||level>10)throw new Error('武将等级须为 1～10');
  if(!Number.isSafeInteger(troops)||troops<0||troops>troopCapacity(unit))throw new Error(`${unit.name}带兵须为 0～${troopCapacity(unit)} 人`);
  initializeTacticLearning(unit,learningSeed);
  return unit;
}
export function newGame(seed = 521200) {
  const cities=structuredClone(DEMO_CITY_DESIGNS);
  const state = {
    version: VERSION, rulesVersion:RULES_VERSION, officerDataVersion:4, relationshipScores:{}, relationshipTypes:{}, seed, turn: 1, gold: 3200, grain: 12800, fame: 120,
    cities, roads:structuredClone(DEMO_ROAD_DESIGNS),
    armies: [
      { id: 'a1', name: '虎贲军', faction: 'cao', location: 'xuchang', route: [], target: null, supply: 900, morale: 80, tactic: 'balanced', leader: 'cao', advisor: 'jia', deputy: 'dun', units: STARTER_OFFICER_IDS.slice(0, 8).map((id, i) => makeOfficer(id, 3000, i)), task: '驻守' },
      { id: 'a2', name: '河北军', faction: 'yuan', location: 'guandu', route: [], target: null, supply: 900, morale: 75, tactic: 'aggressive', leader: 'shao', advisor: 'ju', deputy: 'yan', units: STARTER_OFFICER_IDS.slice(8).map((id, i) => makeOfficer(id, 2500, i)), task: '驻守' },
    ],
    logs: [], battle: null, report: null, pending: null, nextId: 3, victories: 0, finished: null,
  };
  for(const u of state.armies.flatMap(a=>a.units))initializeTacticLearning(u,seed);
  log(state, '建安五年，袁曹相争。立足许昌，调兵北上，逐鹿中原。', 'event');
  return state;
}
export function log(state, text, type = 'info') { state.logs.unshift({ turn: state.turn, text, type }); state.logs = state.logs.slice(0, 60); }
export const armyTroops = army => army.units.reduce((n, u) => n + u.troops, 0);
export const cityById = (s, id) => mapNode(s,id);
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
  if (!army || army.faction !== playerFaction(state) || !city) return '请选择己方军团与目的地';
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
  if (!army || army.faction !== playerFaction(state) || cityById(state, army.location).owner !== playerFaction(state)) return '须在己方城池补充兵员';
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
  if (state.battle || state.pending || !army || army.faction !== playerFaction(state) || army.route.length || cityById(state, army.location).owner !== playerFaction(state)) return '只能在己方城池拆分驻守军团';
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
  if (state.battle || state.pending || !a || !b || a === b || a.faction !== playerFaction(state) || b.faction !== a.faction || a.location !== b.location || a.route.length || b.route.length) return '须选择同城驻守的两支己方军团';
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
  const owned = state.cities.filter(c => c.owner === playerFaction(state)).length;
  state.gold += owned * 160; state.grain += owned * 600;
  for (const army of state.armies) {
    const friendly = cityById(state, army.location).owner === army.faction;
    const consumption = Math.max(3, Math.ceil(armyTroops(army) / 1800));
    if (friendly && army.faction === playerFaction(state)) {
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
      const target = state.cities.filter(c => c.owner === playerFaction(state)).sort((a, b) => findRoute(state, enemy.location, a.id).length - findRoute(state, enemy.location, b.id).length || Number(b.id === 'xuchang') - Number(a.id === 'xuchang'))[0];
      if (target) { enemy.route = findRoute(state, enemy.location, target.id); enemy.target = target.id; enemy.task = '出征'; log(state, `斥候来报：${enemy.name}向${target.name}进军。`, 'war'); }
    }
  }
  // Sequential road resolution prevents armies from passing through one another.
  for (const army of [...state.armies].sort((a, b) => Number(b.faction === playerFaction(state)) - Number(a.faction === playerFaction(state)))) {
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
  return { ...u, ...officerProfile(u.id), level:u.level??1,merit:u.merit??0,skillRouteType:u.skillRouteType||u.type,passiveState:initialPassiveState(),participated:false,contribution:emptyContribution(),attackCarry:0,armyId, side, hp: u.troops, maxHp: u.troops, initial: u.troops, battleDamage:0, healed:0, moveProgress:0, status: 'reserve', x: -1, y: -1, morale, cooldown: 0, intent:0, tacticRecoveryUntil:0, cast: null, skillReady:{}, tacticCasts:{}, tacticRestored:{}, tacticUseBonus:{}, statuses:{}, skillCasts: 0, action: '候命', effect: null };
}
export function configureUnitTactics(state,unitId,ids) {
  if(state.battle&&!isDeploying(state.battle))return '开战后战法锁定，暂停也不能更换';
  const source=state.armies.filter(a=>a.faction===playerFaction(state)).flatMap(a=>a.units).find(u=>u.id===unitId);
  const live=state.battle?.sides[0].units.find(u=>u.id===unitId);
  if(!source&&!live)return '找不到己方部队';
  if(!validLoadout(live||source,ids))return '自动携带当前兵种全部已学战法与已学专属，只能调整顺序';
  if(source)configureTactics(source,ids);
  if(live) {configureTactics(live,ids);live.skillReady={};live.tacticCasts={};live.tacticRestored={};live.tacticUseBonus={};live.cast=null;}
  return null;
}
export function startBattle(state,{deferEnemyDeployment=false}={}) {
  if (!state.pending || state.battle) return '没有待处理的战斗';
  const p = state.pending, attacker = armyById(state, p.attackerId), city = cityById(state, p.cityId);
  const defenders = p.defenderIds.map(id => armyById(state, id)).filter(Boolean);
  const supporters = state.armies.filter(a => a.id !== attacker.id && a.faction === attacker.faction && a.location === city.id);
  const attacking = [attacker, ...supporters];
  const friendlyAttack = attacker.faction === playerFaction(state);
  const own = friendlyAttack ? attacking : defenders, enemy = friendlyAttack ? defenders : attacking;
  const makeSide = (armies, index, faction) => ({ faction, commanders:armies.flatMap(armyCommanders),stratagemEffects:{},useRecoveryCommands:{}, rangeUntil:0, recoveryUntil:0, tactic: armies[0]?.tactic || 'defensive', retreat: false, focus: null, focusUntil: 0, inspireUntil: 0, assaultUntil:0, fortifyUntil:0, disruptUntil:0, hasteUntil:0, blockadeUntil:0, reliefUntil:0, units: armies.flatMap(a => {
    const leader = a.units.find(u => u.id === a.leader && u.troops > 0), advisor = a.units.find(u => u.id === a.advisor && u.troops > 0), deputy = a.units.find(u => u.id === a.deputy && u.troops > 0);
    return [...a.units].sort((a, b) => Number(b.first) - Number(a.first)).filter(u => u.troops > 0).map(u => ({ ...combatUnit(u, a.id, index, a.morale), commandBonus: (leader?.leadership || 0) / 1000, deputyBonus: (deputy?.force || 0) / 2000, advisorBonus: (advisor?.intellect || 0) / 1000 }));
  }) });
  const sides = [makeSide(own, 0, playerFaction(state)), makeSide(enemy, 1, friendlyAttack ? p.defenderFaction : attacker.faction)];
  if (city.garrison > 0 && city.owner !== attacker.faction) {
    const index = city.owner === playerFaction(state) ? 0 : 1;
    sides[index].units.push(...garrisonUnits(city).map(u => combatUnit(initializeTacticLearning({...u,level:1,merit:0},state.seed), `city:${city.id}`, index, 70)));
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
  const unit = b.sides[0].units.find(u=>u.id === unitId && ['active','reserve'].includes(u.status) && u.hp>0);
  if(unit && (unit.arrivalTick||0)>b.tick)return '援军尚未抵达，不能上阵';
  if (!unit) return '请选择我军在场部队';
  if(!canOccupy(b,unit,x,y))return '舰船只能布置在水道，陆军只能布置在陆地或桥面';
  const occupied = b.sides.flatMap(s=>s.units).find(u=>u.status === 'active' && u.x === x && u.y === y && u !== unit);
  if (occupied?.side === 1) return '不能与敌军重叠';
  if(occupied&&unit.status==='active'&&!canOccupy(b,occupied,unit.x,unit.y))return '交换后的部队不符合水陆限制';
  if (occupied) { occupied.x = unit.x; occupied.y = unit.y; if(unit.status==='reserve'){occupied.status='reserve';occupied.x=-1;occupied.y=-1;} }
  unit.status='active';unit.x = x; unit.y = y; return null;
}
export function reserveDeploymentUnit(b,id,toId=null) {
  if(!isDeploying(b))return '只能在开战前调整';
  const units=b.sides[0].units,u=units.find(u=>u.id===id&&u.hp>0&&['active','reserve'].includes(u.status));
  if(!u)return '请选择我军部队';
  if(toId===id)return null;
  if(toId&&!units.some(v=>v.id===toId&&v.status==='reserve'))return '后备位置无效';
  u.status='reserve';u.x=-1;u.y=-1;
  units.splice(units.indexOf(u),1);const index=toId?units.findIndex(v=>v.id===toId):units.length;units.splice(index,0,u);return null;
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
export function lockDeployment(b,{validateCount=true}={}) {
  if (!isDeploying(b)) return '当前不在布阵阶段';
  const count=activeUnits(b,0).length;
  if(count>6||(validateCount&&count<1))return `当前上阵 ${count} 队，需安排 1～6 队后才能开战`;
  for(const side of [0,1])b.sides[side].battleIntent=battleIntent(b,side);
  for(const side of b.sides){const source=side.units.find(u=>shieldLayers(b,u).some(l=>l.source==='siege:opening'));if(source){const layer=shieldLayers(b,source).find(l=>l.source==='siege:opening'),ratio=layer.amount/source.initial;for(const u of side.units){refreshShield(b,u,shieldLayers(b,u).filter(l=>l.source!=='siege:opening'));if(u.status==='active')setStatus(b,u,'shield',layer.until-b.tick,{amount:Math.round(u.initial*ratio),source:'siege:opening',label:'守城首发护盾'});}}}
  b.deploymentLocked = true;
  for(const u of b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'))armEntryStatuses(b,u,unitTactics(u));
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
  if(b.deploymentLocked)armEntryStatuses(b,unit,unitTactics(unit));
  unit.passiveState ||= initialPassiveState(b.tick);unit.passiveState.lastMoveTick=b.tick;
  if(b.tick>0&&!unit.passiveState.reserveEntered){
    unit.passiveState.reserveEntered=true;
    if(hasPassive(unit,'prepared')){gainIntent(unit,25);battleLog(b,`${unit.name}「备战」：入场战意 +25。`);}
    if(hasPassive(unit,'adapt')){unit.passiveState.entryUntil=b.tick+15;battleLog(b,`${unit.name}「巧变」：接战增益持续 15 日。`);}
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
    if((b.sides[side].reliefUntil||0)>b.tick)setStatus(b,unit,'shield',8,{amount:Math.round(unit.maxHp*(b.sides[side].stratagemEffects?.reliefUntil?.strength??.15)),source:'army:relief',label:b.sides[side].stratagemEffects?.reliefUntil?stratagemEffectText(b.sides[side].stratagemEffects.reliefUntil):'后军固阵'});
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
  const effect=STRATAGEMS[command]?.effect||command,profile=battleStratagemSource(b,command,side);
  if(STRATAGEMS[command]&&!profile)return '没有符合任职条件的军略提供者';
  const recoveryStrategy=STRATAGEMS[command];
  if(recoveryStrategy?.restoreUses&&b.sides[side].useRecoveryCommands[command])return '本场次数恢复军略已使用';
  if(recoveryStrategy?.restoreUses&&!activeUnits(b,side).some(u=>useRecoveryTargets(u,unitTactics(u)).length))return '在场部队没有可恢复的普通战法次数';
  if(effect==='blockade'&&!b.sides[other].units.some(u=>u.status==='reserve'&&u.hp>0))return '敌军没有待命预备队';
  if(effect==='relief'&&!b.sides[side].units.some(u=>u.status==='reserve'&&u.hp>0))return '我军没有待命预备队';
  if(effect==='heal'&&!activeUnits(b,side).some(u=>battleWounded(u)>0))return '在场部队暂无可救治的本场伤兵';
  if(effect==='firestorm'&&(!activeUnits(b,side).length||!activeUnits(b,other).length))return '当前没有合法的火攻目标';
  if (STRATAGEMS[command]) {
    const strategy = STRATAGEMS[command],provider=b.sides[side].units.find(u=>u.id===profile.id);
    const drainIntent=u=>{if(!isTargetable(b,u))return;const amount=lowerIntent(u,effect==='demoralize'?Math.round(profile.strength):profile.intentDrain);if(amount>0&&u.status==='active')b.effects.push({skill:false,from:provider?.id||u.id,to:u.id,x:u.x,y:u.y,side,damage:0,intentDrained:amount,intentOnly:true,ongoing:true,label:strategy.name});};
    if(provider&&effect!=='heal'&&effect!=='firestorm')recordContribution(provider,strategy.side===1?'control':'support',activeUnits(b,strategy.side===1?other:side).length);
    if(effect==='heal') {for(const u of activeUnits(b,side))healWounded(b,u,profile.strength,false,provider||u);}
    else if(effect==='firestorm') {
      const allies=activeUnits(b,side),targets=activeUnits(b,other).filter(u=>isTargetable(b,u)),source=allies[0];
      const totalPower=allies.reduce((sum,u)=>sum+unitAttributes(u,b).strategyPower,0);
      const amount=Math.max(0,Math.floor(totalPower*(18/280)*profile.power/Math.max(1,targets.length)));
      for(const u of targets)setStatus(b,u,'burn',12,{sourceId:profile.id,sourceName:profile.name,sourceSkillName:strategy.name,amount:Math.floor(amount*(1+(u.type==='ship'?(strategy.shipFireBonus||0):0)))});
    }
    else if (strategy.field) {
      const target=b.sides[strategy.side===0?side:other],until=b.tick+profile.duration+1;
      target[strategy.field]=until;target.stratagemEffects[strategy.field]={...profile,sourceSide:side,castTick:b.tick,until};
    }
    else for (const u of remainingUnits(b,strategy.side===0?side:other)) {
      if (effect === 'demoralize') drainIntent(u);
      else if(effect==='cleanse') {remedy(b,u,'calm');setStatus(b,u,'resolve',profile.resolve,{sourceName:profile.name,sourceSkillName:strategy.name});}
      else if(effect==='cycle') {gainIntent(u,Math.round(profile.strength));for(const id of Object.keys(u.skillReady))u.skillReady[id]=Math.max(b.tick,u.skillReady[id]-profile.cooldownReduction);}
      else gainIntent(u,Math.round(profile.strength));
    }
    if(strategy.restoreUses){
      for(const u of activeUnits(b,side)){const restored=recoverTacticUses(u,unitTactics(u),'restore',true);if(restored.length)battleLog(b,u.name+'恢复：'+restored.map(s=>s.name+' +1次').join('、'));}
      b.sides[side].useRecoveryCommands[command]=1;
    }
    if(strategy.resolve)for(const u of activeUnits(b,side))setStatus(b,u,'resolve',profile.resolve,{sourceName:profile.name,sourceSkillName:strategy.name});
    if(strategy.intentDrain)for(const u of remainingUnits(b,other))drainIntent(u);
    const description=stratagemEffectText(profile);
    battleLog(b,`${side?'敌军':'我军'}军略 · ${strategy.name}：${description}${effect==='heal'?'（仅在场部队）':''}。`);
  }
  if (command === 'retreat') {
    b.sides[side].retreat = true;
    b.sides[side].units.forEach(u => { u.cast = null; });
    b.sides[side].units.filter(u => u.status === 'reserve').forEach(u => { u.status = 'withdrawn'; });
    battleLog(b, (side?'敌军':'我军')+'军令 · 全军撤退：各部向己方边缘撤离，撤离途中仍会受到攻击。');
  }
  if(command!=='retreat')resource.commandProgress=0; resource.commandCooldown = 0; resource.commandReady[command] = b.tick + (STRATAGEMS[command] ? 8 : 3);
  resource.commandSerial = (resource.commandSerial || 0) + 1;
  resource.lastCommand = { key:command, tick:b.tick, serial:resource.commandSerial,...(profile?{source:profile}:{}) };
  return null;
}
function pickTarget(b, unit, inRangeOnly = false, reachableOnly = false) {
  const side = b.sides[unit.side];
  const enemies=[...activeUnits(b,1-unit.side),...decoyTargets(b,1-unit.side),gateTarget(b,unit)].filter(Boolean)
    .filter(target=>isTargetable(b,target)).filter(target=>!reachableOnly||findMoveRoute(b,unit,target).route!==null);
  const forced=tauntTarget(b,unit,attackRange(b,unit));
  if(hasStatus(b,unit,'stealth')){
    const guard=interceptorsAt(b,unit).sort((a,c)=>a.id.localeCompare(c.id))[0];if(guard)return guard;
  }
  if(hasStatus(b,unit,'stealth')&&!forced){
    const reachable=enemies.filter(e=>!e.isDecoy&&findMoveRoute(b,unit,e).route!==null).sort((a,c)=>Number(isRear(c))-Number(isRear(a))||distance(unit,a)-distance(unit,c)||a.id.localeCompare(c.id));
    const target=reachable[0];if(target)return inRangeOnly&&distance(unit,target)>attackRange(b,unit)?null:target;
  }
  const redirect=!forced&&enemies.find(e=>e.isDecoy&&unit.passiveState?.targetId===e.id&&distance(unit,e)<=attackRange(b,unit)&&distance(unit,e)>=(unitAttributes(unit,b).minRange||0)&&canStrikeFrom(b,unit,e));
  if(redirect)return redirect;
  const pool=meleeTargetPool(b,unit,enemies);
  const focused=side.focusUntil>b.tick&&pool.some(e=>e.id===side.focus);
  const chase=!focused&&(pursuitTarget(b,unit,enemies)||flankingTarget(b,unit,enemies));
  const inReach=t=>distance(unit,t)<=attackRange(b,unit)&&distance(unit,t)>=(unitAttributes(unit,b).minRange||0);
  const finishers=pool.filter(t=>inReach(t)&&distance(unit,t)<=2&&t.hp/t.maxHp<=.1);
  const ranged=pool.filter(t=>isRear(t)&&inReach(t));
  const candidates=forced?[forced]:!focused&&finishers.length?finishers:!focused&&ranged.length?ranged:chase&&(!inRangeOnly||inReach(chase))?[chase]:pool;
  return candidates.filter(t=>!inRangeOnly||inReach(t)).sort((a, c) => {
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
  const inLine = retreat ? ()=>true : defenseLine(b,unit,target);
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
    if(!retreat)ambushContact(b,unit);
  } else unit.action = retreat ? '等待撤离' : b.siege?.gate.side===unit.side ? '守护城门' : '调整阵线';
  return route!==null;
}
function ambushContact(b,u){
  if(!hasStatus(b,u,'stealth'))return false;
  const guard=interceptorsAt(b,u).sort((a,c)=>a.id.localeCompare(c.id))[0];if(!guard)return false;
  const stats=unitAttributes(u,b);
  if(!u.cooldown&&!hasStatus(b,u,'disarm')&&stats.minRange<=1&&stats.range>=1)basicAttack(b,u,guard,[]);
  else {breakStealth(b,u,'接触敌方ZOC');u.action='接敌显形';}
  return true;
}
function combatEffect(b, attacker, target, skill, damage, phase = 'impact', definition=null, extra={}) {
  if(phase==='impact'&&!target.isDecoy){
    if(target.type==='gate')recordContribution(attacker,'siege',damage+(extra.repaired||0));
    else if(attacker.side!==target.side&&damage>0){recordContribution(attacker,'damage',damage);recordContribution(target,'taken',damage);}
    recordContribution(attacker,'healing',extra.healing||0);
    if(extra.resolution?.success&&!['seal','taunt'].includes(extra.resolution.effect))recordContribution(attacker,'control',1);
  }
  b.effects.push({ from: attacker.id, to: target.id, damage, skill, phase, visual: definition?.visual || skillVisual(attacker), troop: attacker.type, side: attacker.side, name: attacker.name, label: definition?.name || attacker.skill, fromX: attacker.x, fromY: attacker.y, x: target.x, y: target.y, ...extra });
}
function counters(a,c) { return TROOPS[a].beats===TROOPS[c]?.family; }
function damageGate(b, attacker, scale=1, definition=null) {
  const gate = b.siege.gate, own = unitAttributes(attacker,b);
  const damage = Math.min(gate.hp,Math.max(1,Math.round((definition?own.martialPower+own.siege:own.siege)*scale*(definition?.critical?POWER_RULES.criticalMultiplier:1)*COMBAT.damageScale*(.9+random(b)*.2))));
  gate.hp -= damage;gate.lastDamagedTick=b.tick;
  attacker.participated = true;
  attacker.cooldown = own.attackInterval-(attacker.attackCarry||0); attacker.attackCarry = 0;
  if(!definition)gainIntent(attacker,intentIncome(attacker).attack*contactIntentFactor(b,attacker));
  attacker.action = `攻击城门 · ${damage}`;
  combatEffect(b,attacker,gate,!!definition,damage,'impact',definition,definition?.critChance?{critical:definition.critical,critChance:definition.critChance}:{});
  if (!gate.hp) {
    b.result = { winner:b.siege.attackerSide, reason:'城门失守' };
    battleLog(b,'城门耐久归零，守方败北。');
  }
}
function damageUnit(b, attacker, target, skill, scale=1, definition=null, generateIntent=true,allowCounter=true,terrainOverride=null,intentTargets=null,attack=null) {
  if(hasStatus(b,target,'stasis')||!skill&&!isTargetable(b,target))return 0;
  if(!skill&&!attack&&!target.isDecoy)recordBasicAttack(attacker,target);
  if(!target.isDecoy){attacker.participated=true;target.participated=true;}
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
  if(target.isDecoy){hitDecoy(b,attacker,target,damage);if(!skill){attacker.cooldown=own.attackInterval;attacker.attackCarry=0;}return 0;}
  if(allowCounter&&hasStatus(b,target,'guard')){
    const guard=b.sides[target.side].units.find(v=>v.id===target.statuses.guard.sourceId&&v!==target&&v.status==='active'&&v.hp>0&&!hasStatus(b,v,'stasis')&&distance(v,target)<=statusValue(target,'guard','range'));
    if(guard){const shared=Math.min(guard.hp,Math.round(damage*statusValue(target,'guard','fraction')));damage-=shared;applySecondaryDamage(b,attacker,guard,shared,'护卫分担');}
  }
  const beforeShield=damage;
  damage=absorbShield(b,target,damage);
  const shieldAbsorbed=beforeShield-damage;
  damage=takeCasualties(target,damage); if(damage>0){breakStealth(b,target,'受到伤害');transmitDamage(b,attacker,target,damage);triggerPreparedDecoy(b,target);} target.morale = Math.max(15, target.morale - (skill ? 5 : 1));
  if(!attack){attacker.morale = Math.min(100, attacker.morale + 3); if(!skill){attacker.cooldown = own.attackInterval-(attacker.attackCarry||0);attacker.attackCarry=0;}}
  // Only normal attacks charge the attacker. A multi-hit tactic charges each victim once.
  if(!skill&&generateIntent&&!attack)gainIntent(attacker,intentIncome(attacker).attack*contactIntentFactor(b,attacker));
  let intentDenied=0;
  if (allowCounter && target.hp > 0 && damage>0 && !intentTargets?.has(target.id)) {
    if(deniesHitIntent(attacker,skill))intentDenied=Math.round(intentIncome(target).hit*contactIntentFactor(b,target));
    else gainIntent(target,intentIncome(target).hit*contactIntentFactor(b,target));
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
  if(target.hp>0&&attacker.hp>0&&distance(attacker,target)===1&&hasStatus(b,target,'riposte')&&target.statuses.riposte.lastTick!==b.tick&&!hasStatus(b,target,'confuse')&&!hasStatus(b,target,'disarm')){target.statuses.riposte.lastTick=b.tick;damageUnit(b,target,attacker,true,.55,TACTICS_BOOK.riposte,false,false);}
}
function contactTargets(b,u){
  const stats=unitAttributes(u,b);
  if(stats.range<1||stats.minRange>1)return [];
  return activeUnits(b,1-u.side).filter(e=>isTargetable(b,e)&&distance(u,e)===1).sort((a,c)=>a.id.localeCompare(c.id));
}
function basicAttack(b,u,target,contacts){
  if(hasStatus(b,u,'disarm')){u.action='缴械';return;}
  const surprise=hasStatus(b,u,'stealth')&&!detected(b,u);
  breakStealth(b,u,'发动普攻');
  if(surprise){const hp=target.hp;damageUnit(b,u,target,false);if(!target.isDecoy&&target.hp>0&&target.hp<hp){applyControl(b,target,STATUS_DEFINITIONS.stealth.confuseDays,'confuse',{sourceId:u.id,sourceName:u.name,sourceSkillName:'伏兵'});statusNotice(b,u,'破隐一击 · '+target.name+(hasStatus(b,target,'confuse')?'混乱':'坚定抵御'));}return;}
  if(target.isDecoy)contacts=[];
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
  gainIntent(u,intentIncome(u).attack*contactIntentFactor(b,u));
  if(orb){orb.charges--;if(!orb.charges)delete u.statuses.attackOrb;}
  u.action=`分击 ${contacts.length} 队 · 各分摊 1/${contacts.length}`;
  for(const enemy of attack.targets)counterAttack(b,u,enemy);
}
function pulseSupportAuras(b){
  if(b.tick%AURA_INTERVAL)return;
  for(const target of b.sides.flatMap(side=>side.units)){
    const aura=formationAura(b,target);if(!aura)continue;
    const healing=Math.min(battleWounded(target),target.maxHp-target.hp,Math.round(target.maxHp*FORMATION_AURA.aura.healFraction*aura.factor*(hasStatus(b,target,'plague')?1-statusFraction(target,'plague',.5):1)));
    const prior=target.intent;gainIntent(target,Math.round(FORMATION_AURA.aura.intent*aura.factor),aura.source);
    const intentRestored=target.intent-prior;
    if(healing>0){target.hp+=healing;target.healed+=healing;}
    if(healing>0||intentRestored>0){
      target.participated=true;aura.source.participated=true;
      combatEffect(b,aura.source,target,true,0,'impact',{...FORMATION_AURA,visual:"banner"},{healing,intentRestored,ongoing:true,text:'协阵'+(healing?' · 救治 +'+healing:'')+(intentRestored?' · 战意 +'+intentRestored:'')});
    }
  }
}
function applyControl(b,u,steps,key='confuse',source={}) {
  if(hasStatus(b,u,'resolve'))return;
  setStatus(b,u,key,steps,source);setStatus(b,u,'resolve',steps+3,{...source,sourceNote:'受控保护'});
}
// The window is anchored to the first completed cast, never extended by a chain.
function comboCandidate(b,u,s,target) {
  if(s.attackOrb||s.effect==='repair'||['phalanx','gallop','valor','bulwark','riposte','anchor','emplace'].includes(s.effect))return null;
  const units=b.sides[u.side].units;
  const previous=(b.comboWindows||[]).find(c=>c.side===u.side&&c.targetId===target.id&&b.tick-c.tick<=COMBO.window);
  const actors=(previous?.actors||[]).filter(a=>units.some(v=>v.id===a.id&&v.status==='active'&&v.hp>0));
  if(actors.some(a=>a.id===u.id))return null; // Multi-hit and the same officer cannot link with itself.
  const actor={id:u.id,name:u.name,skillId:s.id,x:u.x,y:u.y};
  return {side:u.side,targetId:target.id,tick:actors.length?previous.tick:b.tick,actors:[...actors,actor]};
}
function finishTactic(b,u,s,target) {
  breakStealth(b,u,'施放战法');
  // Invalid movement casts must not consume a relationship roll.
  if(s.effect==='lure'&&!lureCell(b,u,target)||s.effect==='retreatShot'&&!retreatCell(b,u)||['rush','terror'].includes(s.effect)&&routeTo(b,u,target,3)===null)return false;
  const before=snapshotTactic(b);
  const power=statusPower(u,s,b),factor=powerFactor(power);
  const origin={...u},terrainPath=['rush','terror'].includes(s.effect)?routeTo(b,u,target,3):[];
  const terrainFor=t=>tacticTerrainEffect(b,origin,s,t,terrainPath);
  const terrainNotes=new Set();
  const noteTerrain=t=>{const terrain=terrainFor(t);if(terrain.label)terrainNotes.add(terrain.label);return terrain;};
  const combo=target.isDecoy?null:comboCandidate(b,u,s,target);
  const partner=combo?.actors.at(-2);
  const relation=partner?relationshipInfo(partner.id,u.id,b.relationshipScores,b.relationshipTypes):null;
  const linked=relation&&(relation.chance===100||relation.chance>0&&random(b)<relation.chance/100);
  if(partner&&!linked){combo.actors=[combo.actors.at(-1)];combo.tick=b.tick;}
  const level=combo?Math.min(3,combo.actors.length):1;
  const bonus=(level===3?COMBO.tripleBonus:level===2?COMBO.doubleBonus:0)+(level>1&&hasPassive(u,'combo')?5:0);
  const boosted=(n,t=null,kind=null,scalePower=true)=>Math.round(n*(scalePower?factor:1)*(1+bonus/100)*(t?supportMultiplier(u,t,kind):1));
  const duration=n=>n+(bonus?1:0),effectStart=b.effects.length;
  const attempt=(t,key)=>{
    if(t.side!==u.side&&!isTargetable(b,t))return false;
    const immune=CONTROL_STATUSES.includes(key)&&hasStatus(b,t,'resolve');
    const resistance=unitAttributes(t,b)[s.category==='intellect'?'discipline':'defense'];
    const chance=immune?0:effectChance(power,resistance),success=!immune&&random(b)<chance;
    const text=CHANCE_EFFECT_NAMES[key]+(immune?'免疫':success?'成功':'未成功');
    combatEffect(b,u,t,true,0,'impact',s,{text,resolution:{effect:key,chance,success,immune}});
    return success;
  };
  const status=(t,key,steps,extra={})=>{
    if(t.side!==u.side&&!isTargetable(b,t))return false;
    if(['seal','taunt'].includes(key)&&!attempt(t,key))return false;
    if(DURATION_POWER_STATUSES.has(key))steps=powerDuration(steps,power);
    const terrain=terrainFor(t),adjusted=terrain.statuses.includes(key)?Math.max(1,Math.round(steps*noteTerrain(t).factor)):steps;
    if(t!==u&&t.hp>0&&!hasStatus(b,t,key))recordContribution(u,t.side===u.side?'support':'control',1);
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
  const signal=(t=u,text=s.name,extra={})=>{t.participated=true;const terrain=noteTerrain(t);combatEffect(b,u,t,true,0,'impact',s,{text,...extra,...(terrain.label?{terrain:terrain.label}:{})});};
  const heal=(t,fraction,scalePower=true)=>{
    const amount=Math.min(battleWounded(t),t.maxHp-t.hp,Math.round(boosted(t.maxHp*fraction,t,'healing',scalePower)*(hasStatus(b,t,'plague')?1-statusFraction(t,'plague',.5):1)));
    if(amount<=0||t.status!=='active')return;
    t.hp+=amount;t.healed=(t.healed||0)+amount;u.participated=true;t.participated=true;
    combatEffect(b,u,t,true,0,'impact',s,{text:`救治 +${amount}`,healing:amount});
  };
  const control=(t,steps,key='confuse')=>{
    if(!attempt(t,key))return false;
    const held=holdsLine(b,t),scaled=duration(powerDuration(steps,power));
    applyControl(b,t,s.category==='intellect'?disciplineDuration(b,t,scaled):scaled,key,{sourceId:u.id,sourceName:u.name,sourceSkillName:s.name});
    if(held&&!holdsLine(b,t)){
      signal(t,'拦截中断');
      battleLog(b,`${u.name}「${s.name}」使${t.name}暂时失阵，骑兵可沿空隙突入；其他前排仍能阻挡。`);
    }
    signal(t,CHANCE_EFFECT_NAMES[key]);return true;
  };
  const start={x:u.x,y:u.y};
  const controlSteps=4;
  if(s.attackOrb){
    setStatus(b,u,'attackOrb',Math.max(0,(b.maxTicks||240)-b.tick),{skillId:s.id,charges:ATTACK_ORBS[s.id].charges,potency:factor,sourceId:u.id,sourceName:u.name,sourceSkillName:s.name});
    combatEffect(b,u,u,true,0,'impact',s,{enchantment:true,text:s.name+' · 装填 '+ATTACK_ORBS[s.id].charges+' 次'});
   }else switch(s.effect) {
    case 'status':{const targets=s.statusKey==='link'?activeUnits(b,1-u.side).filter(t=>isTargetable(b,t)&&distance(u,t)<=s.range).sort((a,c)=>Number(c===target)-Number(a===target)||a.id.localeCompare(c.id)).slice(0,s.targets):[target];for(const t of targets){status(t,s.statusKey,s.steps,{sourceId:u.id,...(s.statusKey==='link'?{group:u.id+':'+b.tick}:{} )});signal(t);}break;}
    case 'remedy':remedy(b,target,s.remedy);signal(target);break;
    case 'cleave':activeUnits(b,1-u.side).filter(t=>distance(u,t)===1).sort((a,c)=>a.id.localeCompare(c.id)).slice(0,3).forEach((t,i)=>{if(u.hp>0)hit(t,.95,i===0);});break;
    case 'bulwark':status(u,'bulwark',10);signal();break;
    case 'riposte':status(u,'riposte',8,{lastTick:0});signal();break;
    case 'blight':hit(target,.7);if(target.hp>0)status(target,'plague',10,{sourceId:u.id,amount:Math.round(power*.025)});break;
    case 'mirage':case 'mist':for(const a of expandedSupportTargets(b,u,s)){createDecoy(b,a,{sourceId:u.id,sourceName:u.name,sourceSkillName:s.name});if(s.stasisDays&&a.hp/a.maxHp<=s.stasisHealth&&!hasStatus(b,a,'stasisLock')){const source={sourceId:u.id,sourceName:u.name,sourceSkillName:s.name};setStatus(b,a,'stasis',s.stasisDays,source);setStatus(b,a,'stasisLock',s.stasisLockDays,source);}signal(a);}break;
    case 'repair':{
      if(repairTarget(b,u,s.range)!==target)return false;
      const contested=target.lastDamagedTick!==undefined&&b.tick-target.lastDamagedTick<=3;
      const repaired=Math.min(target.maxHp-target.hp,Math.round(target.maxHp*.04*factor*(contested?.5:1)));
      target.hp+=repaired;u.participated=true;u.cooldown=unitAttributes(u,b).attackInterval;u.attackCarry=0;
      combatEffect(b,u,target,true,0,'impact',s,{text:'修缮 +'+repaired,repaired});
      break;
    }
    case 'bandage':remedy(b,target,'aid');heal(target,.06);break;
    case 'supply':gainIntent(target,boosted(24,target,'intent'),u);signal(target);break;
    case 'camp':for(const a of expandedSupportTargets(b,u,s)){status(a,'camp',8);signal(a);}break;
    case 'regrowth':status(target,'regrowth',6,{amount:boosted(target.maxHp*(.015+power/50000),target,'healing',false),sourceId:u.id});signal(target);break;
    case 'purify':remedy(b,target,'rally');heal(target,.05);signal(target);break;
    case 'bombard':case 'tremor':case 'broadside':case 'undertow':{
      const targets=areaTacticTargets(b,u,s,target,s.range+(s.effect==='bombard'&&hasStatus(b,u,'emplaced')?1:0)).filter(t=>distance(u,t)>=(s.minRange||0));
      targets.forEach((t,i)=>{if(u.hp<=0)return;hit(t,s.effect==='bombard'?(i?.65:1.45):s.effect==='tremor'?.75:s.effect==='broadside'?1.05:.65,i===0);if(t.hp>0&&s.effect==='tremor')status(t,'attackSlow',6);if(t.hp>0&&s.effect==='undertow'){status(t,'slow',6);status(t,'despair',10);}});break;
    }
    case 'ram':if(target.type==='gate')damageGate(b,u,3*(1+bonus/100),definitionFor(target));else hit(target,1.1);break;
    case 'emplace':status(u,'emplaced',10);signal();break;
    case 'plague':hit(target,.6);if(target.hp>0){status(target,'plague',10,{sourceId:u.id,amount:boosted(power*(12/280+.08)*100/(100+unitAttributes(target,b).discipline),null,null,false)});}break;
    case 'nexus':status(target,'nexus',8);signal(target);break;
    case 'navalRam':{const path=routeTo(b,u,target,2);if(!path?.length)return false;Object.assign(u,path.at(-1));moved(b,u,start);hit(target,1.7);break;}
    case 'anchor':status(u,'anchored',8);signal();break;
    case 'boarding':heal(target,.1);gainIntent(target,boosted(20,target,'intent'),u);signal(target);break;
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
          // Snapshot conditions before this cast applies its own hit intent or debuffs.
          const opening=tacticOpening(b,s,t);
          const scale=s.scale+(s.execute&&t.hp/t.maxHp<.4?s.execute:0)+opening.scale;
          if(opening.setup||opening.highIntent)signal(t,opening.setup?'乘隙追击':'高战意反制',{openingTrigger:opening.setup?'setup':'highIntent'});
          for(let i=0;i<(s.hits||1)&&t.hp>0;i++){hit(t,scale,!charged);charged=true;}
          if(t.hp<=0)continue;
          if(s.debuff)status(t,s.debuff,s.steps);
          if(s.control)control(t,s.steps,s.control);
          if(s.drain){const amount=lowerIntent(t,boosted(s.drain+opening.drain),u);signal(t,`战意 −${amount}`,{intentDrained:amount});}
          if(s.burn)status(t,'burn',s.steps,{sourceId:u.id,amount:boosted(s.burn*power/280*100/(100+unitAttributes(t,b).discipline),null,null,false)});
        }else{
          if(s.useEffect&&t!==u){const restored=recoverTacticUses(t,unitTactics(t),s.useEffect);for(const skill of restored)signal(t,skill.name+(s.useEffect==='expand'?'上限及剩余 +1':'次数恢复 +1'),{tacticUseChange:{id:skill.id,mode:s.useEffect,amount:1}});}
          if(s.heal)heal(t,s.heal);
          if(s.cleanse){remedy(b,t,'calm');status(t,'resolve',3);}
          if(s.shield)status(t,'shield',8,{amount:boosted(t.maxHp*s.shield*(.5+power/200),t,'shield',false)});
          if(s.intent&&t!==u)gainIntent(t,boosted(s.intent,t,'intent'),u);
          if(s.cooldownReduction&&t!==u)for(const id of Object.keys(t.skillReady||{}))t.skillReady[id]=Math.max(b.tick,t.skillReady[id]-boosted(s.cooldownReduction,t,'cooldown'));
          if(s.ward)status(t,'ward',5,{percent:s.ward});
          if(s.valor)status(t,'valor',5);
          if(s.buffs)for(const [key,potency]of Object.entries(s.buffs))if(!hasStatus(b,t,key)||(t.statuses[key].potency??1)<=factor*potency)status(t,key,s.buffSteps,{potency:factor*potency});
        }
        signal(t,s.name);
      }
      if(s.selfCleanse){remedy(b,u,'calm');status(u,'resolve',3);}
      if(s.selfWard)status(u,'ward',s.selfWardSteps||5,{percent:s.selfWard});
      if(s.selfRiposte)status(u,'riposte',s.selfRiposte,{lastTick:0});
      if(s.allyIntent)for(const ally of activeUnits(b,u.side).filter(a=>a!==u&&hexDistance(u,a)<=s.allyRange&&a.intent<COMBAT.intentCap).sort((a,c)=>a.intent-c.intent||a.id.localeCompare(c.id)).slice(0,s.allyTargets)){
        gainIntent(ally,boosted(s.allyIntent,ally,'intent'),u);signal(ally,`鼓舞 · 战意 +${boosted(s.allyIntent,ally,'intent')}`);
      }
      break;
    }
    case 'confuse':if(s.id==='doubt'){hit(target,1.6);status(u,'strategyAttack',10);}if(target.hp>0)control(target,controlSteps,'confuse');break;
    case 'wildfire': {
      const targets=areaTacticTargets(b,u,s,target,s.range),scale=hasStatus(b,target,'burn')?1.25:.85;
      targets.forEach((t,i)=>{hit(t,scale,i===0);if(t.hp>0)status(t,'burn',6,{sourceId:u.id,amount:boosted(power*(6/280+.04)*100/(100+unitAttributes(t,b).discipline),null,null,false)});});status(u,'strategyAttack',16);status(u,'burningAttack',12,{powerStat:'strategyPower',rate:6/280+.04});break;
    }
    case 'rally':for(const a of basicSupportTargets(b,u,s)){const amount=boosted(24+Math.round(power*.02),a,'intent',false);gainIntent(a,amount,u);signal(a,`战意 +${amount}`);}break;
    case 'taunt':if(status(target,'taunt',4,{sourceId:u.id}))signal(target,'挑衅 · 引战');break;
    case 'cleanse':remedy(b,target,'calm');status(target,'resolve',3);status(target,'shield',8,{amount:boosted(target.maxHp*(.08+power/8000),target,'shield',false)});signal(target,'解围 · 护盾');break;
    case 'screen':for(const a of basicSupportTargets(b,u,s)){heal(a,.08+power/10000,false);status(a,'shield',6,{amount:boosted(a.maxHp*.04,a,'shield')});signal(a,'救护 · 护盾');}break;
    case 'lure': {
      const cell=lureCell(b,u,target);if(!cell)return false;
      if(!attempt(target,'lure'))break;
      const from={x:target.x,y:target.y};Object.assign(target,cell);moved(b,target,from);status(target,'armorBreak',6);
      combatEffect(b,u,target,true,0,'impact',s,{fromX:from.x,fromY:from.y,text:'诱敌 · 破防'});break;
    }
    case 'harass':{const amount=lowerIntent(target,boosted(24+Math.round(power*.03),null,null,false),u);status(target,'weaken',6);if(!hasStatus(b,target,'resolve'))status(target,'disrupted',4);signal(target,`战意 −${amount}`,{intentDrained:amount});break;}
    case 'relay':for(const a of basicSupportTargets(b,u,s)){heal(a,.07+power/10000,false);for(const id of Object.keys(a.skillReady))a.skillReady[id]=Math.max(b.tick,a.skillReady[id]-boosted(2,a,'cooldown'));status(a,'haste',4);signal(a,'策应 · 冷却缩短');}break;
    case 'ambush':hit(target,.6);if(target.hp>0){status(target,'slow',6);status(target,'weaken',6);}break;
    case 'seal':if(status(target,'seal',5))signal(target,'封技');break;
    case 'phalanx':status(u,'phalanx',8);signal(u,'方阵 · 减伤');break;
    case 'gallop':{
      status(u,'ward',6,{percent:25});
      status(u,'phase',4);
      const nearest=activeUnits(b,1-u.side).sort((a,c)=>distance(u,a)-distance(u,c)||a.id.localeCompare(c.id))[0];
      if(nearest&&routeTo(b,u,nearest,14)?.length)status(u,'haste',6);
      signal(u,'疾驰 · 无视拦截');break;
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
      hit(target,s.effect==='terror'?2.7:isRear(target)?2.2:1.6);
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
    case 'undermine':{const opening=tacticOpening(b,s,target),amount=lowerIntent(target,boosted(s.drain+opening.drain),u);status(target,'intentSuppression',6);signal(target,'战意 −'+amount,{intentDrained:amount,...(opening.highIntent?{openingTrigger:'highIntent'}:{})});break;}
    default:return false;
  }
  const castEvents=b.effects.slice(effectStart).filter(e=>e.from===u.id&&!e.ongoing);
  if(castEvents.length){castEvents[0].outcome=tacticOutcome(b,u,before,castEvents);castEvents[0].castPower=power;}
  const effective=castEvents.some(e=>e.damage>0||e.healing>0||e.shieldAbsorbed>0||e.resolution?.success||e.tacticUseChange)||b.sides.flatMap(side=>side.units).some(t=>{
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
      battleLog(b,'关系 '+relation.score+' · 连携概率 '+relation.chance+'% · '+title+' · '+combo.actors.map(a=>a.name).join(' → ')+' 对 '+target.name+' 发动「'+s.name+'」，伤害及数值效果 +'+bonus+'%，控制与状态持续 +1 日。');
    }
  }
  if(partner&&!linked)battleLog(b,partner.name+' → '+u.name+'：关系 '+relation.score+'，'+relation.chance+'% 连携判定未成功，战法正常生效。');
  if(['relay','screen','bandage','regrowth','purify','boarding'].includes(s.effect)){u.cooldown=unitAttributes(u,b).attackInterval;u.attackCarry=0;}
  u.participated=true;target.participated=true;
  u.skillCasts=(u.skillCasts||0)+1;u.tacticCasts[s.id]=(u.tacticCasts[s.id]||0)+1;
  const intentBeforeCost=u.intent;
  u.intent=Math.max(0,u.intent-s.intentCost);
  u.tacticRecoveryUntil=b.tick+TACTIC_RECOVERY_STEPS;
  if(castEvents.length)castEvents[0].intentPayment={before:intentBeforeCost,cost:s.intentCost,after:u.intent};
  u.action=s.name;battleLog(b,`${u.name}发动「${s.name}」：${s.description}。${terrainNotes.size?'【地形】'+[...terrainNotes].join('；'):''}`);return true;
}
function triggerPreparedDecoy(b,u){
  const mark=u.preparedDecoy;
  if(!mark||mark.used||u.hp<=0||u.hp/u.initial>=mark.threshold)return;
  if(createDecoy(b,u,mark.source||{})){mark.used=true;statusNotice(b,u,'疑兵预置触发');}
}
function applySecondaryDamage(b,attacker,u,amount,label){
  if(hasStatus(b,u,'stasis')||u.hp<=0)return;
  const damage=takeCasualties(u,absorbShield(b,u,amount));
  if(damage>0){breakStealth(b,u,label);triggerPreparedDecoy(b,u);combatEffect(b,attacker,u,true,damage,'impact',{name:label},{ongoing:true,text:label});}
  if(u.hp<=0){u.status='defeated';u.cast=null;u.action='溃败';}
}
function transmitDamage(b,attacker,target,damage){
  if(!hasStatus(b,target,'link')||damage<=0)return;
  const group=target.statuses.link.group;
  const others=activeUnits(b,target.side).filter(u=>u!==target&&hasStatus(b,u,'link')&&u.statuses.link.group===group&&!hasStatus(b,u,'stasis'));
  const total=Math.round(damage*statusValue(target,'link','fraction'));
  others.forEach((u,i)=>applySecondaryDamage(b,attacker,u,Math.floor(total/others.length)+(i<total%others.length?1:0),'连环传导'));
}
function tickStatuses(b) {
  for(const u of b.sides.flatMap(s=>s.units)) {
    u.statuses ||= {};u.skillReady ||= {};u.tacticCasts ||= {};refreshShield(b,u);
    for(const [key,status] of Object.entries(u.statuses))if(status.until<=b.tick){if(key==='stealth')statusNotice(b,u,'伏兵显形 · 潜行到期');delete u.statuses[key];}
    if(u.status!=='active'||u.hp<=0)continue;
    if(hasStatus(b,u,'despair')){const amount=lowerIntent(u,statusValue(u,'despair','amount'));if(amount)statusNotice(b,u,'丧志 · 战意 −'+amount);}
    if(hasStatus(b,u,'regrowth')){const regen=u.statuses.regrowth,source=b.sides.flatMap(s=>s.units).find(a=>a.id===regen.sourceId);const amount=Math.min(battleWounded(u),u.maxHp-u.hp,Math.round(regen.amount*(hasStatus(b,u,'plague')?1-statusFraction(u,'plague',.5):1)));if(amount>0){u.hp+=amount;u.healed+=amount;u.participated=true;if(source)combatEffect(b,source,u,true,0,'impact',TACTICS_BOOK.regrowth,{text:'休整 +'+amount,healing:amount,ongoing:true});}}
    for(const key of ['burn','plague'])if(u.hp>0&&!hasStatus(b,u,'stasis')&&hasStatus(b,u,key)) {
      const burn=u.statuses[key],source=b.sides.flatMap(s=>s.units).find(s=>s.id===burn.sourceId);
      const terrainFactor=key==='plague'?1:fireTerrainFactor(b,u);
      let damage=Math.round(burn.amount*passiveDamageTaken(b,u,'dot')*terrainFactor);u.participated=true;
      damage=absorbShield(b,u,damage);
      damage=takeCasualties(u,damage);
      if(damage>0){breakStealth(b,u,'持续伤害');triggerPreparedDecoy(b,u);}
      if(source)combatEffect(b,source,u,false,damage,'impact',(key==='plague'?TACTICS_BOOK.plague:TACTICS_BOOK.fire),{text:key==='plague'?'疫伤':key==='burn'?'火攻':`灼烧 ${burn.stacks||1}层`,damageKind:'dot',fromX:u.x,fromY:u.y});
      if(u.hp<=0) {u.status='defeated';u.cast=null;u.action='溃败';battleLog(b,`${u.name}所部在持续伤害中溃败。`);}
    }
  }
}
export function stepBattle(b) {
  if (!b || b.result) return;
  if (isDeploying(b) && lockDeployment(b)) return;
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
  for(const side of b.sides)if(side.recoveryUntil>b.tick)for(const u of side.units)healWounded(b,u,side.stratagemEffects?.recoveryUntil?.strength??.01,true,side.units.find(x=>x.id===side.stratagemEffects?.recoveryUntil?.id)||u);
  fillSlots(b, 0); fillSlots(b, 1);
  b.commandProgress=Math.min(COMMAND_RESOURCE.capacity,(b.commandProgress||0)+commandIntellect(b));
  b.enemyCommand.commandProgress=Math.min(COMMAND_RESOURCE.capacity,b.enemyCommand.commandProgress+commandIntellect(b,1));
  // Alternate initiative each step so one faction does not always act first.
  const sequence = b.tick % 2 ? [0, 1] : [1, 0];
  for (const side of sequence) for (const unit of [...activeUnits(b, side)]) {
    if (unit.status !== 'active') continue;
    unit.attackCarry=unit.cooldown>1e-9&&unit.cooldown<1?1-unit.cooldown:0;
    unit.cooldown = unit.cooldown-1<1e-9?0:unit.cooldown-1;
    if(hasStatus(b,unit,'stasis')){unit.action='避战 · 无敌';continue;}
    if(hasStatus(b,unit,'confuse')) {unit.action='混乱';continue;}
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
    if(ambushContact(b,unit))continue;
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
    if(breachGate&&['siege','ram','tower'].includes(unit.type)&&unitTactics(unit).some(s=>s.id==='ram'&&tacticUsesLeft(unit,s)>0)&&unit.intent>=TACTICS_BOOK.ram.threshold&&(unit.skillReady.ram||0)<=b.tick&&!tauntTarget(b,unit,attackRange(b,unit))&&!activeUnits(b,1-side).some(e=>distance(unit,e)<=2)&&distance(unit,breachGate)>2){moveUnit(b,unit,breachGate,false,2);continue;}
    const focused=pickTarget(b,unit);
    const explicitFocus=focused && b.sides[side].focus===focused.id && b.sides[side].focusUntil>b.tick;
    const contacts=hasStatus(b,unit,'stealth')?[]:contactTargets(b,unit);
    const target = (contacts.length>1?contacts.find(e=>e.id===focused?.id)||contacts[0]:null) || (!unit.cooldown && !explicitFocus ? pickTarget(b,unit,true) : null) || focused; if (!target) continue;
    if(distance(unit,target)<(unitAttributes(unit,b).minRange||0)){const cell=retreatCell(b,unit),speed=unitAttributes(unit,b).move;if(cell&&speed>0){unit.moveProgress+=speed;if(unit.moveProgress>=1){unit.moveProgress%=1;const from={x:unit.x,y:unit.y};Object.assign(unit,cell);moved(b,unit,from);}}unit.action='撤离射击盲区';continue;}
    if (distance(unit, target) <= attackRange(b,unit)) {
      if (!unit.cooldown) {
        if(hasStatus(b,unit,'disarm')){unit.action='缴械';continue;}
        if (target.type === 'gate'){breakStealth(b,unit,'攻击城门');damageGate(b,unit);}
        else basicAttack(b,unit,target,contacts);
        if (b.result) return;
      } else unit.action = '重整攻势';
    } else {
      const support=!hasStatus(b,unit,'stealth')&&!explicitFocus&&!tauntTarget(b,unit,attackRange(b,unit))&&supportApproach(b,unit);
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
  const attacker = armyById(state, context.attackerId), attackerSide = attacker.faction === playerFaction(state) ? 0 : 1;
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
        if(unit.participated||battleMerit(unit,false).score>0){
          const merit=battleMerit(unit,b.result.winner===side),result=gainMerit(source,merit.award);
          if(merit.score>0)growth.push({id:source.id,name:source.name,side,...merit,...result});
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
    const isAttacker = context.attackingIds.includes(id), won = b.result.winner === (army.faction === playerFaction(state) ? 0 : 1);
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
  if (state.cities.every(c => c.owner === playerFaction(state))) state.finished = 'victory';
  else if (!state.cities.some(c => c.owner === playerFaction(state))) state.finished = 'defeat';
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
  require(value.officerDataVersion===4,'存档不是当前武将数据版本，请重新开始');
  let scenario = value.testScenario && SCENARIOS.find(s => s.id === value.testScenario.id);
  require(value.testScenario === undefined || (scenario && number(value.testScenario.seed,0xffffffff)), '测试战役无效');
  if(scenario?.id==='officer-lab'){
    const ids=value.testScenario.officerIds;
    require(Array.isArray(ids)&&ids.length>=1&&ids.length<=6&&new Set(ids).size===ids.length&&ids.every(id=>Object.hasOwn(OFFICER_BY_ID,id)),'试炼武将阵容无效');
    require(value.armies?.[0]?.units?.map(u=>u.id).join(',')===ids.join(','),'试炼阵容与武将不一致');
  }
  if (scenario) require(number(value.testScenario.shieldPercent,100),'开场护盾比例无效');
  if(scenario){const custom=validateCustomBattle(value.testScenario.customBattle);require(custom.seed===value.testScenario.seed&&custom.shieldPercent===value.testScenario.shieldPercent,'战役生成配置不一致');scenario={...scenario,limit:custom.limit,waves:custom.waves,holdUntil:custom.holdUntil,gateHp:custom.battleKind==='field'?0:custom.gateHp,defending:custom.battleKind==='defense'};}
  const initial = strategic && value.campaign?.scenarioId ? nationalWorld(value.campaign.scenarioId) : newGame();
  require(Array.isArray(value.cities) && value.cities.length === initial.cities.length && Array.isArray(value.armies) && value.armies.length <= (strategic?Object.keys(OFFICER_BY_ID).length:15) && Array.isArray(value.logs) && value.logs.length <= 60 && JSON.stringify(value.roads) === JSON.stringify(initial.roads), '存档结构不完整');
  if(strategic)require(JSON.stringify(value.junctions)===JSON.stringify(initial.junctions)&&JSON.stringify(value.roadSegments)===JSON.stringify(initial.roadSegments),'路网数据不匹配');
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
    require(number(u.level,10)&&u.level>=1&&number(u.merit)&&((u.level===10&&u.merit===0)||(u.level<10&&u.merit<meritNeeded(u.level))),'武将等级或功绩无效');
    require(u.skillRouteType===undefined||Object.hasOwn(TROOPS,u.skillRouteType),'通用技能路线无效');
    if (Object.hasOwn(OFFICER_BY_ID,u.id)) {
      const source=makeOfficer(u.id);
      const keys=['name','courtesy','leadership','force','intellect','politics','charm','skill','trait','loyalty'];
      for(const key of keys)require(u[key]===source[key],'武将基础数据不匹配');
    } else {
      require((combat && /^g-[a-z]+-\d$/.test(u.id)) && text(u.name, 20) && text(u.skill) && number(u.leadership, 100) && number(u.force, 100) && number(u.intellect, 100) && number(u.politics,100), '守军数据无效');
    }
  }
  const armyIds = new Set();
  for (const army of value.armies) {
    require(army && /^a\d+$/.test(army.id) && !armyIds.has(army.id) && faction(army.faction) && cityById(value, army.location) && tactic(army.tactic) && text(army.name, 30) && text(army.task, 20), '军团数据无效');
    armyIds.add(army.id);
    require(Array.isArray(army.units) && army.units.length > 0 && army.units.length <= (strategic ? Object.keys(OFFICER_BY_ID).length : scenario ? 10 : 15) && Array.isArray(army.route) && army.route.length <= mapNodes(initial).length && army.route.every(id => cityById(value, id)) && number(army.supply) && number(army.morale, 100), '军团数据不完整');
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
      const siege = b.siege, gate = siege?.gate, attackerSide = scenario.defending ? 1 : 0;
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
      require(side.useRecoveryCommands&&typeof side.useRecoveryCommands==='object'&&!Array.isArray(side.useRecoveryCommands),'次数恢复军略记录缺失');
      for(const [key,n] of Object.entries(side.useRecoveryCommands))require(STRATAGEMS[key]?.restoreUses&&n===1,'次数恢复军略记录无效');
      for (const key of ['rangeUntil','recoveryUntil','assaultUntil','fortifyUntil','disruptUntil','hasteUntil','blockadeUntil','reliefUntil']) require(number(side[key]));
      require(side.stratagemEffects&&typeof side.stratagemEffects==='object'&&!Array.isArray(side.stratagemEffects),'军略效果记录缺失');
      for(const field of ['rangeUntil','recoveryUntil','assaultUntil','fortifyUntil','disruptUntil','hasteUntil','blockadeUntil','reliefUntil'])require(!side[field]||side.stratagemEffects[field],'军略效果来源缺失');
      const last=(index===0?b:b.enemyCommand).lastCommand;
      if(last&&STRATAGEMS[last.key]){
        // A later reinforcement may provide a stronger copy; validate the actual caster.
        const provider=side.commanders.find(c=>c.id===last.source?.id&&c.role===last.source?.role&&commanderStratagems(c).includes(last.key));
        const expected=provider&&stratagemProfile(last.key,provider);
        require(expected&&last.source,'军略施放来源缺失');
        for(const key of Object.keys(expected))require(JSON.stringify(last.source[key])===JSON.stringify(expected[key]),'军略施放来源无效');
      }
      for(const [field,p] of Object.entries(side.stratagemEffects)){
        require(p&&STRATAGEMS[p.key]?.field===field&&[0,1].includes(p.sourceSide)&&number(p.castTick,b.tick)&&p.until===side[field],'军略效果来源无效');
        const eligible=[...new Set([...b.context.attackingIds,...b.context.defenderIds])].map(id=>armyById(value,id)).filter(a=>a.faction===b.sides[p.sourceSide].faction).flatMap(armyCommanders);
        const provider=eligible.find(c=>c.id===p.id&&c.role===p.role&&commanderStratagems(c).includes(p.key));
        require(!!provider,'军略提供者无效');const expected=stratagemProfile(p.key,provider);
        for(const key of Object.keys(expected))require(JSON.stringify(p[key])===JSON.stringify(expected[key]),'军略强度数据无效');
        require(p.until===p.castTick+p.duration+1&&(STRATAGEMS[p.key].side===0?p.sourceSide:1-p.sourceSide)===index,'军略持续时间无效');
      }
      require(side&&((side.battleIntent===undefined&&!b.deploymentLocked)||Object.hasOwn(BATTLE_INTENTS,side.battleIntent)),'战斗意图无效');
      require(side && faction(side.faction) && tactic(side.tactic) && typeof side.retreat === 'boolean' && number(side.focusUntil) && number(side.inspireUntil) && (side.focus === null || text(side.focus)) && Array.isArray(side.units) && side.units.length <= (strategic ? Object.keys(OFFICER_BY_ID).length : 30));
      require(isDeploying(b) || side.units.filter(u => u.status === 'active').length <= 6, '战场超出容量');
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
        if(sourceOfficer){require(u.level===sourceOfficer.level&&u.merit===sourceOfficer.merit,'战场等级与武将数据不一致');require(JSON.stringify(u.tacticLearning)===JSON.stringify(sourceOfficer.tacticLearning),'战场战法学习与武将数据不一致');}
        require(u.contribution&&Object.keys(emptyContribution()).every(key=>number(u.contribution[key])),'战斗贡献数据无效');
        require(number(u.battleDamage)&&number(u.healed)&&number(u.battleDeserted||0,u.battleDamage)&&(strategic||!u.battleDeserted)&&u.battleDamage-u.healed===u.initial-u.hp&&u.healed<=Math.floor((u.battleDamage-(u.battleDeserted||0))*.35),'伤兵治疗数据无效');
        const skills=unitTactics(u).map(s=>s.id);
        for(const map of [u.skillReady,u.tacticCasts,u.tacticRestored,u.tacticUseBonus]) {
          require(map && typeof map==='object' && !Array.isArray(map),'战法冷却数据无效');
          for(const [key,n] of Object.entries(map))require(skills.includes(key)&&number(n),'战法冷却数据无效');
        }
        for(const s of unitTactics(u)){
          const restored=u.tacticRestored[s.id]||0,bonus=u.tacticUseBonus[s.id]||0,casts=u.tacticCasts[s.id]||0;
          require(Number.isInteger(restored)&&Number.isInteger(bonus)&&Number.isInteger(casts)&&bonus<=1&&restored<=casts&&casts<=tacticUseLimit(u,s)+restored&&(!restored&&!bonus||canRestoreTactic(s)),'战法次数数据无效');
        }
        if(u.entryStatusesApplied!==undefined)require(typeof u.entryStatusesApplied==='boolean','首次入场标记无效');
        if(u.preparedDecoy!==undefined){const p=u.preparedDecoy;require(p&&Number.isFinite(p.threshold)&&p.threshold>0&&p.threshold<=1&&typeof p.used==='boolean'&&p.source&&typeof p.source==='object','预置疑兵无效');}
        require(u.statuses && typeof u.statuses==='object' && !Array.isArray(u.statuses),'状态数据无效');
        for(const [key,status] of Object.entries(u.statuses)) {
          for(const field of ['sourceName','sourceSkillName','sourceNote'])if(status?.[field]!==undefined)require(text(status[field],100),'状态来源无效');
          if(status?.origins!==undefined)require(Array.isArray(status.origins)&&status.origins.length<=512&&status.origins.every(o=>o&&text(o.sourceSkillName,100)&&(o.sourceName===undefined||text(o.sourceName,100))),'叠层状态来源无效');
          require(Object.hasOwn(STATUS_DEFINITIONS,key) && status && number(status.until),'状态数据无效');
          if(key==='attackOrb')require(ATTACK_ORBS[status.skillId]&&skills.includes(status.skillId)&&Number.isInteger(status.charges)&&status.charges>=1&&status.charges<=ATTACK_ORBS[status.skillId].charges&&status.until===(b.maxTicks||240)+1&&text(status.sourceSkillName,100)&&status.sourceId===u.id,'强化普攻次数或来源无效');
          if(status.potency!==undefined)require(Number.isFinite(status.potency)&&status.potency>=POWER_RULES.minFactor*(['valor','camp'].includes(key)?.4:1)&&status.potency<=POWER_RULES.maxFactor,'战法威力快照无效');
          if(key==='decoy')require(number(status.hp,Math.round(u.initial*STATUS_DEFINITIONS.decoy.hpFraction))&&status.hp>0&&number(status.x,13)&&number(status.y,7),'疑兵耐久或位置无效');
          if(status.amount!==undefined)require(number(status.amount,1000000),'状态数值无效');
          if(status.fraction!==undefined)require(Number.isFinite(status.fraction)&&status.fraction>=0&&status.fraction<=.8,'状态比例无效');
          if(key==='guard')require(b.sides[u.side].units.some(v=>v.id===status.sourceId&&v!==u),'护卫来源无效');
          if(key==='link')require(text(status.group,100),'连环分组无效');
          if(key==='riposte')require(number(status.lastTick,b.tick),'反击步数无效');
          if(['plague','regrowth'].includes(key))require(number(status.amount,1000000)&&text(status.sourceId,40),'持续效果无效');
          if(key==='taunt')require(text(status.sourceId,40),'嘲讽来源无效');
          if(key==='pursuit')require(u.type==='cavalry'&&text(status.targetId,40),'追击目标无效');
          if(key==='ward')require(number(status.percent,80));
          if(key==='shield') {
            require(number(status.amount,u.maxHp));
            require(Array.isArray(status.layers)&&status.layers.length>0&&status.layers.length<=60&&status.layers.every(l=>l&&number(l.amount,u.maxHp)&&l.amount>0&&number(l.until)&&text(l.source)&&text(l.label)), '护盾层无效');require(new Set(status.layers.map(l=>l.source)).size===status.layers.length,'护盾来源重复');require(status.amount===status.layers.reduce((n,l)=>n+l.amount,0)&&status.until===Math.max(...status.layers.map(l=>l.until)),'护盾汇总无效');
          }
          if(key==='burn'||key==='burn')require(number(status.amount,1000000) && typeof status.sourceId==='string');
          if(key==='burningAttack')require(['martialPower','strategyPower'].includes(status.powerStat)&&[6/280+.03,6/280+.04].includes(status.rate),'燃击威力无效');
          if(key==='burn')require(number(status.baseAmount,1000000)&&Number.isInteger(status.stacks)&&status.stacks>=1&&status.stacks<=3&&status.amount===status.baseAmount*status.stacks,'燃烧层数无效');
        }
        require(['active', 'reserve', 'defeated', 'withdrawn'].includes(u.status) && number(u.hp) && number(u.initial,troopCapacity(u)) && u.initial > 0 && u.hp <= u.initial && u.maxHp === u.initial && number(u.morale, 100) && Number.isFinite(u.cooldown)&&u.cooldown>=0&&u.cooldown<=Number.MAX_SAFE_INTEGER && number(u.intent,COMBAT.intentCap) && text(u.action), '部队状态无效');
        require(u.skillCasts === undefined || number(u.skillCasts), '战法次数无效');
        require(number(u.tacticRecoveryUntil,b.tick+TACTIC_RECOVERY_STEPS), '战法调息数据无效');
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
    for(const u of b.sides.flatMap(s=>s.units))for(const key of ['burn','plague','regrowth'])if(u.statuses[key])require(unitIds.has(u.statuses[key].sourceId),'灼烧来源无效');
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
      if(e.intentDrained!==undefined)require(number(e.intentDrained,COMBAT.intentCap),'削减战意记录无效');
      if(e.openingTrigger!==undefined)require(['setup','highIntent'].includes(e.openingTrigger),'战法条件记录无效');
      if(e.intentPayment!==undefined){const p=e.intentPayment;require(p&&number(p.before,COMBAT.intentCap)&&number(p.cost,COMBAT.intentCap)&&number(p.after,COMBAT.intentCap)&&p.after===Math.max(0,p.before-p.cost),'战意消耗记录无效');}
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
    require(Array.isArray(r.growth)&&r.growth.length<=(scenario?60:15)&&new Set(r.growth.map(g=>g?.id)).size===r.growth.length&&r.growth.every(g=>g&&Object.hasOwn(OFFICER_BY_ID,g.id)&&text(g.name,20)&&[0,1].includes(g.side)&&number(g.before,10)&&g.before>=1&&number(g.after,10)&&g.after>=g.before&&number(g.gained)&&g.contribution&&Object.keys(emptyContribution()).every(key=>number(g.contribution[key]))&&number(g.score)&&number(g.award)&&Array.isArray(g.unlocked)&&g.unlocked.length<=100&&g.unlocked.every(s=>text(s,20))),'成长战报无效');
  }
  return value;
}
