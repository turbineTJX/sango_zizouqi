import {STRATEGIC_PLANNING_RULES as R} from './data/design/strategic-planning-rules.mjs';
import {runStrategicAlgorithm,strategicAlgorithmProfile} from './strategic-algorithms.mjs';

export const newFactionStrategy=()=>({version:R.version,revision:0,updatedDay:0,neighbors:{},goal:null,trace:[],militarySignature:'',critical:false});
const key=g=>g&&[g.kind,g.targetFaction,g.targetCity,g.staging].join(':');
export function chooseFactionStrategy(context,profile,previous,candidates,{activePlan=null,force=false,algorithms=R.algorithms}={}){
 const neighbors=Object.fromEntries(context.neighbors.map(f=>{const pressure=context.enemies.filter(a=>a.faction===f).reduce((n,a)=>n+a.power,0);
  return [f,{mode:context.hostile[f]?'defend':'peace',pressure,reason:context.hostile[f]?'保留边境守备':'维持现有和平关系'}];}));
 const ownPower=context.ownCities.reduce((n,c)=>n+c.troops,0),pressure=context.enemies.reduce((n,a)=>n+a.power,0);
 const goals=candidates.map(c=>({...c}));
 const threatened=context.ownCities.filter(c=>c.besieged||context.enemies.some(a=>a.next===c.id||a.location===c.id)).sort((a,b)=>Number(b.besieged)-Number(a.besieged)||a.id.localeCompare(b.id));
 if(threatened.length)goals.push({kind:'defend',targetFaction:null,targetCity:threatened[0].id,staging:threatened[0].id,ready:true,
  score:R.defensePriority,reason:'实际来袭或围城，优先保境'});
 if(!activePlan&&pressure>ownPower*R.peacePressureRatio&&context.neighbors.some(f=>context.hostile[f])){
  const other=context.neighbors.filter(f=>context.hostile[f]).sort((a,b)=>(neighbors[b].pressure-neighbors[a].pressure)||a.localeCompare(b))[0];
  goals.push({kind:'peace',targetFaction:other,targetCity:null,staging:null,ready:true,score:R.defensePriority,reason:'已知军事压力过大，保留守备并争取减少战线'});
 }
 const recovery=context.ownCities.filter(c=>c.shortages.gold||c.shortages.grain||c.wounded).sort((a,b)=>(b.shortages.grain+ b.shortages.gold-a.shortages.grain-a.shortages.gold)||a.id.localeCompare(b.id));
 goals.push({kind:recovery.length?'recover':'develop',targetFaction:null,targetCity:recovery[0]?.id||null,staging:null,ready:true,score:0,reason:recovery.length?'恢复本城预算、伤兵与持续生产':'发展可用产能并保留战争准备'});
 goals.forEach((g,i)=>{g.id=g.candidateId||key(g)+':'+i;g.utility=runStrategicAlgorithm('goalEvaluator',algorithms,{candidate:g,context,profile,rules:R}).score;});
 if(new Set(goals.map(g=>g.id)).size!==goals.length)throw Error('战略候选编号重复');
 goals.sort((a,b)=>b.utility-a.utility||key(a).localeCompare(key(b)));
 const selectedId=runStrategicAlgorithm('selector',algorithms,{context,profile,candidates:goals,previousGoal:previous.goal,rules:R});
 let best=goals.find(g=>g.id===selectedId);
 const incumbent=previous.goal&&goals.find(g=>key(g)===key(previous.goal));
 // The fallback has no committed operation to protect. Do not let a previous
 // development/recovery choice suppress a better lawful military candidate.
 if(!force&&incumbent&&!['develop','recover'].includes(incumbent.kind)&&best.utility<incumbent.utility+R.switchMargin)best=incumbent;
 if(activePlan)best={id:previous.goal?.candidateId||'plan:'+activePlan.id,kind:'capture',targetFaction:candidates.find(c=>c.targetCity===activePlan.target)?.targetFaction||previous.goal?.targetFaction||null,
  targetCity:activePlan.target,staging:activePlan.staging,ready:true,utility:previous.goal?.score||0,score:previous.goal?.score||0,reason:activePlan.reason,requirements:previous.goal?.requirements||[],forecast:previous.goal?.forecast||null};
 if(best.kind==='capture'&&neighbors[best.targetFaction])neighbors[best.targetFaction]={...neighbors[best.targetFaction],mode:'attack',reason:'集中当前主攻方向，其他边境保留守备'};
 if(best.kind==='peace'&&neighbors[best.targetFaction])neighbors[best.targetFaction]={...neighbors[best.targetFaction],mode:'peace',reason:'争取签约，条约生效前继续守备'};
 const changed=key(best)!==key(previous.goal),goal={candidateId:best.id,kind:best.kind,targetFaction:best.targetFaction,targetCity:best.targetCity,staging:best.staging,
  status:activePlan?'running':best.ready?'ready':'preparing',score:best.utility,createdDay:changed?context.day:previous.goal.createdDay,reason:best.reason,
  planId:activePlan?.id||null,requirements:best.requirements||[],forecast:best.forecast||null};
 const trace={day:context.day,reason:force?'军情或供给发生重大变化':'战略条件复核',selected:key(goal),algorithms:strategicAlgorithmProfile(algorithms),candidates:goals.slice(0,R.candidateLimit).map(g=>({candidateId:g.id,kind:g.kind,target:g.targetCity,score:g.utility,ready:g.ready,reason:g.reason,forecast:g.forecast||null}))};
 return {version:R.version,revision:previous.revision+1,updatedDay:context.day,neighbors,goal,
  trace:[...previous.trace,trace].slice(-R.traceLimit),militarySignature:context.militarySignature,critical:context.critical};
}
export function strategicDemand(s,cityId){
 const c=s.cities.find(c=>c.id===cityId),g=s.campaign.ai?.factions[c?.owner]?.strategy?.goal;
 return g&&((g.staging===cityId)||g.requirements.some(r=>r.cityId===cityId)||(['recover','defend'].includes(g.kind)&&g.targetCity===cityId))?g:null;
}
export function strategicDomesticPriority(s,cityId,def){
 const g=strategicDemand(s,cityId);if(!g)return 0;
 if(g.kind==='capture'&&g.status==='preparing')return ['cash','grain','recruit'].includes(def.kind)?R.resourcePriority:0;
 if(g.kind==='recover')return ['cash','grain','heal'].includes(def.kind)?R.resourcePriority:0;
 if(g.kind==='defend')return ['repair','heal','recruit','prepare'].includes(def.kind)?R.resourcePriority:0;
 return 0;
}
