import {isLandPoint} from './national-geography.mjs';
const overlaps=(a,b,pad)=>a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;
const rect=(site,b,scale)=>({x:site.x+b.x*scale,y:site.y+b.y*scale,w:b.w*scale,h:b.h*scale});
function namedFootprint(site,view,scale){
 const art=site.overviewArtBounds||site.overviewBounds,labelWidth=site.overviewBounds.w;
 const onLand=r=>r.x>=Math.max(0,view.x)&&r.y>=Math.max(0,view.y)&&r.x+r.w<=Math.min(1024,view.x+view.width)&&r.y+r.h<=Math.min(1024,view.y+view.height)&&[0,.25,.5,.75,1].every(t=>isLandPoint(r.x+r.w*t,r.y)&&isLandPoint(r.x+r.w*t,r.y+r.h));
 for(const labelY of [art.y+art.h+12,art.y-5]){
  const label={x:-labelWidth/2,y:labelY-12,w:labelWidth,h:15};
  if(!onLand(rect(site,label,scale)))continue;
  const x=Math.min(art.x,label.x),y=Math.min(art.y,label.y),w=Math.max(art.x+art.w,label.x+label.w)-x,h=Math.max(art.y+art.h,label.y+label.h)-y;
  return {...rect(site,{x,y,w,h},scale),labelY,labelVisible:true};
 }
 return {...rect(site,art,scale),labelY:art.y+art.h+12,labelVisible:false};
}

// National navigation uses public geography and the current selection only.
// Suppress crowded symbols rather than moving them away from their real node.
export function layoutOverviewSites(sites,{view,scale,selectedId,limit=28}){
 const ordered=sites.filter(s=>s.kind!=='junction'&&(s.primary||s.id===selectedId||s.targetSelected)&&s.x>=view.x&&s.x<=view.x+view.width&&s.y>=view.y&&s.y<=view.y+view.height)
  .sort((a,b)=>Number(!!(b.id===selectedId||b.targetSelected))-Number(!!(a.id===selectedId||a.targetSelected))||a.id.localeCompare(b.id));
 const placed=new Map();
 for(const site of ordered){
  if(placed.size>=limit&&site.id!==selectedId&&!site.targetSelected)continue;
  const r=namedFootprint(site,view,scale);
  if(site.id!==selectedId&&!site.targetSelected&&[...placed.values()].some(p=>overlaps(r,p,9*scale)))continue;
  placed.set(site.id,r);
 }
 return placed;
}

export function regionalSiteOpacity(site,{size,settlements,selectedId,focusMetropolis}){
 if(site.primary||site.id===selectedId||site.targetSelected)return 1;
 const t=Math.max(0,Math.min(1,(720-size)/160)),local=t*t*(3-2*t);
 return Math.max(settlements,site.metropolisId===focusMetropolis?local:0);
}
