import {bondReference} from './bond-reference.mjs';
import {STRATAGEMS} from './stratagems.mjs';
import {TACTICS_BOOK} from './tactics.mjs';
import {PASSIVES} from './passives.mjs';
export function abilityReference(kind,id){
 if(kind==='bond'||(kind==='trait'&&bondReference(id)))return bondReference(id);
 const tactic=kind==='tactic',catalog=tactic?TACTICS_BOOK:kind==='stratagem'?STRATAGEMS:PASSIVES,item=catalog[id];
 if(!item)return null;
 const row=t=>[t.name,'',[t.description,...(tactic?[t.powerDescription,t.terrainDescription,t.tradeoff]:[])].filter(Boolean).join('\n')];
 return {title:tactic?'战法说明':kind==='stratagem'?'军略说明':'特性说明',groups:[{name:item.name,rows:[row(item)]}]};
}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function abilityButton(kind,id,label,effect='') {return `<button class="text-button ability-link" data-action="ability-reference" data-kind="${esc(kind)}" data-id="${esc(id)}" ${effect?`data-effect="${esc(effect)}"`:''}>${esc(label)}</button>`;}

export function abilityOverview(kind){
 const catalog={trait:PASSIVES,tactic:TACTICS_BOOK,stratagem:STRATAGEMS}[kind];
 if(!catalog)return null;
 return {title:({trait:'特性',tactic:'战法',stratagem:'军略'})[kind]+'一览',groups:[{name:'全部',rows:Object.keys(catalog).flatMap(id=>abilityReference(kind,id)?.groups[0].rows||[])}]};
}
