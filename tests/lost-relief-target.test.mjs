import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseLostReliefTarget} from './helpers/lost-relief-target.mjs';
import {macroDefenseScene} from './helpers/macro-defense.mjs';
import {assignDomestic,beginDomesticTurn,assignmentFor,finishDomesticDay} from '../domestic.mjs';
import {resolveStrategicOrders} from '../strategic-orders.mjs';
import {planStrategicAI} from '../strategic-ai.mjs';
import {updateVision} from '../strategic-vision.mjs';
test('a lost reinforcement target permits withdrawal at the next turn, cancels waiting aid and respects intelligence',()=>{
 for(const [name,passed] of Object.entries(exerciseLostReliefTarget()))assert.equal(passed,true,name);
});

test('a reinforcement still remembers its city objective after real deferred work completes',()=>{
 const f=macroDefenseScene({rearDistance:4});
 assert.equal(assignDomestic(f.s,f.rear.id,'technology','yan',{faction:'yuan'}),null);beginDomesticTurn(f.s);
 assert.ok(assignmentFor(f.s,'yan')?.action);assignmentFor(f.s,'yan').action.remaining=2;planStrategicAI(f.s);
 const order=f.s.campaign.domestic.orders.find(q=>q.kind==='expedition'&&q.target===f.home.id);assert.ok(order);
 const ids=[...order.officerIds],find=()=>f.s.armies.find(a=>a.faction==='yuan'&&a.units.some(u=>ids.includes(u.id)));
 // Exercise the actual work and queued-command handlers in isolation from war.
 for(let i=0;i<50&&!find();i++){f.s.campaign.day=i+2;finishDomesticDay(f.s);resolveStrategicOrders(f.s);}
 const aid=find();assert.ok(aid,'fixture work must finish and the queued order must really depart');
 assert.ok(f.s.campaign.ai.supports.some(q=>q.kind==='city-relief'&&ids.every(id=>q.officerIds.includes(id))));
 f.home.owner='cao';f.home.domestic.owner='cao';
 f.s.campaign.day=(Math.floor((f.s.campaign.day-1)/10)+1)*10+1;f.s.turn=Math.floor((f.s.campaign.day-1)/10)+1;f.s.campaign.phase='planning';
 updateVision(f.s);planStrategicAI(f.s);
 assert.equal(aid.task,'回城补给');
 assert.ok(aid.target===f.rear.id||aid.location===f.rear.id&&!aid.route.length,'an order not yet moving may simply stay at its source');
});
