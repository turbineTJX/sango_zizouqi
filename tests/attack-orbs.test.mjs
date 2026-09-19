import {syncFixtureLearning} from './helpers/learn-tactics.mjs';
import {learnFixtureTactics} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,validateSave} from '../engine.mjs';
import {unitTactics,TACTICS_BOOK,hasStatus,readyTactic,setStatus} from '../tactics.mjs';
import {intentIncome} from '../passives.mjs';
import {inspectionStatuses,statusAmounts} from '../status-display.mjs';
import {ATTACK_ORBS} from '../attack-orbs.mjs';

function scene(id='fire',scenario='field'){
  const state=createScenario(scenario,83),b=state.battle;
  lockDeployment(b);
  const u=b.sides[0].units[0],d=b.sides[1].units[0];
  for(const army of state.armies)for(const officer of army.units)if([u.id,d.id].includes(officer.id))officer.level=1;
  b.sides[0].units=[u];b.sides[1].units=[d];
  Object.assign(u,{type:id==='curse'?'halberd':id==='pierce'?'crossbow':'archer',level:1,x:4,y:3,cooldown:999,intent:TACTICS_BOOK[id].threshold,statuses:{}});
  Object.assign(d,{type:'spear',level:1,x:5,y:3,cooldown:999,intent:0,statuses:{phalanx:{until:999,potency:1}}});learnFixtureTactics(d,['phalanx']);
  const others={fire:['scatter','suppress'],suppress:['scatter','fire'],pierce:['repeat','seal'],curse:['bulwark','blight']}[id];
  assert.equal(learnFixtureTactics(u,[id,...others]),null);
  for(const v of [u,d])v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));
  u.skillReady[id]=0;
  return {state,b,u,d};
}
function arm(x){const hp=x.d.hp;stepBattle(x.b);assert.equal(x.d.hp,hp);assert.equal(x.u.statuses.attackOrb.charges,3);assert.ok(x.b.effects.some(e=>e.enchantment));}
function hit(x){x.u.cooldown=0;stepBattle(x.b);return x.b.effects.find(e=>e.from===x.u.id&&e.attackOrb);}

for(const id of Object.keys(ATTACK_ORBS))test(`${id}: three real basics consume exactly three charges, with normal intent and no links`,()=>{
  const x=scene(id);arm(x);
  for(let remaining=2;remaining>=0;remaining--){
    const ui=x.u.intent,di=x.d.intent,fx=hit(x);
    assert.equal(fx.attackOrb,id);assert.equal(fx.skill,false);assert.equal(fx.orbRemaining,remaining);
    assert.equal(x.u.intent,ui+intentIncome(x.u).attack);
    assert.equal(x.d.intent,di+intentIncome(x.d).hit);
    assert.equal(x.u.statuses.attackOrb?.charges||0,remaining);
    assert.ok(hasStatus(x.b,x.d,ATTACK_ORBS[id].status));
    assert.equal(x.b.effects.filter(e=>e.combo).length,0);
  }
  assert.equal(hit(x),undefined);assert.equal(x.u.tacticCasts[id],1);
});

test('charges persist while idle and while sealed; cooldown cannot refill or replace an active orb',()=>{
  const x=scene();arm(x);x.u.skillReady.suppress=0;
  for(let i=0;i<28;i++)stepBattle(x.b);
  assert.equal(x.u.statuses.attackOrb.charges,3);assert.equal(x.u.tacticCasts.fire,1);
  assert.equal(readyTactic(x.b,x.u,4),null);
  setStatus(x.b,x.u,'seal',10);assert.ok(hit(x));assert.equal(x.u.statuses.attackOrb.charges,2,'seal prevents arming, but not already enchanted basics');
  setStatus(x.b,x.u,'stun',3);x.u.cooldown=0;stepBattle(x.b);assert.equal(x.u.statuses.attackOrb.charges,2);
});

test('tactics and retaliation do not consume charges or double-apply timed burning attacks',()=>{
  const x=scene();arm(x);
  learnFixtureTactics(x.u,['fire','wildfire','scatter']);x.u.skillReady=Object.fromEntries(unitTactics(x.u).map(t=>[t.id,t.id==='wildfire'?0:999]));x.u.intent=100;
  stepBattle(x.b);assert.equal(x.u.statuses.attackOrb.charges,3);assert.equal(x.d.statuses.burn.stacks,1);
  assert.ok(hit(x));assert.equal(x.d.statuses.burn.stacks,2,'the timed fire buff must not add a second layer to the same enchanted hit');
  const y=scene('curse');arm(y);setStatus(y.b,y.u,'riposte',8,{lastTick:0});y.d.cooldown=0;
  stepBattle(y.b);assert.ok(y.b.effects.some(e=>e.from===y.u.id&&e.label==='反击'));
  assert.equal(y.u.statuses.attackOrb.charges,3);
});

test('a shielded hit still consumes one charge; a lethal hit consumes one without debuffing the defeated unit',()=>{
  const x=scene('pierce');arm(x);setStatus(x.b,x.d,'shield',8,{amount:1000,source:'test',label:'测试护盾'});
  const hp=x.d.hp,fx=hit(x);assert.equal(x.d.hp,hp);assert.ok(fx.shieldAbsorbed>0);assert.equal(x.u.statuses.attackOrb.charges,2);assert.ok(x.d.statuses.armorBreak);
  const y=scene('suppress');arm(y);y.d.hp=1;hit(y);assert.equal(y.u.statuses.attackOrb.charges,2);assert.equal(y.d.statuses.slow,undefined);
});

test('gate attacks do not spend troop enchantments',()=>{
  const x=scene('fire','siege');arm(x);const gate=x.b.siege.gate;
  x.u.x=gate.x-2;x.u.y=gate.y;x.d.x=0;x.d.y=7;
  x.u.cooldown=0;stepBattle(x.b);
  assert.ok(x.b.effects.some(e=>e.from===x.u.id&&e.to===gate.id&&e.damage>0));
  assert.equal(x.u.statuses.attackOrb.charges,3);
});

test('remaining charges/source survive save and resume; forged or obsolete state is rejected',()=>{
  const x=scene();arm(x);hit(x);
  const restored=validateSave(JSON.parse(JSON.stringify(syncFixtureLearning(x.state))));
  const status=inspectionStatuses(x.b,x.u).find(s=>s.key==='attackOrb');
  assert.equal(status.remaining,2);assert.match(status.time,/2 次/);assert.ok(status.sources[0].includes('火矢'));
  assert.equal(statusAmounts(x.b,x.u,status)[0][1],'2 次（普攻命中敌方部队时消耗）');
  for(let i=0;i<20;i++){stepBattle(x.b);stepBattle(restored.battle);}
  assert.deepEqual(restored.battle,x.b);
  for(const charges of [0,4,1.5]){const bad=structuredClone(restored);bad.battle.sides[0].units[0].statuses.attackOrb={...x.u.statuses.attackOrb,until:241,skillId:'fire',charges,sourceId:x.u.id,sourceSkillName:'火矢'};assert.throws(()=>validateSave(bad));}
  const old=structuredClone(restored);old.rulesVersion=27;assert.throws(()=>validateSave(old));
});
