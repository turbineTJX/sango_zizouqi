import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { run } from 'node:test';
import { readJSON, writeJSON, atomic, exists } from './storage.mjs';
import { BATTLE_CASES } from './rules.mjs';
import { warTempoReport, observedJointParticipation } from '../war-tempo-report.mjs';

const task = await readJSON(process.argv[2]);
const load = file => import(pathToFileURL(join(task.source, file)));
const sum = values => values.reduce((a, b) => a + b, 0);
const quantile = (values, q) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * q) - 1)] ?? 0;

async function mechanisms() {
  const { AI_DECISION_TESTS } = await load('ai-decision-tests.mjs');
  const { PLAYER_AI_DECISIONS } = await load('player-ai-decisions.mjs');
  assert.deepEqual(Object.keys(AI_DECISION_TESTS).sort(), Object.keys(PLAYER_AI_DECISIONS).sort());
  let expected = Object.values(AI_DECISION_TESTS).flat();
  assert.ok(expected.length && Object.values(AI_DECISION_TESTS).every(cases => cases.length));
  const extra = ['tests/ai-bond-blind.test.mjs', 'tests/talent-intelligence.test.mjs', 'tests/geographic-roads.test.mjs', 'tests/opening-formations.test.mjs'];
  const files = task.smoke ? ['tests/war-tempo-audit.test.mjs'] : [...new Set([...expected.map(c => c.file), ...extra])];
  if (task.smoke) expected = [];
  const passed = new Set(), failures = [], skipped = [], diagnostics = [];
  for await (const event of run({ files: files.map(file => join(task.source, file)), concurrency: 2, isolation: 'process' })) {
    if (event.type === 'test:stderr') diagnostics.push(String(event.data.message).slice(0, 2000));
    if (!['test:pass', 'test:fail'].includes(event.type)) continue;
    const d = event.data, file = d.file ? relative(task.source, d.file).replaceAll('\\', '/') : '', row = { file, name: d.name };
    if (d.skip || d.todo) skipped.push(row);
    else if (event.type === 'test:fail') failures.push({ ...row, error: String(d.details?.error?.stack || d.details?.error) });
    else passed.add(file + '\0' + d.name);
  }
  const missing = expected.filter(c => !passed.has(c.file + '\0' + c.name));
  return { status: failures.length || skipped.length || missing.length ? 'failed' : 'passed', kind: 'mechanisms',
    passed: passed.size, domains: task.smoke ? 0 : Object.keys(AI_DECISION_TESTS).length, smoke: !!task.smoke, failures, skipped, missing, diagnostics };
}

async function battle() {
  const { generateBattle } = await load('battle-generator.mjs');
  const { swapCustomBattle } = await load('custom-battle.mjs');
  const { lockDeployment, stepBattle, planBattleCouncilsAI, validateSave } = await load('engine.mjs');
  const { canOccupy } = await load('battlefield.mjs');
  const c = task.customCase || BATTLE_CASES.find(c => c.id === task.caseId); assert.ok(c);
  const own = ['cao', 'liao', 'chu', 'jia', 'dun', 'yu', 'jin', 'yuanxia'];
  const enemy = ['shao', 'yan', 'wen', 'he', 'ju', 'tian', 'gao', 'person-72'];
  const mixed = ['spear', 'cavalry', 'halberd', 'archer', 'spear', 'archer'];
  const types = c.profile === 'cavalry' ? ['cavalry'] : c.profile === 'ranged' ? ['archer'] : mixed;
  const count = c.profile === 'reserves' ? 8 : 6;
  const team = (ids, types) => ids.slice(0, count).map((id, i) => ({ id, type: types[i % types.length], troops: 3000, level: 10,
    ...(c.terrain === 'river' ? { equipment: { siege: null, ship: 'ship' } } : {}) }));
  const draft = c.draft ? { ...structuredClone(c.draft), seed: task.seed } : { mapId: c.mapId, terrain: c.terrain, battleKind: c.category === 'siege' ? 'siege' : 'field',
    seed: task.seed, limit: 480, shieldPercent: 0, gateHp: 18000, ownTeam: team(own, mixed), enemyTeam: team(enemy, types) };
  const outcomes = [];
  for (const swapped of [false, true]) {
    const s = generateBattle(swapped ? swapCustomBattle(draft) : draft), b = s.battle;
    planBattleCouncilsAI(b, [0, 1]); assert.equal(lockDeployment(b), null); validateSave(structuredClone(s));
    const streak = new Map(); let maximumStreak = 0, copy = null, replayed = false;
    const signature = u => JSON.stringify([u.x, u.y, u.hp, u.status, u.tacticCasts, u.healed, u.contribution, u.statuses]);
    while (!b.result) {
      const before = b.tick, units = b.sides.flatMap(side => side.units), previous = new Map(units.map(u => [u.id, signature(u)]));
      stepBattle(b, { aiSides: [0, 1] }); if (copy) stepBattle(copy.battle, { aiSides: [0, 1] });
      assert.ok(b.tick > before || b.result); assert.ok(b.tick <= b.maxTicks + 1);
      const live = units.filter(u => u.status === 'active' && u.hp > 0);
      assert.equal(new Set(live.map(u => `${u.x},${u.y}`)).size, live.length);
      for (const u of live) {
        assert.ok(canOccupy(b, u, u.x, u.y)); assert.ok(Number.isFinite(u.hp) && u.hp <= u.maxHp);
        const ticks = previous.get(u.id) === signature(u) ? (streak.get(u.id) || 0) + 1 : 0;
        streak.set(u.id, ticks); maximumStreak = Math.max(maximumStreak, ticks);
      }
      if (b.tick === 24 && !copy) { copy = validateSave(structuredClone(s)); replayed = true; }
    }
    if (copy) assert.deepEqual(copy.battle, b, 'Battle save continuation differs');
    validateSave(structuredClone(s));
    outcomes.push({ swapped, winner: b.result.winner, reason: b.result.reason, ticks: b.tick, replayed, maximumStreak,
      remaining: b.sides.map(side => sum(side.units.map(u => u.hp))) });
    if (b.result.reason === '久战收兵' || maximumStreak >= 48) await writeJSON(join(task.out, `incident-${swapped}.json`), { draft, outcomes: outcomes.at(-1), state: s });
  }
  return { status: 'passed', kind: 'battle', key: `battle:${c.id}:${task.seed}`, seed: task.seed, category: c.category,
    caseId: c.id, opponentProfile: c.profile, controller: 'both-current-AI', outcomes,
    metrics: { inactiveUnitTicks: Math.max(...outcomes.map(o => o.maximumStreak)),
      ...(c.category === 'field' ? { fieldTimeoutRate: outcomes.filter(o => o.reason === '久战收兵').length / outcomes.length } : {}) } };
}

async function campaign() {
  const { newCampaign, advanceCampaignDay, serializeCampaign, validateCampaign, activeBattles } = await load('strategic-campaign.mjs');
  const { pendingDomesticProposals } = await load('domestic.mjs');
  const { isAIControlled } = await load('player-faction.mjs');
  const { NATIONAL_SCENARIOS } = await load('national-scenarios.mjs');
  const spec = NATIONAL_SCENARIOS.find(s => s.id === task.scenario); assert.ok(spec);
  let s, acc;
  if (task.previous) {
    acc = await readJSON(join(task.previous, 'accumulator.json'));
    assert.equal(acc.scenario, task.scenario); assert.equal(acc.seed, task.seed); assert.equal(acc.sourceHash, task.sourceHash);
    s = validateCampaign(JSON.parse(await readFile(join(task.previous, 'campaign-save.json'), 'utf8')));
    assert.equal(s.campaign.day, acc.completedDay);
  } else {
    s = newCampaign(task.seed, task.scenario, 'cao', { allAI: true });
    assert.equal(s.campaign.day, 1);
    acc = { scenario: task.scenario, seed: task.seed, sourceHash: task.sourceHash, freshOrigin: true,
      startDay: 1, completedDay: 1, hunger: 0, exposure: 0, troopExposure: 0, checkpoints: 0,
      owners: Object.fromEntries(s.cities.map(c => [c.id, c.owner])), captures: [], plans: {}, battles: {}, joint: {}, dayMs: [] };
  }
  const end = task.throughTurn * 10 + 1;
  assert.ok(s.campaign.day <= end);
  function inspect() {
    assert.equal(s.campaign.allAI, true); assert.equal(s.campaign.domestic.incidents.enabled, true);
    assert.ok(spec.factions.every(f => isAIControlled(s, f))); assert.equal(pendingDomesticProposals(s).length, 0);
    const armies = s.armies.filter(a => !a.disbanded), cities = s.cities.filter(c => c.owner !== 'neutral');
    acc.exposure += cities.length + armies.length;
    acc.hunger += cities.filter(c => c.hunger > 0).length + armies.filter(a => a.hunger > 0).length;
    acc.troopExposure += sum([...cities, ...armies].flatMap(x => x.units.map(u => u.troops)));
    for (const c of s.cities) {
      for (const k of ['gold', 'grain', 'manpower']) assert.ok(Number.isSafeInteger(c[k]) && c[k] >= 0, 'Invalid inventory ' + c.id + '/' + k);
      if (acc.owners[c.id] !== c.owner) { acc.captures.push({ day: s.campaign.day - 1, city: c.id, from: acc.owners[c.id], to: c.owner }); acc.owners[c.id] = c.owner; }
    }
    for (const a of armies) assert.ok(Number.isSafeInteger(a.supply) && a.supply >= 0);
    for (const holder of [...s.cities, ...armies]) for (const u of holder.units) assert.ok(Number.isSafeInteger(u.troops) && u.troops >= 0 && Number.isSafeInteger(u.wounded) && u.wounded >= 0);
    for (const p of s.campaign.ai.plans) acc.plans[p.id] = { phase: p.phase, createdDay: p.createdDay, deadline: p.deadline, target: p.target, faction: p.faction };
    for (const record of [...s.campaign.battles, ...s.campaign.archive]) {
      const prior = acc.battles[record.id] || {};
      if (Number.isFinite(record.startedDay)) acc.battles[record.id] = { ...prior, id: record.id, startedDay: record.startedDay,
        ...(record.endedDay != null ? { endedDay: record.endedDay } : {}), banditCampId: record.banditCampId ?? prior.banditCampId ?? null };
    }
    for (const b of activeBattles(s)) {
      assert.equal(b.awaiting, false); assert.equal(b.control, 'auto'); assert.equal(b.battle.deploymentLocked, true);
      if (!b.banditCampId) for (const row of observedJointParticipation(b)) acc.joint[row.battleId + ':' + row.side] = { ...row, day: s.campaign.day - 1 };
    }
  }
  try {
    while (s.campaign.day < end && !s.finished) {
      const before = s.campaign.day, copy = before % 30 === 0 ? validateCampaign(JSON.parse(serializeCampaign(s))) : null;
      const start = performance.now(); advanceCampaignDay(s); acc.dayMs.push(performance.now() - start);
      assert.ok(s.campaign.day > before || s.finished, 'All-AI daily execution stopped');
      if (copy) { advanceCampaignDay(copy); assert.equal(serializeCampaign(copy), serializeCampaign(s)); acc.checkpoints++; }
      inspect();
    }
    const saved = serializeCampaign(s); assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))), saved);
    acc.completedDay = s.campaign.day;
    if (s.finished) { assert.equal(s.finished, 'victory'); assert.ok(s.cities.every(c => c.owner !== 'neutral' && c.owner === s.cities[0].owner)); }
    await atomic(join(task.out, 'campaign-save.json'), saved); await writeJSON(join(task.out, 'accumulator.json'), acc);
    const battleStarts = Object.values(acc.battles), tempo = warTempoReport({ metrics: { startDay: 1, completedDay: s.campaign.day },
      battleStarts, battles: battleStarts.filter(b => b.endedDay != null), departures: [], captures: acc.captures,
      hunger: [], planTrace: [], jointParticipation: Object.values(acc.joint) });
    const plans = Object.values(acc.plans), completed = plans.filter(p => p.phase === 'complete').length;
    const mature = plans.filter(p => ['complete', 'cancelled'].includes(p.phase) || p.deadline < s.campaign.day);
    const retained = new Set(acc.captures.filter(c => c.from !== 'neutral' && c.to !== 'neutral' && c.to === acc.owners[c.city] && s.campaign.day - c.day >= 10).map(c => c.city));
    return { status: 'passed', kind: 'campaign', key: `campaign:${task.scenario}:${task.seed}`, seed: task.seed,
      scenario: task.scenario, turns: (s.campaign.day - 1) / 10, freshOrigin: true, unified: !!s.finished,
      checkpoints: acc.checkpoints, plans: { total: plans.length, complete: completed, resolved: mature.length },
      troopExposure: acc.troopExposure, dayP95Ms: quantile(acc.dayMs, 0.95), phases: tempo.phases,
      actualBattles: battleStarts.filter(b => !b.banditCampId && b.endedDay != null).length,
      actualJointBattles: Object.keys(acc.joint).length,
      metrics: { middleQuietTurns: tempo.phases[1].observedTurns === 40 ? tempo.phases[1].longestQuietTurns : null,
        hungerExposure: acc.exposure ? acc.hunger / acc.exposure : null,
        planCompletion: mature.length ? completed / mature.length : null, hostileCitiesRetained: retained.size } };
  } catch (error) { await atomic(join(task.out, 'failed-save.json'), serializeCampaign(s)); throw error; }
}

try {
  assert.ok(['mechanisms', 'battle', 'campaign'].includes(task.kind));
  const result = await ({ mechanisms, battle, campaign }[task.kind])();
  await writeJSON(join(task.out, 'result.json'), result);
  if (result.status !== 'passed') process.exitCode = 1;
} catch (error) {
  await writeJSON(join(task.out, 'result.json'), { status: 'failed', kind: task.kind, error: error.stack });
  process.exitCode = 1;
}
