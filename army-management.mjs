import {canEquip,validEquipment,equipmentCost} from './troop-equipment.mjs';
import {addCityGold} from './talent-core.mjs';
import {mapNode,isJunction} from './road-network.mjs';
import {playerFaction} from './player-faction.mjs';
import {canEditArmy,changeCampaignTroop,recruitCampaign,splitCampaignArmy,mergeCampaignArmies} from './strategic-campaign.mjs';
import {TACTICS} from './engine.mjs';
import {appointArmyRoles} from './army-appointments.mjs';
export const militarySteps=p=>p.kind==='adjust'?['configure','unit-review','commanders','review']:p.kind==='split'?['select','configure','unit-review','commanders','review']:['select','review'];
export function newMilitaryFlow(s,armyId,kind='purpose'){
 const a=s.armies.find(a=>a.id===armyId);return {armyId,kind,step:kind==='purpose'?'purpose':militarySteps({kind})[0],selected:[],target:null,roles:{leader:a?.leader,advisor:a?.advisor,},units:Object.fromEntries((a?.units||[]).map(u=>[u.id,{type:u.type,equipment:structuredClone(u.equipment),formation:u.formation,first:u.first}])),tactic:a?.tactic};
}
export function previewMilitaryFlow(s,p,{faction=playerFaction(s),scheduled=false,...budget}={}){
 return executeMilitaryFlow(structuredClone(s),p,{faction,scheduled,...budget});
}
export function applyMilitaryFlow(s,p,options={}){
 const preview=previewMilitaryFlow(s,p,options);if(preview.error)return preview;
 return executeMilitaryFlow(s,p,options);
}
function executeMilitaryFlow(s,p,{faction=playerFaction(s),scheduled=false,...budget}={}){
 if(!p||!['adjust','split','merge','recruit'].includes(p.kind))return {error:'军团操作无效'};
 const originalMen=new Map(s.armies.flatMap(a=>a.units.map(u=>[u.id,u.troops])));
 const options={faction,scheduled},next=s,a=next.armies.find(a=>a.id===p.armyId);if(!canEditArmy(next,a,options)||a.faction!==faction)return {error:'军团当前不能调整，请在安全节点的筹划阶段操作'};
 const beforeGold=s.cities.filter(c=>c.owner===faction).reduce((n,c)=>n+c.gold,0),beforeGrain=s.cities.reduce((n,c)=>n+c.grain,0);
 let error,target=a;
 if(p.kind==='split'){error=splitCampaignArmy(next,a.id,p.selected,options);target=next.armies.at(-1);}
 else if(p.kind==='merge'){const b=next.armies.find(a=>a.id===p.target);if(!b||b.units.length+a.units.length>10)return {error:'合并后最多十队，请调整选择'};error=mergeCampaignArmies(next,a.id,p.target,options);}
 else if(p.kind==='recruit'){if(!p.selected.length||p.selected.some(id=>!a.units.some(u=>u.id===id)))return {error:'请选择本军需要整补的部队'};error=recruitCampaign(next,a.id,p.selected,{...options,...budget});}
 if(error)return {error};
 if(['adjust','split'].includes(p.kind)){
  error=appointArmyRoles(target,p.roles);if(error)return {error};
  if(!Object.hasOwn(TACTICS,p.tactic))return {error:'请选择全军策略'};target.tactic=p.tactic;
  for(const u of target.units){const d=p.units[u.id];if(!d||!['front','middle','back','left','right'].includes(d.formation))return {error:'部队配置无效'};error=changeCampaignTroop(next,target.id,u.id,d.type,options);if(error)return {error};if(JSON.stringify(d.equipment)!==JSON.stringify(u.equipment)){const c=mapNode(next,target.location);if(isJunction(next,c.id)||!validEquipment(d.equipment)||['siege','ship'].some(slot=>d.equipment[slot]&&d.equipment[slot]!==u.equipment[slot]&&!canEquip(c,d.equipment[slot])))return {error:'须在掌握技术的己方城市配备装备'};const cost=equipmentCost(d.equipment,u.equipment,u.troops+u.wounded,c);if(c.gold<cost)return {error:'装备费用不足'};addCityGold(next,c,-cost);u.equipment=structuredClone(d.equipment);}u.formation=d.formation;u.first=!!d.first;}
 }
 return {state:next,army:target,gold:beforeGold-next.cities.filter(c=>c.owner===faction).reduce((n,c)=>n+c.gold,0),men:target.units.reduce((n,u)=>n+u.troops-(originalMen.get(u.id)||0),0),grain:beforeGrain-next.cities.reduce((n,c)=>n+c.grain,0)};
}
