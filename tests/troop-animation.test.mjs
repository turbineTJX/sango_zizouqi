import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleTroopPose,sampleFoot,solveLeg,sampleFacing} from '../troop-animation.mjs';
import {unitStatusMotion,STATUS_BODY_CHANNELS} from '../battle-unit-motion.mjs';

const footPosition=(leg,height)=>({z:-.35*Math.sin(leg.hip)-.31*Math.sin(leg.hip+leg.knee),y:height-.35*Math.cos(leg.hip)-.31*Math.cos(leg.hip+leg.knee)-.07});
test('articulated walking keeps support feet on the ground and bends the lifted knee',()=>{
 let planted=0,lifted=0;
 for(let i=10;i<=82;i++){
  const p=i/100,pose=sampleTroopPose({moving:true,moveProgress:p,time:p});
  for(let j=0;j<2;j++){
   const foot=sampleFoot(p+j*.5),position=footPosition(pose.legs[j],.73+pose.bodyDrop);
   if(foot.planted){planted++;assert.ok(Math.abs(position.y)<.001,JSON.stringify({p,j,position}));}
   else if(foot.lift>.04){lifted++;assert.ok(position.y>.02);assert.ok(pose.legs[j].knee>.3);}
   assert.ok(Math.abs(pose.legs[j].hip+pose.legs[j].knee+pose.legs[j].ankle)<1e-10,'sole counter-rotates to stay level');
  }
 }
 assert.ok(planted&&lifted);
 const leg=solveLeg(.1,.08,.7),point=footPosition(leg,.7);assert.ok(Math.abs(point.z-.1)<1e-9&&Math.abs(point.y-.08)<1e-9);
});
test('melee strikes meet the real hit, bows release with the projectile, and all gestures ease back to rest',()=>{
 for(const family of ['spear','halberd','cavalry','archer']){
  const start=sampleTroopPose({family,progress:0,time:0}),end=sampleTroopPose({family,progress:1,time:0}),near=sampleTroopPose({family,progress:.99999,time:0});
  assert.equal(JSON.stringify(start.arms),JSON.stringify(end.arms));assert.deepEqual(start.forearms,end.forearms);assert.ok(Math.abs(near.arms[1].x-end.arms[1].x)<.001);
  if(family!=='archer'){
   const ready=sampleTroopPose({family,progress:.2}),hit=sampleTroopPose({family,progress:.52});assert.ok(hit.arms[1].x<ready.arms[1].x-.8);
  }
 }
 const draw=sampleTroopPose({type:'archer',family:'archer',progress:.23}),released=sampleTroopPose({type:'archer',family:'archer',progress:.32});
 assert.ok(draw.bowDraw>.98&&draw.arrowVisible);assert.equal(released.bowDraw,0);assert.equal(released.arrowVisible,false);
 assert.notEqual(sampleTroopPose({family:'spear',progress:.5}).bodyY,sampleTroopPose({family:'halberd',progress:.5}).bodyY);
});
test('turning follows the shortest angle and is independent of redraw frequency and pause',()=>{
 const initial=sampleFacing(null,3.1,0),turn=sampleFacing(initial,-3.1,0);
 assert.ok(Math.abs(turn.to-turn.from)<.1);assert.equal(turn.value,3.1);
 let frequent=turn;for(let i=1;i<=8;i++)frequent=sampleFacing(frequent,-3.1,i*.01);
 assert.deepEqual(frequent,sampleFacing(turn,-3.1,.08));assert.deepEqual(sampleFacing(frequent,-3.1,.08),frequent);
 assert.ok(Math.abs(sampleFacing(turn,-3.1,.16).value-turn.to)<1e-10);
});
test('control, reduced motion, shielding and damage keep their distinct movement boundaries',()=>{
 const state=unitStatusMotion([{key:'root'}],.2),rooted=sampleTroopPose({moving:true,moveProgress:.4,progress:.5,state}),stunned=sampleTroopPose({progress:.5,state:unitStatusMotion([{key:'stun'}],.2)});
 const planted=sampleTroopPose({state});
 for(let j=0;j<2;j++)assert.ok(Math.abs(footPosition(rooted.legs[j],.73+rooted.bodyDrop).z-footPosition(planted.legs[j],.73+planted.bodyDrop).z)<1e-9);
 assert.deepEqual(stunned.arms,sampleTroopPose({state:unitStatusMotion([{key:'stun'}],.2)}).arms);
 const resting=sampleTroopPose(),guard=sampleTroopPose({guardImpact:1}),hit=sampleTroopPose({reaction:.17});assert.equal(guard.headX,resting.headX);assert.equal(guard.bodyX,resting.bodyX);assert.ok(guard.arms[0].x<resting.arms[0].x);assert.ok(hit.bodyX<resting.bodyX&&hit.headX>resting.headX);
 const reduced=time=>sampleTroopPose({time,moving:true,progress:.4,moveProgress:time%1,reaction:1,reduced:true});assert.equal(JSON.stringify(reduced(.2)),JSON.stringify(reduced(.7)));
});
test('idle guards bend both knees, plant staggered feet and retain distinct weapon roles',()=>{
 for(const [type,family]of [['spear','spear'],['halberd','halberd'],['archer','archer'],['crossbow','archer']]){
  const pose=sampleTroopPose({type,family,reduced:true}),feet=pose.legs.map(leg=>footPosition(leg,.73+pose.bodyDrop));
  assert.ok(pose.bodyDrop<-.06&&pose.bodyX>.05,type);assert.ok(pose.legs.every(leg=>leg.knee>.35),type);
  assert.ok(feet[0].z-feet[1].z>.18,type);assert.ok(feet.every(foot=>Math.abs(foot.y)<.001),type);
  assert.ok(pose.arms.every(arm=>arm.x<-.25),type);
  assert.equal(JSON.stringify(pose),JSON.stringify(sampleTroopPose({type,family,reduced:true,time:99})));
 }
 const spear=sampleTroopPose({family:'spear'}),bow=sampleTroopPose({type:'archer',family:'archer'}),rider=sampleTroopPose({family:'cavalry'});
 assert.ok(spear.weaponTilt>.8&&bow.weaponTilt===0);assert.ok(Math.abs(bow.bodyY)>Math.abs(spear.bodyY));assert.ok(rider.bodyX>.15);
 const ranks=Array.from({length:9},(_,index)=>sampleTroopPose({index,time:2}));assert.ok(new Set(ranks.map(p=>p.bodyY)).size>3);
});
test('every status produces finite animation without modifying its input',()=>{
 for(const key of Object.keys(STATUS_BODY_CHANNELS)){
  const state=Object.freeze(unitStatusMotion([{key}],.4)),before=JSON.stringify(state);
  for(const family of ['spear','halberd','cavalry','archer'])for(const progress of [0,.2,.52,.8,1]){
   const pose=sampleTroopPose({family,progress,state,moving:true,moveProgress:.4});
   const check=n=>{if(typeof n==='number')assert.ok(Number.isFinite(n),key);else if(n&&typeof n==='object')Object.values(n).forEach(check);};check(pose);
  }
  assert.equal(JSON.stringify(state),before);
 }
});
