import {frontlineCapacity} from './army-trait-rules.mjs';
import {TROOPS,isDeploying,fillSlots} from './engine.mjs';
import {shieldLayers,refreshShield,setStatus} from './tactics.mjs';
import {validRetreatAt} from './battle-retreat.mjs';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function retreatCouncilMarkup(b,{selected=[],retreatOpen=false,destinations=[]}={}){
 const units=b.sides[0].units.filter(u=>u.hp>0),picked=new Set(selected);
 return `<details class="retreat-council" ${retreatOpen?'open':''}><summary>撤离设置</summary>
 ${b.strategicRetreat?`<label>撤离据点 <select data-retreat-destination aria-label="撤离据点"><option value="">${destinations.length?'选择据点':'暂无可达据点'}</option>${destinations.map(c=>`<option value="${esc(c.id)}" ${b.sides[0].retreatDestination===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>`:'<p>撤离地点：本方战场出口</p>'}
 <div class="retreat-toolbar"><label><input type="checkbox" data-retreat-all ${units.every(u=>picked.has(u.id))?'checked':''}> 全选</label><label>批量人数 <input type="number" min="0" step="1" data-retreat-batch aria-label="批量撤离人数" placeholder="留空不自动撤离"></label><button data-action="retreat-batch-apply">应用到所选</button><span>已选 ${units.filter(u=>picked.has(u.id)).length} 队</span></div>
 <p>现役兵力不超过所填人数时撤离；留空不自动撤离。离场后后备正常补位。</p><div class="retreat-units">${units.map(u=>`<div class="retreat-unit"><label><input type="checkbox" data-retreat-pick="${esc(u.id)}" ${picked.has(u.id)?'checked':''}> ${esc(u.name)} <small>${u.status==='active'?'首发':'后备'} · ${Math.round(u.hp)}</small></label><input type="number" min="0" step="1" data-unit-retreat="${esc(u.id)}" aria-label="${esc(u.name)}撤离人数" placeholder="不自动撤离" value="${u.retreatAt??''}"></div>`).join('')}</div></details>`;
}
export function configureCouncilRetreat(b,ids,policy){
 if(!isDeploying(b))return '只能在战前会议调整撤离';
 if(!validRetreatAt(policy))return '撤离设置无效';
 if(!Array.isArray(ids)||!ids.length)return '请先选择部队';
 const units=ids.map(id=>b.sides[0].units.find(u=>u.id===id&&u.hp>0));
 if(units.some(u=>!u))return '请选择本方部队';
 for(const u of units)u.retreatAt=policy;
 return null;
}
export function battleCouncilMarkup(b,{open=true,selected=[],retreatOpen=false,destinations=[]}={}){
 if(!isDeploying(b))return '';
 const units=b.sides[0].units;
 return `<section class="battle-council">${units.some(u=>u.bondGrowth?.levels.bondGuard)?'<p class="formation-council-note">金色阵位：站在阵位首次入场获得军阵增益，军阵持有者翻倍；最高档三个阵位同时有人，增益延长。拖动部队安排阵位。</p>':''}<h3>战前会议 · 已上阵 ${units.filter(u=>u.status==='active').length}／${frontlineCapacity(b,0)}</h3><details ${open?'open':''}><summary>后备部队 · 拖动排序与上阵</summary><p>拖到空格上阵，拖到场上部队进行替换；将场上部队拖回此处撤下。后备按队列顺序补位，未抵达援军须等待。</p><div class="reserve-bench" data-reserve-bench>${units.filter(u=>u.status==='reserve'&&u.hp>0).map((u,i)=>`<div class="council-unit" draggable="true" data-council-unit="${u.id}"><span>${i+1}. ${esc(u.name)} · ${TROOPS[u.type].name} · ${Math.round(u.hp)} · ${(u.arrivalTick||0)>b.tick?'未抵达':'后备'}</span></div>`).join('')||'<span>后备队列为空，可将场上部队拖回此处</span>'}</div></details>${retreatCouncilMarkup(b,{selected,retreatOpen,destinations})}</section>`;

}
export function changeBattleCouncil(b,{tactic,id,offset,toId}={}){
 if(!isDeploying(b))return '只能在战前会议调整';
 if(tactic!==undefined)return '不支持此调整';
 const units=b.sides[0].units,i=units.findIndex(u=>u.id===id),j=toId?units.findIndex(u=>u.id===toId):i+offset;
 if((!toId&&![-1,1].includes(offset))||i<0||j<0||j>=units.length)return '出阵顺序无效';
 const shieldUnit=units.find(u=>shieldLayers(b,u).some(l=>l.source==='siege:opening'));const opening=shieldUnit&&shieldLayers(b,shieldUnit).find(l=>l.source==='siege:opening');const ratio=opening?opening.amount/shieldUnit.initial:0;
 if(i===j)return null;const [moved]=units.splice(i,1);units.splice(j,0,moved);
 for(const u of units){if(u.status==='active'||u.status==='reserve'){u.status='reserve';u.x=-1;u.y=-1;}}
 fillSlots(b,0);
 if(opening)for(const u of units){refreshShield(b,u,shieldLayers(b,u).filter(l=>l.source!=='siege:opening'));if(u.status==='active')setStatus(b,u,'shield',opening.until-b.tick,{amount:Math.round(u.initial*ratio),source:'siege:opening',label:'守城首发护盾'});}
 return null;
}
