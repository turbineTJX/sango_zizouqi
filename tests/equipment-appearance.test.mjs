import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from '../vendor/three/three.module.js';
import {createSiegeModel} from '../art-siege-models.mjs';
import {siegeFigureMarkup,unitModelKey,unitSpriteClips} from '../unit-appearance.mjs';
import {BattleArt} from '../art-battle.mjs';
import {art} from '../art-assets.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {setStatus} from '../tactics.mjs';
import {allLearnedTacticIds} from '../tactic-learning.mjs';
import {equipmentEntry} from './helpers/current-battle.mjs';
import {buildingCombatState} from '../building-rules.mjs';

test('native models distinguish covered ram, throwing arm and tall siege tower',()=>{
 const models=['ram','siege','tower'].map(createSiegeModel),sizes=models.map(m=>new Box3().setFromObject(m).getSize(new Vector3()));
 assert.ok(sizes[1].y>sizes[0].y);assert.ok(sizes[2].y>sizes[0].y*1.4);assert.equal(new Set(models.map(m=>m.children.length)).size,3);
 for(const m of models)m.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
});
test('exact equipment art never substitutes a generic catapult for ram or tower',()=>{
 const pack={models:{siege:{}},troops:{siege:{idle:{url:'catapult'}},halberd:{idle:{url:'soldier'}}}};
 for(const type of ['ram','tower']){const u={type:'halberd',formType:type};assert.equal(unitModelKey(pack,u),'builtin:'+type);assert.equal(unitSpriteClips(pack,u),null);}
 assert.equal(unitModelKey(pack,{type:'halberd',formType:'siege'}),'siege');
 assert.equal(unitSpriteClips(pack,{type:'halberd',formType:null}).idle.url,'soldier');
});
for(const type of ['ram','siege','tower'])test(`${type}: real deployment, shooting and recovery update models without mutating battle state`,()=>{
 const state=generateBattle({...defaultCustomBattle(),seed:11231,ownTeam:[equipmentEntry('dun',type)],enemyTeam:[equipmentEntry('wen','archer')]}),b=state.battle;lockDeployment(b);const u=b.sides[0].units[0],foe=b.sides[1].units[0];
 Object.assign(u,{x:3,y:3});Object.assign(foe,{x:8,y:6,cooldown:999});setStatus(b,foe,'root',100,{sourceId:foe.id,sourceName:foe.name});
 for(const a of [u,foe])a.skillReady=Object.fromEntries(allLearnedTacticIds(a).map(id=>[id,999]));
 const tower={id:'target',name:'箭塔',kind:'arrowTower',type:'building',side:1,x:type==='ram'?4:6,y:3,hp:1000,maxHp:1000,...buildingCombatState('arrowTower',1)};b.buildings=[tower];
 const visual=Object.create(BattleArt.prototype);Object.assign(visual,{units:new Map(),clock:0,reduced:{matches:false},modelLoading:true});
 const previous=art.enabled;art.enabled=false;
 try{
  assert.equal(siegeFigureMarkup(u),'');stepBattle(b,{aiSides:[]});assert.equal(u.formType,type);
  const before=structuredClone(b);visual.update(b,{paused:true,speed:1});assert.deepEqual(b,before);
  assert.equal(visual.units.get(u.id).type,type);assert.equal(visual.units.get(u.id).baseType,u.type);assert.equal(unitModelKey({models:{}},visual.units.get(u.id)),'builtin:'+type);assert.match(siegeFigureMarkup(u),new RegExp('data-model-type="'+type+'"'));
  const copy=validateSave(structuredClone(state));
  for(let i=0;i<12&&tower.hp===1000;i++){stepBattle(b,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});assert.deepEqual(copy.battle,b);}assert.ok(tower.hp<1000);
  tower.hp=0;setStatus(b,foe,'stasis',100,{sourceId:foe.id,sourceName:foe.name});stepBattle(b,{aiSides:[]});visual.update(b,{paused:true,speed:1});
  assert.equal(u.formType,null);assert.equal(siegeFigureMarkup(u),'');assert.equal(visual.units.get(u.id).type,u.type);assert.equal(unitModelKey({models:{}},visual.units.get(u.id)),null);validateSave(state);
 }finally{art.enabled=previous;}
});
