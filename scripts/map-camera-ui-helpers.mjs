// The SVG viewBox is a fixed projection basis in the retained renderer.
// Read the logical camera for navigation assertions, with a legacy fallback.
export function readMapView(svg){
 if(svg.dataset.cameraViewBox)return Object.fromEntries(svg.dataset.cameraViewBox.split(' ').map((n,i)=>[['x','y','width','height'][i],+n]));
 const v=svg.viewBox.baseVal;return {x:v.x,y:v.y,width:v.width,height:v.height};
}
export function mapResourcesReady(){
 const svg=document.querySelector('.national-world'),terrain=svg?.querySelector('.ancient-atlas-terrain');
 return svg?.dataset.cameraRendererReady==='true'&&svg.dataset.mapSpritePending==='0'&&terrain?.dataset.previewReady==='true'&&terrain.dataset.tilePending==='0';
}
