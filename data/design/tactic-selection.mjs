// Deterministic preferences use base attributes and personality, never battle
// buffs, level or random seed. Pool order breaks equal scores.
export const TACTIC_SELECTION_RULES=Object.freeze({roleBonus:24});
export const tacticPrimaryCategory=o=>['force','intellect','politics'].sort((a,b)=>(o[b]??0)-(o[a]??0))[0];
export const TACTIC_STAT_PREFERENCES={
 fire:{force:.2},suppress:{leadership:.2},pierce:{force:.1,leadership:.1},
 ward:{intellect:.2},cleanse:{politics:.2,charm:.1},
 curse:{intellect:.2,politics:.1},disarm:{leadership:.2,force:.1},seal:{intellect:.25,politics:.1},
 bodyguard:{leadership:.2,charm:.1},taunt:{force:.1,intellect:.1},
 rally:{charm:.2,politics:.1},relay:{intellect:.1,charm:.2},
 scout:{politics:.2,leadership:.15},extendRange:{leadership:.25,intellect:.1},
 blight:{intellect:.25,force:.1},tremor:{leadership:.2,force:.1},cutRange:{intellect:.2,politics:.1},
 boarding:{charm:.25,leadership:.1},quench:{politics:.2,intellect:.15},mirage:{intellect:.2,politics:.1},chain:{intellect:.2,politics:.1},
 breakFormation:{leadership:.25,politics:.1},
};
export const TACTIC_ROLE_GROUPS={
 assault:['fire','pierce','valor','gallop','thrust','cleave','rush','scatter','repeat','siegeVolley','ram','bombard','emplace','navalRam','broadside','anchor','qingzhou-fight','halberd-shift','tiger-charge','horse-volley','longbow-shot'],
 guard:['phalanx','bulwark','bodyguard','antiMagic','riposte','baier-guard','rattan-wall','screen','cleanse','retreatShot'],
 control:['ward','curse','disarm','bind','seal','suppress','harass','cutRange','chain','blight','tremor','doubt','smoke','lure','wildfire','plague','undertow','breakFormation'],
 support:['rally','cleanse','relay','screen','purify','boarding','quench','bandage','camp','regrowth','quickAttack','bodyguard','relief','fortify','regroup','stockpile','refit','baier-guard'],
};
