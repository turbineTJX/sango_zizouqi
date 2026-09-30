import test from 'node:test';
import assert from 'node:assert/strict';
import {AbilityCues,isHighlightedAbility} from '../ability-cues.mjs';
import {TACTIC_DESIGNS} from '../data/design/tactics.mjs';
const event=(from='cao',side=0)=>[{from,side,name:from,label:'奸雄',traitId:'hero-cao',abilityKind:'trait',traitEffective:true,tick:1}];
test('cues keep both sides visible, bound backlog and merge rapid repeated triggers',()=>{
 const c=new AbilityCues();c.push(event(),0);c.push(event('shao',1),0);c.push(event(),200);
 assert.equal(c.active[0].count,2);assert.equal(c.active[1].from,'shao');assert.equal(c.active[0].start,0);
 for(let i=0;i<20;i++)c.push(event('officer'+i),400);
 assert.equal(c.waiting[0].length,4);c.advance(3000);assert.equal(c.active[0].from,'officer16');
 c.advance(9000);assert.equal(c.active[0],null);assert.equal(c.waiting[0].length,0);
 c.reset();assert.deepEqual(c.active,[null,null]);
});
test('ordinary traits and small tactics have no special cue; unique abilities and big tactics do',()=>{
 const c=new AbilityCues();
 const ordinary=[{...event()[0],traitId:'martial',label:'武勇'}, {from:'cao',side:0,skill:true,label:TACTIC_DESIGNS.phalanx.name}];
 for(const e of ordinary){assert.equal(isHighlightedAbility(e),false);c.push([e],0);}
 assert.deepEqual(c.active,[null,null]);
 assert.equal(isHighlightedAbility(event()[0]),true);
 for(const id of ['cleave','unique-person-396'])assert.equal(isHighlightedAbility({skill:true,label:TACTIC_DESIGNS[id].name}),true,id);
});
