import {approachFieldContact} from './helpers/field-campaign.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {armyMapMarkers,battleMapMarkers,marchPlaybackPoints,animateArmyMarch,captureArmyMarch} from '../strategic-army-markers.mjs';
import {intelligenceWorld} from '../strategic-vision.mjs';
import {dispatchScout,scoutCandidates,advanceScouting} from '../scouting.mjs';
import {scoutOperator} from '../scouting-state.mjs';

const sample=(overrides={})=>({x:0,y:0,day:1,session:'test:1',edge:'a:b:side',path:[{x:0,y:0},{x:10,y:5},{x:20,y:0}],...overrides});
test('playback follows the road bend, including arrival, without unseen travel or load interpolation',()=>{
 const old=sample(),next=sample({x:20,y:0,day:2});
 assert.deepEqual(marchPlaybackPoints(old,next),[{x:0,y:0},{x:10,y:5},{x:20,y:0}]);
 assert.deepEqual(marchPlaybackPoints(old,{...next,edge:'',path:[]}),marchPlaybackPoints(old,next));
 for(const changed of [null,{...old,day:2},{...old,day:0},{...old,session:'other'},{...old,edge:'b:c:main',path:[{x:200,y:0},{x:220,y:0}]},{...old,x:300}])assert.deepEqual(marchPlaybackPoints(changed,next),[]);
 assert.deepEqual(marchPlaybackPoints(sample({edge:'',path:[]}),next),marchPlaybackPoints(old,next));
 assert.deepEqual(marchPlaybackPoints(old,{...next,day:1},{sameDay:true}),marchPlaybackPoints(old,next));
 assert.deepEqual(marchPlaybackPoints(old,{...next,edge:'b:c:main',path:[{x:20,y:0},{x:30,y:10}]}),marchPlaybackPoints(old,next));
});

test('position playback keeps road lengths as frame timing and honors reduced motion',()=>{
 const previous=globalThis.matchMedia;let frames,options;
 const marker={dataset:{campaignArmy:'a',x:'20',y:'0',mapDay:'2',mapSession:'test:1',marchEdge:'a:b:side',marchPath:JSON.stringify(sample().path)},classList:{add(){},remove(){}},animate(f,o){frames=f;options=o;return {};}};
 const root={querySelectorAll:()=>[marker]};
 try{globalThis.matchMedia=()=>({matches:false});animateArmyMarch(root,new Map([['a',sample()]]));assert.equal(frames.length,3);assert.equal(frames[1].offset,.5);assert.equal(options.duration,2200);assert.equal(frames.at(-1).transform,'translate(20px, 0px)');
  frames=null;globalThis.matchMedia=()=>({matches:true});animateArmyMarch(root,new Map([['a',sample()]]));assert.equal(frames,null);
 }finally{globalThis.matchMedia=previous;}
});

test('view refresh resumes the visible position without restarting, while a load cannot start a new march',()=>{
 const previous=globalThis.matchMedia,animations=[];
 const marker={dataset:{campaignArmy:'a',x:'20',y:'0',mapDay:'2',mapSession:'test:1',marchEdge:'a:b:side',marchPath:JSON.stringify(sample().path)},classList:{add(){},remove(){}},animate(f,o){animations.push({f,o});return {};}};
 const root={querySelectorAll:()=>[marker]};
 try{globalThis.matchMedia=()=>({matches:false});
  animateArmyMarch(root,new Map([['a',sample()]]),{advance:false});assert.equal(animations.length,0);
  animateArmyMarch(root,new Map([['a',sample()]]));marker._marchMotion.start-=1100;
  const snapshot=captureArmyMarch(root),point=snapshot.get('a');assert.ok(point.x>=9.9&&point.x<12);
  animateArmyMarch(root,snapshot,{advance:false});assert.equal(animations.length,2);assert.ok(animations[1].o.duration<1200);assert.equal(animations[1].f.at(-1).transform,'translate(20px, 0px)');
 }finally{globalThis.matchMedia=previous;}
});

test('resuming a retained marker cancels its old animation and ignores a stale finish',()=>{
 const previous=globalThis.matchMedia,animations=[],classes=new Set();
 const marker={dataset:{scoutTask:'scout-1',x:'20',y:'0',mapDay:'2',mapSession:'test:1',marchEdge:'a:b:side',marchPath:JSON.stringify(sample().path)},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},animate(){const animation={cancel(){this.cancelled=true;}};animations.push(animation);return animation;}};
 const root={querySelectorAll:()=>[marker]};
 try{
  globalThis.matchMedia=()=>({matches:false});animateArmyMarch(root,new Map([['scout-1',sample()]]));
  const finish=animations[0].onfinish,snapshot=captureArmyMarch(root);
  animateArmyMarch(root,snapshot,{advance:false});assert.equal(animations[0].cancelled,true);
  finish();assert.ok(classes.has('is-playing-march'));assert.ok(marker._marchMotion);
  animations[1].onfinish();assert.equal(classes.has('is-playing-march'),false);assert.equal(marker._marchMotion,undefined);
 }finally{globalThis.matchMedia=previous;}
});

test('map labels expose waiting, marching and actual battle state without mutating simulation',()=>{
 const s=newCampaign(1),a=fieldFromCity(s,'xuchang',{target:'guandu'}),enemy=fieldFromCity(s,'guandu',{target:'xuchang'});
 assert.match(armyMapMarkers(s,{}),/待出发/);beginExecution(s);advanceCampaignDay(s);
 assert.match(armyMapMarkers(s,{}),/army-heading/);assert.match(armyMapMarkers(s,{}),/data-march-path/);
 approachFieldContact(s,a,enemy);
 for(let i=0;i<30&&!activeBattles(s).length;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 const r=activeBattles(s)[0];assert.ok(r);const before=JSON.stringify(s),html=battleMapMarkers(s);
 assert.match(html,/data-map-battle-glyph/);assert.match(html,/尚未开战/);assert.match(html,/encounter-troops/);assert.match(armyMapMarkers(s,{}),/is-fighting/);
 assert.equal(JSON.stringify(s),before);assert.ok(r.armyIds.includes(a.id));
});

test('presentation uses the same fog projection as the rest of the map',()=>{
 const s=newCampaign(203,'guandu-200');fieldFromCity(s,s.cities.find(c=>c.owner!=='cao'&&c.units.some(u=>!u.cityGuard)).id);fieldFromCity(s,'xuchang');const view=intelligenceWorld(s),before=JSON.stringify(s),html=armyMapMarkers(s,{});
 for(const a of s.armies)assert.equal(html.includes(`data-campaign-army="${a.id}"`),view.armies.some(v=>v.id===a.id));
 assert.equal(JSON.stringify(s),before);
});

test('scouts have a mounted identity and actual task state while their operator stays at home',()=>{
 const s=newCampaign(81,'guandu-200'),officer=scoutCandidates(s,'xuchang')[0].unit;
 assert.equal(dispatchScout(s,'xuchang',officer.id,'chenliu'),null);
 const before=JSON.stringify(s),html=armyMapMarkers(s,{});
 assert.match(html,/scout-company/);assert.match(html,/曹军斥候/);assert.match(html,/data-army-state="departing"/);
 assert.doesNotMatch(html,/army-portrait-fallback/);assert.equal(JSON.stringify(s),before);
 s.campaign.day++;advanceScouting(s);
 assert.match(armyMapMarkers(s,{}),/data-army-state="marching"/);
 s.campaign.scouting.tasks[0].paused=true;
 assert.match(armyMapMarkers(s,{}),/data-army-state="stationed"/);
 assert.match(armyMapMarkers(s,{}),/侦察暂停/);
 assert.equal(scoutOperator(s,s.campaign.scouting.tasks[0]).location,'xuchang');
});
