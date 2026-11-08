import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MAP_GPU_PROFILE,mapBudgetedTileLevel,mapVisibleTiles,validateMapGPUManifest} from '../map-gpu-assets.mjs';
import {mapCityDrawCommands} from '../map-gpu-city.mjs';
import {assetFile,ASSET_ROOT} from '../asset-workspace.mjs';
import {catalogAssetURLs,sanitizeAssetCatalog} from '../asset-catalog.mjs';
import {townLayout} from '../town-layout.mjs';

test('GPU texture plan covers the view with a bounded working set at every zoom and aspect',()=>{
 for(const view of [{x:0,y:0,width:1024,height:1024},{x:298,y:391,width:806,height:560},{x:501,y:412,width:259,height:180},{x:711,y:437,width:32,height:32}])for(const scale of [1,2,8,32,100])for(const layers of [2,3,5]){
  const level=mapBudgetedTileLevel(view,scale,layers),tiles=mapVisibleTiles(view,level,12/scale);
  assert.ok((tiles.length+1)*layers*516**2*4<=MAP_GPU_PROFILE.terrainBudget);
  for(const t of tiles)assert.ok(t.x>=0&&t.y>=0&&t.index<4**level);
 }
});
test('compiled pack declares every atlas frame and parent tile and rejects malformed references',async()=>{
 const catalog=JSON.parse(await readFile(assetFile('./assets/manifest.json'),'utf8')),manifest=JSON.parse(await readFile(assetFile(catalog.mapGPU),'utf8'));
 assert.equal(validateMapGPUManifest(manifest),manifest);assert.ok(catalogAssetURLs(catalog).includes(catalog.mapGPU));assert.equal(sanitizeAssetCatalog(catalog).mapGPU,catalog.mapGPU);
 const broken=structuredClone(manifest);broken.terrain.roads[0]=[];assert.throws(()=>validateMapGPUManifest(broken),/pyramid/);
 const escaped=structuredClone(manifest),id=Object.keys(escaped.frames.high)[0];escaped.frames.high[id].url='./assets/../private.webp';assert.throws(()=>validateMapGPUManifest(escaped),/frame/);
 for(const e of Object.values(manifest.files))assert.ok(e.width<=1024&&e.height<=1024,'raw high resolution art never becomes an unbounded runtime texture');
});
test('GPU town art uses legal saved levels, real construction and stable shared world anchors',()=>{
 const layout=townLayout({id:'xuchang',kind:'city',citySize:'large',x:711,y:436.8}),district={key:'commerce',level:5,condition:.5,project:{paused:true}};
 const model={kind:'city',layout,gateCondition:1,districts:[district]},before=JSON.stringify(model),commands=mapCityDrawCommands(model);
 assert.equal(JSON.stringify(model),before);assert.equal(commands.filter(c=>c.id.startsWith('building/')).length,3);assert.ok(commands.some(c=>c.id==='building/commerce/damaged'));assert.ok(commands.some(c=>c.id==='construction'&&c.alpha===.7));
 assert.equal(mapCityDrawCommands({...model,districts:[]}).length,2,'public unknown cities cannot reveal facilities');
 const main=commands.find(c=>c.id==='building/commerce/damaged'),site=layout.sites.commerce,width=site.width*(.82+5*.085);assert.equal(main.x,site.x-width/2);assert.equal(main.y,site.y-width*.83);
});
test('release ships the decoder worker and its rendering license',async()=>{
 const source=await readFile('scripts/release-lib.mjs','utf8');assert.match(source,/entryPoints:\[resolve\(ROOT,'map-texture-worker\.mjs'\)\]/);assert.match(source,/pixi:'vendor\/pixi\/LICENSE\.txt'/);
});
