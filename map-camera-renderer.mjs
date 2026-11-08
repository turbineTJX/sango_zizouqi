// The SVG viewport is fixed. Camera movement changes one parent transform;
// it does not invalidate every descendant's viewport-dependent layout.
const ns='http://www.w3.org/2000/svg';
export function mapWheelRatio(deltaY,deltaMode=0,pagePixels=800){
 const pixels=deltaY*(deltaMode===1?100/3:deltaMode===2?pagePixels:1);
 return Math.exp(Math.max(-Math.log(32),Math.min(Math.log(32),pixels*Math.log(1/.88)/100)));
}
export function mapCameraProjection(base,view,viewport){
 const unit=Math.min(viewport.width/view.width,viewport.height/view.height);
 const baseUnit=Math.min(viewport.width/base.width,viewport.height/base.height);
 return {scale:unit/baseUnit,x:base.x+((viewport.width-view.width*unit)/2-view.x*unit-(viewport.width-base.width*baseUnit)/2)/baseUnit,y:base.y+((viewport.height-view.height*unit)/2-view.y*unit-(viewport.height-base.height*baseUnit)/2)/baseUnit};
}
export function prepareMapCameraRenderer(svg){
 const v=svg.viewBox.baseVal,base={x:v.x,y:v.y,width:v.width,height:v.height};
 const scene=document.createElementNS(ns,'g');scene.dataset.mapCameraScene='';
 while(svg.firstChild)scene.append(svg.firstChild);svg.append(scene);
 let bounds=svg.getBoundingClientRect(),disposed=false;
 const renderer={
  apply(view){
   if(disposed)return;
   const p=mapCameraProjection(base,view,bounds),transform=`matrix(${p.scale},0,0,${p.scale},${p.x},${p.y})`;
   if(scene.getAttribute('transform')!==transform)scene.setAttribute('transform',transform);
   svg.dataset.cameraViewBox=[view.x,view.y,view.width,view.height].join(' ');
  },
  scale:view=>Math.min(bounds.width/view.width,bounds.height/view.height),
  point:(event,view)=>{
   const scale=renderer.scale(view);
   return {x:view.x+(event.clientX-bounds.left-(bounds.width-view.width*scale)/2)/scale,y:view.y+(event.clientY-bounds.top-(bounds.height-view.height*scale)/2)/scale};
  },
  resize(){bounds=svg.getBoundingClientRect();},
  destroy(){
   disposed=true;while(scene.firstChild)svg.insertBefore(scene.firstChild,scene);scene.remove();
   delete svg.dataset.cameraViewBox;delete svg.dataset.cameraRendererReady;
  }
 };
 svg.dataset.cameraRendererReady='true';return renderer;
}
