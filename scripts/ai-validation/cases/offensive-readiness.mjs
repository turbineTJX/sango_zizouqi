import {exercise as preparation} from './recovery-preparation.mjs';
import {exercise as continuation} from './committed-offensive-margin.mjs';
import {exercise as equipment} from './siege-march-cost.mjs';
export async function exercise(input){
 const checks={};
 for(const [prefix,run] of [['preparation',preparation],['continuation',continuation],['equipment',equipment]])
  for(const [name,value] of Object.entries(await run(input)))checks[prefix+':'+name]=value;
 return checks;
}
