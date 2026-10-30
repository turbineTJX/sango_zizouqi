import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave,planBattleCouncilAI} from '../engine.mjs';
import {unitTactics,setStatus,TACTICS_BOOK,basicSupportTargets,famousTargets} from '../tactics.mjs';
import {tacticHolder} from './helpers/current-battle.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {configureReserveEntry,previewReserveEntry,planReserveEntriesAI} from '../reserve-entry.mjs';
import {tacticShapeTargets,tacticRay} from '../tactic-positioning.mjs';
import {battleCouncilMarkup} from '../battle-council.mjs';
import {BATTLE_MAPS} from '../data/design/battle-maps.mjs';
import {blockedTerrain,terrainAt} from '../battlefield.mjs';
import {hexNeighbors,hexBeyond,insideHexGrid} from '../hex-grid.mjs';
import {createDecoy,decoyTargets} from '../battle-status-rules.mjs';

function scene(skill='longbow-shot',type='longbow',{side=0,allies=1,enemies=4}={}){
 const caster=tacticHolder(skill,type,[],true),ids=OFFICER_CATALOG.filter(o=>o.id!==caster).map(o=>o.id);
 const entry=(id,type='archer')=>({id,type,troops:3000,level:10});
 const own=[entry(caster,type),...ids.splice(0,allies-1).map(id=>entry(id))],enemy=ids.slice(0,enemies).map(id=>entry(id));
 const state=generateBattle({...defaultCustomBattle(),seed:81527,terrain:'land',mapId:'plain-open',battleKind:'field',events:[],ownTeam:side?enemy:own,enemyTeam:side?own:enemy});
 const b=state.battle;assert.equal(lockDeployment(b),null);
 const u=b.sides[side].units.find(u=>u.id===caster),friends=b.sides[side].units.filter(v=>v!==u),foes=b.sides[1-side].units;
 const x=n=>side?13-n:n;
 Object.assign(u,{x:x(4),y:3});
 friends.forEach((v,i)=>Object.assign(v,{x:x(2),y:i+1}));
 foes.forEach((v,i)=>Object.assign(v,{x:x(6+i%3),y:i<3?3:6}));
 for(const v of b.sides.flatMap(s=>s.units)){v.cooldown=999;v.intent=0;v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));setStatus(b,v,'root',999);}
 return {state,b,u,friends,foes,side,x};
}
function launch(p,skill){
 const s=TACTICS_BOOK[skill];assert.ok(p.u.tactics.includes(skill));p.u.intent=Math.max(s.threshold,s.intentCost);p.u.skillReady[skill]=0;
 stepBattle(p.b,{aiSides:[]});assert.equal(p.u.tacticCasts[skill],1);return s;
}
function settle(p){while(p.u.tacticAim&&!p.b.result)stepBattle(p.b,{aiSides:[]});}
function resume(p,n=8){const copy=validateSave(structuredClone(p.state));for(let i=0;i<n;i++){stepBattle(p.b,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});}assert.deepEqual(p.state,copy);}

test('locked longbow ray damages three aligned troops but leaves an off-line troop untouched on either side',()=>{
 for(const side of [0,1]){
  const p=scene('longbow-shot','longbow',{side}),hp=p.foes.map(u=>u.hp);launch(p,'longbow-shot');
  assert.ok(p.u.tacticAim);assert.deepEqual(p.foes.map(u=>u.hp),hp,'windup does not deal damage');
  validateSave(structuredClone(p.state));settle(p);
  assert.equal(p.foes.filter((u,i)=>u.hp<hp[i]).length,3);assert.equal(p.foes[3].hp,hp[3]);
  assert.equal(p.u.tacticCasts['longbow-shot'],1);resume(p);
 }
});
test('a target leaving a locked area makes the tactic miss without refund or homing',()=>{
 const p=scene('longbow-shot','longbow',{enemies:1});launch(p,'longbow-shot');
 const aim=structuredClone(p.u.tacticAim),ready=p.u.skillReady['longbow-shot'],hp=p.foes[0].hp;
 Object.assign(p.foes[0],{x:8,y:6});settle(p);
 assert.equal(p.foes[0].hp,hp);assert.ok(p.b.effects.some(e=>e.from===p.u.id&&e.missed&&e.text==='落空'));
 assert.equal(p.u.skillReady['longbow-shot'],ready);assert.equal(p.u.tacticCasts['longbow-shot'],1);
 assert.deepEqual(p.b.effects.find(e=>e.missed).tacticGeometry.cells,aim.cells);resume(p);
});
test('a different enemy entering the locked ray can be hit while the original target escapes',()=>{
 const p=scene('longbow-shot','longbow',{enemies:2});Object.assign(p.foes[1],{x:8,y:6});launch(p,'longbow-shot');
 const point=p.u.tacticAim.point,original=p.foes.find(u=>u.id===p.u.tacticAim.targetId),entrant=p.foes.find(u=>u!==original);
 Object.assign(original,{x:8,y:6});Object.assign(entrant,point);settle(p);
 assert.equal(original.hp,original.initial);assert.ok(entrant.hp<entrant.initial);assert.ok(!p.b.effects.some(e=>e.missed));resume(p);
});
test('windup is interrupted by real control and its already spent use remains spent',()=>{
 const p=scene();launch(p,'longbow-shot');setStatus(p.b,p.u,'seal',3);stepBattle(p.b,{aiSides:[]});
 assert.equal(p.u.tacticAim,null);assert.ok(p.b.effects.some(e=>e.missed&&e.text==='蓄势中断'));assert.equal(p.u.tacticCasts['longbow-shot'],1);resume(p);
});
test('fan sweep locks a contiguous forward sector and cannot sweep an enemy behind the caster',()=>{
 const p=scene('cleave','halberd',{enemies:4});
 [[5,3],[5,2],[5,4],[3,3]].forEach(([x,y],i)=>Object.assign(p.foes[i],{x,y}));
 launch(p,'cleave');const cells=p.u.tacticAim.cells;assert.equal(cells.length,3);assert.ok(!cells.some(c=>c.x===3&&c.y===3));settle(p);
 assert.ok(p.foes.slice(0,3).every(u=>u.hp<u.initial));assert.equal(p.foes[3].hp,p.foes[3].initial);resume(p);
});

test('a real decoy inside a locked sweep absorbs its hit without damaging its owner outside the area',()=>{
 const p=scene('cleave','halberd',{enemies:1}),owner=p.foes[0];
 assert.equal(createDecoy(p.b,owner),true);
 const proxy=decoyTargets(p.b,owner.side)[0],hp=owner.hp;
 assert.deepEqual({x:proxy.x,y:proxy.y},{x:5,y:3});
 launch(p,'cleave');
 assert.ok(p.u.tacticAim.cells.some(c=>c.x===proxy.x&&c.y===proxy.y));
 assert.ok(!p.u.tacticAim.cells.some(c=>c.x===owner.x&&c.y===owner.y));
 validateSave(structuredClone(p.state));settle(p);
 assert.ok(p.b.effects.some(e=>e.from===p.u.id&&e.decoyDamage>0));
 assert.equal(owner.hp,hp);assert.equal(owner.battleDamage,0);
 assert.equal(p.u.tacticCasts.cleave,1);resume(p);
});
test('rally follows forward placement rather than always feeding the lowest-intent ally on both sides',()=>{
 for(const side of [0,1]){
  const p=scene('rally','archer',{side,allies:3,enemies:1}),[front,back]=p.friends;
  Object.assign(front,{x:p.x(5),y:3,intent:20});Object.assign(back,{x:p.x(3),y:3,intent:0});
  assert.equal(basicSupportTargets(p.b,p.u,TACTICS_BOOK.rally)[0],front);launch(p,'rally');assert.ok(front.intent>20);assert.equal(back.intent,0);resume(p);
 }
});
test('column support protects the intended allies and still requires a real useful recipient',()=>{
 const p=scene('baier-guard','baier',{allies:4,enemies:1}),[one,two,other]=p.friends;
 [[one,4,2],[two,4,4],[other,5,3]].forEach(([u,x,y])=>{Object.assign(u,{x,y,hp:2500,battleDamage:500});});
 const s=TACTICS_BOOK['baier-guard'];assert.deepEqual(famousTargets(p.b,p.u,s),[one,two].sort((a,c)=>a.id.localeCompare(c.id)));
 launch(p,'baier-guard');assert.ok(one.statuses.shield&&two.statuses.shield);assert.ok(!other.statuses.shield);resume(p);
});
test('pending aim persists exactly across a saved continuation and forged cells are rejected',()=>{
 const p=scene();launch(p,'longbow-shot');
 const tampered=structuredClone(p.state);tampered.battle.sides[0].units.find(u=>u.id===p.u.id).tacticAim.cells=[];
 assert.throws(()=>validateSave(tampered),/锁定覆盖格/);resume(p,12);
});
test('a ray stops at real blocked terrain and does not turn toward extra targets',()=>{
 const p=scene(),s=TACTICS_BOOK['longbow-shot'];
 const cells=tacticRay(p.b,p.u,p.foes[0],5);assert.ok(cells.every(c=>c.y===3));
 const targets=tacticShapeTargets(p.b,p.u,s,p.foes[0],p.foes,5);assert.equal(targets.length,3);
 let checked=false;
 for(const [id,map] of Object.entries(BATTLE_MAPS)){
  p.b.mapId=id;p.b.terrain=map.terrain;
  for(let y=0;y<8&&!checked;y++)for(let x=0;x<14&&!checked;x++){
   const wall={x,y};if(terrainAt(p.b,x,y)!=='rock')continue;
   for(const [ox,oy] of hexNeighbors(wall)){
    const origin={x:ox,y:oy},target=hexBeyond(origin,wall);
    if(!insideHexGrid(ox,oy)||terrainAt(p.b,ox,oy)==='rock'||blockedTerrain(p.b,ox,oy)||!insideHexGrid(target.x,target.y)||terrainAt(p.b,target.x,target.y)==='rock'||blockedTerrain(p.b,target.x,target.y))continue;
    assert.deepEqual(tacticRay(p.b,origin,target,5),[],'a real intervening mountain wall must stop the ray');checked=true;break;
   }
  }if(checked)break;
 }
 assert.ok(checked,'must exercise a real map wall between two open cells');
 // Shape selection itself never rewrites positions or the random state.
 const before=structuredClone(p.b),seed=p.b.seed;tacticShapeTargets(p.b,p.u,s,p.foes[0],p.foes,5);assert.deepEqual(p.b,before);assert.equal(p.b.seed,seed);
});

function reserveScene(){
 const ids=OFFICER_CATALOG.filter(o=>o.id!=='cao').slice(0,14).map(o=>o.id),entry=id=>({id,type:'spear',troops:3000,level:10});
 const state=generateBattle({...defaultCustomBattle(),seed:92113,terrain:'land',mapId:'plain-open',events:[],ownTeam:ids.slice(0,8).map(entry),enemyTeam:ids.slice(8).map(entry)});
 return {state,b:state.battle};
}
test('reserve entry preview and rejection do not change soldiers, order or an active troop',()=>{
 const p=reserveScene(),u=p.b.sides[0].units.find(u=>u.status==='reserve'),before=structuredClone(p.b);
 assert.equal(previewReserveEntry(p.b,u.id,4,7).kind,'entry');assert.deepEqual(p.b,before);
 assert.match(configureReserveEntry(p.b,u.id,{x:9,y:3}),/布阵区/);assert.match(configureReserveEntry(p.b,p.b.sides[0].units[0].id,{x:4,y:7}),/后备/);assert.deepEqual(p.b,before);
 assert.equal(configureReserveEntry(p.b,u.id,{x:4,y:7}),null);assert.equal(u.status,'reserve');assert.equal(u.x,-1);validateSave(structuredClone(p.state));
 assert.match(battleCouncilMarkup(p.b),/reserve-entry-select/);assert.match(battleCouncilMarkup(p.b),/5列 8行/);
 lockDeployment(p.b);assert.match(configureReserveEntry(p.b,u.id,null),/军议/);
});
test('a real retreat opens a slot and the next reserve enters at its saved position without resources appearing',()=>{
 for(const blocked of [false,true]){
  const p=reserveScene(),own=p.b.sides[0].units,leaver=own[0],u=own.find(v=>v.status==='reserve'),point={x:4,y:7};
  assert.equal(configureReserveEntry(p.b,u.id,point),null);
  own.filter(v=>v.status==='active').forEach((v,i)=>Object.assign(v,{x:0,y:i}));
  if(blocked)Object.assign(own[1],point);
  Object.assign(leaver,{x:0,y:0,retreatAt:leaver.hp});
  lockDeployment(p.b);for(const v of p.b.sides.flatMap(s=>s.units)){setStatus(p.b,v,'root',999);v.cooldown=999;v.skillReady=Object.fromEntries(unitTactics(v).map(t=>[t.id,999]));}
  const troops=own.reduce((n,v)=>n+v.hp,0);stepBattle(p.b,{aiSides:[]});
  assert.equal(leaver.status,'withdrawn');assert.equal(u.status,'active');
  if(blocked)assert.notDeepEqual({x:u.x,y:u.y},point);else assert.deepEqual({x:u.x,y:u.y},point);
  assert.deepEqual(u.reserveEntry,point);assert.equal(own.reduce((n,v)=>n+v.hp,0),troops);resume(p);
 }
});
test('AI reserve entry uses the shared legal operation and does not consult bond points or random state',()=>{
 for(const side of [0,1]){
  const p=reserveScene();if(side){[p.b.sides[0],p.b.sides[1]]=[p.b.sides[1],p.b.sides[0]];p.b.sides.forEach((s,i)=>s.units.forEach(u=>u.side=i));}
  for(const u of p.b.sides[side].units)if(u.status==='reserve')u.reserveEntry=null;
  const other=structuredClone(p.b);for(const u of other.sides.flatMap(s=>s.units))u.bondGrowth.levels={};
  const seed=p.b.seed;planReserveEntriesAI(p.b,side);planReserveEntriesAI(other,side);
  const picks=b=>b.sides[side].units.filter(u=>u.status==='reserve').map(u=>[u.id,u.reserveEntry]);assert.deepEqual(picks(p.b),picks(other));assert.equal(p.b.seed,seed);
  for(const u of p.b.sides[side].units.filter(u=>u.status==='reserve'))assert.equal(configureReserveEntry(p.b,u.id,u.reserveEntry,side),null);
 }
});
test('AI councils preserve active positions during reinforcements while configuring arrived reserves',()=>{
 const p=reserveScene();lockDeployment(p.b);p.b.reinforcementCouncil='open';
 const before=p.b.sides[0].units.filter(u=>u.status==='active').map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp}));
 planBattleCouncilAI(p.b,0);
 assert.deepEqual(p.b.sides[0].units.filter(u=>u.status==='active').map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp})),before);
 assert.ok(p.b.sides[0].units.filter(u=>u.status==='reserve').every(u=>u.reserveEntry));validateSave(structuredClone(p.state));
});
