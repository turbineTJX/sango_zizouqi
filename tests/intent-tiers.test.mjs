import {learnFixtureTactics,syncFixtureLearning} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {TACTICS_BOOK,SPECIAL_TACTICS} from '../tactics.mjs';

test('cheap setup precedes 100-intent finishers in real zero-intent combat and resumes deterministically',()=>{
  const heroes=['person-661','person-246','person-603','person-99'];
  const state=createScenario('officer-lab',17,20,[...heroes,'yu','shao']),b=state.battle;
  for(const u of b.sides[0].units.filter(u=>heroes.includes(u.id))){const setup={spear:'phalanx',cavalry:'gallop',archer:'fire',crossbow:'pierce',ship:'anchor',halberd:'bulwark',siege:'emplace'}[u.type];learnFixtureTactics(u,[setup,'unique-'+u.id]);}
  syncFixtureLearning(state);lockDeployment(b);
  assert.ok(b.sides.flatMap(s=>s.units).every(u=>u.intent===(u.bondEntry?.intent||0)));
  const first=new Map();let resumed=null;
  while(!b.result){
    stepBattle(b);if(resumed)stepBattle(resumed.battle);
    for(const u of b.sides[0].units)for(const [id,count]of Object.entries(u.tacticCasts)){
      const key=u.id+':'+id;if(count&&!first.has(key))first.set(key,b.tick);
    }
    if(!resumed&&first.has('person-661:unique-person-661'))resumed=validateSave(structuredClone(state));
  }
  for(const hero of heroes){
    const id=SPECIAL_TACTICS[hero];
    assert.equal(TACTICS_BOOK[id].threshold,100);
    assert.ok(first.has(hero+':'+id),`${id} can reach its threshold before combat ends`);
    const u=b.sides[0].units.find(u=>u.id===hero);
    assert.ok(u.tactics.some(key=>TACTICS_BOOK[key].threshold<=35&&first.get(hero+':'+key)<first.get(hero+':'+id)),'each officer uses its own low-intent setup before its finisher');
  }
  assert.deepEqual(resumed.battle,b);
});
