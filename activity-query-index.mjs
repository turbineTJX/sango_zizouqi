// Facts are appended; sourceId, faction and day never change. Read flags and
// result details remain live references. Indexes are derived and never saved.
const indexes=new WeakMap();
function index(nodes){
 let value=indexes.get(nodes);
 if(!value||nodes.length<value.count||nodes[0]!==value.first||value.count&&nodes[value.count-1]!==value.last){
  value={count:0,first:nodes[0],last:null,source:new Map(),faction:new Map(),day:new Map()};indexes.set(nodes,value);
 }
 for(;value.count<nodes.length;value.count++){
  const n=nodes[value.count];if(!value.source.has(n.sourceId))value.source.set(n.sourceId,n);
  for(const key of ['faction','day']){let bucket=value[key].get(n[key]);if(!bucket){bucket=[];value[key].set(n[key],bucket);}bucket.push(n);}
  value.last=n;
 }
 return value;
}
export const activityBySource=(nodes,key)=>index(nodes).source.get(key);
export const activityByFaction=(nodes,key)=>(index(nodes).faction.get(key)||[]).slice();
export const activityByDay=(nodes,key)=>(index(nodes).day.get(key)||[]).slice();
