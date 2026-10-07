import {HISTORICAL_BATTLES} from './data/design/historical-battles.mjs';
import {BATTLE_MAPS} from './data/design/battle-maps.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {arrivalLabel,customArmyColumns} from './reinforcement-arrival.mjs';
import {battleEventSummary} from './battle-events.mjs';
import {validateCustomBattle,customBattleTotals,customParticipants} from './custom-battle.mjs';
export {HISTORICAL_BATTLES};
export function historicalBattleDraft(id){const b=HISTORICAL_BATTLES.find(b=>b.id===id);if(!b)throw Error('未知历史战役');return validateCustomBattle(structuredClone(b.draft));}
const colors={land:'#b69c69',forest:'#46654b',hill:'#877456',marsh:'#617c70',water:'#375d75',bridge:'#d4b47b'};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function historicalBattleLibrary(){
 return '<section class="historical-library" aria-label="历史战役地图"><h2>历史战役地图</h2><p>六场经典交锋 · 每军团最多十队 · 全员10级。按游戏尺度压缩兵力差距，援军按日期或消灭条件到达。载入后可修改兵力、援军与定时事件，也可交换双方。</p><div class="historical-map-grid">'+HISTORICAL_BATTLES.map(h=>{
  const m=BATTLE_MAPS[h.id],d=historicalBattleDraft(h.id),names=team=>team.map(u=>OFFICER_BY_ID[u.id].name).join('、'),units=customParticipants(d).map(u=>({...u,name:OFFICER_BY_ID[u.id].name})),armies=customArmyColumns(d);
  const map='<svg viewBox="0 0 140 80" role="img" aria-label="'+m.name+'地形预览">'+m.tiles.flatMap((row,y)=>row.map((t,x)=>'<rect x="'+x*10+'" y="'+y*10+'" width="10" height="10" fill="'+colors[t]+'"/>')).join('')+'</svg>';
  const forces=[0,1].map(side=>{const f=customBattleTotals(d,side);return '<p><b>'+esc(side?h.enemyName:h.ownName)+'</b> · '+f.troops.toLocaleString()+'人 · '+f.units+'队 · 援军'+f.reinforcementUnits+'队</p>';}).join('');
  return '<article class="historical-map-card">'+map+'<div><small>公元'+h.year+'年 · '+(d.battleKind==='defense'?'守城':'野战')+'</small><h3>'+h.name+'</h3><p>'+m.description+'</p>'+forces+'<details><summary>军团与事件</summary><p>总规模含条件援军，条件未满足的军团不出战。</p><p>'+esc(h.designNote)+'</p><p>'+h.ownName+'：'+names(d.ownTeam)+'</p><p>'+h.enemyName+'：'+names(d.enemyTeam)+'</p>'+d.reinforcements.map(a=>'<p>'+esc((a.side?h.enemyName:h.ownName)+' · '+a.name+' · '+arrivalLabel(a,units,armies)+'：'+names(a.team))+'</p>').join('')+d.events.map(e=>'<p>'+esc(battleEventSummary(e))+'</p>').join('')+'<p>参考：'+h.sources.map(r=>'<a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">'+esc(r.title)+'</a>').join(' · ')+'</p></details><button class="button primary" data-action="historical-template" data-history="'+h.id+'">载入</button></div></article>';
 }).join('')+'</div></section>';
}
