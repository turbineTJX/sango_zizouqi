// Initial tuning; all camps, names, rolls and strength snapshots are saved.
export const BANDIT_RULES=Object.freeze({version:1,maximumCamps:24,nodeDensity:3,minGenerals:1,maxGenerals:3,minTroops:400,maxTroops:800,abilityMinimum:.75,abilityMaximum:.9,goldMinimum:300,goldMaximum:650,grainMinimum:900,grainMaximum:1800,talentChance:.15,aiAdvantage:1.35,aiMaximumUnits:3,aiMaximumDays:20,aiReserveUnits:1});
export const BANDIT_NAMES=Object.freeze({surnames:['石','孟','杜','牛','雷','鲁','丁','韩','白','彭','秦','侯','邢','邹','崔','田','魏','范','任','严','伍','耿'],given:['虎','豹','彪','勇','雄','岳','猛','山','海','平','兴','烈','刚','胜','毅','林','锋','达','武','远','安','忠'],courtesy:['仲','伯','子','季']});
export default {schemaVersion:1,id:'bandits',name:'固定贼寨与随机贼将',integration:'integrated',records:[{id:'rules',...BANDIT_RULES}]};
