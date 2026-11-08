// Offline compiler: SVG filters, masks and image cropping run here, never on wheel input.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {ASSET_ROOT,PROJECT_ROOT,assetFile} from '../asset-workspace.mjs';
import {applyAssetCatalog} from '../asset-catalog.mjs';
import {ancientAtlasTerrain} from '../ancient-atlas-terrain.mjs';
import {renderRoads} from '../strategic-movement.mjs';
import {newCampaign} from '../strategic-campaign.mjs';
import {prefectureVillageMarkup} from '../prefecture-village.mjs';
import {TOWN_SITES,townSprite} from '../town-art.mjs';
import {townBuildingBaseline} from '../town-geometry.mjs';
import {LAND_PATH,RIVERS,LAKES,polyline} from '../national-geography.mjs';
import {MAP_GPU_PROFILE,validateMapGPUManifest} from '../map-gpu-assets.mjs';
import {mapGPUGeometry} from '../map-gpu-geometry.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const seasons=['spring','summer','autumn','winter'],layers=['base','landscape','relief','foreground'];
export async function mapBuildInput(root=ASSET_ROOT){
 const catalog=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));applyAssetCatalog(catalog);
 const terrain=Object.fromEntries(seasons.map(season=>[season,ancientAtlasTerrain(season)]));
 const roads=renderRoads(newCampaign(81,'guandu-200'));
 const css=(await Promise.all(['ui-tokens.css','strategic.css','strategic-workspace.css','city-scene.css'].map(p=>readFile(resolve(PROJECT_ROOT,p),'utf8')))).join('\n');
 const sources={};for(const group of Object.values(catalog.town))for(const url of Object.values(group))if(url)sources[url]=await readFile(assetFile(url,root));
 const revision=sha(Buffer.concat([Buffer.from(JSON.stringify({profile:MAP_GPU_PROFILE,terrain,roads,css,art:catalog.town,sites:TOWN_SITES,village:prefectureVillageMarkup({}),sprites:Object.keys(TOWN_SITES).map(key=>townSprite(key,{width:512}))})),await readFile(new URL(import.meta.url)),await readFile(new URL('../map-gpu-geometry.mjs',import.meta.url)),...Object.entries(sources).sort().flatMap(([url,b])=>[Buffer.from(url),b])]));
 return {catalog,terrain,roads,css,sources,revision};
}
export async function buildMapAssets({root=ASSET_ROOT,check=false,force=false}={}){
 const input=await mapBuildInput(root),{revision,catalog,terrain,roads,css,sources}=input;
 let old;try{old=validateMapGPUManifest(JSON.parse(await readFile(assetFile(catalog.mapGPU,root),'utf8')));}catch{}
 if(old?.revision===revision&&!force){
  // Check every immutable output as well as inputs: an interrupted/missing pack cannot ship.
  for(const [url,e]of Object.entries(old.files))if(sha(await readFile(assetFile(url,root)))!==e.sha256)throw Error('Map texture checksum mismatch: '+url);
  return old;
 }
 if(check)throw Error('地图美术预构建已过期，请运行 npm run art:map');
 const prefix='./assets/map/gpu/'+revision.slice(0,20),directory=assetFile(prefix+'/manifest.json',root);await mkdir(dirname(directory),{recursive:true});
 const geometry=mapGPUGeometry([...roads.matchAll(/<path d="([^"]+)" data-road-from="([^"]+)" data-road-to="([^"]+)"/g)].map(([,d,from,to])=>[from,to,d]));
 const manifest={version:1,revision,geometry,profile:MAP_GPU_PROFILE,terrain:{},frames:{low:{},high:{}},files:{},buildInputs:{terrain:{}}};
 const textureDir=assetFile('./assets/map/gpu/textures/placeholder.webp',root);await mkdir(dirname(textureDir),{recursive:true});
 const output=async(name,bytes,width,height)=>{const hash=sha(bytes),url='./assets/map/gpu/textures/'+hash+'.webp';try{if(sha(await readFile(assetFile(url,root)))!==hash)await writeFile(assetFile(url,root),bytes);}catch{await writeFile(assetFile(url,root),bytes);}manifest.files[url]={sha256:hash,width,height};return url;};
 const reuse=async urls=>{try{for(const url of new Set(urls))if(sha(await readFile(assetFile(url,root)))!==old.files[url].sha256)return false;for(const url of urls)manifest.files[url]=old.files[url];return true;}catch{return false;}};
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  const raster=async(markup,width,height,view='0 0 1024 1024',style='')=>{
   for(const [url,b]of Object.entries(sources))markup=markup.replaceAll(url,'data:image/'+(url.endsWith('.webp')?'webp':'png')+';base64,'+b.toString('base64'));
   const data=await page.evaluate(async({markup,width,height,view,style})=>{
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${view}"><style>${style}</style>${markup}</svg>`;
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    try{const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas');c.width=width;c.height=height;c.getContext('2d').drawImage(image,0,0);const s=c.toDataURL('image/png').split(',')[1];c.width=c.height=0;return s;}finally{URL.revokeObjectURL(url);}
   },{markup,width,height,view,style});return Buffer.from(data,'base64');
  };
  const pyramid=async(key,markup)=>{
   const hash=manifest.buildInputs.terrain[key]=sha(JSON.stringify({version:1,markup,css,profile:MAP_GPU_PROFILE}));
   if(old?.buildInputs?.terrain?.[key]===hash&&await reuse(old.terrain[key].flat())){manifest.terrain[key]=old.terrain[key];console.log('Reused map pyramid: '+key);return;}
   const size=512*2**MAP_GPU_PROFILE.maxLevel;
   const high=await raster(markup,size,size,'0 0 1024 1024',css);
   const levels=manifest.terrain[key]=[];
   for(let level=0;level<=MAP_GPU_PROFILE.maxLevel;level++){
    const n=2**level,dimension=n*512,g=MAP_GPU_PROFILE.gutter;
    const buffer=await sharp(high).resize(dimension,dimension).extend({top:g,bottom:g,left:g,right:g,extendWith:'copy'}).raw().toBuffer();
    const tiles=levels[level]=[];
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
     const bytes=await sharp(buffer,{raw:{width:dimension+g*2,height:dimension+g*2,channels:4}}).extract({left:x*512,top:y*512,width:512+g*2,height:512+g*2}).webp({quality:94,alphaQuality:100,effort:2}).toBuffer();
     tiles.push(await output(key.replaceAll('/','-')+'-'+level+'-'+x+'-'+y,bytes,512+g*2,512+g*2));
    }
   }
   console.log('Compiled map pyramid: '+key);
  };
  for(const season of seasons){
   const split=await page.evaluate(markup=>{
    const doc=new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">'+markup+'</svg>','image/svg+xml'),copy=doc.querySelector('.ancient-atlas-terrain');
    copy.querySelector('.atlas-province-labels').remove();const serialize=n=>new XMLSerializer().serializeToString(n),wide=serialize(copy);
    copy.querySelector('.terrain-landscape').style.setProperty('opacity','.88','important');copy.querySelector('.terrain-relief').style.setProperty('opacity','.78','important');
    return {wide,close:serialize(copy)};
   },terrain[season]);
   for(const key of ['wide','close'])await pyramid(season+'/'+key,split[key]);
  }
  await pyramid('roads','<g class="strategy-world strategy-world-drawn national-world"><g>'+roads+'</g></g>');
  // The atlas stores stable semantic IDs, anchors are supplied by shared town geometry.
  const parts=[];
  const add=async(id,markup,width,height,view,group)=>parts.push({id,group,width,height,png:await raster(markup,width,height,view,css)});
  for(const [key,site]of Object.entries(TOWN_SITES)){
   const painted=townSprite(key,{width:512,x:256,y:512*townBuildingBaseline(key)});
   await add('building/'+key,painted,512,512,'0 0 512 512','buildings');
   await add('building/'+key+'/damaged','<g class="town-damaged">'+painted+'</g>',512,512,'0 0 512 512','buildings');
  }
  for(const [kind,url]of Object.entries(catalog.town.foundations)){
   await add('foundation/'+kind,`<image href="${url}" width="1000" height="667" preserveAspectRatio="none"/>`,1000,667,'0 0 1000 667','foundations');
   await add('foundation/'+kind+'/damaged',`<image class="town-damaged" href="${url}" width="1000" height="667" preserveAspectRatio="none"/>`,1000,667,'0 0 1000 667','foundations');
  }
  await add('foundation/prefecture',prefectureVillageMarkup({}),1000,667,'-260 -183 520 346.666667','foundations');
  for(const season of seasons)for(const [region,url]of Object.entries(catalog.town.terrains))await add('ground/'+season+'/'+region,`<defs><radialGradient id="fade"><stop stop-color="white" stop-opacity=".85"/><stop offset=".45" stop-color="white" stop-opacity=".55"/><stop offset=".78" stop-color="white" stop-opacity=".18"/><stop offset="1" stop-color="black"/></radialGradient><mask id="mask"><rect width="1000" height="667" fill="url(#fade)"/></mask></defs><g class="town-season-${season}"><image class="town-background" href="${url}" width="1000" height="667" preserveAspectRatio="none" mask="url(#mask)"/></g>`,1000,667,'0 0 1000 667','ground-'+season);
  await add('construction',`<image href="${catalog.town.art.construction}" width="512" height="512"/>`,512,512,'0 0 512 512','buildings');
  // Alpha for the GPU fog's erase pass. It has the same stops as fogMarkup.
  await add('fog/edge','<defs><radialGradient id="edge"><stop stop-color="white"/><stop offset=".42" stop-color="white"/><stop offset=".74" stop-color="white" stop-opacity=".55"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><circle cx="128" cy="128" r="128" fill="url(#edge)"/>',256,256,'0 0 256 256','utility');
  await add('territory/land',`<defs><mask id="dry"><rect width="1024" height="1024" fill="white"/>${RIVERS.map(r=>`<path d="${polyline(r.points)}" fill="none" stroke="black" stroke-width="${r.width+4}" stroke-linejoin="round"/>`).join('')}${LAKES.map(l=>`<path d="${l.d}" fill="black"/>`).join('')}</mask></defs><path d="${LAND_PATH}" fill="white" mask="url(#dry)"/>`,1000,1000,'0 0 1024 1024','utility');
  for(const lod of ['low','high']){
   const pages=[];let pageParts=[],x=8,y=8,row=0,group='';
   const flush=async()=>{if(!pageParts.length)return;const bytes=await sharp({create:{width:1024,height:1024,channels:4,background:'#00000000'}}).composite(pageParts.map(p=>({input:p.png,left:p.x,top:p.y}))).webp({lossless:true,effort:2}).toBuffer();const url=await output('atlas-'+lod+'-'+pages.length,bytes,1024,1024);for(const p of pageParts)manifest.frames[lod][p.id]={url,x:p.x,y:p.y,width:p.w,height:p.h};pages.push(url);pageParts=[];x=y=8;row=0;};
   for(const p of parts){
    if(p.group!==group){await flush();group=p.group;}
    const ratio=lod==='low'?.25:p.group==='buildings'?496/512:1,w=Math.round(p.width*ratio),h=Math.round(p.height*ratio);
    if(x+w+8>1024){x=8;y+=row+16;row=0;}if(y+h+8>1024)await flush();
    const png=ratio!==1?await sharp(p.png).resize(w,h).png().toBuffer():p.png;
    // Extruded gutters prevent adjacent frame colors bleeding under minification.
    const padded=await sharp(png).extend({top:8,bottom:8,left:8,right:8,extendWith:'copy'}).png().toBuffer();
    pageParts.push({id:p.id,x:x-8,y:y-8,w,h,png:padded,frameX:x,frameY:y});x+=w+16;row=Math.max(row,h);
   }
   await flush();
   for(const f of Object.values(manifest.frames[lod])){f.x+=8;f.y+=8;}
  }
 }finally{await browser.close();}
 validateMapGPUManifest(manifest);
 const url=prefix+'/manifest.json';await writeFile(assetFile(url,root),JSON.stringify(manifest)+'\n');
 // Publish the complete revision atomically; existing clients keep their old immutable URLs.
 const next={...catalog,mapGPU:url},tmp=resolve(root,'manifest.map-next.json');await writeFile(tmp,JSON.stringify(next,null,2)+'\n');await rename(tmp,resolve(root,'manifest.json'));
 return manifest;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){const m=await buildMapAssets({check:process.argv.includes('--check'),force:process.argv.includes('--force')});console.log(JSON.stringify({revision:m.revision,files:Object.keys(m.files).length,profile:m.profile}));}
