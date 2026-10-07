import test from 'node:test';import assert from 'node:assert/strict';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';import {BOND_ASSIGNMENTS as A,BOND_TRIPLE_OFFICERS as triples} from '../data/design/bond-assignments.mjs';
import {validBondGrowth,advanceBonds} from '../bonds.mjs';
test('thirty-one synergies cover every officer, without crowding individual labels',()=>{
 assert.equal(Object.keys(D).length,31);assert.equal(new Set(Object.values(D).map(d=>d.special)).size,31);
 assert.equal(Object.keys(A).length,832);assert.ok(Object.entries(A).every(([id,a])=>Object.keys(a).length>=1&&Object.keys(a).length<=(triples.includes(id)?3:2)&&Object.keys(a).every(key=>D[key])));
 assert.ok(Object.values(A).filter(a=>Object.keys(a).length===1).length>Object.keys(A).length/2);assert.ok(triples.length<10);
});
test('growth completes reviewed labels and rejects retired trait grants',()=>{
 const id=Object.keys(A).find(id=>Object.keys(A[id]).length===1),u={id,level:10};advanceBonds(u,12);
 assert.deepEqual(u.bondGrowth.levels,A[id]);assert.ok(validBondGrowth(u));u.bondGrowth.levels.bondHorse=1;assert.equal(validBondGrowth(u),false);
});
