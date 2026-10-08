import {HEX_GRID} from './hex-grid.mjs';
import {STRATAGEM_DESIGNS} from './data/design/stratagems.mjs';
import {AREA_HEIGHT,areaPosition,stratagemAreaTargets,stratagemHasEffect,stratagemScopeText} from './stratagem-area.mjs';
import {availableBattleCommanders,selectStratagemSource,stratagemEffectText} from './stratagems.mjs';
const esc=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export function areaPreview(b,s,draft){
 const p=draft.point,r=s.scope,c=p&&areaPosition(p);
 const side=draft.side??0,targets=stratagemAreaTargets(b,s,p,side).filter(u=>stratagemHasEffect(b,s,u));
 const key=Object.keys(STRATAGEM_DESIGNS).find(key=>STRATAGEM_DESIGNS[key].name===s.name),source=selectStratagemSource(availableBattleCommanders(b.sides[side],b.tick),key);
 const effect=source?'<small class="stratagem-area-effect">'+esc(stratagemEffectText(source))+'</small>':'';
 const shape=!c?'':r.shape==='unit'?`<circle cx="${c.x}" cy="${c.y}" r="0.48"/>`:r.shape==='circle'?`<circle cx="${c.x}" cy="${c.y}" r="${r.radius}"/>`:`<rect x="${c.x-(p.rotation===90?r.height:r.width)/2}" y="${c.y-(p.rotation===90?r.width:r.height)/2}" width="${p.rotation===90?r.height:r.width}" height="${p.rotation===90?r.width:r.height}"/>`;
 const rings=targets.map(u=>{const q=areaPosition(u);return `<circle class="area-hit" cx="${q.x}" cy="${q.y}" r="0.42"/>`;}).join('');
 return {targetIds:targets.map(u=>u.id),svg:`<svg viewBox="0 0 ${HEX_GRID.width} ${AREA_HEIGHT}" preserveAspectRatio="none" aria-hidden="true">${shape}${rings}</svg>`,controls:`<button class="button secondary" data-area-action="cancel">取消</button><b>${s.name} · ${stratagemScopeText(s)}</b><span role="status">${p?`当前影响 ${targets.length} 队${s.zone?'，可在空地布阵':'，可重新选择落点'}`:(r.shape==='unit'?'点击一支友军；Esc 取消':'点击战场选择落点；Esc 取消')}</span>${r.shape==='rectangle'?'<button class="button secondary" data-area-action="rotate">旋转 90°</button>':''}<button class="button" data-area-action="confirm" ${targets.length||s.zone&&p?'':'disabled'}>施放</button>${effect}`};
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
