import {primeTactic} from './helpers/prime-tactic.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,orderArmy,advanceTurn,startBattle,lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {unitAttributes,disciplineDuration,TROOPS} from '../unit-stats.mjs';
import {unitTactics,configureTactics,setStatus,shieldLayers,shieldAmount,absorbShield,refreshShield} from '../tactics.mjs';
function scene(type='crossbow') {
 const state=newGame(9);orderArmy(state,'a1','guandu');advanceTurn(state);startBattle(state);lockDeployment(state.battle);
 const b=state.battle,a=b.sides[0].units[0],d=b.sides[1].units[0];b.sides[0].units=[a];b.sides[1].units=[d];
 a.type=type;configureTactics(a,type==='crossbow'?['repeat','seal','ambush']:type==='archer'?['fire','scatter','suppress']:['thrust','phalanx','strike']);
 Object.assign(a,{x:4,y:3,cooldown:0,intent:0});Object.assign(d,{x:5,y:3,cooldown:999,intent:0});
 for(const u of [a,d])u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));
 return {state,b,a,d};
}
function damage(change=()=>{},skill=null) {const x=scene();change(x);if(skill)primeTactic(x.a,skill);const hp=x.d.hp;stepBattle(x.b);return hp-x.d.hp;}
test('four officer stats affect separate derived attributes, with no charm dimension',()=>{
 const u=newGame().armies[0].units[0],base=unitAttributes(u);assert.equal(u.charm,undefined);
 for(const [key,changed] of [['leadership',['attack','defense']],['force',['martialPower']],['intellect',['strategyPower']],['politics',['discipline']]]){
  const next=unitAttributes({...u,[key]:u[key]+10});for(const attr of Object.keys(base.breakdown))assert.equal(next[attr]>base[attr],changed.includes(attr),key+' → '+attr);
 }
 for(const [type,t] of Object.entries(TROOPS)){const x=unitAttributes({...u,type});assert.equal(x.range,t.range);assert.equal(x.move,t.move);assert.equal(x.attackInterval,t.interval);assert.equal(x.siege,t.siege);}
});
test('basic, martial and intellect damage use distinct offense and resistance paths',()=>{
 const basic=damage(),martial=damage(()=>{},'repeat'),intellect=damage(()=>{},'ambush');
 assert.ok(damage(x=>x.a.leadership=10)<basic);assert.equal(damage(x=>x.a.force=10),basic);assert.equal(damage(x=>x.a.intellect=10),basic);
 assert.ok(damage(x=>x.a.force=10,'repeat')<martial);assert.equal(damage(x=>x.a.intellect=10,'repeat'),martial);assert.equal(damage(x=>x.a.leadership=10,'repeat'),martial);
 assert.ok(damage(x=>x.a.intellect=10,'ambush')<intellect);assert.equal(damage(x=>x.a.force=10,'ambush'),intellect);
 assert.ok(damage(x=>x.d.leadership=10)>basic);assert.ok(damage(x=>x.d.leadership=10,'repeat')>martial);assert.equal(damage(x=>x.d.leadership=10,'ambush'),intellect);
 assert.ok(damage(x=>x.d.politics=0,'ambush')>intellect);assert.equal(damage(x=>x.d.politics=0),basic);assert.equal(damage(x=>x.d.politics=0,'repeat'),martial);
 assert.equal(damage(x=>x.b.sides[0].assaultUntil=99,'ambush'),intellect);assert.ok(damage(x=>x.b.sides[0].assaultUntil=99)>basic);
});
test('attribute breakdown reproduces effective values, statuses expire and offense includes current soldiers',()=>{
 const {a,b}=scene();b.sides[0].assaultUntil=2;b.sides[0].rangeUntil=2;setStatus(b,a,'slow',3);setStatus(b,a,'weaken',3);
 const s=unitAttributes(a,b);for(const [key,d] of Object.entries(s.breakdown)){let value=d.base+d.officer;for(const m of d.modifiers)value=m.add===undefined?value*m.factor:value+m.add;assert.equal(value,s[key]);}
 assert.equal(s.range,6);assert.equal(s.move,.5);b.tick=2;assert.equal(unitAttributes(a,b).range,4);assert.ok(unitAttributes(a,b).attack<s.attack);
 for(const key of ['attack','martialPower','strategyPower','siege']){assert.equal(unitAttributes({...a,hp:a.maxHp/4},b)[key],unitAttributes(a,b)[key]/4);assert.equal(unitAttributes({...a,hp:0},b)[key],0);}
});
test('troop attack speed changes actual basic attack cadence but not tactic cooldown',()=>{
 for(const type of ['archer','crossbow']){const {a,b}=scene(type);stepBattle(b);assert.equal(a.cooldown,TROOPS[type].interval);for(let i=0;i<TROOPS[type].interval-1;i++){stepBattle(b);assert.equal(b.effects.filter(e=>e.from===a.id&&e.damage).length,0);}stepBattle(b);assert.ok(b.effects.some(e=>e.from===a.id&&e.damage));}
 const {a,d,b}=scene();a.cooldown=10;a.intent=100;a.skillReady.repeat=0;stepBattle(b);assert.equal(a.cast,null);assert.equal(a.skillReady.repeat,b.tick+22);assert.equal(a.cooldown,9);
});
test('slow movement accumulates half-steps and active haste cannot stack twice',()=>{
 const {a,d,b}=scene('spear');a.x=0;d.x=10;d.statuses.phalanx={until:99};setStatus(b,a,'slow',9);
 stepBattle(b);assert.equal(a.x,0);assert.equal(a.moveProgress,.5);stepBattle(b);assert.equal(a.x,1);assert.equal(a.moveProgress,0);
 setStatus(b,a,'haste',9);b.sides[0].hasteUntil=99;assert.equal(unitAttributes(a,b).move,1);
});
test('politics reduces actual confusion duration but physical stun remains independent',()=>{
 function confuse(politics){const {a,d,b}=scene();d.politics=politics;a.type='archer';primeTactic(a,'smoke');stepBattle(b);return d.statuses.confuse.until-b.tick-1;}
 assert.ok(confuse(100)<confuse(0));
 function physical(politics){const {a,d,b}=scene();a.id='liao';a.type='cavalry';configureTactics(a,['terror','rush','valor']);primeTactic(a,'terror');d.politics=politics;stepBattle(b);return d.statuses.stun.until-b.tick-1;}assert.equal(physical(0),physical(100));const {d,b}=scene();assert.ok(disciplineDuration(b,d,4)>=1);assert.equal(disciplineDuration(b,{...d,politics:10000},1),1);
});
test('shield sources refresh separately, expire separately, cap at capacity and absorb earliest first',()=>{
 const {a,b}=scene();setStatus(b,a,'shield',2,{amount:100,source:'early',label:'早盾'});setStatus(b,a,'shield',8,{amount:300,source:'late',label:'迟盾'});
 assert.equal(shieldAmount(b,a),400);assert.equal(absorbShield(b,a,150),0);assert.equal(shieldAmount(b,a),250);assert.equal(shieldLayers(b,a)[0].source,'late');
 setStatus(b,a,'shield',2,{amount:100,source:'early'});setStatus(b,a,'shield',8,{amount:400,source:'late'});assert.equal(shieldAmount(b,a),500);assert.equal(shieldLayers(b,a).length,2);
 b.tick=3;refreshShield(b,a);assert.equal(shieldAmount(b,a),400);assert.equal(shieldLayers(b,a).length,1);
 setStatus(b,a,'shield',5,{amount:9999,source:'cap'});assert.equal(shieldAmount(b,a),a.maxHp);assert.equal(absorbShield(b,a,a.maxHp+20),20);assert.equal(a.statuses.shield,undefined);
});
test('new saves preserve shield layers and fractional movement; reject invalid sources and totals',()=>{
 const {state,a,b}=scene();a.moveProgress=.5;setStatus(b,a,'shield',5,{amount:100,source:'a',label:'护盾甲'});setStatus(b,a,'shield',8,{amount:200,source:'b',label:'护盾乙'});
 const copy=validateSave(structuredClone(state));assert.deepEqual(copy.battle,b);for(let i=0;i<10;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
 for(const mutate of [u=>u.statuses.shield.amount++,u=>u.statuses.shield.layers[0].amount=-1,u=>u.moveProgress=1,u=>u.politics=-1]){const x=scene();setStatus(x.b,x.a,'shield',5,{amount:100,source:'a'});mutate(x.a);assert.throws(()=>validateSave(x.state));}
});
