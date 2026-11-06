import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {exercise} from '../scripts/ai-validation/cases/faction-coordination.mjs';
import {chronicleError,firstChronicleMethod,transitionChronicle,handoffChronicle} from '../ai-policy/chronicle.mjs';
const task=(id,start,end,resource='officer:one')=>({id,start,end,after:[],claims:[{resource,amount:1}],conditions:[],effects:[],status:'authorized',revision:0});
test('chronicles reject overlapping people, cumulative stock and road overbooking',()=>{
 assert.match(chronicleError([task('a',1,3),task('b',2,4)]),/resource-conflict/);
 assert.equal(chronicleError([task('a',1,3),task('b',3,4)]),null);
 for(const resource of ['gold:city','road:edge','slot:technology']){
  const a=task('a',1,4,resource),b=task('b',2,3,resource);a.claims[0].amount=2;b.claims[0].amount=2;
  assert.match(chronicleError([a,b],{[resource]:3}),/resource-conflict/);
 }
});
test('chronicles require causal support and reject conflicting effects and precedence',()=>{
 const a=task('move',1,3),b=task('work',3,5);a.effects=[{key:'at',value:'front'}];b.after=['move'];b.conditions=[{key:'at',value:'front',source:'move'}];
 assert.equal(chronicleError([a,b]),null);
 const enemy=task('divert',3,4,'officer:other');enemy.effects=[{key:'at',value:'rear'}];assert.equal(chronicleError([a,b,enemy]),'causal-threat');
 b.start=2;assert.equal(chronicleError([a,b]),'unsupported-precedence');
});
test('first complete method uses deterministic budget and never installs partial allocations',()=>{
 const a=task('a',1,3),b=task('b',2,4),c=task('c',3,5),original=JSON.stringify(a);
 const methods=[{tasks:[b]},{tasks:[c]}];
 assert.equal(firstChronicleMethod({accepted:[a],methods,budget:1}).reason,'budget');
 assert.deepEqual(firstChronicleMethod({accepted:[a],methods,budget:2}).tasks,[c]);assert.equal(JSON.stringify(a),original);
 c.conditions=[{source:'initial',key:'stock',value:100}];assert.equal(firstChronicleMethod({methods:[{tasks:[c]}],facts:{stock:50}}).tasks,null);
});
test('completion requires real effects and stale completion cannot release successor ownership',()=>{
 const a=task('move',1,3);a.status='handoff';a.effects=[{key:'at',value:'front'}];
 assert.equal(transitionChronicle(a,'complete',{revision:0,day:3,facts:{at:'rear'}}),false);
 const b=task('prepare',3,7),next=handoffChronicle([a],'move',b,{revision:0,facts:{at:'front'}});
 assert.equal(next[0].status,'complete');assert.equal(handoffChronicle(next,'move',b,{revision:0,facts:{at:'front'}}),null);
 assert.equal(a.status,'handoff','atomic update must not mutate original on inspection');
});
test('actual concentration arrival keeps parent ownership across transfer and domestic policies',async()=>{
 const checks=await exercise({source:fileURLToPath(new URL('..',import.meta.url))});
 for(const [name,passed]of Object.entries(checks))assert.equal(passed,true,name);
});
