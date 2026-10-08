import {armyDetailsMarkup} from './army-details.mjs';
import {playerFaction} from './player-faction.mjs';
import {unitFormationMarkup,unitReviewMarkup,commanderSetupMarkup} from './army-setup-view.mjs';
import {commanderComparison,combatComparison} from './combat-comparison.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {canEditArmy,changeCampaignTroop,recruitCampaign,splitCampaignArmy,mergeCampaignArmies} from './strategic-campaign.mjs';
import {TROOPS,TACTICS,armyStratagems,STRATAGEMS} from './engine.mjs';
import {canTrain} from './domestic.mjs';
import {troopCapacity} from './troop-capacity.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const militarySteps=p=>p.kind==='adjust'?['configure','unit-review','commanders','review']:p.kind==='split'?['select','configure','unit-review','commanders','review']:['select','review'];
export function newMilitaryFlow(s,armyId,kind='purpose'){
 const a=s.armies.find(a=>a.id===armyId);return {armyId,kind,step:kind==='purpose'?'purpose':militarySteps({kind})[0],selected:[],target:null,roles:{leader:a?.leader,advisor:a?.advisor,deputy:null},units:Object.fromEntries((a?.units||[]).map(u=>[u.id,{type:u.type,formation:u.formation,first:u.first}])),tactic:a?.tactic};
}
export function previewMilitaryFlow(s,p){
 const next=structuredClone(s),a=next.armies.find(a=>a.id===p.armyId);if(!canEditArmy(next,a)||a.faction!==playerFaction(s))return {error:'军团当前不能调整，请在友城筹划阶段操作'};
 let error,target=a;
 if(p.kind==='split'){error=splitCampaignArmy(next,a.id,p.selected);target=next.armies.at(-1);}
 else if(p.kind==='merge'){const b=next.armies.find(a=>a.id===p.target);if(!b||b.units.length+a.units.length>10)return {error:'合并后最多十队，请调整选择'};error=mergeCampaignArmies(next,a.id,p.target);}
 else if(p.kind==='recruit'){if(!p.selected.length||p.selected.some(id=>!a.units.some(u=>u.id===id)))return {error:'请选择本军需要整补的部队'};error=recruitCampaign(next,a.id,p.selected);}
 if(error)return {error};
 if(['adjust','split'].includes(p.kind)){
  for(const key of ['leader','advisor','deputy']){const id=p.roles[key];if((key!=='deputy'||id!==null)&&!target.units.some(u=>u.id===id))return {error:'请从本军部队中选择任职武将'};target[key]=id;}
  if(!Object.hasOwn(TACTICS,p.tactic))return {error:'请选择全军策略'};target.tactic=p.tactic;
  for(const u of target.units){const d=p.units[u.id];if(!d||!['front','middle','back','left','right'].includes(d.formation))return {error:'部队配置无效'};error=changeCampaignTroop(next,target.id,u.id,d.type);if(error)return {error};u.formation=d.formation;u.first=!!d.first;}
 }
 return {state:next,army:target,gold:s.gold-next.gold,men:target.units.reduce((n,u)=>n+u.troops,0)-a.units.reduce((n,u)=>n+u.troops,0),grain:s.cities.reduce((n,c)=>n+c.grain,0)-next.cities.reduce((n,c)=>n+c.grain,0)};
}
const button=(action,label,extra='')=>`<button class="button secondary" data-action="${action}" ${extra}>${label}</button>`;
export function militaryFlowMarkup(s,p){
 const a=s.armies.find(a=>a.id===p.armyId);if(!a)return {title:'军团已离开',body:'请重新选择军团。',footer:button('military-cancel','返回')};
 const names={purpose:'选择调整目的',adjust:'调整编制',split:'拆分军团',merge:'合并军团',recruit:'征募整补'},steps=militarySteps(p),i=steps.indexOf(p.step),selected=p.kind==='split'?a.units.filter(u=>p.selected.includes(u.id)):a.units,c=s.cities.find(c=>c.id===a.location);
 let body=`<p>${esc(a.name)} · ${esc(c.name)} · ${a.units.length} 队</p><div class="command-flow"><div class="command-trail">${steps.map((x,j)=>`<span class="${j===i?'active':''}">${j+1} · ${{select:'选择对象',configure:'编制部队','unit-review':'部队面板',commanders:'编组军团',review:'核阅结果'}[x]}</span>`).join('')}</div>`;
 if(p.step==='purpose')body+=`<h3>此次要如何整军？</h3><div class="command-choices">${['adjust','split','merge','recruit'].map(k=>button('military-purpose',names[k],`data-kind="${k}"`)).join('')}</div>`;
 if(p.step==='select'){
  body+=`<h3>${p.kind==='merge'?'选择并入本军的军团':p.kind==='split'?'选择另立军团的部队':'选择需要补充兵员的部队'}</h3>`;
  if(p.kind==='merge')body+=s.armies.filter(b=>b.id!==a.id&&b.faction===playerFaction(s)&&b.location===a.location&&canEditArmy(s,b)).map(b=>`<label class="command-reinforce"><input type="radio" name="military-target" data-military-target="${b.id}" ${p.target===b.id?'checked':''}>${esc(b.name)} · ${b.units.length} 队 · 合并后 ${a.units.length+b.units.length} 队</label>`).join('')||'<p>此地暂无可合并军团。</p>';
  else body+='<div class="combat-comparison"><table class="personnel-table"><thead><tr><th>选择</th><th>武将</th><th>兵种</th><th>现役</th><th>伤兵</th><th>带兵上限</th><th>可补兵员</th></tr></thead><tbody>'+rankOfficerCandidates(s,a.units,{task:p.kind,city:c.id}).map(({unit:u})=>`<tr><td><input type="checkbox" data-military-unit="${u.id}" ${p.selected.includes(u.id)?'checked':''}></td><td>${button('military-detail',esc(u.name),`data-id="${u.id}"`)}</td><td>${TROOPS[u.type].name}</td><td>${u.troops}</td><td>${u.wounded}</td><td>${troopCapacity(u)}</td><td>${Math.max(0,troopCapacity(u)-u.troops-u.wounded)}</td></tr>`).join('')+'</tbody></table></div>';
 }
 const configured=selected.map(u=>({...u,...p.units[u.id]}));
 if(p.step==='configure')body+='<h3>第一阶段 · 编制部队</h3>'+unitFormationMarkup(configured,{types:Object.keys(TROOPS).filter(type=>canTrain(c,type)),typeAttribute:'data-military-type',detailAction:'military-detail',detailAttribute:'data-id'});
 const preview=['review','configure','unit-review','commanders'].includes(p.step)?previewMilitaryFlow(s,p):null;
 if(p.step==='unit-review')body+=unitReviewMarkup(preview?.army?.units||configured,{detailAction:'military-detail',detailAttribute:'data-id'});
 if(p.step==='commanders')body+='<h3>第二阶段 · 将部队编成军团</h3>'+commanderSetupMarkup(s,preview?.army?.units||configured,p.roles,{attribute:'data-military-role',city:c.id});
 if(p.step==='review'&&preview?.state){const b=preview.army;body+=`<h3>核阅${names[p.kind]}结果</h3><p>${esc(b.name)} · ${b.units.length} 队 · ${b.units.reduce((n,u)=>n+u.troops,0)} 人 · 携粮 ${Math.floor(b.supply)}</p><p>消耗 ${preview.gold} 金 / ${preview.grain} 城内粮草</p><p>军团长 ${esc(b.units.find(u=>u.id===b.leader)?.name)} · 军师 ${esc(b.units.find(u=>u.id===b.advisor)?.name)} · 副将 ${esc(b.units.find(u=>u.id===b.deputy)?.name||'无')}</p><p>军略：${armyStratagems(b).map(id=>STRATAGEMS[id].name).join('、')}</p>${b.units.map(u=>`<p>${esc(u.name)} · ${TROOPS[u.type].name} · ${u.troops} 人</p>`).join('')}${p.kind==='split'?`<p>原军保留 ${preview.state.armies.find(b=>b.id===a.id).units.length} 队。</p>`:''}<p>确认后生效，返回仍可修改。</p>`;}
 if(p.step==='review'&&preview?.army)body+=armyDetailsMarkup(preview.army)+combatComparison(s,preview.army.units,preview.army);
 if(p.step==='select'&&p.kind!=='merge')body+=combatComparison(s,selected,null,{only:['relations']})+unitReviewMarkup(a.units.filter(u=>p.selected.includes(u.id)),{detailAction:'military-detail',detailAttribute:'data-id'});
 if(preview?.error)body+=`<p role="alert">${esc(preview.error)}</p>`;
 return {title:names[p.kind],body:body+'</div>',footer:button('military-cancel','取消')+(i>0?button('military-back','上一步'):'')+(p.step==='purpose'?'':button(p.step==='review'?'military-confirm':'military-next',p.step==='review'?'确认执行':'下一步',preview?.error?'disabled':''))};
}

export function encounterFlowMarkup(s,p){
 const pending=s.campaign.battles.filter(r=>r.awaiting&&!r.settled),r=pending.find(r=>r.id===p.id);
 if(!r)return {title:'战线已处理',body:'请选择其它战线。',footer:button('military-cancel','返回')};
 const c=s.cities.find(c=>c.id===r.cityId),own=r.battle.sides[0],enemy=r.battle.sides[1],steps=['查看敌情','整备部队','确认指挥'];
 let body=`<div class="command-choices">${pending.map(b=>button('encounter-select',b.name,`data-id="${b.id}" ${b.id===p.id?'disabled':''}`)).join('')}</div><div class="command-trail">${steps.map((n,i)=>`<span class="${i===p.step?'active':''}">${i+1} · ${n}</span>`).join('')}</div><h3>${esc(r.name)}</h3><p>${esc(c.name)} · ${esc(c.province)} · 世界第 ${s.campaign.day} 天 · 待处理 ${pending.length} 处战线</p>`;
 if(p.step===0)body+=`<div class="encounter-versus"><div><b>我军</b><strong>${own.units.reduce((n,u)=>n+u.hp,0)} 人</strong></div><span>对</span><div><b>敌军</b><strong>${enemy.units.reduce((n,u)=>n+u.hp,0)} 人</strong></div></div><p>${r.kind==='siege'?'攻守城战 · 城门耐久 '+Math.round(r.battle.siege.gate.hp):'野外遭遇 · 双方以现有军团接战'}</p><details><summary>敌军部队情报</summary>${enemy.units.map(u=>`<p>${esc(u.name)} · ${TROOPS[u.type]?.name||u.type} · ${Math.round(u.hp)} 人 ${button('military-detail','查看部队',`data-id="${u.id}" data-battle="${r.id}"`)}</p>`).join('')}</details>`;
 if(p.step===1)body+=`<h3>核阅参战部队</h3>${own.units.map(u=>`<p>${esc(u.name)} · ${TROOPS[u.type]?.name||u.type} · ${Math.round(u.hp)} 人 ${button('military-detail','查看部队',`data-id="${u.id}" data-battle="${r.id}"`)}</p>`).join('')}${r.kind==='siege'&&c.owner===playerFaction(s)?button('campaign-defense-prepare','临时编制守城部队',`data-battle="${r.id}"`):''}`;
 if(p.step===1)body+=combatComparison(r.battle,own.units,{commanders:own.commanders},{prefix:'参战'});
 if(p.step===2)body+=`<h3>请选择本战指挥方式</h3><label class="command-reinforce"><input type="radio" name="encounter-control" value="manual" ${p.control==='manual'?'checked':''}>亲自指挥 · 进入战前会议，调整出阵顺序与布阵；确认开战前保持暂停</label><label class="command-reinforce"><input type="radio" name="encounter-control" value="auto" ${p.control==='auto'?'checked':''}>委托作战 · 按现有编制和固定规则自动作战</label>`;
 return {title:'战前军议',body,footer:button('military-cancel','返回舆图')+(p.step?button('encounter-back','上一步'):'')+button(p.step===2?'encounter-confirm':'encounter-next',p.step===2?'确认指挥方式':'下一步')};
}
