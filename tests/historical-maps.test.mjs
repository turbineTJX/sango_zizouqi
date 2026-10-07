import test from 'node:test';import assert from 'node:assert/strict';
import {HISTORICAL_BATTLES,historicalBattleDraft,historicalBattleLibrary} from '../historical-battle-library.mjs';
import {BATTLE_MAPS} from '../data/design/battle-maps.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {validateCustomBattle,swapCustomBattle,customParticipants,customBattleTotals,customSideEntries} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {canOccupy,terrainAt} from '../battlefield.mjs';
import {learnedTacticIds} from '../tactic-learning.mjs';
import {officerQuality} from '../scripts/audit-historical-reinforcements.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';

test('historical mass armies have more real troops and reinforcement units; intended winners have stronger rosters',()=>{
 for(const h of HISTORICAL_BATTLES){const d=historicalBattleDraft(h.id),totals=[0,1].map(side=>customBattleTotals(d,side));
  if(h.id==='wuzhang'){assert.equal(h.expectedWinner,null);assert.equal(totals[0].troops,totals[1].troops);assert.equal(totals[0].units,totals[1].units);assert.equal(totals[0].reinforcementUnits,totals[1].reinforcementUnits);continue;}
  const side=h.numericalSide;assert.ok(totals[side].troops>totals[1-side].troops);assert.ok(totals[side].units>totals[1-side].units);assert.ok(totals[side].reinforcementUnits>totals[1-side].reinforcementUnits);
  assert.ok(officerQuality(customSideEntries(d,h.expectedWinner))>officerQuality(customSideEntries(d,1-h.expectedWinner)),h.id);
 }
 for(const id of ['guandu','chibi','hefei'])assert.ok(customBattleTotals(historicalBattleDraft(id),1).reinforcementUnits>4);
 const guandu=customParticipants(historicalBattleDraft('guandu'));assert.ok(!guandu.some(u=>['yan','wen','tian'].includes(u.id)));
});

test('six distinct editable maps contain full legal level-10 historical armies',()=>{
 assert.equal(HISTORICAL_BATTLES.length,6);assert.equal(new Set(Object.values(BATTLE_MAPS).map(m=>JSON.stringify(m.tiles))).size,6);
 for(const h of HISTORICAL_BATTLES){const d=historicalBattleDraft(h.id),s=generateBattle(d);assert.equal(s.battle.mapId,h.id);assert.deepEqual(d,validateCustomBattle(d));
  for(const team of [d.ownTeam,d.enemyTeam]){assert.ok(team.length>=3&&team.length<=10);assert.equal(new Set(team.map(u=>u.id)).size,team.length);}
  for(const a of d.reinforcements){assert.ok(a.team.length>=1&&a.team.length<=10);assert.equal(new Set(a.team.map(u=>u.id)).size,a.team.length);}
  assert.equal(new Set(customParticipants(d).map(u=>u.id)).size,customParticipants(d).length);
  for(const row of BATTLE_MAPS[h.id].tiles)assert.equal(row.length,14);
  for(const u of s.battle.sides.flatMap(s=>s.units)){assert.equal(u.level,10);assert.deepEqual(u.tactics,learnedTacticIds(u));if(u.status==='active')assert.ok(canOccupy(s.battle,u,u.x,u.y));}
  validateSave(s);assert.deepEqual(generateBattle(s.testScenario.customBattle).battle,s.battle);
 }
 assert.match(historicalBattleLibrary(),/data-history="wuzhang"/);
});
test('historical templates use era-appropriate officers, distinct Zhang Nan identities and real conditional reinforcements',()=>{
 for(const h of HISTORICAL_BATTLES){assert.ok(h.sources.length>=2);assert.ok(h.designNote.length>0);for(const u of customParticipants(h.draft)){const p=OFFICER_BY_ID[u.id];assert.ok(p.deathYear>=h.year,p.name+' '+h.name);assert.ok(p.birthYear<=h.year-16,p.name+' '+h.name);}}
 const yiling=historicalBattleDraft('yiling');assert.ok(yiling.enemyTeam.some(u=>u.id==='person-430'));assert.ok(!customParticipants(yiling).some(u=>u.id==='person-429'));
 for(const id of ['guandu','hefei','yiling'])assert.ok(historicalBattleDraft(id).reinforcements.some(a=>a.arrivalCondition));
 assert.equal(historicalBattleDraft('chibi').reinforcements[0].tick,72);
 assert.ok(historicalBattleDraft('wuzhang').events.length===0);
});
test('historical maps fight and replay through the shared engine, including swapped siege sides',()=>{
 for(const h of HISTORICAL_BATTLES)for(const swapped of [false,true]){
  const original=historicalBattleDraft(h.id),d=swapped?swapCustomBattle(original):original;
  const s=generateBattle(d),b=s.battle;lockDeployment(b);for(let n=0;n<12&&!b.result;n++)stepBattle(b,{aiSides:[0,1]});const copy=validateSave(structuredClone(s));
  while(!b.result){stepBattle(b,{aiSides:[0,1]});stepBattle(copy.battle,{aiSides:[0,1]});}
  assert.deepEqual(b,copy.battle);validateSave(s);assert.ok(b.effects||b.result);
 }
});
test('unknown, incompatible and forged map identities are rejected',()=>{
 const d=historicalBattleDraft('chibi');assert.throws(()=>validateCustomBattle({...d,mapId:'missing'}));assert.throws(()=>validateCustomBattle({...d,terrain:'land'}));
 const s=generateBattle(historicalBattleDraft('guandu'));s.battle.mapId='yiling';assert.throws(()=>validateSave(s));
 assert.equal(terrainAt({terrain:'land',mapId:'chibi'},1,2),'water');
});
