import {customSideEntries,customBattleTotals} from '../custom-battle.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAYER_CASES,CANDIDATES,HIST_DEV_SEEDS,HIST_VALIDATION_SEEDS,playerDraft,historicalPlayerState,humanOrder,fightHistorical,BASE_AI} from '../scripts/historical-player-lab.mjs';
import {historicalBattleDraft} from '../historical-battle-library.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {learnedTacticIds} from '../tactic-learning.mjs';
import {validateSave,COMMAND_RESOURCE} from '../engine.mjs';
import {sideBonds} from '../bonds.mjs';

test('historical perspectives preserve real rosters, commanders, map and defender goals',()=>{
 for(const c of PLAYER_CASES){
  const original=historicalBattleDraft(c.id),draft=playerDraft(c.id,HIST_DEV_SEEDS[0]);
  assert.deepEqual(draft.ownTeam,c.side?original.enemyTeam:original.ownTeam);
  assert.deepEqual(draft.enemyTeam,c.side?original.ownTeam:original.enemyTeam);
  assert.deepEqual(draft.ownTeamRoles,c.side?original.enemyTeamRoles:original.ownTeamRoles);
  assert.equal(draft.mapId,original.mapId);assert.equal(draft.limit,original.limit);
 }
 const hefei=playerDraft('hefei',HIST_DEV_SEEDS[0]);assert.equal(hefei.battleKind,'defense');assert.equal(hefei.holdUntil,historicalBattleDraft('hefei').holdUntil);
 assert.ok(HIST_DEV_SEEDS.every(seed=>!HIST_VALIDATION_SEEDS.includes(seed)));
});

test('all proposed player formations use only original officers, real kits and exact legal troop budgets',()=>{
 for(const c of PLAYER_CASES)for(const plan of CANDIDATES[c.id])for(const ratio of [1,c.pressure]){
  const draft=playerDraft(c.id,HIST_DEV_SEEDS[0]),state=historicalPlayerState(c.id,plan,HIST_DEV_SEEDS[0],{ratio,lock:false}),b=state.battle;
  assert.deepEqual(b.sides[0].units.map(u=>u.id).sort(),customSideEntries(draft,0).map(u=>u.id).sort());
  assert.equal(b.sides[0].units.reduce((n,u)=>n+u.hp,0),Math.round(customBattleTotals(draft,0).troops*ratio/100)*100);
  assert.equal(b.sides[1].units.reduce((n,u)=>n+u.hp,0),customBattleTotals(draft,1).troops);
  for(const u of b.sides.flatMap(s=>s.units)){assert.ok(u.initial>=1000&&u.initial<=troopCapacity(u));assert.deepEqual(u.tactics,learnedTacticIds(u));}
  validateSave(structuredClone(state));
 }
});

test('reversing the reserve queue preserves active deployment, enemy state, starting bonds and RNG',()=>{
 const plan=CANDIDATES.wuzhang[1],a=historicalPlayerState('wuzhang',plan,HIST_DEV_SEEDS[0],{ratio:.9,lock:false}),b=historicalPlayerState('wuzhang',{...plan,reverseQueue:true},HIST_DEV_SEEDS[0],{ratio:.9,lock:false});
 const active=state=>state.battle.sides[0].units.filter(u=>u.status==='active').map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp,tactics:u.tactics}));
 const reserves=state=>state.battle.sides[0].units.filter(u=>u.status==='reserve').map(u=>u.id);
 assert.deepEqual(active(a),active(b));assert.deepEqual(a.battle.sides[1],b.battle.sides[1]);
 assert.deepEqual(reserves(a),reserves(b).reverse());assert.deepEqual(sideBonds(a.battle,0),sideBonds(b.battle,0));assert.equal(a.battle.seed,b.battle.seed);
});

test('player command policy inspects public current state without modifying the battle or consuming RNG',()=>{
 const plan=CANDIDATES.wuzhang[1],b=historicalPlayerState('wuzhang',plan,HIST_DEV_SEEDS[0]).battle;
 b.commandProgress=COMMAND_RESOURCE.capacity;const original=structuredClone(b);
 for(const policy of ['control','sustain','attack','fixed','none'])humanOrder(b,{...plan,policy});
 assert.deepEqual(b,original);
});

test('real human and double-AI historical battles finish legally and resume deterministically',()=>{
 for(const plan of [BASE_AI,CANDIDATES.yiling[1]]){
  const result=fightHistorical('yiling',plan,HIST_DEV_SEEDS[0],{ratio:.9,replay:true});
  assert.ok([0,1,null].includes(result.winner));assert.ok(result.ticks>12&&result.ticks<=480);
  const d=playerDraft('yiling',HIST_DEV_SEEDS[0]);assert.deepEqual(result.budgets,[Math.round(customBattleTotals(d,0).troops*.9/100)*100,customBattleTotals(d,1).troops]);
  assert.ok(result.changes.length>0);assert.ok(result.units.flat().some(u=>Object.values(u.casts).some(n=>n>0)));
 }
});
