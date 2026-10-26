import {battleMap} from './data/design/battle-maps.mjs';
import {battleEnvironmentArtwork,ENVIRONMENT_WIDTH as width,ENVIRONMENT_HEIGHT as height} from './battle-environment-art.mjs';

const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cached=new Map();

// This layer depicts actual terrain cells. It has no simulation or RNG state.
export function battleMapArtwork(b,{prefix='battlefield'}={}){
 const m=battleMap(b),key=(b.mapId||b.terrain||'land')+':'+prefix;
 if(cached.has(key))return cached.get(key);
 const result=battleEnvironmentArtwork(m,{prefix});
 cached.set(key,result);return result;
}

export function battleMapPreview(b){
 const m=battleMap(b),prefix='preview-'+(b.mapId||b.terrain||'land');
 return `<section class="battle-map-preview" aria-label="战场地图预览"><div><b>${escape(m.name)}</b><span>地图预览</span></div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(m.name+'：'+m.description)}">${battleMapArtwork(b,{prefix})}</svg></section>`;
}
