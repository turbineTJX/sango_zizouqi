import {TREASURE_DESIGNS,treasureDesign} from './data/design/treasures.mjs';
import {treasureOfficerRows,treasureRecipient,treasureLocation,treasureDistributionError,grantTreasure} from './treasures.mjs';
import {playerFaction} from './player-faction.mjs';
import {mapNode} from './road-network.mjs';
import {bondLevels} from './bonds.mjs';
import {treasureBondBonus} from './treasure-battle.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const effectText=d=>d.description.replace(/，持续\d+回合/g,'').replace(/\d+回合累计/g,'期间累计').replace(/每回合/g,'每次救治');
const treasureButton=d=>'<button class="unit-trait-name" data-action="text-details" data-details="'+esc(JSON.stringify({title:d.name+' · 宝物',groups:[{name:'效果与使用',rows:[['作用','',effectText(d)],['装备','',d.kind==='bond'?'须已获得对应羁绊；个人单项最多3点、合计最多6点，不能替代档位人数。':'实际首次上场即计时，每场一次；后备与未到援军不提前生效。'],['授予','', '每人仅装备一件，双方未出征即可立即授予，跨城不需运送；出征时随身宝物锁定。']]}]}))+'">'+esc(d.name)+' ↗</button>';
export function treasureUnitMarkup(u,{manage=false}={}){
 const d=treasureDesign(u.treasureId),bonus=treasureBondBonus(u,bondLevels(u));
 return '<section class="unit-treasure"><h4>宝物</h4><p>'+ (d?treasureButton(d)+' · '+esc(effectText(d))+(d.kind==='bond'&&!bonus?'（当前原生等级或点数上限不满足，不增加羁绊）':''):'未装备')+'</p>'+(manage?'<button type="button" class="button secondary" data-action="treasure-open" data-officer="'+esc(u.id)+'">授予与收藏</button>':'')+'</section>';
}
const states={person:'随身收藏',city:'城市保管',captive:'随俘封存'};
export function treasuresMarkup(s,p={}){
 const faction=playerFaction(s),planning=s.campaign.phase==='planning'&&!s.finished,owned=(s.campaign.treasures?.items||[]).filter(t=>treasureLocation(s,t).faction===faction&&states[t.state]);
 const items=owned.filter(t=>(!p.officerId||t.holderId===p.officerId||!treasureDistributionError(s,t.id))&&(!p.filter||p.filter==='all'||p.filter==='available'&&!treasureDistributionError(s,t.id)||p.filter==='locked'&&t.state==='person'&&!!treasureDistributionError(s,t.id)||p.filter===t.state));
 const selected=owned.find(t=>t.id===p.id),at=selected&&treasureLocation(s,selected),recipients=treasureOfficerRows(s).filter(o=>treasureRecipient(s,o.unit.id,faction)).sort((a,b)=>a.location.localeCompare(b.location)||a.unit.id.localeCompare(b.unit.id));
 const to=recipients.find(o=>o.unit.id===p.recipientId),error=selected&&to?grantTreasure(s,selected.id,to.unit.id,{equip:!!p.equip,checkOnly:true}):null;
 const table='<div class="treasure-table-scroll"><table class="treasure-table"><thead><tr><th>名称与效果</th><th>位置 / 携带者</th><th>状态</th><th>操作</th></tr></thead><tbody>'+items.map(t=>{const d=treasureDesign(t.id),a=treasureLocation(s,t),locked=treasureDistributionError(s,t.id),equipped=a.officer?.unit.treasureId===t.id;return '<tr><td>'+treasureButton(d)+'<small>'+esc(effectText(d))+'</small></td><td>'+esc(mapNode(s,a.cityId)?.name||'沿路移动')+'<small>'+esc(a.officer?.unit.name||'本城库藏')+'</small></td><td>'+esc(locked&&t.state==='person'?'随军锁定':states[t.state])+(equipped?'<small>已装备</small>':'')+(locked?'<small>'+esc(locked)+'</small>':'')+'</td><td><div class="treasure-actions"><button data-action="treasure-select" data-id="'+t.id+'" '+(!planning||locked?'disabled':'')+'>授予</button>'+(t.state==='person'?'<button data-action="'+(equipped?'treasure-unequip':'treasure-equip')+'" data-id="'+t.id+'" data-officer="'+t.holderId+'" '+(!planning||locked?'disabled':'')+'>'+(equipped?'卸下':'装备')+'</button><button data-action="treasure-store" data-id="'+t.id+'" '+(!planning||locked?'disabled':'')+'>收回</button>':'')+'</div></td></tr>';}).join('')+'</tbody></table></div>';
 let form='';if(selected){
  form='<section class="treasure-grant"><h3>授予 '+esc(treasureDesign(selected.id).name)+'</h3><p>来源：'+esc(mapNode(s,at.cityId)?.name)+' · '+esc(at.officer?.unit.name||'城市库藏')+'</p><label>接收武将<select data-treasure-recipient><option value="">请选择未出征的武将</option>'+recipients.map(o=>'<option value="'+o.unit.id+'" '+(o.unit.id===p.recipientId?'selected':'')+'>'+esc(o.unit.name)+' · '+esc(mapNode(s,o.location)?.name)+'</option>').join('')+'</select></label>';
  if(to)form+='<p>携带者与接收人均未出征，确认后立即授予，不需运送。</p>';
  form+='<label><input type="checkbox" data-treasure-equip '+(p.equip?'checked':'')+'>授予后装备（不勾选则仅收藏）</label>';
  if(to&&p.equip&&to.unit.treasureId&&to.unit.treasureId!==selected.id)form+='<p>将替换 '+esc(treasureDesign(to.unit.treasureId).name)+'，原宝物仍由'+esc(to.unit.name)+'收藏。</p>';
  form+=(error?'<p role="status">'+esc(error)+'</p>':'')+'<button class="button primary" data-action="treasure-confirm" '+(!planning||!to||error?'disabled':'')+'>确认授予</button> <button class="button secondary" data-action="treasure-cancel">取消</button></section>';
 }
 return '<div class="treasure-panel"><p>每人可收藏多件、仅装备一件。双方未出征即可立即授予，跨城不需运送；出征期间锁定随身宝物，回城交接后可分配。只显示本势力已取得的宝物。</p>'+'<label>筛选 <select data-treasure-filter>'+Object.entries({all:'全部',available:'可分配',locked:'随军锁定',captive:'随俘封存',city:'城市保管'}).map(([id,name])=>'<option value="'+id+'" '+((p.filter||'all')===id?'selected':'')+'>'+name+'</option>').join('')+'</select></label>'+(p.officerId?'<button class="text-button" data-action="treasure-open">查看全势力宝物</button>':'')+form+(items.length?table:'<p>当前没有可查看的宝物。</p>')+'</div>';
}
export function treasureOptions(u,attribute){return '<label>宝物<select '+attribute+'="'+u.id+'" aria-label="'+esc(u.name)+'宝物"><option value="">无</option>'+Object.entries(TREASURE_DESIGNS).map(([id,t])=>'<option value="'+id+'" '+(id===u.treasureId?'selected':'')+'>'+esc(t.name)+' · '+(t.kind==='bond'?'羁绊':'入场增益')+'</option>').join('')+'</select></label>';}
