const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function appointmentFields(army,units,roles,{kind='battle',locked=false}={}){
 const valid=['leader','advisor'].every(role=>units.some(u=>u.id===roles?.[role])),preview=valid?['leader','advisor'].map(role=>units.find(u=>u.id===roles[role]).name).join(' / '):'请选择本军团的军团长与军师';
 return `<article class="army-appointment" data-appointment-army="${esc(army.id)}"><h4>${esc(army.name||'军团')}</h4>${['leader','advisor'].map(role=>`<label>${role==='leader'?'军团长':'军师'} <select data-${kind}-appointment-role="${role}" data-army-id="${esc(army.id)}" aria-label="${esc(army.name||'军团')}${role==='leader'?'军团长':'军师'}" ${locked&&army[role]!==null?'disabled':''}><option value="">请选择</option>${units.map(u=>`<option value="${esc(u.id)}" ${roles?.[role]===u.id?'selected':''}>${esc(u.name)} · ${role==='leader'?'统率 '+u.leadership:'智力 '+u.intellect}</option>`).join('')}</select></label>`).join('')}<p class="appointment-selection-preview" role="status">${esc(preview)}</p><button data-action="${kind}-appointments-confirm" data-army-id="${esc(army.id)}" ${valid?'':'disabled'}>确认任命</button></article>`;
}
export function updateAppointmentSelection(select){
 const article=select.closest('.army-appointment');if(!article)return;
 const fields=[...article.querySelectorAll('select')],valid=fields.every(el=>el.value&&[...el.options].some(o=>o.value===el.value));
 article.querySelector('button[data-action$="appointments-confirm"]').disabled=!valid;
 article.querySelector('.appointment-selection-preview').textContent=valid?fields.map(el=>el.selectedOptions[0].textContent).join(' / '):'请选择本军团的军团长与军师';
}
