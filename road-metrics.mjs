import {mapNode} from './map-node-data.mjs';
import {MOVEMENT_RULES as RULES} from './data/design/movement-rules.mjs';
const segment=(s,a,b)=>s.roadSegments?.[[a,b].sort().join(':')];
export const roadDistance=(s,a,b)=>segment(s,a,b)?.distance??Math.max(RULES.distance.minimum,Math.round(Math.hypot(mapNode(s,a).x-mapNode(s,b).x,mapNode(s,a).y-mapNode(s,b).y)*RULES.distance.coordinateScale));
export function campaignRoads(s,a,b){
 if(!s.roads.some(([x,y])=>x===a&&y===b||x===b&&y===a))return [];
 const x=mapNode(s,a),y=mapNode(s,b),distance=roadDistance(s,a,b),data=segment(s,a,b);
 const terrain=x.kind==='port'&&y.kind==='port'?'water':x.kind==='gate'||y.kind==='gate'?'mountain':'land';
 return Object.entries(RULES.roadVariants).map(([id,r])=>({id,name:data?.trail?'乡野小路':r.names[terrain],cost:Math.ceil(distance*r.costFactors[terrain]*(data?.costFactor||1)),terrain,offset:r.offset}));
}
export function chosenRoad(s,a,b,policy='auto'){const roads=campaignRoads(s,a,b);return policy==='auto'?roads.reduce((best,r)=>!best||r.cost<best.cost?r:best,null):roads.find(r=>r.id===policy);}
export const roadCost=(s,a,b,policy='auto')=>chosenRoad(s,a,b,policy)?.cost??Infinity;
