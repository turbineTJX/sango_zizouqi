import {syncFixtureLearning} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {stepBattle,lockDeployment,validateSave,unitAttributes} from '../engine.mjs';
import {TACTICS_BOOK,unitTactics,setStatus,hasStatus,statusPower} from '../tactics.mjs';
import {powerFactor,effectChance,criticalChance,powerDuration} from '../tactic-power.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';

function scene(skill,seed=71,force=100,intellect=100){
 const type={'unique-person-433':'halberd',repeat:'crossbow',ward:'spear',phalanx:'spear',bulwark:'halberd'}[skill];
 const entry=(id,type)=>({id,type,troops:3000,level:1,retreatAt:null});
 const state=createScenario('custom-battle',seed,20,null,{seed,terrain:'land',ownTeam:[entry(skill==='repeat'?'person-186':'person-433',type)],enemyTeam:[entry('shao','spear')]});
 const b=state.battle;lockDeployment(b);const u=b.sides[0].units[0],d=b.sides[1].units[0];
 for(const v of [u,d]){v.cooldown=999;v.intent=0;v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));setStatus(b,v,'root',999);}
 Object.assign(u,{force,intellect,x:4,y:3,commandBonus:0,deputyBonus:0,advisorBonus:0});Object.assign(d,{x:skill==='repeat'?6:5,y:3});
 primeTactic(u,skill);return {state,b,u,d};
}

const cast=x=>{stepBattle(x.b);return x.b.effects.filter(e=>e.from===x.u.id&&!e.ongoing);};

test('every tactic declares its actual power, chance effects and critical policy',()=>{
 for(const s of Object.values(TACTICS_BOOK)){
  assert.equal(s.power.attribute,s.category==='politics'?'supportPower':s.category==='intellect'?'strategyPower':'martialPower',s.id);
  assert.equal(typeof s.power.critical,'boolean');assert.ok(s.passive||s.powerDescription.includes(s.power.name));
 }
 assert.equal(powerFactor(280),1);assert.equal(powerFactor(0),.7);assert.equal(powerFactor(10000),1.6);
 assert.equal(effectChance(10000,0),.95);assert.equal(effectChance(0,10000),.25);
 assert.ok(effectChance(400,100)>effectChance(100,100));assert.ok(effectChance(280,50)>effectChance(280,200));
 assert.ok(criticalChance(400)>criticalChance(100));assert.equal(criticalChance(10000),.3);
});

test('defensive status magnitude snapshots martial power and ignores intellect',()=>{
 function run(force,intellect){const x=scene('bulwark',71,force,intellect),p=statusPower(x.u,TACTICS_BOOK.bulwark,x.b);cast(x);const potency=x.u.statuses.bulwark.potency;assert.equal(potency,powerFactor(p));x.u.force=0;assert.equal(x.u.statuses.bulwark.potency,potency);return potency;}
 assert.ok(run(100,0)>run(0,100));assert.equal(run(100,0),run(100,100));
});

test('control succeeds and fails through real casts, pays cooldown, and reports actual chance',()=>{
 let success=0,failure=0;
 for(let i=1;i<=48;i++){
  const x=scene('ward',Math.imul(i,2654435761)>>>0),p=statusPower(x.u,TACTICS_BOOK.ward,x.b),r=unitAttributes(x.d,x.b).discipline;
  const intent=x.u.intent,events=cast(x),roll=events.find(e=>e.resolution)?.resolution;
  assert.ok(roll);assert.equal(roll.chance,effectChance(p,r));
  assert.equal(hasStatus(x.b,x.d,'taunt'),roll.success);assert.equal(x.u.tacticCasts.ward,1);
  assert.equal(x.u.skillReady.ward,x.b.tick+TACTICS_BOOK.ward.cooldown);assert.equal(x.u.intent,intent-TACTICS_BOOK.ward.intentCost);
  const row=events.find(e=>e.outcome).outcome.find(t=>t.id===x.d.id);
  assert.ok(row.changes.some(s=>s.includes(roll.success?'判定成功':'未成功')));
  if(roll.success)success++;else{failure++;assert.ok(!events.some(e=>e.combo));}
 }
 assert.ok(success>0&&failure>0);
});

test('resolve blocks control and outcome never claims an applied status',()=>{
 const x=scene('unique-person-433');setStatus(x.b,x.d,'resolve',20);const events=cast(x),roll=events.find(e=>e.resolution).resolution;
 assert.deepEqual(roll,{effect:'confuse',chance:0,success:false,immune:true});assert.ok(!hasStatus(x.b,x.d,'taunt'));
 assert.ok(events.find(e=>e.outcome).outcome.find(t=>t.id===x.d.id).changes.some(s=>s.includes('免疫')));
});

test('multi-hit burst shares one power-dependent critical roll per target',()=>{
 let critical=0,normal=0;
 for(let i=1;i<=48;i++){
  const x=scene('repeat',Math.imul(i,2654435761)>>>0),p=statusPower(x.u,TACTICS_BOOK.repeat,x.b),hp=x.d.hp;
  const events=cast(x),hits=events.filter(e=>e.damage>0&&e.to===x.d.id);
  assert.equal(hits.length,2);assert.equal(hits[0].critical,hits[1].critical);
  assert.equal(hits[0].critChance,criticalChance(p));assert.equal(hits.reduce((n,e)=>n+e.damage,0),hp-x.d.hp);
  if(hits[0].critical)critical++;else normal++;
 }
 assert.ok(critical>0&&normal>0);
 const x=scene('phalanx');assert.ok(cast(x).every(e=>e.critical===undefined));
});

test('control duration grows with power and potency remains bounded',()=>{
 assert.ok(powerDuration(8,560)>powerDuration(8,80));
 for(const skill of ['phalanx','bulwark']){const x=scene(skill,71,10000);cast(x);assert.equal(x.u.statuses[skill].potency,1.6);assert.ok(unitAttributes(x.u,x.b).damageReduction<1);}
});

test('current saves resume identical probability rolls and reject malformed event probabilities',()=>{
 const state=createScenario('field',19),b=state.battle;lockDeployment(b);
 for(let i=0;i<250&&!b.result&&!b.effects.some(e=>e.resolution||e.critChance);i++)stepBattle(b);
 const event=b.effects.find(e=>e.resolution||e.critChance);assert.ok(event);
 const resumed=validateSave(structuredClone(syncFixtureLearning(state)));
 const invalid=structuredClone(state),e=invalid.battle.effects.find(e=>e.resolution||e.critChance);
 if(e.resolution)e.resolution.chance=2;else e.critChance=2;
 assert.throws(()=>validateSave(invalid));
 while(!b.result){stepBattle(b);stepBattle(resumed.battle);}
 assert.deepEqual(resumed.battle,b);
});
