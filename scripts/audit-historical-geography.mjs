import {nationalWorld} from '../national-scenarios.mjs';
import {mapNodes} from '../road-network.mjs';
import {historicalGeographyIssues} from '../historical-geography-validation.mjs';
import {HISTORICAL_GEOGRAPHY_DESIGN} from '../data/design/historical-geography.mjs';
import {RIVERS,LAKES} from '../national-geography.mjs';
import {roadPoint} from '../strategic-movement.mjs';
const world=nationalWorld('guandu-200'),places=mapNodes(world),issues=historicalGeographyIssues(places,world.roads,{pointOnRoad:roadPoint});
console.log(JSON.stringify({passed:!issues.length,places:places.length,cities:world.cities.length,ports:places.filter(n=>n.kind==='port').length,gates:places.filter(n=>n.kind==='gate').length,rivers:RIVERS.length,lakes:LAKES.length,referenceVersion:HISTORICAL_GEOGRAPHY_DESIGN.version,issues},null,2));
if(issues.length)process.exitCode=1;
