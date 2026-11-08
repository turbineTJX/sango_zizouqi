import {supportPositionPreview} from './tactics.mjs';
import {hexCellStyle,hexDistance} from './hex-grid.mjs';
import {deployBattleUnit} from './battle-deployment.mjs';
import {deploymentBehaviorFor} from './formation-behavior.mjs';
import {zocCells} from './engagement.mjs';
import {combatFamily} from './troop-equipment.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Only positions in a disposable view change; no random, charge or save is touched.
export function supportDeploymentView(b,draft){
 if(!draft||draft.battleId!==b.id||draft.kind)return b;
 const view={...b,sides:b.sides.map(s=>({...s,units:s.units.map(u=>({...u}))}))};
 return deployBattleUnit(view,draft.unitId,draft.x,draft.y)?b:view;
}
export function deploymentSupportModel(b,id,skillId=null,draft=null){
 const view=supportDeploymentView(b,draft),unit=view.sides[0].units.find(u=>u.id===id);
 if(!unit||unit.status!=='active')return null;
 const rows=supportPositionPreview(view,unit),row=rows.find(r=>r.skill.id===skillId)||rows[0];
 const incoming=view.sides[0].units.filter(u=>u!==unit).flatMap(u=>supportPositionPreview(view,u).filter(r=>r.preferred.some(a=>a.id===unit.id)).map(r=>({unit:u,skill:r.skill})));
 return {unit,rows,row,incoming,view,behavior:deploymentBehaviorFor(view,unit)};
}
export function deploymentSupportInfo(model){
 if(!model||model.rows.length<2)return '';
 const {unit,rows,row}=model;
 return `<div class="support-preview-skills">${rows.map(r=>`<button class="button secondary" data-action="support-preview-skill" data-support-unit="${esc(unit.id)}" data-skill="${esc(r.skill.id)}" aria-pressed="${r===row}">${esc(r.skill.name)}</button>`).join('')}</div>`;
}
export function deploymentSupportOverlay(model){
 if(!model)return '';
 const {unit,row,incoming,view,behavior}=model,marks=[];
 if(behavior){
  const ids=[behavior.guardId,behavior.screenId].filter(Boolean);
  for(const id of new Set(ids)){const t=view.sides[0].units.find(u=>u.id===id&&u.status==='active'&&u.hp>0);if(t)marks.push(`<span class="support-target-cell support-preferred formation-peer" data-formation-peer="${esc(id)}" style="${hexCellStyle(t.x,t.y)}"></span>`);}
  const side=combatFamily(unit)==='cavalry'?1:0;
  if(combatFamily(unit)==='cavalry'||combatFamily(unit)==='spear')for(const p of zocCells(view).filter(p=>p.strong[side]))marks.push(`<i class="support-range-cell formation-strong-cell" data-formation-strong="${side}" style="${hexCellStyle(p.x,p.y)}"></i>`);
 }
 if(row){
  for(let y=0;y<8;y++)for(let x=0;x<14;x++)if(hexDistance(unit,{x,y})<=row.skill.range)marks.push(`<i class="support-range-cell" style="${hexCellStyle(x,y)}"></i>`);
  for(const target of row.candidates){const preferred=row.preferred.includes(target);marks.push(`<span class="support-target-cell${preferred?' support-preferred':''}" data-support-target="${esc(target.id)}" data-support-preferred="${preferred}" style="${hexCellStyle(target.x,target.y)}"></span>`);}
 }
 marks.push(`<span class="support-source-cell" data-support-source="${esc(unit.id)}" style="${hexCellStyle(unit.x,unit.y)}"></span>`);
 if(!row)for(const {unit:source} of incoming)marks.push(`<span class="support-target-cell support-preferred" style="${hexCellStyle(source.x,source.y)}"></span>`);
 return marks.join('');
}
