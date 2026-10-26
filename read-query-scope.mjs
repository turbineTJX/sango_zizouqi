let scope=null;
export function withReadQueries(evaluate){
 if(scope)return evaluate();scope=new WeakMap();
 try{return evaluate();}finally{scope=null;}
}
// Results must be plain data. Detach them so a caller cannot change another
// candidate's cached result. The world and query inputs remain read-only.
export function cachedRead(world,kind,key,evaluate){
 if(!scope)return evaluate();let values=scope.get(world);if(!values){values=new Map();scope.set(world,values);}
 const id=kind+':'+key;if(!values.has(id))values.set(id,evaluate());return structuredClone(values.get(id));
}
