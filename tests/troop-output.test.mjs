import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOfficer,unitAttributes,lockDeployment,stepBattle,issueCommand,COMMAND_RESOURCE} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {configureTactics,availableTactics,unitTactics} from '../tactics.mjs';

test('panel offense sums current soldiers, while defensive attributes do not shrink',()=>{
 const u=makeOfficer('person-661',3000,0,10),full=unitAttributes(u);
 for(const troops of [0,1,100,750,3000,9000]){
  const stats=unitAttributes({...u,troops});
  for(const key of ['attack','martialPower','strategyPower','siege'])assert.ok(Math.abs(stats[key]-full[key]*troops/3000)<1e-9,key);
  for(const key of ['defense','discipline','range','move','attackSpeed'])assert.equal(stats[key],full[key],key);
  assert.equal(Object.hasOwn(stats,'strength'),false);
 }
 const wounded=unitAttributes({...u,hp:100,wounded:2900});
 assert.ok(Math.abs(wounded.martialPower-full.martialPower/30)<1e-9);
});

function remnant(id,type,skill,hp=100){
 const b=createScenario('officer-lab',771,20,[id]).battle,u=b.sides[0].units[0];
 Object.assign(u,{type,hp,battleDamage:u.initial-hp,x:4,y:3,intent:0,cooldown:0});
 const loadout=[...new Set([skill,...availableTactics(u).map(s=>s.id)])].slice(0,3);
 assert.equal(configureTactics(u,loadout),null);
 u.skillReady=Object.fromEntries(loadout.map(s=>[s,s===skill?0:9999]));
 // Stationary targets isolate the attack under test; intent still comes from real basic attacks.
 b.sides[1].units.forEach((d,i)=>{
  Object.assign(d,{hp:8000,maxHp:8000,initial:8000,level:1,x:5+i%2,y:2+Math.floor(i/2),cooldown:9999,intent:0});
  d.skillReady=Object.fromEntries(unitTactics(d).map(s=>[s.id,9999]));d.statuses.phalanx={until:9999};
 });
 lockDeployment(b);return {b,u};
}

test('ordinary attacks use the displayed attack once, without a second troop multiplier',()=>{
 function shot(hp){
  const {b,u}=remnant('cao','crossbow','seal',hp);u.level=1;
  const attack=unitAttributes(u,b).attack;stepBattle(b);
  const hit=b.effects.find(e=>e.from===u.id&&e.damage>0);
  assert.ok(hit);return {attack,damage:hit.damage};
 }
 const full=shot(3000),small=shot(100);
 assert.ok(Math.abs(small.damage-full.damage*small.attack/full.attack)<=1);
});

for(const [id,type,skill] of [
 ['person-661','spear','unique-person-661'],['person-433','spear','unique-person-433'],
 ['person-99','cavalry','unique-person-99'],['person-246','archer','unique-person-246'],
 ['jia','archer','wildfire'],['jia','archer','fire'],['jia','siege','plague'],
 ['cao','siege','bombard'],['cao','ship','broadside'],
])test(`100 survivors: ${skill} earns intent and cannot destroy a 48,000-soldier army`,()=>{
 const {b,u}=remnant(id,type,skill);let damage=0;
 for(let i=0;i<180&&!u.tacticCasts[skill];i++){
  stepBattle(b);
  if(u.tacticCasts[skill])damage=b.effects.filter(e=>e.from===u.id&&e.to!==u.id).reduce((n,e)=>n+e.damage,0);
 }
 assert.equal(u.tacticCasts[skill],1,'must actually cast through the current intent and target rules');
 assert.ok(damage<500,`single cast inflicted ${damage}`);
 u.cooldown=9999;u.skillReady=Object.fromEntries(u.tactics.map(s=>[s,9999]));
 for(let i=0;i<20;i++){stepBattle(b);damage+=b.effects.filter(e=>e.from===u.id&&e.to!==u.id).reduce((n,e)=>n+e.damage,0);}
 assert.ok(damage<1000,`cast plus ongoing damage inflicted ${damage}`);
 assert.ok(b.sides[1].units.every(d=>d.hp>7000));
});

test('firestorm is bounded by friendly power, not enemy army size',()=>{
 function run(enemyHp){
  const {b,u}=remnant('jia','crossbow','seal');
  u.cooldown=9999;u.skillReady=Object.fromEntries(u.tactics.map(s=>[s,9999]));
  for(const d of b.sides[1].units)d.hp=d.initial=d.maxHp=enemyHp;
  while(b.commandProgress<COMMAND_RESOURCE.capacity)stepBattle(b);
  assert.equal(issueCommand(b,'firestorm'),null);
  const loss=b.sides[1].units.reduce((n,d)=>n+d.statuses.scorch.amount*12,0);
  assert.ok(loss<100);return loss;
 }
 assert.equal(run(3000),run(30000));
});
