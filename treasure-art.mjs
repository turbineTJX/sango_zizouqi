import {treasureDesign} from './data/design/treasures.mjs';
export function treasureImageMarkup(id,context){
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const d=treasureDesign(id,context);return d?`<span class="treasure-art" data-art-treasure="${id}" role="img" aria-label="${esc(d.name)}"></span>`:'';
}
