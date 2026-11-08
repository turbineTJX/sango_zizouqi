import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave,planBattleCouncilAI} from '../engine.mjs';
import {unitTactics,setStatus,TACTICS_BOOK,tacticOpening,basicSupportTargets,famousTargets} from '../tactics.mjs';
import {tacticHolder} from './helpers/current-battle.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {configureReserveEntry,previewReserveEntry,planReserveEntriesAI} from '../reserve-entry.mjs';
import {tacticShapeTargets,tacticRay} from '../tactic-positioning.mjs';
import {BATTLE_MAPS} from '../data/design/battle-maps.mjs';
import {blockedTerrain,terrainAt} from '../battlefield.mjs';
import {hexNeighbors,hexBeyond,insideHexGrid} from '../hex-grid.mjs';
import {createDecoy,decoyTargets} from '../battle-status-rules.mjs';
import {currentBattle,readyCurrent} from './helpers/current-battle.mjs';
import {canOccupy} from '../battlefield.mjs';

function scene(skill='longbow-shot',type='longbow',{side=0,allies=1,enemies=4}={}){
 const caster=tacticHolder(skill,type,[],false),ids=OFFICER_CATALOG.filter(o=>o.id!==caster).map(o=>o.id);
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


for(const skill of ['unique-person-433','unique-person-516','unique-person-290','unique-person-558','unique-person-246','unique-person-603','unique-person-661','undermine'])test(skill+' locks its area on both sides, can miss and can hit a replacement',()=>{
 for(const side of [0,1])for(const replace of [false,true]){
  const p=scene(skill,'spear',{side,enemies:2}),s=TACTICS_BOOK[skill];
  Object.assign(p.foes[0],{x:p.x(5),y:3,intent:100});Object.assign(p.foes[1],{x:p.x(10),y:6,intent:100});
  launch(p,skill);assert.ok(p.u.tacticAim);const aim=structuredClone(p.u.tacticAim);
  assert.equal(p.foes[0].hp,p.foes[0].initial,'no instant damage');validateSave(structuredClone(p.state));
  Object.assign(p.foes[0],{x:p.x(11),y:7});if(replace)Object.assign(p.foes[1],aim.point);
  settle(p);assert.equal(p.foes[0].hp,p.foes[0].initial);assert.equal(p.foes[0].intent,100);
  if(replace){if(skill==='undermine')assert.ok(p.foes[1].intent<100);else assert.ok(p.foes[1].hp<p.foes[1].initial);}
  else assert.ok(p.b.effects.some(e=>e.from===p.u.id&&e.missed));
  assert.equal(p.u.tacticCasts[skill],1);resume(p);
 }
});
test('Guan Yu checks current negative status only, never records or stacks openings',()=>{
 const s=TACTICS_BOOK['unique-person-99'],b={tick:10},u={statuses:{}};
 assert.equal(tacticOpening(b,s,u).setup,false);
 for(const key of ['burn','weaken','stun','root','armorBreak','plague']){
  u.statuses={[key]:{until:11}};assert.equal(tacticOpening(b,s,u).scale,.9,key);
  b.tick=11;assert.equal(tacticOpening(b,s,u).setup,false);b.tick=10;
 }
 u.statuses={weaken:{until:12},armorBreak:{until:12}};assert.equal(tacticOpening(b,s,u).scale,.9);
 u.statuses={ward:{until:12}};assert.equal(tacticOpening(b,s,u).setup,false);
});
test('all hostile multi-target tactics have locked geometry; support remains immediate',()=>{
 for(const s of Object.values(TACTICS_BOOK)){
  if(s.targets>1&&s.mode!=='support'||['bombard','broadside','undertow','wildfire','scatter','cleave','thrust'].includes(s.effect))assert.ok(s.geometry,s.name);
  if(s.mode==='support')assert.equal(s.geometry,undefined,s.name);
 }
});
for(const [skill,type]of [['bombard','siege'],['broadside','ship']])test(skill+' uses its real equipped form and can miss without a second target search',()=>{
 const p=currentBattle(skill,type),{b,u,target}=p;
 for(const v of b.sides.flatMap(s=>s.units))setStatus(b,v,'root',999);
 readyCurrent(p,skill);stepBattle(b,{aiSides:[]});assert.ok(u.tacticAim);
 const aim=structuredClone(u.tacticAim),hp=target.hp;
 const destinations=[];for(let y=0;y<8;y++)for(let x=0;x<14;x++)if(canOccupy(b,target,x,y)&&!aim.cells.some(c=>c.x===x&&c.y===y)&&!b.sides.flatMap(s=>s.units).some(v=>v.x===x&&v.y===y))destinations.push({x,y});
 assert.ok(destinations.length);Object.assign(target,destinations.at(-1));
 while(u.tacticAim)stepBattle(b,{aiSides:[]});assert.equal(target.hp,hp);assert.equal(u.tacticCasts[skill],1);
 assert.ok(!b.effects.some(e=>e.from===u.id&&e.to===target.id&&e.damage>0));
});
