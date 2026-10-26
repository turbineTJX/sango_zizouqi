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
export function activityByFaction(nodes,key,throughSequence=Infinity){
 const bucket=index(nodes).faction.get(key)||[];if(throughSequence===Infinity)return bucket.slice();let low=0,high=bucket.length;
 while(low<high){const mid=(low+high)>>>1;if(bucket[mid].sequence<=throughSequence)low=mid+1;else high=mid;}
 return bucket.slice(0,low);
}
export const activityByDay=(nodes,key)=>(index(nodes).day.get(key)||[]).slice();
// Validated ledgers append in nondecreasing day order. Select a recent window
// without walking the full retained history; return a detached array as above.
export function activitySinceDay(nodes,day){
 let low=0,high=nodes.length;
 while(low<high){const mid=(low+high)>>>1;if(nodes[mid].day<day)low=mid+1;else high=mid;}
 return nodes.slice(low);
}
