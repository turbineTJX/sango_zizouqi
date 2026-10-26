import {metropolitanRegions,regionContains} from './metropolitan-region-data.mjs';
import {ATLAS_COAST,atlasPoint} from './data/design/ancient-atlas.mjs';
import {RIVERS,LAKES} from './national-geography.mjs';
import TECHNOLOGIES from './data/design/technologies.mjs';

const coast=ATLAS_COAST.map(atlasPoint);
const radii=Object.fromEntries(TECHNOLOGIES.records.map(t=>[t.id,t.parameters.visionRadius]));
const polygonContains=(polygon,p)=>{
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const [x,y]=polygon[i],[a,b]=polygon[j];
  if((y>p.y)!==(b>p.y)&&p.x<(a-x)*(p.y-y)/(b-y)+x)inside=!inside;
 }
 return inside;
};
const lakes=LAKES.map(l=>[...l.d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(m=>[+m[1],+m[2]]));
export function watchtowerLand(p){
 if(!polygonContains(coast,p)||lakes.some(l=>polygonContains(l,p)))return false;
 return !RIVERS.some(r=>r.points.some((a,i)=>{
  if(!i)return false;const b=r.points[i-1],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy)<r.width/2+2;
 }));
}
export function watchtowerPositionValid(s,c,p){
 const region=metropolitanRegions(s).find(r=>r.id===p?.siteId&&r.ownerId===c.id);
 return !!region&&Object.keys(p).sort().join(',')==='siteId,x,y'&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&regionContains(region,p)&&watchtowerLand(p)&&
  [...s.cities,...(s.junctions||[])].every(n=>Math.hypot(p.x-n.x,p.y-n.y)>=(n.kind==='city'?n.citySize==='large'?18:13:7));
}
// Called only on actual construction, using public geography and saved RNG.
export function ensureWatchtowerPosition(s,c,draw){
 if(!s.campaign.scenarioId||c.domestic.watchtowerPosition)return c.domestic.watchtowerPosition;
 const regions=metropolitanRegions(s).filter(r=>r.ownerId===c.id),candidates=[];
 for(const r of regions){
  const [left,top,right,bottom]=r.bounds;let found=false;
  for(let i=0;i<192;i++){
   const p={siteId:r.id,x:Math.round((left+draw()*(right-left))*100)/100,y:Math.round((top+draw()*(bottom-top))*100)/100};
   if(watchtowerPositionValid(s,c,p)){candidates.push(p);found=true;break;}
  }
  // Narrow coastal cells can evade bounded random sampling. Search near the
  // public settlement anchor before declaring that region unavailable.
  if(!found){const node=[...s.cities,...(s.junctions||[])].find(n=>n.id===r.id);
   search:for(const radius of [10,16,22,30])for(let angle=0;angle<360;angle+=20){
    const a=angle*Math.PI/180,p={siteId:r.id,x:Math.round((node.x+Math.cos(a)*radius)*100)/100,y:Math.round((node.y+Math.sin(a)*radius)*100)/100};
    if(watchtowerPositionValid(s,c,p)){candidates.push(p);break search;}
   }
  }
 }
 if(!candidates.length)return null;
 c.domestic.watchtowerPosition=candidates[Math.min(candidates.length-1,Math.floor(draw()*candidates.length))];
 return c.domestic.watchtowerPosition;
}
export function regionalWatchtower(c){
 const p=c.domestic?.watchtowerPosition;if(!p)return null;
 const built=c.domestic.techs.includes('watchtower'),research=c.domestic.research;
 if(!built&&research?.type!=='watchtower')return null;
 const a=c.buildings?.watchtower?.[c.id]||{hp:0,maxHp:0};
 return {cityId:c.id,name:c.name,owner:c.owner,...p,hp:a.hp,maxHp:built?a.maxHp:1000,
  radius:built&&a.hp>0?Math.max(0,...c.domestic.techs.map(id=>radii[id]||0)):0,
  phase:built?a.hp>0?'active':'damaged':'construction',progress:built?100:research.progress};
}
