import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, unlink, readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { RULES, BATTLE_CASES } from './rules.mjs';
import { decide, assessPlayability } from './judge.mjs';
import { registerRepair, reportRepair, executeRepair } from './repair.mjs';
import { readJSON, writeJSON, exists, sha, inside, snapshot, fingerprint, verifySnapshot, assertPolicyChanges, promoteFiles, recoverPromotion } from './storage.mjs';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const identifier = id => { assert.match(id || '', /^[a-z][a-z0-9-]{0,63}$/); return id; };
const sessionPath = args => { assert.ok(args.session, 'Supply --session=<directory>'); return resolve(args.session); };
const candidatePath = (session, id) => join(session, 'candidates', identifier(id));
const seeds = () => {
  const values = new Set();
  while (values.size < RULES.independentSeeds) { const n = randomBytes(4).readUInt32LE(); if (!RULES.developmentSeeds.includes(n)) values.add(n); }
  return [...values];
};

export function parseArguments(argv) {
  const [command = 'help', ...rest] = argv, args = {};
  for (const arg of rest) {
    const match = arg.match(/^--([a-z-]+)=(.*)$/s); assert.ok(match, 'Use --name=value arguments');
    assert.ok(!Object.hasOwn(args, match[1]), 'Duplicate argument: ' + match[1]); args[match[1]] = match[2];
  }
  return { command, args };
}

async function loadSession(path) {
  const s = await readJSON(join(path, 'session.json'));
  assert.equal(s.rulesHash, sha(JSON.stringify(RULES)), 'Validation contract changed; start a new session');
  await verifySnapshot(s.judge);
  return s;
}

async function withLock(path, action) {
  const lock = join(path, 'active.lock'); await mkdir(path, { recursive: true });
  await writeFile(lock, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { flag: 'wx' });
  try { return await action(); } finally { await unlink(lock); }
}

export async function initialize({ root = PROJECT, out }) {
  const path = out ? resolve(out) : join(root, '.local/ai-iterations', new Date().toISOString().replaceAll(/[:.]/g, '-'));
  inside(join(root, '.local'), path);
  assert.ok(!await exists(path), 'Use a fresh session directory');
  await mkdir(path, { recursive: true });
  const baseline = await snapshot(root, join(path, 'baseline'));
  const startedAt = Date.now(), state = { format: 'sango-ai-iteration', version: 1, workspace: resolve(root),
    rulesHash: sha(JSON.stringify(RULES)), rules: RULES, judge: baseline, champion: baseline,
    round: { number: 1, startedAt, deadline: startedAt + RULES.budgetHours * 3600000, candidates: 0, rejections: 0 },
    candidates: [], corpus: [], adoptions: [] };
  await writeJSON(join(path, 'session.json'), state);
  return { session: path, baselineHash: baseline.hash, budgetHours: RULES.budgetHours };
}

async function propose(path, args) {
  const s = await loadSession(path), id = identifier(args.id);
  assert.ok(Date.now() < s.round.deadline, 'Round budget exhausted; explicitly start a new round');
  assert.ok(s.round.candidates < RULES.maximumCandidatesPerRound, 'Candidate budget exhausted');
  assert.ok(s.round.rejections < RULES.consecutiveRejectionsBeforeStop, 'Repeated non-improvement: review the failure evidence before a new round');
  assert.ok(RULES.objectiveMetrics.includes(args.metric), 'Choose a strategic metric: ' + RULES.objectiveMetrics.join(', '));
  assert.ok(args.hypothesis?.trim(), 'Register a falsifiable hypothesis before editing');
  const tier = args.tier || 'strategy'; assert.ok(['strategy', 'repair'].includes(tier));
  const repair = tier === 'repair' ? (s.repairs || []).find(r => r.id === args.repair) : null;
  assert.ok(tier !== 'repair' || repair, 'Register the repair case and independent windows before proposing');
  assert.equal((await fingerprint(s.workspace)).hash, s.champion.hash, 'Workspace differs from the champion; create a fresh baseline session');
  const directory = candidatePath(path, id); assert.ok(!await exists(directory), 'Candidate IDs are immutable');
  const editable = await snapshot(s.champion.root, join(directory, 'edit'));
  const proposal = { id, metric: args.metric, hypothesis: args.hypothesis, createdAt: new Date().toISOString(),
    tier, ...(repair ? { repair: structuredClone(repair) } : {}),
    round: s.round.number, baseline: s.champion, editRoot: editable.root, rulesHash: s.rulesHash,
    validationSeeds: seeds(), developmentSeeds: RULES.developmentSeeds, corpus: structuredClone(s.corpus) };
  await writeJSON(join(directory, 'proposal.json'), proposal);
  await writeJSON(join(directory, 'proposal-seal.json'), { hash: sha(JSON.stringify(proposal)) });
  s.candidates.push(id); s.round.candidates++; await writeJSON(join(path, 'session.json'), s);
  return { candidate: id, editRoot: editable.root, objective: args.metric, next: 'Edit policy code in editRoot, review the diff, then seal.' };
}

async function readProposal(path, id) {
  const directory = candidatePath(path, id), proposal = await readJSON(join(directory, 'proposal.json'));
  assert.equal((await readJSON(join(directory, 'proposal-seal.json'))).hash, sha(JSON.stringify(proposal)), 'Preregistered experiment changed');
  return proposal;
}

async function seal(path, args) {
  const s = await loadSession(path), directory = candidatePath(path, args.id), p = await readProposal(path, args.id);
  assert.ok(s.candidates.includes(p.id)); await verifySnapshot(p.baseline);
  assert.equal(p.baseline.hash, s.champion.hash, 'Candidate was made against an obsolete champion');
  const current = await fingerprint(p.editRoot), changedFiles = assertPolicyChanges(p.baseline, current);
  assert.ok(args.review?.trim(), 'Supply --review=<source-review explanation of how the fixed boundaries are preserved>');
  const frozen = await snapshot(p.editRoot, join(directory, 'frozen'));
  const candidate = { ...frozen, changedFiles, review: { sourceHash: frozen.hash, constraintsPreserved: true,
    explanation: args.review, scope: 'Coding-agent source review; independent behavioral tests remain mandatory' } };
  await writeJSON(join(directory, 'candidate.json'), candidate);
  return { candidate: p.id, sourceHash: candidate.hash, changedFiles };
}

export function buildTasks({ directory, proposal, candidate, stage }) {
  assert.ok(['smoke', 'validation'].includes(stage));
  const selectedSeeds = stage === 'smoke' ? proposal.developmentSeeds.slice(0, 1) : proposal.validationSeeds;
  const cases = stage === 'smoke' ? BATTLE_CASES.slice(0, 1) : [...BATTLE_CASES, ...proposal.corpus];
  const tasks = [], roots = { baseline: proposal.baseline, candidate };
  const append = (id, side, body) => {
    const out = join(directory, stage, id);
    tasks.push({ id, side, source: roots[side].root, sourceHash: roots[side].hash, out, ...body });
  };
  append('mechanisms', 'candidate', { kind: 'mechanisms', smoke: stage === 'smoke' });
  for (const seed of selectedSeeds) for (const c of cases) for (const side of ['baseline', 'candidate'])
    append(`battle-${c.id}-${seed}-${side}`, side, { kind: 'battle', seed, caseId: c.id, ...(c.draft ? { customCase: c } : {}) });
  const through = stage === 'smoke' ? 1 : RULES.validationTurns, chunk = stage === 'smoke' ? 1 : RULES.chunkTurns;
  for (let turn = chunk; turn <= through; turn += chunk) {
    for (const scenario of (stage === 'smoke' ? RULES.scenarios.slice(0, 1) : RULES.scenarios)) for (const seed of selectedSeeds) for (const side of ['baseline', 'candidate']) {
      const prefix = `campaign-${scenario}-${seed}-${side}`;
      append(`${prefix}-${turn}`, side, { kind: 'campaign', seed, scenario, throughTurn: turn,
        previous: turn > chunk ? join(directory, stage, `${prefix}-${turn - chunk}`) : null });
    }
  }
  return tasks;
}

async function terminateTree(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') await new Promise(resolve => {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    killer.once('error', resolve); killer.once('close', resolve);
  });
  else child.kill('SIGKILL');
}

export async function runWorker({ worker, taskFile, cwd, timeoutMs, logPath }) {
  assert.ok(timeoutMs > 0);
  const { createWriteStream } = await import('node:fs');
  const log = createWriteStream(logPath, { flags: 'a' });
  const startedAt = Date.now(); let timedOut = false;
  // A worker owns its test runner even when this API is exercised by node --test.
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const child = spawn(process.execPath, [worker, taskFile], { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
  const timer = setTimeout(() => { timedOut = true; void terminateTree(child); }, timeoutMs);
  try {
    const exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
    return { status: timedOut ? 'budget-exhausted' : exitCode === 0 ? 'passed' : 'failed', exitCode, elapsedMs: Date.now() - startedAt };
  } finally { clearTimeout(timer); await new Promise(resolve => log.end(resolve)); }
}

async function receipt(task) {
  const file = join(task.out, 'receipt.json'); if (!await exists(file)) return null;
  const r = await readJSON(file);
  assert.equal(r.taskHash, sha(JSON.stringify(task)), 'Task registration changed');
  for (const [file, hash] of Object.entries(r.evidenceHashes || {})) assert.equal(sha(await readFile(inside(task.out, join(task.out, file)))), hash, 'Evidence changed after observation: ' + file);
  if (r.status === 'passed') assert.ok(r.evidenceHashes?.['result.json'], 'Missing sealed evidence');
  return r;
}

async function summarize(path, id, stage) {
  const s = await loadSession(path), directory = candidatePath(path, id), p = await readProposal(path, id), c = await readJSON(join(directory, 'candidate.json'));
  await verifySnapshot(p.baseline); await verifySnapshot(c);
  assert.equal(c.review.sourceHash, c.hash);
  const tasks = buildTasks({ directory, proposal: p, candidate: c, stage });
  const rows = { baseline: new Map(), candidate: new Map() }, hardChecks = [], jobs = [];
  let complete = true;
  for (const task of tasks) {
    const r = await receipt(task); jobs.push({ id: task.id, kind: task.kind, side: task.side, status: r?.status || 'pending', directory: task.out });
    if (r?.status !== 'passed') { complete = false; if (r?.status === 'failed') hardChecks.push({ id: task.id, status: 'failed' }); continue; }
    const result = await readJSON(join(task.out, 'result.json'));
    if (task.kind === 'mechanisms') hardChecks.push({ id: task.id, status: result.status });
    else rows[task.side].set(result.key, result);
  }
  const decision = decide({ metric: p.metric, stage, baseline: [...rows.baseline.values()], candidate: [...rows.candidate.values()],
    hardChecks, complete, sourceStable: true, changedFiles: assertPolicyChanges(p.baseline, c), review: c.review });
  const attestations = {};
  for (const kind of ['challenge', 'battle', 'player']) {
    const file = join(directory, 'attestations', kind + '.json');
    if (!await exists(file)) continue;
    const record = await readJSON(file); assert.equal(record.sourceHash, c.hash, 'Attestation belongs to another combination');
    for (const evidence of record.evidence) assert.equal(sha(await readFile(evidence.path)), evidence.sha256, 'Attestation evidence changed');
    attestations[kind] = record;
  }
  decision.playability = assessPlayability([...rows.candidate.values()], { hardPassed: complete && hardChecks.every(c => c.status === 'passed'),
    challengeEvidence: attestations.challenge, battleEvidence: attestations.battle, playerEvidence: attestations.player });
  decision.unification = decision.playability.unification;
  const report = { sourceHash: c.hash, baselineHash: p.baseline.hash, rulesHash: s.rulesHash, hypothesis: p.hypothesis, metric: p.metric,
    stage, complete, decision, jobs, attestations, baseline: [...rows.baseline.values()], candidate: [...rows.candidate.values()],
    limitations: ['Fixed opponent rosters and two-sided AI are not a mixed-version policy league.',
      'Source seals detect drift; this is not an OS sandbox against intentionally hostile code.',
      'Player experience and reviewed exploit resistance are not inferred from self-play.'] };
  await writeJSON(join(directory, stage, 'report.json'), report);
  const lines = ['# AI 迭代验证结果', '', `候选：${id}`, `目标：${p.hypothesis}`, '',
    `- 相对改进：${decision.status}`, `- 战略域验收：${decision.playability.domainStatus}`, `- 实际集成：${decision.playability.integration}`,
    `- 整体可玩验收：${decision.playability.status}`, `- 自然统一：${decision.unification}`,
    `- 已完成任务：${jobs.filter(j => j.status === 'passed').length}/${jobs.length}`, `- 候选指纹：${c.hash}`,
    '', '判定理由：' + (decision.reasons.join('；') || '独立配对验证达到本轮固定晋级条件。'),
    '', '尚缺证据：' + decision.playability.missing.join('；'), '',
    '当前对手为固定合法阵容与双方现有 AI；没有将其称为不同版本策略同场对战。哈希封存用于核对证据，不是操作系统权限隔离。', ''];
  await writeFile(join(directory, stage, 'report.md'), lines.join('\n'));
  await writeJSON(join(directory, stage, 'failures.json'), { sourceHash: c.hash,
    jobs: jobs.filter(j => j.status === 'failed'), regressions: decision.findings, playability: decision.playability });
  return report;
}

async function adopt(path, id) {
  const s = await loadSession(path), directory = candidatePath(path, id), p = await readProposal(path, id), c = await readJSON(join(directory, 'candidate.json'));
  const journalPath = join(directory, 'adoption.json');
  if (await exists(journalPath)) {
    const old = await readJSON(journalPath);
    if (old.status === 'adopted') {
      assert.equal((await fingerprint(s.workspace)).hash, c.hash, 'Adopted workspace has changed');
      s.champion = { root: c.root, hashes: c.hashes, hash: c.hash };
      if (!s.adoptions.some(a => a.id === id)) s.adoptions.push({ id, hash: c.hash, at: old.completedAt });
      await writeJSON(join(path, 'session.json'), s); return { status: 'adopted', id, alreadyApplied: true };
    }
    assert.equal(old.status, 'rolled-back', 'Recover the interrupted adoption first');
    await writeJSON(join(directory, 'adoption-attempts', Date.now() + '.json'), old); await unlink(journalPath);
  }
  const report = p.tier === 'repair' ? await reportRepair(path, id, { loadSession, readProposal }) : await summarize(path, id, 'validation');
  assert.ok(report.decision.promotable, 'Candidate has not earned promotion');
  assert.equal(s.champion.hash, p.baseline.hash, 'Champion changed since this proposal');
  if (p.tier !== 'repair') assert.equal(report.decision.playability.integration, 'observed', 'Real strategy/battle integration evidence is still missing');
  const journal = await promoteFiles({ workspace: s.workspace, baseline: p.baseline, candidate: c, journalPath });
  s.champion = { root: c.root, hashes: c.hashes, hash: c.hash };
  s.adoptions.push({ id, hash: c.hash, at: journal.completedAt, tier: report.decision.tier || 'strategy' }); s.round.rejections = 0;
  await writeJSON(join(path, 'session.json'), s);
  return { status: 'adopted', id, sourceHash: c.hash, changedFiles: c.changedFiles, pushed: false, published: false };
}

async function execute(path, args) {
  const s = await loadSession(path), id = identifier(args.id), stage = args.stage || 'smoke';
  const directory = candidatePath(path, id), p = await readProposal(path, id), c = await readJSON(join(directory, 'candidate.json'));
  assert.equal(p.baseline.hash, s.champion.hash, 'Candidate baseline is no longer current');
  await verifySnapshot(p.baseline); await verifySnapshot(c); assertPolicyChanges(p.baseline, c);
  const tasks = buildTasks({ directory, proposal: p, candidate: c, stage });
  const requestedSeconds = args.seconds === undefined ? Infinity : Number(args.seconds);
  assert.ok(requestedSeconds > 0 && (Number.isFinite(requestedSeconds) || requestedSeconds === Infinity));
  const deadline = Math.min(s.round.deadline, Date.now() + requestedSeconds * 1000);
  for (const task of tasks) {
    const old = await receipt(task);
    if (old?.status === 'passed') continue;
    if (old?.status === 'failed') break;
    if (Date.now() >= deadline) break;
    // Interrupted attempts are retained before retrying the same registered job.
    if (old) {
      const attempt = join(task.out, 'attempts', Date.now().toString()); await mkdir(attempt, { recursive: true });
      for (const file of ['receipt.json', 'result.json', 'run.log']) if (await exists(join(task.out, file))) await writeFile(join(attempt, file), await readFile(join(task.out, file)));
    }
    await mkdir(task.out, { recursive: true }); const taskFile = join(task.out, 'task.json'); await writeJSON(taskFile, task);
    await verifySnapshot(s.judge); await verifySnapshot(task.side === 'baseline' ? p.baseline : c);
    console.log(JSON.stringify({ event: 'start', job: task.id, secondsRemaining: Math.floor((deadline - Date.now()) / 1000) }));
    const outcome = await runWorker({ worker: join(s.judge.root, 'scripts/ai-validation/worker.mjs'), taskFile, cwd: s.judge.root,
      timeoutMs: Math.max(1, deadline - Date.now()), logPath: join(task.out, 'run.log') });
    await verifySnapshot(s.judge); await verifySnapshot(task.side === 'baseline' ? p.baseline : c);
    const evidenceHashes = {};
    for (const file of await readdir(task.out)) if (file.endsWith('.json') && !['task.json', 'receipt.json'].includes(file)) evidenceHashes[file] = sha(await readFile(join(task.out, file)));
    assert.ok(outcome.status !== 'passed' || evidenceHashes['result.json'], 'Worker exited without evidence');
    await writeJSON(join(task.out, 'receipt.json'), { ...outcome, taskHash: sha(JSON.stringify(task)), evidenceHashes,
      sourceHash: task.sourceHash, judgeHash: s.judge.hash, finishedAt: new Date().toISOString() });
    console.log(JSON.stringify({ event: 'finish', job: task.id, status: outcome.status }));
    if (outcome.status !== 'passed') break;
  }
  const report = await summarize(path, id, stage);
  if (report.decision.promotable) {
    try { report.adoption = await adopt(path, id); }
    catch (error) { report.adoption = { status: 'pending', reason: error.message }; }
  } else if (stage === 'validation' && (report.complete || report.decision.status === 'rejected') && !await exists(join(directory, 'non-improvement-counted.json'))) {
    const current = await loadSession(path); current.round.rejections++;
    await writeJSON(join(path, 'session.json'), current); await writeJSON(join(directory, 'non-improvement-counted.json'), { status: report.decision.status });
  }
  return { report: join(directory, stage, 'report.md'), status: report.decision.status, complete: report.complete,
    playability: report.decision.playability.status, adoption: report.adoption || null, budgetExpired: Date.now() >= deadline };
}

export async function main(argv) {
  const { command, args } = parseArguments(argv);
  if (command === 'help') return { commands: [
    'init [--out=<fresh .local directory>]',
    'register-repair --session=<directory> --file=<repair manifest JSON>',
    'propose --session=<directory> --id=<name> --metric=<registered metric> --hypothesis=<explanation> [--tier=repair --repair=<registered repair id>]',
    'seal --session=<directory> --id=<name> --review=<policy boundary review>',
    'run --session=<directory> --id=<name> --stage=smoke|validation|repair [--seconds=<shorter budget>]',
    'report --session=<directory> --id=<name> --stage=smoke|validation|repair',
    'adopt --session=<directory> --id=<name>',
    'status|new-round|unlock --session=<directory>',
    'recover --session=<directory> --id=<name>',
    'add-case --session=<directory> --file=<declarative battle case JSON>',
    'attest --session=<directory> --id=<name> --file=<source-bound evidence record JSON>',
  ], metrics: RULES.metrics };
  if (command === 'init') return initialize({ out: args.out });
  const path = sessionPath(args);
  if (command === 'unlock') {
    const lock = join(path, 'active.lock'), state = await readJSON(lock); let alive = true;
    try { process.kill(state.pid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; else throw error; }
    assert.ok(!alive, 'The lock owner is still running'); await unlink(lock); return { unlocked: true };
  }
  return withLock(path, async () => {
    if (command === 'propose') return propose(path, args);
    if (command === 'seal') return seal(path, args);
    if (command === 'run') return args.stage === 'repair' ? executeRepair(path, args, { loadSession, readProposal, runWorker, adopt }) : execute(path, args);
    if (command === 'report') return args.stage === 'repair' ? reportRepair(path, args.id, { loadSession, readProposal }) : summarize(path, args.id, args.stage || 'validation');
    if (command === 'adopt') return adopt(path, args.id);
    if (command === 'recover') {
      const journal = await recoverPromotion(join(candidatePath(path, args.id), 'adoption.json'));
      if (journal.status === 'adopted') {
        const current = await loadSession(path);
        assert.equal((await fingerprint(current.workspace)).hash, journal.candidate.hash, 'Adopted workspace has changed');
        current.champion = journal.candidate;
        if (!current.adoptions.some(a => a.id === args.id)) current.adoptions.push({ id: args.id, hash: journal.candidate.hash, at: journal.completedAt });
        await writeJSON(join(path, 'session.json'), current);
      }
      return journal;
    }
    const s = await loadSession(path);
    if (command === 'register-repair') return registerRepair(path, s, await readJSON(resolve(args.file)));
    if (command === 'status') return { champion: s.champion.hash, round: s.round, candidates: s.candidates, adoptions: s.adoptions };
    if (command === 'attest') {
      const directory = candidatePath(path, args.id), c = await readJSON(join(directory, 'candidate.json')), record = await readJSON(resolve(args.file));
      assert.ok(['challenge', 'battle', 'player'].includes(record.kind));
      assert.equal(record.sourceHash, c.hash, 'Evidence must bind the tested source combination');
      assert.equal(typeof record.passed, 'boolean'); assert.ok(record.reviewer?.trim() && record.summary?.trim());
      assert.ok(Array.isArray(record.evidence) && record.evidence.length, 'Supply the actual review/test evidence, not a bare score');
      for (const item of record.evidence) {
        assert.ok(item.path && /^[a-f0-9]{64}$/.test(item.sha256)); item.path = resolve(item.path);
        assert.equal(sha(await readFile(item.path)), item.sha256);
      }
      const file = join(directory, 'attestations', record.kind + '.json'); assert.ok(!await exists(file), 'Attestations are append-once');
      await writeJSON(file, record); return { registered: record.kind, sourceHash: c.hash, scope: 'External evidence registration, not an independent authentication of its author' };
    }
    if (command === 'new-round') {
      const startedAt = Date.now(); s.round = { number: s.round.number + 1, startedAt, deadline: startedAt + RULES.budgetHours * 3600000, candidates: 0, rejections: 0 };
      await writeJSON(join(path, 'session.json'), s); return { round: s.round };
    }
    if (command === 'add-case') {
      const c = await readJSON(resolve(args.file)); identifier(c.id);
      assert.ok(c.id.startsWith('challenge-'), 'Use a challenge- ID');
      assert.ok(c.draft && ['field', 'siege', 'gate', 'port', 'naval'].includes(c.category) && c.reason?.trim());
      assert.ok(!s.corpus.some(x => x.id === c.id), 'Challenge IDs cannot be overwritten');
      const { validateCustomBattle } = await import(pathToFileURL(join(s.judge.root, 'custom-battle.mjs')));
      c.draft = validateCustomBattle(c.draft); c.origin = 'synthetic-challenge'; c.hash = sha(JSON.stringify(c.draft));
      s.corpus.push(c); await writeJSON(join(path, 'session.json'), s); return { added: c.id, appliesTo: 'future proposals only' };
    }
    throw Error('Unknown command: ' + command);
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).then(value => console.log(JSON.stringify(value, null, 2))).catch(error => { console.error(error.stack); process.exitCode = 1; });
}
