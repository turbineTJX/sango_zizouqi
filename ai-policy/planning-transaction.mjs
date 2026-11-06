// Preserve live city, army and officer references held by callers, including
// movement between containers. This applies only after a whole plan is admitted.
export function installWorld(target,draft){
 const seen=new WeakMap(),claimed=new WeakMap(),officers=new Map([...target.cities.flatMap(c=>c.units),...target.armies.flatMap(a=>a.units),...target.campaign.idle.map(o=>o.unit)].map(u=>[u.id,u]));
 const key=x=>x&&typeof x==='object'?(x.id!==undefined?'id:'+x.id:x.unit?.id?'person:'+x.unit.id:null):null;
 function merge(old,value,path=''){
  if(!value||typeof value!=='object')return value;if(seen.has(value))return seen.get(value);
  if(value.id&&value.troops!==undefined&&(/^(cities|armies)\[\d+\]\.units\[\d+\]$/.test(path)||/^campaign\.idle\[\d+\]\.unit$/.test(path)))old=officers.get(value.id)||old;
  // A prior alias may have been split by planning. Never merge two distinct
  // draft objects into the same old object: JSON reloads have no such aliases.
  if(old&&typeof old==='object'){if(claimed.has(old)&&claimed.get(old)!==value)old=undefined;else claimed.set(old,value);}
  if(Array.isArray(value)){
   const result=Array.isArray(old)?old:[],prior=[...result],byKey=new Map(prior.map(x=>[key(x),x]).filter(([k])=>k));seen.set(value,result);
   result.length=value.length;for(let i=0;i<value.length;i++)result[i]=merge(key(value[i])?byKey.get(key(value[i])):prior[i],value[i],path+'['+i+']');return result;
  }
  const result=old&&typeof old==='object'&&!Array.isArray(old)?old:{};seen.set(value,result);
  for(const k of Object.keys(result))if(!Object.hasOwn(value,k))delete result[k];
  for(const [k,v]of Object.entries(value))result[k]=merge(result[k],v,path?path+'.'+k:k);return result;
 }
 merge(target,draft);
}
