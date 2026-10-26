import {campaignDate} from './national-scenarios.mjs';
import {talentSummary} from './talent-lifecycle.mjs';
import {TALENT_REASONS} from './talent-core.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function talentPanel(s){
 const info=talentSummary(s);
 return `<details class="talent-panel"><summary>人才接洽 · ${info.N}人</summary>${info.people.map(p=>`<p><b>${esc(OFFICER_BY_ID[p.id].name)}</b> · ${p.locationConfirmed?esc(s.cities.find(c=>c.id===p.lastKnownCityId)?.name):'原位置线索已失效'}${p.locationConfirmed?` · ${p.phase==='SEEK'?'求仕中':'暂不求仕'} · 意愿${p.W}${p.H?' · 旧主顾虑-'+p.H:''}`:''}<br>接洽 ${p.progress}/${p.need} · ${esc(TALENT_REASONS[p.reason]||({signed:'已加入', 'other-faction':'已接受其他势力邀请'}[p.reason])||'等待接洽')}</p>`).join('')||'<p>暂无人才线索</p>'}<details><summary>人才重要报告</summary>${info.reports.map(r=>`<p>${campaignDate(s,{day:r.day})} · ${esc(r.text)}</p>`).join('')||'<p>暂无变化。</p>'}</details></details>`;
}
