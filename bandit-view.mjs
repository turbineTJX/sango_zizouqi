import {banditIntelligence,knownBanditCamps} from './bandit-state.mjs';
import {mapNode} from './map-node-data.mjs';
import {playerFaction,isPlayerControlled} from './player-faction.mjs';
import {findCampaignRoute,isPlanning} from './strategic-campaign.mjs';
import {intelligenceWorld} from './strategic-vision.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {campaignDate} from './national-scenarios.mjs';
import {roadCost} from './road-metrics.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function banditLootMarkup(loot){return loot?`<p class="bandit-loot-receipt">缴获 ${loot.gold} 金、${loot.grain} 粮 · 随军返城入库${loot.talentId?' · 当地人才投效':''}</p>`:'';}
export function banditMapMarkup(s){return knownBanditCamps(s).filter(c=>c.clearedDay===null).map(c=>{
 const n=mapNode(s,c.nodeId);
 return `<g class="bandit-map-marker" data-action="bandit-open" data-bandit-node="${esc(c.nodeId)}" data-camp="${esc(c.id)}" data-x="${n.x}" data-y="${n.y}" tabindex="0" role="button" aria-label="${esc(c.name)}，查看贼寨" transform="translate(${n.x} ${n.y})"><line data-bandit-location stroke="#73503b" stroke-width=".8" pointer-events="none"/><g data-map-glyph><rect x="-15" y="-25" width="36" height="38" fill="transparent"/><path d="M-10 7V-5L0-11 10-5V7Z" fill="#73503b" stroke="#ead8b0"/><path d="M-12-4L0-13 12-4M-4 7V0H4V7" fill="none" stroke="#ead8b0"/><path d="M8-8V-22L17-19 8-16" stroke="#692a26" fill="#a84431"/><text y="20" text-anchor="middle" fill="#f5e8c9" stroke="#463526" paint-order="stroke" stroke-width="2" font-size="10" pointer-events="none">${esc(c.name)}</text><title>${esc(c.name)} · ${c.units.length}将 · ${c.units.reduce((n,u)=>n+u.troops,0)}人 · 已保存的侦察情报</title></g></g>`;
 }).join('');}
export function banditMarkup(s,id){
 const intel=banditIntelligence(s,id);if(!intel)return {title:'贼寨',body:'<p>尚未获得此处情报。</p>'};
 const c=intel.data,view=intelligenceWorld(s),own=playerFaction(s),sources=view.cities.filter(n=>n.owner===own).map(n=>{const route=findCampaignRoute(view,n.id,c.nodeId,own);let from=n.id,cost=0;for(const to of route||[]){cost+=roadCost(view,from,to);from=to;}return {n,route,cost};}).filter(x=>x.route).sort((a,b)=>a.cost-b.cost||a.n.id.localeCompare(b.n.id)).map(x=>x.n);
 const units=c.units.map(u=>`<details><summary>${esc(u.name)} · ${u.level}级 · ${TROOP_DESIGNS[u.type].name} ${u.troops}人</summary><p>字${esc(u.courtesy)} · ${u.sex===1?'女':'男'}</p><dl class="info-fields">${[['leadership','统率'],['force','武力'],['intellect','智力'],['politics','政治'],['charm','魅力']].map(([k,label])=>`<div><dt>${label}</dt><dd>${u[k]}</dd></div>`).join('')}</dl></details>`).join('');
 const sourceButton=n=>`<button class="button secondary" data-action="campaign-pick" data-task="expedition" data-town="${esc(n.id)}" data-bandit-target="${esc(c.nodeId)}"><b>${esc(n.name)}</b><small>驻城部队 ${n.units.filter(u=>u.troops>0).length} 队</small></button>`;
 const commands=c.clearedDay===null&&isPlanning(s)&&isPlayerControlled(s,own)?`<h3>选择派出城</h3><div class="command-choices">${sources.slice(0,4).map(sourceButton).join('')||'<p>没有可达的己方城市。</p>'}</div>${sources.length>4?`<details><summary>其它城市</summary><div class="command-choices">${sources.slice(4).map(sourceButton).join('')}</div></details>`:''}`:'';
 return {title:c.name,body:`<p>${campaignDate(s,{day:intel.day})}情报 · ${c.clearedDay===null?`${c.units.length}将，${c.units.reduce((n,u)=>n+u.troops,0)}人`:'已平定'}</p>${units}${commands}`};
}
