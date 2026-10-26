import {withCityBudgetQueries} from './city-budget.mjs';
import {withDomesticCandidateQueries} from './domestic.mjs';
import {withServingPeopleQueries} from './talent-core.mjs';
import {withCitySupplyQueries} from './city-logistics.mjs';
import {withReadQueries} from './read-query-scope.mjs';

// Only synchronous, read-only candidate comparison belongs here. All derived
// indexes expire before the chosen command changes people, stock or orders.
export function withPlanningQueries(s,evaluate){
 return withReadQueries(()=>withCityBudgetQueries(()=>withDomesticCandidateQueries(()=>withServingPeopleQueries(()=>withCitySupplyQueries(s,evaluate)))));
}
