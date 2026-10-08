// Presentation only: road rules never import city artwork or SVG rendering.
import {portModel} from './strategic-relief.mjs';
import {citySceneState,cityCompactMarkup} from './city-scene.mjs';
import {metropolitanCenter} from './metropolitan-areas.mjs';
import {nodeKindName} from './road-network.mjs';
export function renderJunctions(s,selected){
  return (s.junctions||[]).map(n=>{
   const site=['gate','port'].includes(n.kind),center=site?metropolitanCenter(s,n):null,model=site?citySceneState(s,n):null;
   const scene=site?`<script type="application/json" data-city-model>${JSON.stringify(model).replaceAll('<','\\u003c')}</script><g class="map-city-scene" data-city-scene transform="scale(${model.layout.mapScale})"></g>`:'';
   const facilities=site?cityCompactMarkup(model):'';
   return `<g class="strategy-junction node-${n.kind} ${site?'node-metropolitan-site':''} ${selected===n.id?'selected':''}" ${site?`data-metropolis="${center.id}"`:''} data-junction="${n.id}" data-x="${n.x}" data-y="${n.y}" tabindex="0" role="button" aria-label="${n.name}，${nodeKindName(n)}${site?'，'+center.name+'都市圈':''}" aria-pressed="${selected===n.id}" transform="translate(${n.x} ${n.y})">${scene}${facilities}<g data-map-glyph><rect class="junction-hit" x="-9" y="-11" width="54" height="24" rx="3"/>${n.kind==='gate'?'<path class="atlas-gate-outline" d="M0-11L11 0 0 11-11 0Z" fill="#ece2c9" stroke="#6d6657" stroke-width="1.3"/><path class="junction-banner" d="M-6 6V-6h3v3h6v-3h3V6ZM-2 6V1h4v5"/>':n.kind==='port'?portModel():'<path class="junction-banner" d="M-5-7H5V4L0 7-5 4Z"/>'}<text class="junction-name" x="${n.kind==='port'?0:10}" y="${n.kind==='port'?21:4}" text-anchor="${n.kind==='port'?'middle':'start'}">${n.name}</text></g><title>${n.name}${site?' · '+center.name+'都市圈':''}</title></g>`;
  }).join('');
}
