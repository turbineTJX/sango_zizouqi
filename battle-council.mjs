import {TACTICS,TROOPS,isDeploying,fillSlots} from './engine.mjs';
import {shieldLayers,refreshShield,setStatus} from './tactics.mjs';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function battleCouncilMarkup(b,{open=true}={}){
 if(!isDeploying(b))return '';
 const units=b.sides[0].units;
 return `<section class="battle-council"><h3>战前会议 · 已上阵 ${units.filter(u=>u.status==='active').length}／6</h3><label>全军策略 <select id="council-tactic">${Object.entries(TACTICS).map(([id,name])=>`<option value="${id}" ${b.sides[0].tactic===id?'selected':''}>${name}</option>`).join('')}</select></label><details ${open?'open':''}><summary>后备部队 · 拖动排序与上阵</summary><p>拖到空格上阵，拖到场上部队进行替换；将场上部队拖回此处撤下。后备按队列顺序补位，未抵达援军须等待。</p><div class="reserve-bench" data-reserve-bench>${units.filter(u=>u.status==='reserve'&&u.hp>0).map((u,i)=>`<div class="council-unit" draggable="true" data-council-unit="${u.id}"><span>${i+1}. ${esc(u.name)} · ${TROOPS[u.type].name} · ${Math.round(u.hp)} · ${(u.arrivalTick||0)>b.tick?'未抵达':'后备'}</span></div>`).join('')||'<span>后备队列为空，可将场上部队拖回此处</span>'}</div></details></section>`;

}
export function changeBattleCouncil(b,{tactic,id,offset,toId}={}){
 if(!isDeploying(b))return '只能在战前会议调整';
 if(tactic!==undefined){if(!Object.hasOwn(TACTICS,tactic))return '全军策略无效';b.sides[0].tactic=tactic;return null;}
 const units=b.sides[0].units,i=units.findIndex(u=>u.id===id),j=toId?units.findIndex(u=>u.id===toId):i+offset;
 if((!toId&&![-1,1].includes(offset))||i<0||j<0||j>=units.length)return '出阵顺序无效';
 const shieldUnit=units.find(u=>shieldLayers(b,u).some(l=>l.source==='siege:opening'));const opening=shieldUnit&&shieldLayers(b,shieldUnit).find(l=>l.source==='siege:opening');const ratio=opening?opening.amount/shieldUnit.initial:0;
 if(i===j)return null;const [moved]=units.splice(i,1);units.splice(j,0,moved);
 for(const u of units){if(u.status==='active'||u.status==='reserve'){u.status='reserve';u.x=-1;u.y=-1;}}
 fillSlots(b,0);
 if(opening)for(const u of units){refreshShield(b,u,shieldLayers(b,u).filter(l=>l.source!=='siege:opening'));if(u.status==='active')setStatus(b,u,'shield',opening.until-b.tick,{amount:Math.round(u.initial*ratio),source:'siege:opening',label:'守城首发护盾'});}
 return null;
}
