import {RIVERS,MOUNTAINS} from './national-geography.mjs';
import {TOWN_SITES} from './town-art.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=n=>Math.round(n*100)/100;
const hash=text=>[...text].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
// Art-space anchors: supplies lie beside the road at passes and on land at ports.
const SPACE_SITES={
 large:{commerce:[-78,2,88],farm:[188,158,110],granary:[97,7,82],workshop:[91,76,76],barracks:[5,83,84],clinic:[-88,77,72],drill:[125,127,72],walls:[0,141,98],hall:[6,-53,92]},
 small:{commerce:[-66,4,76],farm:[186,146,106],granary:[74,8,76],workshop:[84,68,66],barracks:[9,63,72],clinic:[-69,63,63],drill:[126,112,63],walls:[-9,136,88],hall:[3,-48,79]},
 gate:{commerce:[-80,36,72],farm:[173,155,100],granary:[103,19,80],workshop:[96,88,72],barracks:[-90,104,77],clinic:[-93,-16,65],drill:[121,145,70],walls:[0,-73,128],hall:[88,-40,68]},
 port:{commerce:[73,-6,86],farm:[184,139,105],granary:[121,39,86],workshop:[109,99,70],barracks:[41,111,70],clinic:[-18,22,64],drill:[157,150,68],walls:[25,156,80],hall:[24,-47,78]}
};
function nearestLine(point,lines){
 let best={distance:Infinity,x:0,y:0};
 for(const line of lines)for(let i=1;i<line.points.length;i++){
  const [ax,ay]=line.points[i-1],[bx,by]=line.points[i],dx=bx-ax,dy=by-ay;
  const t=clamp(((point.x-ax)*dx+(point.y-ay)*dy)/(dx*dx+dy*dy||1),0,1),x=ax+dx*t,y=ay+dy*t,distance=Math.hypot(point.x-x,point.y-y);
  if(distance<best.distance)best={distance,x,y};
 }
 return best;
}
// Geometry and identity only: ownership, simulation RNG and building levels cannot move a city.
export function townLayout(place){
 const seed=hash(place.id),river=nearestLine(place,RIVERS),mountain=nearestLine(place,MOUNTAINS);
 const region=place.kind==='port'?'river':place.province==='凉州'?'frontier':place.kind==='gate'||mountain.distance<20||['益州','南中'].includes(place.province)?'mountain':river.distance<22||['扬州','荆南','交州'].includes(place.province)?'river':'plain';
 const kind=['gate','port'].includes(place.kind)?place.kind:place.citySize==='large'?'large':'small';
 const footprint=place.kind==='gate'?.58:place.kind==='port'?.65:place.citySize==='small'?.72:1;
 const flip=region==='river'?river.x>place.x:!!(seed&1),spreadX=.88+(seed%5)*.025,spreadY=.84+((seed>>>4)%5)*.035;
 const sites=Object.fromEntries(Object.entries(TOWN_SITES).map(([key,site])=>{
  const local=hash(place.id+':'+key),jitterX=(local%17)-8,jitterY=((local>>>8)%13)-6;
  const [baseX,baseY,width]=SPACE_SITES[kind][key];
  const x=baseX*(flip?-1:1)*spreadX+jitterX*.6,y=baseY*spreadY+jitterY*.6;
  return [key,{...site,x:round(x),y:round(y),width:round(width*(.96+(local%5)*.012))}];
 }));
 return {kind,region,flip,mapScale:round(.13*footprint),sites};
}
