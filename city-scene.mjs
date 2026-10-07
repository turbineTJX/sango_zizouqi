import {siteBuildingDurability,DURABLE_BUILDINGS} from './building-durability.mjs';
import {workArtScene} from './officer-art-scenes.mjs';
import {BUILDINGS,ACTIONS,DIRECTIONS} from './domestic-designs.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import TECHNOLOGIES from './data/design/technologies.mjs';
import {cityVisionRadius} from './city-technology.mjs';
import {TOWN_ART,TOWN_TERRAINS,TOWN_FOUNDATIONS,TOWN_FRAME,townSprite} from './town-art.mjs';
import {townLayout} from './town-layout.mjs';
import {metropolitanCenter,localBuildingLevel,projectSiteId,constructionSiteAvailable,localBuildingLimit} from './metropolitan-areas.mjs';
import {SETTLEMENT_DETAIL_THRESHOLD} from './map-detail-level.mjs';
import {officerActivities,domesticWorkplace as jobSite} from './officer-activity.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=v=>Math.floor(v).toLocaleString('zh-CN');
export const CITY_SCENE_SCALE=.13;
export const CITY_DETAIL_THRESHOLD=SETTLEMENT_DETAIL_THRESHOLD;
export const CITY_INTERIOR_SIZE=64;

// Derived from live, already saved city data. Viewing a model never starts work.
export function citySceneState(s,c,{activities=officerActivities(s,{all:false})}={}){
 const assignments=s.campaign?.domestic.assignments||[];
 const sources=s.cities.filter(source=>source.id===c.id||Object.values(source.domestic?.buildingSites||{}).some(sites=>sites.includes(c.id))||source.project&&projectSiteId(source)===c.id);
 const turn=Math.floor(((s.campaign?.day||1)-1)/10)+1;
 const projectOwner=sources.find(source=>source.project&&DURABLE_BUILDINGS[source.project.key]&&projectSiteId(source)===c.id);
 const project=projectOwner?.project;
 const work=project&&(assignments.find(a=>a.action?.id===project.actionId)?.action||projectOwner.domestic?.suspended);
 const projectDurability=project?siteBuildingDurability(s,c.id,project.key):null;
 const progress=project?clamp(projectDurability.hp/projectDurability.maxHp,0,1):0;
 const paused=!!project&&(!work||work.paused||project.actionId===null||project.domestic&&!constructionSiteAvailable(s,projectOwner,c.id));
 const effects=sources.flatMap(source=>(source.domestic?.effects||[]).filter(e=>e.untilTurn>=turn));
 const levels=Object.fromEntries(Object.keys(BUILDINGS).map(k=>[k,sources.reduce((n,source)=>n+localBuildingLevel(source,k,c.id),0)]));
 const capacity=ECONOMY_RULES.capacity.grainBase+levels.granary*ECONOMY_RULES.capacity.grainPerGranary;
 const gate=siteBuildingDurability(s,c.id,'walls'),maxGate=gate.maxHp;
 const districts=Object.entries(BUILDINGS).map(([key,b])=>{
  const jobs=assignments.filter(a=>a.action&&(a.action.siteId||a.cityId)===c.id&&ACTIONS[a.action.key]?.kind!=='build'&&jobSite(ACTIONS[a.action.key])===key);
  const durability=siteBuildingDurability(s,c.id,key);
  const buildingProject=project?.key===key?{progress,paused,mode:project.mode,hp:durability.hp,maxHp:durability.maxHp,targetLevel:levels[key]+(project.mode==='build'?1:0),cityId:projectOwner.id,cityName:projectOwner.name}:null;
  const administrators=sources.map(source=>({id:source.id,name:source.name,level:localBuildingLevel(source,key,c.id)})).filter(source=>source.level>0);
  const officers=[...activities.values()].filter(o=>o.siteId===c.id&&o.buildingKey===key).map(o=>({id:o.id,name:o.name,action:o.action,paused:o.paused,artScene:workArtScene({...o,kind:ACTIONS[assignments.find(a=>a.officerId===o.id)?.action?.key]?.kind})}));
  return {key,...b,...durability,condition:durability.maxHp?durability.hp/durability.maxHp:1,level:levels[key],limit:localBuildingLimit(s,s.cities.find(t=>t.id===c.id)||metropolitanCenter(s,c),key,c.id),administrators,officers,jobs:jobs.map(a=>({name:ACTIONS[a.action.key].name,paused:!!a.action.paused})),project:buildingProject,
   busy:jobs.some(a=>!a.action.paused)||!!buildingProject&&!paused||key==='commerce'&&effects.some(e=>e.key==='gold')||key==='farm'&&effects.some(e=>e.key==='grain')};
 });
 const center=metropolitanCenter(s,c);
 return {id:c.id,name:c.name,kind:c.kind||'city',citySize:c.citySize||'small',layout:townLayout(c),metropolis:{id:center.id,name:center.name},levels,districts,grain:Math.floor(c.grain||0),capacity,grainFill:clamp((c.grain||0)/capacity,0,1),gateHp:gate.hp,maxGate,gateCondition:maxGate?clamp(gate.hp/maxGate,0,1):1,
  watchtowerRadius:cityVisionRadius(c,0),watchtower:siteBuildingDurability(s,c.id,'watchtower'),research:c.domestic?.research,techs:c.domestic?.techs||[],effects,project:project?{key:project.key,progress,paused,cityId:projectOwner.id,siteId:c.id}:null};
}


function towerMarkup(model){
 if(!model.watchtower.maxHp)return '';
 return `<g class="city-watchtower ${model.watchtower.hp<model.watchtower.maxHp*.7?'town-damaged':''}" data-city-watchtower="${esc(model.id)}" data-watchtower-radius="${model.watchtowerRadius}" transform="translate(-172 -60)" pointer-events="none"><title>瞭望塔 · 耐久${model.watchtower.hp}/${model.watchtower.maxHp} · 视野半径${model.watchtowerRadius}</title><ellipse cy="6" rx="20" ry="8" fill="#182329" opacity=".5"/><path d="M-10 0V-37H10V0L0 6Z" fill="#b7986b" stroke="#584732" stroke-width="2"/><path d="M0-37H10V0L0 6Z" fill="#927548"/><path d="M-16-38V-48L0-56L16-48V-38Z" fill="#775332" stroke="#392e27" stroke-width="2"/><path d="M-20-47L0-60L20-47L0-51Z" fill="#35463e"/><path d="M-7-40V-46M6-40V-46M0-13V-22" stroke="#242d29" stroke-width="4"/><circle cy="-58" r="3" fill="${model.watchtowerRadius>=38?'#e4bd66':'#d38541'}"/></g>`;
}
function townFoundation(model){
 const frame=TOWN_FRAME;
 return '<image class="town-foundation '+(model.gateCondition<.7?'town-damaged':'')+'" data-town-space="'+model.layout.kind+'" href="'+TOWN_FOUNDATIONS[model.layout.kind]+'" x="'+frame.x+'" y="'+frame.y+'" width="'+frame.width+'" height="'+frame.height+'" transform="'+(model.layout.flip?'scale(-1 1)':'')+'" preserveAspectRatio="none" pointer-events="none"/>';
}
export const sceneDistricts=model=>model.districts.filter(d=>d.limit>0||d.level>0||d.project||d.officers?.length);
function constructionMarkup(project,width,compact){
 return '<g class="'+(compact?'city-compact-scaffold':'city-scaffold')+' '+(project.paused?'is-paused':'')+'"><image href="'+TOWN_ART.construction+'" x="'+(-width*.45)+'" y="'+(-width*.76)+'" width="'+width*.9+'" height="'+width*.9+'" pointer-events="none"/>'+(compact?'':'<g class="city-construction-label" transform="translate(0 -17)"><rect x="-36" y="-7" width="72" height="15" rx="2"/><text y="3">'+(project.paused?'停工':num(project.hp)+'/'+num(project.maxHp))+' · '+project.targetLevel+'级</text></g>')+'</g>';
}
function districtMarkup(d,model,compact=false){
 const site=model.layout.sites[d.key],width=site.width*(.82+d.level*.085),level=d.level,id=model.id+(compact?'-compact':'');
 const status=d.project?(d.project.paused?'停工':d.project.mode==='repair'?'修复中':'施工中'):level?(d.hp===0?'已损毁':d.hp<d.maxHp?'受损':level+'级'):'未建';
 const durabilityText=d.maxHp?num(d.hp)+'/'+num(d.maxHp):'0/'+num(d.durability);
 let art='';
 // An annex is added at levels 3 and 5; expansion follows real completed levels.
 if(level>=3)art+=townSprite(d.key,{id:id+'-'+d.key+'-annex-3',x:-width*.32,y:-width*.13,width:width*.53,extraClass:compact?'town-compact-annex':'town-annex'});
 if(level>=5)art+=townSprite(d.key,{id:id+'-'+d.key+'-annex-5',x:width*.29,y:-width*.15,width:width*.45,extraClass:compact?'town-compact-annex':'town-annex'});
 if(level)art+=townSprite(d.key,{id:id+'-'+d.key,width,extraClass:d.condition<.7?'town-damaged':''});
 if(!level&&!d.project&&!compact)art='<ellipse class="town-empty-site" cy="-9" rx="'+width*.31+'" ry="'+width*.13+'"/><path class="town-empty-mark" d="M-4-9h8m-4-4v8"/>';
 if(d.key==='granary'&&level)art+='<g class="city-grain-stacks">'+Array.from({length:Math.ceil(model.grainFill*8)},(_,i)=>'<ellipse cx="'+(width*.24+i%3*2.8)+'" cy="'+(i<3?-2:i<6?-5:-8)+'" rx="3.8" ry="2.7" fill="#c4a669" stroke="#786443" stroke-width=".5"/>').join('')+'</g>';
 if(d.key==='walls'&&model.gateCondition<.7)art+='<g class="city-gate-crack" aria-label="城防受损"><path d="M-13-18l4 6-3 4 5 5M19-15l-4 5 3 4-6 5" fill="none" stroke="#352d25" stroke-width="1.3"/><path d="M-30 2l5-3 4 3-5 2Zm55-4 5-3 3 5-4 1Z" fill="#746954"/></g>';
 if(d.busy&&(level||d.project))art+='<g class="town-activity" transform="translate('+width*.31+' -12)"><circle r="3"/><circle r="5" class="activity-ring"/></g>';
 if(d.project)art+=constructionMarkup(d.project,width*.85,compact);
 if(compact)return '<g class="town-compact-district" data-model-building="'+d.key+'" data-level="'+level+'" transform="translate('+site.x+' '+site.y+')">'+art+'</g>';
 return '<g class="city-district district-'+d.key+' '+(d.project?'under-construction':'')+' '+(d.busy?'district-busy':'')+'" data-city-building="'+d.key+'" data-level="'+level+'" tabindex="0" role="button" aria-label="'+esc(d.name)+'，'+esc(status+' · '+durabilityText)+'" transform="translate('+site.x+' '+site.y+')"><title>'+esc(d.name)+' · '+status+' · '+durabilityText+'</title><path class="city-district-hit" d="M'+(-width*.4)+' -'+width*.67+'H'+width*.4+'V'+width*.15+'H'+(-width*.4)+'Z"/>'+art+'</g>';
}
function siteLabels(model){
 return '<g class="city-site-labels" pointer-events="none">'+sceneDistricts(model).map(d=>{const {x,y}=model.layout.sites[d.key],status=d.project?(d.project.paused?'停工':Math.floor(d.project.progress*100)+'%'):d.maxHp?num(d.hp)+'/'+num(d.maxHp):'未建';return '<g class="city-site-label" data-building-label="'+d.key+'" transform="translate('+x+' '+(y+(d.officers?.length?39:14))+')"><rect x="-40" y="-10" width="80" height="19" rx="2"/><text y="2">'+esc(d.name)+' <tspan>'+status+'</tspan></text></g>';}).join('')+'</g>';
}
function siteOfficers(model){
 return '<g class="city-officers">'+sceneDistricts(model).map(d=>{
  const officers=d.officers||[],shown=officers.slice(0,3),{x,y}=model.layout.sites[d.key];
  return '<g transform="translate('+x+' '+(y-5)+')">'+shown.map((o,i)=>`<foreignObject x="${i*23-shown.length*11.5}" y="0" width="23" height="30"><button xmlns="http://www.w3.org/1999/xhtml" type="button" class="town-officer ${o.paused?'is-paused':''}" data-city-officer="${esc(o.id)}" data-action="campaign-info-detail" data-kind="officer" data-page="行动记录" data-id="${esc(o.id)}" title="${esc(o.name+' · '+o.action)}" aria-label="查看${esc(o.name)}的行动记录"><span class="town-officer-face" data-art-portrait="${esc(o.id)}"><span>${esc(o.name.slice(-1))}</span></span><b>${esc(o.name)}</b></button></foreignObject>`).join('')+(officers.length>3?`<g class="town-officer-overflow" transform="translate(${shown.length*11.5+5} 11)" pointer-events="none"><circle r="7"/><text y="2">+${officers.length-3}</text><title>另有${officers.length-3}人在此办事，点击建筑查看完整名单</title></g>`:'')+'</g>';
 }).join('')+'</g>';
}
export function citySceneMarkup(model,{season='summer'}={}){
 const frame=TOWN_FRAME,districts=sceneDistricts(model).sort((a,b)=>model.layout.sites[a.key].y-model.layout.sites[b.key].y),prefix='terrain-'+model.id.replace(/[^a-zA-Z0-9_-]/g,'_');
 return '<g class="city-scene town-panorama town-season-'+esc(season)+' town-region-'+model.layout.region+'" data-scene-city="'+esc(model.id)+'" data-grain-fill="'+model.grainFill.toFixed(2)+'" data-gate-condition="'+model.gateCondition.toFixed(2)+'"><defs><radialGradient id="'+prefix+'-fade"><stop offset=".65" stop-color="white"/><stop offset="1" stop-color="black"/></radialGradient><mask id="'+prefix+'-mask" maskUnits="userSpaceOnUse" x="'+frame.x+'" y="'+frame.y+'" width="'+frame.width+'" height="'+frame.height+'"><rect x="'+frame.x+'" y="'+frame.y+'" width="'+frame.width+'" height="'+frame.height+'" fill="url(#'+prefix+'-fade)"/></mask></defs><g mask="url(#'+prefix+'-mask)"><image class="town-background" href="'+TOWN_TERRAINS[model.layout.region]+'" transform="'+(model.layout.flip?'scale(-1 1)':'')+'" x="'+frame.x+'" y="'+frame.y+'" width="'+frame.width+'" height="'+frame.height+'" preserveAspectRatio="none" pointer-events="none"/></g>'+townFoundation(model)+districts.map(d=>districtMarkup(d,model)).join('')+towerMarkup(model)+siteOfficers(model)+siteLabels(model)+'</g>';
}
export function cityCompactMarkup(model){
 const districts=sceneDistricts(model).sort((a,b)=>model.layout.sites[a.key].y-model.layout.sites[b.key].y);
 return '<g class="map-city-model" data-model-size="'+model.citySize+'" transform="scale('+model.layout.mapScale+')" pointer-events="none">'+townFoundation(model)+districts.map(d=>districtMarkup(d,model,true)).join('')+towerMarkup(model)+'</g>';
}

export function cityBuildingInfo(model,key){
 const d=model.districts.find(d=>d.key===key);if(!d)return null;
 const rows=[['等级',d.level+' / '+d.limit],['方向',DIRECTIONS[d.direction]],['地点',model.name],['都市圈',model.metropolis.name]];
 if(d.administrators.length)rows.push(['所属',d.administrators.map(source=>source.name+' '+source.level+'级').join('、')]);
 if(d.project)rows.push(['工程',`${d.project.paused?'停工':'施工中'} · ${num(d.hp)} / ${num(d.maxHp)} · ${Math.floor(d.project.progress*100)}% · ${d.project.mode==='repair'?'修复后':'建成后'}${d.project.targetLevel}级`]);
 if(d.project)rows.push(['建设城市',d.project.cityName]);
 if(key==='granary')rows.push(['库存',`${num(model.grain)} / ${num(model.capacity)}`]);
 rows.push(['耐久',`${num(d.hp)} / ${num(d.maxHp||d.durability)}`]);
 if(key==='walls'&&model.watchtower.maxHp)rows.push(['瞭望塔耐久',num(model.watchtower.hp)+' / '+num(model.watchtower.maxHp)]);
 if(key==='walls'&&model.watchtowerRadius)rows.push(['瞭望塔','持续获取周围视野 · 半径'+model.watchtowerRadius]);
 if(key==='workshop'&&model.research){const tech=TECHNOLOGIES.records.find(t=>t.id===model.research.type);rows.push(['研究',`${tech?.name||model.research.type} · ${num(model.research.progress)} / ${tech?.parameters.requiredProgress||'—'}`]);}
 if(d.jobs.length)rows.push(['事务',[...new Set(d.jobs.map(j=>j.name+(j.paused?'（暂停）':'')))].join('、')]);
 if(key==='commerce'&&model.effects.some(e=>e.key==='gold'))rows.push(['市况','商贸增益生效中']);
 if(key==='farm'&&model.effects.some(e=>e.key==='grain'))rows.push(['农事','增产措施生效中']);
 return {name:d.name,description:d.description,rows,officers:d.officers||[]};
}
export function cityBuildingCard(model,key){
 const info=cityBuildingInfo(model,key);if(!info)return '';
 const staff=info.officers.length?`<div class="city-building-staff"><h4>在此办事 · ${info.officers.length}人</h4>${info.officers.map(o=>`<button type="button" data-action="campaign-info-detail" data-kind="officer" data-page="行动记录" data-id="${esc(o.id)}"><span class="town-officer-face" data-art-portrait="${esc(o.id)}" data-art-scene="${o.artScene||'domestic'}"><span>${esc(o.name.slice(-1))}</span></span><span><b>${esc(o.name)}</b><small>${esc(o.action)}</small></span></button>`).join('')}</div>`:'';
 return `<header><div><small>${esc(model.name)} · 城内设施</small><h3>${esc(info.name)}</h3></div><button type="button" data-city-card-close aria-label="关闭建筑详情">×</button></header><p>${esc(info.description)}</p><dl>${info.rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${staff}`;
}
