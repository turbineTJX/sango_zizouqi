import test from 'node:test';
import assert from 'node:assert/strict';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {directWorkTrial} from '../scripts/economy-balance-lib.mjs';
import {VALIDATION_SEEDS,collectWorkSamples,scanValues,summarizeWork,impliedValues,tradeQuoteRange,formationProbes,reserveHoldingProbe,workValue} from '../scripts/economy-valuation-lib.mjs';

test('resource price fitting uses raw net flows and fresh seeds keep routine calendar returns within 10%',()=>{
 const samples=collectWorkSamples(VALIDATION_SEEDS.slice(0,8),['fair','cultivate','recruit']),ranked=scanValues(samples);
 assert.equal(ranked.length,17738);
 for(const row of summarizeWork(samples,ECONOMY_RULES.value))assert.ok(row.coreSpread<.1);
 for(const row of impliedValues(samples)){assert.ok(Math.abs(row.grain-ECONOMY_RULES.value.grain)<.01);assert.ok(Math.abs(row.manpower-ECONOMY_RULES.value.manpower)<.02);}
 assert.ok(summarizeWork(samples,{gold:1,grain:.25,manpower:.8}).some(r=>r.coreSpread>.15));
});
test('short medical work has an early result, but no second ordinary action before the next turn',()=>{
 const r=directWorkTrial(9001,60,'heal');assert.equal(r.activeDays,5);assert.equal(r.cycleDays,10);
 assert.equal(r.sameTurnRestarted,false);
 const summary=summarizeWork([r],ECONOMY_RULES.value)[1].commands[0];
 assert.equal(summary.perActiveDay,summary.perCalendarDay*2);
});
test('medical valuation records real saved replacement costs without creating reserve inventory',()=>{
 const spear=directWorkTrial(9001,60,'heal'),cavalry=directWorkTrial(9001,60,'heal',{patientType:'cavalry'});
 assert.equal(spear.healed,cavalry.healed);assert.equal(spear.delta.manpower,0);
 assert.equal(cavalry.avoidedReplacement.gold,spear.avoidedReplacement.gold*2);
 assert.ok(workValue(cavalry,ECONOMY_RULES.value)>workValue(spear,ECONOMY_RULES.value));
});
test('actual grain buying and selling retain a cash spread independently of demand valuation',()=>{
 const samples=collectWorkSamples(VALIDATION_SEEDS.slice(0,8),['buy','sell']),quotes=tradeQuoteRange(samples);
 assert.ok(quotes.buy.length>0&&quotes.sell.length>0);
 assert.ok(Math.max(...quotes.sell.map(r=>r.effectivePrice))<Math.min(...quotes.buy.map(r=>r.effectivePrice)));
});
test('equal-value gifts only improve real formation when they address the limiting resource',()=>{
 const rows=formationProbes(ECONOMY_RULES.value);
 for(const r of rows){
  assert.equal(r.error,null);
  const base=rows.find(b=>b.type===r.type&&b.missing===r.missing&&b.grant==='none');
  if(r.missing==='none'||r.missing==='grain'||r.grant!==r.missing)assert.equal(r.formed,base.formed);
  else assert.ok(r.formed>base.formed);
  assert.equal(r.spent.manpower,r.formed);assert.equal(r.spent.grain,0);
 }
});
test('unformed reserve holding never consumes food, money or reserve manpower',()=>{
 const rows=reserveHoldingProbe();assert.ok(rows.every(r=>r.remaining===1000&&r.paidGold===0&&r.grain===0));
});
