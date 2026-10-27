const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Math.floor(n||0).toLocaleString('zh-CN');
export function decisionFacts(rows){
 return `<dl class="decision-facts">${rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
}
export function decisionDetails(label,body){return `<details class="decision-details"><summary>${esc(label)}</summary>${body}</details>`;}
export function armySnapshot(a){
 const name=id=>a.units.find(u=>u.id===id)?.name||'未任命';
 return `<article class="army-snapshot"><b>${esc(a.name)}</b><p>${a.units.length} 队 · ${number(a.units.reduce((n,u)=>n+u.troops,0))} 人 · 粮 ${number(a.supply)}</p><small>军团长 ${esc(name(a.leader))} · 军师 ${esc(name(a.advisor))}</small></article>`;
}
export function armyChanges(before,after){
 return `<div class="decision-changes"><section><h4>调整前</h4>${before.map(armySnapshot).join('')}</section><section><h4>调整后</h4>${after.map(armySnapshot).join('')}</section></div>`;
}
