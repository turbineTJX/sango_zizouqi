import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, orderArmy, advanceTurn, startBattle, lockDeployment, stepBattle, issueCommand, validateSave, configureUnitTactics, STRATAGEMS } from '../engine.mjs';
import { TACTICS_BOOK, unitTactics, availableTactics, defaultTacticIds, configureTactics, hasStatus, readyTactic } from '../tactics.mjs';
function encounter(leader='cao',advisor='jia') {const state=newGame();state.armies[0].leader=leader;state.armies[0].advisor=advisor;orderArmy(state,'a1','guandu');advanceTurn(state);startBattle(state);return state;}
function scenario(type,id) {
  const state=encounter(),b=state.battle,a=b.sides[0].units[0],d=b.sides[1].units[0];
  b.sides[0].units=[a];b.sides[1].units=[d];a.type=type;d.type='crossbow';
  Object.assign(a,{x:4,y:3,cooldown:999,intent:100});Object.assign(d,{x:6,y:3,cooldown:999,intent:80});
  const ids=[id,...availableTactics(a).map(s=>s.id).filter(key=>key!==id).slice(0,2)];configureTactics(a,ids);
  for(const s of unitTactics(a))a.skillReady[s.id]=s.id===id?0:999;
  for(const s of unitTactics(d))d.skillReady[s.id]=999;
  lockDeployment(b);return {state,b,a,d};
}
function complete(x) {const count=x.a.skillCasts;for(let i=0;i<12&&x.a.skillCasts===count;i++)stepBattle(x.b);assert.equal(x.a.skillCasts,count+1);}
function ally(x) {const u={...structuredClone(x.a),id:'ally',x:3,y:3,intent:0,hp:1500,battleDamage:x.a.maxHp-1500,cast:null,statuses:{}};u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));x.b.sides[0].units.push(u);return u;}

test('each troop has exactly six tools and exclusive tactics remain optional',()=>{
  for(const type of ['spear','archer','cavalry','crossbow']) {
    const skills=availableTactics({id:'ordinary-test',type});assert.equal(skills.length,6);

    assert.equal(skills.filter(s=>s.category==='force').length,3);assert.equal(skills.filter(s=>s.category==='intellect').length,3);
  }
  assert.equal(availableTactics({id:'jia',type:'crossbow'}).filter(s=>s.special).length,1);
});
test('mixed defaults persist, slot priority works and invalid loadouts fail without mutation',()=>{
  const state=newGame(),u=state.armies[0].units[0];const ids=['doubt','thrust','ward'];
  assert.equal(configureUnitTactics(state,u.id,ids),null);assert.deepEqual(u.tactics,ids);
  for(const bad of [['thrust','thrust','ward'],['fire','thrust','ward'],['terror','thrust','ward'],['thrust']])assert.ok(configureUnitTactics(state,u.id,bad));
  assert.deepEqual(u.tactics,ids);
  const resumed=validateSave(structuredClone(state));orderArmy(resumed,'a1','guandu');advanceTurn(resumed);startBattle(resumed);
  const a=resumed.battle.sides[0].units[0];assert.deepEqual(a.tactics,ids);
  assert.equal(configureUnitTactics(resumed,a.id,['thrust','doubt','ward']),null);
  assert.deepEqual(resumed.armies[0].units[0].tactics,['thrust','doubt','ward']);
  lockDeployment(resumed.battle);assert.ok(configureUnitTactics(resumed,a.id,ids));
  const broken=structuredClone(resumed);broken.armies[0].units[0].tactics=['fire','doubt','ward'];assert.throws(()=>validateSave(broken));
  const x=scenario('spear','ward');x.a.tactics=['ward','thrust','doubt'];x.a.skillReady={};x.d.x=5;
  assert.equal(readyTactic(x.b,x.a,1).skill.id,'ward');
});
test('force and intellect damage scale with their own attribute, not troop weapon type',()=>{
  function damage(id,force,intellect){const x=scenario('archer',id);x.a.force=force;x.a.intellect=intellect;const hp=x.d.hp;complete(x);return hp-x.d.hp;}
  assert.ok(damage('fire',95,20)>damage('fire',25,95));
  assert.ok(damage('wildfire',20,95)>damage('wildfire',95,25));
});
test('confusion and seal prevent immediate skills while seal still permits basic attacks',()=>{
  const x=scenario('archer','smoke');x.d.skillReady.repeat=0;stepBattle(x.b);
  assert.ok(hasStatus(x.b,x.d,'confuse'));assert.equal(x.d.skillCasts,0);assert.equal(x.d.cast,null);
  assert.ok(x.b.effects.some(e=>e.text==='混乱'));
  const y=scenario('crossbow','seal');y.d.skillReady.repeat=0;y.d.cooldown=0;stepBattle(y.b);
  assert.ok(hasStatus(y.b,y.d,'seal'));assert.equal(y.d.skillCasts,0);
  assert.ok(y.b.effects.some(e=>e.from===y.d.id&&!e.skill&&e.damage>0));
  assert.equal(readyTactic(y.b,y.d,4),null);
});
test('intellect support tactics rally, taunt, cleanse, shield and shorten allied cooldowns',()=>{
  const r=scenario('archer','rally'),ra=ally(r);complete(r);assert.ok(ra.intent>0);assert.equal(r.a.intent,100);
  const w=scenario('spear','ward'),wa=ally(w);complete(w);assert.ok(hasStatus(w.b,w.d,'taunt'));assert.equal(w.d.statuses.taunt.sourceId,w.a.id);assert.ok(!hasStatus(w.b,wa,'ward'));
  const c=scenario('spear','cleanse'),ca=ally(c);ca.statuses.slow={until:99};complete(c);assert.equal(ca.statuses.slow,undefined);assert.ok(hasStatus(c.b,ca,'shield'));
  const s=scenario('crossbow','screen'),sa=ally(s);complete(s);assert.ok(hasStatus(s.b,sa,'shield'));
  const p=scenario('cavalry','relay'),pa=ally(p);pa.statuses.phalanx={until:99};complete(p);assert.ok(Object.values(pa.skillReady).every(t=>t<999));assert.ok(hasStatus(p.b,pa,'haste'));
});
test('cavalry schemes induce real movement and suppress intent immediately',()=>{
  const l=scenario('cavalry','lure');complete(l);assert.equal(l.d.x,5);assert.ok(hasStatus(l.b,l.d,'armorBreak'));
  const h=scenario('cavalry','harass');stepBattle(h.b);
  assert.ok(h.d.intent<80);assert.ok(hasStatus(h.b,h.d,'weaken'));assert.equal(h.a.skillCasts,1);assert.equal(h.a.cast,null);
});
test('new army strategies cleanse controls, shorten cooldowns and persist across saves',()=>{
  const state=encounter('liao','yu'),b=state.battle;lockDeployment(b);const u=b.sides[0].units[0];
  const skillId=unitTactics(u)[0].id;
  u.statuses.confuse={until:99};u.statuses.burn={until:99,sourceId:b.sides[1].units[0].id,amount:20,baseAmount:20,stacks:1};u.skillReady[skillId]=20;
  b.commandProgress=12000;assert.equal(issueCommand(b,'cleanse'),null);assert.equal(u.statuses.confuse,undefined);assert.equal(u.statuses.burn,undefined);assert.ok(hasStatus(b,u,'resolve'));
  b.commandProgress=12000;assert.equal(issueCommand(b,'cycle'),null);assert.equal(u.skillReady[skillId],14);assert.equal(b.commandProgress,0);
  b.commandProgress=12000;assert.equal(issueCommand(b,'haste'),null);assert.equal(b.commandProgress,0);assert.ok(b.sides[0].hasteUntil>0);
  const copy=validateSave(structuredClone(state));assert.deepEqual(copy.battle,b);
});
test('blockade delays replacement but expires; relief admits a healthier reserve rotation with shield',()=>{
  const state=encounter(),b=state.battle;lockDeployment(b);
  b.commandProgress=12000;assert.equal(issueCommand(b,'blockade'),null);
  const dead=b.sides[1].units.find(u=>u.status==='active');dead.hp=0;dead.status='defeated';stepBattle(b);
  assert.equal(b.sides[1].units.filter(u=>u.status==='active').length,5);
  while(b.tick<=STRATAGEMS.blockade.duration)stepBattle(b);
  assert.equal(b.sides[1].units.filter(u=>u.status==='active').length,6);
  const other=encounter('jin','jia'),ob=other.battle;lockDeployment(ob);ob.sides[0].units[0].hp=2400;
  ob.commandProgress=12000;assert.ok(issueCommand(ob,'reserve'));assert.equal(issueCommand(ob,'relief'),null);ob.commandProgress=12000;assert.equal(issueCommand(ob,'reserve'),null);
  assert.ok(ob.sides[0].units.some(u=>u.status==='active'&&u.statuses.shield));
});
test('mixed-loadout simulation saves and resumes deterministically with all new status shapes',()=>{
  const state=encounter();
  for(const side of state.battle.sides)for(const u of side.units)configureTactics(u,defaultTacticIds(u,'intellect'));
  for(let i=0;i<35;i++)stepBattle(state.battle);
  const copy=validateSave(structuredClone(state));
  for(let i=0;i<25;i++){stepBattle(state.battle);stepBattle(copy.battle);}
  assert.deepEqual(state.battle,copy.battle);
  while(!state.battle.result){stepBattle(state.battle);validateSave(structuredClone(state));}
  assert.ok(state.battle.tick<=240);
});
