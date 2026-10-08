import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleSignals,battlefieldStatuses} from '../battle-signals.mjs';
import {createScenario} from './helpers/scenarios.mjs';
import {lockDeployment,stepBattle,issueCommand,COMMAND_RESOURCE} from '../engine.mjs';
import {chooseStratagemPoint,stratagemAreaContains} from '../stratagem-area.mjs';
import {STRATAGEMS} from '../stratagems.mjs';
import {appointBattleTestCommander} from './helpers/commanders.mjs';
import {setStatus} from '../tactics.mjs';

function combat(){const s=createScenario('history-guandu');lockDeployment(s.battle);return s.battle;}
test('military orders show once for both factions, including paused same-tick commands; restores do not replay',()=>{
 const b=combat(),v=new BattleSignals();v.update(b,0);
 b.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'cao-wuchao'),null);
 const before=JSON.stringify(b);v.update(b,0);assert.equal(v.orders.length,1);assert.equal(v.orders[0].side,0);assert.ok(v.orders[0].targets.every(t=>b.sides[0].units.some(u=>u.id===t.id)));
 v.update(b,200);assert.equal(v.orders.length,1);assert.equal(JSON.stringify(b),before);
 b.enemyCommand.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'fortify',chooseStratagemPoint(b,STRATAGEMS.fortify,1),1),null);v.update(b,200);
 assert.equal(v.orders.length,2);assert.equal(v.orders[1].side,1);assert.ok(v.orders[1].targets.every(t=>b.sides[1].units.some(u=>u.id===t.id)));
 const restored=new BattleSignals();restored.update(b,0);assert.equal(restored.orders.length,0);
 b.id='next';v.update(b,300);assert.equal(v.orders.length,0);
});
test('enemy harmful order marks our affected units and failed commands never create an effect',()=>{
 const b=combat(),v=new BattleSignals();appointBattleTestCommander(b,'tian','advisor',1);v.update(b,0);
 assert.ok(issueCommand(b,'disrupt',chooseStratagemPoint(b,STRATAGEMS.disrupt,1),1));v.update(b,0);assert.equal(v.orders.length,0);
 b.enemyCommand.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'disrupt',chooseStratagemPoint(b,STRATAGEMS.disrupt,1),1),null);v.update(b,0);
 assert.equal(v.orders[0].targetSide,0);assert.ok(v.units.filter(u=>u.side===0&&stratagemAreaContains(STRATAGEMS.disrupt,b.enemyCommand.lastCommand.target,u)).every(u=>u.statuses.some(s=>s.key==='stun')));
});
test('head markers follow current state, expire and cleanse immediately; army range only applies to bow troops',()=>{
 const b=combat(),u=b.sides[0].units[0];setStatus(b,u,'confuse',2);setStatus(b,u,'burn',4,{amount:5});setStatus(b,u,'shield',5,{amount:100});
 setStatus(b,u,'longRange',10);
 assert.equal(battlefieldStatuses(b,u)[0].key,'confuse');assert.ok(battlefieldStatuses(b,u).some(s=>s.key==='longRange'));
 assert.ok(battlefieldStatuses(b,{...u,type:'archer'}).some(s=>s.key==='longRange'));
 b.tick=u.statuses.confuse.until;assert.ok(!battlefieldStatuses(b,u).some(s=>s.key==='confuse'));
 appointBattleTestCommander(b,'person-462');b.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'cleanse',{x:u.x,y:u.y}),null);
 assert.ok(!battlefieldStatuses(b,u).some(s=>s.key==='confuse'));assert.ok(!battlefieldStatuses(b,u).some(s=>s.key==='burn'));assert.ok(battlefieldStatuses(b,u).some(s=>s.key==='resolve'));
 u.status='defeated';const v=new BattleSignals();v.update(b,0);assert.ok(!v.units.some(t=>t.id===u.id));
});
test('signals render finite coordinates without changing battle data through real combat',()=>{
 const b=combat(),v=new BattleSignals(),numbers=[];
 const context=new Proxy({}, {get:(_,key)=>(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),String(key));numbers.push(key);}});
 const fx={ctx:context,width:900,height:470,canvas:{},clock:0,reduced:false,point:(x,y)=>({x:x*60+30,y:y*50+30}),line:()=>{},glow:()=>{},label:()=>{}};
 v.update(b,0);b.commandProgress=COMMAND_RESOURCE.capacity;issueCommand(b,'cao-wuchao');
 for(let i=0;i<30;i++){stepBattle(b);fx.clock+=100;const before=JSON.stringify(b);v.update(b,fx.clock);v.draw(fx,60);v.drawOrders(fx,60);assert.equal(JSON.stringify(b),before);}
 fx.reduced=true;v.draw(fx,30);v.drawOrders(fx,30);assert.ok(numbers.includes('fillText'));
 fx.clock+=2000;v.draw(fx,60);assert.equal(v.orders.length,0);
});
