import {percentText} from './number-rules.mjs';
import {DIPLOMACY_RELATION_ACTIONS as ACTIONS} from './data/design/diplomacy-rules.mjs';
import {diplomaticRelation,diplomaticTradeMultiplier,diplomaticActionUnlocked} from './diplomatic-access.mjs';
import {factionsHostile,factionsAllied} from './diplomacy-relations.mjs';
import {playerFaction} from './player-faction.mjs';
import {FACTIONS} from './engine.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function diplomaticRelationsMarkup(s){
 const own=playerFaction(s),actions=Object.entries(ACTIONS);
 const rows=Object.keys(s.campaign.diplomacy.policies).filter(f=>f!==own&&s.cities.some(c=>c.owner===f)).map(f=>{
  const state=factionsAllied(s,own,f)?'同盟':factionsHostile(s,own,f)?'交战':'和平';
  const cells=actions.map(([key,def])=>{
   const unlocked=diplomaticActionUnlocked(s,own,f,key),label=key==='border'?'换城按城池价值、地理得失与补偿议价，交情影响报价倍率':unlocked?`${def.name}已解锁`:`${def.name}需交情${def.minimum}`;
   return `<td class="diplomatic-action-cell ${unlocked?'unlocked':'locked'}" data-diplomatic-action="${key}" data-unlocked="${unlocked}" title="${label}"><span role="img" aria-label="${label}">${key==='border'?'议价':unlocked?'✓':def.minimum}</span></td>`;
  }).join('');
  return `<tr data-diplomatic-faction="${esc(f)}"><th scope="row">${esc(FACTIONS[f].name)}</th><td>${state}</td><td data-diplomatic-relation>${diplomaticRelation(s,own,f)}</td><td data-diplomatic-multiplier>${percentText(diplomaticTradeMultiplier(s,own,f))}</td>${cells}</tr>`;
 }).join('');
 return `<section class="diplomatic-relations"><h3>势力</h3><div class="personnel-table-wrap" tabindex="0" aria-label="势力交情与外交动作"><table class="personnel-table diplomatic-relations-table"><thead><tr><th scope="col">势力</th><th scope="col">状态</th><th scope="col">交情</th><th scope="col" title="初始交易报价倍率；120%表示付出120价值换取100价值，供需与反报价另计">倍率</th>${actions.map(([,def])=>`<th scope="col">${def.name}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${actions.length+4}">暂无其他势力</td></tr>`}</tbody></table></div></section>`;
}
