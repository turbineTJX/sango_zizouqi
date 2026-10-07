import test from 'node:test';
import assert from 'node:assert/strict';
import {CONSUMPTION_PROFILES,consumptionTrial,consumptionMatrix} from '../scripts/economy-consumption-lib.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';

test('normal demand is measured before income, keeps troop load constant and reconciles components',()=>{
 const r=consumptionTrial(CONSUMPTION_PROFILES.find(p=>p.id==='normal'));
 assert.equal(r.initialFormation.manpower,10000);assert.equal(r.initialFormation.grain,0);
 for(const sample of r.samples){assert.equal(sample.replacement.manpower,375);assert.equal(sample.reserveReplacement,375);assert.equal(sample.replacement.grain,0);}
 for(const key of ['gold','grain','manpower'])assert.equal(r.total[key],Object.values(r.parts).reduce((sum,part)=>sum+part[key],0));
 assert.equal(r.total.manpower,r.parts.replacement.manpower);
});
test('controlled attrition, actual expensive troop recipes and grain losses stress separate resources',()=>{
 const rows=CONSUMPTION_PROFILES.map(p=>consumptionTrial(p)),row=id=>rows.find(r=>r.profile===id),normal=row('normal');
 assert.ok(row('attrition').perTurn.manpower>normal.perTurn.manpower*1.5);
 assert.ok(row('equipment').parts.replacement.gold/row('equipment').parts.replacement.manpower>normal.parts.replacement.gold/normal.parts.replacement.manpower);
 assert.equal(row('supply').perTurn.grain-normal.perTurn.grain,1500);
 assert.equal(row('peace').parts.replacement.manpower,0);
});
test('time horizons and reserve buffers retain independent conditional consumption ratios',()=>{
 const rows=consumptionMatrix();assert.equal(rows.length,45);
 const normal=rows.filter(r=>r.profile==='normal'&&r.reserveBuffer===10000);
 assert.ok(normal.every(r=>r.perTurn.gold===normal[0].perTurn.gold&&r.perTurn.grain===normal[0].perTurn.grain));
 assert.ok(normal[0].lifecycleWeights.manpower<normal.at(-1).lifecycleWeights.manpower);
 const small=rows.find(r=>r.profile==='normal'&&r.days===120&&r.reserveBuffer===5000),large=rows.find(r=>r.profile==='normal'&&r.days===120&&r.reserveBuffer===15000);
 assert.deepEqual(large.perTurn,small.perTurn);assert.deepEqual(large.weights,small.weights);
});
