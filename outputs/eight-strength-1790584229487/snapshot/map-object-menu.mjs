import {playerFaction} from './player-faction.mjs';
import {FACTIONS} from './engine.mjs';
import {armyBattle,isPlanning,liveSoldiers} from './strategic-campaign.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mapObjectMenu(s,menu){
 if(!menu)return '';
 const army=menu.kind==='army',object=(army?s.armies:s.cities).find(x=>x.id===menu.id);
 if(!object||object.disbanded)return '';
 const own=(army?object.faction:object.owner)===playerFaction(s),enabled=own&&isPlanning(s)&&(!army||!armyBattle(s,object.id));
 const action=(key,label,extra='',disabled=false)=>`<button data-action="${key}" ${extra} ${disabled?'disabled':''}>${label}</button>`;
 const command=(task,label)=>action('campaign-pick',label,`data-task="${task}" data-town="${esc(object.id)}"`,!enabled);
 return `<section class="map-object-menu" aria-label="${esc(object.name)}操作" style="--menu-x:${Math.max(8,Number(menu.x)||8)}px;--menu-y:${Math.max(8,Number(menu.y)||8)}px"><header><div><small>${esc(FACTIONS[army?object.faction:object.owner]?.name)}</small><h3>${esc(object.name)}</h3></div>${action('map-object-close','×','aria-label="关闭对象菜单"')}</header><p>${army?`${object.units.filter(u=>u.troops>0).length} 队 · ${Math.round(liveSoldiers(s,object)).toLocaleString()} 人`:`驻城 ${object.units.length} 队 · 预备兵 ${object.manpower.toLocaleString()}`}</p>${army?(own?action('campaign-order','调动军团','',!enabled):''):(own?command('expedition','军团出征')+action('city-domestic','内政',`data-town="${esc(object.id)}"`)+command('draft','部队编制')+command('transfer','调任武将'):'')}${action('campaign-info-detail',army?'军团情报':'城市情报',`data-kind="${army?'army':'city'}" data-id="${esc(object.id)}"`)}${action('map-object-manage','展开管理面板')}${own&&!enabled?'<small>当前仅可查看；筹划阶段且未交战时可下令。</small>':''}</section>`;
}
