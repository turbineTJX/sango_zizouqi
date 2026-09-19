import {syncFixtureLearning} from './helpers/learn-tactics.mjs';
import {learnFixtureTactics} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {TACTICS_BOOK,repairTarget,setStatus,statusPower} from '../tactics.mjs';
import {formationAura} from '../support-rules.mjs';
import {inspectionStatuses,statusAttributeChanges} from '../status-display.mjs';
import {hexDistance} from '../hex-grid.mjs';

function fixture(){
 const state=createScenario('tactical-shu-defense'),b=state.battle;
 const u=b.sides[0].units.find(u=>u.type==='logistics'),ally=b.sides[0].units[0];
 learnFixtureTactics(u,['passage','bandage','camp']);
 Object.assign(u,{x:2,y:2});Object.assign(ally,{x:3,y:2});
 return {state,b,u,ally};
}

test('recovery aura follows adjacency, breaks under control, and never increases combat attributes',()=>{
 const {b,u,ally}=fixture();
 assert.equal(formationAura(b,u),null);
 const normal=unitAttributes(ally),boosted=unitAttributes(ally,b);
 assert.equal(boosted.attack,normal.attack);assert.equal(boosted.defense,normal.defense);
 assert.ok(formationAura(b,ally));
 const status=inspectionStatuses(b,ally).find(s=>s.dynamic);
 assert.ok(status.sources.some(s=>s.includes(u.name)));
 assert.deepEqual(statusAttributeChanges(b,ally,status),[]);
 const other={...structuredClone(u),id:'aux-two',x:3,y:1};b.sides[0].units.push(other);
 assert.equal(unitAttributes(ally,b).attack,boosted.attack);
 b.sides[0].units.pop();
 for(const key of ['stun','confuse','seal']){setStatus(b,u,key,5);assert.equal(formationAura(b,ally),null);delete u.statuses[key];}
 u.x=1;assert.equal(formationAura(b,ally),null);u.x=2;
 ally.type='archer';assert.equal(formationAura(b,ally),null);ally.type='spear';
 b.sides[0].retreat=true;assert.equal(formationAura(b,ally),null);b.sides[0].retreat=false;
 u.hp=0;assert.equal(formationAura(b,ally),null);
});

test('politics leads rescue and repair power, intellect assists, and force provides no healing power',()=>{
 const {u}=fixture(),power=x=>statusPower({...u,...x},TACTICS_BOOK.bandage);
 assert.ok(power({politics:100,intellect:20})>power({politics:20,intellect:100}));
 assert.ok(power({politics:100,intellect:100})>power({politics:100,intellect:20}));
 assert.equal(power({force:100}),power({force:1}));
 assert.equal(statusPower(u,TACTICS_BOOK.camp),power({}));
});

test('auxiliaries earn intent through melee, run their aura without consuming casts, and resume deterministically',()=>{
 const {state,b,u}=fixture();lockDeployment(b);
 let hit=false,aura=false;
 for(let i=0;i<60&&!b.result;i++){
  stepBattle(b);
  hit ||= b.effects.some(e=>e.from===u.id&&!e.skill&&e.damage>0&&hexDistance(u,{x:e.x,y:e.y})===1);
  aura ||= b.sides[0].units.some(a=>formationAura(b,a)?.source.id===u.id);
 }
 assert.ok(hit&&aura);assert.ok(u.intent>0);assert.equal(u.tacticCasts.passage,undefined);
 const resumed=validateSave(structuredClone(syncFixtureLearning(state)));
 while(!b.result){stepBattle(b);stepBattle(resumed.battle);}
 assert.deepEqual(resumed.battle,b);
});

test('repair respects ownership, distance, destruction and a three-cast material budget',()=>{
 const {b,u}=fixture(),gate=b.siege.gate;
 gate.hp-=1000;u.x=2;u.y=4;
 assert.equal(repairTarget(b,u),gate);
 u.x=5;assert.equal(repairTarget(b,u),null);u.x=2;
 gate.side=1;assert.equal(repairTarget(b,u),null);gate.side=0;
 gate.hp=0;assert.equal(repairTarget(b,u),null);gate.hp=gate.maxHp-1000;
 u.tacticCasts.camp=3;assert.equal(repairTarget(b,u),null);
});

for(const kind of ['gate','tower','supply-depot','future-building'])test(`${kind}: repair uses earned intent, reports durability and resumes exactly`,()=>{
 const {state,b,u}=fixture();learnFixtureTactics(u,['camp','bandage','supply']);lockDeployment(b);
 // Use real melee to earn the threshold, then redeploy the earned unit for an isolated repair resolution.
 while(u.intent<25&&!b.result)stepBattle(b);
 assert.ok(u.intent>=25&&u.hp>0);
 const gate=kind==='gate'?b.siege.gate:{id:'test-building',name:'测试建筑',type:'building',kind,side:0,x:0,y:4,hp:6500,maxHp:8500};
 if(kind!=='gate')b.buildings.push(gate);
 gate.hp=gate.maxHp-2000;u.x=2;u.y=4;
 const expected=Math.round(gate.maxHp*.04*Math.max(.7,Math.min(1.6,.6+unitAttributes(u,b).supportPower/700)));
 const hp=gate.hp;stepBattle(b);
 assert.equal(u.tacticCasts.camp,1);assert.equal(gate.hp-hp,expected);
 const effect=b.effects.find(e=>e.repaired);
 assert.equal(effect.repaired,expected);assert.equal(effect.healing,undefined);
 assert.ok(effect.outcome?.some(t=>t.repaired===expected)||b.effects.some(e=>e.outcome?.some(t=>t.repaired===expected)));
 validateSave(structuredClone(syncFixtureLearning(state)));
 const before=gate.hp;gate.lastDamagedTick=b.tick;
 u.skillReady.camp=0;stepBattle(b);
 assert.ok(gate.hp-before<=Math.ceil(expected/2));
 assert.equal(u.tacticCasts.camp,2);
 const resumed=validateSave(structuredClone(syncFixtureLearning(state)));
 while(!b.result){stepBattle(b);stepBattle(resumed.battle);}
 assert.deepEqual(resumed.battle,b);
 assert.ok(u.tacticCasts.camp<=3);
});


test('recovery pulses restore real wounds and intent without casts, combos or overhealing',()=>{
 const {b,u,ally}=fixture();
 learnFixtureTactics(u,['passage','bandage','camp']);
 lockDeployment(b);
 let pulses=0,healed=0,charged=0;
 while(!b.result){
   stepBattle(b);
   for(const e of b.effects.filter(e=>e.from===u.id&&e.label==='协阵')){
     pulses++;assert.equal(b.tick%6,0);assert.ok(e.ongoing);assert.equal(e.damage,0);assert.equal(e.combo,undefined);
     assert.ok(e.intentRestored>=0&&e.intentRestored<=3);healed+=e.healing;charged+=e.intentRestored;
   }
   for(const a of b.sides[0].units){assert.ok(a.intent<=100);assert.ok(a.healed<=Math.floor(a.battleDamage*.35));assert.ok(a.hp<=a.maxHp);}
 }
 assert.ok(pulses>0&&healed>0&&charged>0);assert.equal(u.tacticCasts.passage,undefined);
});

test('generic building records reject corrupt kinds, ownership, durability and duplicate positions',()=>{
 const {state,b}=fixture();
 b.buildings.push({id:'tower',name:'箭楼',type:'building',kind:'tower',side:0,x:0,y:4,hp:500,maxHp:1000});
 validateSave(structuredClone(syncFixtureLearning(state)));
 for(const mutate of [a=>a.hp=1001,a=>a.side=2,a=>a.type='logistics',a=>a.kind='',a=>a.lastDamagedTick=1,a=>a.x=1]){
   const copy=structuredClone(state);mutate(copy.battle.buildings[0]);assert.throws(()=>validateSave(copy));
 }
});
