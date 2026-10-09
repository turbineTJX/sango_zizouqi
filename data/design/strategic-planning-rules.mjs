// Decision parameters only. All spending, movement and outcomes use shared rules.
export const STRATEGIC_PLANNING_RULES=Object.freeze({
 version:3,traceLimit:12,candidateLimit:8,forceVariants:3,assemblyDays:10,
 switchMargin:20,peacePressureRatio:.65,
 preparationTurns:2,preparationPenalty:12,uncertaintyPerDay:2,maximumUncertainty:20,
 peacePriority:35,defensePriority:100,resourcePriority:1.3,
 algorithms:Object.freeze({selector:'utility-v1',goalEvaluator:'utility-v1',offensiveEvaluator:'cost-benefit-v1',battlePredictor:'attrition-v1',preparationPredictor:'two-turn-v2'}),
});
