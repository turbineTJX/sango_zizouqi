// Experiment protocol, not game rules. Changes require a new frozen session.
const freeze = x => { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
export const PROTOCOL = freeze({
  version: 2, domain: 'battle', budgetHours: 8, maximumCandidates: 3,
  developmentSeeds: [6103019, 6103043], independentSeeds: 8, alpha: 0.05 / 3,
  // Mixed controllers share one frozen engine. This version supports only
  // the battle-ai module; command conditions/order must remain unchanged.
  editableFiles: ['battle-ai.mjs'], objectives: ['missionRate', 'remainingMargin'],
  guards: { overallMissionLoss: 0.03, caseMissionLoss: 0.125, caseMarginLoss: 0.10,
    repeatedSeedFraction: 0.75 },
  acceptance: { advantageMarginGain: 0.02, advantageMissionLoss: 0.05,
    playerBaselineMarginLift: 0.05, playerBaselineMissionLift: 0.125,
    playerRetainedLiftFraction: 0.5, playerMinimumWinningSeeds: 2 },
  requiredTests: [
    'tests/battle-ai.test.mjs', 'tests/deployment-order.test.mjs', 'tests/battle-spatial-ai.test.mjs',
    'tests/ai-bond-blind.test.mjs', 'tests/battle-council.test.mjs', 'tests/stratagem-ai.test.mjs',
    'tests/opening-formations.test.mjs', 'tests/support-synergy.test.mjs', 'tests/battle-decisions.test.mjs',
    'tests/reinforcements.test.mjs', 'tests/battle-retreat.test.mjs',
  ],
  integrationTests: ['tests/all-ai-campaign.test.mjs', 'tests/strategic-planning.test.mjs', 'tests/precombat-assessment.test.mjs'],
});
export const allowedBattlePath = path => PROTOCOL.editableFiles.includes(path);

const r = (id, roster, mapId, category = 'field', layout = 'core', level = 10) => ({ id, roster, mapId, category, layout, level });
export const CASES = freeze({
  development: [r('wu-open', 'wu', 'plain-open'), r('guan-open', 'guan', 'plain-open'),
    r('wei-open', 'wei', 'plain-open', 'field', 'equal'), r('reserve-open', 'reserves', 'plain-open'),
    r('regression-guan-gate','guan','hill-pass','gate','equal'),r('regression-wu-siege','wu','xiapi','siege','equal')],
  validation: [r('wu-ridges', 'wu', 'plain-ridges'), r('guan-forest', 'guan', 'forest-belt'),
    r('wei-crossroads', 'wei', 'plain-crossroads'), r('wu-siege', 'wu', 'xiapi', 'siege', 'equal'),
    r('guan-gate', 'guan', 'hill-pass', 'gate', 'equal'), r('wu-port', 'wu', 'river-harbor', 'port'),
    r('wei-naval', 'wei', 'river-crossing', 'naval', 'equal'), r('reserve-hill', 'reserves', 'hill-plateau'),
    r('ordinary-low', 'ordinary', 'marsh-flats', 'field', 'equal', 5),
    r('cavalry-guard', 'cavalry', 'plain-open', 'field', 'equal')],
});

// Calibrations change an explicit input, never grant resources mid-battle.
// Player plans are fixed legal opening arrangements, not a search controller.
export const CHECK_CASES = freeze({
  development: [
    {...r('advantage-open','wei','plain-open','field','equal'),kind:'advantage'},
    {...r('player-mixed-open','mixed-guan','plain-open'),kind:'player',slots:[0,5,3]},
    {...r('player-mixed-zhou-open','mixed-zhou','plain-open'),kind:'player',slots:[0,2,1]},
    {...r('player-ordinary-open','ordinary-tiger','plain-open'),kind:'player',slots:[0,4,1]},
    {...r('challenge-spread','guan','plain-open'),kind:'challenge',opponent:'spread'},
  ],
  validation: [
    {...r('advantage-ridges','wei','plain-ridges','field','equal'),kind:'advantage'},
    {...r('advantage-crossroads','guan','plain-crossroads','field','equal'),kind:'advantage'},
    {...r('player-mixed-ridges','mixed-guan','plain-ridges'),kind:'player',slots:[0,5,3]},
    {...r('player-mixed-crossroads','mixed-guan','plain-crossroads'),kind:'player',slots:[0,5,3]},
    {...r('player-zhou-ridges','mixed-zhou','plain-ridges'),kind:'player',slots:[0,2,1]},
    {...r('player-zhou-crossroads','mixed-zhou','plain-crossroads'),kind:'player',slots:[0,2,1]},
    {...r('player-ordinary-ridges','ordinary-tiger','plain-ridges'),kind:'player',slots:[0,4,1]},
    {...r('player-ordinary-crossroads','ordinary-tiger','plain-crossroads'),kind:'player',slots:[0,4,1]},
    {...r('challenge-spread-forest','guan','forest-belt'),kind:'challenge',opponent:'spread'},
    {...r('challenge-spread-hill','wu','hill-plateau'),kind:'challenge',opponent:'spread'},
  ],
});
export const casesFor = group => [...CASES[group], ...CHECK_CASES[group]];
export const variantsFor = spec => spec.kind==='player'?['default','arranged']:spec.kind==='advantage'?['normal','more-troops']:['normal'];

const ROSTERS = freeze({
  wu: [['周瑜','archer'],['小乔','archer'],['大乔','archer'],['程普','spear'],['韩当','halberd'],['黄盖','archer']],
  guan: [['关羽','spear'],['小乔','archer'],['甄氏','archer'],['廖化','spear'],['周仓','halberd'],['严颜','archer']],
  wei: [['曹操','spear'],['荀彧','archer'],['甄氏','archer'],['许褚','spear'],['李典','halberd'],['郭嘉','archer']],
  reserves: [['关羽','spear'],['小乔','archer'],['甄氏','archer'],['廖化','spear'],['周仓','halberd'],['严颜','archer'],['邓芝','archer'],['满宠','halberd']],
  ordinary: [['廖化','spear'],['小乔','archer'],['大乔','archer'],['周仓','halberd'],['严颜','archer'],['邓芝','archer']],
  cavalry: [['张辽','cavalry'],['曹操','cavalry'],['许褚','spear'],['夏侯惇','spear'],['乐进','halberd'],['郭嘉','archer']],
  'mixed-guan': [['关羽','spear'],['廖化','spear'],['周仓','halberd'],['乐进','spear'],['关平','spear'],['满宠','halberd']],
  'mixed-zhou': [['周瑜','archer'],['黄盖','archer'],['曹洪','spear'],['陈群','spear'],['徐邈','archer'],['邓芝','archer']],
  'ordinary-tiger': [['纪灵','halberd'],['乐进','spear'],['关平','spear'],['臧霸','cavalry'],['凌操','halberd'],['曹休','archer']],
});
const ENEMY = [['袁绍','spear'],['颜良','cavalry'],['文丑','halberd'],['张郃','cavalry'],['沮授','archer'],['田丰','archer'],['高览','spear'],['审配','archer']];
export function battleDraft(spec, seed, officers, maps, variant='normal') {
  const byName = new Map(Object.values(officers).map(o => [o.name, o]));
  const own = ROSTERS[spec.roster]; if (!own) throw Error('Unknown roster');
  const terrain=maps?.[spec.mapId]?.terrain;if(!terrain)throw Error('Unknown map: '+spec.mapId);
  const water = terrain==='river';
  const amounts = spec.roster==='mixed-zhou'?[5000,3000,4000,1000,1000,4000]:spec.roster==='ordinary-tiger'?[5000,3000,3000,3000,3000,1000]:own.length === 8 ? [4000,1000,1000,3000,3000,2000,2000,2000] : [5000,1000,1000,4000,4000,3000];
  const team = (entries, core) => entries.map(([name,type], i) => {
    const person = byName.get(name); if (!person) throw Error('Unknown officer: ' + name);
    return { id: person.id, type, troops: spec.layout === 'core' && core ? amounts[i] : 3000,
      level: spec.level, retreatAt: null, ...(water ? { equipment: { siege: null, ship: 'ship' } } : {}) };
  });
  const stars=[['曹操','spear'],['赵云','cavalry'],['张飞','spear'],['诸葛亮','archer'],['陆逊','archer'],['孙策','cavalry']];
  const ownTeam = team(own, true), enemyTeam = team(spec.kind==='player'?stars:ENEMY.slice(0, own.length), false);
  // Equal total numbers even when the eight-unit core allocation is used.
  const ownTotal = ownTeam.reduce((s,u)=>s+u.troops,0);
  enemyTeam.forEach((u,i)=>{u.troops=Math.floor(ownTotal/enemyTeam.length)+(i<ownTotal%enemyTeam.length?1:0);});
  if(variant==='more-troops')ownTeam.forEach(u=>u.troops=Math.floor(u.troops*1.5));
  return { seed, mapId: spec.mapId, terrain, battleKind: spec.category === 'siege' ? 'siege' : 'field',
    limit: 480, shieldPercent: 0, gateHp: 18000, events: [], ownTeam, enemyTeam };
}
