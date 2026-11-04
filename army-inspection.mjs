import {gateDurability} from './building-durability.mjs';
import {cityStaffStatus} from './domestic-feedback.mjs';
import {intelligenceWorld,cityIntelligence,intelligenceLabel,cityVisible,armyVisionRadius} from './strategic-vision.mjs';
import {cityMilitary} from './domestic.mjs';
import {playerFaction} from './player-faction.mjs';
import {unitAttributes} from './unit-stats.mjs';
import {TROOPS,FACTIONS} from './engine.mjs';
import {passiveList} from './passives.mjs';
import {unitTactics} from './tactics.mjs';
import {mapNode} from './road-network.mjs';
import {liveSoldiers,armyBattle} from './strategic-campaign.mjs';
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(v)?v.toLocaleString('zh-CN',{maximumFractionDigits:1}):'—';
export function unitRadar(u){
 const stats=unitAttributes(u),axes=[['机动',stats.move,3],['攻击',stats.attack,350],['攻城',stats.siege,350],['军纪',stats.discipline,180],['防御',stats.defense,300]];
 const point=(i,r)=>{const a=-Math.PI/2+i*Math.PI*2/5;return [130+Math.cos(a)*r,116+Math.sin(a)*r];};
 return `<svg class="unit-radar" viewBox="0 0 260 245" role="img" aria-label="${esc(u.name)}部队基础能力"><g fill="none" stroke="#b8b4a366">${[.33,.66,1].map(r=>`<polygon points="${axes.map((_,i)=>point(i,75*r).join(',')).join(' ')}"/>`).join('')}${axes.map((_,i)=>`<path d="M130 116L${point(i,75).join(' ')}"/>`).join('')}</g><polygon points="${axes.map(([,v,max],i)=>point(i,75*Math.min(1,v/max)).join(',')).join(' ')}" fill="#69bace66" stroke="#83d6e8" stroke-width="2"/>${axes.map(([name,value],i)=>{const [x,y]=point(i,105);return `<text x="${x}" y="${y}" text-anchor="middle" fill="#e9d7a5" font-size="13">${name}<tspan x="${x}" dy="17" fill="#82d6ee">${num(value)}</tspan></text>`;}).join('')}</svg>`;
}
export function unitVisualSummary(u){return `<section class="unit-visual-summary"><div>${unitRadar(u)}</div><div class="inspection-abilities"><h4>特性</h4>${passiveList(u).map(p=>`<button data-action="ability-reference" data-kind="trait" data-id="${esc(p.id)}">${esc(p.name)}</button>`).join('')||'<span>无</span>'}<h4>战法</h4>${unitTactics(u).map(t=>`<button data-action="ability-reference" data-kind="tactic" data-id="${esc(t.id)}">${esc(t.name)}</button>`).join('')}</div></section>`;}
const summaryHeader=(name,faction)=>`<header><b>${esc(name)}</b></header><div class="hover-faction"><i style="background:${FACTIONS[faction]?.color}"></i><span>${esc(FACTIONS[faction]?.name)}</span></div>`;
const summaryTable=rows=>`<table class="hover-ledger"><tbody>${rows.map(([label,value])=>`<tr><th scope="row">${esc(label)}</th><td>${esc(value)}</td></tr>`).join('')}</tbody></table>`;
export function cityHoverMarkup(s,c){
 s=intelligenceWorld(s);c=s.cities.find(x=>x.id===c.id);const i=cityIntelligence(s,c.id);
 if(!cityVisible(s,c.id))return summaryHeader(c.name,c.owner)+summaryTable([['情报',intelligenceLabel(s,c.id)],['兵粮',i.data?num(c.grain):'未确认'],['驻军',i.data?num(c.units.reduce((n,u)=>n+u.troops,0)):'未确认'],['城防',i.data?num(gateDurability(c).hp):'未确认']]);
 const m=cityMilitary(s,c),staff=cityStaffStatus(s,c),own=c.owner===playerFaction(s);
 return summaryHeader(c.name,c.owner)+summaryTable([
 ['太守',staff.governor?.name||'—'],['兵粮',num(Math.floor(c.grain))],['士兵',num(m.troops)],['预备',num(c.manpower)],['城防',num(gateDurability(c).hp)],
 ...(own?[['任职',staff.filled+'/'+staff.total],['空闲',staff.idle.length]]:[])
 ]);
}
export function armyHoverMarkup(s,a){
 s=intelligenceWorld(s);a=s.armies.find(x=>x.id===a.id);if(!a)return '';
 const named=id=>a.units.find(u=>u.id===id)?.name||'—',types=[...new Set(a.units.filter(u=>u.troops>0).map(u=>TROOPS[u.type]?.name).filter(Boolean))],target=mapNode(s,a.target||a.route?.at(-1))?.name;
 return summaryHeader(a.name,a.faction)+summaryTable([
 ['主将',named(a.leader)],['军师',named(a.advisor)],['视野半径',armyVisionRadius(a).toLocaleString('zh-CN',{maximumFractionDigits:2})],['兵粮',num(Math.floor(a.supply||0))],['士兵',num(liveSoldiers(s,a))],['士气',num(a.morale)+'/100'],['兵科',types.length>2?'混编':types.join(' / ')||'—'],...(target?[['目标',target]]:[])
 ]);
}
