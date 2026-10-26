import {mapNode} from './map-node-data.mjs';
import {MOVEMENT_RULES as RULES} from './data/design/movement-rules.mjs';
const edge=(a,b)=>a<b?a+':'+b:b+':'+a;
const segment=(s,a,b)=>s.roadSegments?.[edge(a,b)];
const scopes=new WeakMap(),projections=new WeakMap();
// Intelligence keeps public map geometry. Share only that geometry during the
// originating read scope; no ownership, permissions, stock or army is cached.
export function inheritRoadMetricQueries(origin,view){projections.set(view,origin);return view;}
// Geometry is immutable only for this synchronous read query. Nothing survives
// a return to game execution, where roads, ownership and blockades can change.
export function withRoadMetricQueries(s,evaluate){
 if(scopes.has(s))return evaluate();
 scopes.set(s,scopes.get(projections.get(s))||{edges:new Set(s.roads.map(([a,b])=>edge(a,b))),nodes:new Map([...s.cities,...(s.junctions||[])].map(n=>[n.id,n])),variants:new Map()});
 try{return evaluate();}finally{scopes.delete(s);}
}
function variants(s,a,b){
 const scope=scopes.get(s),key=edge(a,b);if(scope?.variants.has(key))return scope.variants.get(key);
 const value=calculateRoads(s,a,b);scope?.variants.set(key,value);return value;
}
export const roadDistance=(s,a,b)=>segment(s,a,b)?.distance??Math.max(RULES.distance.minimum,Math.round(Math.hypot(mapNode(s,a).x-mapNode(s,b).x,mapNode(s,a).y-mapNode(s,b).y)*RULES.distance.coordinateScale));
function calculateRoads(s,a,b){
 const scope=scopes.get(s);
 if(scope?!scope.edges.has(edge(a,b)):!s.roads.some(([x,y])=>x===a&&y===b||x===b&&y===a))return [];
 const x=scope?.nodes.get(a)||mapNode(s,a),y=scope?.nodes.get(b)||mapNode(s,b),distance=roadDistance(s,a,b),data=segment(s,a,b);
 const terrain=x.kind==='port'&&y.kind==='port'?'water':x.kind==='gate'||y.kind==='gate'?'mountain':'land';
 return Object.entries(RULES.roadVariants).map(([id,r])=>({id,name:data?.trail?'乡野小路':r.names[terrain],cost:Math.ceil(distance*r.costFactors[terrain]*(data?.costFactor||1)),terrain,offset:r.offset}));
}
export function campaignRoads(s,a,b){return variants(s,a,b).map(r=>({...r}));}
const selectRoad=(roads,policy)=>policy==='auto'?roads.reduce((best,r)=>!best||r.cost<best.cost?r:best,null):roads.find(r=>r.id===policy);
export function chosenRoad(s,a,b,policy='auto'){const value=selectRoad(variants(s,a,b),policy);return value?{...value}:value;}
export const roadCost=(s,a,b,policy='auto')=>selectRoad(variants(s,a,b),policy)?.cost??Infinity;
