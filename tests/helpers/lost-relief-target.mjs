import assert from 'node:assert/strict';
import {macroDefenseScene} from './macro-defense.mjs';
import {planStrategicAI,validateStrategicAI} from '../../strategic-ai.mjs';
import {cityObservation,initializeVision,updateVision} from '../../strategic-vision.mjs';
import {roadDistance} from '../../strategic-movement.mjs';
import {assignDomestic,beginDomesticTurn,assignmentFor} from '../../domestic.mjs';
import {planStrategicSupport} from '../../strategic-support-ai.mjs';
import {serializeCampaign} from './auto-domestic-campaign.mjs';

// Constructed loss and near-complete work states; natural windows are separate.
function depart(){
 const f=macroDefenseScene({rearDistance:4});planStrategicAI(f.s);
 f.aid=f.s.armies.find(a=>a.faction==='yuan'&&a.task==='增援'&&a.target===f.home.id);
 assert.ok(f.aid,'the actual policy must dispatch a real reinforcement');
 const length=roadDistance(f.s,f.rear.id,f.home.id);
 f.aid.travel={from:f.rear.id,to:f.home.id,road:'main',progress:length/3};
 return {...f,length};
}
const nextTurn=s=>{s.campaign.day=11;s.turn=2;s.campaign.phase='planning';updateVision(s);planStrategicAI(s);};
export function exerciseLostReliefTarget(){
 const f=depart(),before=structuredClone(f.aid.travel),checks={};
 const saved=JSON.parse(serializeCampaign(f.s));
 checks.cityReliefSurvivesSave=saved.campaign.ai.supports.some(q=>q.kind==='city-relief'&&q.target===f.home.id&&f.aid.units.every(u=>q.officerIds.includes(u.id)));
 if(checks.cityReliefSurvivesSave)validateStrategicAI(saved);
 f.home.owner='cao';f.home.domestic.owner='cao';f.s.campaign.day=2;updateVision(f.s);
 assert.equal(cityObservation(f.s,f.home.id,'yuan').owner,'cao');planStrategicAI(f.s);
 checks.noMidTurnWithdrawal=f.aid.target===f.home.id&&JSON.stringify(f.aid.travel)===JSON.stringify(before);
 nextTurn(f.s);
 checks.targetLostNextTurn=f.aid.task==='回城补给'&&f.aid.target===f.rear.id;
 checks.reverseWithoutTeleport=f.aid.travel?.from===before.to&&f.aid.travel?.to===before.from&&Math.abs(f.aid.travel.progress-(f.length-before.progress))<1e-8;
 const friendly=depart();nextTurn(friendly.s);checks.friendlyTargetContinues=friendly.aid.target===friendly.home.id&&friendly.aid.task!=='回城补给';

 const queued=macroDefenseScene({rearDistance:4});assert.equal(assignDomestic(queued.s,queued.rear.id,'technology','yan',{faction:'yuan'}),null);beginDomesticTurn(queued.s);
 const work=assignmentFor(queued.s,'yan')?.action;assert.ok(work);work.remaining=2;planStrategicAI(queued.s);
 const order=queued.s.campaign.domestic.orders.find(q=>q.faction==='yuan'&&q.kind==='expedition'&&q.target===queued.home.id);assert.ok(order,'near-complete real work queues the reinforcement');
 queued.home.owner='cao';queued.home.domestic.owner='cao';nextTurn(queued.s);
 checks.cancelLostWaitingOrder=!queued.s.campaign.domestic.orders.some(q=>q.id===order.id);
 checks.currentWorkPreserved=assignmentFor(queued.s,'yan')?.action?.id===work.id;

 const hidden=depart();hidden.home.x=10000;hidden.home.y=10000;hidden.aid.travel.progress=0;initializeVision(hidden.s);
 // Supply a dated report without observing the later ownership change.
 hidden.home.owner='cao';hidden.home.domestic.owner='cao';
 assert.equal(cityObservation(hidden.s,hidden.home.id,'yuan').owner,'yuan','the loss is not yet in lawful intelligence');
 let retreats=0;planStrategicSupport(hidden.s,'yuan',{availableUnits:()=>[],commandUnits:()=>false,cancelPlan:()=>{},retreatArmy:()=>retreats++});
 checks.hiddenLossDoesNotWithdraw=retreats===0;
 return checks;
}
