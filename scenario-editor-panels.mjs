import {nationalWorld} from './national-scenarios.mjs';
import {scenarioPeople,scenarioForce,newScenarioForceId,SCENARIO_STATES,SCENARIO_BUILDINGS,SCENARIO_DUTIES,SCENARIO_TECHS,scenarioTechnologyAllowed,scenarioLocalBuildingLimit} from './scenario-document.mjs';
import {parseScenarioDate,scenarioDateText} from './scenario-date.mjs';
import {sortRows} from './list-sort.mjs';
import {atlasOverviewMarkup} from './ancient-atlas-terrain.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const option=(id,name,value)=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(name)}</option>`;
const button=(action,label,extra='',classes='button secondary')=>`<button class="${classes}" data-se-action="${action}" ${extra}>${label}</button>`;
const input=(name,field,value,attrs='')=>`<label>${name}<input data-se-field="${field}" value="${esc(value)}" ${attrs}></label>`;
const select=(name,field,options)=>`<label>${name}<select data-se-field="${field}">${options}</select></label>`;
const number=(name,field,value,min,max,placeholder='沿用默认')=>input(name,field,value??'',`type="number" min="${min}" max="${max}" placeholder="${placeholder}"`);
const forceName=(d,id)=>scenarioForce(d,id)?.name||'中立';
const townName=(d,id)=>nationalWorld(d.sourceScenario).cities.find(c=>c.id===id)?.name||'—';
function context(e){const d=e.draft,world=nationalWorld(d.sourceScenario),people=scenarioPeople(d),byId=new Map(people.map(o=>[o.id,o]));return {d,world,people,byId};}
function entryFor(e){const d=e.draft;let o=d.officers.find(o=>o.id===e.officerId);if(!o){o={id:e.officerId,state:'free',faction:null,cityId:e.cityId||d.cities[0].id};d.officers.push(o);}return o;}
function placeRuler(d,f){let o=d.officers.find(o=>o.id===f.leaderId);if(!o){o={id:f.leaderId};d.officers.push(o);}Object.assign(o,{state:'serving',faction:f.id,cityId:f.capitalId});delete o.debutDate;delete o.freeDate;delete o.captor;}
export function changeScenarioField(e,field,value){
 const d=e.draft;
 if(['year','month','day','level'].includes(field))d[field]=Number(value);
 else if(['name','description','kind'].includes(field))d[field]=value;
 else if(field.startsWith('city-')){const c=d.cities.find(c=>c.id===e.cityId),key=field.slice(5);if(value==='')delete c[key];else c[key]=key==='owner'?value:Number(value);}
 else if(field.startsWith('building-')){const c=d.cities.find(c=>c.id===e.cityId),key=field.slice(9);c.buildings??={};if(value==='')delete c.buildings[key];else c.buildings[key]=Number(value);}
 else if(field.startsWith('tech-')){const c=d.cities.find(c=>c.id===e.cityId),key=field.slice(5);c.techs??=[];c.techs=c.techs.filter(id=>id!==key);if(value)c.techs.push(key);}
 else if(field.startsWith('force-')){const f=scenarioForce(d,e.forceId),key=field.slice(6);if(!f)return;f[key]=value;if(['leaderId','capitalId'].includes(key))placeRuler(d,f);}
 else if(field.startsWith('officer-')){
  const key=field.slice(8);if(key==='state'&&value==='default'){d.officers=d.officers.filter(o=>o.id!==e.officerId);return;}
  const o=entryFor(e);
  if(key==='state'){
   o.state=value;delete o.role;delete o.troops;delete o.wounded;delete o.captor;
   if(value!=='free')delete o.freeDate;
   if(['serving','captive'].includes(value)){o.faction=d.factions.includes(o.faction)?o.faction:d.factions[0];if(value==='captive'){o.captor=d.factions.find(f=>f!==o.faction);o.cityId=d.cities.find(c=>c.owner===o.captor)?.id||o.cityId;}else{o.cityId=d.cities.find(c=>c.owner===o.faction)?.id||o.cityId;delete o.freeDate;}}
   else o.faction=null;
  }else if(key==='faction'||key==='captor'){o[key]=value;o.cityId=d.cities.find(c=>c.owner===(o.state==='captive'?o.captor:o.faction))?.id||o.cityId;}
  else if(key==='city'||key==='cityId'){if(value)o.cityId=value;else d.officers=d.officers.filter(r=>r.id!==e.officerId);}
  else if(['debutDate','freeDate'].includes(key)){const date=parseScenarioDate(value);if(date)o[key]=date;else delete o[key];}
  else if(['level','merit','loyalty','troops','wounded'].includes(key)){if(value==='')delete o[key];else o[key]=Number(value);}
  else {if(value==='')delete o[key];else o[key]=value;}
 }
 else if(field.startsWith('diplomacy-')){const [,index,key]=field.split('-'),r=d.diplomacy[Number(index)];if(r)r[key]=['relation','days'].includes(key)?Number(value):value;}
}
export function scenarioAdvancedAction(e,action,el,root){
 const d=e.draft;
 if(action==='force'){e.forceId=el.dataset.id;return true;}
 if(action==='remove-faction'){e.pending={type:'faction',id:el.dataset.id};return true;}
 if(action==='confirm-faction'){
  const before=structuredClone(d),id=e.pending.id;d.factions=d.factions.filter(f=>f!==id);d.forces=d.forces.filter(f=>f.id!==id);d.diplomacy=d.diplomacy.filter(r=>r.a!==id&&r.b!==id);
  for(const c of d.cities)if(c.owner===id)c.owner='neutral';
  for(const o of d.officers){if(o.faction===id){o.state='free';o.faction=null;delete o.role;delete o.troops;delete o.wounded;delete o.freeDate;}if(o.captor===id){o.state='free';o.faction=null;delete o.captor;}}
  e.pending=null;e.remember(before);e.changed();return true;
 }
 if(action==='add-faction'){
  const leaderId=root.querySelector('[data-se-new-leader]').value,capitalId=root.querySelector('[data-se-new-city]').value,name=root.querySelector('[data-se-new-name]').value.trim(),color=root.querySelector('[data-se-new-color]').value;
  if(!leaderId||!capitalId||!name)throw Error('请填写势力名称、君主和本城');
  if(d.forces.some(f=>f.leaderId===leaderId))throw Error('该武将已经是其它势力君主');
  const before=structuredClone(d),id=newScenarioForceId(),f={id,name,color,leaderId,capitalId};d.factions.push(id);d.forces.push(f);d.cities.find(c=>c.id===capitalId).owner=id;placeRuler(d,f);e.forceId=id;e.remember(before);e.changed();return true;
 }
 if(action==='add-diplomacy'){if(d.factions.length<2)return true;const before=structuredClone(d),used=new Set(d.diplomacy.map(r=>[r.a,r.b].sort().join(':')));for(let i=0;i<d.factions.length;i++)for(let j=i+1;j<d.factions.length;j++){const a=d.factions[i],b=d.factions[j];if(!used.has([a,b].sort().join(':'))){d.diplomacy.push({a,b,state:'peace',relation:50,days:90});e.remember(before);e.changed();return true;}}return true;}
 if(action==='remove-diplomacy'){const before=structuredClone(d);d.diplomacy.splice(Number(el.dataset.index),1);e.remember(before);e.changed();return true;}
 if(action==='sync-officers'){const before=structuredClone(d),library=e.getOfficerLibrary(),map=new Map(d.officerLibrary.officers.map(o=>[o.id,o]));for(const o of library.officers)map.set(o.id,o);d.officerLibrary={...library,officers:[...map.values()]};e.remember(before);e.changed();return true;}
 return false;
}

function overview(e){const {d}=context(e);return `<div class="scenario-editor-form">${input('剧本名称','name',d.name,'maxlength="50"')}${number('起始年份','year',d.year,1,9999)}${number('月份','month',d.month,1,12)}${number('日期','day',d.day,1,30)}${select('人物范围','kind',option('historical','按生卒与登场年',d.kind)+option('fictional','不限制年代',d.kind))}${number('默认初始等级','level',d.level,1,10)}<label class="scenario-editor-description">剧本说明<textarea data-se-field="description" maxlength="500">${esc(d.description)}</textarea></label></div><p>城池 ${d.cities.length} · 势力 ${d.factions.length} · 已配置人物 ${d.officers.length}</p><p class="ui-muted">人物可逐人设置登场日期。在野起始日期只控制何时进入在野，不让在仕武将定时离职。每月按30日计算。</p>${button('sync-officers','同步武将库')}<p class="ui-muted">同步已保存的人物资料和自建武将，供本剧本选用；剧本导出时保留人物资料。</p>`;}
function citiesPanel(e){
 const {d,world}=context(e),town=id=>world.cities.find(c=>c.id===id);const c=d.cities.find(c=>c.id===e.cityId)||d.cities[0];e.cityId=c.id;
 const visible=d.cities.filter(c=>[town(c.id).name,forceName(d,c.owner)].some(s=>s.includes(e.query.trim())));
 const options=option('neutral','中立',c.owner)+d.forces.map(f=>option(f.id,f.name,c.owner)).join('');
 return `<div class="scenario-editor-city-layout"><svg class="selection-map scenario-editor-map" viewBox="0 0 1024 1024" aria-label="选择城池">${atlasOverviewMarkup('scenario-editor-land')}${d.cities.map(c=>{const t=town(c.id);return `<g role="button" tabindex="0" data-se-action="city" data-id="${c.id}" aria-label="${esc(t.name)}" aria-pressed="${c.id===e.cityId}"><circle cx="${t.x}" cy="${t.y}" r="${c.id===e.cityId?12:7}" fill="${scenarioForce(d,c.owner)?.color||'var(--ui-muted)'}" stroke="var(--ui-text)"/><text x="${t.x+12}" y="${t.y+5}">${esc(t.name)}</text></g>`;}).join('')}</svg><div class="scenario-editor-form"><h2>${esc(town(c.id).name)}</h2>${select('所属势力','city-owner',options)}${[['gold','金'],['grain','粮'],['manpower','预备兵']].map(([key,name])=>number(name,'city-'+key,c[key],0,10000000)).join('')}${number('治安','city-order',c.order,0,100)}${number('城防完好率（%）','city-wallIntegrity',c.wallIntegrity,0,100)}</div></div><details><summary>设施等级</summary><div class="scenario-editor-form">${Object.entries(SCENARIO_BUILDINGS).map(([key,b])=>number(b.name+'（最高'+scenarioLocalBuildingLimit(c,key)+'）','building-'+key,c.buildings?.[key],0,scenarioLocalBuildingLimit(c,key))).join('')}</div></details><details><summary>已完成科技</summary><div class="scenario-editor-techs">${Object.entries(SCENARIO_TECHS).filter(([id])=>scenarioTechnologyAllowed(c.id,id)).map(([id,t])=>`<label><input type="checkbox" data-se-field="tech-${id}" ${c.techs?.includes(id)?'checked':''}>${esc(t.name)}${t.prerequisites.length?'<small>前置：'+t.prerequisites.map(p=>SCENARIO_TECHS[p].name).join('、')+'</small>':''}</label>`).join('')}</div></details><p class="ui-muted">留空沿用默认。变更归属后，请核对驻将与君主；现役和伤兵在武将页设置。</p>${e.search('查找城池或势力')}<div class="scenario-editor-city-list">${visible.map(c=>button('city',esc(town(c.id).name)+' · '+esc(forceName(d,c.owner)),`data-id="${c.id}" aria-pressed="${e.cityId===c.id}"`)).join('')}</div>`;
}

function forcesPanel(e){const {d,people}=context(e),f=scenarioForce(d,e.forceId)||d.forces[0];if(f)e.forceId=f.id;
 const candidates=people.filter(o=>!d.forces.some(f=>f.leaderId===o.id));
 const editor=f?`<div class="scenario-editor-form">${input('势力名称','force-name',f.name,'maxlength="20"')}${input('旗色','force-color',f.color,'type="color"')}${select('君主','force-leaderId',people.filter(o=>o.id===f.leaderId||!d.forces.some(g=>g.leaderId===o.id)).map(o=>option(o.id,o.name,f.leaderId)).join(''))}${select('本城','force-capitalId',d.cities.filter(c=>c.owner===f.id).map(c=>option(c.id,townName(d,c.id),f.capitalId)).join(''))}</div><p class="ui-muted">君主随本城设置驻地，须在开局时已登场。其它驻将归属仍需分别调整。</p>`:'';
 return `<div class="scenario-editor-table"><table class="ui-table"><thead><tr><th>势力</th><th>君主</th><th>本城</th><th>城池</th><th>操作</th></tr></thead><tbody>${d.forces.map(f=>`<tr><td>${button('force',esc(f.name),`data-id="${f.id}"`)}</td><td>${esc(people.find(o=>o.id===f.leaderId)?.name)}</td><td>${esc(townName(d,f.capitalId))}</td><td>${d.cities.filter(c=>c.owner===f.id).length}</td><td>${button('remove-faction','移除',`data-id="${f.id}"`)}</td></tr>`).join('')}</tbody></table></div>${editor}<details><summary>建立新势力</summary><div class="scenario-editor-form"><label>名称<input maxlength="20" data-se-new-name value="新势力"></label><label>旗色<input type="color" data-se-new-color value="#667743"></label><label>君主<select data-se-new-leader>${candidates.map(o=>option(o.id,o.name,'')).join('')}</select></label><label>本城<select data-se-new-city>${d.cities.map(c=>option(c.id,townName(d,c.id)+' · '+forceName(d,c.owner),'')).join('')}</select></label></div>${button('add-faction','建立',!candidates.length?'disabled':'')}<p class="ui-muted">可选公共人物或自建武将。选中的城市改归新势力，原驻将需要在武将页核对。</p></details>`;
}

function officersPanel(e){
 const {d,people,byId}=context(e),assignments=new Map(d.officers.map(o=>[o.id,o])),value=(u,key)=>key==='faction'?forceName(d,assignments.get(u.id)?.faction):key==='city'?townName(d,assignments.get(u.id)?.cityId):u[key];
 const rows=sortRows(people.filter(u=>[u.name,u.courtesy,value(u,'faction'),value(u,'city'),SCENARIO_STATES[assignments.get(u.id)?.state]].some(v=>v?.includes(e.query.trim()))),e.sort,e.direction,value),pages=Math.max(1,Math.ceil(rows.length/20));e.page=Math.min(e.page,pages-1);
 const u=byId.get(e.officerId),entry=assignments.get(e.officerId),o=entry||{state:'default',cityId:d.cities[0].id};
 const forces=value=>d.forces.map(f=>option(f.id,f.name,value)).join('');
 const places=d.cities.filter(c=>o.state==='serving'?c.owner===o.faction:o.state==='captive'?c.owner===o.captor:true);
 let editor='';if(u)editor=`<section class="scenario-editor-person"><h3>${esc(u.name)}${u.sourceKind==='custom'?' · 自建':''}</h3><div class="scenario-editor-form">${select('初始身份','officer-state',option('default','沿用人物默认',o.state)+Object.entries(SCENARIO_STATES).map(([id,name])=>option(id,name,o.state)).join(''))}${['serving','captive'].includes(o.state)?select('所属势力','officer-faction',forces(o.faction)):''}${o.state==='captive'?select('俘获势力','officer-captor',forces(o.captor)):''}${select('驻地／登场地点','officer-city',places.map(c=>option(c.id,townName(d,c.id),o.cityId)).join(''))}${number('等级','officer-level',o.level,1,10)}${number('功绩余量','officer-merit',o.merit,0,100000000)}${number('忠诚','officer-loyalty',o.loyalty,0,100)}${o.state==='serving'?number('现役兵','officer-troops',o.troops,0,100000)+number('伤兵','officer-wounded',o.wounded,0,100000)+select('兵种','officer-type',option('','沿用默认',o.type||'')+[['spear','枪兵'],['halberd','戟兵'],['cavalry','骑兵'],['archer','弓兵']].map(([id,n])=>option(id,n,o.type)).join(''))+select('开局任职','officer-role',option('','不指定',o.role||'')+option('governor','太守',o.role)+Object.entries(SCENARIO_DUTIES).map(([id,n])=>option(id,n,o.role)).join('')):''}${input('登场日期','officer-debutDate',scenarioDateText(o.debutDate),'placeholder="如 201-05-21，留空沿用默认"')}${o.state==='free'?input('在野起始日期','officer-freeDate',scenarioDateText(o.freeDate),'placeholder="如 201-06-01，留空随登场"'):''}</div><p class="ui-muted">每月30日。未到登场日期不能任职或招揽；在野人物需两个日期均到达后才可被发现。等级及功绩分别保存，功绩填写本级余量。</p></section>`;
 const columns=[['name','姓名'],['faction','势力'],['city','驻地'],['leadership','统率'],['force','武力'],['intellect','智力'],['politics','政治'],['charm','魅力']];
 return e.search('查找武将、势力、驻地或身份')+editor+`<div class="scenario-editor-table"><table class="ui-table"><thead><tr>${columns.map(([key,n])=>`<th aria-sort="${e.sort===key?(e.direction==='asc'?'ascending':'descending'):'none'}">${button('sort',n+(e.sort===key?(e.direction==='asc'?' ↑':' ↓'):''),`data-key="${key}"`,'field-sort')}</th>`).join('')}<th>身份</th><th>登场</th><th>在野</th></tr></thead><tbody>${rows.slice(e.page*20,(e.page+1)*20).map(u=>{const o=assignments.get(u.id);return `<tr><td>${button('officer',esc(u.name),`data-id="${u.id}"`)}</td><td>${o?.faction?esc(forceName(d,o.faction)):'—'}</td><td>${esc(value(u,'city'))}</td>${['leadership','force','intellect','politics','charm'].map(k=>`<td>${u[k]}</td>`).join('')}<td>${SCENARIO_STATES[o?.state]||'默认'}</td><td>${esc(scenarioDateText(o?.debutDate)||'默认')}</td><td>${esc(scenarioDateText(o?.freeDate)||'默认')}</td></tr>`;}).join('')||'<tr><td colspan="11">没有匹配武将</td></tr>'}</tbody></table></div><div class="scenario-editor-toolbar">${button('page','上一页',`data-delta="-1" ${e.page===0?'disabled':''}`)}<span>共 ${rows.length} 人 · ${e.page+1} / ${pages}</span>${button('page','下一页',`data-delta="1" ${e.page+1>=pages?'disabled':''}`)}</div>`;
}
function diplomacyPanel(e){const {d}=context(e),cellSelect=(label,field,choices)=>`<select aria-label="${label}" data-se-field="${field}">${choices}</select>`,cellNumber=(label,field,value,min,max)=>`<input aria-label="${label}" data-se-field="${field}" type="number" value="${value}" min="${min}" max="${max}">`;return `<p class="ui-muted">未配置的势力对沿用交战状态。和平、互不侵犯与同盟在开局即生效，期限按日计算，不产生谈判费用或功绩。</p>${button('add-diplomacy','新增关系',d.factions.length<2?'disabled':'')}<div class="scenario-editor-table"><table class="ui-table"><thead><tr><th>势力</th><th>对象</th><th>状态</th><th>关系</th><th>期限（天）</th><th>操作</th></tr></thead><tbody>${d.diplomacy.map((r,i)=>`<tr><td>${cellSelect('势力','diplomacy-'+i+'-a',d.forces.map(f=>option(f.id,f.name,r.a)).join(''))}</td><td>${cellSelect('对象','diplomacy-'+i+'-b',d.forces.map(f=>option(f.id,f.name,r.b)).join(''))}</td><td>${cellSelect('状态','diplomacy-'+i+'-state',[['war','交战'],['peace','和平'],['nonaggression','互不侵犯'],['alliance','同盟']].map(([id,n])=>option(id,n,r.state)).join(''))}</td><td>${cellNumber('关系','diplomacy-'+i+'-relation',r.relation,0,100)}</td><td>${cellNumber('期限','diplomacy-'+i+'-days',r.days,1,36000)}</td><td>${button('remove-diplomacy','移除',`data-index="${i}"`)}</td></tr>`).join('')}</tbody></table></div>`;}
export const scenarioEditorPanel=e=>({overview,cities:citiesPanel,factions:forcesPanel,officers:officersPanel,diplomacy:diplomacyPanel}[e.tab]||overview)(e);
