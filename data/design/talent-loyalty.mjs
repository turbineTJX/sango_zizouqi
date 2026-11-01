// Shared loyalty risk rules. Probabilities are tunable initial values, not
// promised departure dates; each eligible officer is checked at most daily.
export const TALENT_LOYALTY_RULES=Object.freeze({
 maximum:100,
 warningThreshold:60,
 steadfastThreshold:40,
 steadfastRighteousness:80,
 steadfastRelation:80,
 minimumDailyResignationChance:.002,
 maximumDailyResignationChance:.04,
 severityExponent:2,
});
