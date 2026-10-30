import test from 'node:test';
import assert from 'node:assert/strict';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
import {bondOverview,bondReference,bondTierText,bondRecipients} from '../bond-reference.mjs';
import {detailTable} from '../ui-detail-table.mjs';
test('overview and details track every design and variable threshold count',()=>{
 const before=JSON.stringify(BOND_DESIGNS),overview=bondOverview();
 assert.equal(overview.groups.reduce((n,g)=>n+g.rows.length,0),Object.keys(BOND_DESIGNS).length);assert.deepEqual(overview.groups.map(g=>g.rows.length),[27,6]);
 for(const [id,d] of Object.entries(BOND_DESIGNS)){
  const detail=bondReference(id),rows=detail.groups[0].rows;
  assert.equal(rows.filter(r=>/ 点$/.test(r[0])).length,d.thresholds.length);
  for(const [i,n] of d.thresholds.entries())assert.equal(rows.find(r=>r[0]===`${n} 点`)[2],bondTierText(d,i));
  assert.equal(rows.length,d.thresholds.length);
  assert.ok(detailTable(detail).includes(bondTierText(d,0)));
  assert.doesNotMatch(detailTable(detail),/定位|稀缺性|持有武将|组阵取舍|受益部队|完整效果|成长/);
 }
 assert.equal(JSON.stringify(BOND_DESIGNS),before);assert.equal(bondReference('missing'),null);
});

test('Song detail and recipient wording use its actual range, tactic priorities and six-holder threshold',()=>{
 const d=BOND_DESIGNS.bondSong,detail=JSON.stringify(bondReference('bondSong'));
 assert.deepEqual(d.thresholds,[2,6,12]);assert.match(detail,/2格/);assert.match(detail,/尚有次数/);assert.match(detail,/门槛/);assert.match(detail,/非避战/);
 assert.doesNotMatch(detail,/相邻战意最低/);assert.match(bondRecipients(d),/无需持有战歌/);
});

test('opening formation details explain partial shields while preserving full amounts and duration',()=>{
 for(const key of ['bondTigerFormation','bondDragonFormation']){
  const d=BOND_DESIGNS[key],text=JSON.stringify(bondReference(key));
  for(const fragment of ['1／2／3','1/3／2/3／全部','20%','45%','70%','36回合','向下取整'])assert.ok(text.includes(fragment),fragment);
  assert.match(bondRecipients(d),/全部真实首发按开场占位比例/);
  assert.doesNotMatch(d.description+d.tradeoff,/未占齐.*不领取|三位齐备才有/);
 }
});
