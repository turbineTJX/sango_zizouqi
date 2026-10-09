import {STRATEGIC_PLANNING_RULES as R} from './data/design/strategic-planning-rules.mjs';
import {predictAttritionV1,evaluateCostBenefitV1,evaluateGoalUtilityV1,selectUtilityV1} from './strategic-algorithm-defaults.mjs';
import {forecastPreparationV2} from './strategic-predictors.mjs';

export const STRATEGIC_ALGORITHM_KINDS=Object.freeze(['selector','goalEvaluator','offensiveEvaluator','battlePredictor','preparationPredictor']);
const registry=new Map(STRATEGIC_ALGORITHM_KINDS.map(kind=>[kind,new Map()]));
const identifier=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(id);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

// IDs include a version. Replacing code under an existing ID would break replay.
export function registerStrategicAlgorithm(kind,{id,run}){
 if(!registry.has(kind)||!identifier(id)||typeof run!=='function')throw Error('战略算法注册无效');
 if(run.constructor?.name==='AsyncFunction')throw Error('战略算法必须同步返回结果');
 const entries=registry.get(kind);if(entries.has(id))throw Error('战略算法编号已注册：'+kind+'/'+id);
 entries.set(id,run);return ()=>entries.delete(id);
}
for(const [kind,id,run]of [
 ['selector','utility-v1',selectUtilityV1],['goalEvaluator','utility-v1',evaluateGoalUtilityV1],
 ['offensiveEvaluator','cost-benefit-v1',evaluateCostBenefitV1],['battlePredictor','attrition-v1',predictAttritionV1],
 ['preparationPredictor','two-turn-v2',forecastPreparationV2],
])registerStrategicAlgorithm(kind,{id,run});

export function strategicAlgorithmProfile(profile=R.algorithms,{registered=true}={}){
 if(!profile||Object.keys(profile).length!==STRATEGIC_ALGORITHM_KINDS.length||!STRATEGIC_ALGORITHM_KINDS.every(kind=>Object.hasOwn(profile,kind)&&identifier(profile[kind])&&(!registered||registry.get(kind).has(profile[kind]))))throw Error('战略算法配置无效或实现未注册');
 return {...profile};
}
export function listStrategicAlgorithms(){return Object.fromEntries([...registry].map(([kind,entries])=>[kind,[...entries.keys()]]));}
export function runStrategicAlgorithm(kind,profile,input){
 const id=profile[kind],run=registry.get(kind)?.get(id);if(!run)throw Error('战略算法实现未注册：'+kind+'/'+id);
 const request=freeze(structuredClone(input)),response=run(request);
 if(response&&typeof response.then==='function'){Promise.resolve(response).catch(()=>{});throw Error('战略算法必须同步返回结果：'+kind+'/'+id);}
 let result;try{result=structuredClone(response);}catch(error){throw Error('战略算法输出无效：'+kind+'/'+id,{cause:error});}
 const finite=n=>Number.isFinite(n),positive=n=>finite(n)&&n>=0,integer=n=>Number.isSafeInteger(n)&&n>=0;
 const fields=(keys)=>result&&typeof result==='object'&&!Array.isArray(result)&&Object.keys(result).length===keys.length&&keys.every(k=>Object.hasOwn(result,k));
 let valid=false;
 if(kind==='selector')valid=typeof result==='string'&&request.candidates.some(c=>c.id===result);
 if(kind==='goalEvaluator')valid=fields(['score'])&&finite(result.score);
 if(kind==='offensiveEvaluator')valid=fields(['score','benefit','cost','workCost'])&&finite(result.score)&&['benefit','cost','workCost'].every(k=>positive(result[k]));
 if(kind==='battlePredictor')valid=fields(['estimatedLosses','consumedGrain','replacementGold','militaryGold','counterPower'])&&integer(result.estimatedLosses)&&result.estimatedLosses<=request.facts.men&&integer(result.replacementGold)&&integer(result.militaryGold)&&positive(result.consumedGrain)&&positive(result.counterPower);
 if(kind==='preparationPredictor')valid=fields(['feasible','readyDay','reason'])&&typeof result.feasible==='boolean'&&(result.feasible?integer(result.readyDay)&&result.readyDay>=request.context.day&&result.readyDay<=request.context.day+request.horizonDays:result.readyDay===null)&&typeof result.reason==='string'&&result.reason.length<=200;
 if(!valid)throw Error('战略算法输出无效：'+kind+'/'+id);
 return result;
}
export function setStrategicAlgorithms(s,changes){
 if(!s.campaign.ai||s.campaign.phase!=='planning')return '须在势力筹划阶段设置战略算法';
 if(!changes||Object.keys(changes).some(k=>!STRATEGIC_ALGORITHM_KINDS.includes(k)))return '战略算法配置无效';
 let next;try{next=strategicAlgorithmProfile({...s.campaign.ai.algorithms,...changes});}catch(error){return error.message;}
 s.campaign.ai.algorithms=next;s.campaign.ai.lastPlanDay=0;
 for(const policy of Object.values(s.campaign.ai.factions))policy.lastReviewTurn=0;
 return null;
}
