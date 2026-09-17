import {OFFICER_BY_ID,searchOfficers,PERSONALITY_NAMES,RIGHTEOUSNESS_NAMES} from './officer-catalog.mjs';
import {relationshipInfo,RELATIONSHIP_TIERS} from './relationships.mjs';
import {SKILL_ROUTES} from './passives.mjs';
import {FAMOUS_OFFICERS} from './famous-officers.mjs';
import {TACTICS_BOOK,SPECIAL_TACTICS} from './tactics.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stats=[['leadership','统率'],['force','武力'],['intellect','智力'],['politics','政治'],['charm','魅力']];
const origin=u=>u.sourceKind==='custom'?'自建':'武将库';
const statMarkup=u=>'<div class="officer-stats catalog-stats">'+stats.map(([key,label])=>'<div><b>'+u[key]+'</b><small>'+label+'</small></div>').join('')+'</div>';
export function rosterMarkup({query='',sort='source',kind='all',page=0,selected=[]}={}){
 const matches=searchOfficers({query,sort,kind}),pages=Math.max(1,Math.ceil(matches.length/24));
 page=Math.max(0,Math.min(page,pages-1));
 const rows=matches.slice(page*24,(page+1)*24);
 return `<p class="modal-intro">832 名武将库人物 · 3 名自建武将。41 位名将已具备五技能成长路线与专属战法；可选择 1～6 人组成独立试炼阵容。</p>
 <div class="catalog-toolbar"><label>搜索<input id="catalog-query" type="search" value="${esc(query)}" placeholder="姓名、字或编号" autocomplete="off"></label>
 <label>来源<select id="catalog-kind">${[['all','全部人物'],['common','武将库'],['custom','自建武将']].map(([v,n])=>`<option value="${v}" ${v===kind?'selected':''}>${n}</option>`).join('')}</select></label>
 <label>排序<select id="catalog-sort">${[['source','来源编号'],...stats.map(([key,label])=>[key,label+'从高到低'])].map(([v,n])=>`<option value="${v}" ${v===sort?'selected':''}>${n}</option>`).join('')}</select></label></div>
 <section class="catalog-selection"><b>试炼阵容 ${selected.length} / 6</b><small>按加入顺序排列，首位任主将</small>
 <div>${selected.length?selected.map(id=>`<button class="button secondary" data-action="catalog-toggle" data-id="${id}" title="移出阵容">${esc(OFFICER_BY_ID[id]?.name)} ×</button>`).join(''):'尚未选将，在下方卡片加入。'}</div>
 <button class="button primary" data-action="catalog-launch" ${selected.length?'':'disabled'}>以此阵容开始试炼</button>
 <button class="button secondary" data-action="catalog-clear" ${selected.length?'':'disabled'}>清空阵容</button></section>
 <p class="muted" role="status">共 ${matches.length} 人 · 第 ${page+1} / ${pages} 页</p>
 <div class="officer-grid">${rows.map(u=>`<article class="officer-card catalog-card"><div class="catalog-name"><h3>${esc(u.name)}<small>${u.courtesy?'字 '+esc(u.courtesy):'字未载'}</small></h3><span class="trait">${origin(u)} #${u.sourceId}</span></div>
 ${statMarkup(u)}<p class="muted">${SKILL_ROUTES[u.id]?esc(FAMOUS_OFFICERS[u.id]?.role)+' · '+esc(TACTICS_BOOK[SPECIAL_TACTICS[u.id]]?.name):'技能待设计'}</p>
 <div class="catalog-card-actions"><button class="button secondary" data-action="catalog-detail" data-id="${u.id}">查看资料</button><button class="button ${selected.includes(u.id)?'primary':'secondary'}" data-action="catalog-toggle" data-id="${u.id}" ${!selected.includes(u.id)&&selected.length>=6?'disabled':''}>${selected.includes(u.id)?'移出试炼':'加入试炼'}</button></div></article>`).join('')||'<p class="catalog-empty">没有匹配的武将，请更换搜索词。</p>'}</div>
 <nav class="catalog-pages" aria-label="武将名录分页"><button class="button secondary" data-action="catalog-page" data-page="${page-1}" ${page===0?'disabled':''}>上一页</button><span>${page+1} / ${pages}</span><button class="button secondary" data-action="catalog-page" data-page="${page+1}" ${page+1>=pages?'disabled':''}>下一页</button></nav>`;
}
const traitName=(names,value)=>value===null||value===undefined?'未载':value===0?'未设置':names[value]||('未知（'+value+'）');
const relationLabels={fatherId:'父亲',motherId:'母亲',spouseIds:'配偶',swornSiblingIds:'义兄弟',likedIds:'亲爱',dislikedIds:'厌恶'};
export function officerProfileMarkup(u,scores={},types={}){
 if(!u||!Object.hasOwn(OFFICER_BY_ID,u.id))return '';
 const facts=[
  ['性格',traitName(PERSONALITY_NAMES,u.personality)],
  ['义理',traitName(RIGHTEOUSNESS_NAMES,u.righteousness)],
  ['相性',u.compatibility??'未载'],['性别',u.sex===0?'男':u.sex===1?'女':'未载'],
  ['出生年',u.birthYear??'未载'],['死亡年',u.deathYear??'未载']
 ];
 const relationName=id=>{
  const person=Object.hasOwn(OFFICER_BY_ID,id)?OFFICER_BY_ID[id]:null;
  const relation=relationshipInfo(u.id,id,scores,types);
  return person?`<button class="profile-relation-link" data-action="catalog-detail" data-id="${esc(id)}">${esc(person.name)}<small>${person.sourceKind==='custom'?'自建 ':''}#${person.sourceId} · 当前${relation.label} ${relation.score} · 连携 ${relation.chance}%</small></button>`:`<span>未收录（${esc(id)}）</span>`;
 };
 return `<section class="officer-profile"><h3 class="stats-section-title">人物资料</h3>
 <dl class="catalog-facts">${facts.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
 <h3 class="stats-section-title">初始关系记录</h3><dl class="catalog-relations">${Object.entries(relationLabels).map(([key,label])=>{
  const value=u.relations?.[key],ids=Array.isArray(value)?value:value?[value]:[];
  return `<div><dt>${label}</dt><dd>${ids.length?ids.map(relationName).join(' '):'<span class="muted">未记载</span>'}</dd></div>`;
 }).join('')}</dl><p class="muted">关系值决定符合条件时的连携成功率；其他人物资料暂不产生效果。义理名称沿用来源设定。</p></section>`;
}
export function officerDetailMarkup(id,scores={},types={}){
 const u=Object.hasOwn(OFFICER_BY_ID,id)?OFFICER_BY_ID[id]:null;if(!u)return '<p>未找到武将。</p>';
 const s=u.source;
 const aptitude=[['spearLv','枪兵'],['halberdLv','戟兵'],['crossbowLv','弩兵'],['rideLv','骑兵'],['machineLv','兵器'],['waterLv','水军']];
 return `<div class="catalog-detail-heading"><h3>${esc(u.name)} ${u.courtesy?'<small>字 '+esc(u.courtesy)+'</small>':''}</h3><span>${origin(u)} #${u.sourceId}</span></div>${statMarkup(u)}
 ${officerProfileMarkup(u,scores,types)}
 ${SPECIAL_TACTICS[id]?`<h3 class="stats-section-title">专属战法 · ${esc(TACTICS_BOOK[SPECIAL_TACTICS[id]].name)}</h3><p>${esc(TACTICS_BOOK[SPECIAL_TACTICS[id]].description)}</p><p class="muted">战意 ${TACTICS_BOOK[SPECIAL_TACTICS[id]].threshold} · 冷却 ${TACTICS_BOOK[SPECIAL_TACTICS[id]].cooldown} 步 · 占用一个战法槽，1 级可配置。</p>`:''}
 <dl class="catalog-facts">${[['登场年',s.yearAvailable??'未载'],['原始忠诚',s.loyalty??'未载']].map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
 <h3 class="stats-section-title">兵种适性</h3><div class="catalog-aptitudes">${aptitude.map(([key,label])=>`<span>${label}<b>${['C','B','A','S'][s[key]]??'未载'}</b></span>`).join('')}</div>
 <h3 class="stats-section-title">人物生平</h3><p class="catalog-biography">${esc(u.biography||'源项目未提供人物生平。')}</p>
 <details class="catalog-source"><summary>原始数据</summary><p class="muted">保留来源字段；原项目特性编号未转换为本游戏技能。</p><pre>${esc(JSON.stringify(s,null,2))}</pre></details>`;
}

export function relationshipEditorMarkup(id,partnerId,scores={},locked=false,types={}){
 const u=OFFICER_BY_ID[id];if(!u)return '';
 const others=Object.values(OFFICER_BY_ID).filter(p=>p.id!==id);
 const partner=others.find(p=>p.id===partnerId)||others.find(p=>u.relations.swornSiblingIds.includes(p.id))||others[0];
 const info=relationshipInfo(id,partner.id,scores,types);
 return `<section class="relationship-editor"><h3 class="stats-section-title">关系值与连携</h3>
 <label>关系对象<select id="relationship-partner">${others.map(p=>`<option value="${p.id}" ${p.id===partner.id?'selected':''}>${esc(p.name)} · ${origin(p)} #${p.sourceId}</option>`).join('')}</select></label>
 <p><b>${esc(u.name)} ↔ ${esc(partner.name)}</b> · ${info.label} · 连携成功率 <b>${info.chance}%</b></p>
 <p class="muted">初始关系：${info.sourceLabel}；当前关系可以变化，初始人物资料保留。</p>
 <label>当前关系（选择即保存）<select id="relationship-type" ${locked?'disabled':''}>${Object.entries(RELATIONSHIP_TIERS).filter(([type])=>type!=='parent'||info.sourceTypes.includes('parent')).map(([type,tier])=>`<option value="${type}" ${type===info.type?'selected':''}>${tier.label} · ${tier.min}～${tier.max}</option>`).join('')}</select></label>
 <div class="relationship-controls"><label>关系值（${info.min}～${info.max}）<input id="relationship-score" type="number" min="${info.min}" max="${info.max}" step="1" value="${info.score}" ${locked?'disabled':''}></label>
 <button class="button primary" data-action="relationship-save" ${locked?'disabled':''}>保存关系值</button>
 <button class="button secondary" data-action="relationship-reset" ${locked?'disabled':''}>恢复基准 ${info.base}</button></div>
 <p class="muted">${locked?'交战已经开始，关系锁定。':'修改保存在当前进度中；带入新试炼，试炼中的修改仅保存在试炼进度。'}两人共享当前关系及分值。厌恶 0～20、疏远 21～39、普通 40～59、友好 60～69、亲爱 70～79；父母子女 75～90、夫妻 80～95、义兄弟 80～100。变更关系时，原分值保留到新档允许的范围内。</p>
 <p class="muted">不同武将在 3 步内对同一目标完成战法时，按与上一位连携参与者的关系值判定（80 即 80%）。失败不加成，当前战法成为新一轮起点；自身增益不触发连携。</p></section>`;
}
