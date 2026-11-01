import test from 'node:test';
import assert from 'node:assert/strict';
import {metropolisLabelPosition} from '../map-label-layout.mjs';
import {isLandPoint} from '../national-geography.mjs';
import {CITY_DESIGNS} from '../data/design/cities.mjs';
import {townLayout} from '../town-layout.mjs';
import {TOWN_FRAME} from '../town-art.mjs';

const view={x:0,y:0,width:1024,height:1024};
test('every city anchor and its painted foundation remain within the atlas',()=>{
 for(const c of CITY_DESIGNS.filter(c=>c.kind==='city')){
  assert.ok(isLandPoint(c.x,c.y),c.name+' must be on land');
  const k=townLayout(c).mapScale;
  for(let i=0;i<=4;i++)for(let j=0;j<=4;j++){
   const x=c.x+(TOWN_FRAME.x+TOWN_FRAME.width*i/4)*k,y=c.y+(TOWN_FRAME.y+TOWN_FRAME.height*j/4)*k;
   assert.ok(x>0&&x<1024&&y>0&&y<1024,c.name+' foundation leaves the atlas');
   assert.ok(isLandPoint(x,y),c.name+' foundation crosses the coast');
  }
 }
});

test('coastal and southern city names move inland and stay inside the painted map',()=>{
 const labels=[];
 for(const id of ['town-25','town-23','atlas-guangling','atlas-leling','atlas-panyu','atlas-longbian']){
  const city=CITY_DESIGNS.find(c=>c.id===id),k=townLayout(city).mapScale;
  const footprints=[{x:city.x+TOWN_FRAME.x*k,y:city.y+TOWN_FRAME.y*k,w:TOWN_FRAME.width*k,h:TOWN_FRAME.height*k}];
  const r=metropolisLabelPosition(city,1,view,{footprints,labels});
  assert.ok(r,city.name+' needs an inland name position');
  assert.ok(r.x>0&&r.y>0&&r.x+r.w<1024&&r.y+r.h<1024);
  for(let x=0;x<=1;x+=.1)for(let y=0;y<=1;y+=.1)assert.ok(isLandPoint(r.x+r.w*x,r.y+r.h*y),city.name+' name leaves land');
  labels.push(r);
 }
});

test('crowding cannot push a label out of a narrow viewport or move the real city',()=>{
 const city=CITY_DESIGNS.find(c=>c.id==='town-24'),before=JSON.stringify(city);
 assert.equal(metropolisLabelPosition(city,1,{x:city.x-10,y:city.y-10,width:20,height:20}),null);
 assert.equal(metropolisLabelPosition(city,1,view,{footprints:[{x:0,y:0,w:1024,h:1024}]}),null);
 assert.equal(JSON.stringify(city),before);
});
