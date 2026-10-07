import {bondLineup} from './helpers/bond-lineups.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {bondAttributes,bondDamage,bondProtection,bondHitEffect,sideBonds} from '../bonds.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
import {CONTROL_STATUSES} from '../battle-status-rules.mjs';
import {hasStatus,setStatus} from '../tactics.mjs';
import {intentIncome} from '../passives.mjs';
import {hexNeighbors} from '../hex-grid.mjs';
import {unitAttributes} from '../unit-stats.mjs';
const id=n=>Object.values(O).find(o=>o.name===n).id;
function scene(names,side=0,type='spear'){
 const key=({荀彧:'bondScholar',袁涣:'bondSteady',田丰:'bondSpread',蒋钦:'bondMuster',严颜:'bondFinisher',郭淮:'bondAntiHorse',马钧:'bondSiegebreak',张绣:'bondSkirmish'})[names[0]];if(key&&names.length===4)names=bondLineup(key,names);
 const team=names=>names.map(n=>({id:id(n),type,troops:4000,level:10}));
 const foes=['曹操','刘备','关羽','张飞'];
 const state=createScenario('custom-battle',9292,20,null,{seed:9292,terrain:'land',ownTeam:team(side?foes:names),enemyTeam:team(side?names:foes)});
 lockDeployment(state.battle);
 const b=state.battle,us=b.sides[side].units,u=us[0],target=b.sides[1-side].units[0];
 Object.assign(u,{x:4,y:3});Object.assign(target,{x:5,y:3});
 for(let i=1;i<us.length;i++)Object.assign(us[i],{x:0,y:i});
 return {state,b,us,u,target};
}
test('common strategy and discipline bonuses do not silently grant rare curse equipment or immunity',()=>{
 const x=scene(['荀彧','田丰','徐庶','法正']);assert.equal(sideBonds(x.b,0).bondScholar.tier,3);
 assert.ok(Math.abs(unitAttributes(x.u,x.b).strategyPower/unitAttributes(x.u).strategyPower-1.2)<1e-8);
 assert.ok(x.us.every(u=>!u.statuses.attackOrb));
 const y=scene(['袁涣','韦昭','温恢','杜畿']);assert.equal(sideBonds(y.b,0).bondSteady.tier,3);
 assert.ok(Math.abs(unitAttributes(y.u,y.b).discipline/unitAttributes(y.u).discipline-1.2)<1e-8);
 assert.equal(y.u.statuses.magicImmune,undefined);
});
test('Spread responds to actual adjacency and stops protecting against strategy when a real ally closes in',()=>{
 const {b,u,us}=scene(['田丰','徐庶','法正','沮授']);assert.equal(sideBonds(b,0).bondSpread.tier,3);
 assert.equal(bondProtection(b,u,'intellect'),.84);assert.equal(bondProtection(b,u,'force'),1);assert.equal(bondProtection(b,u,'dot'),1);
 Object.assign(us[1],{x:5,y:3});assert.equal(bondProtection(b,u,'intellect'),1);
 us[1].status='reserve';assert.ok(bondProtection(b,u,'intellect')<1);
});
test('Muster uses only neighbouring actual allies, and changes the real attack interval',()=>{
 const {b,u,us}=scene(['蒋钦','孙尚香','张翼','孙韶']);assert.equal(sideBonds(b,0).bondMuster.tier,3);
 const initial=unitAttributes(u).attackInterval;assert.equal(unitAttributes(u,b).attackInterval,initial);
 Object.assign(us[1],{x:5,y:3});assert.equal(unitAttributes(u,b).attackInterval,initial/1.12);
 us[1].isDecoy=true;assert.equal(unitAttributes(u,b).attackInterval,initial);assert.equal(bondAttributes(b,u).attackSpeed,undefined);
});
test('Finisher uses pre-hit half-strength boundaries, and cannot increase dots or gate damage',()=>{
 const {b,u,target}=scene(['严颜','韩当','孙礼','马忠']);assert.equal(sideBonds(b,0).bondFinisher.tier,3);
 target.hp=target.maxHp*.5+1;assert.equal(bondDamage(b,u,target,'basic'),1);
 target.hp--;assert.equal(bondDamage(b,u,target,'basic'),1.2);
 assert.equal(bondDamage(b,u,target,'dot'),1);assert.equal(bondDamage(b,u,{...target,type:'gate'},'force'),1);
});
test('Counter Horse keeps its matchup restriction and never inherits the old universal troop buffs',()=>{
 for(const side of [0,1]){const {b,u,target}=scene(['郭淮','张郃','姜维','文聘'],side);assert.equal(sideBonds(b,side).bondAntiHorse.tier,3);
 target.type='cavalry';assert.equal(bondDamage(b,u,target,'basic'),1.25);target.type='spear';assert.equal(bondDamage(b,u,target,'basic'),1);
 assert.equal(bondDamage(b,u,{...target,type:'cavalry'},'dot'),1);}
});
test('Siegebreak is confined to actual gate targets and does not improve troop damage',()=>{
 const {b,u,target}=scene(['马钧','黄月英','钟会','刘晔']);assert.equal(sideBonds(b,0).bondSiegebreak.tier,3);
 assert.equal(bondDamage(b,u,{...target,type:'gate'},'force'),1.3);assert.equal(bondDamage(b,u,target,'force'),1);
 assert.equal(bondDamage(b,u,{...target,type:'gate',isDecoy:true},'force'),1);
});
test('Skirmish loses its damage bonus when the target has a real adjacent friend',()=>{
 const {b,u,target}=scene(['张绣','孟达','韩遂','陈宫']);assert.equal(sideBonds(b,0).bondSkirmish.tier,3);
 for(const v of b.sides[1].units.slice(1))Object.assign(v,{x:12,y:3});
 assert.equal(bondDamage(b,u,target,'basic'),1.16);
 const protector=b.sides[1].units[1];Object.assign(protector,{x:6,y:3});assert.equal(bondDamage(b,u,target,'basic'),1);
 protector.status='reserve';assert.equal(bondDamage(b,u,target,'basic'),1.16);
});
test('rare Beauty drains hit intent and rolls full-field anomalies through actual hits on either side',()=>{
 for(const side of [0,1]){
  const {state,b,u,us,target}=scene(['貂蝉','甄氏','大乔','小乔'],side,'archer');assert.equal(sideBonds(b,side).bondBeauty.tier,3);
  for(const v of b.sides.flatMap(a=>a.units)){v.cooldown=999;v.retreatAt=null;v.skillReady=Object.fromEntries(v.tactics.map(id=>[id,999]));}
  Object.assign(target,{x:6,y:3,intent:50});u.cooldown=0;const copy=validateSave(structuredClone(state));
  stepBattle(b);stepBattle(copy.battle);assert.equal(target.statuses.powerDown,undefined);
  assert.ok(b.effects.some(e=>e.from===u.id&&e.intentDrained===14&&e.label==='倾国'));assert.deepEqual(state,copy);
  assert.doesNotThrow(()=>validateSave(structuredClone(state)));
 }
});

function beautyScene(names=['貂蝉','甄氏','大乔','小乔'],side=0,type='archer'){
 const x=scene(names,side,type),foes=x.b.sides[1-side].units;
 for(const v of x.b.sides.flatMap(a=>a.units)){
  v.cooldown=999;v.intent=50;v.retreatAt=null;v.statuses.root={until:999};
  v.skillReady=Object.fromEntries(v.tactics.map(id=>[id,999]));
 }
 foes.forEach((v,i)=>Object.assign(v,{x:i?12:6,y:i?i*2:3}));
 x.u.cooldown=0;return {...x,foes};
}
const beautyStatuses=u=>Object.entries(u.statuses).filter(([key,s])=>BOND_DESIGNS.bondBeauty.statuses.includes(key)&&s.sourceSkillName==='倾国');
function beautyChance(chance,fn){
 const d=BOND_DESIGNS.bondBeauty,previous=d.statusChance;
 d.statusChance=previous.map(()=>chance);
 try{return fn();}finally{d.statusChance=previous;}
}

test('Beauty tiers use current field points, drain only hit units, and lower tiers roll only the hit target',()=>{
 const teams=[['貂蝉'],['貂蝉','甄氏'],['貂蝉','甄氏','大乔','小乔']];
 for(const side of [0,1])for(let i=0;i<teams.length;i++){
  const x=beautyScene(teams[i],side),rule=bondHitEffect(x.b,x.u);
  assert.equal(rule.intentDrain,[8,11,14][i]);assert.equal(rule.chance,[.3,.35,.4][i]);assert.equal(rule.allEnemies,i===2);
  beautyChance(1,()=>stepBattle(x.b));
  assert.equal(x.target.intent,50+intentIncome(x.target).hit-rule.intentDrain);
  assert.equal(beautyStatuses(x.target).length,1);assert.equal(x.target.statuses.powerDown,undefined);
  for(const v of x.foes.slice(1)){assert.equal(v.intent,50);assert.equal(beautyStatuses(v).length,i===2?1:0);}
  for(const [key,s]of beautyStatuses(x.target)){assert.equal(s.until-x.b.tick-1,2);if(CONTROL_STATUSES.includes(key))assert.ok(hasStatus(x.b,x.target,'resolve'));}
  assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
 }
 const x=beautyScene();x.us[3].status='reserve';assert.equal(bondHitEffect(x.b,x.u).allEnemies,false);assert.equal(bondHitEffect(x.b,x.us[3]),null);
});

test('Beauty probability can miss and full-field targets have independent seeded outcomes',()=>{
 const miss=beautyScene();beautyChance(0,()=>stepBattle(miss.b));assert.ok(miss.foes.every(v=>!beautyStatuses(v).length));assert.ok(miss.target.intent<50);
 let remote=false,mixed=false;
 for(let seed=1;seed<=24;seed++){
  const x=beautyScene();x.b.seed=seed;stepBattle(x.b);
  const results=x.foes.map(v=>beautyStatuses(v).length>0);remote ||= results.slice(1).some(Boolean);mixed ||= results.some(Boolean)&&results.some(v=>!v);
 }
 assert.ok(remote);assert.ok(mixed);
});

test('Beauty respects magic immunity, stasis, existing anomalies and control protection',()=>{
 beautyChance(1,()=>{
  const x=beautyScene();x.target.statuses.magicImmune={until:999};x.foes[1].statuses.stasis={until:999};x.foes[2].statuses.resolve={until:999};
  for(const key of ['slow','weaken','armorBreak'])setStatus(x.b,x.foes[2],key,20);
  for(const key of BOND_DESIGNS.bondBeauty.statuses)setStatus(x.b,x.foes[3],key,20);
  const existing=structuredClone(x.foes[3].statuses);stepBattle(x.b);
  assert.equal(x.target.intent,50+intentIncome(x.target).hit);assert.ok(!beautyStatuses(x.target).length);assert.ok(!beautyStatuses(x.foes[1]).length);assert.ok(!beautyStatuses(x.foes[2]).length);
  assert.deepEqual(x.foes[3].statuses,existing);
  const protectedOnly=beautyScene();protectedOnly.target.statuses.resolve={until:999};stepBattle(protectedOnly.b);
  assert.equal(beautyStatuses(protectedOnly.target).length,1);assert.ok(beautyStatuses(protectedOnly.target).every(([key])=>!CONTROL_STATUSES.includes(key)));
 });
});

test('Beauty full-field rolls exclude reserves, withdrawn and defeated units',()=>{
 beautyChance(1,()=>{
  const x=beautyScene();x.foes[1].status='reserve';x.foes[1].arrivalTick=999;x.foes[2].status='withdrawn';x.foes[3].status='defeated';x.foes[3].hp=0;
  stepBattle(x.b);assert.equal(beautyStatuses(x.target).length,1);assert.ok(x.foes.slice(1).every(v=>!beautyStatuses(v).length));
 });
});

test('Beauty full-field anomalies trigger once per contact attack and still trigger after a lethal hit',()=>{
 beautyChance(1,()=>{
  const x=beautyScene(undefined,0,'spear');const neighbors=hexNeighbors(x.u);
  x.foes.slice(0,3).forEach((v,i)=>Object.assign(v,{x:neighbors[i][0],y:neighbors[i][1]}));
  stepBattle(x.b);assert.ok(x.foes.every(v=>beautyStatuses(v).length===1));
  assert.equal(x.b.effects.filter(e=>e.from===x.u.id&&e.label==='倾国'&&e.intentDrained).length,3);
  assert.equal(x.foes[3].intent,50);
  const lethal=beautyScene();lethal.target.hp=1;stepBattle(lethal.b);assert.equal(lethal.target.status,'defeated');assert.ok(!beautyStatuses(lethal.target).length);assert.ok(lethal.foes.slice(1).every(v=>beautyStatuses(v).length===1));
 });
});

test('fully shielded hits and non-holders cannot trigger Beauty',()=>{
 beautyChance(1,()=>{
  const shielded=beautyScene();setStatus(shielded.b,shielded.target,'shield',10,{amount:shielded.target.maxHp,source:'test',label:'护盾'});stepBattle(shielded.b);
  assert.ok(shielded.foes.every(v=>!beautyStatuses(v).length));assert.equal(shielded.target.intent,50);
  const nonholder=beautyScene(['荀彧','貂蝉','甄氏','大乔','小乔']);assert.equal(sideBonds(nonholder.b,0).bondBeauty.tier,3);assert.equal(bondHitEffect(nonholder.b,nonholder.u),null);stepBattle(nonholder.b);assert.ok(nonholder.foes.every(v=>!beautyStatuses(v).length));
 });
});
