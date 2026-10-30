import test from 'node:test';
import assert from 'node:assert/strict';
import {castFrame,castPose,castProjectile,castVisualEvents,drawCastSource,drawCastTarget,unitCastAction,actorCastProgress} from '../battle-cast-animation.mjs';

test('windup, flight, impact and recovery share the recorded health and sound boundary',()=>{
 assert.deepEqual([0,.23,.24,.51,.52,.79,.8,1].map(p=>castFrame(p).phase),['windup','windup','release','release','impact','impact','recover','recover']);
 for(const kind of ['heal','shield','support','control','fire','charge','strike','volley']){
  const before=castPose(.2,kind),release=castPose(.38,kind),end=castPose(1,kind);
  assert.ok(before.reach<0,'caster anticipates even without damage');
  assert.ok(Math.abs(release.reach)+release.lift>0);
  assert.ok(Math.abs(end.reach)+Math.abs(end.lift)+Math.abs(end.lean)<1e-10,'gesture settles without moving the real unit');
 }
 assert.ok(castPose(.38,'heal').lift>castPose(.38,'strike').lift);
});
test('physical lunges arrive on the actual hit, hold contact briefly and then settle',()=>{
 for(const kind of ['strike','charge']){
  assert.ok(castPose(.52,kind).reach>castPose(.38,kind).reach);
  assert.equal(castPose(.52,kind).reach,castPose(.6,kind).reach);
  assert.ok(castPose(.85,kind).reach<castPose(.6,kind).reach);
  assert.equal(castPose(1,kind).reach,0);
 }
 const lead=actorCastProgress(.15,{partnerIndex:0}),next=actorCastProgress(.15,{partnerIndex:2});assert.ok(lead>next);
 for(let partnerIndex=0;partnerIndex<4;partnerIndex++)assert.equal(actorCastProgress(.52,{partnerIndex}),.52);
});

test('even a battlefield-wide projectile has only a short moving tail and reaches the target at impact',()=>{
 for(const cell of [32,72,130])for(const kind of ['fire','control','heal','volley','strike']){
  const from={x:0,y:100},to={x:cell*13,y:350};
  for(let t=0;t<=1;t+=.05){const p=castProjectile(from,to,t,cell,kind);assert.ok(p.tail<=cell*.3);assert.ok([p.x,p.y,p.angle].every(Number.isFinite));}
  const start=castProjectile(from,to,0,cell,kind),end=castProjectile(from,to,1,cell,kind);
  assert.equal(start.x,from.x);assert.equal(start.y,from.y);assert.equal(end.x,to.x);assert.ok(Math.abs(end.y-to.y)<1e-9);
 }
});

test('healers, controllers and actual combo participants animate; ongoing effects never recast',()=>{
 const heal={from:'healer',to:'ally',skill:true,healing:100,damage:0,presentationKind:'heal'};
 const control={from:'controller',to:'enemy',skill:true,damage:0,presentationKind:'control'};
 const actions=[{start:0,duration:800,events:[heal]},{start:800,duration:800,events:[control,{from:'controller',combo:{actors:[{id:'partner'}]}}]}];
 const before=JSON.stringify(actions);
 assert.equal(unitCastAction(actions,'healer').event,heal);
 assert.equal(unitCastAction(actions,'controller').event,control);
 assert.equal(unitCastAction(actions,'partner').event.presentationKind,'support');
 assert.equal(unitCastAction([{events:[{...heal,ongoing:true}]}],'healer'),null);
 assert.equal(unitCastAction(actions,'unrelated'),null);assert.equal(JSON.stringify(actions),before);
 const absorbed={from:'archer',to:'target',skill:false,damage:0,shieldAbsorbed:100};
 assert.equal(unitCastAction([{events:[absorbed]}],'archer').event,absorbed,'a shield-blocked arrow still has an attacker gesture');
 assert.equal(unitCastAction([{events:[{...absorbed,damageKind:'dot'}]}],'archer'),null,'ongoing damage never makes its original caster shoot again');
});

test('a multi-hit skill sends one visual per target while retaining its actual totals',()=>{
 const e={from:'caster',to:'target',label:'fire',start:200,damage:100,outcome:[{id:'target',changes:['燃烧']}]};
 const events=[e,{...e,damage:20,text:'燃烧'},{...e,to:'other',damage:50}];
 const before=JSON.stringify(events),merged=castVisualEvents(events);
 assert.equal(merged.length,2);assert.equal(merged[0].damage,120);assert.equal(merged[1].damage,50);
 assert.deepEqual(merged[0].outcome,e.outcome);assert.equal(JSON.stringify(events),before);
});

test('all cast shapes remain local with no source-to-target connector, including full and reduced effects',()=>{
 const segments=[];let point=null,shapes=0,particles=0;
 const c=new Proxy({
  save(){},restore(){},beginPath(){point=null;},
  moveTo(x,y){point={x,y};},lineTo(x,y){if(point)segments.push(Math.hypot(x-point.x,y-point.y));point={x,y};},
  quadraticCurveTo(a,b,x,y){point={x,y};},ellipse(){shapes++;},
 },{get:(obj,key)=>obj[key]||(()=>{})});
 const fx={ctx:c,glow(){},particles(){particles++;},reduced:false},cell=70;
 const from={x:10,y:180},to={x:1000,y:420};
 for(const reduced of [false,true]){
  fx.reduced=reduced;const prior=particles;
  for(const kind of ['heal','shield','support','control','fire','charge','strike','volley']){
   const e={from:'caster',to:'target',skill:true,damage:kind==='heal'?0:10,healing:kind==='heal'?50:0,presentationKind:kind,x:12,y:4,cinematic:true};
   const before=JSON.stringify(e);
   for(let i=0;i<=20;i++){drawCastSource(fx,e,i/20,from,cell);drawCastTarget(fx,e,i/20,from,to,cell);}
   assert.equal(JSON.stringify(e),before);
  }
  if(reduced)assert.equal(particles,prior,'reduced motion has no burst particles');
 }
 assert.ok(shapes>0);assert.ok(segments.length>0);
 assert.ok(Math.max(...segments)<cell*.9,'every straight mark is a local glyph or a short projectile tail');
});
