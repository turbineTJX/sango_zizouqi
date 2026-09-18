import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,deployUnit,resetDeployment,validateSave,unitAttributes,issueCommand} from '../engine.mjs';
import {canOccupy,terrainAt} from '../battlefield.mjs';
import {interceptorsAt} from '../engagement.mjs';
import {TACTICS_BOOK,unitTactics,roleTacticIds,configureTactics,setStatus,hasStatus,routeTo,tacticTarget,expandedSupportTargets} from '../tactics.mjs';
import {EXPANDED_FORCE,EXPANDED_INTELLECT} from '../expanded-tactics.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';
import {relationshipKey} from '../relationships.mjs';

function scene(type='halberd'){
 const state=createScenario(type==='ship'?'river':'field',71),b=state.battle,u=b.sides[0].units[0],d=b.sides[1].units[0];
 const row=type==='ship'?3:2;
 Object.assign(u,{id:'actor',name:'测试武将',type,level:1,x:4,y:row,hp:3000,maxHp:3000,initial:3000,troops:3000,battleDamage:0,healed:0,statuses:{},intent:0,cooldown:999,commandBonus:0,deputyBonus:0,advisorBonus:0});
 Object.assign(d,{id:'enemy',type:type==='ship'?'ship':'spear',level:1,x:6,y:row,hp:3000,maxHp:3000,initial:3000,troops:3000,battleDamage:0,healed:0,statuses:{},intent:0,cooldown:999});
 const a={...structuredClone(u),id:'ally',type:type==='ship'?'ship':'spear',x:5};
 b.sides[0].units=[u,a];b.sides[1].units=[d];
 for(const v of [u,a,d]){configureTactics(v,roleTacticIds(v,'guard'));v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));}
 lockDeployment(b);return {state,b,u,a,d};
}
const wound=u=>Object.assign(u,{hp:u.maxHp-1000,battleDamage:1000,healed:0});

test('cleave charges each victim once without charging the caster',()=>{
 const x=scene();x.a.x=2;x.d.x=5;
 const more=[[4,1],[3,2]].map(([xPos,y],i)=>({...structuredClone(x.d),id:'enemy-'+i,x:xPos,y}));x.b.sides[1].units.push(...more);
 primeTactic(x.u,'cleave');stepBattle(x.b);
 assert.equal(x.b.effects.filter(e=>e.from===x.u.id&&e.damage>0).length,3);assert.equal(x.u.intent,TACTICS_BOOK.cleave.threshold);
 assert.ok(x.b.sides[1].units.every(u=>u.intent===7));
});

test('all 24 additions resolve through equipped slots, real thresholds, targeting and cooldowns',()=>{
 for(const type of Object.keys(EXPANDED_FORCE))for(const id of [...EXPANDED_FORCE[type],...EXPANDED_INTELLECT[type]]){
  const x=scene(type);wound(x.a);x.a.statuses.weaken={until:20};
  if(['cleave','bulwark','riposte','curse','blight','navalRam'].includes(id)){x.a.x=3;x.d.x=id==='navalRam'?7:5;}
  if(id==='passage'){x.a.type='cavalry';configureTactics(x.a,roleTacticIds(x.a,'assault'));x.a.skillReady=Object.fromEntries(unitTactics(x.a).map(s=>[s.id,999]));x.d.x=6;const rear={...structuredClone(x.d),id:'rear',type:'archer',x:8};configureTactics(rear,roleTacticIds(rear,'assault'));rear.skillReady=Object.fromEntries(unitTactics(rear).map(s=>[s.id,999]));x.b.sides[1].units.push(rear);}
  primeTactic(x.u,id);stepBattle(x.b);
  assert.equal(x.u.tacticCasts[id],1,id+' must cast');assert.equal(x.u.skillReady[id],1+TACTICS_BOOK[id].cooldown,id);
  assert.ok(x.b.effects.some(e=>e.from===x.u.id&&e.label===TACTICS_BOOK[id].name),id+' emits a resolved effect');
 }
});

test('curse stacks through normal attacks, caps at three, lowers separate stats, and purify clears it',()=>{
 const x=scene();x.a.x=3;x.d.x=5;const base=unitAttributes(x.d,x.b);
 primeTactic(x.u,'curse');stepBattle(x.b);assert.equal(x.d.statuses.curse.stacks,1);
 x.u.skillReady.curse=999;
 for(let i=0;i<5;i++){x.u.cooldown=0;stepBattle(x.b);}
 assert.equal(x.d.statuses.curse.stacks,3);
 const next=unitAttributes(x.d,x.b),unaffected=structuredClone(x.d);delete unaffected.statuses.curse;const currentBase=unitAttributes(unaffected,x.b);for(const key of ['attack','strategyPower','discipline'])assert.ok(Math.abs(next[key]-currentBase[key]*(1-.18*x.d.statuses.curse.potency))<1e-8,key);
 x.d.type='logistics';primeTactic(x.d,'purify');stepBattle(x.b);assert.ok(!hasStatus(x.b,x.d,'curse'));
 x.u.cooldown=999;for(let i=0;i<12;i++)stepBattle(x.b);assert.ok(!hasStatus(x.b,x.u,'cursingAttack'));
});

test('blight reduces immediate and periodic healing, while purify removes it before healing',()=>{
 function run(id,blight){const x=scene('logistics');wound(x.a);if(blight)setStatus(x.b,x.a,'blight',20);if(id==='purify')setStatus(x.b,x.a,'curse',20);primeTactic(x.u,id);stepBattle(x.b);if(id==='regrowth')stepBattle(x.b);return x.a.healed;}
 assert.equal(run('bandage',true),Math.round(run('bandage',false)*.5));
 assert.equal(run('regrowth',true),Math.round(run('regrowth',false)*.5));
 assert.equal(run('purify',true),run('purify',false));
 const state=createScenario('rotation'),b=state.battle,u=b.sides[0].units[0];lockDeployment(b);wound(u);setStatus(b,u,'blight',8);b.commandProgress=12000;
 assert.equal(issueCommand(b,'heal'),null);assert.equal(u.healed,Math.floor(u.maxHp*.08*.5));
});

test('phantoms absorb bounded direct hits, ignore DOT, and never create a seventh unit or ZOC',()=>{
 const x=scene();wound(x.a);primeTactic(x.u,'mirage');stepBattle(x.b);assert.equal(x.a.statuses.illusion.hits,3);
 const before=x.a.hp;setStatus(x.b,x.a,'plague',8,{amount:20,sourceId:x.d.id});stepBattle(x.b);
 assert.equal(before-x.a.hp,20);assert.equal(x.a.statuses.illusion.hits,3);
 x.d.cooldown=0;stepBattle(x.b);assert.equal(x.a.statuses.illusion.hits,2);
 const event=x.b.effects.find(e=>e.absorbed>0);assert.ok(event);assert.ok(event.absorbed<=x.a.maxHp*.08);assert.equal(x.b.sides[0].units.length,2);
 for(let i=0;i<2;i++){x.d.cooldown=0;stepBattle(x.b);}assert.ok(!hasStatus(x.b,x.a,'illusion'));
});

test('riposte is one direct reaction per step, without a counter chain or extra intent',()=>{
 const x=scene();x.a.x=3;x.d.x=5;primeTactic(x.u,'riposte');stepBattle(x.b);setStatus(x.b,x.d,'riposte',8,{lastTick:0});
 x.d.cooldown=0;const own=x.u.intent,enemy=x.d.intent;stepBattle(x.b);
 assert.equal(x.b.effects.filter(e=>e.label==='反击'&&e.damage>0).length,1);
 assert.equal(x.u.intent-own,8);assert.equal(x.d.intent-enemy,6);
});

test('passage opens a real ZOC route and rear targeting; bodies, terrain, taunt and shared lock still apply',()=>{
 const x=scene('logistics');x.a.type='cavalry';configureTactics(x.a,roleTacticIds(x.a,'assault'));x.a.skillReady=Object.fromEntries(unitTactics(x.a).map(s=>[s.id,999]));
 const rear={...structuredClone(x.d),id:'rear',type:'archer',x:8};configureTactics(rear,roleTacticIds(rear,'assault'));rear.skillReady=Object.fromEntries(unitTactics(rear).map(s=>[s.id,999]));x.b.sides[1].units.push(rear);
 assert.ok(interceptorsAt(x.b,x.a).length);assert.equal(routeTo(x.b,x.a,rear,6),null);
 primeTactic(x.u,'passage');stepBattle(x.b);assert.equal(x.a.statuses.phaseLock.until,20);
 assert.equal(interceptorsAt(x.b,x.a).length,0);assert.ok(routeTo(x.b,x.a,rear,6));assert.ok(x.a.x>5,'AI must move toward the rear in the support window');
 assert.equal(expandedSupportTargets(x.b,x.u,TACTICS_BOOK.passage).length,0);
 const path=routeTo(x.b,x.a,rear,6);assert.ok(path.every(p=>!(p.x===x.d.x&&p.y===x.d.y)),'never pass through an occupied enemy cell');
 setStatus(x.b,x.a,'taunt',4,{sourceId:x.d.id});x.a.cooldown=0;x.d.cooldown=999;stepBattle(x.b);
 assert.ok(!x.b.effects.some(e=>e.from===x.a.id&&e.to===rear.id&&e.damage>0),'taunt remains in force');
 for(let i=0;i<7;i++)stepBattle(x.b);assert.ok(!hasStatus(x.b,x.a,'phase'));assert.ok(hasStatus(x.b,x.a,'phaseLock'));
});

test('naval deployment, swap, movement and save validation obey water and bridge domains',()=>{
 const state=createScenario('river'),b=state.battle,ship=b.sides[0].units[0],land=b.sides[0].units[2];
 assert.equal(b.terrain,'river');assert.equal(terrainAt(b,6,3),'bridge');assert.ok(canOccupy(b,ship,6,3));assert.ok(canOccupy(b,land,6,3));
 assert.ok(deployUnit(b,ship.id,2,1));assert.ok(deployUnit(b,land.id,2,3));assert.ok(deployUnit(b,ship.id,land.x,land.y));assert.equal(resetDeployment(b),null);
 lockDeployment(b);
 for(let i=0;i<50&&!b.result;i++){stepBattle(b);for(const u of b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'))assert.ok(canOccupy(b,u,u.x,u.y),u.id);}
 const copy=validateSave(structuredClone(state));while(!b.result){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
 const bad=structuredClone(state);bad.battle.sides[0].units[0].status='active';bad.battle.sides[0].units[0].x=0;bad.battle.sides[0].units[0].y=0;assert.throws(()=>validateSave(bad),/位置/);
});

test('siege blind spot prevents normal shots and bombard; gate charge damages the real victory objective',()=>{
 const x=scene('siege');x.a.x=3;x.d.x=5;x.u.cooldown=0;primeTactic(x.u,'bombard');const hp=x.d.hp;stepBattle(x.b);
 assert.equal(x.d.hp,hp);assert.ok(!x.u.tacticCasts.bombard);assert.ok(x.u.moveProgress>0||x.u.x!==4||x.u.y!==2);
 const y=scene('siege');y.d.x=9;y.b.siege={attackerSide:0,gate:{id:'siege-gate',type:'gate',name:'城门',side:1,x:6,y:2,hp:100,maxHp:100}};
 primeTactic(y.u,'ram');stepBattle(y.b);assert.equal(y.b.siege.gate.hp,0);assert.equal(y.b.result.reason,'城门失守');
});

test('two real ram casts can link against the gate and increase the second hit',()=>{
 function run(score){
  const state=createScenario('siege',97),b=state.battle,[a,c]=b.sides[0].units;b.sides[0].units=[a,c];b.sides[1].units=[];
  for(const [i,u]of [a,c].entries()){u.type='siege';u.x=10;u.y=3+i;u.cooldown=999;primeTactic(u,'ram');}
  const key=relationshipKey(a.id,c.id);b.relationshipScores[key]=score;b.relationshipTypes[key]=score===100?'sworn':'disliked';
  lockDeployment(b);stepBattle(b);return {damage:b.effects.find(e=>e.from===c.id&&e.to==='siege-gate'&&e.damage>0).damage,combos:b.comboCounts[0]};
 }
 const linked=run(100),solo=run(0);assert.equal(linked.combos,1);assert.equal(solo.combos,0);assert.ok(Math.abs(linked.damage/solo.damage-1.25)<.01);
});

test('fresh mixed and river battles earn casts and preserve all new status data across saves',()=>{
 for(const id of ['eight-arms','river']){
  const state=createScenario(id),b=state.battle;for(let i=0;i<75&&!b.result;i++)stepBattle(b);
  assert.ok(b.sides.flatMap(s=>s.units).some(u=>Object.keys(u.tacticCasts).some(k=>TACTICS_BOOK[k]&&Object.values(EXPANDED_FORCE).flat().concat(Object.values(EXPANDED_INTELLECT).flat()).includes(k))));
  const copy=validateSave(structuredClone(state));while(!b.result){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
 }
});

test('short passage prioritizes available rear attacks over self-buffs',()=>{
 const x=scene('logistics');x.a.type='cavalry';configureTactics(x.a,['gallop','rush','valor']);x.a.skillReady={};x.a.intent=100;
 const rear={...structuredClone(x.d),id:'rear',type:'archer',x:8};configureTactics(rear,roleTacticIds(rear,'assault'));rear.skillReady=Object.fromEntries(unitTactics(rear).map(s=>[s.id,999]));x.b.sides[1].units.push(rear);
 primeTactic(x.u,'passage');stepBattle(x.b);
 assert.equal(x.a.tacticCasts.gallop,undefined);assert.equal(x.a.tacticCasts.valor,undefined);assert.equal(x.a.tacticCasts.rush,1);
 assert.ok(x.b.effects.some(e=>e.from===x.a.id&&e.to===rear.id&&e.damage>0));
});

test('expanded ongoing statuses serialize exactly and invalid curse or phantom counts are rejected',()=>{
 const state=createScenario('eight-arms'),b=state.battle,u=b.sides[0].units[0],enemy=b.sides[1].units[0];lockDeployment(b);
 setStatus(b,u,'illusion',8,{hits:3});setStatus(b,u,'curse',10);setStatus(b,u,'curse',10);
 setStatus(b,u,'regrowth',6,{amount:60,sourceId:b.sides[0].units[3].id});setStatus(b,u,'plague',10,{amount:20,sourceId:enemy.id});
 setStatus(b,u,'phase',6);setStatus(b,u,'phaseLock',18);setStatus(b,u,'blight',10);setStatus(b,u,'riposte',8,{lastTick:0});
 const copy=validateSave(structuredClone(state));for(let i=0;i<20;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
 for(const [key,data]of [['curse',{until:b.tick+9,stacks:4}],['illusion',{until:b.tick+9,hits:4}]]){const bad=structuredClone(state);bad.battle.sides[0].units[0].statuses[key]=data;assert.throws(()=>validateSave(bad),/层数|次数/);}
});
