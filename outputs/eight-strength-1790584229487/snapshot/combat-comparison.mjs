import {abilityButton} from './ability-reference.mjs';
import {assignmentFor} from './domestic.mjs';
import {armyCommanders,armyStratagems,TROOPS} from './engine.mjs';
import {commanderStratagems,STRATAGEMS,stratagemProfile,selectStratagemSource,stratagemEffectText} from './stratagems.mjs';
import {relationshipInfo} from './relationships.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {officerTraits} from './officer-traits.mjs';
import {PASSIVES} from './passives.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {unitTactics} from './tactics.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const detail=(name,text)=>`<details class="combat-effect"><summary>${esc(name)}</summary><p>${esc(text)}</p></details>`;
const table=(heads,rows)=>`<div class="combat-comparison"><table class="personnel-table"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;

const pageSelection=new Map();
export function setCombatPage(group,page){pageSelection.set(group,page);}
function pages(group,items){const active=items.some(x=>x[0]===pageSelection.get(group))?pageSelection.get(group):items[0][0];return '<nav class="combat-pages" aria-label="编制信息分页">'+items.map(([key,name])=>`<button class="button secondary" data-action="combat-page" data-group="${group}" data-page="${key}" aria-pressed="${active===key}">${name}</button>`).join('')+'</nav>'+items.map(([key,name,body])=>`<section class="combat-page" aria-label="${name}" ${active===key?'':'hidden'}>${body}</section>`).join('');}
export function commanderComparison(s,units,roles,attribute,city){
 return pages(attribute,['leader','advisor'].map(role=>{
 const name={leader:'军团长',advisor:'军师',deputy:'副将'}[role];
 return [role,name,`<h3>任命${name}</h3>${role==='deputy'?`<label><input type="radio" name="${attribute}-${role}" ${attribute}="${role}" value="" ${!roles[role]?'checked':''}>不任命</label>`:''}${table(['任用','武将','统率','智力','武力','任职特性','任职军略'],rankOfficerCandidates(s,units,{task:'role',role,city}).map(({unit:u,recommendation})=>`<tr><td><input type="radio" name="${attribute}-${role}" ${attribute}="${role}" value="${u.id}" aria-label="任命${esc(u.name)}为${name}" ${roles[role]===u.id?'checked':''}></td><td>${esc(u.name)}</td><td>${u.leadership}</td><td>${u.intellect}</td><td>${u.force}</td><td>${recommendation.traits.map(t=>abilityButton('trait',t.id,t.name)).join('')||'无此任职特性'}</td><td>${commanderStratagems({...u,role}).map(id=>abilityButton('stratagem',id,STRATAGEMS[id].name,stratagemEffectText(stratagemProfile(id,{...u,role})))).join('')||'—'}</td></tr>`))}`];
 }));
}
export function relationshipMatrix(s,units,candidates=units,{attribute=null,locked=false,workStatus=false}={}){
 if(!candidates.length)return '<p class="muted">暂无可选部队</p>';
 return '<div class="combat-comparison relationship-matrix-wrap" tabindex="0" aria-label="部队友好度矩阵"><table class="personnel-table relationship-matrix"><thead><tr><th scope="col">友好度</th>'+units.map(u=>'<th scope="col">'+esc(u.name)+'</th>').join('')+'</tr></thead><tbody>'+candidates.map(u=>'<tr><th scope="row">'+(attribute?'<label class="relationship-choice"><input type="checkbox" '+attribute+'="'+esc(u.id)+'" '+(units.some(v=>v.id===u.id)?'checked ':'')+(locked?'disabled ':'')+'aria-label="选择'+esc(u.name)+'部队">'+'<span>'+esc(u.name)+'<small class="relationship-unit-meta">'+esc(TROOPS[u.type]?.name||u.type)+' · '+Math.round(u.hp??u.troops)+' 人</small>'+(workStatus?'<small class="relationship-unit-meta">'+(assignmentFor(s,u.id)?.action?'事务尚余 '+Math.ceil(assignmentFor(s,u.id).action.remaining)+' 天':'当前空闲，优先出征')+'</small>':'')+'</span></label>':esc(u.name))+'</th>'+units.map(v=>{
  if(u.id===v.id)return '<td class="relationship-self" aria-label="自身">—</td>';
  const {score}=relationshipInfo(u.id,v.id,s.relationshipScores,s.relationshipTypes);
  return '<td class="relationship-score" style="--bond-opacity:'+(0.04+Math.max(0,Math.min(100,score))/100*.3).toFixed(3)+'" aria-label="'+esc(u.name)+'与'+esc(v.name)+'的友好度 '+score+'">'+score+'</td>';
 }).join('')+'</tr>').join('')+'</tbody></table></div>';
}
export function combatComparison(s,units,roles=null,{prefix='本军',appointments='',only=null,relationCandidates=units,relationPicker={}}={}){
 const traits=[...new Set(units.flatMap(u=>officerTraits(u).filter(id=>PASSIVES[id]?.domain==='battle')))];
 const overview=table(['武将','兵种','适性','兵力'],units.map(u=>`<tr><td>${esc(u.name)}</td><td>${TROOPS[u.type]?.name||u.type}</td><td>${['C','B','A','S'][troopAptitude(u,u.type)]}</td><td>${Math.round(u.hp??u.troops)}</td></tr>`));
 const tactics=table(['武将','统率','武力','智力','固定战法'],units.map(u=>`<tr><td>${esc(u.name)}</td><td>${u.leadership}</td><td>${u.force}</td><td>${u.intellect}</td><td>${unitTactics(u).map(t=>abilityButton('tactic',t.id,t.name)).join('')||'—'}</td></tr>`));
 const traitPages=[];for(let i=0;i<traits.length;i+=4){const ids=traits.slice(i,i+4);traitPages.push(['traits-'+i,ids.map(id=>PASSIVES[id].name).join(' / '),table(['武将',...ids.map(id=>abilityButton('trait',id,PASSIVES[id].name))],units.map(u=>`<tr><td>${esc(u.name)}</td>${ids.map(id=>`<td>${officerTraits(u).includes(id)?abilityButton('trait',id,'●'):'—'}</td>`).join('')}</tr>`))]);}
 const relations=relationshipMatrix(s,units,relationCandidates,relationPicker);
 let strategy='<p>任命军团长、军师后显示军略。</p>';if(roles){const army={units,...roles},commanders=roles.commanders||armyCommanders(army);strategy=table(['军略','实际提供者','任职','实际效果'],[...new Set(commanders.flatMap(commanderStratagems))].map(id=>{const p=selectStratagemSource(commanders,id);return `<tr><td>${abilityButton('stratagem',id,STRATAGEMS[id].name,stratagemEffectText(p))}</td><td>${esc(p.name)}</td><td>${p.role==='leader'?'军团长':'军师'}</td><td>${abilityButton('stratagem',id,'查看详情',stratagemEffectText(p))}</td></tr>`;}))+'<p>同名军略合并取强，不叠加；效果随当前任职武将的统率、智力计算。</p>';}
 return '<section class="combat-preview">'+pages('combat-'+prefix,[...(appointments?[['appointments','任职',appointments]]:[]),['units','部队',overview],['tactics','战法',tactics],['traits','特性',traitPages.length?pages('traits-'+prefix,traitPages):'<p>暂无战斗特性。</p>'],['strategy','军略',strategy],['relations','连携',relations]].filter(item=>!only||only.includes(item[0])))+'</section>';
}
