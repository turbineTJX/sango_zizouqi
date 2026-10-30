import assert from 'node:assert/strict';
import { RULES } from './rules.mjs';

const average = values => values.reduce((a, b) => a + b, 0) / values.length;
const median = values => { const x = [...values].sort((a, b) => a - b); return x.length % 2 ? x[(x.length - 1) / 2] : (x[x.length / 2 - 1] + x[x.length / 2]) / 2; };

// Exact one-sided sign test. Campaigns/maps sharing a seed form one cluster.
// No per-battle pseudo-replication, optional stopping, or bootstrap randomness.
export function signTest(differences) {
  const nonzero = differences.filter(x => Math.abs(x) > 1e-12), n = nonzero.length;
  const wins = nonzero.filter(x => x > 0).length;
  let choose = 1, probability = 0;
  for (let k = 0; k <= n; k++) {
    if (k >= wins) probability += choose / 2 ** n;
    choose = choose * (n - k) / (k + 1);
  }
  return { n, wins, p: n ? Math.min(1, probability) : 1 };
}

export function decide({ metric, stage, baseline, candidate, hardChecks, complete, sourceStable, changedFiles, review }) {
  assert.ok(Object.hasOwn(RULES.metrics, metric), 'Unknown registered objective');
  const reasons = [], findings = [], definition = RULES.metrics[metric];
  const result = { version: RULES.version, status: 'insufficient', improved: false, promotable: false,
    playability: 'not-established', unification: 'not-observed', reasons, findings };
  if (!sourceStable) reasons.push('source-or-evaluator-changed');
  if (hardChecks.some(c => c.status === 'failed')) reasons.push('hard-check-failed');
  if (reasons.length) return { ...result, status: 'rejected' };
  if (!complete || hardChecks.length === 0 || hardChecks.some(c => c.status !== 'passed')) {
    reasons.push('required-evidence-incomplete'); return result;
  }
  if (stage !== 'validation') { reasons.push('development-is-not-promotion-evidence'); return result; }
  if (!changedFiles.length) { reasons.push('no-policy-change'); return { ...result, status: 'rejected' }; }
  const candidateMap = new Map(candidate.map(row => [row.key, row]));
  assert.equal(candidateMap.size, candidate.length, 'Duplicate candidate case');
  assert.equal(new Set(baseline.map(row => row.key)).size, baseline.length, 'Duplicate baseline case');
  const pairs = baseline.map(a => [a, candidateMap.get(a.key)]);
  if (pairs.some(([, b]) => !b) || baseline.length !== candidate.length) {
    reasons.push('unpaired-evidence'); return result;
  }
  const clusters = new Map();
  for (const [a, b] of pairs) {
    assert.equal(a.seed, b.seed, 'Mismatched paired seed');
    if (a.kind === 'campaign') {
      const perDay = row => row.troopExposure / Math.max(1, (row.turns || 0) * 10);
      if (perDay(b) < perDay(a) * RULES.costGuards.minimumTroopExposureRatio) findings.push({ case: a.key, kind: 'regression', metric: 'troopExposure' });
      if (b.dayP95Ms > RULES.costGuards.maximumDayP95Ms) findings.push({ case: a.key, kind: 'regression', metric: 'dayP95Ms' });
    }
    for (const name of RULES.guardrails) {
      const rule = RULES.metrics[name], av = a.metrics[name], bv = b.metrics[name];
      if (av === undefined && bv === undefined) continue;
      if (!Number.isFinite(av) || !Number.isFinite(bv)) {
        // Zero opportunities are unknown, never a perfect score.
        if (av !== bv || name === metric) findings.push({ case: a.key, metric: name, kind: 'unmeasured' });
        continue;
      }
      if ((bv - av) * rule.direction < -rule.tolerance - 1e-12) findings.push({ case: a.key, metric: name, kind: 'regression', baseline: av, candidate: bv });
    }
    const av = a.metrics[metric], bv = b.metrics[metric];
    if (Number.isFinite(av) && Number.isFinite(bv)) {
      if (!clusters.has(a.seed)) clusters.set(a.seed, []);
      // Once the confirmed quiet-gap target is met, extra wars earn no credit.
      const value = x => metric === 'middleQuietTurns' ? Math.max(RULES.acceptance.maximumMiddleQuietTurns, x) : x;
      clusters.get(a.seed).push((value(bv) - value(av)) * definition.direction);
    }
  }
  if (findings.some(f => f.kind === 'regression')) { reasons.push('guardrail-regression'); return { ...result, status: 'rejected' }; }
  if (findings.some(f => f.kind === 'unmeasured')) { reasons.push('comparison-has-unmeasured-outcomes'); return result; }
  if (clusters.size < RULES.independentSeeds) { reasons.push('insufficient-independent-seeds'); return result; }
  const gains = [...clusters.values()].map(average), evidence = { ...signTest(gains), medianGain: median(gains),
    requiredGain: definition.improvement, alpha: RULES.confidence.familyError / RULES.confidence.comparisons };
  result.evidence = evidence;
  if (evidence.medianGain < definition.improvement || evidence.p > evidence.alpha) {
    reasons.push('improvement-not-established'); return result;
  }
  if (!review || review.sourceHash === undefined || review.constraintsPreserved !== true || !review.explanation?.trim()) {
    reasons.push('policy-boundary-review-missing'); return result;
  }
  return { ...result, status: 'improved', improved: true, promotable: true };
}

// Playability is a separate claim. Automated phases cannot fabricate player
// experience, exploiter resistance or unification from a short simulation.
export function assessPlayability(rows, { hardPassed = false, challengeEvidence = null, playerEvidence = null, battleEvidence = null } = {}) {
  const missing = [], failures = [], campaigns = rows.filter(r => r.kind === 'campaign');
  if (!hardPassed) missing.push('hard-checks');
  for (const scenario of RULES.scenarios) {
    const samples = campaigns.filter(r => r.scenario === scenario);
    if (new Set(samples.map(r => r.seed)).size < RULES.independentSeeds) missing.push('independent-natural-cases:' + scenario);
    for (const row of samples) {
      if (!row.freshOrigin || row.turns < RULES.validationTurns) missing.push('complete-phases:' + row.key);
      if (row.metrics.middleQuietTurns > RULES.acceptance.maximumMiddleQuietTurns) failures.push('middle-quiet:' + row.key);
    }
  }
  if (challengeEvidence?.passed !== true) missing.push('reviewed-exploit-challenges');
  const domainStatus = failures.length ? 'failed' : missing.length ? 'insufficient' : 'passed';
  const integration = hardPassed && campaigns.some(r => r.actualBattles > 0) && rows.some(r => r.kind === 'battle') ? 'observed' : 'insufficient';
  if (integration !== 'observed') missing.push('actual-strategy-battle-integration');
  if (battleEvidence?.passed !== true) missing.push('independent-battle-domain-acceptance');
  if (playerEvidence?.passed !== true) missing.push('player-experience');
  return { status: failures.length ? 'failed' : missing.length ? 'insufficient' : 'passed', domain: 'strategy', domainStatus, integration, failures, missing,
    unification: campaigns.some(r => r.unified) ? 'observed-in-listed-cases-only' : 'not-observed' };
}
