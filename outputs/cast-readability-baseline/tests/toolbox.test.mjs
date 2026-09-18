import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,validateSave,unitAttributes} from '../engine.mjs';
import {availableTactics,configureTactics,unitTactics,TACTIC_ROLES,roleTacticIds,hasStatus,tacticTarget,TACTICS_BOOK,shieldAmount} from '../tactics.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';

function scene(type='spear') {
  const state=createScenario('field',19),b=state.battle,a=b.sides[0].units[0],d=b.sides[1].units[0];
  b.sides[0].units=[a];b.sides[1].units=[d];
  Object.assign(a,{type,x:4,y:3,intent:0,cooldown:999});Object.assign(d,{x:5,y:3,intent:0,cooldown:999});
  configureTactics(a,roleTacticIds(a,'assault'));
  for(const u of [a,d])u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));
  lockDeployment(b);return {state,b,a,d};
}

test('all 160 core combinations are legal; every officer has all three role options',()=>{
  for(const type of Object.keys(TACTIC_ROLES)) {
    const u={id:'ordinary',type},pool=availableTactics(u);assert.equal(pool.length,6);
    let count=0;
    for(let i=0;i<4;i++)for(let j=i+1;j<5;j++)for(let k=j+1;k<6;k++){
      assert.equal(configureTactics(u,[pool[i].id,pool[j].id,pool[k].id]),null);count++;
    }
    assert.equal(count,20);assert.ok(pool.every(s=>s.role&&s.tradeoff));
    for(const id of ['person-99','person-381','ordinary'])for(const r of TACTIC_ROLES[type])assert.equal(configureTactics({...u,id},r.ids),null);
  }
  const x=scene();assert.ok(configureTactics(x.a,['press','thrust','ward']));
  const old=structuredClone(x.state);old.rulesVersion=9;assert.throws(()=>validateSave(old),/重新开始/);
});

test('positioning targets real columns and clustered enemies and always includes the anchor',()=>{
  const x=scene('archer');x.d.x=8;
  const near={...structuredClone(x.d),id:'near',x:5,y:1};
  const cluster={...structuredClone(x.d),id:'cluster',x:8,y:4};x.b.sides[1].units.unshift(near);x.b.sides[1].units.push(cluster);
  const target=tacticTarget(x.b,x.a,TACTICS_BOOK.wildfire,4);assert.equal(target.id,'cluster');
  primeTactic(x.a,'wildfire');stepBattle(x.b);
  const hits=x.b.effects.filter(e=>e.from===x.a.id&&e.damage>0).map(e=>e.to);
  assert.ok(hits.includes(target.id));assert.ok(hits.includes(x.d.id));assert.ok(!hits.includes(near.id));
});

test('allied slow enables a real spear finisher, with no intent or target bypass',()=>{
  function run(slow){const x=scene();if(slow)x.d.statuses.slow={until:9};primeTactic(x.a,'strike');stepBattle(x.b);return x.b.effects.find(e=>e.from===x.a.id&&e.damage>0).damage;}
  assert.ok(run(true)>run(false)*1.4);
});

test('fire preparation increases wildfire direct hits without replacing a stronger burn',()=>{
  function run(burning){const x=scene('archer');if(burning)x.d.statuses.burn={until:10,amount:30,baseAmount:30,stacks:1,sourceId:x.a.id};primeTactic(x.a,'wildfire');stepBattle(x.b);return {damage:x.b.effects.find(e=>e.from===x.a.id&&e.skill&&e.damage>0).damage,burn:x.d.statuses.burn};}
  const base=run(false),lit=run(true);assert.ok(lit.damage>base.damage*1.4);assert.equal(lit.burn.baseAmount,30);assert.equal(lit.burn.amount,60);assert.equal(lit.burn.stacks,2);assert.equal(lit.burn.until,10);
});

test('low-intellect guards retain mitigation and suppression; their support casts deal no damage',()=>{
  const x=scene('cavalry');x.a.intellect=1;primeTactic(x.a,'gallop');stepBattle(x.b);
  assert.equal(unitAttributes(x.a,x.b).damageReduction,.25);assert.ok(!hasStatus(x.b,x.a,'haste'));
  assert.equal(x.d.hp,x.d.maxHp);
  primeTactic(x.a,'harass');stepBattle(x.b);assert.ok(hasStatus(x.b,x.d,'weaken'));
  assert.equal(x.d.hp,x.d.maxHp);assert.equal(x.a.tacticCasts.harass,1);
});

test('cavalry offensive stance increases basic attack at the cost of real defense',()=>{
  const x=scene('cavalry'),before=unitAttributes(x.a,x.b);primeTactic(x.a,'valor');stepBattle(x.b);
  const after=unitAttributes(x.a,x.b);
  assert.equal(after.attack,before.attack*1.25);assert.equal(after.defense,before.defense*.8);
  assert.ok(hasStatus(x.b,x.a,'armorBreak'));assert.equal(x.d.hp,x.d.maxHp);
});

test('screen protects threatened healthy allies, respects its own layer and caps at one recipient',()=>{
  const x=scene('crossbow');x.a.intellect=1;
  const ally={...structuredClone(x.a),id:'ally',x:4,y:4};x.b.sides[0].units.push(ally);
  primeTactic(x.a,'screen');stepBattle(x.b);
  const protectedUnits=[x.a,ally].filter(u=>shieldAmount(x.b,u)>0);
  assert.equal(protectedUnits.length,1);
  assert.equal(shieldAmount(x.b,protectedUnits[0]),protectedUnits[0].maxHp*.04);
  assert.notEqual(tacticTarget(x.b,x.a,TACTICS_BOOK.screen,4)?.id,protectedUnits[0].id);
  assert.equal(x.b.effects.filter(e=>e.label===TACTICS_BOOK.screen.name&&e.text).length,1);
});

test('seal exchanges all damage for silence; ambush waits for close range',()=>{
  const x=scene('crossbow');primeTactic(x.a,'seal');stepBattle(x.b);
  assert.equal(x.d.hp,x.d.maxHp);assert.ok(hasStatus(x.b,x.d,'seal'));
  const y=scene('crossbow');y.d.x=7;primeTactic(y.a,'ambush');stepBattle(y.b);assert.equal(y.a.tacticCasts.ambush,undefined);
  y.d.x=6;stepBattle(y.b);assert.equal(y.a.tacticCasts.ambush,1);assert.ok(hasStatus(y.b,y.d,'slow'));assert.ok(hasStatus(y.b,y.d,'weaken'));
});

test('each role completes a battle and preserves deterministic continuation under current rules',()=>{
  for(const type of Object.keys(TACTIC_ROLES))for(const r of TACTIC_ROLES[type]){
    const state=createScenario(type==='ship'?'river':'field',41),b=state.battle,u=b.sides[0].units[0];
    u.type=type;assert.equal(configureTactics(u,r.ids),null);u.skillReady={};
    for(let i=0;i<30;i++)stepBattle(b);
    const copy=validateSave(structuredClone(state));
    while(!b.result){stepBattle(b);stepBattle(copy.battle);}
    assert.deepEqual(copy.battle,b);assert.ok(b.tick<=b.maxTicks);
  }
});
