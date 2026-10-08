import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,issueCommand,COMMAND_RESOURCE,battleStratagemSource} from '../engine.mjs';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';
import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {sideBonds,bondAttributes,bondDamage,bondDamageImmunity,bondBlocksEffect,bondSource} from '../bonds.mjs';
import {setStatus,hasStatus,shieldAmount,unitTactics} from '../tactics.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {inspectionStatuses} from '../status-display.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';

const id=name=>Object.values(O).find(u=>u.name===name).id;
const full=['吕布','赵云','典韦','许褚','马超'];
function scene(names=full,side=0,type='archer',foes=['曹操','袁绍','田丰','郭嘉']){
 const team=names=>names.map(name=>({id:id(name),type,troops:4000,level:10}));
 const state=createScenario('custom-battle',9401,20,null,{seed:9401,terrain:'land',ownTeam:team(side?foes:names),enemyTeam:team(side?names:foes)});
 const b=state.battle;lockDeployment(b);
 for(const v of b.sides.flatMap(s=>s.units)){v.cooldown=999;v.intent=0;v.retreatAt=null;v.statuses.root={until:999};v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));}
 const us=b.sides[side].units,enemies=b.sides[1-side].units,u=us[0],enemy=enemies[0];
 us.forEach((v,i)=>Object.assign(v,{x:i?0:4,y:i?i:3}));enemies.forEach((v,i)=>Object.assign(v,{x:i?13:6,y:i?i:3}));
 u.intent=90;enemy.intent=60;return {state,b,u,us,enemy,enemies,side};
}
const damageTo=(x,u=x.u)=>x.b.effects.filter(e=>e.to===u.id&&e.damage>0).reduce((n,e)=>n+e.damage,0);

test('Valor tiers compare live intent strictly and replace passive power and speed bonuses',()=>{
 const teams=[['吕布'],['吕布','赵云','典韦'],full];
 for(const side of [0,1])for(let i=0;i<teams.length;i++){
  const x=scene(teams[i],side);assert.equal(sideBonds(x.b,side).bondValor.tier,i+1);
  assert.equal(bondDamageImmunity(x.b,x.u,x.enemy),[.3,.45,1][i]);
  assert.equal(bondDamage(x.b,x.u,x.enemy,'basic'),[1.15,1.25,1.35][i]);assert.equal(bondDamage(x.b,x.u,x.enemy,'dot'),[1.15,1.25,1.35][i]);
  assert.equal(bondAttributes(x.b,x.u).martialPower,undefined);assert.equal(bondAttributes(x.b,x.u).attackSpeed,undefined);
  x.enemy.intent=x.u.intent;assert.equal(bondDamageImmunity(x.b,x.u,x.enemy),0);assert.equal(bondDamage(x.b,x.u,x.enemy,'basic'),1);assert.equal(bondBlocksEffect(x.b,x.u,x.enemy),false);
  x.enemy.intent++;assert.equal(bondDamageImmunity(x.b,x.u,x.enemy),0);assert.equal(bondDamage(x.b,x.u,x.enemy,'basic'),1);
 }
 const x=scene();x.us[3].status='reserve';assert.equal(bondDamageImmunity(x.b,x.u,x.enemy),.45);assert.equal(bondBlocksEffect(x.b,x.u,x.enemy),false);
 x.u.status='withdrawn';assert.equal(bondDamageImmunity(x.b,x.u,x.enemy),0);
});

test('lower Valor tiers both resist and receive real basic damage with deterministic RNG',()=>{
 for(const names of [['吕布'],['吕布','赵云','典韦']]){
  let resisted=0,landed=0;
  for(let i=1;i<=32;i++){
   const x=scene(names);x.b.seed=Math.imul(i,134775813)>>>0;x.enemy.cooldown=0;stepBattle(x.b);
   if(damageTo(x)===0){resisted++;assert.ok(x.b.effects.some(e=>e.to===x.u.id&&e.text==='勇武 · 伤害免疫'));}else landed++;
  }
  assert.ok(resisted>0&&landed>0);
 }
});

test('full Valor blocks real attacks on both sides only when source intent is strictly lower',()=>{
 for(const side of [0,1])for(const intent of [89,90,91]){
  const x=scene(full,side);x.enemy.intent=intent;x.enemy.cooldown=0;stepBattle(x.b);
  assert.equal(damageTo(x)===0,intent===89);
  assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
 }
});

test('Valor damage amplification affects actual basic and ongoing damage without increasing unit stats',()=>{
 for(const names of [['吕布'],['吕布','赵云','典韦'],full]){
  const x=scene(names);x.u.cooldown=0;const baseline=structuredClone(x.state);
  for(const u of baseline.battle.sides[0].units)delete u.bondGrowth.levels.bondValor;
  stepBattle(x.b);stepBattle(baseline.battle);
  const own=x.b.effects.find(e=>e.from===x.u.id&&e.to===x.enemy.id&&e.damage>0).damage;
  const base=baseline.battle.effects.find(e=>e.from===x.u.id&&e.to===x.enemy.id&&e.damage>0).damage;
  const tier=sideBonds(x.b,0).bondValor.tier;assert.ok(Math.abs(own/base-(1+D.bondValor.values[tier-1]))<.02);
  const dot=scene(names);setStatus(dot.b,dot.enemy,'burn',4,{sourceId:dot.u.id,sourceName:dot.u.name,sourceSkillName:'火攻',amount:100});stepBattle(dot.b);
  assert.equal(damageTo(dot,dot.enemy),Math.round(100*(1+D.bondValor.values[tier-1])));
 }
});

test('full Valor suppresses existing harmful statuses and ongoing damage while retaining shields',()=>{
 const x=scene();x.enemy.intent=100;
 const source={sourceId:x.enemy.id,sourceName:x.enemy.name,sourceSkillName:'火攻'};
 setStatus(x.b,x.u,'burn',8,{...source,amount:100});setStatus(x.b,x.u,'weaken',8,source);
 setStatus(x.b,x.u,'shield',8,{...source,amount:200,source:'test',label:'敌方护盾'});
 x.enemy.intent=60;const before=x.u.hp;stepBattle(x.b);assert.equal(x.u.hp,before);assert.equal(hasStatus(x.b,x.u,'weaken'),false);assert.equal(shieldAmount(x.b,x.u),200);
 assert.ok(!inspectionStatuses(x.b,x.u).some(s=>['burn','weaken'].includes(s.key)));assert.ok(inspectionStatuses(x.b,x.u).some(s=>s.key==='shield'));
 x.enemy.intent=x.u.intent;assert.ok(hasStatus(x.b,x.u,'weaken'));assert.equal(shieldAmount(x.b,x.u),200);assert.ok(inspectionStatuses(x.b,x.u).some(s=>s.key==='shield'));
 stepBattle(x.b);assert.equal(x.u.hp,before);assert.equal(shieldAmount(x.b,x.u),100);
 assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
});

test('full Valor rejects low-source harmful effects but preserves all beneficial, self and source-free effects',()=>{
 const x=scene(),low=x.us[1];low.intent=20;
 for(const key of ['confuse','weaken'])assert.equal(setStatus(x.b,x.u,key,4,{sourceId:low.id,amount:100}),false);
 for(const key of ['regrowth','haste']){setStatus(x.b,x.u,key,4,{sourceId:low.id,amount:100});assert.ok(hasStatus(x.b,x.u,key));}
 setStatus(x.b,x.u,'shield',4,{sourceId:low.id,amount:100,source:'test',label:'护盾'});assert.equal(shieldAmount(x.b,x.u),100);
 assert.equal(setStatus(x.b,x.u,'valor',4,{sourceId:x.u.id}),undefined);assert.ok(hasStatus(x.b,x.u,'valor'));
 setStatus(x.b,x.u,'weaken',4);assert.ok(hasStatus(x.b,x.u,'weaken'));
 low.intent=x.u.intent;setStatus(x.b,x.u,'shield',4,{sourceId:low.id,amount:100,source:'test',label:'护盾'});assert.equal(shieldAmount(x.b,x.u),100);
 low.intent=20;assert.equal(shieldAmount(x.b,x.u),100);
});

test('full Valor blocks actual hostile tactics and their secondary effects without refunding casts',()=>{
 for(const skill of ['ward','thrust']){
  const x=scene(full,0,'spear'),caster=x.enemies[1];Object.assign(caster,{x:5,y:3,intent:60});primeTactic(caster,skill);
  stepBattle(x.b);assert.equal(caster.tacticCasts[skill],1);assert.equal(damageTo(x),0);assert.equal(hasStatus(x.b,x.u,'taunt'),false);
 }
 const x=scene(),caster=x.enemies[3];Object.assign(caster,{x:6,y:3,intent:60});primeTactic(caster,'undermine');stepBattle(x.b);
 assert.equal(caster.tacticCasts.undermine,1);assert.equal(x.u.intent,90);assert.equal(hasStatus(x.b,x.u,'weaken'),false);assert.equal(hasStatus(x.b,x.u,'intentSuppression'),false);
});

test('full Valor retains real friendly treatment and buffs at both lower and equal intent',()=>{
 for(const intent of [60,90]){
  const x=scene([...full,'刘备']),caster=x.us[5];Object.assign(caster,{x:3,y:3,intent});x.u.hp-=600;x.u.battleDamage=600;
  primeTactic(caster,'unique-person-636');const before=x.u.hp;stepBattle(x.b);assert.equal(caster.tacticCasts['unique-person-636'],1);
  assert.ok(x.u.hp>before||shieldAmount(x.b,x.u)>0||hasStatus(x.b,x.u,'regrowth'));
 }
});

test('full Valor checks actual source intent for hostile area commands and can admit it at equal intent',()=>{
 const x=scene(full,0,'archer',['田丰','袁绍','司马懿','郭嘉']),p=battleStratagemSource(x.b,'disrupt',1);assert.ok(p);const caster=bondSource(x.b,p);caster.intent=20;
 x.b.enemyCommand.commandProgress=COMMAND_RESOURCE.capacity;const point={x:x.u.x,y:x.u.y};assert.ok(issueCommand(x.b,'disrupt',point,1));assert.equal(hasStatus(x.b,x.u,'stun'),false);assert.equal(x.b.enemyCommand.commandProgress,COMMAND_RESOURCE.capacity);
 caster.intent=x.u.intent;assert.equal(issueCommand(x.b,'disrupt',point,1),null);assert.ok(hasStatus(x.b,x.u,'stun'));
});

test('Valor immunity rolls and preserved low-intent buffs resume identically from current saves',()=>{
 for(const names of [['吕布'],full]){
  const x=scene(names);x.enemy.cooldown=0;x.u.cooldown=0;
  const copy=validateSave(structuredClone(x.state));for(let i=0;i<20&&!x.b.result;i++){stepBattle(x.b);stepBattle(copy.battle);}assert.deepEqual(x.state,copy);
 }
 const x=scene();x.us[1].intent=100;setStatus(x.b,x.u,'shield',8,{sourceId:x.us[1].id,amount:200,source:'support',label:'友军护盾'});x.us[1].intent=20;
 const copy=validateSave(structuredClone(x.state));stepBattle(x.b);stepBattle(copy.battle);assert.deepEqual(x.state,copy);
 assert.equal(shieldAmount(x.b,x.u),200);
});

test('full Valor blocks low-intent retaliation; six slots cannot also fit full Peach',()=>{
 const x=scene();Object.assign(x.enemy,{x:5,y:3});setStatus(x.b,x.enemy,'riposte',8,{lastTick:0});x.u.cooldown=0;stepBattle(x.b);
 assert.equal(damageTo(x),0);assert.ok(x.b.effects.some(e=>e.from===x.enemy.id&&e.to===x.u.id&&e.text==='勇武 · 伤害免疫'));
 const y=scene(['吕布','赵云','典韦','张飞','刘备','关羽']);assert.equal(sideBonds(y.b,0).bondValor.tier,2);
 const victim=y.us[4];Object.assign(victim,{x:6,y:3});Object.assign(y.enemy,{x:8,y:3,cooldown:0});y.b.sides[1].focus=victim.id;y.b.sides[1].focusUntil=999;
 stepBattle(y.b);assert.equal(damageTo(y),0);assert.ok(damageTo(y,victim)>0);assert.equal(sideBonds(y.b,0).bondPeach.tier,3);assert.ok(damageTo(y,y.us[3])>0);assert.ok(damageTo(y,y.us[5])>0);
});

test('lower Valor tiers immunize damage without also blocking the attack orb status',()=>{
 const prior=D.bondValor.immunityChance;D.bondValor.immunityChance=[1,1,1];
 try{
  const x=scene(['吕布'],0,'archer',['黄忠','袁绍','田丰','郭嘉']);primeTactic(x.enemy,'fire');stepBattle(x.b);assert.equal(x.enemy.tacticCasts.fire,1);assert.ok(hasStatus(x.b,x.enemy,'attackOrb'));
  x.enemy.cooldown=0;stepBattle(x.b);assert.equal(damageTo(x),0);assert.ok(hasStatus(x.b,x.u,'burn'),JSON.stringify({action:x.enemy.action,orb:x.enemy.statuses.attackOrb,effects:x.b.effects}));assert.equal(bondBlocksEffect(x.b,x.u,x.enemy),false);
 }finally{D.bondValor.immunityChance=prior;}
});
