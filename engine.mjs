import {validateBattleAppointments,commandProvidersAt,planBattleAppointmentsAI,planArrivalAppointmentsAI} from './battle-appointments.mjs';
import {preparePostbattleAppointments,validatePendingAppointments,pendingArmyAppointments} from './postbattle-appointments.mjs';
import {combatType,combatFamily,validEquipment,emptyEquipment,desiredForm,allowedFormTypes,canEquip,equipmentCost} from './troop-equipment.mjs';
import {validTreasureId,treasureDesign} from './data/design/treasures.mjs';
import {recordTreasureDamage,validTreasureBattle} from './treasure-battle.mjs';
import {refreshTreasureStatuses,treasureHealBudget,debitTreasureHealing,validateTreasureStatus} from './treasure-statuses.mjs';
import {peachInvincible,peachRecipients,splitPeachDamage,settlePeach,validPeachState,validReserveState,validPeachStatus} from './bond-reserves-peach.mjs';
import {heavyRule,validBondEquipmentStatus} from './bond-equipment.mjs';
import {recordBondDefeat,validBondRout} from './bond-battlefield.mjs';
import {validBondState} from './bond-events.mjs';
import {resolveBondHit,resolveBondAttack,pulseBondCombos,settleEscortBreak,validEscortStatus} from './bond-combos.mjs';
import {bondFinisherCritical,bondDefenseIgnore,bondOperational,adjacentBondAlly,bondSwiftEffect,validSwiftStatus} from './bonds.mjs';
import {bondHitEffect,bondBlocksEffect,bondDamageImmunity,bondValorDamage,bondSource,bondHitIntentDenialChance} from './bonds.mjs';
import {bondCommandMultiplier,bondDamage,grantBondEntries,bondStratagemStrength,validBondEntry,validBondStrength} from './bonds.mjs';
import {validBondGrowth} from './bonds.mjs';
import {frontlineCapacity,validFrontline,armyFrontlineCapacity} from './army-trait-rules.mjs';
import {tickStratagemZones} from './stratagem-zones.mjs';
import {arrivedReserves,refreshCandidates,needsCommandRefresh,commandRefresh,validStratagemEvents} from './stratagem-events.mjs';
import {commandProtectionDuration,commandBlocksDamage} from './command-protection.mjs';
import {isAreaStratagem,validStratagemPoint,stratagemAreaTargets,stratagemHasEffect,chooseStratagemPoint,stratagemAreaContains} from './stratagem-area.mjs';
import {resolveTraitEvent} from './trait-effects.mjs';
import {traitImmune,validTraitState,mechanicEntries,traitEligible} from './trait-mechanics.mjs';
import {appendBattleLog,BATTLE_LOG_LIMIT,BATTLE_LOG_KINDS} from './battle-log.mjs';
import {recordBattleEffects} from './battle-journal.mjs';
import {mapNode,mapNodes} from './road-network.mjs';
import {beginUnitRetreat,validRetreatAt} from './battle-retreat.mjs';
import {defenseLine} from './defense-line.mjs';
import {STATUS_DEFINITIONS,CONTROL_STATUSES,statusValue,hidden,detected,breakStealth,remedy,needsRemedy,createDecoy,decoyTargets,hitDecoy,armEntryStatuses,contactIntentFactor,statusNotice} from './battle-status-rules.mjs';
import {shieldLayers} from './tactics.mjs';
import {DEMO_ROAD_DESIGNS} from './data/design/roads.mjs';
import {assertDesignTables} from './design-catalog.mjs';
import {DEMO_CITY_DESIGNS} from './data/design/cities.mjs';
import {playerFaction} from './player-faction.mjs';
import {NATIONAL_FACTIONS,nationalWorld} from './national-scenarios.mjs';
import {battleBuildings,pulseBattleBuildings,validBuildingCombatState,combatBuildingRule,buildingTargetValue} from './building-rules.mjs';
import {ATTACK_ORBS} from './attack-orbs.mjs';
import {OFFICER_BY_ID,officerProfile,PROFILE_FIELDS,RELATION_LIST_FIELDS} from './officer-catalog.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {validateCustomBattle} from './custom-battle.mjs';
import {arrivalConditionMet,sameArrivalCondition} from './reinforcement-arrival.mjs';
import {applyBattleEvents,validBattleEventStatus} from './battle-events.mjs';
import {relationshipInfo,validRelationshipScores,validRelationshipTypes} from './relationships.mjs';
import {hexDistance, hexNeighbors, hexBeyond} from './hex-grid.mjs';
import { TROOPS, unitAttributes, disciplineDuration, isRear } from './unit-stats.mjs';
import {BATTLE_MAPS} from './data/design/battle-maps.mjs';
import {intentIncome, hasPassive, initialPassiveState, moved as recordMovement, recordBasicAttack, passiveDamageMultiplier, passiveDamageTaken, supportMultiplier, SKILL_ROUTES, commonRouteName} from './passives.mjs';
import {TACTIC_RECOVERY_STEPS,tacticUsesLeft,tacticSlotTotal,tacticUseLimit,canRestoreTactic,useRecoveryTargets,recoverTacticUses} from './tactic-tempo.mjs';
import {changeMerit, meritNeeded, emptyContribution, recordContribution, battleMerit, battleMeritResult, meritChangeText, validMeritGrowth} from './progression.mjs';
import {learnedTacticIds,allLearnedTacticIds,initializeTacticLearning,validTacticLearning} from './tactic-learning.mjs';
import { terrainAt, blockedTerrain, gateTarget, canOccupy, canTraverseTerrain, BATTLE_TERRAINS } from './battlefield.mjs';
import {tacticTerrainEffect,fireTerrainFactor} from './terrain-rules.mjs';
import {planEnemyArmy,chooseEnemyCommand,rankEnemyReserves} from './battle-ai.mjs';
import {isTargetable,meleeTargetPool,interceptorsAt,canStrikeFrom,holdsLine} from './engagement.mjs';
import { SCENARIOS } from './scenario-catalog.mjs';
import { COMBAT, RULES_VERSION, CAMPAIGN_TIME, INTENT_STATE, TARGETING } from './combat-rules.mjs';
import {snapshotTactic,tacticOutcome} from './tactic-outcomes.mjs';
import {powerFactor,powerDuration,effectChance,criticalChance,statusFraction,DURATION_POWER_STATUSES,CHANCE_EFFECT_NAMES,POWER_RULES} from './tactic-power.mjs';
import {FAMOUS_OFFICERS} from './famous-officers.mjs';
import {famousTargets, tacticOpening, undermineTargets, expandedSupportTargets, basicSupportTargets, areaTacticTargets, exposedTarget, tauntTarget, pursuitTarget, flankingTarget, supportApproach, repairTarget} from './tactics.mjs';
export { TROOPS, unitAttributes, disciplineDuration, isRear } from './unit-stats.mjs';
// The simulation has no DOM, network, clock, or storage dependencies.
import { TACTICS_BOOK, unitTactics, readyTactic, hasStatus, setStatus, routeTo, retreatCell, openCell, configureTactics, validLoadout, defaultTacticIds, recommendedTacticIds, NEGATIVE_STATUSES, statusPower, lureCell, absorbShield, refreshShield, shieldAmount } from './tactics.mjs';
export { TACTICS_BOOK, unitTactics, hasStatus } from './tactics.mjs';
assertDesignTables();
export const VERSION = 2;
import {settleArmyAppointments,validArmyAppointmentChanges} from './army-appointments.mjs';
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
export const battleCommanders = (b,side=0) => availableBattleCommanders(b.sides[side],b.tick);
export const battleStratagemSource = (b,key,side=0) => selectStratagemSource(battleCommanders(b,side),key,bondStratagemStrength(b,side));
export const battleStratagems = (b,side=0) => [...new Set(battleCommanders(b,side).flatMap(commanderStratagems))];
export const commandIntellect = (b,side=0) => b.sides[side].retreat ? 0 : Math.round(activeUnits(b,side).filter(u=>!u.withdrawing).reduce((n,u)=>n+u.intellect*bondCommandMultiplier(b,u),0));
export function attackRange(b,u) {return unitAttributes(u,b).range;}
export function battleWounded(u) {return Math.max(0,Math.floor(((u.battleDamage??u.initial-u.hp)-(u.battleDeserted||0))*.35)-(u.healed||0));}
function takeCasualties(b,u,damage,source=null) {
  u.battleDamage ??= u.initial-u.hp;u.healed ??=0;
  damage=Math.min(u.hp,damage);u.hp-=damage;u.battleDamage+=damage;recordTreasureDamage(b,source,u,damage);beginUnitRetreat(b,u);if(damage>0&&u.hp<=0){
    if(!u.isDecoy&&!u.intentRoutApplied){if(!pendingIntentRouts.has(b))pendingIntentRouts.set(b,new Set());pendingIntentRouts.get(b).add(u);}
    const rallySource=recordBondDefeat(b,u,source);if(rallySource)combatEffect(b,rallySource,rallySource,false,0,'impact',{name:'破军乘胜',visual:'banner'},{ongoing:true,text:'破军 · 乘胜'});
  }return damage;
}
function healWounded(b,u,fraction,ongoing=false,source=u,label='救治伤兵') {
  if(u.status!=='active'||u.hp<=0)return 0;
  const amount=Math.min(battleWounded(u),Math.floor(u.maxHp*fraction*(hasStatus(b,u,'plague')?1-statusFraction(u,'plague',.5):1)),u.maxHp-u.hp);
  if(amount<=0)return 0;
  u.healed=(u.healed||0)+amount;u.hp+=amount;
  combatEffect(b,source,u,true,0,'impact',{name:label,visual:'banner'},{text:'救治 +'+amount,healing:amount,ongoing,...(source.status!=='active'&&source.type!=='building'?{fromX:u.x,fromY:u.y}:{})});return amount;
}
export const isDeploying = b => !!b && !b.deploymentLocked && b.tick === 0 && !b.result;
export const isReinforcementCouncil = b => !!b && b.reinforcementCouncil === 'open' && !b.result;
export const isBattleCouncil = b => isDeploying(b) || isReinforcementCouncil(b);
export function openReinforcementCouncil(b){
  if(!b||b.reinforcementCouncil!=='pending'||b.result)return '当前没有援军军议';
  b.reinforcementCouncil='open';return null;
}
export function confirmReinforcementCouncil(b){
  if(!b || !['pending','open'].includes(b.reinforcementCouncil) || b.result)return '当前没有援军军议';
  b.reinforcementCouncil=null;return null;
}
function gainIntent(unit, amount,source=null) { const before=unit.intent||0;unit.intent = Math.min(COMBAT.intentCap,before+Math.round(amount));if(source&&source!==unit&&unit.intent>before)recordContribution(source,'support',1); }
export function lowerIntent(unit, amount, source=null,b=null) {
  if(bondBlocksEffect(b,unit,source))return 0;
  const before=unit.intent||0;
  const adjusted=Math.round(Math.max(0,amount)*(source&&hasPassive(source,'suppress')?1.2:1)*(hasPassive(unit,'calm')?.8:1));
  unit.intent=Math.max(0,before-adjusted);return before-unit.intent;
}
export function skillVisual(unit) {
  if (['jia', 'yu', 'tian'].includes(unit.id)) return 'fire';
  if (['cao', 'shao', 'jin', 'ju'].includes(unit.id)) return 'banner';
  if (['chu', 'dun'].includes(unit.id)) return 'shockwave';
  return combatFamily(unit) === 'cavalry' ? 'charge' : ['archer','ship','siege'].includes(combatFamily(unit)) ? 'volley' : 'slash';
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
    skill:source.skill,type:source.type,equipment:structuredClone(source.equipment||emptyEquipment()),formation:source.formation,trait:source.trait,
    troops,wounded:0,first:index<6,loyalty:100,level,merit:0};
  if(!Number.isInteger(level)||level<1||level>10)throw new Error('武将等级须为 1～10');
  if(!Number.isSafeInteger(troops)||troops<0||troops>troopCapacity(unit))throw new Error(`${unit.name}带兵须为 0～${troopCapacity(unit)} 人`);
  initializeTacticLearning(unit,learningSeed);
  return unit;
}
export function newGame(seed = 521200) {
  const cities=structuredClone(DEMO_CITY_DESIGNS);
  const state = {
    pendingAppointments:[], version: VERSION, rulesVersion:RULES_VERSION, officerDataVersion:4, relationshipScores:{}, relationshipTypes:{}, seed, turn: 1, gold: 3200, grain: 12800, fame: 120,
    cities, roads:structuredClone(DEMO_ROAD_DESIGNS),
    armies: [
      { id: 'a1', name: '虎贲军', faction: 'cao', location: 'xuchang', route: [], target: null, supply: 900, morale: 80, tactic: 'balanced', leader: 'cao', advisor: 'jia',  units: STARTER_OFFICER_IDS.slice(0, 8).map((id, i) => makeOfficer(id, 3000, i)), task: '驻守' },
      { id: 'a2', name: '河北军', faction: 'yuan', location: 'guandu', route: [], target: null, supply: 900, morale: 75, tactic: 'aggressive', leader: 'shao', advisor: 'ju',  units: STARTER_OFFICER_IDS.slice(8).map((id, i) => makeOfficer(id, 2500, i)), task: '驻守' },
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
  const created = { ...army, id, name: `${chosen[0].name}军`, units: chosen, route: [], target: null, leader: chosen[0].id, advisor: chosen.at(-1).id,  supply };
  normalizeRoles(army); normalizeRoles(created);
  state.armies.push(created); log(state, `分兵立营，${created.name}于${cityById(state, army.location).name}组建。`, 'order');
  return null;
}
function normalizeRoles(army) {
  if (!army.units.some(u => u.id === army.leader)) army.leader = army.units[0]?.id;
  if (!army.units.some(u => u.id === army.advisor)) army.advisor = [...army.units].sort((a, b) => b.intellect - a.intellect)[0]?.id;
  if (!army.units.some(u => u.first)) army.units.slice(0, armyFrontlineCapacity(army)).forEach(u => { u.first = true; });
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
  return Array.from({ length: count }, (_, i) => ({ id: `g-${city.id}-${i}`, name: `${city.name}${['守将', '校尉', '都尉', '偏将', '参军', '牙将'][i]}`, courtesy: '守军', leadership: 72, force: 70, intellect: 65, politics:65, skill: '据险固守', trait: '守土有责', equipment:emptyEquipment(),type: types[i], formation: types[i] === 'archer' ? 'back' : 'front', troops: Math.floor(city.garrison / count) + (i === 0 ? city.garrison % count : 0), wounded: 0, first: true }));
}
export function combatUnit(u, armyId, side, morale) {
  return { ...structuredClone(u), ...officerProfile(u.id), level:u.level??1,merit:u.merit??0,skillRouteType:u.skillRouteType||u.type,formType:null,formReadyTick:0,passiveState:initialPassiveState(),traitState:{},bondState:{},participated:false,contribution:emptyContribution(),attackCarry:0,armyId, side, retreatAt:u.retreatAt??null,withdrawing:false,disengage:null,hp: u.troops, maxHp: u.troops, initial: u.troops, battleDamage:0, healed:0, moveProgress:0, status: 'reserve', x: -1, y: -1, morale, cooldown: 0, intent:0, intentRoutApplied:false, tacticRecoveryUntil:0, cast: null, skillReady:{}, tacticCasts:{}, tacticRestored:{}, tacticCommandRestored:{}, tacticUseBonus:{}, statuses:{}, skillCasts: 0, action: '候命', effect: null };
}
export function configureUnitTactics(state,unitId,ids) {
  if(state.battle&&!isDeploying(state.battle))return '开战后战法锁定，暂停也不能更换';
  const source=state.armies.filter(a=>a.faction===playerFaction(state)).flatMap(a=>a.units).find(u=>u.id===unitId);
  const live=state.battle?.sides[0].units.find(u=>u.id===unitId);
  if(!source&&!live)return '找不到己方部队';
  if(!validLoadout(live||source,ids))return '自动携带当前兵种全部已学战法与已学专属，只能调整顺序';
  if(source)configureTactics(source,ids);
  if(live) {configureTactics(live,ids);live.skillReady={};live.tacticCasts={};live.tacticRestored={};live.tacticCommandRestored={};live.tacticUseBonus={};live.cast=null;}
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
  const makeSide = (armies, index, faction) => ({ faction, commanders:armies.flatMap(armyCommanders),organizationCommanders:armies.flatMap(armyCommanders),appointmentEvents:[],stratagemEffects:{},stratagemUses:{},stratagemEvents:[], tactic: armies[0]?.tactic || 'defensive', retreat: false, focus: null, focusUntil: 0, inspireUntil: 0, blockadeUntil:0, units: armies.flatMap(a => {
    const leader = a.units.find(u => u.id === a.leader && u.troops > 0), advisor = a.units.find(u => u.id === a.advisor && u.troops > 0);
    return [...a.units].sort((a, b) => Number(b.first) - Number(a.first)).filter(u => u.troops > 0).map(u => ({ ...combatUnit(u, a.id, index, a.morale), commandBonus: (leader?.leadership || 0) / 1000,  advisorBonus: (advisor?.intellect || 0) / 1000 }));
  }) });
  const sides = [makeSide(own, 0, playerFaction(state)), makeSide(enemy, 1, friendlyAttack ? p.defenderFaction : attacker.faction)];
  if (city.garrison > 0 && city.owner !== attacker.faction) {
    const index = city.owner === playerFaction(state) ? 0 : 1;
    sides[index].units.push(...garrisonUnits(city).map(u => combatUnit(initializeTacticLearning({...u,level:1,merit:0},state.seed), `city:${city.id}`, index, 70)));
  }
  state.battle = { id: `battle-${state.turn}-${state.nextId++}`, cityId: city.id, context: { ...p, attackingIds: attacking.map(a => a.id) }, tick: 0, seed: state.seed + state.turn, sides, stratagemZones:[], gridType:'hex', terrain:sides.some(s=>s.units.some(u=>combatFamily(u)==='ship'))?'river':'land', relationshipScores:structuredClone(state.relationshipScores||{}), relationshipTypes:structuredClone(state.relationshipTypes||{}), comboWindows:[], comboCounts:[0,0], commandProgress:0, commandCooldown: 0, commandReady:{}, commandSerial:0, lastCommand:null, enemyCommand:{commandProgress:0,commandReady:{},commandSerial:0,lastCommand:null}, deploymentLocked:false, logs: [], effects: [], buildings: [], result: null, settled: false };
  fillSlots(state.battle, 0);
  if(!deferEnemyDeployment){fillSlots(state.battle, 1);planEnemyArmy(state.battle);}
  battleLog(state.battle,'敌军携带已学战法，依据兵力、分工和战况择序出阵并布阵；开战后独立积累军略。');
  battleLog(state.battle, `${city.name}之战，诸军待命。请先布置首发部队位置。`);
  state.pending = null; return null;
}
export const activeUnits = (b, side) => b.sides[side].units.filter(u => u.status === 'active' && u.hp > 0);
export {deployBattleUnit as deployUnit} from './battle-deployment.mjs';
export function reserveDeploymentUnit(b,id,toId=null) {
  if(!isBattleCouncil(b))return '只能在开战前调整或援军军议中调整后备';
  const units=b.sides[0].units,u=units.find(u=>u.id===id&&u.hp>0&&['active','reserve'].includes(u.status));
  if(!u)return '请选择我军部队';
  if(isReinforcementCouncil(b)&&u.status!=='reserve')return '在场部队不能重新布置';
  if(toId===id)return null;
  if(toId&&!units.some(v=>v.id===toId&&v.status==='reserve'&&v.hp>0))return '后备位置无效';
  if(isReinforcementCouncil(b)){
    // Keep active units in their existing action-array slots during combat.
    const indexes=units.flatMap((v,i)=>v.status==='reserve'&&v.hp>0?[i]:[]),queue=indexes.map(i=>units[i]);
    queue.splice(queue.indexOf(u),1);queue.splice(toId?queue.findIndex(v=>v.id===toId):queue.length,0,u);
    indexes.forEach((index,i)=>units[index]=queue[i]);return null;
  }
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

  if(b.terrain===terrain)return null;
  b.terrain=terrain;
  if(b.mapId&&BATTLE_MAPS[b.mapId]?.terrain!==terrain)delete b.mapId;
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
  return b.sides[side].battleIntent || (b.siege ? (b.siege.attackerSide===side?'siege':'hold') : 'annihilate');
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
  if(!validFrontline(b,0)||(validateCount&&count<1))return `当前上阵 ${count} 队，需安排 1～${frontlineCapacity(b,0)} 队后才能开战；额外名额限奸雄所属军团`;
  for(const side of [0,1])b.sides[side].battleIntent=battleIntent(b,side);
  for(const side of b.sides){const source=side.units.find(u=>shieldLayers(b,u).some(l=>l.source==='siege:opening'));if(source){const layer=shieldLayers(b,source).find(l=>l.source==='siege:opening'),ratio=layer.amount/source.initial;for(const u of side.units){refreshShield(b,u,shieldLayers(b,u).filter(l=>l.source!=='siege:opening'));if(u.status==='active')setStatus(b,u,'shield',layer.until-b.tick,{amount:Math.round(u.initial*ratio),source:'siege:opening',label:'守城首发护盾'});}}}
  b.deploymentLocked = true;
  grantBondEntries(b);
  for(const [side,army] of b.sides.entries())for(const c of army.commanders||[])if(mechanicEntries(c,'passive').some(({rule})=>rule.effect==='frontline'&&rule.roles.includes(c.role)))appendBattleLog(b,c.name+'「奸雄」：所属军团上场上限7队，额外名额仅限本军团。','trait',side);
  for(const u of b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'))armEntryStatuses(b,u,unitTactics(u));
  if(b.domesticOpening&&!b.domesticOpening.applied){const p=b.domesticOpening;for(const u of activeUnits(b,p.side)){u.intent=Math.min(COMBAT.intentCap,u.intent+Math.floor(p.intent));setStatus(b,u,'shield',b.maxTicks+1,{amount:Math.round(u.initial*p.shield),source:'siege:opening',label:'守城首发护盾'});}p.applied=true;}
  battleLog(b,'军阵已定，两军交锋。攻击与受击积累战意，友军溃败动摇军心。'); return null;
}
const remainingUnits = (b, side) => b.sides[side].units.filter(u => ['active', 'reserve'].includes(u.status) && u.hp > 0 && !(u.arrivalCondition&&u.arrivalConfirmed===false));
const distance = hexDistance;
function battleLog(b, text) { appendBattleLog(b,text); }
function random(b) { b.seed = (Math.imul(b.seed, 1664525) + 1013904223) >>> 0; return b.seed / 4294967296; }
function spawn(b, unit) {
  const x = unit.side === 0 ? ({ front: 3, middle: 2, back: 1, left: 3, right: 3 }[unit.formation]) : ({ front: 10, middle: 11, back: 12, left: 10, right: 10 }[unit.formation]);
  const preferredY = unit.formation === 'left' ? 0 : unit.formation === 'right' ? 7 : 3.5;
  const cells = [];
  for (let y = 0; y < GRID.rows; y++) for (let col = 0; col < GRID.cols; col++) cells.push({ x: col, y });
  const occupied = b.sides.flatMap(s => s.units).filter(u => u.status === 'active');
  const open = cells.filter(c => canOccupy(b,unit,c.x,c.y) && !occupied.some(u => u.x === c.x && u.y === c.y)).sort((a, c) => Math.abs(a.x - x) * 5 + Math.abs(a.y - preferredY) - Math.abs(c.x - x) * 5 - Math.abs(c.y - preferredY));
  if (!open.length) return false;
  unit.x = open[0].x; unit.y = open[0].y; unit.status = 'active'; unit.action = '列阵';syncCombatForm(b,unit);
  if(b.deploymentLocked)armEntryStatuses(b,unit,unitTactics(unit));
  unit.passiveState ||= initialPassiveState(b.tick);unit.passiveState.lastMoveTick=b.tick;
  if(b.tick>0&&!unit.passiveState.reserveEntered){
    unit.passiveState.reserveEntered=true;
    if(hasPassive(unit,'prepared')){gainIntent(unit,25);battleLog(b,`${unit.name}「备战」：入场战意 +25。`);}
    if(hasPassive(unit,'adapt')){unit.passiveState.entryUntil=b.tick+15;battleLog(b,`${unit.name}「巧变」：接战增益持续 15 日。`);}
  }
  return true;
}
export function fillSlots(b, side, {ai=side===1}={}) {
  if (b.sides[side].retreat) return;
  if((b.sides[side].blockadeUntil||0)>b.tick)return;
  if(activeUnits(b,side).length>=frontlineCapacity(b,side))return;
  const entered=[];
  const waiting=b.sides[side].units.filter(u=>u.status==='reserve'&&u.hp>0&&(u.arrivalTick||0)<=b.tick&&u.arrivalConfirmed!==false);
  while(waiting.length&&activeUnits(b,side).length<frontlineCapacity(b,side)){
    const unit=ai?rankEnemyReserves(b,waiting,side)[0]:waiting[0];
    waiting.splice(waiting.indexOf(unit),1);
    if(!validFrontline(b,side,[...activeUnits(b,side),unit])||!spawn(b, unit))continue;
    entered.push(unit.id);
    if (b.tick) battleLog(b, `${unit.name}率${TROOPS[unit.type].name}补入战线。`);
  }
  if(b.deploymentLocked)grantBondEntries(b,side,entered);
}
export function planBattleCouncilAI(b,side=1){
 if(!b||b.result||![0,1].includes(side)||b.sides[side].retreat)return;
 if(isDeploying(b)||isReinforcementCouncil(b))planBattleAppointmentsAI(b,side);
 if(isDeploying(b)){
  for(const u of b.sides[side].units)if(u.status==='active'){u.status='reserve';u.x=-1;u.y=-1;}
  configureBattleIntent(b,b.siege?(b.siege.attackerSide===side?'siege':'hold'):'annihilate',side);
  fillSlots(b,side,{ai:true});planEnemyArmy(b,side);
 }else fillSlots(b,side,{ai:true});
 // Existing retreat thresholds are retained. Reinforcement councils never
 // move active troops, rewrite intentions, change loadouts or reset resources.
}
function fillControllerSlots(b,aiSides){
 for(const side of [0,1])if(aiSides.includes(side))planBattleCouncilAI(b,side);else fillSlots(b,side,{ai:false});
}
export function issueCommand(b, command, targetId = null, side = 0, {ai=side===1}={}) {
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
  const commandDesign=STRATAGEMS[command];
  const area=isAreaStratagem(commandDesign);
  if(area&&!validStratagemPoint(targetId))return '请选择战场内的军略落点';
  const targets=(area?stratagemAreaTargets(b,commandDesign,targetId,side):commandDesign?activeUnits(b,commandDesign.side===1?other:side).filter(u=>!hasStatus(b,u,'stasis')&&(commandDesign.side!==1||isTargetable(b,u))):[]).filter(u=>stratagemHasEffect(b,commandDesign,u)&&!(commandDesign.side===1&&bondBlocksEffect(b,u,profile)));
  if(effect==='magicImmunity'&&!targets.length)return '在场部队均已受到魔免保护';
  if(area&&!commandDesign.zone&&!targets.length)return '范围内没有合法目标';
  if(area&&effect==='heal'&&!targets.some(u=>battleWounded(u)>0&&u.hp<u.maxHp))return '范围内暂无可救治的本场伤兵';
  if(commandDesign?.maxUses&&(b.sides[side].stratagemUses[command]||0)>=commandDesign.maxUses)return '本场军略次数已用尽';
  if(effect==='forceReserve'&&!arrivedReserves(b,side).length)return '没有已经抵达的可用后备部队';
  if(effect==='tacticRefresh'&&!refreshCandidates(b,side).some(needsCommandRefresh))return '己方战法次数尚未消耗';
  if(effect==='blockade'&&!b.sides[other].units.some(u=>u.status==='reserve'&&u.hp>0))return '敌军没有待命预备队';
  if(effect==='heal'&&!activeUnits(b,side).some(u=>battleWounded(u)>0))return '在场部队暂无可救治的本场伤兵';
  if(effect==='firestorm'&&(!activeUnits(b,side).length||!activeUnits(b,other).length))return '当前没有合法的火攻目标';
  if (STRATAGEMS[command]) {
    const strategy = STRATAGEMS[command],provider=b.sides[side].units.find(u=>u.id===profile.id);
    if(strategy.zone){b.stratagemZones.push({key:command,side,point:{x:targetId.x,y:targetId.y,rotation:targetId.rotation||0},source:{...profile},castTick:b.tick,until:b.tick+profile.duration+1});}
    else if(['magicImmunity','rapidAdvance','invincible','ambush','shield','cleanse','stun'].includes(effect)){
      for(const u of targets){
        const protectionDiscipline=strategy.disciplineDuration?unitAttributes(u,b).discipline:null;
        const steps=protectionDiscipline!==null?commandProtectionDuration(protectionDiscipline,profile.power):effect==='cleanse'?profile.resolve:profile.duration;
        let removed=0;
        if(effect==='magicImmunity'||effect==='cleanse')for(const key of NEGATIVE_STATUSES)if(key!=='hunger'){if(hasStatus(b,u,key))removed++;delete u.statuses[key];}
        const key={magicImmunity:'magicImmune',rapidAdvance:'rapidAdvance',invincible:'commandInvincible',ambush:'stealth',shield:'shield',cleanse:'resolve',stun:'stun'}[effect];
        const wasActive=hasStatus(b,u,key),shieldBefore=effect==='shield'?shieldAmount(b,u):0;
        const source={sourceId:profile.id,sourceName:profile.name,sourceSkillName:strategy.name,sourceCommand:command,castTick:b.tick,duration:steps,...(protectionDiscipline!==null?{protectionDiscipline}:{})};
        if(effect==='stun'){applyControl(b,u,steps,key,source);if(hasStatus(b,u,key))u.cast=null;}
        else if(!(effect==='cleanse'&&hasStatus(b,u,'resolve')&&u.statuses.resolve.until>=b.tick+steps+1))setStatus(b,u,key,steps,{...source,...(effect==='shield'?{amount:Math.round(u.maxHp*profile.strength),source:'command:'+command,label:strategy.name}:{})});
        if(provider&&provider!==u&&(removed>0||hasStatus(b,u,key)&&(!wasActive||effect==='shield'&&shieldAmount(b,u)>shieldBefore)))recordContribution(provider,strategy.side===1?'control':'support',1);
        if(provider)combatEffect(b,provider,u,true,0,'impact',{name:strategy.name,visual:'banner'},{text:strategy.name+' · '+steps+'回合',ongoing:true,...(provider.status!=='active'?{fromX:u.x,fromY:u.y}:{})});
      }
    }
    else if(effect==='forceReserve') {
      const waiting=arrivedReserves(b,side),entered=[];
      while(waiting.length&&entered.length<profile.count){
        const u=ai?rankEnemyReserves(b,waiting,side)[0]:waiting[0];waiting.splice(waiting.indexOf(u),1);
        if(!spawn(b,u))continue;entered.push(u.id);battleLog(b,`${strategy.name}：${u.name}额外投入战线。`);
      }
      if(!entered.length)return '战场没有可供后备部队出场的合法空位';
      b.sides[side].stratagemEvents.push({key:command,source:{...profile},castTick:b.tick,units:entered});
      grantBondEntries(b,side,entered);recordContribution(provider,'support',entered.length);
    }
    else if(effect==='tacticRefresh') {
      const units=refreshCandidates(b,side).map(u=>commandRefresh(u,profile,b.tick));
      b.sides[side].stratagemEvents.push({key:command,source:{...profile},castTick:b.tick,units});
      recordContribution(provider,'support',units.filter(r=>Object.keys(r.restored).length).length);
    }
    else if(effect==='catastrophe') {
      // Draw the complete weather pattern first. Protection RNG and deaths cannot
      // alter later strike locations or damage rolls within this cast.
      const event={key:command,source:{...profile},castTick:b.tick,seedBefore:b.seed,seedAfter:0,strikes:[]};
      const victims=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'&&u.hp>0&&!hasStatus(b,u,'stasis'));
      const shape={scope:{shape:'circle',radius:strategy.strikeRadius}};
      for(let n=0;n<strategy.strikes;n++){
        const point={x:Math.floor(random(b)*GRID.cols),y:Math.floor(random(b)*GRID.rows)},hits=[];
        for(const u of victims)if(stratagemAreaContains(shape,point,u)){
          const roll=strategy.randomDamage.min+random(b)*(strategy.randomDamage.max-strategy.randomDamage.min);
          hits.push({id:u.id,x:u.x,y:u.y,roll,raw:Math.round(u.initial*profile.strength*roll),damage:0,absorbed:0});
        }
        event.strikes.push({point,hits});
      }
      event.seedAfter=b.seed;
      peachBatch(b,()=>{for(const strike of event.strikes)for(const hit of strike.hits){
        const u=b.sides.flatMap(s=>s.units).find(u=>u.id===hit.id);
        if(u.hp<=0||battleInvincible(b,u)||hasStatus(b,u,'stasis')||commandBlocksDamage(b,u,{secondary:true}))continue;
        const result=applyPeachDamage(b,provider,u,hit.raw);hit.damage=result.damage;hit.absorbed=result.absorbed;
        if(result.damage>0){u.participated=true;breakStealth(b,u,strategy.name);triggerPreparedDecoy(b,u);combatEffect(b,provider,u,true,result.damage,'impact',{name:strategy.name,visual:'fire'},{ongoing:true,text:strategy.name,shieldAbsorbed:result.absorbed,...(provider.status!=='active'?{fromX:strike.point.x,fromY:strike.point.y}:{})});}
        if(u.hp<=0){u.status='defeated';u.cast=null;u.action='溃败';}
      }});
      b.sides[side].stratagemEvents.push(event);
    }
    else if(effect==='heal') {for(const u of targets)healWounded(b,u,profile.strength,false,provider||u);}
    else if(effect==='firestorm') {
      const allies=activeUnits(b,side),allTargets=activeUnits(b,other).filter(u=>isTargetable(b,u));
      const totalPower=allies.reduce((sum,u)=>sum+unitAttributes(u,b).strategyPower,0);
      const amount=Math.max(0,Math.floor(totalPower*(18/280)*profile.strength/Math.max(1,allTargets.length)));
      for(const u of targets)setStatus(b,u,'burn',profile.duration,{sourceId:profile.id,sourceName:profile.name,sourceSkillName:strategy.name,amount:Math.floor(amount*(1+(combatFamily(u)==='ship'?(strategy.shipFireBonus||0):0)))});
    }
    else if (strategy.field) {
      const target=b.sides[strategy.side===0?side:other],until=b.tick+profile.duration+1;
      target[strategy.field]=until;target.stratagemEffects[strategy.field]={...profile,sourceSide:side,castTick:b.tick,until};
    }
    if(strategy.maxUses)b.sides[side].stratagemUses[command]=(b.sides[side].stratagemUses[command]||0)+1;
    const description=stratagemEffectText(profile);
    appendBattleLog(b,`${side?'敌军':'我军'}军略 · ${strategy.name}：${description}${effect==='heal'?'（仅在场部队）':''}。`,'command',side);
  }
  if (command === 'retreat') {
    b.sides[side].retreat = true;
    b.sides[side].units.forEach(u => { u.cast = null;u.disengage=null; });
    b.sides[side].units.filter(u => u.status === 'reserve').forEach(u => { u.status = 'withdrawn'; });
    appendBattleLog(b, (side?'敌军':'我军')+'军令 · 全军撤退：各部向己方边缘撤离，撤离途中仍会受到攻击。','command',side);
  }
  if(command!=='retreat')resource.commandProgress=0; resource.commandCooldown = 0; resource.commandReady[command] = b.tick + (STRATAGEMS[command]?.cooldown ?? 3);
  resource.commandSerial = (resource.commandSerial || 0) + 1;
  resource.lastCommand = { key:command, tick:b.tick, serial:resource.commandSerial,...(area?{target:{x:targetId.x,y:targetId.y,rotation:targetId.rotation||0}}:{}),...(profile?{source:profile}:{}) };
  if(STRATAGEMS[command])for(const u of b.sides.flatMap(s=>s.units))traitEvent(b,u,u.side===side?'ownCommand':'enemyCommand',{command});
  recordBattleEffects(b);
  return null;
}
function facilityTargetValue(b,a){
 return buildingTargetValue(b,a,{visible:u=>isTargetable(b,u),stasis:u=>hasStatus(b,u,'stasis'),wounded:battleWounded,healFactor:u=>hasStatus(b,u,'plague')?1-statusFraction(u,'plague',.5):1});
}
function pickTarget(b, unit, inRangeOnly = false, reachableOnly = false) {
  const side = b.sides[unit.side];
  const stats=unitAttributes(unit,b),inReach=t=>distance(unit,t)<=stats.range&&distance(unit,t)>=stats.minRange&&canStrikeFrom(b,unit,t);
  const routes=new Map(),pathTo=t=>{if(!routes.has(t.id))routes.set(t.id,findMoveRoute(b,unit,t));return routes.get(t.id);};
  const values=new Map(),buildingValue=t=>{if(!values.has(t.id))values.set(t.id,facilityTargetValue(b,t));return values.get(t.id);};
  const structureBattle=(b.buildings||[]).some(a=>a.side!==unit.side&&a.hp>0);
  const structures=(b.buildings||[]).filter(a=>a.side!==unit.side&&a.hp>0);
  // Inactive works are physical obstacles, never primary combat targets.
  // This filter precedes focus, stealth, pursuit and score comparisons.
  const enemies=[...activeUnits(b,1-unit.side),...decoyTargets(b,1-unit.side),...structures.filter(a=>buildingValue(a)>0),gateTarget(b,unit)].filter(Boolean)
    .filter(target=>isTargetable(b,target)).filter(target=>!reachableOnly||(stats.move>0||inReach(target))&&pathTo(target).route!==null);
  const forced=tauntTarget(b,unit,attackRange(b,unit));
  let ordered=!forced&&side.focusUntil>b.tick&&enemies.find(e=>e.id===side.focus);
  // A focus order cannot repeatedly pull melee out of contact toward a sealed rear line.
  if(ordered){
    // An adjacent target behind a live interceptor cannot initiate a needless
    // disengagement; the existing contact attack resolves the blocking troops.
    if(distance(unit,ordered)<=stats.range&&!canStrikeFrom(b,unit,ordered))ordered=null;
  }
  if(ordered){
    const guards=interceptorsAt(b,unit,unit,true);
    const afterDisengage=guards.length?{...unit,disengage:{targetId:ordered.id,guards:guards.map(e=>e.id),readyTick:b.tick+1}}:null;
    const reachable=inReach(ordered)||stats.move>0&&(pathTo(ordered).route!==null||afterDisengage&&findMoveRoute(b,afterDisengage,ordered).route!==null);
    if(reachable&&(!inRangeOnly||inReach(ordered)))return ordered;
    if(!reachable)ordered=null;
  }
  if(!forced&&!ordered&&bondSwiftEffect(b,unit)){
    const stats=unitAttributes(unit,b),inReach=t=>distance(unit,t)>=stats.minRange&&distance(unit,t)<=stats.range&&canStrikeFrom(b,unit,t);
    // Use the real route search: ZOC is ignored by the shared engagement rule,
    // while occupied cells, terrain and guard orders still constrain pursuit.
    const rear=enemies.filter(e=>!e.isDecoy&&isRear(e)&&(stats.move>0||inReach(e)))
      .map(target=>({target,route:findMoveRoute(b,unit,target).route})).filter(e=>e.route!==null)
      .sort((a,c)=>a.route.length-c.route.length||distance(unit,a.target)-distance(unit,c.target)||a.target.id.localeCompare(c.target.id))[0]?.target;
    if(rear)return inRangeOnly&&!inReach(rear)?null:rear;
  }
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
  const focused=!!ordered&&pool.some(e=>e.id===side.focus);
  const chaseTarget=!focused&&(pursuitTarget(b,unit,enemies)||flankingTarget(b,unit,enemies));
  const chase=chaseTarget&&(unitAttributes(unit,b).move>0||inReach(chaseTarget))?chaseTarget:null;
  const finishers=pool.filter(t=>inReach(t)&&distance(unit,t)<=2&&t.hp/t.maxHp<=.1&&(t.type!=='building'||buildingValue(t)>0));
  const ranged=pool.filter(t=>inReach(t)&&(isRear(t)||t.type==='building'&&buildingValue(t)>0));
  let candidates=(forced?[forced]:!focused&&finishers.length?finishers:!focused&&ranged.length?ranged:chase&&(!inRangeOnly||inReach(chase))?[chase]:pool).filter(t=>!inRangeOnly||inReach(t));
  if(structureBattle&&!forced){
    const militaryTarget=enemies.some(t=>(t.type!=='building'||buildingValue(t)>0)&&(stats.move>0||inReach(t))&&pathTo(t).route!==null);
    if(!militaryTarget&&stats.move>0){
      // Clearing a harmless facility is justified only by an actual route to a
      // military target. Relax only these enemy footprints for this diagnostic;
      // normal movement and attacks continue to use the physical collision map.
      const obstacles=structures.filter(a=>buildingValue(a)<=0),ignored=new Set(obstacles.map(a=>a.id));
      const blockers=enemies.map(target=>{
        const route=findMoveRoute(b,unit,target,false,null,ignored).route;
        const blocker=route?.map(p=>obstacles.find(a=>a.x===p.x&&a.y===p.y)).find(Boolean);
        return blocker?{target:blocker,length:route.length}:null;
      }).filter(e=>e&&(!inRangeOnly||inReach(e.target))&&pathTo(e.target).route!==null)
        .sort((a,c)=>a.length-c.length||distance(unit,a.target)-distance(unit,c.target)||a.target.id.localeCompare(c.target.id));
      if(blockers.length)return blockers[0].target;
    }
    // Compare actual routes whenever physical facilities can obstruct the field.
    // If no direct route exists, retain blockers/contact targets for the normal
    // movement fallback instead of inventing a path through occupied hexes.
    const reachable=candidates.filter(t=>(stats.move>0||inReach(t))&&pathTo(t).route!==null);
    if(reachable.length)candidates=reachable;
  }
  return candidates.sort((a, c) => {
    const score = target => {
      const d=distance(unit,target);
      let s = d * TARGETING.distance + target.hp / target.maxHp * TARGETING.health;
      if(structureBattle&&!inReach(target)){
        const route=pathTo(target).route;
        if(route)s+=Math.max(0,route.length-Math.max(0,d-stats.range))*TARGETING.distance;
      }
      if(target.type==='building'){
        const value=buildingValue(target);
        s+=TARGETING.civilianBuilding-value;
        if(value>0&&unit.equipment?.siege)s-=TARGETING.siegeEquipment;
      }
      if(structureBattle&&unit.passiveState?.targetId===target.id&&(target.type!=='building'||buildingValue(target)>0))s-=TARGETING.continuity;
      if(target.id==='siege-gate')s += battleIntent(b,unit.side)==='siege'?-24:24;
      if (counters(combatType(unit),combatType(target))) s -= 5;
      if (side.focus === target.id && side.focusUntil > b.tick) s -= 22;
      if (combatFamily(unit) === 'cavalry' && isRear(target)) s -= 5;
      if (battleIntent(b,unit.side) === 'hold') s += Math.abs(target.x - (unit.side === 0 ? 2 : 11)) * 2;
      if (b.siege?.gate.side === unit.side) s += distance(target,b.siege.gate)*4;
      return s;
    };
    return score(a) - score(c) || a.id.localeCompare(c.id);
  })[0];
}
function findMoveRoute(b, unit, target, retreat = false, supportRange = null, ignoredBuildings = null) {
  const occupied = b.sides.flatMap(s => s.units).filter(u => u.status === 'active' && u !== unit);
  // Breadth-first pathfinding handles blocked allies without passing through them.
  const inLine = retreat ? ()=>true : defenseLine(b,unit,target);
  const goal = retreat ? p => p.x === (unit.side === 0 ? 0 : 13) : p => inLine(p) && distance(p, target) <= (supportRange??attackRange(b,unit)) && (supportRange!==null||distance(p,target)>=(unitAttributes(unit,b).minRange||0)&&canStrikeFrom(b,unit,target,p));
  const queue = [{ x: unit.x, y: unit.y, path: [] }], visited = new Set([`${unit.x},${unit.y}`]);
  let route = null, contactRoute = null;
  while (queue.length) {
    const node = queue.shift();
    if (goal(node)) { route = node.path; break; }
    if(interceptorsAt(b,unit,node,retreat||!!unit.disengage).some(e=>!unit.disengage?.guards.includes(e.id))||node.path.length>0&&unit.disengage&&interceptorsAt(b,unit,node,retreat||!!unit.disengage).length){
      // An unreachable focus behind a complete line still advances to contact.
      contactRoute ??= node.path;
      continue;
    }
    const neighbors = hexNeighbors(node);
    neighbors.sort((a, c) => distance({x:a[0],y:a[1]},target) - distance({x:c[0],y:c[1]},target));
    for (const [x, y] of neighbors) {
      const key = `${x},${y}`;
      const cleared=ignoredBuildings&&canTraverseTerrain(b,unit,x,y)&&battleBuildings(b).some(a=>a.hp>0&&a.x===x&&a.y===y&&ignoredBuildings.has(a.id));
      if (x < 0 || y < 0 || x >= GRID.cols || y >= GRID.rows || (!retreat && !inLine({x,y})) || !canOccupy(b,unit,x,y)&&!cleared || visited.has(key) || occupied.some(u => u.x === x && u.y === y)) continue;
      if(!node.path.length&&unit.disengage){const guards=b.sides[1-unit.side].units.filter(e=>unit.disengage.guards.includes(e.id)&&holdsLine(b,e));if(guards.length&&guards.reduce((n,e)=>n+distance({x,y},e),0)<=guards.reduce((n,e)=>n+distance(unit,e),0))continue;}
      visited.add(key); queue.push({ x, y, path: [...node.path, { x, y }] });
    }
  }
  return {route,contactRoute};
}
export function syncCombatForm(b,u,target=null){
 const ground=terrainAt(b,u.x,u.y),gate=target?.type==='building'?target:b.siege?.gate;
 const form=desiredForm(b,u,ground,gate?hexDistance(u,gate):Infinity,gate);
 const desired=ground==='water'?form:(['gate','building'].includes(target?.type)||TROOPS[u.formType]?.equipmentSlot==='siege')?form:null;
 if(u.formType!==desired){
  u.formType=desired;u.cast=null;
  u.formReadyTick=desired&&TROOPS[desired].equipmentSlot==='siege'?b.tick+Math.ceil(TROOPS[u.type].interval):b.tick;
  u.tactics=learnedTacticIds(u);u.action=desired?'展开'+TROOPS[desired].name:'恢复'+TROOPS[u.type].name;
 }
 return u.formReadyTick>b.tick;
}
function moved(b,u,from,target=null){
 syncCombatForm(b,u,target);
 recordMovement(b,u,from);
}
function moveUnit(b, unit, target, retreat = false, supportRange = null) {
  const guards=interceptorsAt(b,unit,unit,true);
  if(guards.length&&!unit.disengage){unit.disengage={targetId:retreat?null:target.id,guards:guards.map(e=>e.id),readyTick:b.tick+1};unit.cast=null;unit.action='脱战准备';return true;}
  if(unit.disengage&&b.tick<unit.disengage.readyTick){unit.action='脱战准备';return true;}

  const speed=unitAttributes(unit,b).move;
  if(speed<=0){unit.moveProgress=0;unit.action='固守 / 迟滞';return true;}
  const paths=findMoveRoute(b,unit,target,retreat,supportRange),route=paths.route??paths.contactRoute;
  if (route?.length) {
    unit.moveProgress=(unit.moveProgress||0)+speed;const steps=Math.floor(unit.moveProgress);unit.moveProgress-=steps;
    if(!steps){unit.action='迟滞行军';return true;}
    // Stop at first contact, even if speed would otherwise skip this hex.
    const contact=route.findIndex(p=>interceptorsAt(b,unit,p,retreat||!!unit.disengage).length);
    const transition=route.findIndex(p=>(terrainAt(b,p.x,p.y)==='water')!==(terrainAt(b,unit.x,unit.y)==='water'));
    const next = route[Math.min(route.length, steps,transition<0?Infinity:transition+1,unit.disengage?1:Infinity,contact<0?Infinity:contact+1) - 1];
    const from={x:unit.x,y:unit.y};unit.x = next.x; unit.y = next.y;moved(b,unit,from,retreat?null:target);unit.disengage=null; unit.action = retreat ? '撤离' : `接近${target.name}`;
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
    if(['gate','building'].includes(target.type)){if(attacker.type!=='building')recordContribution(attacker,'siege',damage+(extra.repaired||0));}
    else if(attacker.side!==target.side&&damage>0){if(attacker.type!=='building')recordContribution(attacker,'damage',damage);recordContribution(target,'taken',damage);}
    if(attacker.type!=='building'){
      recordContribution(attacker,'healing',extra.healing||0);
      if(extra.resolution?.success&&!['seal','taunt'].includes(extra.resolution.effect))recordContribution(attacker,'control',1);
    }
  }
  b.effects.push({ from: attacker.id, to: target.id, damage, skill, phase, visual: definition?.visual || skillVisual(attacker), troop: combatType(attacker), side: attacker.side, name: attacker.name, label: definition?.name || attacker.skill, fromX: attacker.x, fromY: attacker.y, x: target.x, y: target.y, ...extra });
}
function counters(a,c) { return !!TROOPS[a]&&!!TROOPS[c]&&TROOPS[a].beats===TROOPS[c].family; }
function damageGate(b, attacker, scale=1, definition=null, target=null) {
  const gate = target||b.siege.gate, own = unitAttributes(attacker,b);
  const damage = Math.min(gate.hp,Math.max(1,Math.round((definition?own.martialPower+own.siege:own.siege)*scale*bondDamage(b,attacker,{...gate,type:'gate'},'force')*(definition?.critical?POWER_RULES.criticalMultiplier:1)*COMBAT.damageScale*(.9+random(b)*.2))));
  gate.hp -= damage;gate.lastDamagedTick=b.tick;
  attacker.participated = true;
  attacker.cooldown = own.attackInterval-(attacker.attackCarry||0); attacker.attackCarry = 0;
  if(!definition){recordBasicAttack(attacker,gate);gainIntent(attacker,intentIncome(attacker,b).attack*contactIntentFactor(b,attacker));}
  attacker.action = `攻击${gate.name} · ${damage}`;
  combatEffect(b,attacker,gate,!!definition,damage,'impact',definition,definition?.critChance?{critical:definition.critical,critChance:definition.critChance}:{});
  if (!gate.hp&&gate.type==='gate') {
    b.result = { winner:b.siege.attackerSide, reason:'城门失守' };
    battleLog(b,'城门耐久归零，守方败北。');
  }
}
function blockValorDamage(b,source,target){
  const chance=bondDamageImmunity(b,target,source);
  if(!chance||chance<1&&random(b)>=chance)return false;
  const actor=bondSource(b,source);
  combatEffect(b,actor,target,false,0,'impact',{name:'勇武',visual:'banner'},{text:'勇武 · 伤害免疫',ongoing:true});
  return true;
}
function damageUnitInner(b, attacker, target, skill, scale=1, definition=null, generateIntent=true,allowCounter=true,terrainOverride=null,intentTargets=null,attack=null) {
  if(['gate','building'].includes(target.type)){const before=target.hp;damageGate(b,attacker,scale,definition,target);return before-target.hp;}
  if(hasStatus(b,target,'stasis')||!skill&&!isTargetable(b,target))return 0;
  if(!skill&&!attack&&!target.isDecoy)recordBasicAttack(attacker,target);
  if(!target.isDecoy){attacker.participated=true;target.participated=true;}
  const own=attack?.attributes||unitAttributes(attacker,b),enemy=unitAttributes(target,b);
  const isolated=!adjacentBondAlly(b,target);
  const orb=!skill&&hasStatus(b,attacker,'attackOrb')?attacker.statuses.attackOrb:null,orbProfile=orb?ATTACK_ORBS[orb.skillId]:null;
  const orbTerrain=orb?tacticTerrainEffect(b,attacker,TACTICS_BOOK[orb.skillId],target):null;
  const intellectual=skill?definition?.category==='intellect':orb?orb.skillId==='curse':hasStatus(b,attacker,'strategyAttack');
  const valorImmune=!target.isDecoy&&blockValorDamage(b,attacker,target);
  if(valorImmune&&bondBlocksEffect(b,target,attacker)||battleInvincible(b,target)||commandBlocksDamage(b,target,{skill,intellectual})){
    if(!skill&&!attack){attacker.cooldown=own.attackInterval;attacker.attackCarry=0;if(orb){orb.charges--;if(!orb.charges)delete attacker.statuses.attackOrb;}}
    if(!valorImmune)combatEffect(b,attacker,target,skill,0,'impact',definition,{text:hasStatus(b,target,'commandInvincible')?'无敌':hasStatus(b,target,'guardInvincible')?'护卫免伤':peachInvincible(b,target)?'桃园无敌':'魔免',damageKind:intellectual?'intellect':'force'});return 0;
  }
  const kind=intellectual?'intellect':skill?'force':'basic';
  const power=skill?(intellectual?own.strategyPower:own.martialPower):orb?(orb.skillId==='curse'?own.strategyPower:own.attack+own.martialPower*orbProfile.bonus*(orbTerrain?.damage??1)):intellectual?own.strategyPower*.8:own.attack;
  const resistance=intellectual?enemy.discipline:enemy.defense*(1-bondDefenseIgnore(b,attacker,target,kind));
  const counter=counters(combatType(attacker),combatType(target))?1.28:counters(combatType(target),combatType(attacker))?.84:1;
  const pursuitBonus=!skill&&hasStatus(b,attacker,'pursuit')&&isRear(target)?1.35:1;
  const base=power*counter*100/(100+resistance)*(1-enemy.damageReduction)*passiveDamageMultiplier(b,attacker,target,kind,!skill)*passiveDamageTaken(b,target,kind,!skill)*pursuitBonus;
  const terrain=skill&&definition?(terrainOverride??tacticTerrainEffect(b,attacker,definition,target)):null;
  const heavyBonus=!skill&&allowCounter&&!intellectual&&!target.isDecoy?(heavyRule(b,attacker)?.bonus||0):0;
  const bondCritical=!skill&&allowCounter&&bondFinisherCritical(b,attacker,target);
  const raw=base*(1+heavyBonus)*(attack?.roll??(.9+random(b)*.2))*COMBAT.damageScale*(terrain?.damage??1)*(definition?.critical||bondCritical?POWER_RULES.criticalMultiplier:1);
  let damage;
  if(attack){
    // Round the combined budget, not each target's minimum-one share.
    attack.total+=Math.max(1,raw)*scale;
    damage=Math.round(attack.total)-attack.rounded;attack.rounded+=damage;
  }else damage=Math.max(1,Math.round(raw*scale));
  if(valorImmune)damage=0;
  if(target.isDecoy){hitDecoy(b,attacker,target,damage);if(!skill){attacker.cooldown=own.attackInterval;attacker.attackCarry=0;}return 0;}
  if(allowCounter&&hasStatus(b,target,'guard')){
    const guard=b.sides[target.side].units.find(v=>v.id===target.statuses.guard.sourceId&&v!==target&&v.status==='active'&&v.hp>0&&!hasStatus(b,v,'stasis')&&distance(v,target)<=statusValue(target,'guard','range'));
    if(guard){const shared=Math.min(guard.hp,Math.round(damage*statusValue(target,'guard','fraction')));damage-=shared;applySecondaryDamage(b,attacker,guard,shared,'护卫分担');}
  }
  const packet=applyPeachDamage(b,attacker,target,damage,{skill,intellectual,valorChecked:true});
  damage=packet.damage;
  const shieldAbsorbed=packet.absorbed;
  if(damage>0){breakStealth(b,target,'受到伤害');if(!packet.shared)transmitDamage(b,attacker,target,damage);triggerPreparedDecoy(b,target);} target.morale = Math.max(15, target.morale - (skill ? 5 : 1));
  if(!attack){attacker.morale = Math.min(100, attacker.morale + 3); if(!skill){attacker.cooldown = own.attackInterval-(attacker.attackCarry||0);attacker.attackCarry=0;}}
  // Only normal attacks charge the attacker. A multi-hit tactic charges each victim once.
  if(!skill&&generateIntent&&!attack)gainIntent(attacker,intentIncome(attacker,b).attack*contactIntentFactor(b,attacker));
  let intentDenied=0;
  if (allowCounter && target.hp > 0 && damage>0 && !intentTargets?.has(target.id)) {
    const income=Math.round(intentIncome(target,b).hit*contactIntentFactor(b,target)),possible=Math.min(income,Math.max(0,COMBAT.intentCap-target.intent));
    const chance=!skill&&generateIntent&&possible>0?bondHitIntentDenialChance(b,attacker,target):0;
    if(chance>0&&random(b)<chance){intentDenied=possible;recordContribution(attacker,'control',1);}
    else gainIntent(target,income);
    intentTargets?.add(target.id);
  }
  attacker.action = skill ? definition?.name || attacker.skill : `攻击${target.name}`;
  combatEffect(b, attacker, target, skill, damage,'impact',orb?TACTICS_BOOK[orb.skillId]:definition,{...(orb?{attackOrb:orb.skillId,orbRemaining:orb.charges-1,text:orbProfile.name+' · 余 '+(orb.charges-1)+' 次',...(orbTerrain.label?{terrain:orbTerrain.label+'（仅附加威力）',terrainFactor:orbTerrain.damage}:{})}:{}),...(definition?.trait?{ongoing:true}:{}),shieldAbsorbed,damageKind:intellectual?'intellect':'force',...(bondCritical?{critical:true,critChance:1,bondCritical:'bondFinisher',text:'锐锋 · 暴击'}:{}),...(definition?.critChance?{critical:definition.critical,critChance:definition.critChance}:{}),...(terrain?.label?{terrain:terrain.label,terrainFactor:terrain.damage}:{}),...(!allowCounter?{ongoing:true}:{}),...(intentDenied?{intentDenied,intentBlock:skill?'断势':'截气'}:{})});
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
  if(!definition?.trait&&allowCounter&&damage>0&&attacker.hp>0){
    traitEvent(b,attacker,skill?'tacticHit':'basicHit',{target,damage});
    const beauty=!skill&&!target.isDecoy?bondHitEffect(b,attacker):null;
    if(beauty){
      if(target.hp>0&&!hasStatus(b,target,'magicImmune')){const amount=lowerIntent(target,beauty.intentDrain,attacker,b);if(amount)combatEffect(b,attacker,target,false,0,'impact',{name:'倾国',visual:'banner'},{ongoing:true,text:'倾国 · 战意 −'+amount,intentDrained:amount});}
      // A shared-contact attack rolls the full-field effect once after all hits.
      if(beauty.allEnemies&&attack)attack.beauty=beauty;
      else applyBeautyStatuses(b,attacker,beauty,beauty.allEnemies?activeUnits(b,1-attacker.side):[target]);
    }
    if(!skill){resolveBondHit(b,attacker,target,bondComboApi(b),{isolated});if(!attack)resolveBondAttack(b,attacker,bondComboApi(b));}
    if(target.hp<=0)traitEvent(b,attacker,'kill',{target,damage});
  }
  if(attack)attack.targets.push(target);
  else if(allowCounter)counterAttack(b,attacker,target);
  return damage;
}
function applyBeautyStatuses(b,attacker,beauty,targets){
  for(const target of targets){
    if(target.status!=='active'||target.hp<=0||target.isDecoy||hasStatus(b,target,'magicImmune')||hasStatus(b,target,'stasis')||bondBlocksEffect(b,target,attacker))continue;
    const choices=beauty.statuses.filter(key=>!hasStatus(b,target,key)&&!traitImmune(target,key)&&!(CONTROL_STATUSES.includes(key)&&hasStatus(b,target,'resolve')));
    if(!choices.length||random(b)>=beauty.chance)continue;
    const key=choices[Math.floor(random(b)*choices.length)],source={sourceId:attacker.id,sourceName:attacker.name,sourceSkillName:'倾国'};
    if(CONTROL_STATUSES.includes(key))applyControl(b,target,beauty.steps,key,source);else setStatus(b,target,key,beauty.steps,source);
    if(hasStatus(b,target,key)){
      recordContribution(attacker,'control',1);
      combatEffect(b,attacker,target,false,0,'impact',{name:'倾国',visual:'banner'},{ongoing:true,text:'倾国 · '+STATUS_DEFINITIONS[key].name});
      statusNotice(b,target,'倾国 · '+STATUS_DEFINITIONS[key].name);
    }
  }
}
function counterAttack(b,attacker,target){
  if(!target.withdrawing&&!target.disengage&&!b.sides[target.side].retreat&&target.hp>0&&attacker.hp>0&&distance(attacker,target)===1&&hasStatus(b,target,'riposte')&&target.statuses.riposte.lastTick!==b.tick&&!hasStatus(b,target,'stun')&&!hasStatus(b,target,'confuse')&&!hasStatus(b,target,'disarm')){target.statuses.riposte.lastTick=b.tick;damageUnit(b,target,attacker,true,.55,TACTICS_BOOK.riposte,false,false);}
}
function contactTargets(b,u){
  const stats=unitAttributes(u,b);
  if(stats.range<1||stats.minRange>1)return [];
  return activeUnits(b,1-u.side).filter(e=>isTargetable(b,e)&&distance(u,e)===1).sort((a,c)=>a.id.localeCompare(c.id));
}
function traitEvent(b,u,event,context={}){
  resolveTraitEvent(b,u,event,context,{
    random,control:(t,steps,key,source)=>applyControl(b,t,steps,key,source),moved,
    wounded:battleWounded,attributes:t=>unitAttributes(t,b),intent:gainIntent,commandCapacity:COMMAND_RESOURCE.capacity,
    healFactor:t=>hasStatus(b,t,'plague')?1-statusFraction(t,'plague',.5):1,
    signal:(source,target,name,extra={})=>combatEffect(b,source,target,true,0,'impact',{name,visual:'banner'},{ongoing:true,text:name,...extra}),
    damage:(source,target,scale,definition)=>damageUnit(b,source,target,true,scale,definition,false,true),
  });
}
function basicAttackInner(b,u,target,contacts){
  if(hasStatus(b,u,'disarm')){u.action='缴械';return;}
  const heavy=heavyRule(b,u),begin=b.effects.length;
  basicAttackCore(b,u,target,contacts);
  const heavyHits=heavy?b.effects.slice(begin).filter(e=>e.from===u.id&&!e.skill&&!e.ongoing&&e.damageKind==='force'&&(e.damage>0||e.shieldAbsorbed>0)&&b.sides[1-u.side].units.some(t=>t.id===e.to&&!t.isDecoy)):[];
  if(heavyHits.length){u.statuses.heavyAttack.charges--;if(!u.statuses.heavyAttack.charges)delete u.statuses.heavyAttack;if(target.hp>0&&heavyHits.some(e=>e.to===target.id))applyControl(b,target,heavy.steps,heavy.control,{sourceId:u.id,sourceName:u.name,sourceSkillName:'先登重击'});statusNotice(b,u,'重击 · 余 '+(u.statuses.heavyAttack?.charges||0)+' 次');}
  traitEvent(b,u,'basic',{target});
}
function basicAttackCore(b,u,target,contacts){
  if(hasStatus(b,u,'disarm')){u.action='缴械';return;}
  const surprise=hasStatus(b,u,'stealth')&&!detected(b,u);
  if(breakStealth(b,u,'发动普攻'))traitEvent(b,u,'revealAttack');
  const areaEntry=!target.isDecoy&&mechanicEntries(u,'basic').find(e=>e.rule.effect==='areaBasic'&&traitEligible(b,u,e.rule));
  let area=null;
  if(areaEntry){
    const stats=unitAttributes(u,b),r=areaEntry.rule;
    if(random(b)<r.chance){
      area=areaEntry;
      contacts=[target,...activeUnits(b,1-u.side).filter(t=>t!==target&&isTargetable(b,t)&&distance(t,target)<=r.range&&distance(u,t)>=stats.minRange&&distance(u,t)<=stats.range).sort((a,c)=>a.id.localeCompare(c.id)).slice(0,r.targets)];
    }
  }
  if(surprise&&!area){const hp=target.hp;damageUnit(b,u,target,false);if(!target.isDecoy&&target.hp>0&&target.hp<hp){applyControl(b,target,STATUS_DEFINITIONS.stealth.confuseDays,'confuse',{sourceId:u.id,sourceName:u.name,sourceSkillName:'伏兵'});statusNotice(b,u,'破隐一击 · '+target.name+(hasStatus(b,target,'confuse')?'混乱':'坚定抵御'));}return;}
  if(target.isDecoy)contacts=[];
  if(!area&&contacts.length<2){damageUnit(b,u,target,false);return;}
  // One attack budget, shared across every touching enemy. Resolve all shares
  // before retaliation so array order cannot cancel the remaining contacts.
  recordBasicAttack(u,target);
  const attack={attributes:unitAttributes(u,b),roll:.9+random(b)*.2,targets:[],total:0,rounded:0};
  const orb=hasStatus(b,u,'attackOrb')?u.statuses.attackOrb:null;
  const start=b.effects.length,before=area?snapshotTactic(b):null;
  for(const enemy of contacts)damageUnit(b,u,enemy,false,area?1:1/contacts.length,null,true,true,null,null,attack);
  if(attack.beauty)applyBeautyStatuses(b,u,attack.beauty,activeUnits(b,1-u.side));
  const hits=b.effects.slice(start).filter(e=>e.from===u.id&&!e.skill&&!e.ongoing);
  for(const effect of hits){
    if(area){effect.abilityKind='trait';effect.traitId=area.id;effect.label=area.name;effect.traitEffective=true;}
    else {effect.sharedTargets=contacts.length;effect.damageShare=1/contacts.length;}
  }
  if(area&&hits.length){hits[0].outcome=tacticOutcome(b,u,before,hits);hits[0].traitEffective=hits.some(e=>e.damage>0||e.shieldAbsorbed>0);}
  if(area&&surprise&&target.hp>0&&hits.some(e=>e.to===target.id&&e.damage>0))applyControl(b,target,STATUS_DEFINITIONS.stealth.confuseDays,'confuse',{sourceId:u.id,sourceName:u.name,sourceSkillName:'伏兵'});
  u.morale=Math.min(100,u.morale+3);
  u.cooldown=attack.attributes.attackInterval-(u.attackCarry||0);u.attackCarry=0;
  gainIntent(u,intentIncome(u,b).attack*contactIntentFactor(b,u));
  if(hits.some(e=>e.damage>0))resolveBondAttack(b,u,bondComboApi(b));
  if(orb){orb.charges--;if(!orb.charges)delete u.statuses.attackOrb;}
  u.action=area?`飞将 · 范围普攻 ${contacts.length} 队`:`分击 ${contacts.length} 队 · 各分摊 1/${contacts.length}`;
  for(const enemy of attack.targets)counterAttack(b,u,enemy);
}
function applyControl(b,u,steps,key='confuse',source={}) {
  if(bondBlocksEffect(b,u,source))return;
  if(hasStatus(b,u,'resolve')||hasStatus(b,u,'magicImmune')||traitImmune(u,key))return;
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
function finishTacticInner(b,u,s,target) {
  if(u.withdrawing||u.disengage||b.sides[u.side].retreat||u.status!=='active'||u.hp<=0)return false;
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
    const immune=bondBlocksEffect(b,t,u)||hasStatus(b,t,'magicImmune')||traitImmune(t,key)||CONTROL_STATUSES.includes(key)&&hasStatus(b,t,'resolve');
    const resistance=unitAttributes(t,b)[s.category==='intellect'?'discipline':'defense'];
    const chance=immune?0:effectChance(power,resistance),success=!immune&&random(b)<chance;
    const text=CHANCE_EFFECT_NAMES[key]+(immune?'免疫':success?'成功':'未成功');
    combatEffect(b,u,t,true,0,'impact',s,{text,resolution:{effect:key,chance,success,immune}});
    return success;
  };
  const status=(t,key,steps,extra={})=>{
    if(bondBlocksEffect(b,t,u,{beneficial:STATUS_DEFINITIONS[key]?.tone==='buff'})){signal(t,'勇武 · 战法免疫');return false;}
    if(t.side!==u.side&&!isTargetable(b,t))return false;
    if(t.side!==u.side&&hasStatus(b,t,'magicImmune')&&NEGATIVE_STATUSES.includes(key))return false;
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
  let sustainDamage=0;
  const hit=(t,scale=1.5,charge=true)=>{
    if(u.hp<=0||t.hp<=0)return 0;
    const adjacent=distance(u,t)===1&&!t.isDecoy&&t.type!=='gate';
    const damage=damageUnit(b,u,t,true,scale*(1+bonus/100),definitionFor(t),charge,true,noteTerrain(t),intentTargets)||0;
    if(adjacent)sustainDamage+=damage;
    return damage;
  };
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
    case 'blight':hit(target,.7);if(target.hp>0)status(target,'plague',s.steps,{sourceId:u.id,amount:Math.round(power*.025)});break;
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
    case 'displace':{
      hit(target,s.scale);if(target.hp<=0||hasStatus(b,target,'root')||hasStatus(b,target,'phalanx')||hasStatus(b,target,'resolve')||!attempt(target,'knockback'))break;
      const from={x:target.x,y:target.y};
      for(let i=0;i<s.steps;i++){const next=hexBeyond(u,target);if(!openCell(b,next.x,next.y,target))break;target.x=next.x;target.y=next.y;syncCombatForm(b,target);}
      if(target.x!==from.x||target.y!==from.y){moved(b,target,from);combatEffect(b,u,target,true,0,'impact',s,{fromX:from.x,fromY:from.y,text:'击退'});}break;
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
        const loss=takeCasualties(b,u,Math.min(u.hp-1,Math.floor(u.hp*s.selfCost)));
        if(loss)combatEffect(b,u,u,true,loss,'impact',s,{text:'自损'});
      }
      let charged=false;
      for(const t of targets){
        if(s.mode==='attack'&&bondBlocksEffect(b,t,u)){signal(t,'勇武 · 战法免疫');continue;}
        if(s.mode==='attack'){
          // Snapshot conditions before this cast applies its own hit intent or debuffs.
          const opening=tacticOpening(b,s,t);
          const scale=s.scale+(s.execute&&t.hp/t.maxHp<.4?s.execute:0)+opening.scale;
          if(opening.setup||opening.highIntent)signal(t,opening.setup?'乘隙追击':'高战意反制',{openingTrigger:opening.setup?'setup':'highIntent'});
          for(let i=0;i<(s.hits||1)&&t.hp>0;i++){hit(t,scale,!charged);charged=true;}
          if(t.hp<=0)continue;
          if(s.debuff)status(t,s.debuff,s.steps);
          if(s.control)control(t,s.steps,s.control);
          if(s.drain){const amount=(hasStatus(b,t,'magicImmune')?0:lowerIntent(t,boosted(s.drain+opening.drain),u,b));signal(t,`战意 −${amount}`,{intentDrained:amount});}
          if(s.burn)status(t,'burn',s.steps,{sourceId:u.id,amount:boosted(s.burn*power/280*100/(100+unitAttributes(t,b).discipline),null,null,false)});
        }else{
          if(s.useEffect&&t!==u){const restored=recoverTacticUses(t,unitTactics(t),s.useEffect);for(const skill of restored)signal(t,skill.name+(s.useEffect==='expand'?'上限及剩余 +1':'次数恢复 +1'),{tacticUseChange:{id:skill.id,mode:s.useEffect,amount:1}});}
          if(s.heal)heal(t,s.heal);
          if(s.regrowthFraction)status(t,'regrowth',s.regrowthSteps,{amount:boosted(t.maxHp*s.regrowthFraction,t,'healing'),sourceId:u.id});
          if(s.cleanse){remedy(b,t,'calm');status(t,'resolve',3);}
          if(s.shield)status(t,'shield',8,{amount:boosted(t.maxHp*s.shield,t,'shield')});
          if(s.intent&&t!==u)gainIntent(t,boosted(s.intent,t,'intent'),u);
          if(s.cooldownReduction&&t!==u)for(const id of Object.keys(t.skillReady||{}))t.skillReady[id]=Math.max(b.tick,t.skillReady[id]-boosted(s.cooldownReduction,t,'cooldown'));
          if(s.ward)status(t,'ward',5,{percent:s.ward});
          if(s.valor)status(t,'valor',5);
          if(s.buffs)for(const [key,potency]of Object.entries(s.buffs))if(!hasStatus(b,t,key)||(t.statuses[key].potency??1)<=factor*potency)status(t,key,s.buffSteps,{potency:factor*potency});
        }
        signal(t,s.name);
      }
      if(s.selfStatus)status(u,s.selfStatus,s.selfStatusSteps);
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
    case 'harass':{const amount=(hasStatus(b,target,'magicImmune')?0:lowerIntent(target,boosted(24+Math.round(power*.03),null,null,false),u,b));status(target,'weaken',6);if(!hasStatus(b,target,'resolve'))status(target,'disrupted',4);signal(target,`战意 −${amount}`,{intentDrained:amount});break;}
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
        if(combatFamily(u)==='cavalry')status(u,'pursuit',8,{targetId:target.id});
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
    case 'undermine':{
      for(const t of undermineTargets(b,u,s,target)){
        const opening=tacticOpening(b,s,t),amount=lowerIntent(t,boosted(s.drain+opening.drain),u,b);
        status(t,'intentSuppression',s.steps,{fraction:s.suppression});status(t,'weaken',s.steps);
        signal(t,'战意 −'+amount,{intentDrained:amount,...(opening.highIntent?{openingTrigger:'highIntent'}:{})});
      }
      break;
    }
    default:return false;
  }
  if(s.meleeSustain&&sustainDamage>0&&u.hp>0&&u.status==='active'){
    const sustain=s.meleeSustain,cap=Math.floor(u.maxHp*sustain.cap);
    const healing=Math.min(battleWounded(u),u.maxHp-u.hp,Math.floor(Math.min(cap,sustainDamage*sustain.heal)*(hasStatus(b,u,'plague')?1-statusFraction(u,'plague',.5):1)));
    if(healing>0){u.hp+=healing;u.healed=(u.healed||0)+healing;combatEffect(b,u,u,true,0,'impact',s,{text:'吸血救治 +'+healing,healing});}
    const amount=Math.min(cap,Math.floor(sustainDamage*sustain.shield));
    if(amount>0){setStatus(b,u,'shield',sustain.steps,{amount,source:u.id+':'+s.id,label:u.name+' · '+s.name});signal(u,'浴血护盾 +'+amount);}
  }
  traitEvent(b,u,'cast',{target});
  const castEvents=b.effects.slice(effectStart).filter(e=>e.from===u.id&&!e.ongoing);
  if(castEvents.length){castEvents[0].outcome=tacticOutcome(b,u,before,b.effects.slice(effectStart));castEvents[0].castPower=power;}
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
  u.action=s.name;if(!castEvents.length)appendBattleLog(b,`${u.name}发动「${s.name}」：无即时数值变化。`,'tactic',u.side);return true;
}
function triggerPreparedDecoy(b,u){
  const mark=u.preparedDecoy;
  if(!mark||mark.used||u.hp<=0||u.hp/u.initial>=mark.threshold)return;
  if(createDecoy(b,u,mark.source||{})){mark.used=true;statusNotice(b,u,'疑兵预置触发');}
}
function applySecondaryDamage(b,attacker,u,amount,label){
  if(blockValorDamage(b,attacker,u))return;
  if(battleInvincible(b,u)||hasStatus(b,u,'stasis')||commandBlocksDamage(b,u,{secondary:true})||u.hp<=0)return;
  const damage=takeCasualties(b,u,absorbBattleShield(b,u,amount),attacker);
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
function tickStatusesInner(b) {
  for(const u of b.sides.flatMap(s=>s.units)) {
    u.statuses ||= {};u.skillReady ||= {};u.tacticCasts ||= {};refreshTreasureStatuses(b,u);refreshShield(b,u);
    for(const [key,status] of Object.entries(u.statuses))if(status.until<=b.tick){if(key==='stealth')statusNotice(b,u,'伏兵显形 · 潜行到期');delete u.statuses[key];}
    if(u.status!=='active'||u.hp<=0)continue;
    if(hasStatus(b,u,'despair')){const amount=lowerIntent(u,statusValue(u,'despair','amount'),bondSource(b,u.statuses.despair),b);if(amount)statusNotice(b,u,'丧志 · 战意 −'+amount);}
    if(hasStatus(b,u,'regrowth')){const regen=u.statuses.regrowth,source=b.sides.flatMap(s=>s.units).find(a=>a.id===regen.sourceId);const amount=treasureHealBudget(u,regen,Math.min(battleWounded(u),u.maxHp-u.hp,Math.round(regen.amount*(hasStatus(b,u,'plague')?1-statusFraction(u,'plague',.5):1))));if(amount>0){u.hp+=amount;u.healed+=amount;debitTreasureHealing(u,regen,amount);u.participated=true;if(source)combatEffect(b,source,u,true,0,'impact',TACTICS_BOOK.regrowth,{text:'休整 +'+amount,healing:amount,ongoing:true});}}
    for(const key of ['burn','plague'])if(u.hp>0&&!battleInvincible(b,u)&&!hasStatus(b,u,'stasis')&&!hasStatus(b,u,'magicImmune')&&hasStatus(b,u,key)) {
      const burn=u.statuses[key],source=b.sides.flatMap(s=>s.units).find(s=>s.id===burn.sourceId);
      const terrainFactor=key==='plague'?1:fireTerrainFactor(b,u);
      let damage=Math.round(burn.amount*passiveDamageTaken(b,u,'dot')*terrainFactor*bondValorDamage(b,source,u));u.participated=true;
      damage=applyPeachDamage(b,source,u,damage).damage;
      if(damage>0){breakStealth(b,u,'持续伤害');triggerPreparedDecoy(b,u);}
      if(source)combatEffect(b,source,u,false,damage,'impact',(key==='plague'?TACTICS_BOOK.plague:TACTICS_BOOK.fire),{text:key==='plague'?'疫伤':key==='burn'?'火攻':`灼烧 ${burn.stacks||1}层`,damageKind:'dot',fromX:u.x,fromY:u.y});
      if(u.hp<=0) {u.status='defeated';u.cast=null;u.action='溃败';battleLog(b,`${u.name}所部在持续伤害中溃败。`);}
    }
  }
}
function pulseStratagemZones(b){
 tickStratagemZones(b,{random,applyStatus:(u,key,steps,source)=>{
  // Round-start application includes this round in the duration.
  if(CONTROL_STATUSES.includes(key))applyControl(b,u,steps-1,key,source);else setStatus(b,u,key,steps-1,source);
  return hasStatus(b,u,key);
 },onApplied:(zone,u,key)=>{
  const source=b.sides[zone.side].units.find(v=>v.id===zone.source.id),name=STRATAGEMS[zone.key].name;
  if(source){source.participated=true;recordContribution(source,'control',1);}
  u.participated=true;
  battleLog(b,name+' · '+u.name+'陷入'+STATUS_DEFINITIONS[key].name+'。');
  b.effects.push({from:zone.source.id,to:u.id,x:u.x,y:u.y,side:zone.side,skill:false,damage:0,ongoing:true,label:name,text:STATUS_DEFINITIONS[key].name});
 }});
}
function pulseFacilities(b){
 pulseBattleBuildings(b,{
  visible:u=>isTargetable(b,u),stasis:u=>hasStatus(b,u,'stasis'),
  shoot:(a,u,power)=>peachBatch(b,()=>{
   if(battleInvincible(b,u)||commandBlocksDamage(b,u,{secondary:true}))return;
   const stats=unitAttributes(u,b);let raw=Math.max(1,Math.round(power*100/(100+stats.defense)*(1-stats.damageReduction)*COMBAT.damageScale));
   if(hasStatus(b,u,'guard')){const guard=b.sides[u.side].units.find(v=>v.id===u.statuses.guard.sourceId&&v!==u&&v.status==='active'&&v.hp>0&&!hasStatus(b,v,'stasis')&&distance(v,u)<=statusValue(u,'guard','range'));if(guard){const shared=Math.min(guard.hp,Math.round(raw*statusValue(u,'guard','fraction')));raw-=shared;applySecondaryDamage(b,a,guard,shared,'护卫分担');}}
   const packet=applyPeachDamage(b,a,u,raw,{secondary:true});
   if(packet.damage>0){u.participated=true;breakStealth(b,u,'箭塔射击');triggerPreparedDecoy(b,u);if(!packet.shared)transmitDamage(b,a,u,packet.damage);if(u.hp>0)gainIntent(u,intentIncome(u,b).hit*contactIntentFactor(b,u));}
   if(u.hp<=0){u.status='defeated';u.cast=null;u.action='溃败';battleLog(b,u.name+'所部被箭塔击溃。');}
   combatEffect(b,a,u,false,packet.damage,'impact',{name:a.name,visual:'volley'},{ongoing:true,shieldAbsorbed:packet.absorbed,text:'箭塔射击',damageKind:'force'});
  }),
  intent:(a,u,amount)=>{const before=u.intent;gainIntent(u,amount);if(u.intent>before)combatEffect(b,a,u,false,0,'impact',{name:a.name,visual:'banner'},{ongoing:true,text:'军乐鼓舞 · 战意 +'+(u.intent-before),intentGained:u.intent-before});},
  heal:(a,u,fraction)=>healWounded(b,u,fraction,true,a,a.name)
 });
}
// Normal games keep the enemy on AI and the player on the chosen queue.
// Audits may run both sides through the same existing AI, without changing its policy.
function confirmScheduledArrivals(b,pauseForReinforcements,{conditionsOnly=false,aiSides=[]}={}){
 const units=b.sides.flatMap(s=>s.units);
 const arrivals=units.filter(u=>u.reinforcementIndex!==undefined&&!u.arrivalConfirmed&&u.status==='reserve'&&
  (u.arrivalCondition?arrivalConditionMet(b,u.arrivalCondition):!conditionsOnly&&u.arrivalTick<=b.tick));
 for(const u of arrivals){u.arrivalConfirmed=true;if(u.arrivalCondition)u.arrivalTick=b.tick;}
 for(const id of new Set(arrivals.map(u=>u.armyId))){const u=arrivals.find(u=>u.armyId===id);battleLog(b,`${u.side===0?'我军':'敌军'}援军抵达，${arrivals.filter(u=>u.armyId===id).length}队加入后备。`);}
 if(arrivals.length)applyBattleEvents(b);
 for(const side of aiSides)if(arrivals.some(u=>u.side===side))planArrivalAppointmentsAI(b,side);
 if(pauseForReinforcements&&arrivals.some(u=>u.side===0)&&!b.sides[0].retreat)b.reinforcementCouncil='pending';
}
export function stepBattle(b, {aiSides=[1],pauseForReinforcements=!aiSides.includes(0)}={}) {
  if (!b || b.result || b.reinforcementCouncil) return;
  if(isDeploying(b))for(const side of aiSides)planBattleCouncilAI(b,side);
  if (isDeploying(b) && lockDeployment(b)) return;
  confirmScheduledArrivals(b,pauseForReinforcements,{aiSides});
  if(b.reinforcementCouncil)return;
  b.tick++; b.effects = [];
  for (const side of b.sides) for (const u of side.units) {
    u.intent=Math.min(COMBAT.intentCap,Math.max(0,u.intent||0));
    if (u.wave && u.reinforcementIndex===undefined && u.arrivalTick === b.tick && side.units.find(v => v.wave === u.wave) === u)
      battleLog(b, `${u.side === 0 ? '我军' : '敌军'}第 ${u.wave} 批援军抵达，有空位时补入战线。`);
  }
  b.comboWindows=(b.comboWindows||[]).filter(c=>b.tick-c.tick<=COMBO.window&&b.sides.flatMap(s=>s.units).some(u=>u.id===c.targetId&&u.status==='active'&&u.hp>0));
  b.comboCounts ||= [0,0];
  for(const u of b.sides.flatMap(s=>s.units))beginUnitRetreat(b,u);
  tickStatuses(b);
  applyBattleEvents(b);
  for(const u of b.sides.flatMap(s=>s.units))traitEvent(b,u,'pulse');
  fillControllerSlots(b,aiSides);
  pulseStratagemZones(b);
  pulseFacilities(b);
  for(const side of (b.tick%2?[0,1]:[1,0]))for(const u of activeUnits(b,side))if(bondOperational(b,u)){
    const target=pickTarget(b,u,true),stats=unitAttributes(u,b);
    pulseBondCombos(b,u,target&&distance(u,target)>=stats.minRange&&distance(u,target)<=stats.range&&canStrikeFrom(b,u,target)?target:null,bondComboApi(b));
  }
  b.commandProgress=Math.min(COMMAND_RESOURCE.capacity,(b.commandProgress||0)+commandIntellect(b));
  b.enemyCommand.commandProgress=Math.min(COMMAND_RESOURCE.capacity,b.enemyCommand.commandProgress+commandIntellect(b,1));
  // Alternate initiative each step so one faction does not always act first.
  const sequence = b.tick % 2 ? [0, 1] : [1, 0];
  for (const side of sequence) for (const unit of [...activeUnits(b, side)]) {
    if (unit.status !== 'active') continue;
    unit.attackCarry=unit.cooldown>1e-9&&unit.cooldown<1?1-unit.cooldown:0;
    unit.cooldown = unit.cooldown-1<1e-9?0:unit.cooldown-1;
    if(hasStatus(b,unit,'stasis')){unit.action='避战 · 无敌';continue;}
    if(hasStatus(b,unit,'stun')){unit.cast=null;unit.action='眩晕';continue;}
    if(hasStatus(b,unit,'confuse')) {unit.action='混乱';continue;}
    if(hasStatus(b,unit,'confuse')) {
      const cells=hexNeighbors(unit).filter(([x,y])=>openCell(b,x,y,unit));
      if(cells.length&&unitAttributes(unit,b).move>0){const from={x:unit.x,y:unit.y};const [x,y]=cells[Math.floor(random(b)*cells.length)];unit.x=x;unit.y=y;moved(b,unit,from);}
      unit.action='混乱 · 阵位失序';continue;
    }
    if (b.sides[side].retreat || unit.withdrawing) {
      unit.cast = null;syncCombatForm(b,unit);
      moveUnit(b, unit, { x: side === 0 ? 0 : 13, y: unit.y }, true);
      if (unit.x === (side === 0 ? 0 : 13)) { unit.status = 'withdrawn'; unit.action = '已撤离'; battleLog(b, `${unit.name}所部成功撤离。`); }
      continue;
    }
    if(unit.disengage){
      const target=[...b.sides[1-side].units,...battleBuildings(b).filter(a=>a.side!==side)].find(e=>e.id===unit.disengage.targetId&&(e.status==='active'||['gate','building'].includes(e.type))&&e.hp>0&&isTargetable(b,e));
      // A moving guard or newly occupied cell can invalidate an earlier order.
      // Release it and choose a legal target instead of repeating empty disengagement.
      const meaningful=target&&(target.type!=='building'||facilityTargetValue(b,target)>0||pickTarget(b,unit)?.id===target.id);
      if(meaningful&&findMoveRoute(b,unit,target).route!==null){moveUnit(b,unit,target);continue;}unit.disengage=null;
    }
    if(syncCombatForm(b,unit,pickTarget(b,unit))){unit.action='展开兵器';continue;}
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
    if(breachGate&&combatFamily(unit)==='siege'&&unitTactics(unit).some(s=>s.id==='ram'&&tacticUsesLeft(unit,s)>0)&&unit.intent>=TACTICS_BOOK.ram.threshold&&(unit.skillReady.ram||0)<=b.tick&&!tauntTarget(b,unit,attackRange(b,unit))&&!activeUnits(b,1-side).some(e=>distance(unit,e)<=2)&&distance(unit,breachGate)>2){moveUnit(b,unit,breachGate,false,2);continue;}
    const focused=pickTarget(b,unit);
    const explicitFocus=focused && b.sides[side].focus===focused.id && b.sides[side].focusUntil>b.tick;
    const swiftChase=focused&&isRear(focused)&&bondSwiftEffect(b,unit);
    const contacts=hasStatus(b,unit,'stealth')?[]:contactTargets(b,unit);
    const target = (swiftChase?focused:null) || (contacts.length>1&&!explicitFocus?contacts.find(e=>e.id===focused?.id)||contacts[0]:null) || (!unit.cooldown && !explicitFocus ? pickTarget(b,unit,true) : null) || focused; if (!target){unit.action='警戒等待';continue;}
    if(distance(unit,target)<(unitAttributes(unit,b).minRange||0)){moveUnit(b,unit,target);continue;}
    if (distance(unit, target) <= attackRange(b,unit)&&canStrikeFrom(b,unit,target)) {
      if (!unit.cooldown) {
        if(hasStatus(b,unit,'disarm')){unit.action='缴械';continue;}
        if (['gate','building'].includes(target.type)){breakStealth(b,unit,'攻击'+target.name);damageGate(b,unit,1,null,target);}
        // A shot at a distant rear is not a contact attack. Adjacent rear contact
        // still shares the one existing damage budget with all adjacent troops.
        else basicAttack(b,unit,target,swiftChase&&distance(unit,target)>1?[]:contacts);
        if (b.result) return;
      } else unit.action = '重整攻势';
    } else {
      const support=!swiftChase&&!hasStatus(b,unit,'stealth')&&!explicitFocus&&!tauntTarget(b,unit,attackRange(b,unit))&&supportApproach(b,unit);
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
  confirmScheduledArrivals(b,pauseForReinforcements,{conditionsOnly:true,aiSides});
  if(!b.reinforcementCouncil)fillControllerSlots(b,aiSides);
  const counts = [0,1].map(side => remainingUnits(b,side).length + (b.siege?.gate.side === side && b.siege.gate.hp > 0 && !b.sides[side].retreat && !(remainingUnits(b,side).length===0&&b.sides[side].units.some(u=>u.status==='withdrawn')) ? 1 : 0));
  if (!counts[0] || !counts[1]) b.result = { winner: !counts[0] && !counts[1] ? null : counts[0] ? 0 : 1, reason: b.sides.some((s,i)=>!counts[i]&&(s.retreat||s.units.some(u=>u.status==='withdrawn'))) ? '撤退' : '击溃' };
  if(!b.result&&b.holdUntil){
    const side=b.siege?.gate.side;
    if(!remainingUnits(b,side).length)b.result={winner:1-side,reason:b.sides[side].retreat?'撤退':'击溃'};
    else if(b.tick>=b.holdUntil&&!b.sides[side].retreat&&b.siege.gate.hp>0){
      b.result={winner:side,reason:'坚守成功'};battleLog(b,'守军保住城门，完成限时坚守目标。');
    }
  }
  if (!b.result && b.tick >= (b.maxTicks || 240)) {
    const ratios = b.sides.map((s,side) => remainingUnits(b,side).reduce((n,u)=>n+u.hp,0) / Math.max(1, s.units.reduce((n, u) => n + u.initial, 0)));
    b.result = { winner: Math.abs(ratios[0] - ratios[1]) < .05 ? null : ratios[0] > ratios[1] ? 0 : 1, reason: '久战收兵' };
    battleLog(b, '达到战斗时限，按双方可战兵力比例判定战局，诸军收兵。');
  }
  // Both controllers spend newly earned gauge at the completed-step boundary.
  // The AI must not affect unit actions in the same step that filled its gauge;
  // the player can only respond after stepBattle returns. Finished fights do
  // not accept a last order that could alter the already resolved outcome.
  if(b.result)b.reinforcementCouncil=null;
  for(const side of [1,0])if(aiSides.includes(side)&&!b.result&&(side?b.enemyCommand:b).commandProgress>=COMMAND_RESOURCE.capacity){
    const command=chooseEnemyCommand(b,battleStratagems(b,side),STRATAGEMS,side);
    if(command)issueCommand(b,command,chooseStratagemPoint(b,STRATAGEMS[command],side),side,{ai:true});
  }
  for(const u of b.sides.flatMap(s=>s.units)){refreshTreasureStatuses(b,u);refreshShield(b,u);}
  recordBattleEffects(b);
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
          const merit=battleMeritResult(unit,b),result=changeMerit(source,merit.net);
          if(merit.score>0||merit.penalty>0)growth.push({id:source.id,name:source.name,side,...merit,...result});
          if(result.after!==result.before)log(state,`${source.name}${meritChangeText(result)}。`,result.gained<0?'war':'good');
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
  const appointments=[];
  if (b.result.winner === 0) { state.victories++; state.fame += 30; state.gold += 300; }
  state.report = { id: b.id, city: city.name, winner: b.result.winner, reason: b.result.reason, tick: b.tick, stats, growth, appointments, captured: oldOwner !== city.owner, owner: city.owner, reward: b.result.winner === 0 ? 300 : 0 };
  log(state, `${city.name}之战${b.result.winner === 0 ? '告捷' : b.result.winner === 1 ? '失利' : '未分胜负'}，我军阵亡 ${stats[0].killed} 人，伤兵 ${stats[0].wounded} 人。`, b.result.winner === 0 ? 'good' : 'war');
  if (b.siege) state.report.gate = { remaining:b.siege.gate.hp, initial:b.siege.gate.maxHp, side:b.siege.gate.side };
  preparePostbattleAppointments(state,b,[...context.attackingIds,...context.defenderIds]);
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
  const result = r => r && [0, 1, null].includes(r.winner) && ['撤退', '击溃', '久战收兵', '城门失守','坚守成功','停战退兵'].includes(r.reason);
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
  if(scenario){const custom=validateCustomBattle(value.testScenario.customBattle);require(custom.seed===value.testScenario.seed&&custom.shieldPercent===value.testScenario.shieldPercent&&custom.ownTroopBudget===value.testScenario.customBattle.ownTroopBudget,'战役生成配置不一致');scenario={...scenario,limit:custom.limit,ownTroopBudget:custom.ownTroopBudget,waves:custom.waves,reinforcements:custom.reinforcements,events:custom.events,holdUntil:custom.holdUntil,gateHp:custom.battleKind==='field'?0:custom.gateHp,defending:custom.battleKind==='defense'};}
  const initial = strategic && value.campaign?.scenarioId ? nationalWorld(value.campaign.scenarioId) : newGame();
  require(Array.isArray(value.cities) && value.cities.length === initial.cities.length && Array.isArray(value.armies) && value.armies.length <= (strategic||scenario?Object.keys(OFFICER_BY_ID).length:15) && Array.isArray(value.logs) && value.logs.length <= 60 && JSON.stringify(value.roads) === JSON.stringify(initial.roads), '存档结构不完整');
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
    for (const key of ['name', 'x', 'y', 'subtitle', 'province',...(strategic&&value.campaign?.scenarioId?['kind','sourceId','water','citySize']:[])]) require(city[key] === source[key], '地图数据不匹配');
  }
  require(new Set(value.cities.map(c => c.id)).size === value.cities.length, '城池编号重复');
  function validateUnit(u, combat = false) {
    require(validTacticLearning(u),'战法学习记录无效');
    require(validLoadout({...u,formType:null},u.tactics)||validLoadout(u,u.tactics),'战法配置无效');
    require(validTreasureId(u.treasureId),'宝物装备无效');
    require(validEquipment(u.equipment),'携带装备无效');
    require(u && TROOPS[u.type]?.category==='troop' && ['front', 'middle', 'back', 'left', 'right'].includes(u.formation) && number(u.troops) && number(u.wounded) && typeof u.first === 'boolean', '武将数据无效');
    require(u.retreatAt===undefined||validRetreatAt(u.retreatAt),'撤离设置无效');
    require(u.meritCapacity===undefined||number(u.meritCapacity,troopCapacity({...u,level:10}))&&u.meritCapacity>troopCapacity(u),'降级整编上限无效');
    require(u.troops+u.wounded<=(u.meritCapacity||troopCapacity(u)),'现役与伤兵总数超过武将带兵上限');
    const profile=officerProfile(u.id);
    for(const key of PROFILE_FIELDS)require(u[key]===profile[key],'武将人物资料不匹配');
    const relation=u.relations;
    require(relation&&typeof relation==='object'&&!Array.isArray(relation)&&Object.keys(relation).length===6,'人物关系数据无效');
    for(const key of ['fatherId','motherId'])require(relation[key]===profile.relations[key],'人物关系数据无效');
    for(const key of RELATION_LIST_FIELDS)require(Array.isArray(relation[key])&&relation[key].length===profile.relations[key].length&&relation[key].every((id,i)=>id===profile.relations[key][i]),'人物关系数据无效');
    require(validBondGrowth(u),'羁绊成长数据无效');
    require(number(u.level,10)&&u.level>=1&&number(u.merit)&&(u.level===10||u.merit<meritNeeded(u.level)),'武将等级或功绩无效');
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
    for (const role of ['leader', 'advisor']) require(army.units.some(u => u.id === army[role])||army[role]===null&&(!army.units.some(u=>u.troops>0)||value.pendingAppointments?.some(p=>p.armyId===army.id)||strategic&&value.campaign?.battles?.some(r=>!r.settled&&r.armyIds.includes(army.id))));
    require(!Object.hasOwn(army,'deputy'),'副将职位已取消，请重新开始');
    for (const u of army.units) {
      validateUnit(u); require(!seen.has(u.id), '武将重复'); seen.add(u.id);
    }
  }
  if(scenario)require(value.armies.filter(a=>a.faction===playerFaction(value)).flatMap(a=>a.units).reduce((n,u)=>n+u.troops+u.wounded,0)<=scenario.ownTroopBudget,'我方兵力超过总预备兵');
  validatePendingAppointments(value,require);
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
    require(!b.mapId||Object.hasOwn(BATTLE_MAPS,b.mapId)&&BATTLE_MAPS[b.mapId].terrain===b.terrain,'战役地图无效');
    if(scenario)require((b.mapId||null)===(value.testScenario.customBattle.mapId||null),'战役地图与开局不一致');
    const battleLimit=scenario?.limit||(strategic?CAMPAIGN_TIME.stepsPerDay*CAMPAIGN_TIME.maxBattleDays:240);
    require(scenario ? b.maxTicks === scenario.limit : strategic ? b.maxTicks === battleLimit : b.maxTicks === undefined, '战斗时限无效');
    require(b.holdUntil===scenario?.holdUntil,'坚守目标无效');
    if(b.result?.reason==='坚守成功')require(b.holdUntil&&b.tick>=b.holdUntil&&b.result.winner===b.siege?.gate.side&&!b.sides[b.result.winner].retreat&&remainingUnits(b,b.result.winner).length>0&&b.siege.gate.hp>0,'坚守战果无效');
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
    if(b.reinforcementCouncil!==undefined)require([null,'pending','open'].includes(b.reinforcementCouncil)&&(!b.reinforcementCouncil||(strategic||scenario)&&b.deploymentLocked&&!b.result),'援军军议状态无效');
    for (const [key, ready] of Object.entries(b.commandReady)) require([...Object.keys(STRATAGEMS),'focus','reserve','retreat'].includes(key) && number(ready));
    if (b.lastCommand) require([...Object.keys(STRATAGEMS),'focus','reserve','retreat'].includes(b.lastCommand.key) && number(b.lastCommand.tick) && number(b.lastCommand.serial));
    require(!value.pending && !value.report && Array.isArray(b.context.attackingIds) && b.context.attackingIds.includes(b.context.attackerId) && b.context.attackingIds.every(id => armyIds.has(id)));
    require(text(b.id) && b.cityId === b.context.cityId && number(b.tick, battleLimit) && number(b.seed) && number(b.commandCooldown) && Array.isArray(b.sides) && b.sides.length === 2 && b.settled === false && (b.result === null || result(b.result)), '战斗数据无效');
    if(b.domesticOpening!==undefined){const p=b.domesticOpening;require(strategic&&b.siege&&p&&p.side===1-b.siege.attackerSide&&Number.isFinite(p.intent)&&p.intent>=0&&p.intent<=30&&Number.isFinite(p.shield)&&p.shield>=0&&p.shield<=.35&&typeof p.applied==='boolean'&&p.applied===b.deploymentLocked&&(p.intentId===null||number(p.intentId))&&(p.shieldId===null||number(p.shieldId)),'守城内政开场状态无效');}
    if(scenario)require(Array.isArray(b.battleEvents)&&b.battleEvents.length===scenario.events.length&&b.battleEvents.every((e,i)=>{
      const expected=scenario.events[i];return e&&Object.keys(e).length===5&&['kind','side','tick','duration'].every(key=>e[key]===expected[key])&&(b.tick<e.tick?e.triggeredAt===null:e.triggeredAt===e.tick);
    }),'定时事件配置或触发记录无效');
    else require(b.battleEvents===undefined,'定时事件仅用于自定义战役');
    require(!scenario||b.sides[0].units.reduce((n,u)=>n+u.initial,0)<=scenario.ownTroopBudget,'我方战场兵力超过总预备兵');
    const unitIds = new Set(), positions = new Set();
    const scheduledUnits=new Map((scenario?.reinforcements||[]).flatMap((a,index)=>a.team.map(entry=>[entry.id,{army:a,index,entry}])));
    for(const [index,side] of b.sides.entries())validateBattleAppointments(b,index,[...new Set([...b.context.attackingIds,...b.context.defenderIds])].map(id=>armyById(value,id)).filter(a=>a.faction===side.faction).flatMap(armyCommanders),require);
    b.sides.forEach((side, index) => {
      require(validPeachState(b,side)&&validReserveState(b,side),'桃园或蓄锐记录无效');
      require(side.stratagemUses&&typeof side.stratagemUses==='object'&&!Array.isArray(side.stratagemUses),'军略次数记录缺失');
      for(const [key,n] of Object.entries(side.stratagemUses))require(STRATAGEMS[key]?.maxUses&&Number.isInteger(n)&&n>0&&n<=STRATAGEMS[key].maxUses,'军略次数记录无效');
      require(number(side.blockadeUntil),'阻援期限无效');
      require(side.stratagemEffects&&typeof side.stratagemEffects==='object'&&!Array.isArray(side.stratagemEffects),'军略效果记录缺失');
      require(!side.blockadeUntil||side.stratagemEffects.blockadeUntil,'军略效果来源缺失');
      require(validStratagemEvents(b,index),'强军略事件或战法刷新来源无效');
      const last=(index===0?b:b.enemyCommand).lastCommand;
      if(last&&STRATAGEMS[last.key]){
        require((index===0?b:b.enemyCommand).commandReady[last.key]===last.tick+STRATAGEMS[last.key].cooldown,'军略冷却期限无效');
        if(isAreaStratagem(STRATAGEMS[last.key]))require(validStratagemPoint(last.target),'军略选区记录无效');
        // A later reinforcement may provide a stronger copy; validate the actual caster.
        const provider=commandProvidersAt(side,last.tick).find(c=>c.id===last.source?.id&&c.role===last.source?.role&&commanderStratagems(c).includes(last.key));
        const expected=provider&&stratagemProfile(last.key,provider,last.source?.bondStrength);
        require(expected&&last.source&&validBondStrength(last.source.bondStrength),'军略施放来源缺失');
        for(const key of Object.keys(expected))require(JSON.stringify(last.source[key])===JSON.stringify(expected[key]),'军略施放来源无效');
      }
      for(const [field,p] of Object.entries(side.stratagemEffects)){
        require(p&&STRATAGEMS[p.key]?.field===field&&[0,1].includes(p.sourceSide)&&number(p.castTick,b.tick)&&p.until===side[field],'军略效果来源无效');
        const eligible=commandProvidersAt(b.sides[p.sourceSide],p.castTick);
        const provider=eligible.find(c=>c.id===p.id&&c.role===p.role&&commanderStratagems(c).includes(p.key));
        require(!!provider,'军略提供者无效');require(validBondStrength(p.bondStrength),'军略羁绊快照无效');const expected=stratagemProfile(p.key,provider,p.bondStrength);
        for(const key of Object.keys(expected))require(JSON.stringify(p[key])===JSON.stringify(expected[key]),'军略强度数据无效');
        require(p.until===p.castTick+p.duration+1&&(STRATAGEMS[p.key].side===0?p.sourceSide:1-p.sourceSide)===index,'军略持续时间无效');
      }
      require(side&&((side.battleIntent===undefined&&!b.deploymentLocked)||Object.hasOwn(BATTLE_INTENTS,side.battleIntent)),'战斗意图无效');
      if(strategic)require(b.strategicRetreat===true&&(side.retreatDestination===null||!!mapNode(value,side.retreatDestination)),'撤离据点无效');
      require(side && faction(side.faction) && tactic(side.tactic) && typeof side.retreat === 'boolean' && number(side.focusUntil) && number(side.inspireUntil) && (side.focus === null || text(side.focus)) && Array.isArray(side.units) && side.units.length <= (strategic||scenario ? Object.keys(OFFICER_BY_ID).length : 30));
      require(isDeploying(b) || validFrontline(b,b.sides.indexOf(side)), '战场超出容量');

      for (const u of side.units) {
        validateUnit(u, true);
        require(scheduledUnits.get(u.id)?.index===u.reinforcementIndex,'援军军团来源缺失');
        if(u.reinforcementIndex!==undefined){
          const army=scenario?.reinforcements?.[u.reinforcementIndex],entry=army?.team.find(v=>v.id===u.id);
          require(number(u.reinforcementIndex)&&army&&entry&&army.side===u.side&&u.armyId==='a'+(u.reinforcementIndex+3)&&u.type===entry.type&&u.level===entry.level&&u.initial===entry.troops&&u.wave===scenario.waves.length+u.reinforcementIndex+1&&typeof u.arrivalConfirmed==='boolean'&&sameArrivalCondition(u.arrivalCondition,army.arrivalCondition),'援军军团或到达条件无效');
          require(army.arrivalCondition?(u.arrivalConfirmed?number(u.arrivalTick,b.tick)&&b.deploymentLocked&&arrivalConditionMet(b,army.arrivalCondition):u.arrivalTick===null):u.arrivalTick===army.tick,'援军到达时间或条件无效');
          require(u.arrivalConfirmed?u.arrivalTick<=b.tick:['reserve','withdrawn'].includes(u.status)&&u.hp===u.initial&&u.intent===0&&!u.participated&&(u.status==='withdrawn'||army.arrivalCondition||b.tick<=u.arrivalTick),'援军尚未抵达');
        }else{
        require(u.arrivalCondition===undefined,'援军到达条件来源缺失');
        require(u.arrivalTick === undefined && u.wave === undefined || (strategic && number(u.wave,Object.keys(OFFICER_BY_ID).length) && u.wave>0 && number(u.arrivalTick,b.tick)) || (scenario && number(u.wave,scenario.waves.length) && u.wave > 0 && u.arrivalTick === scenario.waves[u.wave-1].tick && (u.status === 'reserve' || u.arrivalTick <= b.tick)), '援军到达时间无效');
        }
        require(!unitIds.has(u.id) && u.side === index && typeof u.armyId === 'string' && (armyIds.has(u.armyId) || u.armyId === `city:${b.cityId}`)); unitIds.add(u.id);
        require(number(u.intent,COMBAT.intentCap),'战意数据无效');
        require(Number.isFinite(u.moveProgress)&&u.moveProgress>=0&&u.moveProgress<1,'移动进度无效');
        const ps=u.passiveState;
        require(ps&&Number.isSafeInteger(ps.moveCount)&&ps.moveCount>=0,'人物特性移动记录无效');
        require(ps&&typeof ps==='object'&&!Array.isArray(ps)&&number(ps.lastMoveTick,b.tick)&&number(ps.shots,100000)&&typeof ps.reserveEntered==='boolean'&&number(ps.entryUntil,b.tick+15)&&(ps.entryUntil===0||ps.reserveEntered)&&
          (ps.targetId===null||text(ps.targetId,40))&&(ps.shotType===null||Object.hasOwn(TROOPS,ps.shotType))&&Number.isFinite(u.attackCarry)&&u.attackCarry>=0&&u.attackCarry<1&&typeof u.participated==='boolean','被动技能状态无效');
        const sourceOfficer=armyById(value,u.armyId)?.units.find(v=>v.id===u.id);
        require(validBondGrowth(u),'战场羁绊成长数据无效');
        require(validBondEntry(b,u),'入场羁绊快照无效');
        if(sourceOfficer){require(u.treasureId===sourceOfficer.treasureId,'战场宝物与编制不一致');require(JSON.stringify(u.equipment)===JSON.stringify(sourceOfficer.equipment),'战场携带装备与编制不一致');require(JSON.stringify(u.bondGrowth)===JSON.stringify(sourceOfficer.bondGrowth),'战场羁绊与武将数据不一致');require(u.level===sourceOfficer.level&&u.merit===sourceOfficer.merit,'战场等级与武将数据不一致');require(JSON.stringify(u.tacticLearning)===JSON.stringify(sourceOfficer.tacticLearning),'战场战法学习与武将数据不一致');}
        require(u.contribution&&Object.keys(emptyContribution()).every(key=>number(u.contribution[key])),'战斗贡献数据无效');
        require(number(u.battleDamage)&&number(u.healed)&&number(u.battleDeserted||0,u.battleDamage)&&(strategic||!u.battleDeserted)&&u.battleDamage-u.healed===u.initial-u.hp&&u.healed<=Math.floor((u.battleDamage-(u.battleDeserted||0))*.35),'伤兵治疗数据无效');
        const skills=allLearnedTacticIds(u);
        for(const map of [u.skillReady,u.tacticCasts,u.tacticRestored,u.tacticCommandRestored,u.tacticUseBonus]) {
          require(map && typeof map==='object' && !Array.isArray(map),'战法冷却数据无效');
          for(const [key,n] of Object.entries(map))require(skills.includes(key)&&number(n),'战法冷却数据无效');
        }
        require(u.formType===null||allowedFormTypes(u).includes(u.formType)&&TROOPS[u.formType]?.category==='equipment','作战形态无效');require(number(u.formReadyTick),'形态准备时间无效');
        for(const id of skills){const s=TACTICS_BOOK[id];
          const commandRestored=tacticSlotTotal(u,'tacticCommandRestored',s),restored=tacticSlotTotal(u,'tacticRestored',s),bonus=tacticSlotTotal(u,'tacticUseBonus',s),casts=tacticSlotTotal(u,'tacticCasts',s);
          require(Number.isInteger(commandRestored)&&Number.isInteger(restored)&&Number.isInteger(bonus)&&Number.isInteger(casts)&&bonus<=1&&restored+commandRestored<=casts&&casts<=tacticUseLimit(u,s)+restored+commandRestored&&(!restored&&!bonus||canRestoreTactic(s)),'战法次数数据无效');
        }
        if(u.entryStatusesApplied!==undefined)require(typeof u.entryStatusesApplied==='boolean','首次入场标记无效');
        if(u.preparedDecoy!==undefined){const p=u.preparedDecoy;require(p&&Number.isFinite(p.threshold)&&p.threshold>0&&p.threshold<=1&&typeof p.used==='boolean'&&p.source&&typeof p.source==='object','预置疑兵无效');}
        require(u.statuses && typeof u.statuses==='object' && !Array.isArray(u.statuses),'状态数据无效');
        for(const [key,status] of Object.entries(u.statuses))validateTreasureStatus(b,u,key,status,require);
        for(const [key,status] of Object.entries(u.statuses).flatMap(([key,status])=>status.sources?status.sources.map(source=>[key,source]):[[key,status]])) {
          validateTreasureStatus(b,u,key,status,require);
          if(status?.sourceEvent!==undefined||key==='hunger')require(validBattleEventStatus(b,u,key,status),'定时事件状态来源无效');
          for(const field of ['sourceName','sourceSkillName','sourceNote'])if(status?.[field]!==undefined)require(text(status[field],100),'状态来源无效');
          if(status?.origins!==undefined)require(Array.isArray(status.origins)&&status.origins.length<=512&&status.origins.every(o=>o&&text(o.sourceSkillName,100)&&(o.sourceName===undefined||text(o.sourceName,100))),'叠层状态来源无效');
          require(Object.hasOwn(STATUS_DEFINITIONS,key) && status && number(status.until),'状态数据无效');
          if(['magicImmune','rapidAdvance','commandInvincible'].includes(key)||status.sourceCommand){
            const strategy=STRATAGEMS[status.sourceCommand],provider=b.sides.flatMap(s=>commandProvidersAt(s,status.castTick)).find(c=>c.id===status.sourceId&&commanderStratagems(c).includes(status.sourceCommand)),p=provider&&stratagemProfile(status.sourceCommand,provider);
            const specialProtection=!!strategy?.disciplineDuration,postControl=key==='resolve'&&strategy?.effect==='stun';
            const duration=specialProtection&&p?commandProtectionDuration(status.protectionDiscipline,p.power):key==='resolve'?(postControl?p?.duration+3:p?.resolve):p?.duration;
            const validDuration=(!specialProtection||Number.isFinite(status.protectionDiscipline)&&status.protectionDiscipline>=0&&status.protectionDiscipline<=100000)&&status.duration===(postControl?p?.duration:duration);
            const expectedKey={magicImmunity:'magicImmune',rapidAdvance:'rapidAdvance',invincible:'commandInvincible',ambush:'stealth',cleanse:'resolve',stun:'stun'}[strategy?.effect];
            require(provider&&b.sides[strategy.side===0?u.side:1-u.side].units.some(v=>v.id===provider.id)&&expectedKey&&(key===expectedKey||postControl)&&status.sourceSkillName===strategy.name&&Number.isInteger(status.castTick)&&status.castTick>=0&&status.castTick<=b.tick&&validDuration&&status.until===status.castTick+duration+1,'军略状态来源或时长无效');
          }
          if(['peachFury','peachInvincible'].includes(key))require(validPeachStatus(b,u,key,status),'桃园强化来源或时长无效');
          if(key==='guardInvincible')require(validEscortStatus(b,u,key,status),'护卫免伤来源或时长无效');
          if(key==='swiftRush')require(validSwiftStatus(b,u,status),'疾驰突进来源、档位或时长无效');
          if(key==='heavyAttack')require(validBondEquipmentStatus(b,u,key,status),'重击次数或来源无效');
          if(key==='attackOrb')require(ATTACK_ORBS[status.skillId]&&(status.bondSource?validBondEquipmentStatus(b,u,key,status):skills.includes(status.skillId))&&Number.isInteger(status.charges)&&status.charges>=1&&status.charges<=ATTACK_ORBS[status.skillId].charges&&status.until===(b.maxTicks||240)+1&&text(status.sourceSkillName,100)&&status.sourceId===u.id,'强化普攻次数或来源无效');
          if(status.potency!==undefined)require(Number.isFinite(status.potency)&&status.potency>=POWER_RULES.minFactor*(['valor','camp'].includes(key)?.4:1)&&status.potency<=POWER_RULES.maxFactor,'战法威力快照无效');
          if(key==='decoy')require(number(status.hp,Math.round(u.initial*STATUS_DEFINITIONS.decoy.hpFraction))&&status.hp>0&&number(status.x,13)&&number(status.y,7),'疑兵耐久或位置无效');
          if(status.amount!==undefined)require(number(status.amount,1000000),'状态数值无效');
          if(status.fraction!==undefined)require(Number.isFinite(status.fraction)&&status.fraction>=0&&status.fraction<=.8,'状态比例无效');
          if(key==='guard')require(b.sides[u.side].units.some(v=>v.id===status.sourceId&&v!==u),'护卫来源无效');
          if(key==='link')require(text(status.group,100),'连环分组无效');
          if(key==='riposte')require(number(status.lastTick,b.tick),'反击步数无效');
          if(['plague','regrowth'].includes(key))require(number(status.amount,1000000)&&text(status.sourceId,40),'持续效果无效');
          if(key==='taunt')require(text(status.sourceId,40),'嘲讽来源无效');
          if(key==='pursuit')require(combatFamily(u)==='cavalry'&&text(status.targetId,40),'追击目标无效');
          if(key==='ward')require(number(status.percent,80));
          if(key==='shield') {
            require(number(status.amount,u.maxHp));
            require(Array.isArray(status.layers)&&status.layers.length>0&&status.layers.length<=60&&status.layers.every(l=>l&&number(l.amount,u.maxHp)&&l.amount>0&&number(l.until)&&text(l.source)&&text(l.label)), '护盾层无效');require(new Set(status.layers.map(l=>l.source)).size===status.layers.length,'护盾来源重复');require(status.amount===status.layers.reduce((n,l)=>n+l.amount,0)&&status.until===Math.max(...status.layers.map(l=>l.until)),'护盾汇总无效');
            require(validEscortStatus(b,u,key,status),'护卫护盾来源或比例无效');
            for(const layer of status.layers.filter(l=>l.sourceTreasure||l.source.startsWith('treasure:'))){const d=treasureDesign(layer.sourceTreasure),e=u.treasureEntry;require(d?.status==='shield'&&e?.id===layer.sourceTreasure&&layer.source==='treasure:'+e.id&&layer.sourceId===u.id&&layer.until===e.until&&layer.amount<=e.amount&&layer.label===d.name+' · 护盾'&&layer.bondGuardTier===undefined&&layer.sourceCommand===undefined,'宝物护盾来源或额度无效');}
            for(const layer of status.layers.filter(l=>l.sourceCommand||l.source.startsWith('command:'))){
              const design=STRATAGEMS[layer.sourceCommand],provider=commandProvidersAt(side,layer.castTick).find(c=>c.id===layer.sourceId&&commanderStratagems(c).includes(layer.sourceCommand)),p=provider&&stratagemProfile(layer.sourceCommand,provider);
              require(design?.effect==='shield'&&p&&layer.source==='command:'+layer.sourceCommand&&layer.label===design.name&&Number.isInteger(layer.castTick)&&layer.castTick>=0&&layer.castTick<=b.tick&&layer.until===layer.castTick+p.duration+1&&layer.amount<=Math.round(u.maxHp*p.strength),'军略护盾来源或比例无效');
            }
          }
          if(key==='burn'||key==='burn')require(number(status.amount,1000000) && typeof status.sourceId==='string');
          if(key==='burningAttack')require(['martialPower','strategyPower'].includes(status.powerStat)&&[6/280+.03,6/280+.04].includes(status.rate),'燃击威力无效');
          if(key==='burn')require(number(status.baseAmount,1000000)&&Number.isInteger(status.stacks)&&status.stacks>=1&&status.stacks<=3&&status.amount===status.baseAmount*status.stacks,'燃烧层数无效');
        }
        require(validBondState(u,b.tick),'羁绊触发记录无效');
        require(validTraitState(u,b.tick),'人物特性触发记录无效');
        require(u.retreatDispatched===undefined||typeof u.retreatDispatched==='boolean'&&u.status==='withdrawn','撤离交接状态无效');
        require(u.disengage===null||u.disengage&&Number.isSafeInteger(u.disengage.readyTick)&&u.disengage.readyTick>=0&&u.disengage.readyTick<=b.tick+1&&(u.disengage.targetId===null||battleBuildings(b).some(a=>a.side!==u.side&&a.id===u.disengage.targetId)||b.sides[1-u.side].units.some(e=>e.id===u.disengage.targetId))&&Array.isArray(u.disengage.guards)&&u.disengage.guards.every(id=>b.sides[1-u.side].units.some(e=>e.id===id)),'脱战状态无效');
        require(validRetreatAt(u.retreatAt)&&typeof u.withdrawing==='boolean'&&(!u.withdrawing||!isDeploying(b)&&u.status!=='reserve'&&u.retreatAt!==null),'部队撤离状态无效');
        require(['active', 'reserve', 'defeated', 'withdrawn'].includes(u.status) && number(u.hp) && number(u.initial,troopCapacity(u)) && u.initial > 0 && u.hp <= u.initial && u.maxHp === u.initial && number(u.morale, 100) && Number.isFinite(u.cooldown)&&u.cooldown>=0&&u.cooldown<=Number.MAX_SAFE_INTEGER && number(u.intent,COMBAT.intentCap) && text(u.action), '部队状态无效');
        require(typeof u.intentRoutApplied==='boolean'&&(!u.intentRoutApplied||u.status==='defeated'&&u.hp===0),'溃败战意记录无效');
        require(u.skillCasts === undefined || number(u.skillCasts), '战法次数无效');
        require(number(u.tacticRecoveryUntil,b.tick+TACTIC_RECOVERY_STEPS), '战法调息数据无效');
        require(u.cast===null,'不支持旧版待施放状态，请重新开始');
        require(!Object.hasOwn(u,'deputyBonus'),'副将加成已取消，请重新开始');
        for (const key of ['commandBonus', 'advisorBonus']) require(u[key] === undefined || Number.isFinite(u[key]) && u[key] >= 0 && u[key] <= 1);
        if (u.status === 'active') { require(number(u.x, 13) && number(u.y, 7) && canOccupy(b,u,u.x,u.y) && u.hp > 0 && !positions.has(`${u.x},${u.y}`), '战场位置无效'); positions.add(`${u.x},${u.y}`); }
      }
    });
    for(const [i,army]of (scenario?.reinforcements||[]).entries()){
      const units=b.sides[army.side].units.filter(u=>u.reinforcementIndex===i),first=units[0];
      require(units.length===army.team.length&&units.every(u=>u.arrivalConfirmed===first.arrivalConfirmed&&u.arrivalTick===first.arrivalTick),'援军到达记录不一致');
    }
    require(Array.isArray(b.stratagemZones)&&b.stratagemZones.length<=2,'军略区域记录缺失或过量');
    const zoneKeys=new Set();
    for(const zone of b.stratagemZones){
      const s=STRATAGEMS[zone?.key];
      require(s?.zone&&[0,1].includes(zone.side)&&validStratagemPoint(zone.point)&&number(zone.castTick,b.tick),'军略区域数据无效');
      const identity=zone.side+':'+zone.key;require(!zoneKeys.has(identity),'军略区域重复');zoneKeys.add(identity);
      const own=b.sides[zone.side],provider=commandProvidersAt(own,zone.castTick).find(c=>c.id===zone.source?.id&&c.role===zone.source?.role&&commanderStratagems(c).includes(zone.key));
      const expected=provider&&stratagemProfile(zone.key,provider,zone.source?.bondStrength);
      require(expected&&own.stratagemUses[zone.key]===1&&zone.until===zone.castTick+expected.duration+1&&zone.until>b.tick,'军略区域来源或时效无效');
      for(const k of Object.keys(expected))require(JSON.stringify(zone.source[k])===JSON.stringify(expected[k]),'军略区域来源无效');
    }
    require(Array.isArray(b.buildings)&&b.buildings.length<=111,'建筑列表无效');
    const buildingCells=new Set();
    for(const a of battleBuildings(b)){
      if(a.source)require(strategic&&text(a.source.cityId,80)&&text(a.source.siteId,80)&&text(a.source.key,30)&&number(a.initialHp,a.maxHp),'建筑地点来源无效');
      require(a&&text(a.id,40)&&!unitIds.has(a.id)&&text(a.name,20)&&[0,1].includes(a.side)&&number(a.x,13)&&number(a.y,7)&&number(a.maxHp)&&a.maxHp>0&&number(a.hp,a.maxHp),'建筑数据无效');
      if(a!==b.siege?.gate)require(a.type==='building'&&text(a.kind,40)&&a.kind.trim().length>0,'建筑分类无效');
      require(validBuildingCombatState(b,a),'战场建筑等级或行动记录无效');
      if(a.lastDamagedTick!==undefined)require(number(a.lastDamagedTick,b.tick),'建筑受击时间无效');
      const key=a.x+':'+a.y;require(!buildingCells.has(key),'建筑位置重复');buildingCells.add(key);unitIds.add(a.id);
    }
    require(Array.isArray(b.logs) && b.logs.length <= BATTLE_LOG_LIMIT && b.logs.every(l => l && number(l.tick,b.tick) && typeof l.text === 'string' && l.text.length < 1000&&(l.kind===undefined||Object.hasOwn(BATTLE_LOG_KINDS,l.kind))&&(l.side===undefined||[0,1].includes(l.side))));
    for(const side of [0,1])require(validBondRout(b,side),'破军击溃记录无效');
    for(const u of b.sides.flatMap(s=>s.units))require(u.passiveState.targetId===null||unitIds.has(u.passiveState.targetId),'普攻连续目标无效');
    validTreasureBattle(b,require);
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
      if(e.journaled!==undefined)require(typeof e.journaled==='boolean','战斗日志标记无效');
      if(e.abilityKind!==undefined||e.traitId!==undefined){const source=b.sides.flatMap(s=>s.units).find(u=>u.id===e.from);require(e.abilityKind==='trait'&&(e.ongoing===true||e.skill===false&&mechanicEntries(source).some(t=>t.id===e.traitId&&t.rule.effect==='areaBasic'))&&mechanicEntries(source).some(t=>t.id===e.traitId&&t.name===e.label),'特性发动来源无效');}
      if(e.traitEffective!==undefined)require(e.abilityKind==='trait'&&typeof e.traitEffective==='boolean','特性发动结果无效');
      if(e.commandRestored!==undefined)require(e.abilityKind==='trait'&&number(e.commandRestored,COMMAND_RESOURCE.capacity),'特性军略恢复记录无效');
      if(e.sharedTargets!==undefined||e.damageShare!==undefined)require(!e.skill&&Number.isInteger(e.sharedTargets)&&e.sharedTargets>=2&&e.sharedTargets<=6&&e.damageShare===1/e.sharedTargets,'普攻分摊记录无效');
      if(e.castPower!==undefined)require(Number.isFinite(e.castPower)&&e.castPower>=0&&e.castPower<=100000,'战法威力记录无效');
      if(e.bondCritical!==undefined)require(e.bondCritical==='bondFinisher'&&!e.skill&&!e.ongoing&&e.critical===true&&e.critChance===1&&b.sides.flatMap(s=>s.units).some(u=>u.id===e.from&&(u.bondGrowth.levels.bondFinisher||0)>0),'锐锋暴击来源无效');
      else if(e.critical!==undefined||e.critChance!==undefined)require(typeof e.critical==='boolean'&&Number.isFinite(e.critChance)&&e.critChance>=.05&&e.critChance<=.3&&e.skill&&!e.ongoing,'暴击判定无效');
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
    for (const e of b.effects) if (e.phase !== undefined) require(['cast', 'impact'].includes(e.phase) && ['charge', 'fire', 'shockwave', 'banner', 'volley', 'slash'].includes(e.visual) && (Object.hasOwn(TROOPS, e.troop)||e.troop==='building'&&b.buildings.some(a=>a.id===e.from&&a.side===e.side&&combatBuildingRule(a))) && [0, 1].includes(e.side) && text(e.name) && text(e.label) && number(e.fromX, 13) && number(e.fromY, 7), '战法表现事件无效');
  }
  if (value.report !== null) {
    const r = value.report;
    require(validArmyAppointmentChanges(r.appointments,value.armies),'战后任命记录无效');
    if(r?.reason==='坚守成功')require(scenario?.holdUntil&&r.tick>=scenario.holdUntil&&r.winner===(scenario.defending?0:1)&&r.gate?.side===r.winner&&r.gate.remaining>0&&r.stats?.[r.winner]?.remaining>0,'坚守战报无效');
    require(result(r) && text(r.id) && initial.cities.some(c => c.name === r.city) && faction(r.owner) && typeof r.captured === 'boolean' && number(r.tick, scenario?.limit || 240) && number(r.reward) && Array.isArray(r.stats) && r.stats.length === 2, '战报数据无效');
    if (scenario?.gateHp) require(r.gate && r.gate.initial === scenario.gateHp && number(r.gate.remaining,r.gate.initial) && r.gate.side === (scenario.defending||scenario.id==='defense'?0:1), '城门战报无效');
    else require(r.gate === undefined && r.reason !== '城门失守', '城门战报无效');
    for (const s of r.stats) { require(s && faction(s.faction)); for (const key of ['initial', 'remaining', 'wounded', 'killed']) require(number(s[key])); require(s.initial === s.remaining + s.wounded + s.killed); }
    require(Array.isArray(r.growth)&&r.growth.length<=(scenario?60:15)&&new Set(r.growth.map(g=>g?.id)).size===r.growth.length&&r.growth.every(g=>validMeritGrowth(g)&&Object.hasOwn(OFFICER_BY_ID,g.id)&&text(g.name,20)&&[0,1].includes(g.side)&&number(g.before,10)&&g.before>=1&&number(g.after,10)&&g.after>=1&&Number.isSafeInteger(g.gained)&&g.contribution&&Object.keys(emptyContribution()).every(key=>number(g.contribution[key]))&&number(g.score)&&number(g.award)&&Array.isArray(g.unlocked)&&g.unlocked.length<=100&&g.unlocked.every(s=>text(s,20))),'成长战报无效');
  }
  return value;
}


function damageUnit(...args){return peachBatch(args[0],()=>damageUnitInner(...args));}

function basicAttack(...args){return peachBatch(args[0],()=>basicAttackInner(...args));}

function finishTactic(...args){return peachBatch(args[0],()=>finishTacticInner(...args));}

function tickStatuses(...args){return peachBatch(args[0],()=>tickStatusesInner(...args));}

const peachDepth=new WeakMap();
function peachBatch(b,run){const depth=peachDepth.get(b)||0;peachDepth.set(b,depth+1);try{return run();}finally{peachDepth.set(b,depth);if(!depth){for(const [u,layer]of pendingGuardBreaks.get(b)||[])settleEscortBreak(b,u,layer,bondComboApi(b));pendingGuardBreaks.delete(b);settlePeach(b,{status:(u,key,steps)=>setStatus(b,u,key,steps,{sourceId:u.id,sourceName:u.name,sourceSkillName:'桃园',castTick:b.tick}),signal:(u,text)=>combatEffect(b,u,u,false,0,'impact',{name:'桃园',visual:'banner'},{ongoing:true,text})});settleIntentRouts(b);}}}
const pendingIntentRouts=new WeakMap();
function settleIntentRouts(b){
 const fallen=[...(pendingIntentRouts.get(b)||[])].filter(u=>u.status==='defeated'&&u.hp===0&&!u.intentRoutApplied).sort((a,c)=>a.id.localeCompare(c.id));
 pendingIntentRouts.delete(b);
 // Settle after all damage in this batch, so an early death cannot change
 // Valor protection for the remaining segments of the same attack or tactic.
 for(const u of fallen){
  u.intentRoutApplied=true;
  for(const ally of activeUnits(b,u.side)){
   const loss=INTENT_STATE.defeatLoss+(distance(u,ally)<=INTENT_STATE.defeatRadius?INTENT_STATE.nearbyDefeatLoss:0),before=ally.intent;
   ally.intent=Math.max(0,before-loss);
   if(ally.intent<before)combatEffect(b,u,ally,false,0,'impact',{name:'友军溃败',visual:'banner'},{ongoing:true,text:u.name+'溃败 · 战意 −'+(before-ally.intent),intentDrained:before-ally.intent});
  }
 }
}
const pendingGuardBreaks=new WeakMap();
const battleInvincible=(b,u)=>peachInvincible(b,u)||hasStatus(b,u,'guardInvincible')||hasStatus(b,u,'commandInvincible');
function absorbBattleShield(b,u,amount){const before=(u.statuses?.shield?.layers||[]).filter(l=>l.until>b.tick).map(l=>({...l}));const remaining=absorbShield(b,u,amount,layer=>{if(layer.bondGuardTier===3){if(!pendingGuardBreaks.has(b))pendingGuardBreaks.set(b,new Map());pendingGuardBreaks.get(b).set(u,layer);}});for(const layer of before){const now=u.statuses?.shield?.layers.find(l=>l.source===layer.source)?.amount||0,used=layer.amount-now,source=b.sides[u.side].units.find(v=>v.id===(layer.sourceId||layer.source.split(':')[0]));if(used>0&&source&&source!==u&&!u.isDecoy){recordContribution(source,'protection',used);source.participated=true;}}return remaining;}
function bondComboApi(b){return {random,attributes:u=>unitAttributes(u,b),control:(u,steps,key,source)=>applyControl(b,u,steps,key,source),drain:(u,n,source)=>lowerIntent(u,n,source,b),intent:(u,n)=>{const before=u.intent;gainIntent(u,n);return u.intent-before;},signal:(source,target,name,extra={})=>combatEffect(b,source,target,false,0,'impact',{name,visual:'banner'},{ongoing:true,text:name,...extra})};}
function applyPeachDamage(b,attacker,target,amount,kind={secondary:true}){
 if(amount<=0||battleInvincible(b,target))return {damage:0,absorbed:0,shared:false};
 if(!kind.valorChecked&&blockValorDamage(b,attacker,target))return {damage:0,absorbed:0,shared:false};
 const recipients=attacker&&attacker.side!==target.side?peachRecipients(b,target):[];
 const eligible=recipients.filter(u=>!battleInvincible(b,u)&&!hasStatus(b,u,'stasis')&&!commandBlocksDamage(b,u,kind)&&(u===target||!blockValorDamage(b,attacker,u)));
 if(eligible.length<2){const after=absorbBattleShield(b,target,amount);return {damage:takeCasualties(b,target,after,attacker),absorbed:amount-after,shared:false};}
 const shares=splitPeachDamage(amount,eligible,u=>u.hp+shieldAmount(b,u));let result={damage:0,absorbed:0,shared:true};
 for(const [u,share]of shares){if(!share)continue;const after=absorbBattleShield(b,u,share),damage=takeCasualties(b,u,after,attacker),absorbed=share-after;u.participated=true;if(damage>0){breakStealth(b,u,'桃园分担');triggerPreparedDecoy(b,u);}if(u.hp<=0){u.status='defeated';u.cast=null;u.action='溃败';}if(u===target)result={damage,absorbed,shared:true};else combatEffect(b,attacker,u,true,damage,'impact',{name:'桃园分担'},{ongoing:true,text:'桃园分担',shieldAbsorbed:absorbed});}
 return result;
}
