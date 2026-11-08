import {HISTORICAL_GEOGRAPHY_DESIGN as DESIGN} from './data/design/historical-geography.mjs';
import {ATLAS_PORT_WATERS} from './data/design/atlas-cities.mjs';
import {RIVERS,LAKES,isLandPoint,isLakePoint,isWaterPoint,nearestWaterPoint} from './national-geography.mjs';
export function historicalGeographyIssues(places,roads=null,{pointOnRoad}={}){
 const issues=[],byId=new Map(places.map(n=>[n.id,n]));
 for(const p of places){
  if(!isLandPoint(p.x,p.y)||isWaterPoint(p))issues.push({kind:'settlement-in-water',id:p.id,name:p.name});
  if(p.kind==='port'){const bank=nearestWaterPoint(p,ATLAS_PORT_WATERS[p.id]),clearance=bank.distance-bank.width/2;
   if(!ATLAS_PORT_WATERS[p.id]||clearance<1.9||clearance>2.7)issues.push({kind:'port-bank',id:p.id,name:p.name,water:ATLAS_PORT_WATERS[p.id],clearance});}
 }
 for(const [id,attrs] of Object.entries(DESIGN.places))for(const [key,value] of Object.entries(attrs))if(byId.has(id)&&byId.get(id)[key]!==value)issues.push({kind:'place-identity',id,key,expected:value,actual:byId.get(id)[key]});
 for(const relation of DESIGN.relations)if(relation.ids.every(id=>byId.has(id)))for(let i=1;i<relation.ids.length;i++)if(byId.get(relation.ids[i-1])[relation.axis]>=byId.get(relation.ids[i])[relation.axis])issues.push({kind:'regional-order',name:relation.name,from:relation.ids[i-1],to:relation.ids[i]});
 for(const [lake,rivers] of Object.entries(DESIGN.lakeRivers)){
  if(!LAKES.some(l=>l.name===lake))issues.push({kind:'missing-lake',name:lake});
  for(const id of rivers)if(!RIVERS.some(r=>r.id===id))issues.push({kind:'missing-tributary',id,lake});
 }
 if(roads)for(const {port,city,closed} of DESIGN.portApproaches){const has=id=>roads.some(e=>e.includes(port)&&e.includes(id));if(!has(city)||has(closed))issues.push({kind:'wrong-port-approach',port,city,closed});}
 if(roads&&pointOnRoad)for(const [a,b] of roads){const from=byId.get(a),to=byId.get(b);if(from.kind==='port'&&to.kind==='port')continue;
  if(Array.from({length:129},(_,i)=>pointOnRoad(from,to,i/128)).some(p=>isLakePoint(p)))issues.push({kind:'land-road-through-lake',from:from.name,to:to.name,a,b});
 }
 return issues;
}
