// Learning tiers are captured before combat thresholds are tuned. Costs are
// fixed expenditure: neither power/combos nor resistance to enemy drain apply.
export const TACTIC_RECOVERY_STEPS = 4;
export function applyTacticTempo(book) {
  for (const s of Object.values(book)) {
    s.learningTier = s.special ? 'special' : s.threshold <= 35 ? 'low' : 'high';
    if (!s.special) {
      s.tempoRole = s.learningTier === 'low' ? '基础铺垫' : '进阶交锋';
      s.intentCost = s.learningTier === 'low' ? (s.threshold===0?0:3) : 25;
      if(s.learningTier==='low'&&!s.passive)s.cooldown=Math.ceil(s.cooldown*1.25);
      if (s.learningTier === 'high') s.threshold = Math.max(45, Math.min(65, s.threshold));
    } else {
      s.tempoRole = s.threshold === 100 ? '决胜专属' : '交锋专属';
      s.intentCost = s.threshold === 100 ? 60 : 25;
    }
  }
  // Protectors and sustained disruption must come online before a finisher.
  const sustained = {
    protect:[40,10], undermine:[55,15],
    'unique-yu':[40,10], 'unique-jin':[40,10], 'unique-ju':[40,10],
    'unique-person-636':[45,15], 'unique-person-668':[35,5],
    'unique-person-368':[40,10], 'unique-he':[50,15],
    'unique-person-396':[50,15], 'unique-person-119':[50,15],
    'unique-person-226':[60,20],
  };
  for (const [id,[threshold,intentCost]] of Object.entries(sustained))
    Object.assign(book[id],{threshold,intentCost,tempoRole:'持续专属'});
  // Basic resource transfer pays a small cost, while ordinary setup can keep
  // operating without consuming the resource needed for advanced tactics.
  for (const id of ['rally','supply','boarding']) book[id].intentCost=5;
  for (const s of Object.values(book)) {
    s.tempoDescription = s.passive ? '常驻光环，不主动施放、不消耗战意'
      : `${s.tempoRole}；战意门槛 ${s.threshold}，施放消耗 ${s.intentCost}；施放后 ${TACTIC_RECOVERY_STEPS} 步才能再次施放其他战法，期间可普攻`;
    s.description += '；' + s.tempoDescription;
  }
}
