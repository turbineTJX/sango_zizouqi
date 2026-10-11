import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLE_MAPS,FIELD_MAP_IDS,fieldBattleMapId} from '../data/design/battle-maps.mjs';
import {validateBattleMaps} from '../battle-map-validation.mjs';
import {canTraverseTerrain,canOccupy,terrainAt} from '../battlefield.mjs';
import {battleMapArtwork,battleMapPreview} from '../battle-map-view.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {newCampaign,campaignBattleMapId,campaignBattleTerrain} from '../strategic-campaign.mjs';

test('all 21 authored maps have distinct layouts, usable deployments, exits and opposing land routes',()=>{
 assert.equal(Object.keys(BATTLE_MAPS).length,21);
 assert.deepEqual(validateBattleMaps(),[]);
 for(const ids of Object.values(FIELD_MAP_IDS))assert.equal(new Set(ids.map(id=>JSON.stringify(BATTLE_MAPS[id].tiles))).size,3);
 const malformed=structuredClone(BATTLE_MAPS);malformed['hill-pass'].tiles[0].pop();assert.match(validateBattleMaps(malformed).join('\n'),/14×8/);
 const isolated=structuredClone(BATTLE_MAPS);isolated['plain-open'].tiles[0][1]='rock';isolated['plain-open'].tiles[1][0]='rock';
 assert.match(validateBattleMaps(isolated).join('\n'),/部署格0,0无法接敌或撤离/);
});

test('mountain walls block both infantry and ship carriers; bridges connect opposite river banks',()=>{
 const land={type:'spear',equipment:{ship:null}},ship={type:'spear',equipment:{ship:'ship'}};
 const pass={terrain:'hill',mapId:'hill-pass'};
 for(const u of [land,ship])assert.equal(canTraverseTerrain(pass,u,6,2),false);
 assert.equal(canTraverseTerrain(pass,land,6,4),true);
 const river={terrain:'river',mapId:'river-twin-bridges'};
 assert.equal(canTraverseTerrain(river,land,6,3),false);assert.equal(canTraverseTerrain(river,ship,6,3),true);
 for(const y of [2,5])for(const x of [6,7])assert.equal(canTraverseTerrain(river,land,x,y),true);
});

test('ordinary encounters select stable site and road maps independently of seed, faction and travel direction',()=>{
 const s=newCampaign(217,'guandu-200'),same=newCampaign(9381,'guandu-200');
 for(const kind of ['port','gate']){
  const site=s.junctions.find(n=>n.kind===kind),terrain=campaignBattleTerrain(s,'xuchang',site.id);
  const id=campaignBattleMapId(s,'xuchang',site.id,{siteId:site.id,terrain});
  assert.equal(id,kind==='port'?'river-harbor':'hill-pass');
  assert.equal(campaignBattleMapId(same,'ye',site.id,{siteId:site.id,terrain}),id);
 }
 assert.equal(campaignBattleMapId(s,'xuchang','chenliu'),campaignBattleMapId(s,'chenliu','xuchang'));
 const ordinary=s.cities.filter(c=>campaignBattleTerrain(s,c.id,c.id)==='land').map(c=>campaignBattleMapId(s,c.id,c.id,{siteId:c.id}));
 assert.equal(new Set(ordinary).size,3);
 assert.equal(fieldBattleMapId('forest','stable-place'),fieldBattleMapId('forest','stable-place'));
});

test('all ordinary maps use real combat, legal movement and deterministic saves through completion',()=>{
 for(const [terrain,ids] of Object.entries(FIELD_MAP_IDS))for(const mapId of ids){
  const s=generateBattle({...defaultCustomBattle(),terrain,mapId,seed:921701,limit:240,shieldPercent:0}),b=s.battle;
  assert.equal(lockDeployment(b),null);
  for(let i=0;i<12&&!b.result;i++)stepBattle(b,{aiSides:[0,1]});
  const resumed=validateSave(JSON.parse(JSON.stringify(s)));
  while(!b.result){
   stepBattle(b,{aiSides:[0,1]});stepBattle(resumed.battle,{aiSides:[0,1]});
   for(const u of b.sides.flatMap(side=>side.units).filter(u=>u.status==='active'))assert.ok(canOccupy(b,u,u.x,u.y),mapId+' '+u.name);
  }
  for(const side of b.sides)assert.ok(side.units.reduce((n,u)=>n+u.contribution.damage,0)>0,mapId+' both armies must engage');
  assert.deepEqual(b,resumed.battle,mapId);validateSave(s);
 }
});

test('preview and board artwork show actual terrain without modifying the battle or RNG',()=>{
 const s=generateBattle({...defaultCustomBattle(),terrain:'hill',mapId:'hill-pass'}),before=structuredClone(s);
 const art=battleMapArtwork(s.battle),preview=battleMapPreview(s.battle);
 assert.equal((art.match(/data-map-terrain=/g)||[]).length,112);
 assert.equal((art.match(/data-map-terrain="rock"/g)||[]).length,BATTLE_MAPS['hill-pass'].tiles.flat().filter(t=>t==='rock').length);
 assert.match(preview,/狭口雄关/);assert.match(preview,/山壁/);assert.deepEqual(s,before);
 assert.equal(terrainAt(s.battle,6,2),'rock');
});
