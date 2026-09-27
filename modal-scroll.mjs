// UI-only state: never persisted with a campaign or battle save.
export function createModalScrollMemory(){
 const saved=new Map();let renderedKey=null;
 const selector='.modal-body,.task-candidate-list,.personnel-table-wrap,.combat-comparison,.catalog-pages,.roster-table,.snapshot-tables,.text-detail-scroll';
 const containers=root=>[...root.querySelectorAll(selector)];
 const rowId=row=>{
  const el=row.querySelector('[data-scenario-choice],[data-personnel-choice],[data-military-unit],[data-officer],[data-inspect],[data-id]');
  return el?.dataset.scenarioChoice||el?.dataset.personnelChoice||el?.dataset.militaryUnit||el?.dataset.officer||el?.dataset.inspect||el?.dataset.id;
 };
 const identify=(el,index)=>`${el.className}|${el.closest('.combat-page')?.getAttribute('aria-label')||''}|${index}`;
 return {
  capture(root){
   if(!renderedKey)return;
   saved.set(renderedKey,containers(root).map((el,index)=>{
    const rows=[...el.querySelectorAll('tbody tr')],edge=el.getBoundingClientRect().top,header=el.querySelector('thead')?.offsetHeight||0;
    const row=el.matches('.task-candidate-list')?rows.find(r=>r.getBoundingClientRect().bottom>edge+header):null;
    return {key:identify(el,index),top:el.scrollTop,left:el.scrollLeft,id:row&&rowId(row),offset:row?row.getBoundingClientRect().top-edge:0,order:rows.map(rowId).join('|')};
   }));
   if(saved.size>100)saved.delete(saved.keys().next().value);
  },
  restore(root,key){
   renderedKey=key;
   if(!key){saved.clear();return;}
   const positions=saved.get(key)||[];
   containers(root).forEach((el,index)=>{
    const position=positions.find(p=>p.key===identify(el,index));if(!position)return;
    el.scrollTop=position.top;el.scrollLeft=position.left;
    // Keep the same visible person when tab content changes row heights.
    // Sorting uses the numeric scroll position, rather than chasing a moved row.
    const rows=[...el.querySelectorAll('tbody tr')];
    if(position.id&&rows.map(rowId).join('|')===position.order){const row=rows.find(r=>rowId(r)===position.id);if(row)el.scrollTop+=row.getBoundingClientRect().top-el.getBoundingClientRect().top-position.offset;}
   });
  }
 };
}
