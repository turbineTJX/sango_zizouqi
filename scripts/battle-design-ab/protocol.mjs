// Local effect-design experiment. This is not battle-policy protocol 2 or an adoption gate.
export const PROTOCOL = {
  version: 1, id: 'battle-design-ab-20261102', budgetHours: 8,
  compatibility: 'Both arms retain unused original effect definitions for existing strategic-table references; both use identical narrow bridges for ordinary stun/control protection, magic-immunity cleansing and optional thrust impact control. These bridges are inactive for arm A.',
  purpose: 'Compare three bounded effect alternatives using the real shared engine; measure decision sensitivity, actual interaction and counterplay, not a numerical fun score.',
  developmentSeeds: [112021,112029], validationSeeds: [912101,912113,912131,912149],
  sides: [0,1], layouts: ['compact','spread'], limit: 480, level: 10, troops: 18000,
  allowedChanges: ['engine.mjs','tactic-power.mjs','data/design/tactics.mjs'],
  frozen: ['battle AI and command priorities','officers, bonds, traits, maps, progression and costs','starting troops, equipment, appointments and fixed pools','all judges and existing tests'],
  metrics: ['result and remaining troop margin','opening-layout sensitivity','first special and first rout','actual hard-control unit-ticks and longest consecutive lock','actual magic-immunity unit-ticks and attack opportunities during it','skill casts, impact damage, setup triggers, interruptions and empty hits'],
  interpretation: 'All results are local exploratory evidence. Retain losses and zero opportunities. No automatic promotion, no full-game or human-fun acceptance, no assumption that additional power means more fun.',
  reviewSelection: 'First validation seed, side 0, compact own and compact opposition, each registered family/context; keep every selected A/B pair regardless of outcome.',
};
export const FAMILIES = {
  control: {name:'普通控制',A:'挑衅：远距牵制',B:'眩晕：近距短控',contexts:['physical','ranged'],core:'关羽',
    team:[['关羽','spear',5000],['法正','spear',2000],['邓芝','archer',2000],['廖化','spear',3000],['周仓','halberd',3000],['严颜','archer',3000]],
    question:'近距短眩晕能否给主核创造机会，同时保留远距挑衅的独立用途？',
    patch:{ward:{name:'眩晕',effect:'status',statusKey:'stun',mode:'attack',range:2,steps:2,description:'实验：2格内一队敌军短眩晕2回合；沿共同成败、坚定、魔免与受控保护结算。保留原门槛、冷却与次数。'}}},
  protection: {name:'普通防护',A:'方阵：长减伤、定点',B:'魔免：短保护、可行动',contexts:['physical','casters'],core:'赵云',
    team:[['赵云','spear',5000],['曹仁','spear',3000],['于禁','spear',3000],['邓芝','archer',2000],['李典','archer',2000],['甄氏','archer',3000]],
    question:'3回合自身魔免与8回合方阵是否形成对手依赖的取舍？魔免保留现有完整语义，包含物理战法免疫。',
    patch:{phalanx:{name:'魔免',effect:'status',statusKey:'magicImmune',mode:'support',range:0,steps:3,description:'实验：自身解除战斗异常（保留缺粮），获得3回合魔免，仅承受物理普攻；可行动。保留原门槛、冷却与次数，替换方阵。'}}},
  burst: {name:'强力组合',A:'贯阵：完整穿透伤害',B:'震阵：伤害降25%＋短眩晕',contexts:['physical','ranged'],core:'乐进',
    team:[['乐进','spear',5000],['关平','spear',3000],['于禁','spear',3000],['廖化','spear',3000],['邓芝','archer',2000],['陈群','archer',2000]],
    question:'保留同一贯穿形状、蓄势和选敌，以25%直接伤害换取2回合眩晕，是否提高配合与站位价值？',
    patch:{thrust:{name:'震阵',scale:0.75,control:'stun',steps:2,description:'实验：原贯阵锁定格与蓄势不变，直接伤害降低25%；命中后对存活目标尝试眩晕2回合，沿共同成败及受控保护。'}}},
};
export const CONTEXTS = {
  physical:{name:'混合物理／平原',terrain:'land',mapId:'plain-open',team:[['袁绍','spear',3000],['颜良','cavalry',3000],['文丑','halberd',3000],['张郃','cavalry',3000],['沮授','archer',3000],['田丰','archer',3000]]},
  casters:{name:'火攻谋略／林地',terrain:'forest',mapId:'forest-belt',team:[['周瑜','archer',4000],['陆逊','archer',4000],['郭嘉','archer',3000],['曹洪','halberd',3000],['荀攸','spear',2000],['张昭','archer',2000]]},
  ranged:{name:'远程主核／丘陵',terrain:'hill',mapId:'hill-plateau',team:[['黄忠','longbow',5000],['张郃','cavalry',3000],['太史慈','archer',3000],['程普','spear',3000],['鲁肃','archer',2000],['满宠','spear',2000]]},
};
// Fixed before results: neither arrangement is called an optimum or deliberately bad.
export const POSITIONS = {
  compact:[[4,3],[4,2],[3,3],[4,4],[3,2],[3,4]],
  spread:[[4,1],[4,5],[2,0],[4,3],[2,6],[2,3]],
};
