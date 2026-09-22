import {passiveList} from './passives.mjs';
import {unitAttributes,ATTRIBUTE_LABELS} from './unit-stats.mjs';
import {unitTactics} from './tactics.mjs';
import {TROOPS,TACTICS} from './engine.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {commanderComparison,combatComparison} from './combat-comparison.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const FORMATIONS={front:'前排',middle:'中排',back:'后排',left:'左翼',right:'右翼'};
export function setupTrail(steps,step,action){
 const labels={'unit-select':'选择已编部队',officers:'选择武将',formation:'编制部队','unit-review':'部队管理',commanders:'编组军团',review:'核阅结果'},index=steps.indexOf(step);
 return `<nav class="command-steps" aria-label="下令步骤">${steps.map((key,i)=>`<button data-action="${action}" data-step="${key}" ${i>=index?'disabled':''} aria-current="${i===index?'step':'false'}"><small>${i+1}</small>${labels[key]||key}</button>`).join('')}</nav>`;
}
// Mode adapters provide legal troop choices and draft event attributes. The view
// never changes a city, army, save, or battle.
export function unitFormationMarkup(units,{editTroop=true,types=Object.keys(TROOPS),typeAttribute='data-command-type',positionAttribute=null,firstAttribute=null,levelAttribute=null,troopsAttribute=null,troopsMax=troopCapacity,detailAction='campaign-person-detail',detailAttribute='data-officer',orderAction=null,tactic=null,tacticId='military-tactic'}={}){
 return `<div class="command-formation">${tactic!==null?`<label>全军策略<select id="${tacticId}">${Object.entries(TACTICS).map(([id,name])=>`<option value="${id}" ${id===tactic?'selected':''}>${name}</option>`).join('')}</select></label>`:''}${units.map((u,i)=>`<article><button class="personnel-name" data-action="${detailAction}" ${detailAttribute}="${u.id}">${esc(u.name)} ↗</button>${orderAction?`<span>出阵序 ${i+1}</span><button type="button" class="text-button" data-action="${orderAction}" data-id="${u.id}" data-offset="-1" ${i===0?'disabled':''} aria-label="上移${esc(u.name)}">↑</button><button type="button" class="text-button" data-action="${orderAction}" data-id="${u.id}" data-offset="1" ${i===units.length-1?'disabled':''} aria-label="下移${esc(u.name)}">↓</button>`:''}${firstAttribute?`<label><input type="checkbox" ${firstAttribute}="${u.id}" ${u.first?'checked':''}>首发</label>`:''}${editTroop?`<label>兵种<select ${typeAttribute}="${u.id}" aria-label="${esc(u.name)}兵种">${types.map(type=>`<option value="${type}" ${u.type===type?'selected':''}>${TROOPS[type].name}（${TROOPS[type].family==='siege'?'兵器':TROOPS[TROOPS[type].family].name}） · 每千人 ${TROOPS[type].goldPerThousand} 金 · ${['C','B','A','S'][troopAptitude(u,type)]}</option>`).join('')}</select></label>`:`<p>已编部队 · ${TROOPS[u.type].name} · 适性 ${['C','B','A','S'][troopAptitude(u,u.type)]}</p>`}${positionAttribute?`<label>位置<select ${positionAttribute}="${u.id}" aria-label="${esc(u.name)}位置">${Object.entries(FORMATIONS).map(([id,name])=>`<option value="${id}" ${u.formation===id?'selected':''}>${name}</option>`).join('')}</select></label>`:''}${levelAttribute?`<label>等级<input type="number" min="1" max="10" ${levelAttribute}="${u.id}" value="${u.level}" aria-label="${esc(u.name)}等级"></label>`:''}${troopsAttribute?troopSliderMarkup(u,troopsAttribute,troopsMax(u)):''}<p>现役 ${u.troops} · 伤兵 ${u.wounded||0} · 带兵上限 ${troopCapacity(u)}</p>${editTroop?unitTraitsMarkup(u):''}</article>`).join('')}</div>`;
}
export function commanderSetupMarkup(s,units,roles,{attribute='data-expedition-role',city}={}){
 return commanderComparison(s,units,roles,attribute,city);
}

export function unitTraitsMarkup(u){
 const traits=passiveList(u).filter(t=>t.domain==='battle'&&t.state!=='兵种不符');
 return `<section class="unit-relevant-traits"><h4>${TROOPS[u.type].name}适性 ${['C','B','A','S'][troopAptitude(u,u.type)]} · 适用武将特性</h4>${traits.map(t=>`<details><summary>${esc(t.name)} · ${esc(t.state)}</summary><p>${esc(t.description)}</p></details>`).join('')||'<p>暂无适用战斗特性</p>'}</section>`;
}
export function unitReviewMarkup(units,{terrain='land',detailAction='campaign-person-detail',detailAttribute='data-officer'}={}){
 return `<section class="compiled-units"><h3>编成的部队</h3>${units.map(u=>{const stats=unitAttributes(u,{terrain,tick:0,sides:[]});return `<article class="compiled-unit"><h4><button class="personnel-name" data-action="${detailAction}" ${detailAttribute}="${u.id}">${esc(u.name)}部队 ↗</button> · ${TROOPS[u.type].name} · 适性 ${['C','B','A','S'][troopAptitude(u,u.type)]}</h4><p>${u.troops} 人 / 上限 ${troopCapacity(u)} · 等级 ${u.level||1}</p><dl class="compiled-unit-stats">${Object.entries(ATTRIBUTE_LABELS).map(([key,name])=>`<div><dt>${name}</dt><dd>${Number(stats[key].toFixed(2))}</dd></div>`).join('')}</dl>${unitTraitsMarkup(u)}<h4>当前兵种固定战法</h4>${unitTactics(u).map(t=>`<details><summary>${esc(t.name)}</summary><p>${esc(t.description)}</p></details>`).join('')||'<p>无可用战法</p>'}</article>`;}).join('')}</section>`;
}

export function compiledUnitPickerMarkup(units,selected,{attribute,locked=false}={}){
 return `<section class="compiled-unit-picker"><h3>从已编制部队中选择</h3>${units.map(u=>`<label class="compiled-unit"><input type="checkbox" ${attribute}="${u.id}" ${selected.includes(u.id)?'checked':''} ${locked?'disabled':''}> ${esc(u.name)}部队 · ${TROOPS[u.type].name} · 适性 ${['C','B','A','S'][troopAptitude(u,u.type)]} · ${u.troops} 人</label>`).join('')||'<p>暂无已编制部队，请返回编制。</p>'}</section>`;
}

export function unitCommanderField(unit,action){
 return `<section class="unit-commander-field"><h3>编制一支部队</h3><p>主将</p><button class="button secondary" data-action="${action}">${unit?esc(unit.name)+' · 更换主将':'选择主将'}</button></section>`;
}

export function troopSliderMarkup(u,attribute,max){
 const disabled=max<1000,value=Math.max(1000,Math.min(max,u.troops));
 return `<div class="troop-slider"><label>兵力 <output>${disabled?'不足1000':value}</output> 人<input type="range" min="1000" max="${Math.max(1000,max)}" step="1" value="${value}" ${attribute}="${u.id}" aria-label="${esc(u.name)}兵力" ${disabled?'disabled':''}></label><button type="button" data-action="troop-min" ${disabled?'disabled':''}>最小 1000</button><button type="button" data-action="troop-max" ${disabled?'disabled':''}>最大 ${max}</button>${disabled?'<p role="alert">可用兵力不足1000，无法编制。</p>':''}</div>`;
}

export function unitManagementMarkup(units,{editAction,disbandAction,newAction,canAdd=true,detailAction='campaign-person-detail',terrain='land'}={}){
 return '<section class="compiled-unit-picker"><h3>部队管理</h3><p>选择部队进行修改，或新增一支部队。</p>'+units.map(u=>'<article class="compiled-unit"><b>'+esc(u.name)+'部队</b> · '+TROOPS[u.type].name+' · '+u.troops+' 人 <button class="button secondary" data-action="'+editAction+'" data-id="'+u.id+'">修改</button>'+ (disbandAction?'<button class="button secondary" data-action="'+disbandAction+'" data-id="'+u.id+'">解散</button>':'')+'<details><summary>查看部队详情</summary>'+unitReviewMarkup([u],{detailAction,terrain})+'</details></article>').join('')+(units.length?'':'<p>暂无已编制部队。</p>')+(newAction?'<button class="button secondary" data-action="'+newAction+'" '+(canAdd?'':'disabled')+'>新增部队</button>':'')+'</section>';
}
