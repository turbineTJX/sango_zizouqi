import { PROTOCOL, casesFor } from './protocol.mjs';
import { signTest } from '../ai-validation/judge.mjs';
const mean=xs=>xs.reduce((s,x)=>s+x,0)/xs.length;
const median=xs=>{const a=[...xs].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
const core=r=>!['player','advantage'].includes(r.spec.kind);
const directionTest=(values,loss,tolerance)=>mean(values)<-tolerance&&values.filter(x=>x<0).length/values.length>=loss;

export function assessStandards(rows){
  const findings=[],groups=new Map();
  for(const row of rows){
    const kind=row.spec.kind;if(!['player','advantage'].includes(kind))continue;
    const key=kind==='player'?'player:'+(row.spec.roster.startsWith('mixed-')?'mixed':'ordinary'):row.spec.id;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
  }
  const evidence=[];
  for(const [key,rs]of groups){
    if(rs[0].spec.kind==='advantage'){
      const margin=mean(rs.map(r=>r.metrics.advantageMarginGain)),mission=mean(rs.map(r=>r.metrics.advantageMissionGain));
      evidence.push({key,marginGain:margin,missionGain:mission});
      if(margin<PROTOCOL.acceptance.advantageMarginGain||mission < -PROTOCOL.acceptance.advantageMissionLoss)findings.push({key,reason:'clear-troop-advantage-not-realized',margin,mission});
    }else{
      const margin=mean(rs.map(r=>r.metrics.playerMarginLift)),mission=mean(rs.map(r=>r.metrics.playerMissionLift));
      const winningSeeds=new Set(rs.filter(r=>r.metrics.playerArrangedMission>0).map(r=>r.seed)).size;
      evidence.push({key,marginLift:margin,missionLift:mission,winningSeeds});
      if(margin<PROTOCOL.acceptance.playerBaselineMarginLift&&mission<PROTOCOL.acceptance.playerBaselineMissionLift)findings.push({key,reason:'player-decision-benefit-not-established',margin,mission});
      if(winningSeeds<Math.min(PROTOCOL.acceptance.playerMinimumWinningSeeds,new Set(rs.map(r=>r.seed)).size))findings.push({key,reason:'player-reproducible-win-not-observed',winningSeeds});
    }
  }
  return {status:findings.length?'not-established':'registered-samples-passed',findings,evidence};
}
export function judgeBattle({proposal,stage,rows,checks,complete,sourceStable,changedFiles}){
  const result={status:'insufficient',improved:false,promotable:false,reasons:[],findings:[],
    domainCoverage:'not-established',integration:'not-run',playerExperience:'not-observed',nationwide:'not-established'};
  const reject=reason=>({...result,status:'rejected',reasons:[...result.reasons,reason]});
  if(!sourceStable)return reject('source-or-evidence-drift');
  if(checks.some(c=>c.status==='failed'))return reject('hard-check-failed');
  if(!complete||!checks.length||checks.some(c=>c.status!=='passed')){result.reasons.push('required-evidence-incomplete');return result;}
  if(!PROTOCOL.objectives.includes(proposal.metric)||!(proposal.delta>0))return reject('invalid-objective');
  const seeds=stage==='validation'?proposal.validationSeeds:PROTOCOL.developmentSeeds;
  if(new Set(seeds).size!==seeds.length)return reject('duplicate-seeds');
  const specs=casesFor(stage==='validation'?'validation':'development'),expected=seeds.length*specs.length;
  for(const side of ['baseline','candidate'])if(rows[side].length!==expected||new Set(rows[side].map(r=>r.key)).size!==expected){result.reasons.push('case-set-mismatch:'+side);return result;}
  const pairs=[];
  for(const seed of seeds)for(const spec of specs){
    const key=spec.id+':'+seed,a=rows.baseline.find(r=>r.key===key),b=rows.candidate.find(r=>r.key===key);
    if(!a||!b||a.seed!==seed||b.seed!==seed)return reject('unpaired:'+key);
    if(a.inputHash!==b.inputHash||a.engineHash!==b.engineHash||a.opponentHash!==b.opponentHash)return reject('different-input-or-opponent:'+key);
    const metrics=['missionRate','remainingMargin','remainingFraction','timeoutRate','ticks',
      ...(spec.kind==='player'?['playerMarginLift','playerMissionLift','playerArrangedMission']:[]),
      ...(spec.kind==='advantage'?['advantageMarginGain','advantageMissionGain']:[])];
    if(metrics.some(m=>!Number.isFinite(a.metrics[m])||!Number.isFinite(b.metrics[m])))return reject('invalid-metric:'+key);
    pairs.push({a,b,spec,seed});
  }
  result.standards={baseline:assessStandards(rows.baseline),candidate:assessStandards(rows.candidate)};
  const regular=pairs.filter(p=>core(p.a)),delta=(p,m)=>p.b.metrics[m]-p.a.metrics[m];
  const seedGains=seeds.map(seed=>mean(regular.filter(p=>p.seed===seed).map(p=>delta(p,proposal.metric))));
  result.evidence={...signTest(seedGains),gains:seedGains,medianGain:median(seedGains),requiredGain:proposal.delta,alpha:PROTOCOL.alpha};
  result.missionChange=mean(regular.map(p=>delta(p,'missionRate')));
  if(result.missionChange < -PROTOCOL.guards.overallMissionLoss)result.findings.push({reason:'overall-mission-regression',change:result.missionChange});
  for(const spec of specs.filter(s=>!['player','advantage'].includes(s.kind))){
    const ps=regular.filter(p=>p.spec.id===spec.id);
    for(const [metric,tolerance]of [['missionRate',PROTOCOL.guards.caseMissionLoss],['remainingMargin',PROTOCOL.guards.caseMarginLoss]]){
      const differences=ps.map(p=>delta(p,metric));
      if(directionTest(differences,PROTOCOL.guards.repeatedSeedFraction,tolerance))result.findings.push({case:spec.id,metric,change:mean(differences),worseSeeds:differences.filter(x=>x<0).length,tolerance});
    }
  }
  for(const a of result.standards.baseline.evidence.filter(e=>e.key.startsWith('player:'))){
    const b=result.standards.candidate.evidence.find(e=>e.key===a.key);
    if(a.marginLift>=PROTOCOL.acceptance.playerBaselineMarginLift&&b.marginLift<a.marginLift*PROTOCOL.acceptance.playerRetainedLiftFraction)
      result.findings.push({case:a.key,reason:'player-margin-benefit-eroded',before:a.marginLift,after:b.marginLift});
    if(a.missionLift>=PROTOCOL.acceptance.playerBaselineMissionLift&&b.missionLift<a.missionLift*PROTOCOL.acceptance.playerRetainedLiftFraction)
      result.findings.push({case:a.key,reason:'player-mission-benefit-eroded',before:a.missionLift,after:b.missionLift});
  }
  if(stage!=='validation'){result.reasons.push('development-not-promotion');return result;}
  if(seeds.length<PROTOCOL.independentSeeds||seeds.some(s=>PROTOCOL.developmentSeeds.includes(s))){result.reasons.push('insufficient-independent-seeds');return result;}
  if(!changedFiles?.length)return reject('no-policy-change');
  if(result.findings.length)return reject('repeated-regression-or-player-space-loss');
  if(result.standards.candidate.status!=='registered-samples-passed'){result.reasons.push('battle-standard-not-established');return result;}
  if(result.evidence.medianGain<proposal.delta||result.evidence.p>PROTOCOL.alpha){result.reasons.push('improvement-not-established');return result;}
  return {...result,status:'improved',improved:true,promotable:true,domainCoverage:'registered-matrix-only'};
}

