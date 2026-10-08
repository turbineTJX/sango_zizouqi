// Thresholds, learning tiers, cooldowns and stocks come from the design table.
// This module derives descriptions and resolves independent usage accounting.
export const TACTIC_RECOVERY_STEPS = 4;
export function describeTacticTempo(skill){
 const s={...skill};
    s.tempoDescription = s.passive ? '首次入场触发，每场一次，不主动施放、不消耗战意'
      : s.tempoRole+'；每场 '+s.maxUses+' 次；战意门槛 '+s.threshold+'，施放消耗 '+s.intentCost+'；施放后 '+TACTIC_RECOVERY_STEPS+' 日才能再次施放其他战法，期间可普攻';
    if(s.useEffect)s.tempoDescription += s.useEffect==='expand'?'；为受援友军一项已消耗的普通战法增加上限及剩余次数各1，本场每项最多增加1；不清冷却':'；为受援友军一项已消耗的普通战法恢复1次，不超上限、不清冷却';
    return s.tempoDescription;
}
export const tacticUseLimit=(u,s)=>s.maxUses+(u.tacticUseBonus?.[s.id]||0);
export const tacticUsesLeft=(u,s)=>s.passive?0:Math.max(0,tacticUseLimit(u,s)+(u.tacticRestored?.[s.id]||0)-(u.tacticCasts?.[s.id]||0));
export const canRestoreTactic=s=>!s.passive&&!s.special&&!s.useEffect;
export function useRecoveryTargets(u,skills,mode='restore'){
  return skills.filter(s=>canRestoreTactic(s)&&tacticUsesLeft(u,s)<tacticUseLimit(u,s)&&(mode!=='expand'||!(u.tacticUseBonus?.[s.id]||0)));
}
export function recoverTacticUses(u,skills,mode='restore',all=false){
  const targets=useRecoveryTargets(u,skills,mode).slice(0,all?Infinity:1);
  for(const s of targets){const map=mode==='expand'?u.tacticUseBonus:u.tacticRestored;map[s.id]=(map[s.id]||0)+1;}
  return targets;
}
