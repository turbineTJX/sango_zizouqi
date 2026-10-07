import {buildingDurability} from './building-durability.mjs';
import TECHNOLOGIES,{TECHNOLOGY_AFFINITIES,TECHNOLOGY_BRANCHES} from './data/design/technologies.mjs';
import {CITY_TECHNOLOGY_PROFILES} from './data/design/city-technologies.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {BUILDING_DESIGNS} from './data/design/buildings.mjs';
export {TECHNOLOGY_AFFINITIES,TECHNOLOGY_BRANCHES};
export const TECHS=Object.freeze(Object.fromEntries(TECHNOLOGIES.records.map(r=>[r.id,{name:r.name,...r.parameters}])));
export const cityHasWater=c=>c?.water===true||(!c?.kind&&['baima','guandu','chenliu','ye'].includes(c?.id));
export const cityTechnologyProfile=c=>CITY_TECHNOLOGY_PROFILES[c?.id];
export const requiredTechnologyBuildingLevel=(c,key,n)=>c?.citySize==='small'&&['commerce','farm','granary'].includes(key)?Math.min(2,n):n;
export const knowsTechnology=(c,id)=>!!c?.domestic?.techs.includes(id);
export const technologyAllowed=(c,id)=>{const t=TECHS[id],p=cityTechnologyProfile(c);return !!t&&!!p&&(!t.affinity||p.affinities.includes(t.affinity))&&(!t.troopId||p.troops.includes(t.troopId));};
export function technologyRequirements(c,id){
 const t=TECHS[id],p=cityTechnologyProfile(c);if(!t||!p)return ['本城不能研究'];
 const reasons=[];
 if(t.affinity&&!p.affinities.includes(t.affinity))reasons.push('需要'+TECHNOLOGY_AFFINITIES[t.affinity]+'资质');
 if(t.troopId&&!p.troops.includes(t.troopId))reasons.push('本城没有'+TROOP_DESIGNS[t.troopId].name+'资质');
 for(const parent of t.prerequisites)if(!knowsTechnology(c,parent))reasons.push('先研究'+TECHS[parent].name);
 for(const [key,n] of Object.entries(t.buildings)){const level=requiredTechnologyBuildingLevel(c,key,n);if((c[key]||0)<level)reasons.push(BUILDING_DESIGNS[key].name+level+'级');}
 if(t.anyBuildings.length&&!t.anyBuildings.some(key=>c[key]>=1))reasons.push(t.anyBuildings.map(key=>BUILDING_DESIGNS[key].name).join('或')+'建成');
 if(t.order&&c.order<t.order)reasons.push('治安≥'+t.order);
 if(t.waterRequired&&!cityHasWater(c))reasons.push('本城有可用水域');
 return reasons;
}
export const canResearch=(c,id)=>!!c?.domestic&&technologyAllowed(c,id)&&!knowsTechnology(c,id)&&technologyRequirements(c,id).length===0;
export const localTechnologies=c=>Object.keys(TECHS).filter(id=>technologyAllowed(c,id));
export const technologyIncomeBonus=(c,key)=>(c?.domestic?.techs||[]).reduce((n,id)=>n+(TECHS[id]?.income[key]||0),0);
export const technologyMilitaryMultiplier=c=>1-(c?.domestic?.techs||[]).reduce((n,id)=>n+(TECHS[id]?.militaryDiscount||0),0);
export const technologyConstructionDiscount=c=>(c?.domestic?.techs||[]).reduce((n,id)=>n+(TECHS[id]?.constructionDiscount||0),0);
export const cityVisionRadius=(c,base)=>buildingDurability(c,'watchtower').hp>0?Math.max(base,...(c?.domestic?.techs||[]).map(id=>TECHS[id]?.visionRadius||0)):base;
export const cityTroopUnlocked=(c,type)=>!!c?.domestic&&!!TROOP_DESIGNS[type]&&(!TROOP_DESIGNS[type].technology||knowsTechnology(c,TROOP_DESIGNS[type].technology));
export const technologyConditionText=(id,c=null)=>{const t=TECHS[id];return [...t.prerequisites.map(p=>TECHS[p].name),...(t.affinity?[TECHNOLOGY_AFFINITIES[t.affinity]+'资质']:[]),...(t.troopId?[TROOP_DESIGNS[t.troopId].name+'资质']:[]),...Object.entries(t.buildings).map(([key,level])=>BUILDING_DESIGNS[key].name+requiredTechnologyBuildingLevel(c,key,level)+'级'),...(t.anyBuildings.length?[t.anyBuildings.map(key=>BUILDING_DESIGNS[key].name).join('或')+'建成']:[]),...(t.order?['治安≥'+t.order]:[]),...(t.waterRequired?['可用水域']:[])].join(' · ')||'无';};
