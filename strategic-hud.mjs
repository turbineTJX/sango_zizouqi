import {FACTIONS} from './engine.mjs';
import {harvestStripMarkup} from './reward-presentation.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {playerFaction} from './player-faction.mjs';
import {campaignDate} from './national-scenarios.mjs';
import {calendar,isPlanning,activeBattles} from './strategic-campaign.mjs';
import {FACTION_DIRECTORIES,factionDirectoryRows} from './faction-directory.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Math.round(v).toLocaleString('zh-CN');
const button=(action,label,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`;
export function strategicHUD(s,ui){
 const faction=FACTIONS[playerFaction(s)],leader=Object.values(OFFICER_BY_ID).find(o=>o.sourceId===faction.leaderSourceId),d=calendar(s),planning=isPlanning(s),battles=activeBattles(s),blocked=!!s.finished||battles.some(b=>b.awaiting);
 const cities=factionDirectoryRows(s,'city'),idleCities=cities.filter(c=>c.idle>0).length;
 return `<header class="sovereign-hud"><div class="sovereign-portrait" data-art-portrait="${esc(leader?.id)}"><span>${esc(faction.short)}</span></div><div class="sovereign-identity"><small>${campaignDate(s)}</small><h1>${esc(faction.name)}<span>势力</span></h1><p>第 ${d.turn} 旬 · ${planning?'筹划中':ui.paused?'已暂停':'进行中'}</p></div><div class="sovereign-resources"><span>各城金合计 <b>${n(s.gold)}</b></span><span>各城粮合计 <b>${n(s.grain)}</b></span></div></header>
 <div class="world-turn"><button class="turn-seal" data-action="${planning?'campaign-begin':'campaign-run'}" ${blocked?'disabled':''} aria-label="${planning?'进行 · 执行本旬':ui.paused?'继续进行':'暂停世界'}">${planning||ui.paused?'进行':'暂停'}<small>${planning?'执行本旬':'第 '+d.dayInTurn+' 天'}</small></button><button class="turn-day" data-action="campaign-day" ${planning||blocked?'disabled':''}>推进一天</button></div>
 ${harvestStripMarkup(s)}${ui.rewardMapReport?`<button class="reward-map-return" data-action="reward-return-report">返回奏报</button>`:''}
 <nav class="world-commands" aria-label="势力命令"><small>势力命令</small>${button('faction-domestic','统一内政')}${button('scout-open','侦察')}${button('faction-diplomacy','外交')}${button('treasure-open','宝物')}${button('campaign-affairs','势力事务')}${button('campaign-battles','战役')}</nav>
 <nav class="world-toolbar" aria-label="全局功能">${button('campaign-info','情报')}${button('journal','纪事')}${button('settings','设置')}${button('lobby','首页')}</nav>
 <nav class="faction-navigation" aria-label="本势力总览">${Object.entries(FACTION_DIRECTORIES).map(([kind,label])=>button(['city','army','battle'].includes(kind)?'map-quick-open':'faction-directory',kind==='city'?`自辖城市<b><span class="city-total-count">${cities.length} 城 · </span>${idleCities?`${idleCities} 城有空闲`:'无空闲武将'}</b>`:`${label}<b>${factionDirectoryRows(s,kind).length}</b>`,`data-kind="${kind}" ${kind==='city'?`class="self-city-navigation ${idleCities?'has-idle':''}"`:''}`)).join('')}</nav>`;
}
