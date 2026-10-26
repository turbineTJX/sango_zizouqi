import {campaignDate} from './national-scenarios.mjs';
import {pendingDomesticProposals,domesticProposalText} from './domestic.mjs';
import {mapNode} from './map-node-data.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function domesticApprovalMarkup(s,{cityId=null}={}){
 const proposals=pendingDomesticProposals(s).filter(a=>!cityId||a.cityId===cityId),automatic=s.campaign.domestic.autoApprove;
 return `<section class="domestic-proposals"><header><h3>内政提案${proposals.length?' · 待处理 '+proposals.length:''}</h3><button class="button secondary" data-action="domestic-auto-approve" aria-pressed="${automatic}">${automatic?'手动审批':'自动同意'}</button></header>${proposals.map(a=>{const p=a.proposal;return `<article class="domestic-proposal" data-domestic-proposal="${p.id}"><small>${esc(mapNode(s,a.cityId).name)} · ${campaignDate(s,{day:p.createdDay})}</small><p>${esc(domesticProposalText(s,a))}</p><div class="domestic-proposal-actions"><button class="button primary" data-action="domestic-proposal-approve" data-proposal="${p.id}">同意</button><button class="button secondary" data-action="domestic-proposal-reject" data-proposal="${p.id}">暂缓</button></div></article>`;}).join('')||'<p class="strategy-muted">暂无待处理提案</p>'}</section>`;
}
