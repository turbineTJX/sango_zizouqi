import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeOfficer} from '../engine.mjs';
import {initializeTacticLearning} from '../tactic-learning.mjs';
import {unitTactics} from '../tactics.mjs';
import {assessCombatForce,estimateCombatLossFraction} from '../strategic-combat-assessment.mjs';
import {strategicCapabilities,strategicPower,offensiveFacts,evaluateOffensive} from '../strategic-ai.mjs';
import {planningFront} from './helpers/strategic-planning.mjs';
import {initializeVision} from '../strategic-vision.mjs';

function force(ids,{type='spear',men=3000,level=5}={}){
 const units=ids.map((id,i)=>{const u=makeOfficer(id,men,i,level);u.type=type;return initializeTacticLearning(u,55);});
 return {id:'a-test',units,leader:ids[0],advisor:ids.at(-1),morale:80,hunger:0};
}
test('identical observed armies have symmetric ratings and one shared capability measurement',()=>{
 const a=force(['cao','dun','liao']),b=structuredClone(a),s={campaign:{battles:[]}};
 b.id='opponent';b.faction='other';
 const left=assessCombatForce(a,{opponents:b.units}),right=assessCombatForce(b,{opponents:a.units});
 assert.deepEqual(left,right);assert.equal(strategicPower(s,a),strategicCapabilities(s,a).field);
});
test('real troop counters and public terrain change the same force assessment',()=>{
 const spear=force(['yan','wen']),horse=force(['cao','dun'],{type:'cavalry'}),bow=force(['cao','dun'],{type:'archer'});
 assert.ok(assessCombatForce(spear,{opponents:horse.units}).power>assessCombatForce(spear,{opponents:bow.units}).power);
 assert.ok(assessCombatForce(horse,{terrain:'marsh'}).power<assessCombatForce(horse,{terrain:'land'}).power);
 assert.ok(assessCombatForce(bow,{terrain:'hill'}).power>assessCombatForce(bow,{terrain:'land'}).power);
});
test('spent real tactic stocks remove their expected contribution without changing learned tactics',()=>{
 const a=force(['person-99','person-433','person-636'],{level:10}),b=structuredClone(a),before=assessCombatForce(a);
 for(const u of b.units){u.tacticCasts={};for(const t of unitTactics(u))u.tacticCasts[t.id]=t.maxUses;}
 const after=assessCombatForce(b);assert.ok(before.tacticOutput>0);assert.equal(after.tacticOutput,0);assert.ok(after.power<before.power);
 assert.deepEqual(b.units.map(u=>u.tactics),a.units.map(u=>u.tactics));
});
test('known reserves add discounted strength rather than simultaneous full frontage',()=>{
 const a=force(['shao','yan','wen','he','ju','tian','gao','person-72']),first={...a,units:a.units.slice(0,6)},reserves={...a,units:a.units.slice(6),leader:'gao',advisor:'person-72'};
 const all=assessCombatForce(a),front=assessCombatForce(first),extra=assessCombatForce(reserves);
 assert.equal(all.capacity,6);assert.equal(all.reserveUnits,2);assert.ok(all.power>front.power);assert.ok(all.power<front.power+extra.power);
});
test('only selected actual commanders contribute appointment stats and frontage',()=>{
 const a=force(['cao','dun','liao','chu','jia','yu','jin']);
 const absent={...a,units:a.units.filter(u=>u.id!=='cao')};
 const wrong=assessCombatForce(absent),appointed=assessCombatForce({...absent,leader:'liao'});
 assert.equal(wrong.capacity,6,'an absent Cao cannot provide his seventh slot');assert.ok(appointed.power>wrong.power);
});
test('static assessment preserves inputs and cannot use hidden orders or a future random seed',()=>{
 const a=force(['cao','dun','liao']),before=structuredClone(a),value=assessCombatForce(a);
 assert.deepEqual(a,before);assert.deepEqual(assessCombatForce({...a,seed:991,secretOrder:'ambush',futureWinner:1}),value);
 const source=readFileSync(new URL('../strategic-combat-assessment.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\b(?:stepBattle|generateBattle|startBattle|planBattleCouncilsAI|Math\.random)\s*\(/);
 assert.doesNotMatch(source,/from ['"].*\/(?:engine|battle-generator|battle-ai)\.mjs['"]/);
});
test('closed form losses fall nonlinearly with advantage and remain bounded at parity',()=>{
 assert.equal(estimateCombatLossFraction(10000,0),0);assert.equal(estimateCombatLossFraction(10000,10000),.8);
 const twice=estimateCombatLossFraction(20000,10000),triple=estimateCombatLossFraction(30000,10000);
 assert.ok(twice>.1&&twice<.15);assert.ok(triple<twice/2);
});
test('offensive facts keep shared real combat features and retain reinforcement resource vetoes',()=>{
 const {s,home,target}=planningFront();target.manpower=0;
 const proposal={faction:'yuan',staging:home,target,groups:[{c:home,units:home.units.slice(0,4),days:0}],assaultDays:1,siegeDays:2};
 const initial=offensiveFacts(s,proposal),value=evaluateOffensive(s,proposal);
 assert.ok(initial.facts.combatAssessment.output>0);assert.equal(initial.facts.combatLossFraction,estimateCombatLossFraction(initial.facts.fieldPower,initial.facts.defense));
 assert.equal(value.military.model,'static-v2-no-bonds');assert.ok(value.accepted,value.reason);
 target.units.forEach(u=>u.troops=6000);initializeVision(s);
 const stronger=evaluateOffensive(s,proposal);assert.ok(stronger.military.defensePower>value.military.defensePower);assert.equal(stronger.accepted,false);assert.match(stronger.reason,/优势/);
});
