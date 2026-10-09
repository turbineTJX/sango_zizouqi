import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {STRATEGIC_PLANNING_RULES as R} from './data/design/strategic-planning-rules.mjs';
import {runStrategicAlgorithm} from './strategic-algorithms.mjs';

export function forecastStrategicPreparation(context,requirements,algorithms=R.algorithms){
 return runStrategicAlgorithm('preparationPredictor',algorithms,{context,requirements,horizonDays:R.preparationTurns*ECONOMY_RULES.budget.days});
}
