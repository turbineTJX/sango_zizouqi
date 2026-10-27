import {mapNode,isJunction} from './road-network.mjs';
import {canPrepareSiegeDefense} from './strategic-roster.mjs';
import {armyDetailsMarkup} from './army-details.mjs';
import {playerFaction} from './player-faction.mjs';
import {unitMusterMarkup,unitReviewMarkup,commanderSetupMarkup} from './army-setup-view.mjs';
import {combatComparison} from './combat-comparison.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {canEditArmy,needsSiegeDefense} from './strategic-campaign.mjs';
import {siegeDefensePlan} from './siege-defense.mjs';
import {TROOPS} from './engine.mjs';
import {canTrain} from './domestic.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {decisionFacts,decisionDetails,armyChanges} from './decision-summary-view.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import {militarySteps,newMilitaryFlow,previewMilitaryFlow,militarySelectionError} from './army-management.mjs';
export {militarySteps,newMilitaryFlow,previewMilitaryFlow};
const button=(action,label,extra='')=>`<button class="button secondary" data-action="${action}" ${extra}>${label}</button>`;
export function militaryFlowMarkup(s,p){
 const a=s.armies.find(a=>a.id===p.armyId);if(!a)return {title:'军团已离开',body:'请重新选择军团。',footer:button('military-cancel','返回')};
 const names={purpose:'整军',adjust:'调整编制',split:'拆分军团',merge:'合并军团',recruit:'征募整补'},steps=militarySteps(p),i=steps.indexOf(p.step),selected=['split','recruit'].includes(p.kind)?a.units.filter(u=>p.selected.includes(u.id)):a.units,c=mapNode(s,a.location);
 let body=`<div class="command-flow"><p class="decision-context">${esc(a.name)} · ${esc(c.name)}</p>`;
 if(p.step==='purpose')body+=`<div class="command-choices">${(isJunction(s,a.location)?['adjust','split','merge']:['adjust','split','merge','recruit']).map(k=>button('military-purpose',names[k],`data-kind="${k}"`)).join('')}</div>`;
 if(p.step==='select'){
  body+=`<h3>${p.kind==='merge'?'选择并入本军的军团':p.kind==='split'?'选择另立军团的部队':'选择需要补充兵员的部队'}</h3>`;
  if(p.kind==='merge')body+=s.armies.filter(b=>b.id!==a.id&&b.faction===playerFaction(s)&&b.location===a.location&&canEditArmy(s,b)).map(b=>`<label class="command-reinforce"><input type="radio" name="military-target" data-military-target="${b.id}" ${p.target===b.id?'checked':''}>${esc(b.name)} · ${b.units.length} 队 · 合并后 ${a.units.length+b.units.length} 队</label>`).join('')||'<p>此地暂无可合并军团。</p>';
  else body+='<div class="combat-comparison"><table class="personnel-table"><thead><tr><th>选择</th><th>武将</th><th>兵种</th><th>现役</th><th>伤兵</th><th>带兵上限</th><th>可补兵员</th></tr></thead><tbody>'+rankOfficerCandidates(s,a.units,{task:p.kind,city:c.id}).map(({unit:u})=>`<tr><td><input type="checkbox" data-military-unit="${u.id}" ${p.selected.includes(u.id)?'checked':''}></td><td>${button('military-detail',esc(u.name),`data-id="${u.id}"`)}</td><td>${TROOPS[u.type].name}</td><td>${u.troops}</td><td>${u.wounded}</td><td>${troopCapacity(u)}</td><td>${Math.max(0,troopCapacity(u)-u.troops-u.wounded)}</td></tr>`).join('')+'</tbody></table></div>';
 }
 const configured=selected.map(u=>({...u,...p.units[u.id]}));
 if(p.step==='configure')body+=unitMusterMarkup(configured,{editTroop:!isJunction(s,a.location),equipmentCity:c,types:isJunction(s,a.location)?[]:Object.keys(TROOPS).filter(type=>canTrain(c,type)||TROOPS[type].category==='troop'&&selected.some(u=>u.type===type)),typeAttribute:'data-military-type',detailAction:'military-detail',detailAttribute:'data-id'});
 const preview=['review','configure','commanders'].includes(p.step)?previewMilitaryFlow(s,p):null;
 if(p.step==='configure'&&preview?.army)body+=decisionDetails('部队与属性',unitReviewMarkup(preview.army.units,{detailAction:'military-detail',detailAttribute:'data-id'}));
 if(p.step==='commanders')body+=commanderSetupMarkup(s,preview?.army?.units||configured,p.roles,{attribute:'data-military-role',city:c.id});
 if(p.step==='review'&&preview?.state){
  const before=p.kind==='merge'?[a,s.armies.find(b=>b.id===p.target)].filter(Boolean):[a],after=p.kind==='split'?[preview.state.armies.find(b=>b.id===a.id),preview.army]:[preview.army];
  body+=armyChanges(before,after)+decisionFacts([['消耗金',preview.gold],['消耗粮',preview.grain]])+decisionDetails('部队与属性',armyDetailsMarkup(preview.army)+combatComparison(s,preview.army.units,preview.army));
 }
 if(p.step==='select'&&p.kind!=='merge'&&selected.length)body+=decisionDetails('已选部队 · '+selected.length+' 队',combatComparison(s,selected,null,{only:['relations']})+unitReviewMarkup(selected,{detailAction:'military-detail',detailAttribute:'data-id'}));
 if(preview?.error)body+=`<p role="alert">${esc(preview.error)}</p>`;
 return {title:names[p.kind],body:body+'</div>',footer:button('military-cancel','取消')+(i>0?button('military-back','上一步'):'')+(p.step==='purpose'?'':button(p.step==='review'?'military-confirm':'military-next',p.step==='review'?'确认':'下一步',preview?.error||p.step==='select'&&militarySelectionError(s,p)?'disabled':''))};
}

export function siegeDefenseOptionsMarkup(s,r){
 if(!canPrepareSiegeDefense(s,r))return '';
 const plan=siegeDefensePlan(s,r.cityId),empty=needsSiegeDefense(r);
 return `${empty?'<p role="alert">无现役守军 · 放弃守城将失去本城</p>':''}<div class="command-choices">${button('campaign-defense-prepare','守城编制',`data-battle="${r.id}"`)}${plan.officerIds.length?button('campaign-defense-auto',`自动编制守城（${plan.gold}金 / ${plan.men}预备兵）`,`data-battle="${r.id}"`):''}${empty?button('campaign-defense-relinquish','放弃守城，交出本城',`data-battle="${r.id}"`):''}</div>`;
}
export function encounterFlowMarkup(s,p){
 const pending=s.campaign.battles.filter(r=>r.awaiting&&!r.settled),r=pending.find(r=>r.id===p.id);
 if(!r)return {title:'战线已处理',body:'请选择其它战线。',footer:button('military-cancel','返回')};
 const c=mapNode(s,r.cityId),own=r.battle.sides[0],enemy=r.battle.sides[1],steps=['查看敌情','整备部队','确认指挥'];
 let body=`<div class="command-choices">${pending.map(b=>button('encounter-select',b.name,`data-id="${b.id}" ${b.id===p.id?'disabled':''}`)).join('')}</div><div class="command-trail">${steps.map((n,i)=>`<span class="${i===p.step?'active':''}">${i+1} · ${n}</span>`).join('')}</div><h3>${esc(r.name)}</h3><p>${esc(c.name)} · ${esc(c.province)} · 世界第 ${s.campaign.day} 天 · 待处理 ${pending.length} 处战线</p>`;
 if(p.step===0)body+=`<div class="encounter-versus"><div><b>我军</b><strong>${own.units.reduce((n,u)=>n+u.hp,0)} 人</strong></div><span>对</span><div><b>敌军</b><strong>${enemy.units.reduce((n,u)=>n+u.hp,0)} 人</strong></div></div><p>${r.kind==='siege'?'攻守城战 · 城门耐久 '+Math.round(r.battle.siege.gate.hp):'野外遭遇 · 双方以现有军团接战'}</p><details><summary>敌军部队情报</summary>${enemy.units.map(u=>`<p>${esc(u.name)} · ${TROOPS[u.type]?.name||u.type} · ${Math.round(u.hp)} 人 ${button('military-detail','查看部队',`data-id="${u.id}" data-battle="${r.id}"`)}</p>`).join('')}</details>`;
 if(p.step===1)body+=`<h3>核阅参战部队</h3>${own.units.map(u=>`<p>${esc(u.name)} · ${TROOPS[u.type]?.name||u.type} · ${Math.round(u.hp)} 人 ${button('military-detail','查看部队',`data-id="${u.id}" data-battle="${r.id}"`)}</p>`).join('')}`;
 if(p.step===1||needsSiegeDefense(r))body+=siegeDefenseOptionsMarkup(s,r);
 if(p.step===1)body+=combatComparison(r.battle,own.units,{commanders:own.commanders},{prefix:'参战'});
 if(p.step===2)body+=`<h3>请选择本战指挥方式</h3><label class="command-reinforce"><input type="radio" name="encounter-control" value="manual" ${p.control==='manual'?'checked':''}>亲自指挥</label><label class="command-reinforce"><input type="radio" name="encounter-control" value="auto" ${p.control==='auto'?'checked':''}>委托作战</label>`;
 return {title:'战前准备',body,footer:button('military-cancel','返回舆图')+(p.step?button('encounter-back','上一步'):'')+button(p.step===2?'encounter-confirm':'encounter-next',p.step===2?'确认':'下一步',p.step===2&&needsSiegeDefense(r)?'disabled':'')};
}
