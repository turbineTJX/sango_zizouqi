import {TOWN_FRAME} from './town-art.mjs';
import {townBuildingWidth,townBuildingBaseline} from './town-geometry.mjs';
// Geometry stays in world/model units. Replacing art cannot move hit areas.
export function mapCityDrawCommands(model,season='summer'){
 const {layout}=model,flip=layout.flip?-1:1,commands=[];
 const image=(id,x,y,width,height,alpha=1,mirror=false)=>commands.push({id,x,y,width,height,alpha,flip:mirror?flip:1});
 const groundW=TOWN_FRAME.width*1.4,groundH=TOWN_FRAME.height*1.4;
 image('ground/'+season+'/'+layout.region,-groundW/2,-groundH*.53,groundW,groundH,.58,true);
 const kind=model.kind==='junction'?'prefecture':layout.kind;
 image('foundation/'+kind+(model.gateCondition<.7&&kind!=='prefecture'?'/damaged':''),TOWN_FRAME.x,TOWN_FRAME.y,TOWN_FRAME.width,TOWN_FRAME.height,1,true);
 for(const d of [...(model.districts||[])].sort((a,b)=>layout.sites[a.key].y-layout.sites[b.key].y)){
  const site=layout.sites[d.key];if(!site)continue;const width=townBuildingWidth(site,d.level);
  const building=(dx,dy,w,damage=false)=>{image('building/'+d.key+(damage?'/damaged':''),site.x+dx-w/2,site.y+dy-w*townBuildingBaseline(d.key),w,w);};
  if(d.level>=3)building(-width*.32,-width*.13,width*.53);
  if(d.level>=5)building(width*.29,-width*.15,width*.45);
  if(d.level)building(0,0,width,d.condition<.7);
  if(d.project){const w=width*.85;image('construction',site.x-w*.45,site.y-w*.76,w*.9,w*.9,d.project.paused?.7:1);}
 }
 return commands;
}
