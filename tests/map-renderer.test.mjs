import test from 'node:test';
import assert from 'node:assert/strict';
import {mapCameraProjection,mapWheelRatio} from '../map-camera-renderer.mjs';
import {terrainTilePlan,MAP_TERRAIN_TILE_BUDGET} from '../map-terrain-tiles.mjs';
import {mapSpriteResolution} from '../map-sprite-cache.mjs';
import {readMapView} from '../scripts/map-camera-ui-helpers.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('navigation checks read the current logical camera instead of its fixed SVG projection basis',()=>{
 const base=Object.freeze({x:0,y:0,width:1024,height:1024});
 assert.deepEqual(readMapView({dataset:{cameraViewBox:'100 200 32 64'},viewBox:{baseVal:base}}),{x:100,y:200,width:32,height:64});
 assert.deepEqual(readMapView({dataset:{},viewBox:{baseVal:base}}),base);
});
test('wheel input preserves fine deltas, normalizes device units and reverses without scale drift',()=>{
 near(mapWheelRatio(-100),.88);near(mapWheelRatio(100)*mapWheelRatio(-100),1);
 near(mapWheelRatio(1)**100,mapWheelRatio(100));near(mapWheelRatio(-3,1),mapWheelRatio(-100));near(mapWheelRatio(1,2,800),mapWheelRatio(800));
 assert.ok(mapWheelRatio(-1)>.99);assert.ok(Number.isFinite(mapWheelRatio(1e20)));
});
test('retained camera maps actual world points to an undistorted, letterboxed viewport',()=>{
 const base={x:217.6,y:156.8,width:806.4,height:560};
 for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:966,height:388}])
  for(const view of [{x:0,y:0,width:1024,height:1024},{x:500,y:400,width:64,height:32},{x:200,y:100,width:32,height:64}]){
   const p=mapCameraProjection(base,view,viewport),baseUnit=Math.min(viewport.width/base.width,viewport.height/base.height),unit=Math.min(viewport.width/view.width,viewport.height/view.height);
   for(const [u,v]of [[0,0],[.27,.81],[1,1]]){
    const x=view.x+view.width*u,y=view.y+view.height*v;
    near((p.x+p.scale*x-base.x)*baseUnit+(viewport.width-base.width*baseUnit)/2,(viewport.width-view.width*unit)/2+view.width*u*unit);
    near((p.y+p.scale*y-base.y)*baseUnit+(viewport.height-base.height*baseUnit)/2,(viewport.height-view.height*unit)/2+view.height*v*unit);
   }
  }
});
test('terrain tiles cover the visible region and request no offscreen world chunks',()=>{
 const view={x:497,y:299,width:93,height:60},tiles=terrainTilePlan(view,20);
 assert.ok(tiles.length>0);
 for(const t of tiles){assert.ok(t.x*t.span<view.x+view.width&&(t.x+1)*t.span>view.x);assert.ok(t.y*t.span<view.y+view.height&&(t.y+1)*t.span>view.y);}
 for(let y=view.y;y<=view.y+view.height;y+=1)for(let x=view.x;x<=view.x+view.width;x+=1)assert.ok(tiles.some(t=>x>=t.x*t.span&&x<=(t.x+1)*t.span&&y>=t.y*t.span&&y<=(t.y+1)*t.span));
 assert.deepEqual(terrainTilePlan(view,2),[],'wide views reuse the permanent parent texture');
});
test('terrain detail has a bounded decoded texture budget even on a very large display',()=>{
 for(const view of [{x:0,y:0,width:1024,height:1024},{x:0,y:0,width:32,height:32},{x:300,y:400,width:120,height:60}])
  for(const scale of [3,16,32,100,1000])assert.ok(terrainTilePlan(view,scale).length*4*516**2*4<=MAP_TERRAIN_TILE_BUDGET);
});
test('entity sprites select reusable power-of-two resolutions instead of a new image for every zoom tick',()=>{
 assert.deepEqual([0,50,128,129,400,1200].map(mapSpriteResolution),[128,128,128,256,512,1024]);
 assert.equal(mapSpriteResolution(300),mapSpriteResolution(450));
});
