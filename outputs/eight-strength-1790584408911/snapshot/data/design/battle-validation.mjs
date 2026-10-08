// Diagnostic comparisons: identical officers/levels/total troops within a pair.
// Seeds are fixed before observation; validation seeds are a separate batch.
const own=['cao','liao','chu','jia','dun','yu'];
const enemy=['shao','yan','wen','he','ju','tian'];
const team=(ids,types,troops=Array(6).fill(3000))=>ids.map((id,i)=>({id,type:types[i],troops:troops[i],level:5}));
const baseline={battleKind:'field',terrain:'land',seed:810001,limit:360,shieldPercent:0,waves:[],
 ownTeam:team(own,['spear','cavalry','halberd','crossbow','spear','halberd']),
 enemyTeam:team(enemy,['spear','archer','archer','crossbow','crossbow','halberd']),
 ownTeamRoles:{leader:'cao',advisor:'jia',deputy:null},enemyTeamRoles:{leader:'shao',advisor:'ju',deputy:null},
 ownTeamTactic:'balanced',enemyTeamTactic:'balanced'};
export const BATTLE_VALIDATION_CASES=[
 {id:'ranged-pressure',name:'远程集中与骑兵应对',question:'同将、同等级、同兵力，更换前排兵种能否改变突破与损耗？',variants:[
  {id:'baseline',draft:baseline},
  {id:'cavalry',draft:{...baseline,ownTeam:team(own,['cavalry','cavalry','halberd','crossbow','cavalry','halberd'])}},
 ]},
 {id:'allocation',name:'均分与主辅分兵',question:'同总兵力下，主核集中与低兵辅助是否提供有效贡献？',variants:[
  {id:'equal',draft:baseline},
  {id:'core',draft:{...baseline,ownTeam:team(own,['spear','cavalry','halberd','crossbow','spear','halberd'],[4000,6000,2000,2000,2000,2000])}},
 ]},
 {id:'terrain',name:'平地与林地',question:'相同双方与学习记录，地形改变了哪些接敌与输出结果？',variants:[
  {id:'land',draft:baseline},{id:'forest',draft:{...baseline,terrain:'forest'}},
 ]},
];
export const BATTLE_VALIDATION_SEEDS={development:[810001,817920,825839,833758],validation:[910001,917920,925839,933758]};
