import test from 'node:test';
import assert from 'node:assert/strict';
import {TROOPS,makeOfficer} from '../engine.mjs';
import {formationAura} from '../support-rules.mjs';
import {TECHS,canTrain} from '../domestic.mjs';
import {TRAIT_DESIGNS} from '../data/design/traits.mjs';
import {TACTICS_BOOK} from '../tactics.mjs';
import {officerTraits} from '../officer-traits.mjs';
import {unitAttributes} from '../unit-stats.mjs';

const unit=(id,x,politics=80)=>({...makeOfficer(id,3000,0,1),x,y:2,side:0,hp:3000,maxHp:3000,status:'active',statuses:{},politics,tactics:[]});
test('removed auxiliaries cannot be trained or learned; recovery is an identity trait',()=>{
 assert.equal(TROOPS.logistics,undefined);assert.equal(TECHS.logistics,undefined);assert.equal(TACTICS_BOOK.passage,undefined);
 assert.equal(canTrain({domestic:{techs:['logistics']}},'logistics'),false);
 const u=makeOfficer('yu');assert.ok(officerTraits(u).includes('formationSupport'));assert.equal(u.tacticLearning.byTroop.logistics,undefined);
 assert.equal(TRAIT_DESIGNS.formationSupport.name,'协阵');
});
test('aura needs its fixed holder, works with every weapon and scales with politics alone',()=>{
 const source=unit('yu',2),target=unit('dun',3),b={tick:0,sides:[{units:[source,target]}, {units:[]}]};
 const factor=formationAura(b,target).factor;
 for(const type of Object.keys(TROOPS)){source.type=type;target.type=type;assert.equal(formationAura(b,target).factor,factor,type);}
 source.politics=20;const low=formationAura(b,target).factor;source.politics=100;assert.ok(formationAura(b,target).factor>low);
 const high=formationAura(b,target).factor;source.intellect=1;source.force=1;assert.equal(formationAura(b,target).factor,high);
 source.id='dun';assert.equal(formationAura(b,target),null);source.id='yu';
 source.statuses.seal={until:20};assert.ok(formationAura(b,target),'封技不封固定特性');
 source.statuses.confuse={until:20};assert.equal(formationAura(b,target),null);delete source.statuses.confuse;
 source.x=0;assert.equal(formationAura(b,target),null);
});
test('same aura selects one strongest living source, never stacks or helps its own source',()=>{
 const a=unit('yu',2,20),b=unit('ju',4,100),target=unit('dun',3),battle={tick:0,sides:[{units:[a,b,target]}, {units:[]}]};
 assert.equal(formationAura(battle,target).source.id,b.id);b.hp=0;assert.equal(formationAura(battle,target).source.id,a.id);
 battle.sides[0].units=[a];assert.equal(formationAura(battle,a),null);
});
test('camp care political defense and discipline apply across weapons without boosting attack',()=>{
 const u=makeOfficer('person-255',3000,0,1);
 for(const type of Object.keys(TROOPS)){
  const low=unitAttributes({...u,type,politics:0}),high=unitAttributes({...u,type,politics:100});
  assert.ok(Math.abs(high.defense/low.defense-1.2)<1e-9);
  assert.equal(high.attack,low.attack);assert.ok(high.discipline>low.discipline);
  assert.deepEqual(officerTraits({...u,type,level:10}),officerTraits(u));
 }
});
