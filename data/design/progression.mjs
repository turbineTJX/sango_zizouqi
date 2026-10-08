// Contribution conversion and marginal costs from each level to the next.
export const MERIT_RULES=Object.freeze({
 maxLevel:10,domestic:60,workDays:10,governor:60,governorMinimum:30,
 battleDivisor:60,winFactor:1.25,
 battleWeights:Object.freeze({damage:1,taken:.35,healing:1.2,siege:.5,protection:.35,support:100,control:150}),
 costs:Object.freeze([100,300,600,1000,1500,2100,2800,3600,4500]),
 changeFactionRetention:.2,
 failures:Object.freeze({domestic:20,construction:10,constructionMaximum:30,talent:10,talentProject:40,battle:20,command:60,severeCommand:120,destroyedCommand:180,transportMinimum:20,transportMaximum:80}),
 scouting:Object.freeze({information:20,watchPerDay:4,maximumPerTurn:60,freshDays:3}),
 diplomacy:Object.freeze({effective:30,fulfilled:60,majorFulfilled:120,refused:10}),
 transport:Object.freeze({minimum:20,minimumValue:100,maximum:60,valuePerMerit:50,maximumPerTurn:60,reliefFactor:1.5,values:Object.freeze({gold:1,grain:.13,manpower:.34})}),
 talentSigned:30,
});
