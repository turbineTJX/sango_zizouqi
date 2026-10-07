import {staffSummaryMarkup} from './domestic-feedback.mjs';
import {intelligenceWorld,cityVisible,intelligenceLabel} from './strategic-vision.mjs';
import {citySizeName} from './city-classification.mjs';
import {marchModes} from './strategic-traits.mjs';
import {playerFaction} from './player-faction.mjs';
import {FACTIONS} from './engine.mjs';
import {armyBattle,isPlanning,liveSoldiers} from './strategic-campaign.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mapObjectActions(s,kind,id){
 s=intelligenceWorld(s);
 const army=kind==='army',object=(army?s.armies:s.cities).find(x=>x.id===id);
 if(!object||object.disbanded)return '';
 const own=(army?object.faction:object.owner)===playerFaction(s),enabled=own&&isPlanning(s)&&(!army||!armyBattle(s,id));
 const action=(key,label,extra='',disabled=false)=>`<button class="button secondary" data-action="${key}" ${extra} ${disabled?'disabled':''}>${label}</button>`;
 const command=(task,label)=>action('campaign-pick',label,`data-task="${task}" data-town="${esc(id)}"`,!enabled);
 return (army?(own?action('campaign-order','调动军团',`data-army="${esc(id)}"`,!enabled)+(marchModes(object).length>1?action('march-mode-open','行军方式',`data-army="${esc(id)}"`,!enabled):''):''):(own?command('expedition','军团出征')+action('city-domestic','内政',`data-town="${esc(id)}"`)+command('draft','部队编制')+command('transfer','调任武将')+action('scout-open','侦察',`data-town="${esc(id)}"`):'')+(cityVisible(s,id)?action('map-city-inspect','查看城内',`data-town="${esc(id)}"`):''))+action('map-object-manage','管理面板',`data-kind="${kind}" data-id="${esc(id)}"`);
}
export function mapObjectMenu(s,menu){
 s=intelligenceWorld(s);
 if(!menu)return '';
 const army=menu.kind==='army',object=(army?s.armies:s.cities).find(x=>x.id===menu.id);
 if(!object||object.disbanded)return '';
 if(!army&&!cityVisible(s,object.id))return `<section class="map-object-menu" aria-label="${esc(object.name)}情报"><header><h3>${esc(object.name)}</h3></header><p>${esc(intelligenceLabel(s,object.id))}</p><button data-action="campaign-info-detail" data-kind="city" data-id="${esc(object.id)}">城市情报</button><button data-action="map-object-close">关闭</button></section>`;
 const own=(army?object.faction:object.owner)===playerFaction(s),enabled=own&&isPlanning(s)&&(!army||!armyBattle(s,object.id));
 const action=(key,label,extra='',disabled=false)=>`<button data-action="${key}" ${extra} ${disabled?'disabled':''}>${label}</button>`;
 return `<section class="map-object-menu" aria-label="${esc(object.name)}操作" style="--menu-x:${Math.max(8,Number(menu.x)||8)}px;--menu-y:${Math.max(8,Number(menu.y)||8)}px"><header><div><small>${esc(FACTIONS[army?object.faction:object.owner]?.name)}${army?'':' · '+citySizeName(object)}</small><h3>${esc(object.name)}</h3></div>${action('map-object-close','×','aria-label="关闭对象菜单"')}</header><p>${army?`${object.units.filter(u=>u.troops>0).length} 队 · ${Math.round(liveSoldiers(s,object)).toLocaleString()} 人`:`驻城 ${object.units.length} 队 · 预备兵 ${object.manpower.toLocaleString()}`}</p>${!army?staffSummaryMarkup(s,object):''}${mapObjectActions(s,menu.kind,object.id)}${action('campaign-info-detail',army?'军团情报':'城市情报',`data-kind="${army?'army':'city'}" data-id="${esc(object.id)}"`)}${own&&!enabled?'<small>当前仅可查看；筹划阶段且未交战时可下令。</small>':''}</section>`;
}
