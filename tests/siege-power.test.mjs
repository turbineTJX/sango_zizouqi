import test from 'node:test';
import assert from 'node:assert/strict';
import {unitAttributes,TROOPS} from '../unit-stats.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
import {COMBAT} from '../combat-rules.mjs';
import {unitTactics} from '../tactics.mjs';

for(const [type,t] of Object.entries(TROOPS))test(`${type}: gate attacks use derived siege power once, including casualties and attack buffs`,()=>{
 for(const hp of [300,1800])for(const buff of [false,true]){
  const b=createScenario('siege',173).battle,u=b.sides[0].units[0],gate=b.siege.gate;
  b.sides[0].units=[u];b.sides[1].units=[];
  Object.assign(u,{type,level:1,hp,retreatAt:null,x:type==='siege'?9:11,y:4,cooldown:0,intent:0,statuses:{}});
  u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,9999]));
  if(buff)b.sides[0].assaultUntil=9999;
  lockDeployment(b);
  const stats=unitAttributes(u,b),before=gate.hp;
  assert.ok(stats.siege>0);
  assert.equal(stats.siege,stats.attack*t.siegeFactor);
  stepBattle(b);
  const hit=b.effects.find(e=>e.from===u.id&&e.to===gate.id&&e.damage>0);
  assert.ok(hit,'ordinary attack reaches the gate');
  assert.equal(before-gate.hp,hit.damage);
  assert.ok(hit.damage>=Math.round(stats.siege*COMBAT.damageScale*.9));
  assert.ok(hit.damage<=Math.round(stats.siege*COMBAT.damageScale*1.1));
 }
});
