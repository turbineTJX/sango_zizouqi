import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {planEnemyArmy} from '../battle-ai.mjs';
import {fillSlots,lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {planReserveEntriesAI,configureReserveEntry,reserveEntryCells} from '../reserve-entry.mjs';
import {BATTLE_MAPS,battleMap} from '../data/design/battle-maps.mjs';
import {formationCells} from '../bond-battlefield.mjs';
import {hexDistance,hexNeighbors,insideHexGrid} from '../hex-grid.mjs';
import {routeTo,unitTactics} from '../tactics.mjs';
import {chooseStratagemPoint} from '../stratagem-area.mjs';
import {STRATAGEMS} from '../stratagems.mjs';
import {currentBattle} from './helpers/current-battle.mjs';
import {shouldReturnToDefense,insideDefenseLine} from '../defense-line.mjs';

const rotate=p=>({x:13-p.x,y:7-p.y});
function mirrored(b){
 const c=structuredClone(b);c.mapData={...structuredClone(battleMap(b)),tiles:battleMap(b).tiles.slice().reverse().map(row=>row.slice().reverse())};
 c.sides.reverse();
 for(const [side,s] of c.sides.entries())for(const u of s.units){u.side=side;if(u.x>=0)Object.assign(u,rotate(u));if(u.reserveEntry)u.reserveEntry=rotate(u.reserveEntry);}
 return c;
}
const positions=s=>s.units.map(u=>({id:u.id,x:u.x,y:u.y,formation:u.formation,entry:u.reserveEntry}));

test('full board rotation preserves every hex distance and legal neighbor',()=>{
 const cells=Array.from({length:112},(_,i)=>({x:i%14,y:Math.floor(i/14)}));
 for(const a of cells){
  for(const b of cells)assert.equal(hexDistance(a,b),hexDistance(rotate(a),rotate(b)));
  for(const [x,y] of hexNeighbors(a).filter(([x,y])=>insideHexGrid(x,y)))assert.equal(hexDistance(rotate(a),rotate({x,y})),1);
 }
});

test('AI deployment and reserve entry rotate with the battlefield without changing RNG or roster order',()=>{
 for(const id of ['plain-open','plain-ridges','hill-pass','river-harbor']){
  const b=createScenario('field',715123).battle;b.mapId=id;b.mapData=structuredClone(BATTLE_MAPS[id]);
  for(const u of b.sides.flatMap(s=>s.units))u.reserveEntry=null;
  Object.assign(b.sides[0].units.at(-1),{status:'reserve',x:-1,y:-1});
  const c=mirrored(b),seed=b.seed,order=b.sides.map(s=>s.units.map(u=>u.id));
  planEnemyArmy(b,0);planEnemyArmy(c,1);planReserveEntriesAI(b,0);planReserveEntriesAI(c,1);
  assert.deepEqual(positions(c.sides[1]),positions(mirrored(b).sides[1]),id);
  assert.equal(b.seed,seed);assert.equal(c.seed,seed);assert.deepEqual(b.sides.map(s=>s.units.map(u=>u.id)),order);
 }
});

test('default and configured reserves wait for a real own-side entry cell on both controllers',()=>{
 for(const side of [0,1])for(const ai of [false,true])for(const configured of [false,true]){
  const b=createScenario('field',715123).battle;lockDeployment(b);
  const own=b.sides[side].units,hp=own.reduce((n,u)=>n+u.hp,0);
  for(const u of own){u.status='reserve';u.x=-1;u.y=-1;u.reserveEntry=null;}
  if(configured){b.reinforcementCouncil='open';for(const u of own)assert.equal(configureReserveEntry(b,u.id,side?{x:10,y:4}:{x:3,y:3},side),null);b.reinforcementCouncil=null;}
  b.mapData=structuredClone(BATTLE_MAPS['plain-open']);
  for(let y=0;y<8;y++)for(let x=side?9:0;x<=(side?13:4);x++)b.mapData.tiles[y][x]='rock';
  fillSlots(b,side,{ai});assert.ok(own.every(u=>u.status==='reserve'),'blocked home area cannot spawn across the battlefield');
  const p=side?{x:10,y:4}:{x:3,y:3};b.mapData.tiles[p.y][p.x]='land';
  fillSlots(b,side,{ai});const active=own.filter(u=>u.status==='active');assert.equal(active.length,1);assert.deepEqual({x:active[0].x,y:active[0].y},p);
  assert.equal(own.reduce((n,u)=>n+u.hp,0),hp);const after=structuredClone(b);fillSlots(b,side,{ai});assert.deepEqual(b,after);
 }
});

test('occupied reserve fallback and blocked formation marks rotate without choosing rock',()=>{
 const b=createScenario('field',715123).battle;b.mapData=structuredClone(BATTLE_MAPS['plain-open']);
 const u=b.sides[0].units.at(-1);Object.assign(u,{status:'reserve',x:-1,y:-1,reserveEntry:{x:3,y:3}});
 Object.assign(b.sides[0].units[0],u.reserveEntry);
 b.mapData.tiles[2][3]='rock';b.mapData.tiles[3][2]='rock';
 for(const id of ['bondGuard','bondTigerFormation','bondDragonFormation']){
  // Occupy every original mark with impassable terrain so the fallback is exercised.
  for(const p of formationCells(b,0,id))b.mapData.tiles[p.y][p.x]='rock';
  const c=mirrored(b),marks=formationCells(b,0,id);
  assert.ok(marks.every(p=>b.mapData.tiles[p.y][p.x]!=='rock'));
  assert.deepEqual(formationCells(c,1,id),marks.map(rotate));
 }
 const c=mirrored(b),v=c.sides[1].units.find(v=>v.id===u.id);
 assert.deepEqual(reserveEntryCells(c,v),reserveEntryCells(b,u).map(rotate));
});

test('automatic movement and tactic paths take corresponding legal routes after rotation',()=>{
 const b=createScenario('field',715123).battle;b.mapData=structuredClone(BATTLE_MAPS['plain-open']);lockDeployment(b);
 const u=b.sides[0].units[0],target=b.sides[1].units[0];b.sides[0].units=[u];b.sides[1].units=[target];
 Object.assign(u,{x:2,y:3});Object.assign(target,{x:10,y:3});
 for(const v of [u,target]){v.intent=0;v.cooldown=999;v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));}
 target.statuses.root={until:999};b.mapData.tiles[3][4]='rock';
 const c=mirrored(b),v=c.sides[1].units[0],other=c.sides[0].units[0];
 const path=routeTo(b,u,target,112,{charging:false,requireStrike:false}),mirror=routeTo(c,v,other,112,{charging:false,requireStrike:false});
 assert.ok(path?.length);assert.deepEqual(mirror,path.map(rotate));
 for(let i=0;i<3;i++){stepBattle(b,{aiSides:[]});stepBattle(c,{aiSides:[]});assert.deepEqual({x:v.x,y:v.y},rotate(u));}
});

test('AI area command ties rotate with the caster side while retaining effective target counts',()=>{
 const b=createScenario('field',715123).battle;
 for(const s of b.sides)for(const [i,u] of s.units.entries())Object.assign(u,{status:'active',x:2+i%3*3,y:1+Math.floor(i/3)*4});
 const c=mirrored(b);
 for(const key of ['fortify','zhou-redcliffs'])for(const side of [0,1]){
  const p=chooseStratagemPoint(b,STRATAGEMS[key],side);assert.ok(p);
  assert.deepEqual(chooseStratagemPoint(c,STRATAGEMS[key],1-side),{...rotate(p),rotation:p.rotation});
 }
});

test('returning defenders disengage from real contact without saving their own gate as an enemy target',()=>{
 for(const side of [0,1]){
  const p=currentBattle('tremor','siege',{side}),{b,target,ally,u,rear}=p;
  const at=(unit,x,y)=>Object.assign(unit,side?rotate({x,y}):{x,y});
  at(u,8,3);at(ally,7,2);at(target,6,3);at(rear,13,7);
  assert.equal(shouldReturnToDefense(b,target),true);
  stepBattle(b,{aiSides:[]});assert.ok(target.disengage);assert.equal(target.disengage.targetId,null);
  const copy=validateSave(structuredClone(p.state));
  for(let i=0;i<36&&!b.result&&!insideDefenseLine(target);i++){stepBattle(b,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});validateSave(structuredClone(p.state));assert.deepEqual(copy.battle,b);}
  assert.ok(insideDefenseLine(target));
 }
});
