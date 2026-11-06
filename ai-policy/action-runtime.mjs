import {isAITurnStart} from '../ai-turn.mjs';
import {actionIntent,ownershipError} from './action-authorization.mjs';
import {chronicleError} from './chronicle.mjs';
import {projectFactionTasks,validateTurnPlan} from './task-ledger.mjs';
import {installWorld} from './planning-transaction.mjs';
const runtimes=new WeakMap(),proposals=new WeakMap();
const fingerprint=s=>JSON.stringify(s);
const stocks=s=>s.cities.map(c=>[c.id,c.gold,c.grain,c.manpower]);
export function recordFactionMethod(s,method){const r=runtimes.get(s);if(r)r.methods.push(structuredClone(method));}
const stockChanges=(s,before)=>s.cities.flatMap(c=>{const old=before.find(x=>x[0]===c.id);return ['gold','grain','manpower'].flatMap((key,k)=>old&&c[key]!==old[k+1]?[{cityId:c.id,key,delta:c[key]-old[k+1]}]:[]);});
export function runCoordinatedAction(name,args,execute){
 const s=args[0],r=runtimes.get(s);if(!r)return execute();
 if(r.calls++>=32768)throw Error('势力规划超过确定性行动检查预算');
 const intent=actionIntent(name,args),error=ownershipError(s,intent);
 if(error){r.rejected.push({module:r.stack.at(-1)||'root',...intent,reason:error});return ['assignDiplomat','applyMilitaryFlow'].includes(name)?{error}:error;}
 const before=stocks(s),sequence=r.nextAction++,parent=r.actionStack.at(-1)??null;
 r.actionStack.push(sequence);let result;
 try{result=execute();}finally{r.actionStack.pop();}
 if(!result||typeof result==='object'&&!result.error&&!result.confirmation){
  // Only the outer action owns aggregate deltas. Nested shared operations
  // retain provenance but cannot count the same expenditure a second time.
  const changes=parent===null?stockChanges(s,before):[];
  r.actions.push({sequence,parent,module:r.stack.at(-1)||'root',...intent,changes});
 }
 return result;
}
export function runDecisionModule(name,args,execute){
 const r=runtimes.get(args[0]);if(!r)return execute();
 const root=r.stack.length===0,before=root?stocks(args[0]):null;
 r.stack.push(name);if(!r.modules.includes(name))r.modules.push(name);
 try{return execute();}finally{r.stack.pop();if(root)r.effects.push({module:name,changes:stockChanges(args[0],before)});}
}
function assertResources(s){
 for(const c of s.cities)for(const key of ['gold','grain','manpower'])if(!Number.isSafeInteger(c[key])||c[key]<0)throw Error('势力提案资源无效：'+c.id+':'+key);
 for(const a of s.armies)if(!a.disbanded&&(!Number.isFinite(a.supply)||a.supply<0))throw Error('势力提案携粮无效');
}
// One current-turn draft, not hypothetical campaign search. No day, battle,
// future RNG or alternative random work result is simulated for evaluation.
export function proposeFactionPlanning(s,execute){
 const before=fingerprint(s),draft=structuredClone(s),r={stack:[],modules:[],effects:[],methods:[],actions:[],rejected:[],calls:0,nextAction:0,actionStack:[]};
 runtimes.set(draft,r);try{execute(draft);}finally{runtimes.delete(draft);}
 assertResources(draft);
 const ledger=projectFactionTasks(draft),error=chronicleError(ledger.tasks,ledger.capacities);if(error){const conflict=Error('势力任务不相容：'+error);conflict.taskEvidence=ledger.tasks.filter(t=>t.claims.some(c=>error.endsWith(c.resource)));throw conflict;}
 const plan={version:1,day:s.campaign.day,revision:(s.campaign.ai?.coordination.turnPlan?.revision||0)+1,status:'authorized',modules:r.modules,effects:r.effects,methods:r.methods.slice(-256),actions:r.actions.sort((a,b)=>a.sequence-b.sequence).slice(-2048),rejected:r.rejected.slice(-128),ledger};
 validateTurnPlan(plan,s.campaign.day,ok=>{if(!ok)throw Error('势力时序计划无效');});
 if(draft.campaign.ai)draft.campaign.ai.coordination.turnPlan=plan;
 const proposal={day:s.campaign.day,plan,draft};proposals.set(proposal,{world:s,before,admitted:fingerprint(draft)});return proposal;
}
export function commitFactionPlanning(s,proposal){
 const token=proposals.get(proposal);if(!token||token.world!==s||token.before!==fingerprint(s))throw Error('势力提案已过期，须在当前事实重新规划');
 if(token.admitted!==fingerprint(proposal.draft))throw Error('已批准草案被修改，须重新检查任务和资源');
 assertResources(proposal.draft);proposals.delete(proposal);installWorld(s,proposal.draft);return proposal.plan;
}
export function runFactionPlanning(s,execute){
 if(runtimes.has(s)||!s.campaign?.scenarioId||!isAITurnStart(s))return execute(s);
 return commitFactionPlanning(s,proposeFactionPlanning(s,execute));
}
