import {passiveList,passiveAttributes} from './passives.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function traitChips(u,b=null,onlyBattle=false){
 const list=passiveList(u,b).filter(t=>!t.cap&&(!onlyBattle||t.domain==='battle'));
 const labels=Object.values(passiveAttributes(b,u)).flat().map(m=>m.label).join(' ');
 return list.map(t=>{const active=labels.includes(t.name)||/^(已生效|生效中|在场生效|军团任职生效|相邻友军范围内生效)/.test(t.state);return `<button data-action="ability-reference" data-kind="trait" data-id="${esc(t.id)}" class="unit-trait-name ${active?'trait-active':''}" aria-label="${esc(t.name)}${active?'，生效':''}">${esc(t.name)}${t.cap?` ${t.level}／${t.cap}`:''}</button>`;}).join('')+(list.length?'':'<span>无</span>');
}
