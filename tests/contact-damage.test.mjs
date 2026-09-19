import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,validateSave} from '../engine.mjs';
import {hexNeighbors} from '../hex-grid.mjs';
import {configureTactics,roleTacticIds,unitTactics,TACTICS_BOOK,setStatus} from '../tactics.mjs';
import {intentIncome} from '../passives.mjs';

function scene(count=3,type='spear'){
  const state=createScenario('field',83),b=state.battle;lockDeployment(b);
  const u=b.sides[0].units[0],template=b.sides[1].units[0];
  Object.assign(u,{type,level:1,x:6,y:3,cooldown:0,intent:0,statuses:{},morale:50});
  const targets=hexNeighbors(u).slice(0,count).map(([x,y],i)=>({...structuredClone(template),id:template.id+'-'+i,name:'敌军'+i,type:'spear',level:1,x,y,cooldown:999,intent:0,statuses:{phalanx:{until:999}},morale:50}));
  b.sides[0].units=[u];b.sides[1].units=targets;
  for(const v of [u,...targets]){configureTactics(v,roleTacticIds(v,'assault'));v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));}
  return {state,b,u,targets};
}
const hits=x=>x.b.effects.filter(e=>e.from===x.u.id&&!e.skill);

test('two, three and six adjacent enemies share one normal attack budget',()=>{
  const single=scene(1);stepBattle(single.b);const full=hits(single)[0].damage;
  for(const n of [2,3,6]){
    const x=scene(n);stepBattle(x.b);
    assert.equal(hits(x).length,n);
    assert.equal(new Set(hits(x).map(e=>e.to)).size,n);
    assert.ok(hits(x).every(e=>e.damage>0&&Math.abs(e.damage-full/n)<=1));
    assert.ok(Math.abs(hits(x).reduce((sum,e)=>sum+e.damage,0)-full)<=n);
    assert.equal(x.u.intent,intentIncome(x.u).attack);
    assert.equal(x.u.morale,single.u.morale);
    assert.equal(x.u.cooldown,single.u.cooldown);
    assert.equal(x.u.passiveState.shots,1);
    assert.ok(x.targets.every(t=>t.intent===intentIncome(t).hit));
  }
});

test('focus cannot concentrate contact damage; nonadjacent enemies are not included',()=>{
  const x=scene(3);x.targets[2].x=10;x.targets[2].y=3;
  x.b.sides[0].focus=x.targets[0].id;x.b.sides[0].focusUntil=99;
  stepBattle(x.b);
  assert.deepEqual(hits(x).map(e=>e.to).sort(),x.targets.slice(0,2).map(t=>t.id).sort());
  assert.equal(x.targets[2].battleDamage,0);
});

test('minimum damage is shared rather than multiplied once per enemy',()=>{
  const single=scene(1),many=scene(6);single.u.hp=1;many.u.hp=1;
  stepBattle(single.b);stepBattle(many.b);
  assert.equal(hits(many).reduce((sum,e)=>sum+e.damage,0),hits(single)[0].damage);
});

test('ranged fire remains single-target outside contact and siege minimum range is preserved',()=>{
  for(const type of ['archer','siege']){
    const x=scene(2,type);x.targets.forEach((t,i)=>{t.x=9;t.y=3+i;});stepBattle(x.b);
    assert.equal(hits(x).length,1,type);
  }
  const x=scene(2,'siege');stepBattle(x.b);assert.equal(hits(x).length,0);
});

test('shields and different defenses resolve independently without reallocating blocked damage',()=>{
  const x=scene(3),control=scene(3);
  setStatus(x.b,x.targets[0],'shield',5,{amount:9999,source:'test',label:'护盾'});
  x.targets[1].leadership=100;
  stepBattle(x.b);stepBattle(control.b);
  assert.equal(hits(x)[0].damage,0);assert.ok(hits(x)[0].shieldAbsorbed>0);
  assert.equal(hits(x)[2].damage,hits(control)[2].damage);
  assert.ok(hits(x)[1].damage<hits(control)[1].damage);
});

test('an enchanted contact attack consumes one charge and divides extra fire damage',()=>{
  for(const n of [1,3]){
    const x=scene(n,'archer');configureTactics(x.u,['fire','scatter','suppress']);
    x.u.intent=TACTICS_BOOK.fire.threshold;x.u.skillReady.fire=0;
    stepBattle(x.b);assert.equal(x.u.statuses.attackOrb.charges,3);
    const before=x.u.intent;x.u.cooldown=0;stepBattle(x.b);
    assert.equal(hits(x).length,n);assert.equal(x.u.statuses.attackOrb.charges,2);
    assert.ok(hits(x).every(e=>e.attackOrb==='fire'&&e.orbRemaining===2));
    assert.equal(x.u.intent,before+intentIncome(x.u).attack);
    assert.ok(x.targets.every(t=>t.statuses.burn));
  }
});

test('all contact shares land before a lethal retaliation; target ordering is deterministic',()=>{
  const x=scene(3);x.u.hp=1;
  for(const t of x.targets)setStatus(x.b,t,'riposte',8,{lastTick:0});
  const reverse=structuredClone(x.state);reverse.battle.sides[1].units.reverse();
  stepBattle(x.b);stepBattle(reverse.battle);
  assert.equal(hits(x).length,3);assert.equal(x.u.status,'defeated');
  assert.deepEqual(reverse.battle.effects,x.b.effects);
});

test('current combat saves resume with exactly the same shared attacks',()=>{
  const state=createScenario('field',83);lockDeployment(state.battle);
  for(let i=0;i<20;i++)stepBattle(state.battle);
  const restored=validateSave(JSON.parse(JSON.stringify(state)));
  for(let i=0;i<30;i++){stepBattle(state.battle);stepBattle(restored.battle);}
  assert.deepEqual(restored.battle,state.battle);
});
