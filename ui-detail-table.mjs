const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function detailLink(title,groups,label='查看详情'){
 return `<button class="text-button" data-action="text-details" data-details="${esc(JSON.stringify({title,groups}))}">${esc(label)}</button>`;
}
export function detailTable(data,index=0){
 const group=data.groups[index]||data.groups[0];
 return `<section class="text-detail-view"><nav aria-label="说明分类">${data.groups.map((g,i)=>`<button data-action="text-details-tab" data-index="${i}" aria-pressed="${i===index}">${esc(g.name)}</button>`).join('')}</nav><div class="text-detail-scroll"><table><thead><tr><th>名称</th><th>说明</th></tr></thead><tbody>${group.rows.map(r=>`<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div></section>`;
}
export function compactDescriptions(html){
 return html.replace(/<p(?: class="[^"]*")?>([^<>]{70,})<\/p>/g,(all,text)=>detailLink('说明',[{name:'说明',rows:[['规则','',text.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&')]]}]));
}
