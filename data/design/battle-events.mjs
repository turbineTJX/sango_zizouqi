// Shared, editable standalone events. Durations are combat steps (24 per day).
export const BATTLE_EVENT_DESIGNS={
 'supply-cut':{name:'断粮',duration:192,statuses:['hunger'],hunger:3,description:'复用大地图现有重度缺粮效果：攻击、武技威力、谋略威力与营务威力降低35%，无法镇静。独立战役按日期抽象粮道中断，生效期间抵达的援军同样受影响。'},
 ambush:{name:'伏兵突袭',duration:24,statuses:['confuse','disrupted'],description:'对当前在场部队施加混乱和失阵，按共同免疫与解除规则处理；不直接扣兵，不影响后备或未到援军。'}
};
