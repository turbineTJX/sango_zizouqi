import {RULES_VERSION} from '../combat-rules.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {relationshipInfo,relationshipKey,setRelationshipScore,validRelationshipScores,setRelationshipType,changeRelationshipScore} from '../relationships.mjs';
import {newGame,validateSave,lockDeployment,stepBattle} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {relationshipEditorMarkup,officerDetailMarkup} from '../officer-roster.mjs';

const sworn=['person-636','person-99'];
function sourcePair(field,label){
 for(const u of OFFICER_CATALOG){
  const value=u.relations[field],ids=Array.isArray(value)?value:value?[value]:[];
  for(const id of ids)if(id!==u.id&&relationshipInfo(u.id,id).label===label)return [u.id,id];
 }
 throw Error('Missing source fixture: '+label);
}
test('source relationships have symmetric baselines, positive floors, negative ceilings and neutral defaults',()=>{
 const cases=[['swornSiblingIds','义兄弟',80,100],['fatherId','父母子女',75,90],['spouseIds','夫妻',80,95],['likedIds','亲爱',70,79],['dislikedIds','厌恶',20,20]];
 for(const [field,label,base,max] of cases){
  const pair=sourcePair(field,label),a=relationshipInfo(...pair),b=relationshipInfo(...pair.toReversed());
  assert.deepEqual(a,b);assert.equal(a.score,base);assert.equal(a.chance,base);
  assert.equal(a.min,label==='厌恶'?0:base);assert.equal(a.max,max);
 }
 assert.equal(relationshipInfo('custom-1','custom-2').score,50);
 assert.equal(relationshipInfo('test-0','test-1').score,50);
});

test('scores accept explicit improvements or reduced hostility and reject out-of-range or invalid pairs',()=>{
 const s=newGame(),key=relationshipKey(...sworn);
 assert.equal(setRelationshipScore(s,...sworn,95),null);assert.equal(relationshipInfo(...sworn.toReversed(),s.relationshipScores).score,95);
 for(const n of [-1,79,101,80.5,'90',NaN])assert.ok(setRelationshipScore(s,...sworn,n));
 assert.equal(s.relationshipScores[key],95);
 const hate=sourcePair('dislikedIds','厌恶');assert.equal(setRelationshipScore(s,...hate,0),null);assert.ok(setRelationshipScore(s,...hate,21));
 assert.ok(setRelationshipScore(s,'custom-1','custom-2',100));
 assert.equal(setRelationshipScore(s,'custom-1','custom-2',59),null);
 assert.ok(setRelationshipScore(s,'custom-1','custom-1',50));assert.ok(setRelationshipScore(s,'missing','cao',50));
 assert.equal(setRelationshipScore(s,...sworn,80),null);assert.equal(Object.hasOwn(s.relationshipScores,key),false);
 assert.ok(validRelationshipScores(s.relationshipScores));
});

test('relationship scores persist independently in deployments and lock during combat, including after reload',()=>{
 const s=createScenario('officer-lab',27,20,sworn);
 assert.equal(setRelationshipScore(s,...sworn,92),null);assert.notEqual(s.relationshipScores,s.battle.relationshipScores);
 assert.equal(relationshipInfo(...sworn,s.battle.relationshipScores).score,92);
 const loaded=validateSave(structuredClone(s));assert.deepEqual(loaded,s);
 lockDeployment(s.battle);assert.ok(setRelationshipScore(s,...sworn,96));
 const resumed=validateSave(structuredClone(s));
 for(let i=0;i<40;i++){stepBattle(s.battle);stepBattle(resumed.battle);}assert.deepEqual(resumed.battle,s.battle);
});

test('missing, corrupt and inconsistent relationship maps are rejected',()=>{

 const key=relationshipKey(...sworn);
 for(const scores of [null,[],{[key]:79},{[key]:101},{[key]:'90'},{'cao|cao':50},{'unknown|yu':50},{'person-99|person-636':90}]){
  const s=newGame();s.relationshipScores=scores;assert.throws(()=>validateSave(s),/人物关系值/);
 }
 const absent=newGame();delete absent.relationshipScores;assert.throws(()=>validateSave(absent),/人物关系值/);
 const inconsistent=createScenario('officer-lab',8,20,sworn);inconsistent.relationshipScores[key]=95;assert.throws(()=>validateSave(inconsistent),/不一致/);
});

test('character pages expose saved scores, probability, bounds, and combat locking',()=>{
 const scores={[relationshipKey(...sworn)]:93};
 const detail=officerDetailMarkup(sworn[0],scores);assert.match(detail,/当前义兄弟 93 · 连携 93%/);
 const editor=relationshipEditorMarkup(...sworn,scores);assert.match(editor,/min="80" max="100"/);assert.match(editor,/value="93"/);assert.match(editor,/93%/);
 const locked=relationshipEditorMarkup(...sworn,scores,true);assert.match(locked,/data-action="relationship-save" disabled/);
});


test('score events cross social tiers without granting marriage or sworn bonds automatically',()=>{
 const s=newGame(),pair=['custom-1','custom-2'];
 const read=()=>relationshipInfo(...pair,s.relationshipScores,s.relationshipTypes);
 for(const [delta,type,score] of [[10,'friendly',60],[10,'liked',70],[50,'liked',79],[-20,'ordinary',59],[-30,'distant',29],[-20,'disliked',9],[31,'ordinary',40]]){
  assert.equal(changeRelationshipScore(s,...pair,delta),null);assert.equal(read().type,type);assert.equal(read().score,score);
  assert.deepEqual(validateSave(structuredClone(s)),s);
 }
 for(const delta of [NaN,1.5,'10'])assert.ok(changeRelationshipScore(s,...pair,delta));
 assert.equal(setRelationshipType(s,...pair,'sworn'),null);assert.equal(read().score,80);
 assert.equal(changeRelationshipScore(s,...pair,100),null);assert.equal(read().score,100);
 assert.equal(changeRelationshipScore(s,...pair,-25),null);assert.equal(read().type,'liked');assert.equal(read().score,75);
});

test('special relationships have different caps and deterioration preserves source kinship',()=>{
 const s=newGame(),pair=['custom-1','custom-2'];
 assert.ok(setRelationshipType(s,...pair,'parent'));
 assert.equal(setRelationshipType(s,...pair,'spouse'),null);assert.equal(changeRelationshipScore(s,...pair,500),null);
 assert.equal(relationshipInfo(...pair,s.relationshipScores,s.relationshipTypes).score,95);
 assert.ok(setRelationshipScore(s,...pair,96));
 const parent=sourcePair('fatherId','父母子女');
 assert.equal(changeRelationshipScore(s,...parent,500),null);assert.equal(relationshipInfo(...parent,s.relationshipScores,s.relationshipTypes).score,90);
 assert.equal(changeRelationshipScore(s,...parent,-80),null);
 const current=relationshipInfo(...parent,s.relationshipScores,s.relationshipTypes);
 assert.equal(current.type,'disliked');assert.equal(current.sourceType,'parent');assert.equal(current.score,10);
 assert.equal(setRelationshipType(s,...parent,'parent'),null);assert.equal(relationshipInfo(...parent,s.relationshipScores,s.relationshipTypes).score,75);
 assert.equal(relationshipInfo(...parent).sourceType,'parent');
});

test('changed relationships persist symmetrically, affect the battle snapshot and lock once combat starts',()=>{
 const s=createScenario('officer-lab',19,20,sworn);
 assert.equal(setRelationshipType(s,...sworn,'disliked',12),null);
 const read=b=>relationshipInfo(...sworn.toReversed(),b.relationshipScores,b.relationshipTypes);
 assert.equal(read(s).score,12);assert.equal(read(s.battle).type,'disliked');assert.equal(read(s).sourceType,'sworn');
 assert.notEqual(s.relationshipTypes,s.battle.relationshipTypes);
 const loaded=validateSave(structuredClone(s));assert.deepEqual(loaded,s);
 lockDeployment(s.battle);assert.ok(setRelationshipType(s,...sworn,'sworn'));assert.ok(changeRelationshipScore(s,...sworn,5));
 const resumed=validateSave(structuredClone(s));for(let i=0;i<40;i++){stepBattle(s.battle);stepBattle(resumed.battle);}assert.deepEqual(s.battle,resumed.battle);
 const html=relationshipEditorMarkup(...sworn,s.relationshipScores,true,s.relationshipTypes);
 assert.match(html,/value="disliked" selected/);assert.match(html,/min="0" max="20"/);assert.match(html,/初始关系：义兄弟/);assert.match(html,/id="relationship-type" disabled/);
});

test('invalid relationship types and out-of-tier scores are rejected without migration',()=>{
 const ordinary=relationshipKey('custom-1','custom-2');
 const key=relationshipKey(...sworn);
 for(const types of [null,[],{[key]:'unknown'},{[ordinary]:'parent'},{'cao|cao':'sworn'},{'unknown|yu':'liked'}]){
  const broken=newGame();broken.relationshipTypes=types;assert.throws(()=>validateSave(broken),/人物关系类型/);
 }
 const absent=newGame();delete absent.relationshipTypes;assert.throws(()=>validateSave(absent),/人物关系类型/);
 const inconsistent=createScenario('officer-lab',8,20,sworn);inconsistent.relationshipTypes[key]='liked';assert.throws(()=>validateSave(inconsistent),/不一致/);
 const invalid=newGame();invalid.relationshipScores[ordinary]=60;assert.throws(()=>validateSave(invalid),/人物关系值/);
});
