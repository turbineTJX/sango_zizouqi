import {cityInformation,planningRestriction} from './information-display.mjs';
import {intelligenceWorld,cityVisible} from './strategic-vision.mjs';
import {cityMilitary} from './domestic.mjs';
import {gateDurability} from './building-durability.mjs';
import {armyInfoCounts,armySupplyInfo} from './army-details.mjs';
import {mapNode} from './road-network.mjs';
import {metropolitanCenter} from './metropolitan-areas.mjs';
import {marchModes} from './strategic-traits.mjs';
import {playerFaction} from './player-faction.mjs';
import {FACTIONS} from './engine.mjs';
import {armyBattle,isPlanning,liveSoldiers,dailyConsumption} from './strategic-campaign.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('zh-CN');
const action=(key,label,extra='',disabled=false)=>`<button data-action="${key}" ${extra} ${disabled?'disabled':''}>${label}</button>`;
const stats=rows=>`<dl class="info-fields map-object-stats">${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
function selectionCard(object,menu,body,commands,{group=null,hint=''}={}){
 return `<section class="map-object-menu map-selection-card city-command-menu" data-map-object-kind="${esc(menu.kind)}" data-map-object-id="${esc(object.id)}" role="dialog" aria-modal="false" aria-label="${esc(object.name)}信息卡片" style="--menu-x:${Number(menu.x)||12}px;--menu-y:${Number(menu.y)||12}px"><header><h3>${esc(object.name)}${group?' · '+(group==='military'?'军事':'人事'):''}</h3>${action('map-object-close','×','aria-label="关闭信息卡片"')}</header>${group?'':body}${hint?`<p class="map-object-meta">${esc(hint)}</p>`:''}<nav class="city-command-grid" aria-label="${group?'城市'+(group==='military'?'军事':'人事')+'命令':menu.kind==='city'?'城市一级命令':'对象操作'}">${commands}</nav>${group?action('map-city-commands','返回','class="city-command-back"'):''}</section>`;
}
export function mapObjectActions(s,kind,id){
 s=intelligenceWorld(s);
 const army=kind==='army',object=(army?s.armies:s.cities).find(x=>x.id===id);
 if(!object||object.disbanded)return '';
 const own=(army?object.faction:object.owner)===playerFaction(s);
 const action=(key,label,extra='',disabled=false)=>`<button class="button secondary" data-action="${key}" ${extra} ${disabled?'disabled':''}>${label}</button>`;
 return own?action('map-object-manage','管理',`data-kind="${kind}" data-id="${esc(id)}"`):!army&&cityVisible(s,id)?action('map-city-inspect','城内',`data-town="${esc(id)}"`):'';
}
export function mapObjectMenu(s,menu){
 s=intelligenceWorld(s);
 if(!menu)return '';
 if(menu.kind==='node')return nodeSelectionCard(s,mapNode(s,menu.id),menu);
 const army=menu.kind==='army',object=(army?s.armies:s.cities).find(x=>x.id===menu.id);
 if(!object||object.disbanded)return '';
 if(!army)return cityCommandMenu(s,object,menu);
 const own=(army?object.faction:object.owner)===playerFaction(s),enabled=own&&isPlanning(s)&&(!army||!armyBattle(s,object.id));
 const action=(key,label,extra='',disabled=false)=>`<button data-action="${key}" ${extra} ${disabled?'disabled':''}>${label}</button>`;
 const commands=own?action('campaign-order','调动',`data-army="${esc(object.id)}"`,!enabled)+(marchModes(object).length>1?action('march-mode-open','行军方式',`data-army="${esc(object.id)}"`,!enabled):'')+mapObjectActions(s,menu.kind,object.id):'';
 const location=object.travel?`${mapNode(s,object.travel.from)?.name||''} → ${mapNode(s,object.travel.to)?.name||''}`:mapNode(s,object.location)?.name||'';
 const counts=armyInfoCounts(s,object),supply=armySupplyInfo(s,object);
 const body=`<p class="map-object-meta">${esc(FACTIONS[object.faction]?.name)} · ${esc(location)}</p>${stats([['现役兵',fmt(counts.soldiers)],['伤兵',fmt(counts.wounded)],['部队数',`${counts.unitCount} 队`],['士气',`${fmt(object.morale||0)} / 100`],['每日耗粮',fmt(dailyConsumption(s,object))],['携粮',`${fmt(object.supply||0)} / ${fmt(object.supplyCapacity||0)}`]])}${supply?`<p class="map-object-meta" data-army-supply-status>粮道 · ${esc(supply.label)}${object.hunger>0?' · 缺粮':''}</p>`:''}`;
 return selectionCard(object,menu,body,commands+action('campaign-info-detail','详情',`data-kind="army" data-id="${esc(object.id)}"`),{hint:own?planningRestriction(s,{army:object}):''});
}

function nodeSelectionCard(s,node,menu){
 if(!node||node.kind==='city')return '';
 const center=metropolitanCenter(s,node),metropolitan=center?.citySize==='large',visible=cityVisible(s,node.id);
 const armies=s.armies.filter(a=>!a.disbanded&&!a.travel&&a.location===node.id);
 const body=(metropolitan?`<p class="map-object-meta">隶属${esc(center.name)}</p>`:'')+(armies.length?`<div class="map-node-armies">${armies.map(a=>`<p>${action('campaign-info-detail',esc(a.name),`data-kind="army" data-id="${esc(a.id)}"`)}<span>${esc(FACTIONS[a.faction]?.name)} · ${fmt(liveSoldiers(s,a))} 人</span></p>`).join('')}</div>`:visible?'<p class="map-object-meta">无驻军</p>':'');
 const commands=(metropolitan&&visible?action('map-city-inspect','查看建筑',`data-town="${esc(node.id)}"`):'')+(metropolitan&&center.owner===playerFaction(s)?action('city-domestic','委任',`data-town="${esc(center.id)}"`):'');
 return selectionCard(node,menu,body,commands);
}

function cityCommandMenu(s,city,menu){
 const visible=cityVisible(s,city.id),own=visible&&city.owner===playerFaction(s),enabled=own&&isPlanning(s)&&!s.finished;
 const id=esc(city.id),group=own&&['military','personnel'].includes(menu.group)?menu.group:null;
 const action=(key,label,extra='',disabled=false)=>`<button data-action="${key}" ${extra} ${disabled?'disabled':''}>${label}</button>`;
 const command=(task,label)=>action('campaign-pick',label,`data-task="${task}" data-town="${id}"`,!enabled);
 let choices;
 if(group==='military')choices=command('draft','编制')+command('expedition','出征');
 else if(group==='personnel')choices=action('campaign-city-personnel','武将',`data-town="${id}"`)+command('transfer','调任')+command('governor','太守');
 else choices=(own?action('city-domestic','委任',`data-town="${id}"`)+action('map-city-commands','军事','data-group="military"')+action('map-city-commands','人事','data-group="personnel"'):'')+action('campaign-info-detail','详情',`data-kind="city" data-id="${id}" aria-label="城市情报"`);
 const intel=cityInformation(s,city.id),military=intel.data?cityMilitary(s,city):null,durability=gateDurability(city);
 const body=`<p class="map-object-meta">${esc(intel.state==='unknown'?'未知':FACTIONS[city.owner]?.name)}${intel.state==='stale'?' · '+esc(intel.label):''}</p>`+(intel.data?stats([['现役兵',fmt(military.troops)],['预备兵',fmt(city.manpower)],['伤兵',fmt(military.wounded)],['金',fmt(city.gold)],['粮草',fmt(city.grain)],['城防耐久',`${fmt(durability.hp)} / ${fmt(durability.maxHp)}`]]):'');
 const hint=!visible&&intel.data?'兵力不含主将外出留城兵':group&&!enabled?planningRestriction(s):'';
 return selectionCard(city,menu,body,choices,{group,hint});
}
