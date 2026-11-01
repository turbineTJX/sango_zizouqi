import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutOverviewSites,regionalSiteOpacity} from '../map-overview-layout.mjs';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
const view={x:0,y:0,width:1024,height:1024};
const site=(id,x,y,extra={})=>({id,x,y,primary:true,metropolisId:id,overviewArtBounds:{x:-18,y:-18,w:37,h:31},overviewBounds:{x:-18,y:-18,w:37,h:48},...extra});

test('national map keeps main cities, removes overlaps, and preserves the selected actual node',()=>{
 const sites=[site('a',600,450),site('b',605,455),site('port',607,453,{primary:false})],before=JSON.stringify(sites);
 assert.deepEqual([...layoutOverviewSites(sites,{view,scale:1,selectedId:'a'}).keys()],['a']);
 assert.deepEqual([...layoutOverviewSites(sites,{view,scale:1,selectedId:'port'}).keys()],['port']);
 assert.equal(JSON.stringify(sites),before);
});

test('secondary settlements expand locally and all sites return when zoomed in',()=>{
 const minor=site('port',600,450,{primary:false,metropolisId:'xuchang'});
 assert.equal(regionalSiteOpacity(minor,{size:1024,settlements:0,selectedId:'xuchang',focusMetropolis:'xuchang'}),0);
 assert.equal(regionalSiteOpacity(minor,{size:560,settlements:0,selectedId:'xuchang',focusMetropolis:'xuchang'}),1);
 assert.equal(regionalSiteOpacity(minor,{size:560,settlements:0,selectedId:'luoyang',focusMetropolis:'luoyang'}),0);
 assert.equal(regionalSiteOpacity(minor,{size:350,settlements:1,selectedId:'luoyang',focusMetropolis:'luoyang'}),1);
 assert.equal(regionalSiteOpacity(minor,{size:1024,settlements:0,selectedId:'port',focusMetropolis:'xuchang'}),1);
});

test('a southern city keeps its name above the icon instead of outside the atlas',()=>{
 const s=newCampaign(81,'guandu-200'),city=s.cities.find(c=>c.id==='atlas-longbian');
 const placed=layoutOverviewSites([site(city.id,city.x,city.y)],{view,scale:1,selectedId:city.id});
 assert.ok(placed.get(city.id).labelVisible);assert.ok(placed.get(city.id).labelY<0);
});

test('prefectures emerge locally without distant icons and crowded national names obey the screen budget',()=>{
 const village=site('village',600,450,{kind:'junction',primary:false,metropolisId:'xuchang'});
 assert.equal(layoutOverviewSites([village],{view,scale:1,selectedId:'village'}).size,0);
 assert.equal(regionalSiteOpacity(village,{size:560,settlements:0,selectedId:'xuchang',focusMetropolis:'xuchang'}),1);
 assert.equal(regionalSiteOpacity(village,{size:350,settlements:1,selectedId:'xuchang',focusMetropolis:'xuchang'}),1);
 const sites=Array.from({length:30},(_,i)=>site('p'+i,350+i%6*65,350+Math.floor(i/6)*65));
 assert.ok(layoutOverviewSites(sites,{view,scale:.5,selectedId:'p29',limit:8}).size<=8);
 assert.ok(layoutOverviewSites(sites,{view,scale:.5,selectedId:'p29',limit:8}).has('p29'));
});

test('real national overview is sparse on desktop and phone without changing public coordinates',()=>{
 const s=newCampaign(81,'guandu-200'),before=JSON.stringify(s),sites=[...s.cities,...s.junctions].map(c=>site(c.id,c.x,c.y,{primary:c.citySize==='large',metropolisId:c.id}));
 for(const scale of [.92,2.4]){
  const placed=layoutOverviewSites(sites,{view,scale,selectedId:'xuchang'});
  assert.ok(placed.has('xuchang'));assert.ok(placed.size<40&&placed.size>=6);
  const rects=[...placed.values()];
  for(let i=0;i<rects.length;i++)for(const b of rects.slice(i+1)){const a=rects[i];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}
 }
 assert.equal(JSON.stringify(s),before);
});
