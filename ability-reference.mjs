import {STRATAGEMS} from './stratagems.mjs';
import {TACTICS_BOOK} from './tactics.mjs';
import {PASSIVES} from './passives.mjs';
export function abilityReference(kind,id){
 const tactic=kind==='tactic',catalog=tactic?TACTICS_BOOK:kind==='stratagem'?STRATAGEMS:PASSIVES,item=catalog[id];
 if(!item)return null;
 const row=t=>[t.name,'',[t.description,...(tactic?[t.powerDescription,t.terrainDescription,t.tradeoff]:[])].filter(Boolean).join('\n')];
 return {title:tactic?'战法说明':kind==='stratagem'?'军略说明':'特性说明',groups:[{name:item.name,rows:[row(item)]},{name:tactic?'战法一览':kind==='stratagem'?'军略一览':'特性一览',rows:Object.values(catalog).map(row)}]};
}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function abilityButton(kind,id,label,effect='') {return `<button class="text-button ability-link" data-action="ability-reference" data-kind="${esc(kind)}" data-id="${esc(id)}" ${effect?`data-effect="${esc(effect)}"`:''}>${esc(label)}</button>`;}
