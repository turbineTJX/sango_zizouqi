import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOfficer,newGame,stepBattle,lockDeployment,validateSave,unitAttributes,lowerIntent} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {powerFactor} from '../tactic-power.mjs';
import {configureTactics,unitTactics,hasStatus,recommendedTacticIds} from '../tactics.mjs';
import {passiveList,passiveDamageMultiplier,SKILL_ROUTES} from '../passives.mjs';

function fixture(type,skill){
  const b=createScenario('field',83).battle,u=b.sides[0].units[0],d=b.sides[1].units[0];
  b.sides[0].units=[u];b.sides[1].units=[d];
  Object.assign(u,{type,level:1,hp:3000,maxHp:3000,initial:3000,x:4,y:3,cooldown:999,intent:100});
  Object.assign(d,{level:1,hp:3000,maxHp:3000,initial:3000,x:7,y:3,cooldown:999,intent:0});
  const rest=type==='archer'?['scatter','suppress']:type==='crossbow'?['seal','pierce']:['rush','harass'];
  assert.equal(configureTactics(u,[skill,...rest]),null);
  for(const a of [u,d])a.skillReady=Object.fromEntries(unitTactics(a).map(s=>[s.id,999]));
  u.skillReady[skill]=0;lockDeployment(b);return {b,u,d};
}

test('fire and wildfire snapshot troop-scaled DOT, keep full-strength power, and do not generate intent on ticks',()=>{
  for(const skill of ['fire','wildfire']){
    function cast(hp){
      const {b,u,d}=fixture('archer',skill);u.hp=hp;
      const strategy=unitAttributes(u,b).strategyPower;
      const full=Math.round((skill==='fire'?unitAttributes(u,b).martialPower*(6/280+.03):strategy*(6/280+.04))*100/(100+unitAttributes(d,b).discipline));
      stepBattle(b);const burn={...d.statuses.burn};assert.ok(burn.amount>=0);
      if(hp===3000)assert.equal(burn.amount,full);
      const enemyIntent=d.intent,ownIntent=u.intent,before=d.hp;
      u.hp=3000;stepBattle(b);
      assert.equal(before-d.hp,burn.amount,'healing the caster must not retroactively change an existing burn');
      assert.equal(d.intent,enemyIntent);assert.equal(u.intent,ownIntent);
      return burn.amount;
    }
    const full=cast(3000),weak=cast(30),last=cast(1);
    assert.ok(weak<full*.2);assert.ok(last<=weak);
  }
});

test('screen has a useful baseline and scales with support passives',()=>{
  function shield(id,level){
    const {b,u,d}=fixture('crossbow','screen');u.id=id;u.level=level;
    const ally={...structuredClone(d),id:'dun',side:0,x:3,y:3,hp:1200,battleDamage:1800};b.sides[0].units.push(ally);
    const base=ally.maxHp*.04*powerFactor(unitAttributes(u,b).strategyPower);
    stepBattle(b);const amount=ally.statuses.shield.amount;
    assert.equal(amount,Math.round(base*(id==='ju'&&level===10?1.45:1)));
    return amount;
  }
  assert.ok(shield('ju',10)>shield('ju',1));
});

test('foresight no longer depends on enemy loadout and respects its strict boundary and damage kind',()=>{
  const jia={...makeOfficer('jia'),level:10,side:0};
  for(const tactics of [['gallop','rush','harass'],['valor','rush','harass']]){
    const enemy={...makeOfficer('yan'),side:1,tactics,intent:100};
    assert.equal(lowerIntent(enemy,45,jia),54);assert.equal(enemy.intent,46);
    assert.equal(passiveDamageMultiplier(null,jia,enemy,'intellect'),1.3);
    assert.equal(passiveDamageMultiplier(null,jia,enemy,'force'),1);
    enemy.intent=58;assert.equal(passiveDamageMultiplier(null,jia,enemy,'intellect'),1.3);
    enemy.intent=59;assert.equal(passiveDamageMultiplier(null,jia,enemy,'intellect'),1.3);
    enemy.intent=60;assert.equal(passiveDamageMultiplier(null,jia,enemy,'intellect'),1);
    enemy.intent=0;enemy.type='gate';assert.equal(passiveDamageMultiplier(null,jia,enemy,'intellect'),1);
  }
});

test('gallop provides travel speed before contact and mitigation while adjacent',()=>{
  const {b,u,d}=fixture('cavalry','gallop');Object.assign(u,{x:3,y:4,intent:0});Object.assign(d,{x:10,y:4});
  stepBattle(b);assert.equal(u.tacticCasts.gallop,1);assert.ok(hasStatus(b,u,'haste'));assert.equal(u.intent,0);
  stepBattle(b);assert.equal(u.tacticCasts.gallop,1);
  const close=fixture('cavalry','gallop');Object.assign(close.d,{x:5,y:3});close.u.intent=0;
  stepBattle(close.b);assert.equal(close.u.tacticCasts.gallop,1);assert.ok(hasStatus(close.b,close.u,'ward'));assert.ok(!hasStatus(close.b,close.u,'haste'));
});

test('new officer defaults activate the intended bow and support routes without removing troop choice',()=>{
  const x=makeOfficer('yuanxia'),ju=makeOfficer('ju');
  assert.equal(x.type,'archer');assert.equal(x.formation,'back');
  assert.ok(!passiveList({...x,level:10}).some(p=>p.state==='兵种不符'));
  assert.equal(ju.type,'crossbow');assert.equal(ju.formation,'back');assert.ok(unitTactics(ju).some(s=>s.id==='unique-ju'));
  assert.deepEqual(ju.tactics,recommendedTacticIds(ju));
  assert.ok(SKILL_ROUTES.tian.includes('discipline'));assert.ok(!SKILL_ROUTES.tian.includes('suppress'));
  x.type='cavalry';assert.ok(passiveList({...x,level:10}).some(p=>p.id==='bow'&&p.state==='兵种不符'));
  validateSave(newGame());
});

test('current campaigns and ongoing battles preserve player loadouts and DOT snapshots',()=>{
  const state=createScenario('rotation',93),b=state.battle;
  for(const units of [state.armies[0].units,b.sides[0].units]){
    const x=units.find(u=>u.id==='yuanxia');x.type='cavalry';x.formation='front';x.tactics=['gallop','rush','valor'];
  }
  for(const units of [state.armies[1].units,b.sides[1].units]){
    const ju=units.find(u=>u.id==='ju');ju.type='archer';ju.tactics=['wildfire','smoke','suppress'];
  }
  lockDeployment(b);for(let i=0;i<10;i++)stepBattle(b);
  b.sides[1].units[0].statuses.burn={until:b.tick+5,amount:24,baseAmount:24,stacks:1,sourceId:b.sides[0].units[0].id};
  const expected=structuredClone(state);
  const loaded=validateSave(structuredClone(state));assert.deepEqual(loaded,expected);
  const copy=validateSave(structuredClone(loaded));for(let i=0;i<20;i++){stepBattle(loaded.battle);stepBattle(copy.battle);}
  assert.deepEqual(loaded,copy);
  const bad=structuredClone(state);bad.rulesVersion=RULES_VERSION+1;assert.throws(()=>validateSave(bad));
});
