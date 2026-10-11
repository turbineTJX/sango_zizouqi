import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {planEnemyArmy,rankEnemyReserves} from '../battle-ai.mjs';
import {assessCombatForce} from '../strategic-combat-assessment.mjs';
import {officerRecommendation,rankOfficerCandidates} from '../officer-recommendation.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {setStatus} from '../tactics.mjs';
import {BOND_ASSIGNMENTS as CAPS} from '../data/design/bond-assignments.mjs';
import {OFFICER_CATALOG as OFFICERS} from '../officer-catalog.mjs';
const roster=(bond,n)=>OFFICERS.filter(u=>CAPS[u.id]?.[bond]).sort((a,b)=>CAPS[b.id][bond]-CAPS[a.id][bond]||a.id.localeCompare(b.id)).slice(0,n).map(u=>({id:u.id,type:'spear',troops:3000,level:10}));
function scene(bond='bondGuard',n=8){
 const own=roster(bond,n),enemy=OFFICERS.filter(u=>!own.some(v=>u.id===v.id)).slice(0,6).map(u=>({id:u.id,type:'halberd',troops:3000,level:10}));
 return generateBattle({seed:123456,terrain:'land',ownTeam:own,enemyTeam:enemy});
}
function clear(b){for(const u of b.sides.flatMap(s=>s.units))u.bondGrowth.levels={};return b;}
test('AI force assessment ignores both armies bond points while real combat attributes retain them',()=>{
 const state=scene('bondPower',6),b=state.battle,without=clear(structuredClone(b)),u=b.sides[0].units[0],plain=without.sides[0].units[0];
 assert.ok(unitAttributes(u,b).attack>unitAttributes(plain,without).attack,'the shared combat effect must still be active');
 const army={units:b.sides[0].units,leader:u.id,advisor:u.id,morale:80},other={...army,units:without.sides[0].units};
 const before=structuredClone(b);
 assert.deepEqual(assessCombatForce(army,{opponents:b.sides[1].units}),assessCombatForce(other,{opponents:without.sides[1].units}));
 assert.deepEqual(b,before);
});
for(const side of [0,1])test('AI starter rankings and deployment do not use bond levels or formation marks on side '+side,()=>{
 const b=scene().battle;
 if(side)[b.sides[0],b.sides[1]]=[b.sides[1],b.sides[0]];
 b.sides.forEach((s,i)=>s.units.forEach(u=>u.side=i));
 const without=clear(structuredClone(b)),order=x=>rankEnemyReserves(x,x.sides[side].units,side).map(u=>u.id);
 assert.deepEqual(order(b),order(without));
 planEnemyArmy(b,side);planEnemyArmy(without,side);
 const positions=x=>x.sides[side].units.map(u=>({id:u.id,status:u.status,x:u.x,y:u.y,tactics:u.tactics}));
 assert.deepEqual(positions(b),positions(without));
 assert.equal(b.seed,without.seed);
});
test('shared expedition, formation and unit recommendations give no score or ranking credit to bonds',()=>{
 const b=scene().battle,s={};
 for(const task of ['expedition','formation','unit']){
  const units=b.sides[0].units,without=units.map(u=>({...u,bondGrowth:{...u.bondGrowth,levels:{}}}));
  units.forEach((u,i)=>assert.deepEqual(officerRecommendation(s,u,{task}),officerRecommendation(s,without[i],{task})));
  assert.deepEqual(rankOfficerCandidates(s,units,{task}).map(r=>r.unit.id),rankOfficerCandidates(s,without,{task}).map(r=>r.unit.id));
 }
});
test('AI attribute views exclude temporary bond benefits but retain normal tactic buffs without changing inputs',()=>{
 const b=scene('bondPower',6).battle,u=b.sides[0].units[0],before=unitAttributes(u,b,{ignoreBonds:true});
 setStatus(b,u,'attackHaste',8,{sourceId:u.id,sourceSkillName:'蓄锐'});
 const saved=structuredClone(u);
 assert.equal(unitAttributes(u,b,{ignoreBonds:true}).attackInterval,before.attackInterval);
 assert.ok(unitAttributes(u,b).attackInterval<before.attackInterval);
 assert.deepEqual(u,saved);
 delete u.statuses.attackHaste;
 setStatus(b,u,'valor',8,{sourceId:u.id,sourceSkillName:'浴血横扫'});
 assert.ok(unitAttributes(u,b,{ignoreBonds:true}).attack>before.attack);
});
