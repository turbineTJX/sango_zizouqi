import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { RULES, BATTLE_CASES, editable } from '../scripts/ai-validation/rules.mjs';
import { BATTLE_MAPS } from '../data/design/battle-maps.mjs';
import { signTest, decide, assessPlayability } from '../scripts/ai-validation/judge.mjs';
import { fingerprint, snapshot, verifySnapshot, assertPolicyChanges, promoteFiles, recoverPromotion, readJSON } from '../scripts/ai-validation/storage.mjs';
import { buildTasks, parseArguments, runWorker } from '../scripts/ai-validation/cli.mjs';

function comparison() {
  const baseline = Array.from({ length: 8 }, (_, seed) => ({ key: 'case-' + seed, seed, kind: 'campaign',
    troopExposure: 10000, dayP95Ms: 100, metrics: { middleQuietTurns: 20, hungerExposure: 0.01, planCompletion: 0.5, hostileCitiesRetained: 2 } }));
  const candidate = structuredClone(baseline); for (const row of candidate) row.metrics.middleQuietTurns = 18;
  return { metric: 'middleQuietTurns', stage: 'validation', baseline, candidate, hardChecks: [{ status: 'passed' }],
    complete: true, sourceStable: true, changedFiles: ['strategic-ai.mjs'], review: { sourceHash: 'frozen', constraintsPreserved: true, explanation: 'Public rules unchanged.' } };
}

test('independent paired evidence can improve a baseline without claiming playability or unification', () => {
  const r = decide(comparison()); assert.equal(r.promotable, true); assert.equal(r.evidence.p, 1 / 256);
  assert.equal(r.playability, 'not-established'); assert.equal(r.unification, 'not-observed');
});

test('development seeds, unfinished tasks, unchanged policies and missing hard checks cannot promote', () => {
  for (const delta of [{ stage: 'smoke' }, { complete: false }, { changedFiles: [] }, { hardChecks: [] }, { review: null }])
    assert.equal(decide({ ...comparison(), ...delta }).promotable, false);
});

test('better average cannot hide a bad local regression, hunger increase or demobilization', () => {
  for (const mutate of [c => c.candidate[0].metrics.hungerExposure += 0.02, c => c.candidate[0].metrics.middleQuietTurns = 22,
    c => c.candidate[0].troopExposure = 5000, c => c.candidate[0].dayP95Ms = 9000]) {
    const c = comparison(); mutate(c); assert.equal(decide(c).status, 'rejected');
  }
});

test('shared seed replications, missing outcomes and unpaired cases cannot invent independent evidence', () => {
  const c = comparison(); c.baseline.forEach(r => r.seed = 1); c.candidate.forEach(r => r.seed = 1);
  assert.equal(decide(c).promotable, false);
  const missing = comparison(); missing.candidate[0].metrics.middleQuietTurns = null; assert.equal(decide(missing).promotable, false);
  const unpaired = comparison(); unpaired.candidate.pop(); assert.equal(decide(unpaired).promotable, false);
  const duplicates = comparison(); duplicates.candidate[1].key = duplicates.candidate[0].key; assert.throws(() => decide(duplicates), /Duplicate/);
});

test('source drift and failed invariants reject a statistically better candidate', () => {
  assert.equal(decide({ ...comparison(), sourceStable: false }).status, 'rejected');
  assert.equal(decide({ ...comparison(), hardChecks: [{ status: 'failed' }] }).status, 'rejected');
  assert.equal(signTest([0, 0]).p, 1); assert.equal(signTest([1, -1, 1, -1]).p, 0.6875);
});

test('meeting the quiet-gap target cannot be gamed by earning further credit for more wars', () => {
  const c = comparison(); for (const row of c.baseline) row.metrics.middleQuietTurns = 11;
  for (const row of c.candidate) row.metrics.middleQuietTurns = 5;
  assert.equal(decide(c).promotable, false);
});

test('battle adapter fixtures agree with the actual fixed map terrain', () => {
  for (const c of BATTLE_CASES) assert.equal(c.terrain, BATTLE_MAPS[c.mapId].terrain, c.id);
});

test('strategic acceptance is distinct from battle acceptance, integration, human playability and unification', () => {
  const rows = RULES.scenarios.flatMap(scenario => Array.from({ length: 8 }, (_, seed) => ({ kind: 'campaign', key: scenario + seed, scenario, seed,
    turns: 100, freshOrigin: true, actualBattles: 2, metrics: { middleQuietTurns: 10 } })));
  rows.push({ kind: 'battle', metrics: { fieldTimeoutRate: 1 } });
  const partial = assessPlayability(rows, { hardPassed: true, challengeEvidence: { passed: true } });
  assert.equal(partial.domainStatus, 'passed'); assert.equal(partial.status, 'insufficient');
  assert.equal(partial.integration, 'observed'); assert.equal(partial.unification, 'not-observed');
  const full = assessPlayability(rows, { hardPassed: true, challengeEvidence: { passed: true }, playerEvidence: { passed: true }, battleEvidence: { passed: true } });
  assert.equal(full.status, 'passed');
  rows[0].turns = 6; assert.equal(assessPlayability(rows, { hardPassed: true }).status, 'insufficient');
});

test('strategic candidates cannot alter tactical AI, common rules, tests or the judge', () => {
  for (const path of ['engine.mjs', 'battle-ai.mjs', 'battle-council.mjs', 'data/design/bonds.mjs', 'tests/strategic-ai.test.mjs', 'scripts/ai-validation/rules.mjs']) assert.equal(editable(path), false);
  assert.equal(editable('ai-policy/experimental/selector.mjs'), true);
  assert.equal(editable('ai-policy/../../engine.mjs'), false);
  assert.throws(() => assertPolicyChanges({ hashes: { 'engine.mjs': 'a' } }, { hashes: { 'engine.mjs': 'b' } }), /Protected/);
});

test('registered tasks cover both frozen versions with separate seeds and checkpoint continuity', () => {
  const proposal = { baseline: { root: 'baseline', hash: 'a' }, developmentSeeds: [417], validationSeeds: [901, 902], corpus: [] };
  const tasks = buildTasks({ directory: 'out', proposal, candidate: { root: 'candidate', hash: 'b' }, stage: 'validation' });
  assert.ok(tasks.filter(t => t.kind !== 'mechanisms').every(t => [901, 902].includes(t.seed)));
  const row = tasks.find(t => t.kind === 'campaign' && t.throughTurn === 20);
  assert.ok(row.previous.endsWith('-10')); assert.equal(tasks.filter(t => t.kind === 'campaign' && t.throughTurn === 100).length, 8);
  assert.deepEqual(parseArguments(['seal', '--review=a=b']), { command: 'seal', args: { review: 'a=b' } });
  assert.throws(() => parseArguments(['run', '--id=x', '--id=y']), /Duplicate/);
});

async function fixture() {
  const base = await mkdtemp(join(tmpdir(), 'sango-validation-')), workspace = join(base, 'workspace'); await mkdir(workspace);
  await writeFile(join(workspace, 'strategic-ai.mjs'), 'existing uncommitted strategy\n');
  await writeFile(join(workspace, 'strategic-policy.mjs'), 'existing policy\n');
  await writeFile(join(workspace, 'engine.mjs'), 'common rules\n');
  const baseline = await snapshot(workspace, join(base, 'baseline'));
  const edit = await snapshot(workspace, join(base, 'edit')); await writeFile(join(edit.root, 'strategic-ai.mjs'), 'improved strategy\n');
  const candidate = await snapshot(edit.root, join(base, 'candidate'));
  return { base, workspace, baseline, candidate };
}

test('source snapshots include additions and detect edits while excluding local experiment output', async () => {
  const f = await fixture(); await mkdir(join(f.workspace, '.local')); await writeFile(join(f.workspace, '.local', 'private.json'), '{}');
  assert.equal((await fingerprint(f.workspace)).hash, f.baseline.hash);
  await writeFile(join(f.baseline.root, 'engine.mjs'), 'changed'); await assert.rejects(verifySnapshot(f.baseline), /Frozen/);
});

test('automatic adoption preserves the actual dirty baseline and only replaces policy changes', async () => {
  const f = await fixture(), journalPath = join(f.base, 'adoption.json');
  const result = await promoteFiles({ ...f, journalPath }); assert.equal(result.status, 'adopted');
  assert.equal(await readFile(join(f.workspace, 'engine.mjs'), 'utf8'), 'common rules\n');
  assert.equal(await readFile(join(f.baseline.root, 'strategic-ai.mjs'), 'utf8'), 'existing uncommitted strategy\n');
  assert.equal((await fingerprint(f.workspace)).hash, f.candidate.hash);
});

test('parallel edits prevent adoption instead of overwriting the other work', async () => {
  const f = await fixture(); await writeFile(join(f.workspace, 'engine.mjs'), 'parallel work');
  await assert.rejects(promoteFiles({ ...f, journalPath: join(f.base, 'adoption.json') }), /Workspace has changed/);
  assert.equal(await readFile(join(f.workspace, 'engine.mjs'), 'utf8'), 'parallel work');
});

test('interrupted multi-file adoption rolls back without losing the baseline', async () => {
  const f = await fixture(); await writeFile(join(f.candidate.root, 'strategic-policy.mjs'), 'new policy');
  f.candidate = { root: f.candidate.root, ...await fingerprint(f.candidate.root) };
  const journalPath = join(f.base, 'adoption.json');
  await assert.rejects(promoteFiles({ ...f, journalPath, beforeWrite: path => { if (path === 'strategic-policy.mjs') throw Error('simulated interrupted write'); } }), /interrupted/);
  assert.equal((await fingerprint(f.workspace)).hash, f.baseline.hash);
  assert.equal((await readJSON(journalPath)).status, 'rolled-back');
  assert.equal((await recoverPromotion(journalPath)).status, 'rolled-back');
});

test('budget expiration terminates an owned worker and is never a passing experiment', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sango-budget-')), worker = join(dir, 'worker.mjs');
  await writeFile(worker, 'setInterval(() => {}, 1000);');
  const result = await runWorker({ worker, taskFile: join(dir, 'unused.json'), cwd: dir, timeoutMs: 200, logPath: join(dir, 'run.log') });
  assert.equal(result.status, 'budget-exhausted'); assert.ok(result.elapsedMs < 10000);
});
