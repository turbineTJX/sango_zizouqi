import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLE_MAPS} from '../data/design/battle-maps.mjs';
import {terrainAreaPath,battleEnvironmentArtwork,battleBuildingArtwork} from '../battle-environment-art.mjs';
import {battleMapArtwork} from '../battle-map-view.mjs';

test('continuous areas dissolve shared boundaries and preserve disconnected terrain',()=>{
 assert.equal(terrainAreaPath([['land']],['water']),'');
 assert.equal((terrainAreaPath([['water','water']],['water']).match(/M/g)||[]).length,1);
 assert.equal((terrainAreaPath([['water','land','water']],['water']).match(/M/g)||[]).length,2);
});
test('all authored environments are deterministic, keep actual cells and leave source maps untouched',()=>{
 for(const [mapId,map]of Object.entries(BATTLE_MAPS)){
  const before=structuredClone(map),art=battleEnvironmentArtwork(map,{prefix:'verify-'+mapId});
  assert.equal(art,battleEnvironmentArtwork(map,{prefix:'verify-'+mapId}));assert.deepEqual(map,before);
  assert.equal((art.match(/data-map-terrain=/g)||[]).length,112);
  for(const ground of new Set(map.tiles.flat()))assert.equal((art.match(new RegExp('data-map-terrain="'+ground+'"','g'))||[]).length,map.tiles.flat().filter(t=>t===ground).length);
  assert.doesNotMatch(art,/NaN|Infinity|<animate|<script|https?:|Math\.random/);
  assert.equal(battleMapArtwork({mapId,seed:1}),battleMapArtwork({mapId,seed:98765}));
 }
});
test('actual facility durability and completion select intact, damaged, rubble and scaffold views without mutation',()=>{
 const g=Object.freeze({type:'building',kind:'arrowTower',side:0,hp:2000,maxHp:2000,level:2}),intact=battleBuildingArtwork(g);
 assert.notEqual(intact,battleBuildingArtwork({...g,hp:500}));assert.notEqual(intact,battleBuildingArtwork({...g,hp:0}));assert.notEqual(intact,battleBuildingArtwork({...g,level:0}));
 for(const kind of ['gate','arrowTower','musicStage','aidCamp','granary','farm'])assert.doesNotMatch(battleBuildingArtwork({...g,kind,type:kind==='gate'?'gate':'building'}),/NaN|Infinity/);
});
