// Shared by human-controlled and AI-controlled factions.
export const DIPLOMACY_RULES=Object.freeze({version:1,reviewDays:10,offerDays:20,goldReserve:500,grainReserve:2000,manpowerReserve:1000,feeBudget:600,dailyFare:5,gift:150,giftGain:10,grainBatch:3000,grainPrice:.18,manpowerPrice:.3,loanAmount:500,loanFee:.1,loanDays:60,lightSpeed:70,cargoSpeed:100,captiveSpeed:50,aiMinimumScore:0,aiAssignmentScore:15,aiMaxDiplomats:2,renewalLeadDays:25,contractGraceDays:90,militaryServiceDays:30,militaryBaseDuration:90,militaryGraceDays:20,maximumDuration:360});
export const DIPLOMACY_AI=Object.freeze({routeDayCost:.8,occupationCost:12,activeWorkCost:25,grainLowValue:.65,grainHighValue:2.5,scarceGoldValue:1.35,scarceGoldThreshold:1000,giftBenefit:1.2,loanDiscountDays:600,peaceBaseValue:120,pressurePeaceValue:500,cessionPressureRatio:1.5,cessionPeaceValuePerTroop:.3,cityBaseValue:10000,smallCityBaseValue:4000,cityConnectionValue:3000,superiorityRatio:1.6,peaceOpportunityCost:250,allianceEnemyValue:550,allianceOtherValue:100,aidValuePerTroop:.15,aidCostPerTroop:.08,sharedEnemyPerTroop:.09,aidDayCost:20,creditFloor:.4,judgmentError:.12,abilityPerPoint:.05,feePerPoint:.03,workPerDay:1,cautiousPeaceWeight:1.2,boldPeaceWeight:.85});
export const DIPLOMACY_CITY_EXCHANGE=Object.freeze({minimumMainCities:2,minimumConnectionGain:1});
export const DIPLOMACY_WORK=Object.freeze({resource:{days:5,fee:100},prisoner:{days:6,fee:150},peace:{days:6,fee:150},nonaggression:{days:8,fee:200},trade:{days:8,fee:200},military:{days:8,fee:200},city:{days:30,fee:300},alliance:{days:10,fee:300}});
export const DIPLOMACY_DIRECTIONS=Object.freeze({friendship:{name:'交好',stat:'charm',days:5,fee:100},commerce:{name:'通商',stat:'politics',days:5,fee:100},negotiation:{name:'交涉',stat:'intellect',days:6,fee:150}});
export const DIPLOMACY_GOALS=Object.freeze({auto:'自主判断',friendship:'改善关系',buyGrain:'补充粮食',sellGrain:'补充军费',manpower:'补充预备兵',funding:'筹措借款',prisoners:'救回人才',peace:'减少战线',alliance:'联合抗敌',aid:'争取援军',border:'调整边境',trade:'建立通商',intelligence:'互通情报',renew:'维持条约',withdraw:'协调撤军',terminate:'结束合作'});
export const DIPLOMACY_ACTIONS=Object.freeze({gold:'划付金',grain:'交付粮',manpower:'移交预备兵',city:'移交城池',prisoner:'释放俘虏',intelligence:'提供情报',peace:'结束战争',nonaggression:'互不侵犯',alliance:'建立同盟',trade:'开放经贸额度',restrictAid:'限制军事支持',terminate:'终止约定',envoyPass:'使臣通行',tradePass:'商队通行',militaryPass:'军团借道',station:'准许驻军',supply:'取用补给',declare:'宣战',deploy:'派遣军团',withdraw:'撤出军团',spoils:'战果归属'});
export const DIPLOMACY_STAT_NAMES=Object.freeze({charm:'魅力',politics:'政治',intellect:'智力'});
// Relation requirements are shared by the faction matrix and negotiations.
export const DIPLOMACY_RELATION_TIERS=Object.freeze([
 Object.freeze({minimum:0,multiplier:1.5}),Object.freeze({minimum:40,multiplier:1.2}),
 Object.freeze({minimum:60,multiplier:1.1}),Object.freeze({minimum:80,multiplier:1})
]);
export const DIPLOMACY_RELATION_ACTIONS=Object.freeze({
 friendship:{name:'赠礼',minimum:0},peace:{name:'停战',minimum:0},
 prisoners:{name:'赎俘',minimum:0},exchange:{name:'换俘',minimum:40},
 buyGrain:{name:'购粮',minimum:30},sellGrain:{name:'售粮',minimum:30},
 manpower:{name:'预备兵',minimum:40},trade:{name:'通商',minimum:50},
 funding:{name:'借款',minimum:50},intelligence:{name:'情报',minimum:50},
 alliance:{name:'同盟',minimum:60},aid:{name:'援军',minimum:70},
 border:{name:'换城',minimum:0},renew:{name:'续约',minimum:0},
 withdraw:{name:'撤军',minimum:0},terminate:{name:'解约',minimum:0}
});
