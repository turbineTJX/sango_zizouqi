import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';
import {sideBonds,bondSwiftEffect,bondList} from '../bonds.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {interceptorsAt,canStrikeFrom} from '../engagement.mjs';
import {unitTactics,hasStatus,setStatus,routeTo,tacticTarget,TACTICS_BOOK} from '../tactics.mjs';
import {canOccupy} from '../battlefield.mjs';
import {hexDistance} from '../hex-grid.mjs';
import {bondReference} from '../bond-reference.mjs';
import {personalBondsMarkup} from '../bond-display.mjs';
import {inspectionStatuses,statusIcon} from '../status-display.mjs';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';

const holders=['公孙瓒','张燕','曹彰','马岱','张绣','魏续'];
const id=name=>Object.values(O).find(o=>o.name===name).id;
const foeNames=['刘禅','刘璋','韩玄','刘度','孔伷','张鲁'];
function scene({count=6,names=holders.slice(0,count),side=0,type='cavalry',foes=2,terrain='land'}={}){
 const own=names.map(name=>({id:id(name),type,level:10,troops:4000}));
 const enemy=foeNames.slice(0,foes).map((name,i)=>({id:id(name),type:i===1?'archer':'spear',level:10,troops:4000}));
 const state=createScenario('custom-battle',9601,20,null,{seed:9601,terrain,ownTeam:side?enemy:own,enemyTeam:side?own:enemy}),b=state.battle;lockDeployment(b);
 for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.intent=0;u.retreatAt=null;u.statuses.root={until:999};u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));}
 const us=b.sides[side].units,es=b.sides[1-side].units,u=us[0];
 us.forEach((v,i)=>Object.assign(v,v.status==='active'?{x:i?0:4,y:i?i-1:3}:{x:-1,y:-1}));es.forEach((v,i)=>Object.assign(v,{x:i===0?5:i===1?7:13,y:i<2?3:i}));
 if(side)for(const v of [...us,...es].filter(v=>v.status==='active'))v.x=13-v.x;
 delete u.statuses.root;
 return {state,b,u,us,es,front:es[0],rear:es[1]};
}
const hits=x=>x.b.effects.filter(e=>e.from===x.u.id&&!e.skill&&!e.ongoing&&e.damage>0);
const freeze=u=>{u.statuses.root={until:999};};
const hp=(u,n)=>{u.hp=n;u.battleDamage=u.initial-n;u.healed=0;};

test('Swift uses all three temporary tiers on either side, expires exactly and refreshes after twelve rounds',()=>{
 for(const side of [0,1])for(const [i,count]of [1,3,6].entries()){
  const x=scene({side,count}),base=unitAttributes(x.u).move;
  assert.equal(sideBonds(x.b,side).bondSwift.tier,i+1);assert.equal(bondSwiftEffect(x.b,x.u),null);
  assert.equal(unitAttributes(x.u,x.b).move,base);assert.ok(interceptorsAt(x.b,x.u).length);
  stepBattle(x.b);const cast=x.u.statuses.swiftRush;
  assert.equal(cast.until,1+D.bondSwift.burstSteps[i]);assert.equal(x.u.bondState.swiftReady,13);
  assert.equal(bondSwiftEffect(x.b,x.u).moveBonus,D.bondSwift.values[i]);assert.equal(unitAttributes(x.u,x.b).move,base*(1+D.bondSwift.values[i]));
  assert.equal(unitAttributes(x.u,x.b).range,unitAttributes(x.u).range);assert.deepEqual(interceptorsAt(x.b,x.u),[]);
  freeze(x.u);while(x.b.tick<cast.until-1)stepBattle(x.b);assert.ok(bondSwiftEffect(x.b,x.u));
  stepBattle(x.b);assert.equal(bondSwiftEffect(x.b,x.u),null);assert.equal(x.u.statuses.swiftRush,undefined);
  assert.equal(x.u.bondState.swiftReady,13);while(x.b.tick<12)stepBattle(x.b);assert.equal(x.u.statuses.swiftRush,undefined);
  stepBattle(x.b);assert.equal(x.u.statuses.swiftRush.castTick,13);assert.equal(x.u.bondState.swiftReady,25);
  assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
 }
});

test('Swift moves past a live front ZOC without disengaging and lands real rear attacks',()=>{
 for(const side of [0,1]){
  const x=scene({side});x.u.cooldown=0;assert.equal(routeTo(x.b,x.u,x.rear,12),null);
  stepBattle(x.b);assert.ok(x.u.statuses.swiftRush);assert.equal(x.u.disengage,null);
  assert.ok(hexDistance(x.u,x.rear)<=1);assert.ok(!x.es.some(e=>e.x===x.u.x&&e.y===x.u.y));
  assert.ok(canStrikeFrom(x.b,x.u,x.rear));assert.equal(hits(x).length,0);
  stepBattle(x.b);assert.ok(hits(x).some(e=>e.to===x.rear.id));assert.ok(!hits(x).some(e=>e.to===x.front.id));
  assert.equal(x.u.passiveState.shots,1);assert.ok(x.u.cooldown>0);
  assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
 }
});

test('a full occupied line stays impassable and Swift attacks a legal blocker without empty disengage loops',()=>{
 const x=scene({foes:6});
 // Eight real troops close every cell, using five enemies and three allies.
 const enemyWall=[x.es[0],...x.es.slice(2)];enemyWall.forEach((u,i)=>Object.assign(u,{x:5,y:i}));
 x.us.slice(1,4).forEach((u,i)=>Object.assign(u,{x:5,y:i+5}));Object.assign(x.rear,{x:7,y:3});x.u.cooldown=0;
 for(let i=0;i<4;i++){x.u.cooldown=0;stepBattle(x.b);assert.equal(x.u.x,4);assert.equal(x.u.disengage,null);assert.ok(hits(x).length);assert.ok(hits(x).every(e=>enemyWall.some(u=>u.id===e.to)));}
 assert.equal(routeTo(x.b,x.u,x.rear,14),null);assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
});

test('Swift respects river water, actual occupied cells and root without adding attack range',()=>{
 const x=scene({terrain:'river'});Object.assign(x.u,{x:4,y:2,cooldown:0});Object.assign(x.front,{x:5,y:2});Object.assign(x.rear,{x:7,y:5});
 stepBattle(x.b);assert.equal(canOccupy(x.b,x.u,4,3),false);assert.ok(canOccupy(x.b,x.u,x.u.x,x.u.y));assert.ok(!x.es.some(e=>e.x===x.u.x&&e.y===x.u.y));
 const rooted=scene();freeze(rooted.u);rooted.u.cooldown=0;stepBattle(rooted.b);
 assert.equal(unitAttributes(rooted.u,rooted.b).move,0);assert.equal(rooted.u.x,4);assert.equal(rooted.u.y,3);assert.equal(hits(rooted)[0].to,rooted.front.id);
 assert.ok(hasStatus(rooted.b,rooted.u,'swiftRush'));assert.equal(unitAttributes(rooted.u,rooted.b).range,1);
});

test('rear preference overrides nearby finishers only during the burst and preserves contact budgets',()=>{
 const x=scene({type:'archer',foes:3});freeze(x.u);x.u.cooldown=0;Object.assign(x.es[2],{x:4,y:4});hp(x.front,300);
 stepBattle(x.b);assert.deepEqual(hits(x).map(e=>e.to),[x.rear.id]);assert.equal(x.u.passiveState.shots,1);
 const until=x.u.statuses.swiftRush.until;while(x.b.tick<until)stepBattle(x.b);
 x.u.cooldown=0;stepBattle(x.b);assert.ok(hits(x).some(e=>e.to===x.front.id));assert.ok(!hits(x).some(e=>e.to===x.rear.id));
 const contact=scene();Object.assign(contact.rear,{x:4,y:4});contact.u.cooldown=0;stepBattle(contact.b);
 assert.deepEqual(new Set(hits(contact).map(e=>e.to)),new Set([contact.front.id,contact.rear.id]));assert.ok(hits(contact).every(e=>e.damageShare===.5));assert.equal(contact.u.passiveState.shots,1);
});

test('legal taunt and explicit focus remain above Swift rear preference',()=>{
 for(const side of [0,1])for(const forced of ['taunt','focus']){
  const x=scene({side});x.u.cooldown=0;
  if(forced==='taunt')setStatus(x.b,x.u,'taunt',6,{sourceId:x.front.id,sourceName:x.front.name,sourceSkillName:'嘲讽'});
  else {x.b.sides[side].focus=x.front.id;x.b.sides[side].focusUntil=99;}
  stepBattle(x.b);assert.equal(hits(x)[0].to,x.front.id);assert.equal(x.u.x,side?9:4);assert.equal(x.u.disengage,null);
 }
});

test('hidden and stasis rear units cannot pull Swift away from a legal enemy',()=>{
 for(const key of ['stealth','stasis']){
  const x=scene();x.u.cooldown=0;setStatus(x.b,x.rear,key,6,{sourceId:x.rear.id});stepBattle(x.b);
  assert.equal(hits(x)[0].to,x.front.id);assert.equal(x.u.x,4);
 }
});

test('operational eligibility and live contributor losses suspend Swift without resetting its clock',()=>{
 const x=scene();stepBattle(x.b);freeze(x.u);const until=x.u.statuses.swiftRush.until,ready=x.u.bondState.swiftReady;
 x.us[1].hp=0;x.us[1].status='defeated';x.us[2].hp=0;x.us[2].status='defeated';assert.equal(bondSwiftEffect(x.b,x.u).moveBonus,.4);
 for(const u of x.us.slice(3)){u.hp=0;u.status='defeated';}assert.equal(bondSwiftEffect(x.b,x.u).moveBonus,.3);
 for(const key of ['confuse','stasis']){setStatus(x.b,x.u,key,2);assert.equal(bondSwiftEffect(x.b,x.u),null);delete x.u.statuses[key];}
 for(const field of ['withdrawing','disengage']){x.u[field]=field==='disengage'?{guards:[],readyTick:2,targetId:x.front.id}:true;assert.equal(bondSwiftEffect(x.b,x.u),null);x.u[field]=null;}
 x.b.sides[0].retreat=true;assert.equal(bondSwiftEffect(x.b,x.u),null);x.b.sides[0].retreat=false;
 x.u.status='reserve';assert.equal(bondSwiftEffect(x.b,x.u),null);x.u.status='active';
 assert.equal(x.u.statuses.swiftRush.until,until);assert.equal(x.u.bondState.swiftReady,ready);
 const locked=scene();setStatus(locked.b,locked.u,'confuse',2);stepBattle(locked.b);stepBattle(locked.b);assert.equal(locked.u.statuses.swiftRush,undefined);stepBattle(locked.b);assert.equal(locked.u.statuses.swiftRush.castTick,3);
});

test('losing the shared threshold disables a stored window and requalification cannot start a new one early',()=>{
 const x=scene({names:['公孙越','公孙续']}),u=x.u;freeze(u);stepBattle(x.b);const cast=u.statuses.swiftRush;
 x.us[1].status='reserve';x.us[1].arrivalTick=99;assert.equal(sideBonds(x.b,0).bondSwift.tier,0);assert.equal(bondSwiftEffect(x.b,u),null);
 stepBattle(x.b);assert.equal(u.statuses.swiftRush.castTick,cast.castTick);assert.equal(u.bondState.swiftReady,13);
 x.us[1].status='active';assert.equal(bondSwiftEffect(x.b,u).moveBonus,.3);assert.equal(u.bondState.swiftReady,13);
 const single=scene({names:['公孙越']});assert.equal(sideBonds(single.b,0).bondSwift.tier,0);stepBattle(single.b);assert.equal(single.u.statuses.swiftRush,undefined);
});

test('actual fixed offensive tactics can strike the rear through ignored ZOC; no extra tactic is injected',()=>{
 for(const side of [0,1]){
  const x=scene({side});stepBattle(x.b);Object.assign(x.u,{x:side?9:4,y:3});
  primeTactic(x.u,'harass');assert.ok(unitTactics(x.u).some(s=>s.id==='harass'));
  const chosen=tacticTarget(x.b,x.u,TACTICS_BOOK.harass,unitAttributes(x.u,x.b).range);
  assert.equal(chosen,x.rear);stepBattle(x.b);assert.equal(x.u.tacticCasts.harass,1);assert.ok(x.b.effects.some(e=>e.from===x.u.id&&e.to===x.rear.id&&e.skill));
  assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
 }
});

test('a real reserve gets no Swift window or cooldown until its actual delayed entry',()=>{
 for(const side of [0,1]){
  const x=scene({side,names:[...holders,'侯成','韩浩']}),reserves=x.us.filter(u=>u.status==='reserve'),reserve=reserves[0];assert.ok(reserve);
  stepBattle(x.b);assert.equal(reserve.bondEntry,undefined);assert.equal(reserve.statuses.swiftRush,undefined);assert.equal(reserve.bondState.swiftReady,undefined);
  const fallen=x.us[1];hp(fallen,0);fallen.status='defeated';stepBattle(x.b);
  const entered=reserves.find(u=>u.status==='active');assert.ok(entered);assert.equal(entered.bondEntry.tick,2);assert.equal(entered.statuses.swiftRush.castTick,2);assert.equal(entered.bondState.swiftReady,14);
  assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
 }
});

test('Swift has visible status and current per-tier detail, but the personal active marker follows the window',()=>{
 const x=scene();assert.doesNotMatch(personalBondsMarkup(x.u,x.b),/疾驰3 · 生效/);stepBattle(x.b);freeze(x.u);
 assert.ok(inspectionStatuses(x.b,x.u).some(s=>s.key==='swiftRush'&&s.name==='突进'));assert.match(personalBondsMarkup(x.u,x.b),/疾驰3 · 生效/);
 assert.doesNotMatch(statusIcon('swiftRush'),/undefined/);
 const text=JSON.stringify(bondReference('bondSwift'));for(const value of ['30%','40%','50%','4回合','5回合','6回合','无视ZOC','后排','每12回合'])assert.ok(text.includes(value));assert.ok(!text.includes('22%'));
 const until=x.u.statuses.swiftRush.until;while(x.b.tick<until)stepBattle(x.b);assert.equal(bondList(x.u,x.b).find(d=>d.id==='bondSwift').state,'未生效');
 const bad=structuredClone(DESIGN_TABLES);bad.bonds.bondSwift.burstSteps[2]=bad.bonds.bondSwift.period;assert.ok(validateDesignTables(bad).some(e=>e.includes('疾驰突进')));
});

test('current saves resume both the active window and cooldown deterministically and reject forged burst metadata',()=>{
 const x=scene();stepBattle(x.b);freeze(x.u);const saved=structuredClone(x.state);assert.doesNotThrow(()=>validateSave(saved));
 const resumed=structuredClone(saved);validateSave(resumed);
 for(let i=0;i<14;i++){stepBattle(x.b);stepBattle(resumed.battle);assert.deepEqual(x.b,resumed.battle);}
 for(const change of [s=>s.until++,s=>s.bondSwiftTier=0,s=>s.bondSwiftTier=4,s=>s.sourceId=x.front.id,s=>s.castTick++,s=>s.sourceSkillName='神速']){
  const bad=structuredClone(saved);change(bad.battle.sides[0].units[0].statuses.swiftRush);assert.throws(()=>validateSave(bad),/疾驰突进/);
 }
 const cooldown=structuredClone(saved);cooldown.battle.sides[0].units[0].bondState.swiftReady++;assert.throws(()=>validateSave(cooldown),/疾驰突进/);
 const version=structuredClone(saved);version.rulesVersion--;assert.throws(()=>validateSave(version),/当前规则版本/);
});
