import {equipmentEntry} from './helpers/current-battle.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';import {lockDeployment,deployUnit,stepBattle,validateSave} from '../engine.mjs';import {OFFICER_DESIGNS as O}from '../data/design/officers.mjs';import {BOND_DESIGNS as D}from '../data/design/bonds.mjs';
import {formationCells,formationBoost,validFormationEntry,routDamageBonus,routSpeedBonus,recordBondDefeat,validBondRout} from '../bond-battlefield.mjs';import {bondAttributes,grantBondEntries,sideBonds}from '../bonds.mjs';import {canOccupy} from '../battlefield.mjs';import {bondSummary}from '../bond-display.mjs';
const id=name=>Object.values(O).find(o=>o.name===name).id;
const team=(names,troops=4000,level=10,type='spear')=>names.map(n=>({...equipmentEntry(id(n),type),troops,level}));
function scenario(own,enemy,extra={}){return createScenario('custom-battle',8282,20,null,{seed:8282,terrain:'land',ownTeam:team(own),enemyTeam:team(enemy),...extra});}
test('formation markers mirror both sides, adapt to terrain and cannot consume RNG or change with unit order',()=>{
 for(const terrain of ['land','forest','hill','marsh','river']){const s=scenario(['曹仁','郝昭','罗宪'],['张任','于禁','满宠'],{terrain}),b=s.battle,seed=b.seed,initial=formationCells(b,0);assert.equal(initial.length,3);assert.deepEqual(formationCells(b,1),initial.map(p=>({x:13-p.x,y:7-p.y})));assert.ok(initial.every(p=>canOccupy(b,b.sides[0].units[0],p.x,p.y)));b.sides[0].units.reverse();assert.deepEqual(formationCells(b,0),initial);assert.equal(b.seed,seed);}
 const navy=scenario(['曹仁','郝昭','罗宪'],['张任','于禁','满宠'],{terrain:'river',ownTeam:team(['曹仁','郝昭','罗宪'],4000,10,'ship')});assert.ok(formationCells(navy.battle,0).every(p=>canOccupy(navy.battle,navy.battle.sides[0].units[0],p.x,p.y)));
});
test('real legal deployment grants tile-only first-entry benefits, doubles holders and extends only a complete top formation',()=>{
 const s=scenario(['曹仁','郝昭','霍峻','罗宪','于禁','王平'],['关羽','张飞','刘备']),b=s.battle,own=b.sides[0].units;
 for(let i=0;i<own.length;i++)assert.equal(deployUnit(b,own[i].id,0,i),null);
 const marks=formationCells(b,0),arranged=[own.find(u=>u.id===id('曹仁')),own.find(u=>u.id===id('于禁')),own.find(u=>u.id===id('霍峻'))];for(let i=0;i<3;i++)assert.equal(deployUnit(b,arranged[i].id,marks[i].x,marks[i].y),null);
 assert.equal(formationBoost(b,arranged[0]),0);lockDeployment(b);assert.equal(sideBonds(b,0).bondGuard.tier,3);assert.equal(formationBoost(b,arranged[0]),.28);assert.equal(formationBoost(b,arranged[1]),.28);assert.equal(formationBoost(b,own.find(u=>u.id===id('郝昭'))),0);
 assert.ok(arranged.every(u=>u.bondFormation.complete));const snapshot=structuredClone(arranged[0].bondFormation);grantBondEntries(b);assert.deepEqual(arranged[0].bondFormation,snapshot);const copy=validateSave(structuredClone(s));for(let i=0;i<8&&!b.result;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(s,copy);
 assert.ok(bondAttributes(b,arranged[0]).attack.some(v=>v.label==='军阵阵位'));const bad=structuredClone(s);bad.battle.sides[0].units[0].bondFormation.tier=4;assert.throws(()=>validateSave(bad));
 b.tick=snapshot.tick+D.bondGuard.fullDuration+1;assert.equal(formationBoost(b,arranged[0]),0);
});
test('unmarked and reserved troops cannot retroactively receive a formation bonus by moving onto a tile',()=>{
 const s=scenario(['曹仁','郝昭','吕布'],['关羽','张飞','刘备']),b=s.battle,u=b.sides[0].units[0];assert.equal(deployUnit(b,u.id,0,0),null);lockDeployment(b);assert.equal(formationBoost(b,u),0);Object.assign(u,formationCells(b,0)[0]);grantBondEntries(b);assert.equal(formationBoost(b,u),0);assert.ok(validFormationEntry(b,u));
});
test('Rout accumulates actual enemy defeats on either side, bursts once, and resumes deterministically',()=>{
 for(const side of [0,1]){const heroes=team(['夏侯渊','张辽','甘宁','太史慈','孙策','马超'],5000),weak=team(['刘禅','刘璋','韩玄','刘度','孔伷','张鲁'],2000,1);const s=scenario([],[],{ownTeam:side?weak:heroes,enemyTeam:side?heroes:weak}),b=s.battle;for(const u of b.sides.flatMap(a=>a.units))u.retreatAt=null;lockDeployment(b);
  assert.equal(routDamageBonus(b,b.sides[side].units[0]),.12);let reached=false;
  for(let i=0;i<600&&!b.result;i++){stepBattle(b);if(b.sides[side].bondRout?.burstAt!==null&&b.sides[side].bondRout?.burstTier){reached=true;break;}}
  assert.ok(reached,'must reach three real defeats');const state=b.sides[side].bondRout;assert.equal(state.targets.length,3);assert.equal(state.burstTier,3);assert.ok(validBondRout(b,side));const outsider=b.sides[side].units.find(u=>u.id===id('马超'));assert.equal(routSpeedBonus(b,outsider),.25);assert.equal(bondSummary([],b,side).find(x=>x.id==='bondRaid').progress,3);
  const before=structuredClone(state);recordBondDefeat(b,b.sides[1-side].units.find(u=>u.id===state.targets[0]),outsider);assert.deepEqual(state,before);const copy=validateSave(structuredClone(s));for(let i=0;i<8&&!b.result;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(s,copy);const corrupt=structuredClone(s);corrupt.battle.sides[side].bondRout.targets.push(state.targets[0]);assert.throws(()=>validateSave(corrupt));
 }
});
test('rout excludes retreats, decoys, gates and friendly damage and does not grant a higher-tier burst retroactively',()=>{
 const s=scenario(['夏侯渊','张辽','甘宁','刘备'],['关羽','张飞','曹操','马超']),b=s.battle;lockDeployment(b);const source=b.sides[0].units[0],targets=b.sides[1].units;
 targets[0].status='withdrawn';targets[0].hp=0;recordBondDefeat(b,targets[0],source);assert.equal(b.sides[0].bondRout,undefined);targets[0].status='active';targets[0].isDecoy=true;recordBondDefeat(b,targets[0],source);assert.equal(b.sides[0].bondRout,undefined);delete targets[0].isDecoy;
 recordBondDefeat(b,targets[0],targets[1]);assert.equal(b.sides[0].bondRout,undefined);for(const target of targets.slice(0,3)){target.hp=0;recordBondDefeat(b,target,source);target.status='defeated';}assert.equal(b.sides[0].bondRout.burstTier,2);assert.equal(routSpeedBonus(b,b.sides[0].units.find(u=>u.id===id('刘备'))),0);assert.equal(routSpeedBonus(b,source),.18);
 b.tick+=D.bondRaid.burstDuration+1;assert.equal(routSpeedBonus(b,source),0);
});
