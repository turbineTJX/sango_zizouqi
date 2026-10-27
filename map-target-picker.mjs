import {mapNode} from './road-network.mjs';
import {playerFaction} from './player-faction.mjs';
import {intelligenceWorld} from './strategic-vision.mjs';
import {scoutCandidates,scoutTargets,scoutRoute} from './scouting.mjs';
import {retreatDestinations} from './strategic-retreat.mjs';
import {FACTIONS} from './engine.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const TARGET_TITLES={'scout-city':'选择派出城','scout-target':'选择侦察终点',relay:'选择接力据点',retreat:'选择撤离节点',diplomacy:'选择重点势力'};
export function mapTargetField(kind,label,{id='',disabled=false}={}){
 return `<button type="button" class="button secondary map-target-field" ${id?`id="${id}"`:''} data-action="map-target-open" data-kind="${kind}" ${disabled?'disabled':''}>${esc(label)}<small>地图点选 →</small></button>`;
}
// Candidates use the same eligibility and intelligence projection as the command.
export function mapTargetCandidates(s,kind,{scout={},command={},battle}={}){
 const own=playerFaction(s),observed=intelligenceWorld(s);
 if(kind==='scout-city')return observed.cities.filter(c=>c.owner===own);
 if(kind==='scout-target')return scoutCandidates(s,scout.city).some(o=>o.unit.id===scout.officer)?scoutTargets(observed,scout.city):[];
 if(kind==='relay')return observed.cities.filter(c=>c.owner===own&&c.id!==command.city&&c.id!==command.destination);
 if(kind==='retreat')return battle?retreatDestinations(s,battle).map(c=>({...mapNode(observed,c.id),cost:c.cost})):[];
 if(kind==='diplomacy')return observed.cities.filter(c=>c.owner!==own&&s.campaign.diplomacy.policies[c.owner]);
 return [];
}
export function targetMapMarkup(markup,ids,selected){
 const allowed=new Set(ids);
 return markup.replaceAll('data-action="bandit-open"','').replaceAll('data-bandit-node=','data-command-city=').replaceAll('data-junction=','data-command-city=').replaceAll('data-city=','data-command-city=').replaceAll('data-campaign-army=','data-command-army=').replaceAll('data-transport-officer=','data-command-transport=').replaceAll('data-action="campaign-focus"','data-command-battle')
 .replace(/data-command-city="([^"]+)"/g,(attribute,id)=>`${attribute} data-map-target="${id===selected?'selected':allowed.has(id)?'eligible':'unavailable'}"`);
}
export function syncMapTargetAttributes(root){
 for(const node of root.querySelectorAll('[data-map-target]')){node.setAttribute('aria-pressed',String(node.dataset.mapTarget==='selected'));node.setAttribute('aria-disabled',String(node.dataset.mapTarget==='unavailable'));}
}
export function mapTargetSummary(s,pick,candidate,context){
 if(!candidate)return '<p role="status">请选择目标</p>';
 let detail=pick.kind==='diplomacy'?FACTIONS[candidate.owner]?.name:'';
 if(pick.kind==='scout-target')detail=[context.scout.city,...(scoutRoute(s,context.scout.city,candidate.id)||[])].map(id=>mapNode(s,id)?.name).join(' → ');
 if(pick.kind==='retreat')detail=`道路距离 ${Number(candidate.cost.toFixed(1))} 点`;
 return `<div role="status"><h2>${esc(candidate.name)}</h2><p>${esc(detail)}</p></div>`;
}
export function mapTargetSearchMarkup(s,kind,candidates,query=''){
 const matches=query.trim()?candidates.filter(n=>`${n.name} ${n.province||''} ${kind==='diplomacy'?FACTIONS[n.owner]?.name||'':''}`.includes(query.trim())).slice(0,12):[];
 return matches.map(n=>`<button class="button secondary" data-action="map-target-locate" data-id="${esc(n.id)}">${esc(n.name)}${kind==='diplomacy'?' · '+esc(FACTIONS[n.owner].name):''}<small>定位</small></button>`).join('')||(query.trim()?'<p>没有符合的可选目标。</p>':'');
}
