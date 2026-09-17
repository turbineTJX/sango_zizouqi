import {officerProfile} from './officer-catalog.mjs';
import { newGame, makeOfficer, startBattle } from './engine.mjs';
import { recommendedTacticIds, setStatus } from './tactics.mjs';

import { SCENARIOS } from './scenario-catalog.mjs';
export { SCENARIOS } from './scenario-catalog.mjs';

export function createScenario(id, seed, shieldPercent = 20, officerIds = null) {
  const config = SCENARIOS.find(s => s.id === id);
  if (!config) throw new Error('未知测试战役');
  seed ??= config.seed;
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('种子须为 0～4294967295 的整数');
  if (!Number.isInteger(shieldPercent) || shieldPercent < 0 || shieldPercent > 100) throw new Error('护盾比例须为 0～100 的整数');
  if(officerIds!==null&&(id!=='officer-lab'||!Array.isArray(officerIds)||officerIds.length<1||officerIds.length>6||new Set(officerIds).size!==officerIds.length))throw new Error('试炼阵容须为 1～6 名不同武将');
  const state = newGame(seed);
  state.testScenario = { id, seed, shieldPercent };
  const own = state.armies[0], enemy = state.armies[1];
  const ids = officerIds || config.officers || (config.id==='outnumbered'?['cao','liao','jia','yu']:['cao', 'liao', 'chu', 'jia', 'dun', 'yu', 'yuanxia', 'jin']);
  own.units = ids.slice(0, config.own).map((id, i) => ({ ...makeOfficer(id, config.ownTroops, i), level: config.level }));
  own.leader = ['rotation','defense'].includes(id)?'jin':'cao';
  own.advisor = ['rotation','defense','outnumbered'].includes(id)?'yu':'jia'; own.deputy = ids.includes('liao')?'liao':ids[1];
  if(id==='officer-lab'){
    own.leader=own.units[0].id;own.advisor=[...own.units].sort((a,b)=>b.intellect-a.intellect)[0].id;
    own.deputy=[...own.units].filter(u=>u.id!==own.leader).sort((a,b)=>b.force-a.force)[0]?.id||null;
    state.testScenario.officerIds=own.units.map(u=>u.id);
  }
  for(const u of own.units)u.tactics=recommendedTacticIds(u);
  enemy.units = Array.from({ length: config.enemy }, (_, i) => {
    const u = i < 6 ? makeOfficer(['shao', 'yan', 'wen', 'he', 'ju', 'tian'][i], config.enemyTroops, i) : {
      ...makeOfficer('gao', config.enemyTroops, i), id: `test-${i}`, name: `援军${i - 5}队`, courtesy: '援军', skill: '协同作战', trait: '列阵赴援',
      leadership: 68, force: 68, intellect: 65, politics: 65,
      type: ['spear', 'archer', 'cavalry', 'crossbow'][i % 4],
    };
    if(id==='officer-lab')Object.assign(u,{id:'test-'+i,name:'试炼敌军'+(i+1),courtesy:'陪练',skill:'协同作战',trait:'试炼守军'});
    Object.assign(u,officerProfile(u.id));
    u.level = config.enemyLevel;
    u.formation = ['archer', 'crossbow'].includes(u.type) ? 'back' : 'front';
    u.tactics = recommendedTacticIds(u);
    return u;
  });
  enemy.leader = enemy.units[0].id; enemy.advisor = enemy.units[4]?.id||enemy.units[0].id; enemy.deputy = enemy.units[1]?.id||null;
  own.morale = enemy.morale = 80;
  const cityId = id === 'siege' ? 'ye' : id === 'defense' ? 'xuchang' : id === 'outnumbered' ? 'baima' : id === 'rotation' ? 'chenliu' : 'guandu';
  const city = state.cities.find(c => c.id === cityId);
  city.garrison = 0; city.owner = id === 'defense' ? 'cao' : 'yuan';
  own.location = enemy.location = cityId;
  state.pending = { cityId, attackerId: id === 'defense' ? enemy.id : own.id, defenderIds: [id === 'defense' ? own.id : enemy.id], origin: id === 'defense' ? 'guandu' : 'xuchang', defenderFaction: city.owner };
  startBattle(state);
  const b = state.battle;
  b.maxTicks = config.limit;
  let index = 6;
  config.waves.forEach((wave, i) => {
    for (const u of b.sides[1].units.slice(index, index + wave.count)) {
      u.wave = i + 1; u.arrivalTick = wave.tick;
    }
    index += wave.count;
  });
  if (config.gateHp) {
    const defenderSide = id === 'defense' ? 0 : 1;
    b.siege = { attackerSide: 1-defenderSide, gate: { id:'siege-gate', name:'城门', side:defenderSide, type:'gate', x:defenderSide===0?1:12, y:4, hp:config.gateHp, maxHp:config.gateHp } };
    // Put the independent gate in the rear without overlapping initial troops.
    const occupant = b.sides[defenderSide].units.find(u=>u.status==='active'&&u.x===b.siege.gate.x&&u.y===4);
    if (occupant) {
      const freeY = Array.from({length:8},(_,i)=>i).find(y=>y!==4&&!b.sides[defenderSide].units.some(u=>u.status==='active'&&u.x===occupant.x&&u.y===y));
      occupant.y = freeY;
    }
    for (const u of b.sides[defenderSide].units.filter(u=>u.status==='active')) {
      setStatus(b,u,'shield',config.limit,{amount:Math.round(u.initial*shieldPercent/100),source:'siege:opening',label:'守城首发护盾'});
    }
  }
  return state;
}
