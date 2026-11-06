import test from 'node:test';
import assert from 'node:assert/strict';
import {jointFormations} from '../ai-policy/army-formations.mjs';
import {operationObservationContext,rememberOperationObservation} from '../ai-policy/operation-observation.mjs';
import {projectFactionTasks} from '../ai-policy/task-ledger.mjs';
import {chronicleError} from '../ai-policy/chronicle.mjs';
const group=(id,n,troops)=>({c:{id},units:Array.from({length:n},(_,i)=>({id:id+i,troops}))});
test('compact veterans remain real independent formations; weak tails cannot borrow another army strength',()=>{
 assert.deepEqual(jointFormations([group('a',9,7000),group('b',5,7000)],10,{compact:true}).map(g=>g.units.length),[9,5]);
 assert.equal(jointFormations([group('a',9,7000),group('b',5,1000)],10,{compact:true}),null);
 assert.equal(jointFormations([group('a',9,7000),group('b',3,9000)],10,{compact:true}),null);
 assert.deepEqual(jointFormations([group('a',12,2500)],6).map(g=>g.units.length),[6,6]);
 assert.equal(jointFormations([group('a',7,4500)],6),null);
});
test('new observation requires a changed decision premise; elapsed time and hidden enemy changes cannot renew it',()=>{
 const s={cities:[{id:'home',owner:'cao'},{id:'enemy',owner:'yuan'}],campaign:{day:41,ai:{plans:[],coordination:{}},battles:[{kind:'siege',settled:true,cityId:'home',endedDay:35,battle:{sides:[{faction:'cao'},{faction:'yuan'}]}}]}};
 const first=operationObservationContext(s,'cao','enemy',20);assert.equal(first.changedFront,true);assert.equal(first.repeated,false);
 rememberOperationObservation(s,{observationKey:first.key,observationSignature:first.signature});
 s.campaign.day=141;s.cities[1].units=[{id:'hidden-person',troops:100000}];
 assert.equal(operationObservationContext(s,'cao','enemy',20).repeated,true);
 s.campaign.battles.push({kind:'siege',settled:true,cityId:'home',endedDay:140,battle:{sides:[{faction:'cao'},{faction:'yuan'}]}});
 assert.equal(operationObservationContext(s,'cao','enemy',20).repeated,false);
});
test('partially assigned resident army inherits each officer once and still rejects a truly conflicting task',()=>{
 const s={cities:[],armies:[{id:'a1',faction:'cao',units:[{id:'a'},{id:'x'}],location:'home',target:null,route:[]}],campaign:{day:1,idle:[],scouting:{tasks:[]},diplomacy:{assignments:[],proposals:[],contracts:[]},domestic:{orders:[],assignments:[]},ai:{plans:[{id:1,phase:'prepare',officerIds:['a','b'],faction:'cao',staging:'home',target:'enemy'}],supports:[],staffing:[],concentrations:[],coordination:{missions:[]}}}};
 let ledger=projectFactionTasks(s);assert.equal(chronicleError(ledger.tasks,ledger.capacities),null);
 assert.deepEqual(ledger.steps.find(t=>t.id==='army:a1:assigned').officerIds,['a']);
 assert.deepEqual(ledger.tasks.find(t=>t.id==='army:a1').claims,[{resource:'officer:x',amount:1}]);
 s.campaign.ai.supports.push({id:2,faction:'cao',target:'other',officerIds:['a']});ledger=projectFactionTasks(s);
 assert.equal(chronicleError(ledger.tasks,ledger.capacities),'resource-conflict:officer:a');
});


test('execution closes a lost-city staffing promise and preserves a real same-faction journey',async()=>{
 const {reconcileStaffingExecution}=await import('../strategic-staffing.mjs');
 const s={cities:[{id:'home',owner:'cao',units:[{id:'a'}]},{id:'front',owner:'cao',units:[]}],armies:[],campaign:{idle:[{faction:'cao',unit:{id:'b'},location:'home',destination:'front'}],ai:{staffing:[{officerId:'a',cityId:'home',faction:'cao'},{officerId:'b',cityId:'front',faction:'cao'}]}}};
 reconcileStaffingExecution(s);assert.equal(s.campaign.ai.staffing.length,2);
 s.cities[0].owner='yuan';reconcileStaffingExecution(s);
 assert.deepEqual(s.campaign.ai.staffing.map(p=>p.officerId),['b']);
 assert.equal(s.campaign.idle[0].destination,'front');
});
import {transferFrontlineToConcentration,currentFactionTask,officerCommitments} from '../ai-policy/faction-coordination.mjs';
import {validateCoordination} from '../ai-policy/chronicle.mjs';
test('forward concentration transfers ownership atomically and retains completed duty history',()=>{
 const m={id:1,kind:'frontline',purpose:'garrison',faction:'cao',cityId:'rear',target:'enemy',status:'executing',revision:1,createdDay:1,updatedDay:1,officerIds:['a'],requirements:{},reason:'hold'};
 const p={id:1,faction:'cao',status:'active',staging:'front',target:'enemy',intendedIds:['a'],officerIds:[]};
 const s={campaign:{day:11,ai:{coordination:{version:3,nextId:2,missions:[m],events:[],search:{},reviewDay:11,turnPlan:null},concentrations:[p]}}};
 const before=structuredClone(s);
 assert.equal(transferFrontlineToConcentration(s,p,'a',()=>({error:'budget'})).error,'budget');assert.deepEqual(s,before);
 assert.throws(()=>transferFrontlineToConcentration(s,p,'a',()=>{throw Error('cancel');}),/cancel/);assert.deepEqual(s,before);
 transferFrontlineToConcentration(s,p,'a',()=>{assert.equal(currentFactionTask(s),p);assert.deepEqual(officerCommitments(s,'a').map(r=>r.kind),['concentration']);return {ok:true};});
 assert.equal(m.status,'complete');assert.deepEqual(m.officerIds,['a']);assert.deepEqual(p.officerIds,['a']);assert.equal(currentFactionTask(s),null);
 validateCoordination(s.campaign.ai.coordination,11,()=>true,()=>true,()=>true,value=>assert.ok(value));
});
