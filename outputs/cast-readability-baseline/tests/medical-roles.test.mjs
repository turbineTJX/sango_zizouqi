import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,unitAttributes,validateSave} from '../engine.mjs';
import {configureTactics,roleTacticIds,unitTactics,recoverableWounded,hasStatus,supportAnchor,flankingTarget} from '../tactics.mjs';
import {passiveDamageTaken,passiveDamageMultiplier} from '../passives.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';
function scene(type='crossbow'){
 const state=createScenario('field',117),b=state.battle,u=b.sides[0].units[0],d=b.sides[1].units[0];
 Object.assign(u,{id:'test-healer',level:1,type,x:4,y:3,cooldown:999,intent:0,hp:3000,maxHp:3000,initial:3000,battleDamage:0,healed:0,statuses:{}});
 const a={...structuredClone(u),id:'patient',type:'spear',x:5,y:3};
 Object.assign(d,{x:6,y:3,cooldown:999,intent:0,statuses:{}});
 b.sides[0].units=[u,a];b.sides[1].units=[d];
 configureTactics(u,roleTacticIds(u,'guard'));configureTactics(a,roleTacticIds(a,'guard'));
 for(const v of [u,a,d])v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));
 lockDeployment(b);return {state,b,u,a,d};
}
test('medical tactics heal actual wounded, respect the shared recovery budget, and never create casualties to heal',()=>{
 const x=scene();Object.assign(x.a,{hp:2000,battleDamage:1000});
 primeTactic(x.u,'screen');stepBattle(x.b);
 const gained=x.a.hp-2000;
 assert.equal(gained,Math.round(3000*(.08+unitAttributes(x.u,x.b).strategyPower/10000)));
 assert.equal(x.a.healed,gained);assert.equal(recoverableWounded(x.a),350-gained);
 assert.equal(x.b.effects.find(e=>e.healing)?.healing,gained);
 for(let i=0;i<7;i++)stepBattle(x.b); // Let the first shield expire before another valid protective cast.
 primeTactic(x.u,'screen');stepBattle(x.b);
 assert.equal(x.a.hp,2350);assert.equal(x.a.healed,350);assert.equal(recoverableWounded(x.a),0);
 primeTactic(x.u,'screen');stepBattle(x.b);assert.equal(x.a.hp,2350);
 const y=scene();y.a.hp=2000;primeTactic(y.u,'screen');stepBattle(y.b);
 assert.equal(y.a.hp,2000,'missing HP without battle wounds is not a recovery resource');
});
test('front support heals at most two other allies, never itself, and has a real range limit',()=>{
 const x=scene('cavalry');Object.assign(x.u,{hp:1000,battleDamage:2000});Object.assign(x.a,{hp:1000,battleDamage:2000});
 const near={...structuredClone(x.a),id:'near',x:4,y:4},far={...structuredClone(x.a),id:'far',x:0,y:7};
 x.b.sides[0].units.push(near,far);primeTactic(x.u,'relay');stepBattle(x.b);
 assert.equal(x.u.hp,1000);assert.ok(x.a.hp>1000);assert.ok(near.hp>1000);assert.equal(far.hp,1000);
 assert.equal(x.b.effects.filter(e=>e.healing).length,2);
 assert.ok(hasStatus(x.b,x.a,'haste'));assert.ok(Object.values(x.a.skillReady).every(t=>t===997));
});
test('healing does not revive defeated troops or restore already recovered wounds',()=>{
 const x=scene();Object.assign(x.a,{hp:0,battleDamage:3000,status:'defeated'});
 const exhausted={...structuredClone(x.u),id:'exhausted',x:5,y:4,hp:2000,battleDamage:1000,healed:350};
 x.b.sides[0].units.push(exhausted);primeTactic(x.u,'screen');stepBattle(x.b);
 assert.equal(x.a.status,'defeated');assert.equal(x.a.hp,0);assert.equal(exhausted.hp,2000);
 assert.ok(!x.b.effects.some(e=>e.healing));
});
test('doubt deals strategy damage through control protection without bypassing that protection',()=>{
 const x=scene('spear');x.d.x=5;x.d.y=2;x.d.statuses.resolve={until:99};primeTactic(x.u,'doubt');
 const hp=x.d.hp;stepBattle(x.b);assert.ok(x.d.hp<hp);assert.ok(!hasStatus(x.b,x.d,'confuse'));
 assert.equal(x.u.tacticCasts.doubt,1);
});
test('medical positioning requires earned intent and is not enabled by an incidental heal in an offensive kit',()=>{
 const x=scene('cavalry');assert.equal(supportAnchor(x.b,x.u),null);
 x.u.intent=35;assert.equal(supportAnchor(x.b,x.u),x.a);
 x.u.type='crossbow';configureTactics(x.u,['screen','repeat','pierce']);assert.equal(supportAnchor(x.b,x.u),null);
});
test('real zero-intent battles trigger both medical roles and resume deterministically',()=>{
 for(const type of ['cavalry','crossbow']){
  const state=createScenario('field',117),b=state.battle,u=b.sides[0].units[0];
  u.type=type;configureTactics(u,roleTacticIds(u,'guard'));u.skillReady={};
  let healing=0;for(let i=0;i<65&&!b.result;i++){stepBattle(b);healing+=b.effects.filter(e=>e.from===u.id).reduce((n,e)=>n+(e.healing||0),0);}
  assert.ok(healing>0,type+' must heal in the normal intent-driven flow');
  const copy=validateSave(structuredClone(state));
  while(!b.result){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
 }
});
test('fire builds three layers through actual follow-up attacks, loses stacks to cleanse, and expires after disengagement',()=>{
 const x=scene('archer');configureTactics(x.u,['fire','scatter','suppress']);
 primeTactic(x.u,'fire');stepBattle(x.b);assert.equal(x.d.statuses.burn.stacks,1);
 x.u.cooldown=0;x.d.statuses.phalanx={until:99};
 const snapshots=[];let dots=0;
 for(let i=0;i<9;i++){stepBattle(x.b);snapshots.push(x.d.statuses.burn?.stacks||0);dots+=x.b.effects.filter(e=>e.from===x.u.id&&e.damageKind==='dot').reduce((n,e)=>n+e.damage,0);}
 assert.ok(snapshots.includes(2));assert.ok(snapshots.includes(3));assert.ok(snapshots.every(n=>n<=3));assert.ok(dots>0);
 x.u.cooldown=999;delete x.u.statuses.burningAttack;primeTactic(x.d,'cleanse');stepBattle(x.b);
 assert.equal(x.d.statuses.burn,undefined);
 primeTactic(x.u,'fire');stepBattle(x.b);assert.equal(x.d.statuses.burn.stacks,1);
 x.u.cooldown=999;delete x.u.statuses.burningAttack;
 for(let i=0;i<7;i++)stepBattle(x.b);assert.equal(x.d.statuses.burn,undefined);
});
test('strategy attacks remain basic attacks for shelter and cooperation, while using strategy damage resistance',()=>{
 const x=scene('spear');x.u.id='chu';x.u.level=10;
 assert.equal(passiveDamageTaken(x.b,x.u,'intellect',true),passiveDamageTaken(x.b,x.u,'intellect',false)*.92);
 const y=scene('archer');y.u.id='person-99';y.u.level=10;y.a.x=5;y.a.y=3;
 assert.ok(passiveDamageMultiplier(y.b,y.u,y.d,'intellect',true)>passiveDamageMultiplier(y.b,y.u,y.d,'intellect',false));
 function shot(strategy,leadership,politics){
  const z=scene('spear');z.b.sides[0].units=[z.u];z.u.cooldown=0;
  Object.assign(z.d,{x:5,leadership,politics});if(strategy)z.u.statuses.strategyAttack={until:99};
  stepBattle(z.b);return z.b.effects.find(e=>e.from===z.u.id&&e.damage>0).damage;
 }
 assert.equal(shot(true,20,80),shot(true,100,80));
 assert.ok(shot(true,80,20)>shot(true,80,100));
 assert.ok(shot(false,20,80)>shot(false,100,80));
 assert.equal(shot(false,80,20),shot(false,80,100));
});
test('medical casting spends the next basic attack interval rather than adding free healing between shots',()=>{
 for(const [type,skill] of [['crossbow','screen'],['cavalry','relay']]){
  const x=scene(type);Object.assign(x.a,{hp:1000,battleDamage:2000});x.u.cooldown=0;primeTactic(x.u,skill);stepBattle(x.b);
  assert.equal(x.u.cooldown,unitAttributes(x.u,x.b).attackInterval);
  stepBattle(x.b);assert.ok(!x.b.effects.some(e=>e.from===x.u.id&&!e.skill&&e.damage>0));
 }
});
test('only equipped chargers select legal short flanks, and live interception cancels that preference',()=>{
 const x=scene('cavalry');configureTactics(x.u,['gallop','rush','valor']);x.b.sides[0].units=[x.u];
 x.d.type='crossbow';x.d.x=8;
 const guard={...structuredClone(x.a),side:1,id:'guard',x:6,y:1};x.b.sides[1].units.push(guard);
 assert.equal(flankingTarget(x.b,x.u,x.b.sides[1].units),x.d);
 guard.x=5;guard.y=3;assert.equal(flankingTarget(x.b,x.u,x.b.sides[1].units),null);
 guard.statuses.stun={until:99};x.d.x=7;assert.equal(flankingTarget(x.b,x.u,x.b.sides[1].units),x.d);
 configureTactics(x.u,['gallop','relay','harass']);assert.equal(flankingTarget(x.b,x.u,x.b.sides[1].units),null);
});
test('a naturally stacked battle saves exact layers, rejects forged stacks, and continues deterministically',()=>{
 const state=createScenario('field',93),b=state.battle;
 for(const u of b.sides[0].units){u.type='archer';configureTactics(u,['fire','wildfire','suppress']);u.skillReady={};}
 let stacked;
 while(!b.result&&!stacked){stepBattle(b);stacked=b.sides[1].units.find(u=>u.statuses.burn?.stacks===3);}
 assert.ok(stacked);const copy=validateSave(structuredClone(state));
 for(const n of [0,4,1.5]){const bad=structuredClone(state);bad.battle.sides[1].units.find(u=>u.id===stacked.id).statuses.burn.stacks=n;assert.throws(()=>validateSave(bad),/燃烧层数/);}
 while(!b.result){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
});
