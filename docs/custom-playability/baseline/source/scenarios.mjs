import {officerProfile,OFFICER_BY_ID} from './officer-catalog.mjs';
import {defaultCustomBattle,validateCustomBattle} from './custom-battle.mjs';
import { newGame, makeOfficer, startBattle, configureBattleTerrain } from './engine.mjs';
import { recommendedTacticIds, roleTacticIds, setStatus, configureTactics, validLoadout } from './tactics.mjs';

import { SCENARIOS } from './scenario-catalog.mjs';
export { SCENARIOS } from './scenario-catalog.mjs';

export function createScenario(id, seed, shieldPercent = 20, officerIds = null, customDraft = null) {
  let config = SCENARIOS.find(s => s.id === id);
  if (!config) throw new Error('未知测试战役');
  const custom=id==='custom-battle'?validateCustomBattle(customDraft??defaultCustomBattle()):null;
  if(custom){
    const advisor=team=>[...team].sort((a,b)=>OFFICER_BY_ID[b.id].intellect-OFFICER_BY_ID[a.id].intellect)[0].id;
    config={...config,...custom,own:custom.ownTeam.length,enemy:custom.enemyTeam.length,ownName:'自选我军',enemyName:'自选敌军',ownAdvisor:advisor(custom.ownTeam),enemyAdvisor:advisor(custom.enemyTeam)};
  }
  const defending = config.defending || id === 'defense';
  seed ??= config.seed;
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('种子须为 0～4294967295 的整数');
  if (!Number.isInteger(shieldPercent) || shieldPercent < 0 || shieldPercent > 100) throw new Error('护盾比例须为 0～100 的整数');
  if(officerIds!==null&&(id!=='officer-lab'||!Array.isArray(officerIds)||officerIds.length<1||officerIds.length>6||new Set(officerIds).size!==officerIds.length))throw new Error('试炼阵容须为 1～6 名不同武将');
  const state = newGame(seed);
  state.testScenario = { id, seed, shieldPercent };
  if(custom)state.testScenario.customBattle={...custom,seed};
  const own = state.armies[0], enemy = state.armies[1];
  const ids = officerIds || config.officers || (config.id==='outnumbered'?['cao','liao','jia','yu']:['cao', 'liao', 'chu', 'jia', 'dun', 'yu', 'yuanxia', 'jin']);
  own.units = config.ownTeam ? config.ownTeam.map((entry,i)=>makeOfficer(entry.id,entry.troops??config.ownTroops,i,entry.level??config.level)) : ids.slice(0, config.own).map((id, i) => makeOfficer(id, config.ownTroops, i, config.level));
  own.leader = ['rotation','defense'].includes(id)?'jin':'cao';
  own.advisor = ['rotation','defense','outnumbered'].includes(id)?'yu':'jia'; own.deputy = ids.includes('liao')?'liao':ids[1];
  if(id==='officer-lab'||id==='breach'){
    own.leader=own.units[0].id;own.advisor=[...own.units].sort((a,b)=>b.intellect-a.intellect)[0].id;
    own.deputy=[...own.units].filter(u=>u.id!==own.leader).sort((a,b)=>b.force-a.force)[0]?.id||null;
    if(id==='officer-lab')state.testScenario.officerIds=own.units.map(u=>u.id);
  }
  for(const u of own.units)u.tactics=recommendedTacticIds(u);
  enemy.units = config.enemyTeam ? config.enemyTeam.map((entry,i)=>makeOfficer(entry.id,entry.troops??config.enemyTroops,i,entry.level??config.enemyLevel)) : Array.from({ length: config.enemy }, (_, i) => {
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
  if(config.ownTeam){
    [own,enemy].forEach((army,side)=>{
      const entries=side?config.enemyTeam:config.ownTeam;
      army.name=side?config.enemyName:config.ownName;
      army.leader=entries[0].id; army.deputy=entries[1]?.id||null;
      army.advisor=side?config.enemyAdvisor:config.ownAdvisor;
      army.units.forEach((u,i)=>{
        u.type=entries[i].type;
        u.formation=entries[i].formation||(['spear','halberd'].includes(u.type)?'front':u.type==='cavalry'?'left':'back');
        const role=u.type==='logistics'||i===entries.findIndex(v=>v.type==='spear'||v.type==='halberd')?'guard':u.intellect>u.force+10?'control':'assault';
        const special=recommendedTacticIds(u).find(id=>id.startsWith('unique-'));
        let tactics=roleTacticIds(u,role);
        if(config.terrain==='forest'&&u.type==='archer')tactics=u.intellect>u.force?['wildfire','smoke','rally']:['fire','scatter','suppress'];
        u.tactics=entries[i].tactics||(special?[special,...tactics].slice(0,3):tactics);
        if(!validLoadout(u,u.tactics))throw new Error(`${u.name}的预设战法无效`);
      });
    });
  }
  if(id==='breach'){
    const loadouts=[['unique-person-433','doubt','ward'],['rush','gallop','valor'],['smoke','rally','fire']];
    own.units.forEach((u,i)=>{u.tactics=loadouts[i];u.type=['spear','cavalry','archer'][i];});
    enemy.units.forEach((u,i)=>{
      u.type=['spear','crossbow','archer'][i];u.formation=i?'back':'front';
      u.tactics=[['phalanx','ward','thrust'],['repeat','pierce','screen'],['fire','suppress','rally']][i];
    });
  }
  if(['eight-arms','river'].includes(id)){
    const types=id==='river'?['ship','ship','halberd','logistics','siege','spear']:['spear','cavalry','halberd','logistics','siege','archer'];
    for(const army of [own,enemy])army.units.forEach((u,i)=>{u.type=types[i];u.formation=['spear','halberd','cavalry'].includes(u.type)?'front':'back';u.tactics=roleTacticIds(u,['guard','assault','control','assault','control','control'][i]);});
  }
  own.morale = enemy.morale = 80;
  const cityId = id === 'siege' ? 'ye' : id === 'defense' ? 'xuchang' : id === 'outnumbered' ? 'baima' : id === 'rotation' ? 'chenliu' : 'guandu';
  const city = state.cities.find(c => c.id === cityId);
  city.garrison = 0; city.owner = defending ? 'cao' : 'yuan';
  own.location = enemy.location = cityId;
  state.pending = { cityId, attackerId: defending ? enemy.id : own.id, defenderIds: [defending ? own.id : enemy.id], origin: defending ? 'guandu' : 'xuchang', defenderFaction: city.owner };
  startBattle(state);
  const b = state.battle;
  if(config.terrain)configureBattleTerrain(b,config.terrain);
  // Authored encounter loadouts are public presets; generic enemies still use the planner.
  if(config.ownTeam)for(const [side,entries] of [[0,config.ownTeam],[1,config.enemyTeam]])for(const entry of entries){
    const u=b.sides[side].units.find(u=>u.id===entry.id);
    if(entry.tactics)configureTactics(u,entry.tactics);
    if(entry.position)[u.x,u.y]=entry.position;
  }
  b.maxTicks = config.limit;
  if(config.holdUntil)b.holdUntil=config.holdUntil;
  if(config.campaign)b.logs=[{tick:0,text:`${config.name}，${config.ownName}迎战${config.enemyName}。请布阵后开战。`}];
  if(id==='breach'){
    const positions=[[[4,3],[4,4],[3,2]],[[8,3],[10,2],[10,4]]];
    b.sides.forEach((s,side)=>s.units.forEach((u,i)=>{[u.x,u.y]=positions[side][i];}));
  }
  let index = 6;
  config.waves.forEach((wave, i) => {
    for (const u of b.sides[1].units.slice(index, index + wave.count)) {
      u.wave = i + 1; u.arrivalTick = wave.tick;
    }
    index += wave.count;
  });
  if (config.gateHp) {
    const defenderSide = defending ? 0 : 1;
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
