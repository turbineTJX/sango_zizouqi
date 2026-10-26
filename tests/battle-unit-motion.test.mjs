import test from 'node:test';
import assert from 'node:assert/strict';
import {STATUS_DEFINITIONS} from '../data/design/battle-statuses.mjs';
import {STATUS_BODY_CHANNELS,unitStatusMotion,troopFormation,troopAttackFrame,troopBodyAnchors,drawTroopStatuses} from '../battle-unit-motion.mjs';

test('every real status has finite body choreography without modifying the source state',()=>{
 assert.deepEqual(Object.keys(STATUS_BODY_CHANNELS).sort(),Object.keys(STATUS_DEFINITIONS).sort());
 for(const [key,def]of Object.entries(STATUS_DEFINITIONS)){
  const statuses=[{key,...def,state:{until:8,amount:120}}],before=JSON.stringify(statuses);
  for(const reduced of [false,true])for(const time of [0,.2,.8,2]){
   const motion=unitStatusMotion(statuses,time,2,reduced);assert.ok(motion.channels.length>0,key);
   for(const value of Object.values(motion))if(typeof value==='number')assert.ok(Number.isFinite(value),key);
   if(reduced)assert.deepEqual([motion.x,motion.y,motion.lean,motion.turn,motion.stance],[0,0,0,0,0]);
  }
  assert.equal(JSON.stringify(statuses),before);
 }
});
test('stun, confusion, weakness and defensive ranks act differently and clear immediately',()=>{
 const status=key=>[{key}];
 assert.ok(unitStatusMotion(status('stun'),.2).blocked);assert.equal(unitStatusMotion(status('stun'),.2).gait,0);
 assert.notEqual(unitStatusMotion(status('stun'),.2).lean,unitStatusMotion(status('stun'),.7).lean);
 assert.notEqual(unitStatusMotion(status('confuse'),.2,0).turn,unitStatusMotion(status('confuse'),2,0).turn);
 assert.ok(unitStatusMotion(status('confuse'),.3,0).x!==unitStatusMotion(status('confuse'),.3,1).x);
 assert.ok(unitStatusMotion(status('weaken'),.2).stance>0);
 assert.ok(unitStatusMotion(status('phalanx'),.2).spread<1);
 assert.ok(!unitStatusMotion(status('seal'),.2).blocked,'sealing skills must not stop walking or ordinary attacks');
 assert.ok(!unitStatusMotion(status('root'),.2).blocked,'rooting must not stop attacking');
 assert.equal(unitStatusMotion([],.2).tint,null);assert.equal(unitStatusMotion([],.2).spread,1);
});
test('soldiers ready in separate ranks and meet the same real impact frame',()=>{
 assert.notEqual(troopAttackFrame(.2,0),troopAttackFrame(.2,2));
 for(let i=0;i<6;i++){assert.equal(troopAttackFrame(.52,i),.65);assert.equal(troopAttackFrame(1,i),1);}
 assert.equal(troopFormation('cavalry').length,3);assert.equal(troopFormation('spear').length,6);
});
test('status marks follow the actual animated soldier anchors, without text or rings',()=>{
 const anchors=[{x:120,y:80,size:24},{x:145,y:85,size:24}],ops=[];
 const ctx=new Proxy({}, {get:(_,key)=>(...args)=>{ops.push(key);for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n));}});
 const fx={ctx,reduced:false,bodyAnchors:id=>id==='u'?anchors:null};
 assert.equal(troopBodyAnchors(fx,'u',{x:0,y:0},60),anchors);
 drawTroopStatuses(fx,{id:'u',statuses:[{key:'shield'},{key:'burn'},{key:'confuse'}]},{x:0,y:0},60,.3);
 assert.ok(ops.includes('stroke')&&ops.includes('fill'));
 for(const key of ['ellipse','arc','fillText','strokeText'])assert.ok(!ops.includes(key),key+' is not a body effect');
});
