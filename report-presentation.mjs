import {battleDays} from './player-time.mjs';
import {FACTIONS} from './engine.mjs';
import {BATTLE_LOG_KINDS} from './battle-log.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pattern=v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function reportText(text,names=[]){
 const people=[...new Set(names.filter(Boolean))].sort((a,b)=>b.length-a.length),tokens=new RegExp('('+[...people.map(pattern),'「[^」]+」','\\d+(?:\\.\\d+)?%?'].join('|')+')','g');
 return String(text).split(tokens).map(part=>people.includes(part)?`<em class="report-person">${esc(part)}</em>`:/^「/.test(part)?`<em class="report-ability">${esc(part)}</em>`:/^\d/.test(part)?`<strong class="report-value">${esc(part)}</strong>`:esc(part)).join('');
}
export function battleJournalMarkup(b,filter='all'){
 const names=b.sides.flatMap(side=>side.units.map(u=>u.name));
 return (b.logs||[]).filter(l=>filter==='all'||(l.kind||'event')===filter).map(l=>{
  const side=l.side===0||l.side===1?l.side:null,color=side===null?'#bdc4b2':FACTIONS[b.sides[side]?.faction]?.color||(side===0?'#8ebd78':'#d77c72'),kind=BATTLE_LOG_KINDS[l.kind||'event']||'战况';
  return `<article class="journal-row compact-journal-row" style="--report-color:${color}" aria-label="交战第${Math.max(1,battleDays(l.tick))}天 · ${kind}${side===null?'':side===0?' · 我军':' · 敌军'}"><i class="report-side" title="${side===null?'战况':side===0?'我军':'敌军'}" aria-hidden="true"></i><p>${reportText(l.text,names)}</p><time title="交战第${Math.max(1,battleDays(l.tick))}天 · ${kind}">${Math.max(1,battleDays(l.tick))}天</time></article>`;
 }).join('')||'<p class="muted">暂无记录</p>';
}
