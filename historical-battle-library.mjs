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
 return '<section class="historical-library" aria-label="历史战役地图"><h2>历史战役地图</h2><div class="historical-map-grid">'+HISTORICAL_BATTLES.map(h=>{
  const m=BATTLE_MAPS[h.id],d=historicalBattleDraft(h.id),names=team=>team.map(u=>OFFICER_BY_ID[u.id].name).join('、'),units=customParticipants(d).map(u=>({...u,name:OFFICER_BY_ID[u.id].name})),armies=customArmyColumns(d);
  const map='<svg viewBox="0 0 140 80" role="img" aria-label="'+m.name+'地形预览">'+m.tiles.flatMap((row,y)=>row.map((t,x)=>'<rect x="'+x*10+'" y="'+y*10+'" width="10" height="10" fill="'+colors[t]+'"/>')).join('')+'</svg>';
  const forces=[0,1].map(side=>{const f=customBattleTotals(d,side);return '<p><b>'+esc(side?h.enemyName:h.ownName)+'</b> · '+f.troops.toLocaleString()+'人 · '+f.units+'队 · 援军'+f.reinforcementUnits+'队</p>';}).join('');
  return '<article class="historical-map-card">'+map+'<div><small>公元'+h.year+'年 · '+(d.battleKind==='defense'?'守城':'野战')+'</small><h3>'+h.name+'</h3>'+forces+'<details><summary>军团与事件</summary><p>'+h.ownName+'：'+names(d.ownTeam)+'</p><p>'+h.enemyName+'：'+names(d.enemyTeam)+'</p>'+d.reinforcements.map(a=>'<p>'+esc((a.side?h.enemyName:h.ownName)+' · '+a.name+' · '+arrivalLabel(a,units,armies)+'：'+names(a.team))+'</p>').join('')+d.events.map(e=>'<p>'+esc(battleEventSummary(e))+'</p>').join('')+'</details><button class="button primary" data-action="historical-template" data-history="'+h.id+'">载入</button></div></article>';
 }).join('')+'</div></section>';
}
