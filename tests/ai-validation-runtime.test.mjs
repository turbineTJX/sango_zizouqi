import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { snapshot, readJSON, writeJSON, verifySnapshot } from '../scripts/ai-validation/storage.mjs';
import { runWorker } from '../scripts/ai-validation/cli.mjs';
import { BATTLE_CASES } from '../scripts/ai-validation/rules.mjs';

let directory, source;
before(async () => {
  await mkdir('.local', { recursive: true });
  directory = await mkdtemp(resolve('.local/ai-validation-runtime-'));
  source = await snapshot(process.cwd(), join(directory, 'source'));
});

async function run(id, body) {
  const out = join(directory, id); await mkdir(out);
  const task = { source: source.root, sourceHash: source.hash, out, seed: 643, ...body }, taskFile = join(out, 'task.json');
  await writeJSON(taskFile, task);
  const result = await runWorker({ worker: join(source.root, 'scripts/ai-validation/worker.mjs'), taskFile,
    cwd: source.root, timeoutMs: 180000, logPath: join(out, 'run.log') });
  const evidence = await readJSON(join(out, 'result.json'));
  assert.equal(result.status, 'passed', JSON.stringify(evidence)); assert.equal(evidence.status, 'passed');
  return { out, evidence };
}

for (const spec of BATTLE_CASES) test('real validation worker: ' + spec.id + ' uses legal shared deployment and two-sided continuation', async () => {
  const { evidence } = await run(spec.id, { kind: 'battle', caseId: spec.id });
  assert.equal(evidence.category, spec.category); assert.equal(evidence.outcomes.length, 2);
  assert.ok(evidence.outcomes.every(row => row.replayed && row.ticks > 24));
});

test('registered synthetic challenge executes the supplied legal draft and retains its identity', async () => {
  const { defaultCustomBattle } = await import(pathToFileURL(join(source.root, 'custom-battle.mjs')));
  const customCase = { id: 'challenge-legal-draft', category: 'field', reason: 'Runtime adapter check', draft: defaultCustomBattle() };
  const { evidence } = await run('challenge', { kind: 'battle', caseId: customCase.id, customCase });
  assert.equal(evidence.caseId, customCase.id); assert.equal(evidence.outcomes.length, 2);
});

test('natural checkpoint continues across worker processes without changing seed, origin or source', async () => {
  const first = await run('natural-first', { kind: 'campaign', scenario: 'guandu-200', throughTurn: 1 });
  const second = await run('natural-second', { kind: 'campaign', scenario: 'guandu-200', throughTurn: 4, previous: first.out });
  assert.equal(first.evidence.turns, 1); assert.equal(second.evidence.turns, 4);
  assert.equal(second.evidence.freshOrigin, true); assert.ok(second.evidence.checkpoints > 0);
  assert.equal(second.evidence.metrics.middleQuietTurns, null);
  assert.ok(second.evidence.troopExposure > first.evidence.troopExposure);
  const acc = await readJSON(join(second.out, 'accumulator.json')); assert.equal(acc.completedDay, 41); assert.equal(acc.sourceHash, source.hash);
  await verifySnapshot(source);
});

test('the real worker fails closed when a checkpoint is attributed to another source', async () => {
  const previous = join(directory, 'natural-first'), out = join(directory, 'mismatched-source'); await mkdir(out);
  const taskFile = join(out, 'task.json');
  await writeJSON(taskFile, { source: source.root, sourceHash: 'wrong-source', out, kind: 'campaign', seed: 643,
    scenario: 'guandu-200', throughTurn: 2, previous });
  const result = await runWorker({ worker: join(source.root, 'scripts/ai-validation/worker.mjs'), taskFile, cwd: source.root, timeoutMs: 30000, logPath: join(out, 'run.log') });
  assert.equal(result.status, 'failed'); assert.equal((await readJSON(join(out, 'result.json'))).status, 'failed');
});
