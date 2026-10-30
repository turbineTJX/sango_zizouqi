import {HEX_GRID} from './hex-grid.mjs';
import {STRATAGEM_DESIGNS} from './data/design/stratagems.mjs';
import {AREA_HEIGHT,areaPosition,stratagemAreaTargets,stratagemHasEffect,stratagemScopeText,firestormAmount} from './stratagem-area.mjs';
import {abilityButton} from './ability-reference.mjs';
import {availableBattleCommanders,selectStratagemSource,stratagemEffectText} from './stratagems.mjs';
const esc=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const areaActionIcon=action=>`<svg class="stratagem-area-action-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${action==='rotate'?'<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/><path d="M9 9h6v6H9z"/>':'<circle cx="12" cy="12" r="7"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><path d="m9 12 2 2 4-4"/>'}</svg>`;

export function areaPreview(b,s,draft){
 const p=draft.point,r=s.scope,c=p&&areaPosition(p);
 const side=draft.side??0,targets=stratagemAreaTargets(b,s,p,side).filter(u=>stratagemHasEffect(b,s,u));
 const key=Object.keys(STRATAGEM_DESIGNS).find(key=>STRATAGEM_DESIGNS[key].name===s.name),source=selectStratagemSource(availableBattleCommanders(b.sides[side],b.tick),key);
 const effect=source?abilityButton('stratagem',key,'详情',stratagemEffectText(source)+(s.effect==='firestorm'?'；火势是全军谋略输出系数，不是敌军兵力百分比。圈外目标不承受本次灼烧，也不把其份额转给圈内目标。':'')):'';
 const shape=!c?'':r.shape==='unit'?`<circle cx="${c.x}" cy="${c.y}" r="0.48"/>`:r.shape==='circle'?`<circle cx="${c.x}" cy="${c.y}" r="${r.radius}"/>`:`<rect x="${c.x-(p.rotation===90?r.height:r.width)/2}" y="${c.y-(p.rotation===90?r.width:r.height)/2}" width="${p.rotation===90?r.height:r.width}" height="${p.rotation===90?r.width:r.height}"/>`;
 const rings=targets.map(u=>{const q=areaPosition(u);return `<circle class="area-hit" cx="${q.x}" cy="${q.y}" r="0.42"/>`;}).join('');
 const fire=source&&s.effect==='firestorm'&&targets.length?targets.map(u=>firestormAmount(b,s,source,side,u)):[];
 const fireText=fire.length?' · 每队基础灼伤 '+Math.min(...fire)+(Math.max(...fire)!==Math.min(...fire)?'～'+Math.max(...fire):'')+'/回合':'';
 return {targetIds:targets.map(u=>u.id),svg:`<svg viewBox="0 0 ${HEX_GRID.width} ${AREA_HEIGHT}" preserveAspectRatio="none" aria-hidden="true">${shape}${rings}</svg>`,controls:`<button class="button secondary" data-area-action="cancel">取消</button><div class="stratagem-area-heading"><b title="${esc(stratagemScopeText(s))}">${s.name}</b><span role="status">${p?'影响 '+targets.length+' 队'+fireText+(r.shape==='unit'&&targets[0]?' · '+esc(targets[0].name):''):r.shape==='unit'?'选择友军':'点击战场选择落点'}</span></div>${effect}<div class="stratagem-area-actions">${r.shape==='rectangle'?`<button type="button" class="button stratagem-area-action stratagem-area-rotate" data-area-action="rotate" title="旋转选区 90°" aria-label="旋转90°">${areaActionIcon('rotate')}</button>`:''}<button type="button" class="button stratagem-area-action stratagem-area-confirm" data-area-action="confirm" ${source&&(targets.length||s.zone&&p)?'':'disabled'} title="施放军略" aria-label="施放">${areaActionIcon('confirm')}</button></div>`};
}
export function stratagemZonesMarkup(b){
 const zones=b.stratagemZones.filter(z=>z.until>b.tick).map(z=>{
  const s=STRATAGEM_DESIGNS[z.key],p=areaPosition(z.point),r=s.scope.radius;
  const spokes=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return `<line x1="${p.x+Math.cos(a)*r*.45}" y1="${p.y+Math.sin(a)*r*.45}" x2="${p.x+Math.cos(a)*r}" y2="${p.y+Math.sin(a)*r}"/>`;}).join('');
  return `<g class="stratagem-zone zone-side-${z.side}" data-zone="${z.side}-${z.key}"><title>${z.side?'敌方':'我方'}${s.name}：${esc(stratagemEffectText(z.source))}</title><circle cx="${p.x}" cy="${p.y}" r="${r}"/><circle class="zone-inner" cx="${p.x}" cy="${p.y}" r="${r*.45}"/>${spokes}<text x="${p.x}" y="${p.y-r+.3}" text-anchor="middle">${s.name} · 余${z.until-b.tick-1}回合</text></g>`;
 }).join('');
 return `<svg viewBox="0 0 ${HEX_GRID.width} ${AREA_HEIGHT}" preserveAspectRatio="none" aria-label="持续军略区域">${zones}</svg>`;
}
export function nearestAreaCell(clientX,clientY,rect){
 const p={x:(clientX-rect.left)/rect.width*HEX_GRID.width,y:(clientY-rect.top)/rect.height*AREA_HEIGHT};
 let best=null,dist=Infinity;
 for(let y=0;y<HEX_GRID.rows;y++)for(let x=0;x<HEX_GRID.cols;x++){const c=areaPosition({x,y}),d=(c.x-p.x)**2+(c.y-p.y)**2;if(d<dist){dist=d;best={x,y};}}
 return best;
}
