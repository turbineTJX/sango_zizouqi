import {bondReference,bondGradeLabel} from './bond-reference.mjs';
import {armyFrontlineCapacity} from './army-trait-rules.mjs';
import {formationBoost} from './bond-battlefield.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {bondCaps,bondLevels,sideBonds,bondOnField,activeBonds,adjacentBondAlly,bondSwiftEffect} from './bonds.mjs';
import {hidden} from './battle-status-rules.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(id,label)=>`<button class="unit-trait-name bond-grade-${BOND_DESIGNS[id].grade}" aria-label="${esc(label)}，${bondGradeLabel(BOND_DESIGNS[id])}，查看详情" data-action="ability-reference" data-kind="bond" data-id="${esc(id)}">${esc(label)}</button>`;
export function personalBondsMarkup(u,b=null){
 const levels=bondLevels(u),active=new Set(activeBonds(b,u).filter(d=>d.special!=='entryPower'||(u.bondEntry?.powerUntil||0)>(b?.tick||0)).map(d=>d.id));
 if((u.hp??Infinity)>(u.maxHp??0)*(BOND_DESIGNS.bondLastStand.hpThreshold))active.delete('bondLastStand');
 if(!adjacentBondAlly(b,u))active.delete('bondMuster');
 if(!bondSwiftEffect(b,u))active.delete('bondSwift');
 if(adjacentBondAlly(b,u))active.delete('bondSpread');
 active.delete('bondGuard');if(formationBoost(b||{},u))active.add('bondGuard');if((u.statuses?.peachFury?.until||0)>(b?.tick??Infinity))active.add('bondPeach');
 return `<section class="personal-bonds"><h4>羁绊 <small>合计 ${Object.values(levels).reduce((n,v)=>n+v,0)} 点</small> <button class="text-button" data-action="bond-overview">一览</button></h4>${Object.keys(bondCaps(u)).map(id=>`<span class="bond-personal ${(levels[id]||0)>0?'learned':''}">${link(id,`${BOND_DESIGNS[id].name}${levels[id]||0}${active.has(id)?' · 生效':''}`)}</span>`).join('')}</section>`;
}
export function bondSummary(units,b=null,side=0){
 const eligible=b?(b.sides[side]?.units||[]).filter(bondOnField):units.filter(u=>(u.hp??u.troops)>0&&!u.isDecoy);
 const sums=b?sideBonds(b,side):{};
 if(!b)for(const u of eligible)for(const [id,n] of Object.entries(bondLevels(u))){if(!BOND_DESIGNS[id])continue;(sums[id]||={points:0}).points+=n;}
 if(b?.sides[side]?.bondReserve?.tier&&!sums.bondReserve)sums.bondReserve={points:0};
 if(b?.sides[side]?.bondPeach?.members.length&&!sums.bondPeach)sums.bondPeach={points:0};
 return Object.entries(sums).filter(([id,s])=>s.points>0||id==='bondReserve'&&b?.sides[side]?.bondReserve?.tier||id==='bondPeach'&&b?.sides[side]?.bondPeach?.members.length).map(([id,s])=>{const d=BOND_DESIGNS[id],tier=d.thresholds.filter(n=>s.points>=n).length;return {id,...d,...(d.special==='lastStand'?{triggeredMembers:eligible.filter(u=>bondLevels(u)[id]>0&&u.hp<=u.maxHp*d.hpThreshold).map(u=>u.name)}:{}),...(id==='bondReserve'&&b?.sides[side]?.bondReserve?{lockedTier:b.sides[side].bondReserve.tier,remaining:Math.max(0,(d.slots[b.sides[side].bondReserve.tier-1]||0)-b.sides[side].bondReserve.awarded.length),nextReserve:side===0?b.sides[side].units.find(u=>u.status==='reserve'&&u.hp>0&&(u.arrivalTick||0)<=b.tick)?.name:null}:{}),...(id==='bondPeach'?{fallen:b?.sides[side]?.bondPeach?.defeated.length||0,triple:b?.sides[side]?.bondPeach?.triple||false}:{}),...(d.special==='routMomentum'?{progress:b?.sides[side]?.bondRout?.targets.length||0,burstLeft:Math.max(0,(b?.sides[side]?.bondRout?.burstAt??-10000)+d.burstDuration+1-(b?.tick||0))}:{}),points:s.points,tier,next:d.thresholds[tier]??null,members:eligible.filter(u=>bondLevels(u)[id]>0).map(u=>`${u.name} +${bondLevels(u)[id]}`)};}).sort((a,b)=>b.tier-a.tier||b.points-a.points||a.id.localeCompare(b.id));
}
export function openingBondUnits(units,army={}){
 return units.filter(u=>(u.hp??u.troops)>0&&!u.isDecoy&&!(u.arrivalTick>0)).map((u,i)=>({u,i})).sort((a,b)=>Number(!!b.u.first)-Number(!!a.u.first)||a.i-b.i).slice(0,armyFrontlineCapacity(army)).map(({u})=>u);
}
export function bondDetail(d){
 const data=bondReference(d.id);
 data.groups[0].rows=data.groups[0].rows.map(row=>row[0]===`${d.thresholds[d.tier-1]} 点`?[row[0]+' · 当前','',row[2]]:row);
 return data;
}
export function bondsMarkup(units,{battle=null,side=0,title=battle?'在场羁绊':'首发羁绊',army={}}={}){
 const opening=battle?units:openingBondUnits(units,army),rows=bondSummary(opening,battle,side);
 return `<section class="bond-panel" aria-label="${esc(title)}"><h4>${esc(title)}</h4><div class="bond-list">${rows.map(d=>{const progress=`${d.points}/${d.next??d.thresholds.at(-1)}`;return `<button class="bond-row bond-chip bond-grade-${d.grade} ${d.tier?'bond-lit':''}" data-bond="${d.id}" data-bond-name="${esc(d.name)}" data-bond-hover-key="${esc(title+':'+side+':'+d.id)}" data-bond-contributors="${esc(JSON.stringify(bondContributors(opening,battle,side,d.id)))}" data-action="ability-reference" data-kind="bond" data-id="${d.id}" data-details="${esc(JSON.stringify(bondDetail(d)))}" aria-label="${esc(d.name)}，${progress}点${d.next?'，下一档'+d.next+'点':'，最高档'}，悬停查看贡献部队，点击查看详情"><span class="bond-heading"><span>${esc(d.name)}</span><small class="bond-progress">${progress}</small></span></button>`;}).join('')||'<span class="muted">暂无羁绊</span>'}</div></section>`;
}
export function bondContributors(units,b,side,id){
 const eligible=b?(b.sides[side]?.units||[]).filter(bondOnField):units.filter(u=>(u.hp??u.troops)>0&&!u.isDecoy);
 return eligible.filter(u=>(bondLevels(u)[id]||0)>0).map(u=>b&&side===1&&hidden(b,u)?{id:null,name:'未侦察部队',points:bondLevels(u)[id]}:{id:u.id,name:u.name,points:bondLevels(u)[id]});
}
export const battleBondsMarkup=(b,side=null)=>(side===null?[0,1]:[side]).map(side=>bondsMarkup([],{battle:b,side,title:side?'敌军羁绊':'我军羁绊'})).join('');
