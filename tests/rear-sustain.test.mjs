import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {TACTICS_BOOK,tacticTarget,unitTactics,setStatus,shieldAmount} from '../tactics.mjs';
function scene(id='cleave',side=0){
 const entry=(id,type,troops)=>({id,type,troops,level:1});
 const teams=[[entry(id==='unique-person-396'?'person-396':'person-433',id==='unique-person-396'?'cavalry':'halberd',4000)],[entry('shao','spear',3000),entry('tian','archer',1500)]];
 const state=createScenario('custom-battle',765,20,null,{seed:765,terrain:'land',ownTeam:teams[side],enemyTeam:teams[1-side]});
 const b=state.battle;lockDeployment(b);const u=b.sides[side].units[0], [front,rear]=b.sides[1-side].units;
 for(const v of b.sides.flatMap(s=>s.units)){v.cooldown=999;v.intent=0;v.skillReady=Object.fromEntries(unitTactics(v).map(t=>[t.id,999]));}
 Object.assign(u,{x:4,y:3,intent:100});Object.assign(front,{x:5,y:3});Object.assign(rear,{x:8,y:3});
 u.skillReady[id]=0;return {state,b,u,front,rear};
}
test('rear priority respects range, fallback, stasis and melee interception',()=>{
 const {b,u,front,rear}=scene();u.type='crossbow';front.x=6;
 for(const id of ['repeat','bombard','unique-person-186']){
  assert.equal(tacticTarget(b,u,TACTICS_BOOK[id],4),rear,id);
  rear.statuses.stasis={until:100};assert.equal(tacticTarget(b,u,TACTICS_BOOK[id],4),front);delete rear.statuses.stasis;
  rear.x=12;assert.equal(tacticTarget(b,u,TACTICS_BOOK[id],4),front);rear.x=8;
 }
 front.x=5;rear.x=5;assert.equal(tacticTarget(b,u,TACTICS_BOOK.repeat,4),null);
 rear.x=8;u.type='spear';assert.equal(tacticTarget(b,u,TACTICS_BOOK['unique-person-186'],1),front);
});
for(const side of [0,1])test('actual fixed halberd cast heals real wounds and grants bounded shield on either side '+side,()=>{
 const {state,b,u}=scene('cleave',side);u.hp-=1000;u.battleDamage=1000;
 const before=u.hp;stepBattle(b);
 assert.equal(u.tacticCasts.cleave,1);const damage=b.effects.filter(e=>e.from===u.id&&e.damage>0&&!e.ongoing).reduce((n,e)=>n+e.damage,0);
 assert.ok(damage>0);assert.equal(u.hp-before,Math.min(350,Math.floor(Math.min(u.maxHp*.08,damage*.3))));
 assert.equal(shieldAmount(b,u),Math.min(Math.floor(u.maxHp*.08),Math.floor(damage*.25)));
 const copy=validateSave(structuredClone(state));for(let i=0;i<8;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(b,copy.battle);
});
test('absorbed damage gives no recovery or shield; no wounded soldiers means no healing',()=>{
 const x=scene();setStatus(x.b,x.front,'shield',8,{amount:x.front.maxHp,source:'test'});stepBattle(x.b);
 assert.equal(x.u.tacticCasts.cleave,1);assert.equal(shieldAmount(x.b,x.u),0);assert.equal(x.u.healed||0,0);
 const y=scene();stepBattle(y.b);assert.equal(y.u.healed||0,0);assert.ok(shieldAmount(y.b,y.u)>0);
});
test('Zhao Yun uses fixed special at two cells without sustain, adjacent hits gain sustain',()=>{
 for(const gap of [1,2]){const {b,u,front}=scene('unique-person-396');front.x=u.x+gap;u.hp-=1000;u.battleDamage=1000;stepBattle(b);assert.equal(u.tacticCasts['unique-person-396'],1);assert.equal(shieldAmount(b,u)>0,gap===1);assert.equal((u.healed||0)>0,gap===1);}
});
test('taunt overrides ranged rear preference and real two-shot cast hits selected rear',()=>{
 const x=scene();x.u.type='crossbow';x.front.x=6;
 setStatus(x.b,x.u,'taunt',6,{sourceId:x.front.id});assert.equal(tacticTarget(x.b,x.u,TACTICS_BOOK.repeat,4),x.front);
 const entry=(id,type,troops)=>({id,type,troops,level:1});const s=createScenario('custom-battle',12,20,null,{seed:12,terrain:'land',ownTeam:[entry('person-186','crossbow',3000)],enemyTeam:[entry('shao','spear',3000),entry('tian','archer',1500)]});const b=s.battle;lockDeployment(b);const u=b.sides[0].units[0],[f,r]=b.sides[1].units;
 for(const v of [u,f,r]){v.intent=0;v.cooldown=999;v.skillReady=Object.fromEntries(unitTactics(v).map(t=>[t.id,999]));}
 Object.assign(u,{x:4,y:3,intent:100});Object.assign(f,{x:6,y:3});Object.assign(r,{x:8,y:3});u.skillReady.repeat=0;
 stepBattle(b);assert.equal(u.tacticCasts.repeat,1);const hits=b.effects.filter(e=>e.from===u.id&&e.damage>0);assert.equal(hits.length,2);assert.ok(hits.every(e=>e.to===r.id));
});
test('sustain respects real wounds, plague, lethal overkill and per-cast cap',()=>{
 const x=scene();x.u.hp-=1000;x.u.battleDamage=1000;setStatus(x.b,x.u,'plague',6,{amount:0,sourceId:x.front.id});x.front.hp=1;
 stepBattle(x.b);assert.equal(x.u.healed||0,0);assert.equal(shieldAmount(x.b,x.u),0,'one casualty cannot produce rounded-up sustain');
 const y=scene();y.u.hp-=1000;y.u.battleDamage=1000;y.u.force=10000;stepBattle(y.b);assert.ok((y.u.healed||0)<=y.u.maxHp*.08);assert.ok(shieldAmount(y.b,y.u)<=y.u.maxHp*.08);
});
