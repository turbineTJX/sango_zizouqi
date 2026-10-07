import {bondLineup} from './helpers/bond-lineups.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';import {BOND_ASSIGNMENTS as A} from '../data/design/bond-assignments.mjs';import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {sideBonds,bondAttributes,bondDamageImmunity} from '../bonds.mjs';import {validBondState} from '../bond-events.mjs';import {createScenario} from '../scenarios.mjs';import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';import {bondReference} from '../bond-reference.mjs';
import {unitAttributes} from '../unit-stats.mjs';import {bondContributors} from '../bond-display.mjs';
const ids=names=>names.map(name=>Object.values(O).find(o=>o.name===name).id);
function scene(names,side=0){const team=ids(names).map(id=>({id,type:'spear',troops:4000,level:10})),foe=ids(['吕布','马超','典韦','许褚','黄忠','张辽','徐晃','魏延','于禁','姜维'].filter(n=>!names.includes(n)).slice(0,6)).map(id=>({id,type:'spear',troops:4000,level:10}));const s=createScenario('custom-battle',8117,20,null,{seed:8117,terrain:'land',ownTeam:side?foe:team,enemyTeam:side?team:foe});for(const u of s.battle.sides.flatMap(a=>a.units))u.retreatAt=null;lockDeployment(s.battle);return s;}
test('all basic top tiers require at least six people and high caps are exceptionally scarce',()=>{
 for(const [id,d]of Object.entries(D)){
  const caps=Object.values(A).map(a=>a[id]||0).filter(Boolean).sort((a,b)=>b-a);assert.ok(caps.reduce((a,b)=>a+b,0)>=d.thresholds.at(-1));
  if(d.grade==='basic'){assert.ok(caps.filter(n=>n===3).length<=1);assert.ok(caps.filter(n=>n===2).length<=16);assert.ok(caps.slice(0,5).reduce((a,b)=>a+b,0)<d.thresholds.at(-1));}
 }
 assert.deepEqual(Object.entries(A).filter(([,a])=>a.bondPeach).map(([id])=>id).sort(),ids(['刘备','关羽','张飞']).sort());
 const bad=structuredClone(DESIGN_TABLES);bad.bonds.bondPower.thresholds=[2,6,7];assert.ok(validateDesignTables(bad).some(s=>s.includes('至少需要六人')));
 const over=structuredClone(DESIGN_TABLES);over.bondAssignments.cao.bondPower=3;assert.ok(validateDesignTables(over).some(s=>s.includes('高等级持有者过多')));
 assert.match(JSON.stringify(bondReference('bondPeach')),/桃园/);assert.doesNotMatch(JSON.stringify(bondReference('bondPeach')),/军纪提高0/);
});
test('advanced Valor activates immediately and follows live tiers without stack counters',()=>{
 const s=scene(bondLineup('bondValor',['吕布','马超','典韦','许褚'])),b=s.battle,u=b.sides[0].units[0];
 const enemy=b.sides[1].units[0];u.intent=90;enemy.intent=30;
 assert.equal(sideBonds(b,0).bondValor.tier,3);assert.equal(bondDamageImmunity(b,u,enemy),1);assert.equal(bondAttributes(b,u).attackSpeed,undefined);
 b.sides[0].units[3].status='reserve';assert.equal(bondDamageImmunity(b,u,enemy),.45);
 assert.ok(validBondState(u));u.bondState.valorStacks=1;assert.equal(validBondState(u),false);
});
test('basic Valor has no accumulating or once-only attack records in real combat',()=>{
 const s=scene(bondLineup('bondValor',['吕布','马超','典韦','许褚'])),b=s.battle;for(let i=0;i<80&&!b.result;i++)stepBattle(b);
 assert.ok(b.sides.flatMap(a=>a.units).every(u=>validBondState(u,b.tick)));validateSave(structuredClone(s));
});


test('specified advanced cores carry two points while companions carry one, with exact three example thresholds',()=>{
 assert.deepEqual(D.bondBeauty.thresholds,[2,3,5]);assert.deepEqual(D.bondPeach.thresholds,[1,2,3]);assert.deepEqual(D.bondValor.thresholds,[2,4,6]);
 assert.equal(A[ids(['貂蝉'])[0]].bondBeauty,2);assert.equal(A[ids(['吕布'])[0]].bondValor,2);assert.equal(A.liao.bondValor,1);
 assert.deepEqual(D.bondBeauty.roster.slice().sort(),ids(['貂蝉','甄氏','大乔','小乔']).sort());
 assert.deepEqual(D.bondValor.roster.slice().sort(),ids(['吕布','赵云','典韦','许褚','马超','张辽']).sort());
 assert.equal(A[ids(['邹氏'])[0]].bondBeauty,undefined);for(const name of ['黄盖','张绣'])assert.equal(A[ids([name])[0]].bondLastStand,undefined);
 for(const [key,d]of Object.entries(D).filter(([,d])=>d.grade==='advanced')){
  const caps=Object.values(A).map(a=>a[key]||0).filter(Boolean).sort((a,b)=>b-a);
  assert.ok(caps.every(n=>n<=2));assert.equal(caps.filter(n=>n===2).length,d.core?1:0);
  d.minContributors.forEach((n,i)=>{assert.ok(caps.slice(0,n-1).reduce((a,b)=>a+b,0)<d.thresholds[i]);assert.ok(caps.slice(0,n).reduce((a,b)=>a+b,0)>=d.thresholds[i]);});
 }
});

test('Beauty requires all four named women; removal, reserve and portrait points follow actual qualification',()=>{
 for(const side of [0,1]){
  const s=scene(['貂蝉','甄氏','大乔','小乔'],side),b=s.battle,us=b.sides[side].units;
  assert.deepEqual(sideBonds(b,side).bondBeauty,{points:5,tier:3});assert.deepEqual(bondContributors([],b,side,'bondBeauty').map(u=>u.points),[2,1,1,1]);
  for(const u of us){const status=u.status;u.status='reserve';assert.ok(sideBonds(b,side).bondBeauty.tier<3);assert.equal(bondContributors([],b,side,'bondBeauty').length,3);u.status=status;}
  const resumed=validateSave(structuredClone(s));for(let i=0;i<4;i++){stepBattle(b);stepBattle(resumed.battle);}assert.deepEqual(s,resumed);
 }
});

test('Valor needs its core and four strong companions; ordinary recruits cannot substitute for missing points',()=>{
 const withCore=scene(['吕布','赵云','典韦','许褚','马超']);assert.deepEqual(sideBonds(withCore.battle,0).bondValor,{points:6,tier:3});
 const noCore=scene(['赵云','典韦','许褚','马超','张辽']);assert.deepEqual(sideBonds(noCore.battle,0).bondValor,{points:5,tier:2});
 const mixed=scene(['吕布','赵云','典韦','邹氏','黄盖','张绣']);assert.deepEqual(sideBonds(mixed.battle,0).bondValor,{points:4,tier:2});
 for(const [key,d]of Object.entries(D).filter(([,d])=>d.grade==='basic')){const ones=Object.values(A).filter(a=>a[key]===1);assert.ok(ones.length>=6);assert.ok(6<d.thresholds.at(-1));}
});

test('advanced validation rejects point inflation and weak fillers even when the declared roster is forged to match',()=>{
 const inflated=structuredClone(DESIGN_TABLES);inflated.bondAssignments.liao.bondValor=2;assert.ok(validateDesignTables(inflated).some(e=>e.includes('指定核心二点')));
 const filler=structuredClone(DESIGN_TABLES),zou=ids(['邹氏'])[0];filler.bondAssignments[zou].bondBeauty=1;filler.bonds.bondBeauty.roster.push(zou);assert.ok(validateDesignTables(filler).some(e=>e.includes('核心资质')));
 const skip=structuredClone(DESIGN_TABLES);skip.bonds.bondValor.thresholds=[2,3,5];assert.ok(validateDesignTables(skip).some(e=>e.includes('组阵难度')));
});

test('one Peach member has a real first-tier discipline benefit and no damage-sharing partners',()=>{
 for(const side of [0,1]){const s=scene(['刘备'],side),b=s.battle,u=b.sides[side].units[0];assert.deepEqual(sideBonds(b,side).bondPeach,{points:1,tier:1});assert.ok(Math.abs(unitAttributes(u,b).discipline/unitAttributes(u).discipline-1.1)<1e-10);assert.deepEqual(b.sides[side].bondPeach.members,[]);assert.doesNotThrow(()=>validateSave(structuredClone(s)));}
});
