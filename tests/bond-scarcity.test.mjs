import test from 'node:test';import assert from 'node:assert/strict';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';import {BOND_ASSIGNMENTS as A} from '../data/design/bond-assignments.mjs';import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {sideBonds,bondAttributes} from '../bonds.mjs';import {resolveBondEvent,validBondState} from '../bond-events.mjs';import {createScenario} from '../scenarios.mjs';import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';import {bondReference} from '../bond-reference.mjs';
const ids=names=>names.map(name=>Object.values(O).find(o=>o.name===name).id);
function scene(names,side=0){const team=ids(names).map(id=>({id,type:'spear',troops:4000,level:10})),foe=ids(['吕布','马超','典韦','许褚','黄忠','张辽','徐晃','魏延','于禁','姜维'].filter(n=>!names.includes(n)).slice(0,6)).map(id=>({id,type:'spear',troops:4000,level:10}));const s=createScenario('custom-battle',8117,20,null,{seed:8117,terrain:'land',ownTeam:side?foe:team,enemyTeam:side?team:foe});for(const u of s.battle.sides.flatMap(a=>a.units))u.retreatAt=null;lockDeployment(s.battle);return s;}
test('all ordinary top tiers require at least four people and high caps are exceptionally scarce',()=>{
 for(const [id,d]of Object.entries(D)){
  const caps=Object.values(A).map(a=>a[id]||0).filter(Boolean).sort((a,b)=>b-a);assert.ok(caps.reduce((a,b)=>a+b,0)>=d.thresholds.at(-1));
  if(d.category!=='rare'){assert.ok(caps.filter(n=>n===3).length<=1);assert.ok(caps.filter(n=>n===2).length<=16);assert.ok(caps.slice(0,3).reduce((a,b)=>a+b,0)<d.thresholds.at(-1));}
 }
 assert.deepEqual(Object.entries(A).filter(([,a])=>a.bondPeach).map(([id])=>id).sort(),ids(['刘备','关羽','张飞']).sort());
 const bad=structuredClone(DESIGN_TABLES);bad.bonds.bondHorse.thresholds=[2,3,5,7];assert.ok(validateDesignTables(bad).some(s=>s.includes('至少需要四人')));
 const over=structuredClone(DESIGN_TABLES);over.bondAssignments.cao.bondHorse=3;assert.ok(validateDesignTables(over).some(s=>s.includes('高等级持有者过多')));
 assert.match(JSON.stringify(bondReference('bondPeach')),/桃园/);assert.doesNotMatch(JSON.stringify(bondReference('bondPeach')),/军纪提高0/);
});
test('Valor grows once per actual attack round, respects the tier and grants full-stack intent only once',()=>{
 const s=scene(['吕布','马超','典韦','许褚']),b=s.battle,u=b.sides[0].units[0];let rally=0;const api={intent:(t,n)=>rally+=n,signal:()=>{}};
 assert.equal(sideBonds(b,0).bondValor.tier,3);
 for(let i=0;i<8;i++){b.tick++;resolveBondEvent(b,u,'basicHit',api);resolveBondEvent(b,u,'basicHit',api);assert.ok(u.bondState.valorStacks<=5);}
 assert.equal(rally,D.bondValor.rallyIntent);assert.equal(u.bondState.valorStacks,5);assert.equal(bondAttributes(b,u).attackSpeed.find(x=>x.label.startsWith('勇武')).factor,1.2);
 b.sides[0].units[3].status='reserve';assert.equal(bondAttributes(b,u).attackSpeed.find(x=>x.label.startsWith('勇武')).factor,1.15);
 assert.ok(validBondState(u,b.tick));u.bondState.valorStacks=100;assert.equal(validBondState(u,b.tick),false);
});
test('Valor stacks through real engine hits rather than synthetic actions',()=>{
 const s=scene(['吕布','马超','典韦','许褚']),b=s.battle;for(let i=0;i<120&&!b.result&&!b.sides[0].units.some(u=>u.bondState.valorStacks>=2);i++)stepBattle(b);
 assert.ok(b.sides[0].units.some(u=>u.bondState.valorStacks>=2));validateSave(structuredClone(s));
});


