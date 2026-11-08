import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,validateSave,unitAttributes,makeOfficer} from '../engine.mjs';
import {TACTICS_BOOK,unitTactics,setStatus,hasStatus,statusPower,famousTargets,supportPositionPreview,tacticTarget} from '../tactics.mjs';
import {tacticUsesLeft,tacticSlot,tacticReadyAt,recoverTacticUses} from '../tactic-tempo.mjs';
import {selectedTactics,troopAptitude,advanceTacticLearning} from '../tactic-learning.mjs';
import {powerFactor} from '../tactic-power.mjs';
import {commandRefresh} from '../stratagem-events.mjs';
import {assessCombatForce} from '../strategic-combat-assessment.mjs';
import {tacticHolder,equipmentEntry,readyCurrent,resumeCurrent,currentBattle} from './helpers/current-battle.mjs';

const cases={relief:'spear',fortify:'halberd',regroup:'cavalry',stockpile:'crossbow',refit:'ship'};
function scene(id,side=0,politics=null,force=null,intellect=null){
 const type=cases[id],holder=tacticHolder(id,type),ids=OFFICER_CATALOG.filter(o=>o.id!==holder).slice(0,4).map(o=>o.id);
 const friend=id==='refit'?'ship':id==='stockpile'?'archer':'spear';
 const own=[equipmentEntry(holder,type),...ids.slice(0,2).map(i=>equipmentEntry(i,friend))],enemy=ids.slice(2).map(i=>equipmentEntry(i,type==='ship'?'ship':'spear'));
 const state=createScenario('custom-battle',188151,20,null,{seed:188151,terrain:type==='ship'?'river':'land',ownTeam:side?enemy:own,enemyTeam:side?own:enemy});
 const b=state.battle;lockDeployment(b);const [u,a,c]=b.sides[side].units,[target,rear]=b.sides[1-side].units;
 for(const v of b.sides.flatMap(s=>s.units)){v.cooldown=999;v.intent=0;v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));setStatus(b,v,'root',30);}
 Object.assign(u,{x:4,y:3,...(politics===null?{}:{politics,force,intellect})});Object.assign(a,{x:4,y:4,hp:1800,battleDamage:1200});Object.assign(c,{x:5,y:3,hp:1800,battleDamage:1200});Object.assign(target,{x:6,y:3});Object.assign(rear,{x:8,y:3});
 for(const v of [a,c]){setStatus(b,v,'despair',20);setStatus(b,v,'burn',20,{sourceId:target.id,amount:0});}
 // A real pending cooldown makes the group preparation useful before it heals.
 return {state,b,u,a,c,target,rear,ally:a};
}

for(const [id,type] of Object.entries(cases))for(const side of [0,1])test(`${id}: real ${type} holder gives group support on side ${side}, observes stock, and resumes`,()=>{
 const x=scene(id,side),s=TACTICS_BOOK[id];
 const expected=famousTargets(x.b,x.u,s),preview=supportPositionPreview(x.b,x.u).find(p=>p.skill.id===id);
 assert.equal(expected.length,2);assert.deepEqual(preview.eligible,expected);assert.equal(tacticTarget(x.b,x.u,s,1),expected[0]);
 const p=statusPower(x.u,s,x.b);assert.equal(p,unitAttributes(x.u,x.b).supportPower);readyCurrent(x,id);stepBattle(x.b);
 assert.equal(x.u.tacticCasts[id],1);assert.equal(tacticUsesLeft(x.u,s),0);
 for(const v of [x.a,x.c]){
  if(s.heal)assert.ok(v.hp>1800&&v.healed<=1200);
  if(s.shield)assert.ok(v.statuses.shield.amount>0);
  if(s.cleanse){assert.equal(hasStatus(x.b,v,'despair'),false);assert.ok(hasStatus(x.b,v,'resolve'));}
  if(id==='fortify'){assert.ok(hasStatus(x.b,v,'camp'));assert.equal(v.statuses.camp.potency,powerFactor(p)*.8);}
  if(id==='regroup'){assert.ok(hasStatus(x.b,v,'haste'));assert.ok(Object.values(v.skillReady).some(n=>n<999));}
  if(id==='stockpile'){assert.ok(hasStatus(x.b,v,'attackHaste'));assert.ok(hasStatus(x.b,v,'longRange'));}
  if(id==='refit')assert.equal(hasStatus(x.b,v,'burn'),false);
 }
 validateSave(structuredClone(x.state));resumeCurrent(x,12);
});

for(const id of Object.keys(cases))test(id+' uses political current power, respects live troops, and never redraws from temporary stats',()=>{
 const run=(politics,force,intellect,half=false)=>{const x=scene(id,0,politics,force,intellect);if(half)x.u.hp/=2;readyCurrent(x,id);const power=statusPower(x.u,TACTICS_BOOK[id],x.b);stepBattle(x.b);return {power,healed:x.a.healed||0,shield:x.a.statuses.shield?.amount||0,potency:x.a.statuses.attackHaste?.potency||x.a.statuses.haste?.potency||x.a.statuses.camp?.potency||0};};
 const base=run(20,20,20),political=run(100,20,20),martial=run(20,100,20),intelligent=run(20,20,100),wounded=run(100,20,20,true);
 assert.deepEqual(martial,base);assert.ok(political.power>intelligent.power&&intelligent.power>base.power);assert.equal(wounded.power,political.power/2);
 assert.ok(['healed','shield','potency'].some(k=>political[k]>base[k]),'politics improves an actual applied outcome');
});

test('ranged preparation and naval refit never select incompatible recipients, including previews',()=>{
 for(const id of ['stockpile','refit']){const x=scene(id),s=TACTICS_BOOK[id];x.a.type='spear';x.a.formType=null;x.a.equipment={siege:null,ship:null};
  assert.ok(!famousTargets(x.b,x.u,s).includes(x.a));assert.ok(!supportPositionPreview(x.b,x.u).find(p=>p.skill.id===id).candidates.includes(x.a));}
});

test('ordinary emergency aid removes the actual poison status, and sustained recovery obeys wound budgets',()=>{
 const x=currentBattle('bandage','qingzhou');x.ally.hp=2000;x.ally.battleDamage=1000;setStatus(x.b,x.ally,'plague',20,{sourceId:x.target.id,amount:0});readyCurrent(x,'bandage');stepBattle(x.b);
 assert.ok(x.ally.hp>2000);assert.equal(hasStatus(x.b,x.ally,'plague'),false);resumeCurrent(x);
 const r=currentBattle('regrowth','archer');r.ally.hp=2000;r.ally.battleDamage=1000;readyCurrent(r,'regrowth');stepBattle(r.b);assert.ok(hasStatus(r.b,r.ally,'regrowth'));resumeCurrent(r,12);assert.ok(r.ally.healed>0&&r.ally.healed<=1000);
});

test('healthy troops without a combat or recovery need do not waste group support',()=>{
 for(const id of Object.keys(cases)){const x=scene(id),s=TACTICS_BOOK[id];for(const v of x.b.sides[x.u.side].units){v.hp=v.maxHp;v.battleDamage=0;v.statuses={};v.intent=100;v.skillReady={};}x.target.x=13;x.rear.x=12;
  assert.deepEqual(famousTargets(x.b,x.u,s),[]);}
});

test('static military assessment includes political strength in ordinary group protection',()=>{
 const x=scene('fortify',0,20,20,20),army={units:[x.u,x.a,x.c],morale:80};
 const before=assessCombatForce(army);x.u.politics=100;const after=assessCombatForce(army);
 assert.ok(after.sustain>before.sustain);assert.ok(after.power>before.power);
});

test('changing form cannot create a third small stock or reset secondary cooldown and recovery',()=>{
 let found;
 for(const source of OFFICER_CATALOG){for(const type of ['spear','halberd','cavalry','archer']){
  if(troopAptitude(source,type)!==3)continue;
  const base=selectedTactics({...source,type},type).low,ship=selectedTactics({...source,type},'ship').low;
  if(TACTICS_BOOK[base[1]].category!==TACTICS_BOOK[ship[1]].category){found={source,type,base,ship};break;}
 }if(found)break;}
 assert.ok(found,'a real officer changes the secondary power channel across forms');
 const {source,type,base,ship}=found,u=makeOfficer(source.id,3000);u.type=type;u.equipment={siege:null,ship:'ship'};advanceTacticLearning(u);
 u.tacticCasts={[base[1]]:2};u.skillReady={[base[1]]:40};u.tacticUseBonus={};u.tacticRestored={};u.tacticCommandRestored={};
 const before=TACTICS_BOOK[base[1]],after=TACTICS_BOOK[ship[1]],primary=TACTICS_BOOK[ship[0]];
 assert.equal(tacticSlot(before,u),tacticSlot(after,u));assert.notEqual(tacticSlot(primary,u),tacticSlot(after,u));
 u.formType='ship';assert.equal(tacticUsesLeft(u,after),0);assert.equal(tacticReadyAt(u,after),40);assert.equal(tacticUsesLeft(u,primary),2);
 assert.deepEqual(recoverTacticUses(u,[after]),[after]);assert.equal(tacticUsesLeft(u,before),1);assert.equal(tacticUsesLeft(u,after),1);assert.equal(tacticReadyAt(u,after),40);
 const refreshed=commandRefresh(u,{strength:.5},10);assert.equal(Object.values(refreshed.restored).reduce((n,v)=>n+v,0),1);assert.equal(tacticUsesLeft(u,after),2);assert.equal(tacticUsesLeft(u,before),2);assert.equal(tacticReadyAt(u,after),25);
});
