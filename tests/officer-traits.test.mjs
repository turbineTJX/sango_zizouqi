import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAIT_DESIGNS} from '../data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS} from '../data/design/assignments.mjs';
import {officerTraits,taskTraitBonus} from '../officer-traits.mjs';
import {makeOfficer} from '../engine.mjs';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';
import {personnelSpeed,lightPersonnelSpeed} from '../personnel-movement.mjs';
import {domesticEffects} from '../passives.mjs';
test('all 832 assignments allow no independent trait and preserve only genuine mechanisms',()=>{
 assert.equal(Object.keys(OFFICER_ASSIGNMENTS).length,832);assert.equal(Object.keys(TRAIT_DESIGNS).length,67);
 for(const [id,a]of Object.entries(OFFICER_ASSIGNMENTS)){
  assert.ok(a.traits.every(t=>TRAIT_DESIGNS[t]));assert.deepEqual(officerTraits(makeOfficer(id,1000,0,1)),officerTraits(makeOfficer(id,1000,0,10)));
 }
 assert.ok(officerTraits({id:'person-290'}).includes('zhugeCoordination'));assert.deepEqual(officerTraits({id:'cao'}),['hero-cao']);
 for(const t of Object.values(TRAIT_DESIGNS)){assert.ok(['普通','专属'].includes(t.tier));assert.ok(t.clinicIndependent||t.strategic||t.mechanics?.length||t.work?.actions.length);}
});
test('deleted traits supply no task, governor, transport or personnel multiplier',()=>{
 for(const id of ['person-533','person-107','person-255','person-705']){
  const u=makeOfficer(id,1000);assert.deepEqual(domesticEffects(u),{});assert.equal(taskTraitBonus(u,{kind:'cash',direction:'commerce'},'quantity'),0);
  assert.equal(personnelSpeed({unit:u,cargo:{grain:100}}),personnelSpeed({unit:{...u,id:'plain'},cargo:{grain:100}}));assert.equal(lightPersonnelSpeed(u),lightPersonnelSpeed({id:'plain'}));
 }
});
test('design rejects numerical traits and accepts ordinary or exclusive mechanism categories',()=>{
 const d=structuredClone(DESIGN_TABLES);d.traits.fieldMedicine.quantity=.2;assert.ok(validateDesignTables(d).some(x=>x.includes('非纯数值机制')));
 delete d.traits.fieldMedicine.quantity;d.traits.fieldMedicine.tier='普通';assert.deepEqual(validateDesignTables(d),[]);
 d.traits.fieldMedicine.tier='内政';assert.ok(validateDesignTables(d).some(x=>x.includes('只分普通、专属')));
});

