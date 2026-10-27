import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_CATEGORIES,createMapDocument,validateMapDocument,mapLayoutErrors} from '../battle-map-document.mjs';
import {BattleMapEditor,editMapCell} from '../battle-map-editor.mjs';
import {emptyMapLibrary,mapCatalog,applyMapToDraft,importMapPack,validateMapPack} from '../battle-map-library.mjs';
import {BATTLE_MAPS} from '../data/design/battle-maps.mjs';
import {defaultCustomBattle,validateCustomBattle} from '../custom-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {terrainAt,canTraverseTerrain} from '../battlefield.mjs';
import {battleMapArtwork} from '../battle-map-view.mjs';

test('map purposes include siege, gate and port; every purpose permits independent hex terrain',()=>{
 assert.deepEqual(Object.values(MAP_CATEGORIES).map(c=>c.name),['野战','攻城','关卡','港口','水战']);
 const catalog=mapCatalog();assert.equal(catalog.length,21);
 assert.equal(catalog.find(m=>m.id==='hill-pass').category.id,'gate');
 assert.equal(catalog.find(m=>m.id==='river-harbor').category.id,'port');
 assert.equal(catalog.find(m=>m.id==='xiapi').category.id,'siege');
 for(const category of Object.values(MAP_CATEGORIES)){
  const map=createMapDocument(null,category);
  ['land','forest','hill','marsh','water','bridge','rock'].forEach((ground,x)=>map.tiles[3][x]=ground);
  assert.deepEqual(validateMapDocument(map).tiles[3].slice(0,7),['land','forest','hill','marsh','water','bridge','rock']);
  assert.equal(map.category.id,category.id);
 }
 const described=createMapDocument();described.description='北岸山地\n南岸湿地';described.name='图'.repeat(50);assert.equal(validateMapDocument(described).description,described.description);assert.doesNotThrow(()=>validateMapDocument(createMapDocument(described)));
});

test('painting, hex flood fill and undo/redo change actual cells and preserve grouped strokes',async t=>{
 const editor=new BattleMapEditor({storage:{write:async()=>{}}});t.after(()=>clearTimeout(editor.draftTimer));
 editor.paint(6,3);assert.equal(editor.draft.tiles[3][6],'forest');
 await editor.action('undo');assert.equal(editor.draft.tiles[3][6],'land');
 await editor.action('redo');assert.equal(editor.draft.tiles[3][6],'forest');
 editor.brush='hill';editor.tool='fill';editor.paint(0,0);
 assert.equal(editor.draft.tiles.flat().filter(g=>g==='hill').length,111);
 assert.equal(editor.draft.tiles[3][6],'forest');
 await editor.action('undo');assert.equal(editor.draft.tiles[0][0],'land');
 editor.paint(0,0);assert.equal(editor.future.length,0);
 assert.equal(editMapCell(editor.draft,-1,0,'water'),false);
});

test('layout rejects isolated deployment, closed front, invalid gate and malformed grids; drafts keep editable blocked layouts',()=>{
 for(const mutate of [m=>{m.tiles[0][1]='rock';m.tiles[1][0]='rock';},m=>m.tiles.forEach(r=>r[6]='rock'),m=>m.tiles.forEach(r=>r.fill('water',0,5))]){
  const map=createMapDocument();mutate(map);assert.ok(mapLayoutErrors(map).length);assert.throws(()=>validateMapDocument(map));assert.doesNotThrow(()=>validateMapDocument(map,{layout:false}));
 }
 const siege=createMapDocument(null,MAP_CATEGORIES.siege);siege.tiles[4][12]='water';assert.throws(()=>validateMapDocument(siege),/城门/);
 const malformed=createMapDocument();malformed.tiles[0].pop();assert.throws(()=>validateMapDocument(malformed,{layout:false}),/14×8/);
 const invalid=createMapDocument();invalid.terrain='constructor';assert.throws(()=>validateMapDocument(invalid),/地形/);
});

test('map pack import is atomic, extends purpose categories and retains colliding maps as copies',()=>{
 const category={id:'map-category:valley',name:'山谷伏击',scene:'field'},map=createMapDocument(null,category),library=emptyMapLibrary();
 const first=importMapPack(library,map);assert.deepEqual(library,emptyMapLibrary());assert.equal(first.library.categories[0].name,'山谷伏击');
 const second=importMapPack(first.library,map);assert.equal(second.copies,1);assert.equal(second.library.maps.length,2);assert.notEqual(second.library.maps[0].id,second.library.maps[1].id);
 const other=structuredClone(map);other.category.name='营地';other.name='营地';const third=importMapPack(first.library,other);
 assert.equal(third.library.categories.length,2);assert.notEqual(third.library.maps[1].category.id,category.id);
 const before=structuredClone(first.library),bad=structuredClone(map);bad.tiles[0].pop();
 assert.throws(()=>importMapPack(first.library,{format:'sango-battle-map-pack',version:1,categories:[category],maps:[map,bad]}));assert.deepEqual(first.library,before);
 assert.throws(()=>validateMapPack({...library,categories:[MAP_CATEGORIES.field]}),/内置/);
});

test('storage failure preserves committed library; queued edits and deletion retain draft work',async t=>{
 let stored=emptyMapLibrary(),fail=false;const editor=new BattleMapEditor({storage:{write:async data=>{if(fail)throw Error('模拟存储失败');stored=structuredClone(data);}}});
 t.after(()=>clearTimeout(editor.draftTimer));await editor.saveMap();const before=structuredClone(stored);
 editor.paint(6,3);fail=true;await assert.rejects(()=>editor.saveMap(),/存储失败/);assert.deepEqual(editor.library,before);assert.deepEqual(stored,before);
 fail=false;await editor.saveMap();assert.equal(stored.maps[0].tiles[3][6],'forest');
 await editor.action('delete',{dataset:{id:editor.draft.id}});assert.equal(stored.maps.length,0);assert.equal(editor.draft.tiles[3][6],'forest');
 await editor.persistDraft();assert.equal(stored.draft.tiles[3][6],'forest');
 const reopened=new BattleMapEditor({library:stored});assert.deepEqual(reopened.draft,editor.draft);
 editor.draft.tiles.forEach(r=>r[6]='rock');await assert.rejects(()=>editor.saveMap(),/无法接敌/);await editor.persistDraft();assert.equal(stored.maps.length,0);assert.ok(mapLayoutErrors(stored.draft).length);
});

test('a map from a self-contained battle can restore its absent category into a fresh library',async t=>{
 const category={id:'map-category:orphan',name:'失而复得',scene:'field'},map=createMapDocument(null,category);let stored;
 const editor=new BattleMapEditor({storage:{write:async data=>{stored=structuredClone(data);}}});t.after(()=>clearTimeout(editor.draftTimer));
 editor.load(map.id,map);assert.match(editor.markup(),/失而复得/);await editor.saveMap();assert.deepEqual(stored.categories,[category]);assert.equal(stored.maps[0].id,map.id);
});

test('battle uses a frozen custom map snapshot through library edits, deletion, retries and deterministic save continuation',()=>{
 const map=createMapDocument(BATTLE_MAPS['plain-open']);map.name='自定义通路';map.tiles[3][6]='rock';map.tiles[4][6]='water';map.tiles[4][7]='bridge';
 const draft=applyMapToDraft(defaultCustomBattle(),map),state=generateBattle({...draft,limit:100,shieldPercent:0}),b=state.battle;
 assert.equal(terrainAt(b,6,3),'rock');assert.equal(canTraverseTerrain(b,{equipment:{ship:'ship'}},6,3),false);
 assert.equal(canTraverseTerrain(b,{equipment:{ship:null}},6,4),false);assert.equal(canTraverseTerrain(b,{equipment:{ship:'ship'}},6,4),true);
 const library=importMapPack(emptyMapLibrary(),map).library;library.maps[0].name='改过的图';library.maps[0].tiles[3][6]='land';
 assert.equal(mapCatalog(library,draft.mapData).find(m=>m.id===map.id).name,'自定义通路');
 library.maps=[];assert.equal(mapCatalog(library,draft.mapData).length,22);assert.equal(terrainAt(b,6,3),'rock');
 assert.deepEqual(generateBattle({...draft,limit:100,shieldPercent:0}).battle,b);
 const art=battleMapArtwork(b);b.mapData.tiles[2][6]='hill';assert.notEqual(battleMapArtwork(b),art);b.mapData.tiles[2][6]=draft.mapData.tiles[2][6];
 assert.equal(lockDeployment(b),null);for(let i=0;i<15&&!b.result;i++)stepBattle(b,{aiSides:[0,1]});
 const resumed=validateSave(JSON.parse(JSON.stringify(state)));
 while(!b.result){stepBattle(b,{aiSides:[0,1]});stepBattle(resumed.battle,{aiSides:[0,1]});}
 assert.deepEqual(resumed.battle,b);assert.ok(b.sides.every(s=>s.units.some(u=>u.contribution.damage>0)));validateSave(state);
 const forged=structuredClone(state);forged.battle.mapData.tiles[2][6]='hill';assert.throws(()=>validateSave(forged),/快照/);
 const missing=structuredClone(state);delete missing.battle.mapData;assert.throws(()=>validateSave(missing));
});

test('water-only custom deployment requires actual ships; siege purpose uses shared gate and combat handlers',()=>{
 const naval=createMapDocument(null,MAP_CATEGORIES.naval);naval.deployment='naval';naval.tiles=naval.tiles.map(r=>r.map(()=> 'water'));
 const draft=applyMapToDraft(defaultCustomBattle(),naval);assert.throws(()=>validateCustomBattle(draft),/携船/);
 for(const u of [...draft.ownTeam,...draft.enemyTeam])u.equipment={siege:null,ship:'ship'};
 const state=generateBattle(draft);assert.ok(state.battle.sides.flatMap(s=>s.units).every(u=>u.equipment.ship));validateSave(state);
 const map=createMapDocument(null,MAP_CATEGORIES.siege),siege=generateBattle(applyMapToDraft(defaultCustomBattle(),map));assert.ok(siege.battle.siege.gate.hp>0);validateSave(siege);
});
