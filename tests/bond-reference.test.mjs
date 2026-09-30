import test from 'node:test';
import assert from 'node:assert/strict';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
import {bondOverview,bondReference,bondTierText} from '../bond-reference.mjs';
import {detailTable} from '../ui-detail-table.mjs';
test('overview and details track every design and variable threshold count',()=>{
 const before=JSON.stringify(BOND_DESIGNS),overview=bondOverview();
 assert.equal(overview.groups[0].rows.length,Object.keys(BOND_DESIGNS).length);
 for(const [id,d] of Object.entries(BOND_DESIGNS)){
  const detail=bondReference(id),rows=detail.groups[0].rows;
  assert.equal(rows.filter(r=>/ 点$/.test(r[0])).length,d.thresholds.length);
  for(const [i,n] of d.thresholds.entries())assert.equal(rows.find(r=>r[0]===`${n} 点`)[2],bondTierText(d,i));
  assert.ok(detailTable(detail).includes(d.description));
 }
 assert.equal(JSON.stringify(BOND_DESIGNS),before);assert.equal(bondReference('missing'),null);
});
