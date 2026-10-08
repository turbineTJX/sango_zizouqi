// Display-only nearest-city regions. These do not change road control or supply.
export function cityRegion(city,cities){
 let polygon=[[0,0],[1024,0],[1024,1024],[0,1024]];
 for(const other of cities){
  if(other.id===city.id)continue;
  const dx=other.x-city.x,dy=other.y-city.y;
  if(!dx&&!dy)continue;
  const limit=(other.x**2+other.y**2-city.x**2-city.y**2)/2;
  const distance=p=>p[0]*dx+p[1]*dy-limit,next=[];
  for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length],da=distance(a),db=distance(b);
   if(da<=0)next.push(a);
   if((da<=0)!==(db<=0)){const t=da/(da-db);next.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  }
  polygon=next;if(!polygon.length)break;
 }
 return polygon;
}
const cache=new Map();
export function territoryRegions(cities){
 const key=cities.map(c=>`${c.id}:${c.x}:${c.y}`).join('|');
 if(!cache.has(key)){cache.clear();cache.set(key,cities.map(city=>({id:city.id,points:cityRegion(city,cities).map(p=>p.map(n=>n.toFixed(2)).join(',')).join(' ')})));}
 return cache.get(key);
}
