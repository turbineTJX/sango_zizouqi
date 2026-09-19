import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario,SCENARIOS} from '../scenarios.mjs';
import {stepBattle,validateSave} from '../engine.mjs';
import {inspectionStatuses,statusAttributeChanges,statusAmounts,statusSources} from '../status-display.mjs';
import {unitAttributes} from '../unit-stats.mjs';

test('real battles retain skill provenance through stacking, refresh, shields and deterministic saves',()=>{
  const seen=new Set();let comparisons=0;
  for(const scenario of SCENARIOS){
    const state=createScenario(scenario.id),b=state.battle;
    for(let i=0;i<100&&!b.result;i++){
      stepBattle(b);
      for(const u of b.sides.flatMap(s=>s.units))for(const status of inspectionStatuses(b,u)){
        assert.ok(!status.sources.includes('未记录来源'),`${scenario.id} ${u.name} ${status.key}`);
        if(status.army||status.dynamic||status.key==='shield')continue;
        seen.add(status.key);
        const snapshot=JSON.stringify(b);
        for(const row of statusAttributeChanges(b,u,status)){
          assert.ok(Number.isFinite(row.delta));
          const copy=structuredClone(b),target=copy.sides[u.side].units.find(v=>v.id===u.id);
          delete target.statuses[status.key];
          const scale=row.unit==='百分点'?100:1;
          assert.equal(row.before,unitAttributes(target,copy)[row.key]*scale);
          comparisons++;
        }
        assert.equal(JSON.stringify(b),snapshot,'inspection must not mutate combat');
      }
    }
    const restored=validateSave(JSON.parse(JSON.stringify(state)));
    for(let i=0;i<3;i++){stepBattle(b);stepBattle(restored.battle);}
    assert.equal(JSON.stringify(restored.battle),JSON.stringify(b));
  }
  for(const key of ['armorBreak','weaken','burn','curse','shield','stun','resolve'].filter(k=>k!=='shield'))assert.ok(seen.has(key),key);
  assert.ok(comparisons>100);
});

test('stacked attribute losses, army effects and non-stacking haste show marginal actual values',()=>{
  const state=createScenario('field'),b=state.battle,u=b.sides[0].units[0];
  // Attribute calculations are tested separately from application/targeting above.
  u.statuses={armorBreak:{until:20,potency:1},bulwark:{until:20,potency:1},haste:{until:20}};
  b.sides[0].fortifyUntil=20;b.sides[0].hasteUntil=20;
  const statuses=inspectionStatuses(b,u),row=statusAttributeChanges(b,u,statuses.find(s=>s.key==='armorBreak')).find(r=>r.key==='defense');
  assert.ok(Math.abs(row.delta+row.before*.2)<1e-9);
  assert.equal(statusAttributeChanges(b,u,statuses.find(s=>s.key==='haste')).length,0);
  assert.equal(statusAttributeChanges(b,u,statuses.find(s=>s.key==='hasteUntil')).length,0);
  assert.ok(statusAttributeChanges(b,u,statuses.find(s=>s.key==='fortifyUntil')).some(r=>r.delta>0));
});

test('current DOT details apply terrain and passive mitigation, before shields',()=>{
  const state=createScenario('field'),b=state.battle,u=b.sides[0].units[0];
  const status={key:'plague',state:{amount:100,sourceName:'贾诩',sourceSkillName:'毒疫'}};
  assert.deepEqual(statusSources(b,status),['贾诩 · 毒疫']);
  const rows=statusAmounts(b,u,status);
  assert.match(rows[0][1],/\d+ 人（护盾吸收前）/);
});
