import {playerFaction} from './player-faction.mjs';
import {appendActivityNode} from './activity-nodes.mjs';
import {mapNode} from './map-node-data.mjs';

export const RESOURCE_KEYS=['gold','grain','manpower'];
const zero=()=>({gold:0,grain:0,manpower:0});
export function harvestStocks(s){
 const cities=s.cities.filter(c=>c.owner===playerFaction(s));
 return {gold:cities.reduce((n,c)=>n+c.gold,0),grain:cities.reduce((n,c)=>n+c.grain,0),manpower:cities.reduce((n,c)=>n+c.manpower,0)};
}
export function beginHarvestTurn(s){
 appendActivityNode(s,{sourceId:`harvest-start:${s.turn}:${playerFaction(s)}`,category:'domestic',phase:'harvest-start',faction:playerFaction(s),text:`第${s.turn}旬开始执行。`,result:{turn:s.turn,stocks:harvestStocks(s)}});
}
// A receipt of already applied settlements, stored in the existing daily ledger.
// Direct operations were paid when completed; this function never credits them.
export function finishHarvestTurn(s,cities){
 const faction=playerFaction(s),start=s.campaign.activity.nodes.find(n=>n.sourceId===`harvest-start:${s.turn}:${faction}`);
 const nodes=s.campaign.activity.nodes.filter(n=>n.faction===faction&&n.day>=s.campaign.day-9&&n.day<=s.campaign.day);
 const rows=cities.map(c=>({...c,work:zero()}));
 for(const node of nodes.filter(n=>n.result?.resourceCredit)){
  let row=rows.find(c=>c.id===node.cityId);
  if(!row){row={id:node.cityId,name:mapNode(s,node.cityId).name,credited:zero(),work:zero()};rows.push(row);}
  for(const key of RESOURCE_KEYS)row.work[key]+=node.result.resourceCredit[key];
 }
 const recurring=zero(),work=zero();
 for(const city of rows)for(const key of RESOURCE_KEYS){recurring[key]+=city.credited[key];work[key]+=city.work[key];}
 const stocks=harvestStocks(s),net=start?Object.fromEntries(RESOURCE_KEYS.map(k=>[k,stocks[k]-start.result.stocks[k]])):null;
 const gains=nodes.filter(n=>n.result?.reward||n.category==='talent'&&n.phase==='signed');
 const counts={officers:gains.filter(n=>n.category==='talent'&&n.phase==='signed').length,buildings:gains.filter(n=>n.result?.reward?.kind==='building').length,technologies:gains.filter(n=>n.result?.reward?.kind==='technology').length};
 return appendActivityNode(s,{sourceId:`harvest:${s.turn}:${faction}`,category:'domestic',phase:'harvest',faction,text:`第${s.turn}旬收获：城市产出与直接运营已入库${recurring.gold+work.gold}金、${recurring.grain+work.grain}粮、${recurring.manpower+work.manpower}预备兵；新入麾下${counts.officers}人，完成设施${counts.buildings}处，掌握技术${counts.technologies}项。`,result:{turn:s.turn,recurring,work,stocks,net,cities:rows,counts,nodeIds:gains.map(n=>n.id)}});
}
