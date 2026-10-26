import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleArt,attackPose,facingRow} from '../art-battle.mjs';
import {art} from '../art-assets.mjs';

test('melee anticipates then strikes and recovers; ranged troops stay in formation',()=>{
 assert.ok(attackPose(.1,'spear').reach<0);
 assert.ok(attackPose(.36,'cavalry').reach>attackPose(.36,'spear').reach);
 assert.ok(Math.abs(attackPose(1,'spear').reach)<1e-10);
 assert.ok(Math.abs(attackPose(.36,'archer').reach)<.05);
 assert.deepEqual([facingRow(-1,-1),facingRow(-1,1),facingRow(1,1),facingRow(1,-1)],[0,1,2,3]);
});

test('presentation consumes appended real events once, resets per battle and preserves snapshots',()=>{
 const visual=Object.create(BattleArt.prototype);
 Object.assign(visual,{units:new Map(),clock:0,reduced:{matches:false}});
 const previous=art.enabled;art.enabled=false;
 try{
 const unit={id:'cao',status:'active',type:'spear',side:0,x:1,y:2,hp:100,maxHp:100};
 const b={id:'one',tick:0,sides:[{units:[unit]},{units:[]}],effects:[]};
 visual.update(b,{paused:true,speed:1});b.tick=1;unit.x=2;
 b.effects=[{from:'cao',to:'enemy',x:3,y:2,damage:10}];const before=JSON.stringify(b);
 visual.update(b,{paused:false,speed:1});assert.equal(visual.units.get('cao').attackAt,0);
 visual.clock=.2;visual.update(b,{paused:false,speed:4});assert.equal(visual.units.get('cao').attackAt,0);
 b.effects.push({from:'enemy',to:'cao',fromX:3,fromY:2,damage:4});visual.update(b,{paused:false,speed:4});assert.equal(visual.units.get('cao').hitAt,.2);
 b.effects.pop();assert.equal(JSON.stringify(b),before);
 unit.status='defeated';b.tick++;b.effects=[];visual.update(b,{paused:false,speed:1});assert.equal(visual.units.get('cao').deadAt,.2);
 b.id='two';visual.update(b,{paused:true,speed:1});assert.equal(visual.units.size,0);
 }finally{art.enabled=previous;}
});

test('a charge holds its actual departure during windup and arrives at the health impact',()=>{
 const visual=Object.create(BattleArt.prototype),unit={id:'liao',pos:{x:.6,y:.5}};
 visual.reduced={matches:false};visual.fx={clock:0,actions:[{start:0,duration:1000,end:1000,events:[{from:'liao',fromX:2,fromY:3,visual:'charge',damage:10}]}]};
 const departure=visual.position(unit);visual.fx.clock=230;assert.deepEqual(visual.position(unit),departure);
 visual.fx.clock=380;const middle=visual.position(unit);assert.ok(middle.x>departure.x&&middle.x<unit.pos.x);
 visual.fx.clock=520;assert.deepEqual(visual.position(unit),unit.pos);
 assert.deepEqual(unit,{id:'liao',pos:{x:.6,y:.5}});
});
