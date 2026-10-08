import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {citySceneState,citySceneMarkup,cityCompactMarkup,sceneDistricts} from '../city-scene.mjs';
import {townLayout} from '../town-layout.mjs';
import {mapDetailBlend} from '../map-detail-level.mjs';

test('all city layouts differ and stay stable across ownership, development and reload',()=>{
 const s=newCampaign(1,'guandu-200'),before=JSON.stringify(s),layouts=s.cities.map(townLayout);
 assert.equal(new Set(layouts.map(layout=>JSON.stringify(layout.sites))).size,s.cities.length);
 for(const [id,region]of [['luoyang','plain'],['town-40','mountain'],['town-23','river'],['town-22','frontier']])assert.equal(townLayout(s.cities.find(c=>c.id===id)).region,region);
 s.cities.forEach((c,i)=>assert.deepEqual(townLayout({...c,owner:'neutral',commerce:9,farm:9}),layouts[i]));
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));
 assert.deepEqual(restored.cities.map(townLayout),layouts);assert.equal(JSON.stringify(s),before);
});
test('compact and interior models keep every facility at the same coordinates and footprint',()=>{
 const s=newCampaign(1,'guandu-200');
 for(const c of [...s.cities,...s.junctions.filter(n=>['gate','port'].includes(n.kind))]){
  const model=citySceneState(s,c),compact=cityCompactMarkup(model),interior=citySceneMarkup(model);
  assert.ok(compact.includes('scale('+model.layout.mapScale+')'));
  for(const d of sceneDistricts(model)){const {x,y}=model.layout.sites[d.key],transform='transform="translate('+x+' '+y+')"';assert.ok(compact.includes(transform),c.id+':'+d.key);assert.ok(interior.includes(transform));}
  assert.ok(compact.includes('data-town-space="'+model.layout.kind+'"'));assert.ok(interior.includes('data-town-space="'+model.layout.kind+'"'));
  if(c.kind==='gate')assert.ok(!sceneDistricts(model).some(d=>['farm','walls'].includes(d.key)));
  if(c.kind==='port')assert.ok(!sceneDistricts(model).some(d=>d.key==='walls'));
  assert.ok(interior.includes('han-terrain-'+model.layout.region+'.webp'));assert.ok(!interior.includes('town-frame'));
 }
});
test('visual detail overlaps continuously at every threshold and reverses with zoom',()=>{
 for(const boundary of [490,420,350,240,170,110]){
  const a=mapDetailBlend({width:boundary+.01,height:boundary+.01}),b=mapDetailBlend({width:boundary-.01,height:boundary-.01});
  for(const key of Object.keys(a))assert.ok(Math.abs(a[key]-b[key])<.001);
 }
 const mixed=mapDetailBlend({width:190,height:190});assert.ok(mixed.interior>0&&mixed.interior<1);assert.equal(mixed.settlements,1);
 assert.deepEqual(mapDetailBlend({width:560,height:560}),{metropolis:1,settlements:0,interior:0});
 assert.deepEqual(mapDetailBlend({width:64,height:64}),{metropolis:0,settlements:1,interior:1});
});
