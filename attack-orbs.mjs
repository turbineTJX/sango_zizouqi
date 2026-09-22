// One active enchantment per unit. Charges belong to landed basic attacks against
// troops, never multi-hit tactics, retaliation, DOT or attacks against a gate.
export const ATTACK_ORBS=Object.freeze({
  fire:Object.freeze({charges:3,bonus:.35,status:'burn',steps:6,color:'#ffac68',name:'火矢',description:'每次普攻附加武技伤害，并叠加一层灼烧（最多 3 层，刷新 6 日）。灼烧伤害与命中时的武技威力有关，受军纪抵御；额外威力与灼烧受目标地形影响'}),
  suppress:Object.freeze({charges:3,bonus:.25,status:'slow',steps:6,color:'#9edce7',name:'阻射',description:'每次普攻附加武技伤害，命中后使目标移速降低 50%，持续 6 日；减速幅度随装填时武技威力增长'}),
  pierce:Object.freeze({charges:3,bonus:.25,status:'armorBreak',steps:8,color:'#e5c681',name:'破甲',description:'每次普攻附加武技伤害，命中后使目标防御降低 20%，持续 8 日；降防幅度随装填时武技威力增长，不叠加层数'}),
  curse:Object.freeze({charges:3,bonus:0,status:'despair',steps:10,color:'#ca9add',name:'挫志',description:'这几次普攻改用谋略伤害，受军纪抵御；命中后使目标丧志10日，每步损失5战意，不叠层，可镇静解除'}),
});
export const attackOrbDescription=id=>`装填 ${ATTACK_ORBS[id].charges} 次强化普攻，本次不直接攻击。${ATTACK_ORBS[id].description}。次数不随时间消耗；同队只保留一种强化，用完前不重复装填，不叠加其他附着型普攻效果；战法、反击和攻城门不消耗次数`;
