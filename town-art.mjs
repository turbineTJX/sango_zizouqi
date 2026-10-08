// Original generated artwork; each atlas cell is an independently rendered facility.
export const TOWN_ART={background:'./assets/town/han-town-background.png',buildings:'./assets/town/han-buildings-transparent.png',construction:'./assets/town/han-construction.png',arrowTower:'./assets/town/han-arrowTower-v2.png',musicStage:'./assets/town/han-musicStage-v1.png',aidCamp:'./assets/town/han-aidCamp-v1.png'};
export const TOWN_TERRAINS=Object.fromEntries(['plain','mountain','river','frontier'].map(region=>[region,'./assets/town/han-terrain-'+region+'.webp']));
export const TOWN_FOUNDATIONS=Object.fromEntries(['large','small','gate','port'].map(kind=>[kind,'./assets/town/han-space-'+kind+'.webp']));
export const TOWN_FRAME={x:-260,y:-183,width:520,height:1040/3};
export const TOWN_SITES={
 commerce:{cell:[0,0],x:-133,y:52,width:124},
 farm:{cell:[1,0],x:45,y:134,width:140},
 granary:{cell:[2,0],x:137,y:22,width:105},
 workshop:{cell:[0,1],x:151,y:80,width:102},
 barracks:{cell:[1,1],x:42,y:40,width:115},
 clinic:{cell:[2,1],x:-91,y:-25,width:100},
 drill:{cell:[0,2],x:168,y:143,width:96},
 walls:{cell:[1,2],x:-47,y:98,width:137},
 hall:{cell:[2,2],x:72,y:-42,width:116},
 arrowTower:{x:-186,y:65,width:62},
 musicStage:{x:165,y:-22,width:65},
 aidCamp:{x:-148,y:126,width:65}
};
export function townSprite(key,{x=0,y=0,width=100,opacity=1,extraClass='',id=key}={}){
 if(['arrowTower','musicStage','aidCamp'].includes(key))return militaryFacilitySprite(key,{x,y,width,opacity,extraClass});
 const [col,row]=TOWN_SITES[key].cell;
 // The painted rows have slightly different heights; keep neighboring art out.
 const crop=[{y:0,height:390/418},{y:390/418,height:395/418},{y:785/418,height:469/418}][row];
 const prefix='town-'+id.replace(/[^a-zA-Z0-9_-]/g,'_');
 return `<g class="town-building-sprite ${extraClass}" transform="translate(${x-width/2} ${y-width*.83}) scale(${width})" opacity="${opacity}" aria-hidden="true" pointer-events="none"><defs><clipPath id="${prefix}-clip"><rect width="1" height="1"/></clipPath></defs><g clip-path="url(#${prefix}-clip)"><image href="${TOWN_ART.buildings}" x="${-col}" y="${-crop.y/crop.height}" width="3" height="${3/crop.height}" preserveAspectRatio="none"/></g></g>`;
}
// Independently generated, transparent facilities in the same town palette.
function militaryFacilitySprite(key,{x,y,width,opacity,extraClass}){
 const baseline={arrowTower:.93,musicStage:.95,aidCamp:.78}[key];
 return `<g class="town-building-sprite town-facility-${key} ${extraClass}" opacity="${opacity}" aria-hidden="true" pointer-events="none"><image href="${TOWN_ART[key]}" x="${x-width/2}" y="${y-width*baseline}" width="${width}" height="${width}" preserveAspectRatio="xMidYMid meet"/></g>`;
}
