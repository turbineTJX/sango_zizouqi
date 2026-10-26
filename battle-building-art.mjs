import {battleBuildingArtwork as vectorBuilding} from './battle-environment-art.mjs';
import {townSprite,TOWN_ART,TOWN_SITES} from './town-art.mjs';
const loaded=new Set(),failedURLs=new Set();

// Reuse the existing detailed town artwork by stable ID. Loading and failure
// only change this visual layer; the physical building and its button stay put.
export function battleBuildingArtwork(g){
 const fallback=vectorBuilding(g),key=g.type==='gate'?'walls':g.kind;
 const available=['arrowTower','musicStage','aidCamp'].includes(key)?TOWN_ART[key]:TOWN_ART.buildings;
 if(g.hp<=0||g.level===0&&g.type!=='gate'||!TOWN_SITES[key]||!available||failedURLs.has(available))return fallback;
 const painted=townSprite(key,{x:0,y:19,width:126,id:'battle-'+(g.id||key),extraClass:g.hp<g.maxHp*.5?'battle-building-damaged':''});
 if(!painted)return fallback;
 return fallback.replace('aria-hidden="true">',`aria-hidden="true" data-painted-building="${loaded.has(available)?'ready':'loading'}"><g class="battle-building-fallback">`).replace('</svg>',`</g><g class="battle-building-painted">${painted}</g></svg>`);
}
export function decorateBattleBuildings(root=document){
 for(const svg of root.querySelectorAll('[data-painted-building="loading"]')){
  if(svg.dataset.artListening)continue;svg.dataset.artListening='true';
  const images=[...svg.querySelectorAll('.battle-building-painted image')];let remaining=images.length,failed=false;
  for(const image of images){
   image.addEventListener('load',()=>{loaded.add(image.getAttribute('href'));if(!--remaining&&!failed)svg.dataset.paintedBuilding='ready';},{once:true});
   image.addEventListener('error',()=>{failed=true;failedURLs.add(image.getAttribute('href'));svg.dataset.paintedBuilding='failed';},{once:true});
  }
 }
}
