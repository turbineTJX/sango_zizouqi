const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function compareValues(a,b){
 if(a==null||b==null)return a==null?(b==null?0:1):-1;
 return typeof a==='number'&&typeof b==='number'?a-b:String(a).localeCompare(String(b),'zh-CN',{numeric:true});
}
export function sortRows(rows,key,direction,value){
 return [...rows].sort((a,b)=>{const av=value(a,key),bv=value(b,key);return av==null||bv==null?compareValues(av,bv):compareValues(av,bv)*(direction==='asc'?1:-1);});
}
export function sortButton(scope,key,label,sort,direction='desc'){
 const active=sort===key,next=active&&direction==='asc'?'降序':'升序';
 return `<button type="button" class="field-sort ${active?'active':''}" data-field-sort="${scope}" data-sort-key="${key}" data-sort-current="${active?direction:''}" title="按${esc(label)}${next}" aria-label="${esc(label)}，${active?(direction==='asc'?'升序':'降序')+'，':''}点击${next}">${esc(label)} <span aria-hidden="true">${active?(direction==='asc'?'↑':'↓'):'↕'}</span></button>`;
}
export function sortHeader(scope,key,label,sort,direction='desc'){
 return `<th aria-sort="${sort===key?(direction==='asc'?'ascending':'descending'):'none'}">${sortButton(scope,key,label,sort,direction)}</th>`;
}
