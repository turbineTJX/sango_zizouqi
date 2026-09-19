import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleSignals,battlefieldStatuses} from '../battle-signals.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,issueCommand,COMMAND_RESOURCE} from '../engine.mjs';
import {setStatus} from '../tactics.mjs';

function combat(){const s=createScenario('history-guandu');lockDeployment(s.battle);return s.battle;}
test('military orders show once for both factions, including paused same-tick commands; restores do not replay',()=>{
 const b=combat(),v=new BattleSignals();v.update(b,0);
 b.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'assault'),null);
 const before=JSON.stringify(b);v.update(b,0);assert.equal(v.orders.length,1);assert.equal(v.orders[0].side,0);assert.ok(v.orders[0].targets.every(t=>b.sides[0].units.some(u=>u.id===t.id)));
 v.update(b,200);assert.equal(v.orders.length,1);assert.equal(JSON.stringify(b),before);
 b.enemyCommand.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'fortify',null,1),null);v.update(b,200);
 assert.equal(v.orders.length,2);assert.equal(v.orders[1].side,1);assert.ok(v.orders[1].targets.every(t=>b.sides[1].units.some(u=>u.id===t.id)));
 const restored=new BattleSignals();restored.update(b,0);assert.equal(restored.orders.length,0);
 b.id='next';v.update(b,300);assert.equal(v.orders.length,0);
});
test('enemy harmful order marks our affected units and failed commands never create an effect',()=>{
 const b=combat(),v=new BattleSignals();b.sides[1].commanders.push({id:'tian',name:'田丰',role:'advisor',armyId:'test'});v.update(b,0);
 assert.ok(issueCommand(b,'disrupt',null,1));v.update(b,0);assert.equal(v.orders.length,0);
 b.enemyCommand.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'disrupt',null,1),null);v.update(b,0);
 assert.equal(v.orders[0].targetSide,0);assert.ok(v.units.filter(u=>u.side===0).every(u=>u.statuses.some(s=>s.key==='disruptUntil')));
});
test('head markers follow current state, expire and cleanse immediately; army range only applies to bow troops',()=>{
 const b=combat(),u=b.sides[0].units[0];setStatus(b,u,'stun',2);setStatus(b,u,'burn',4,{amount:5});setStatus(b,u,'shield',5,{amount:100});
 b.sides[0].rangeUntil=10;b.sides[0].assaultUntil=10;
 assert.equal(battlefieldStatuses(b,u)[0].key,'stun');assert.ok(!battlefieldStatuses(b,u).some(s=>s.key==='rangeUntil'));
 assert.ok(battlefieldStatuses(b,{...u,type:'archer'}).some(s=>s.key==='rangeUntil'));
 b.tick=u.statuses.stun.until;assert.ok(!battlefieldStatuses(b,u).some(s=>s.key==='stun'));
 b.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'cleanse'),null);
 assert.ok(!battlefieldStatuses(b,u).some(s=>['burn','stun'].includes(s.key)));assert.ok(battlefieldStatuses(b,u).some(s=>s.key==='resolve'));
 u.status='defeated';const v=new BattleSignals();v.update(b,0);assert.ok(!v.units.some(t=>t.id===u.id));
});
test('signals render finite coordinates without changing battle data through real combat',()=>{
 const b=combat(),v=new BattleSignals(),numbers=[];
 const context=new Proxy({}, {get:(_,key)=>(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),String(key));numbers.push(key);}});
 const fx={ctx:context,width:900,height:470,canvas:{},clock:0,reduced:false,point:(x,y)=>({x:x*60+30,y:y*50+30}),line:()=>{},glow:()=>{}};
 v.update(b,0);b.commandProgress=COMMAND_RESOURCE.capacity;issueCommand(b,'assault');
 for(let i=0;i<30;i++){stepBattle(b);fx.clock+=100;const before=JSON.stringify(b);v.update(b,fx.clock);v.draw(fx,60);v.drawOrders(fx,60);assert.equal(JSON.stringify(b),before);}
 fx.reduced=true;v.draw(fx,30);v.drawOrders(fx,30);assert.ok(numbers.includes('fillText'));
 fx.clock+=2000;v.draw(fx,60);assert.equal(v.orders.length,0);
});
