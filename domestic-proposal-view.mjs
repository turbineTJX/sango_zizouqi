import {pendingDomesticProposals,domesticProposalText} from './domestic.mjs';
import {mapNode} from './map-node-data.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function domesticApprovalMarkup(s,{cityId=null}={}){
 const proposals=pendingDomesticProposals(s).filter(a=>!cityId||a.cityId===cityId),automatic=s.campaign.domestic.autoApprove;
 return `<section class="domestic-proposals"><header><h3>内政提案${proposals.length?' · 待裁 '+proposals.length:''}</h3><button class="button secondary" data-action="domestic-auto-approve" aria-pressed="${automatic}">${automatic?'逐案裁示':'自动准奏'}</button></header><p class="strategy-muted">${automatic?'付费事务由负责人自行开办。':'需用钱粮之事先呈提案，获准后开办；不费钱粮的事务照常办理。'}</p>${proposals.map(a=>{const p=a.proposal;return `<article class="domestic-proposal" data-domestic-proposal="${p.id}"><small>${esc(mapNode(s,a.cityId).name)} · 第${p.createdDay}天</small><p>${esc(domesticProposalText(s,a))}</p><div class="domestic-proposal-actions"><button class="button primary" data-action="domestic-proposal-approve" data-proposal="${p.id}">准奏</button><button class="button secondary" data-action="domestic-proposal-reject" data-proposal="${p.id}">暂缓</button></div></article>`;}).join('')}</section>`;
}
