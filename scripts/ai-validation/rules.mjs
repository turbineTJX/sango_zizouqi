// This is an experiment contract, never a source of game rules.
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

export const RULES = freeze({
  version: 2,
  budgetHours: 8,
  maximumCandidatesPerRound: 8,
  consecutiveRejectionsBeforeStop: 3,
  promotion: 'automatic-local-only',
  domain: 'strategy',
  objectiveMetrics: ['middleQuietTurns', 'hungerExposure', 'planCompletion', 'hostileCitiesRetained'],
  requireUnificationForPlayability: false,
  scenarios: ['guandu-200', 'red-cliffs-208'],
  developmentSeeds: [417, 643],
  independentSeeds: 8,
  validationTurns: 100,
  chunkTurns: 10,
  confidence: { familyError: 0.05, comparisons: 8 },
  metrics: {
    middleQuietTurns: { direction: -1, improvement: 1, tolerance: 1, family: 'campaign' },
    hungerExposure: { direction: -1, improvement: 0.002, tolerance: 0.002, family: 'campaign' },
    planCompletion: { direction: 1, improvement: 0.03, tolerance: 0.03, family: 'campaign' },
    hostileCitiesRetained: { direction: 1, improvement: 1, tolerance: 1, family: 'campaign' },
    fieldTimeoutRate: { direction: -1, improvement: 0.05, tolerance: 0.05, family: 'battle' },
    inactiveUnitTicks: { direction: -1, improvement: 4, tolerance: 4, family: 'battle' },
  },
  // Guardrails apply to each comparable case, not just to the grand average.
  guardrails: ['middleQuietTurns', 'hungerExposure', 'planCompletion', 'hostileCitiesRetained'],
  acceptance: { maximumMiddleQuietTurns: 12, minimumLateTurns: 40 },
  costGuards: { minimumTroopExposureRatio: 0.9, maximumDayP95Ms: 8000 },
  repair: { minimumWindows: 2, minimumDays: 20, maximumAddedHungerDays: 1, minimumRemainingTroopsRatio: 0.9,
    requiredTests: ['tests/ai-bond-blind.test.mjs', 'tests/talent-intelligence.test.mjs', 'tests/geographic-roads.test.mjs'] },
  // Curated starting search surface. New policy modules can be added freely.
  // Common rules, tests, datasets, evaluator and manifests remain protected.
  editableFiles: [
    'strategic-ai.mjs', 'strategic-planner.mjs', 'strategic-policy.mjs',
    'strategic-algorithm-defaults.mjs', 'strategic-algorithms.mjs',
    'strategic-scouting-ai.mjs', 'strategic-support-ai.mjs',
    'strategic-management-ai.mjs', 'strategic-staffing.mjs',
    'strategic-concentration.mjs', 'strategic-temperament.mjs',
    'docs/AI架构与决策评价方法.md', 'docs/势力AI与跨旬作战计划.md', 'docs/AI互战行为与决策审计.md',
  ],
  editableNewDirectory: 'ai-policy/',
  nonNegotiable: [
    'shared-actions-resources-and-resolution', 'legal-observation-only',
    'no-bond-optimization', 'fixed-command-trigger-boundary', 'no-unit-micromanagement',
    'no-free-resources-or-forced-war', 'current-save-determinism',
    'no-evaluator-test-or-game-rule-edits',
    'frozen-battle-dependencies', 'strategic-review-every-ten-days',
    'no-tactical-rollout-inside-strategic-decisions',
  ],
});

export const BATTLE_CASES = freeze([
  { id: 'mixed-field', mapId: 'plain-open', terrain: 'land', category: 'field', profile: 'mixed' },
  { id: 'ranged-pressure', mapId: 'forest-belt', terrain: 'forest', category: 'field', profile: 'ranged' },
  { id: 'cavalry-pressure', mapId: 'plain-crossroads', terrain: 'land', category: 'field', profile: 'cavalry' },
  { id: 'reserves', mapId: 'plain-ridges', terrain: 'land', category: 'field', profile: 'reserves' },
  { id: 'siege', mapId: 'xiapi', terrain: 'marsh', category: 'siege', profile: 'mixed' },
  { id: 'gate', mapId: 'hill-pass', terrain: 'hill', category: 'gate', profile: 'mixed' },
  { id: 'port', mapId: 'river-harbor', terrain: 'river', category: 'port', profile: 'mixed' },
  { id: 'naval', mapId: 'river-crossing', terrain: 'river', category: 'naval', profile: 'mixed' },
]);

export function editable(path) {
  return RULES.editableFiles.includes(path) || /^ai-policy\/[a-z0-9][a-z0-9/_-]*\.mjs$/.test(path);
}
