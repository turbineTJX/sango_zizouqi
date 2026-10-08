// One active enchantment per unit. Charges belong to landed basic attacks against
// troops, never multi-hit tactics, retaliation, DOT or attacks against a gate.
export const ATTACK_ORBS=Object.freeze({
  fire:Object.freeze({charges:3,bonus:.35,status:'burn',steps:6,color:'#ffac68',name:'火矢',description:'每次普攻附加 0.35 倍武技威力，并叠加一层灼烧（最多 3 层，刷新 6 步）。灼烧每层为命中时武技威力×(6/280＋0.03)，受军纪抵御；额外威力与灼烧受目标地形影响'}),
  suppress:Object.freeze({charges:3,bonus:.25,status:'slow',steps:6,color:'#9edce7',name:'阻射',description:'每次普攻附加 0.25 倍武技威力，命中后使目标移速降低 50%，持续 6 步；减速幅度随装填时武技威力增长'}),
  pierce:Object.freeze({charges:3,bonus:.25,status:'armorBreak',steps:8,color:'#e5c681',name:'破甲',description:'每次普攻附加 0.25 倍武技威力，命中后使目标防御降低 20%，持续 8 步；降防幅度随装填时武技威力增长，不叠加层数'}),
  curse:Object.freeze({charges:3,bonus:0,status:'curse',steps:10,color:'#ca9add',name:'衰咒',description:'这几次普攻改用 1.0 倍谋略威力，受军纪抵御；命中后叠加一层衰咒（最多 3 层，刷新 10 步），每层攻击、谋略威力、军纪降低 6%，幅度随装填时谋略威力增长'}),
});
export const attackOrbDescription=id=>`装填 ${ATTACK_ORBS[id].charges} 次强化普攻，本次不直接攻击。${ATTACK_ORBS[id].description}。次数不随时间消耗；同队只保留一种强化，用完前不重复装填，不叠加其他附着型普攻效果；战法、反击和攻城门不消耗次数`;
