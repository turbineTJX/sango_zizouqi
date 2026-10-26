import {intelligenceWorld,cityVisible} from './strategic-vision.mjs';
import {marchModes} from './strategic-traits.mjs';
import {playerFaction} from './player-faction.mjs';
import {FACTIONS} from './engine.mjs';
import {armyBattle,isPlanning,liveSoldiers} from './strategic-campaign.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
 const army=menu.kind==='army',object=(army?s.armies:s.cities).find(x=>x.id===menu.id);
 if(!object||object.disbanded)return '';
 if(!army)return cityCommandMenu(s,object,menu);
 const own=(army?object.faction:object.owner)===playerFaction(s),enabled=own&&isPlanning(s)&&(!army||!armyBattle(s,object.id));
 const action=(key,label,extra='',disabled=false)=>`<button data-action="${key}" ${extra} ${disabled?'disabled':''}>${label}</button>`;
 const commands=own?action('campaign-order','调动',`data-army="${esc(object.id)}"`,!enabled)+(marchModes(object).length>1?action('march-mode-open','行军方式',`data-army="${esc(object.id)}"`,!enabled):'')+mapObjectActions(s,menu.kind,object.id):'';
 return `<section class="map-object-menu" aria-label="${esc(object.name)}操作" style="--menu-x:${Math.max(8,Number(menu.x)||8)}px;--menu-y:${Math.max(8,Number(menu.y)||8)}px"><header><div><small>${esc(FACTIONS[object.faction]?.name)}</small><h3>${esc(object.name)}</h3></div>${action('map-object-close','×','aria-label="关闭对象菜单"')}</header><p>${object.units.filter(u=>u.troops>0).length} 队 · ${Math.round(liveSoldiers(s,object)).toLocaleString()} 人</p>${commands}${action('campaign-info-detail','详情',`data-kind="army" data-id="${esc(object.id)}"`)}${own&&!enabled?'<small>当前仅可查看</small>':''}</section>`;
}

function cityCommandMenu(s,city,menu){
 const visible=cityVisible(s,city.id),own=visible&&city.owner===playerFaction(s),enabled=own&&isPlanning(s)&&!s.finished;
 const id=esc(city.id),group=own&&['military','personnel'].includes(menu.group)?menu.group:null;
 const action=(key,label,extra='',disabled=false)=>`<button data-action="${key}" ${extra} ${disabled?'disabled':''}>${label}</button>`;
 const command=(task,label)=>action('campaign-pick',label,`data-task="${task}" data-town="${id}"`,!enabled);
 let choices;
 if(group==='military')choices=command('draft','编制')+command('expedition','出征');
 else if(group==='personnel')choices=action('campaign-city-personnel','武将',`data-town="${id}"`)+command('transfer','调任')+command('governor','太守');
 else choices=(own?action('city-domestic','内政',`data-town="${id}"`)+action('map-city-commands','军事','data-group="military"')+action('map-city-commands','人事','data-group="personnel"')+action('scout-open','侦察',`data-town="${id}"`,!enabled):'')+(visible?action('map-city-inspect','城内',`data-town="${id}" aria-label="查看城内"`):'')+action('campaign-info-detail','详情',`data-kind="city" data-id="${id}" aria-label="城市情报"`);
 return `<section class="map-object-menu city-command-menu" role="dialog" aria-modal="false" aria-label="${esc(city.name)}${group?'命令':'一级命令'}" style="--menu-x:${Number(menu.x)||12}px;--menu-y:${Number(menu.y)||12}px"><header><h3>${esc(city.name)}${group?' · '+(group==='military'?'军事':'人事'):''}</h3>${action('map-object-close','×','aria-label="关闭城市菜单"')}</header><nav class="city-command-grid" aria-label="${group?'城市'+(group==='military'?'军事':'人事')+'命令':'城市一级命令'}">${choices}</nav>${group?action('map-city-commands','返回','class="city-command-back"'):''}</section>`;
}
