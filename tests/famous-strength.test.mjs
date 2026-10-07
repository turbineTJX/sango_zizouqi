import test from 'node:test';
import assert from 'node:assert/strict';
import {currentBattle,readyCurrent,resumeCurrent} from './helpers/current-battle.mjs';
import {TACTICS_BOOK,unitTactics,tacticTarget,undermineTargets,hasStatus} from '../tactics.mjs';
import {tacticUseLimit} from '../tactic-tempo.mjs';
import {stepBattle} from '../engine.mjs';

test('Guo Jia ignores exhausted and immune intent bars on both sides',()=>{
 for(const side of [0,1]){
  const x=currentBattle('undermine','crossbow',{side}),s=TACTICS_BOOK.undermine;
  x.target.intent=100;x.rear.intent=60;
  for(const t of unitTactics(x.target))x.target.tacticCasts[t.id]=tacticUseLimit(x.target,t);
  assert.equal(tacticTarget(x.b,x.u,s,4),x.rear);
  x.rear.statuses.magicImmune={until:999};assert.equal(tacticTarget(x.b,x.u,s,4),null);
  readyCurrent(x,'undermine');stepBattle(x.b);assert.equal(x.u.tacticCasts.undermine,undefined);
 }
});
test('Guo Jia resolves a bounded local suppression cluster and resumes deterministically',()=>{
 const x=currentBattle('undermine','crossbow',{enemyTypes:['spear','spear','spear','spear']});
 const enemies=x.b.sides[1].units;const cells=[[5,3],[5,2],[6,3],[11,6]];
 enemies.forEach((u,i)=>Object.assign(u,{x:cells[i][0],y:cells[i][1],intent:80}));
 const targets=undermineTargets(x.b,x.u,TACTICS_BOOK.undermine,x.target);assert.equal(targets.length,3);
 readyCurrent(x,'undermine');stepBattle(x.b);
 assert.equal(x.u.tacticCasts.undermine,1);
 for(const u of targets){assert.ok(hasStatus(x.b,u,'intentSuppression'));assert.ok(hasStatus(x.b,u,'weaken'));assert.equal(u.statuses.intentSuppression.fraction,.5);assert.ok(u.intent<80);}
 assert.equal(hasStatus(x.b,enemies[3],'intentSuppression'),false);
 resumeCurrent(x);
});
