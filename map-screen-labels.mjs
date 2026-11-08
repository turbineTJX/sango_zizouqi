// Labels live in a small screen-space layer. Moving the world must not lay out
// every hidden city's text, port illustration and banner on each wheel frame.
const ns='http://www.w3.org/2000/svg';
const paint=['fill','fill-opacity','stroke','stroke-width','stroke-opacity','stroke-linecap','stroke-linejoin','stroke-dasharray','paint-order','font-family','font-size','font-weight','font-style','letter-spacing','text-anchor','dominant-baseline','opacity','visibility'];
const dynamic=['x','y','width','height','transform','d'];
export function prepareMapScreenLabels(svg){
 const camera=svg.querySelector('[data-map-camera-scene]'),layer=document.createElementNS(ns,'g');layer.dataset.mapScreenLabels='';layer.setAttribute('aria-hidden','true');layer.style.pointerEvents='none';svg.append(layer);
 const transforms=new WeakMap(),states=[];
 const matrix=node=>{
  const text=node.getAttribute('transform')||'',cached=transforms.get(node);if(cached?.text===text)return cached.matrix;
  let m=new DOMMatrix();for(const [,name,values]of text.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)){
   const a=values.trim().split(/[\s,]+/).map(Number);
   if(name==='matrix')m=m.multiply(new DOMMatrix(a));else if(name==='translate')m=m.translate(a[0],a[1]||0);else if(name==='scale')m=m.scale(a[0],a[1]??a[0]);else if(name==='rotate')m=m.translate(a[1]||0,a[2]||0).rotate(a[0]).translate(-(a[1]||0),-(a[2]||0));else if(name==='skewX')m=m.skewX(a[0]);else m=m.skewY(a[0]);
  }transforms.set(node,{text,matrix:m});return m;
 };
 const sources=[...camera.querySelectorAll('[data-map-glyph],[data-map-overview-glyph],.geography-labels text,.atlas-province-labels text')].filter(node=>!node.parentElement.closest('[data-map-glyph],[data-map-overview-glyph]'));
 for(const source of sources){
  const ancestry=[];for(let node=source;node&&node!==camera;node=node.parentElement)ancestry.push({node,opacity:node.classList.contains('geography-labels')?1:Number(getComputedStyle(node).opacity)||0});
  const clone=source.cloneNode(true),originals=[source,...source.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')],pairs=[];
  for(let i=0;i<originals.length;i++){
   const original=originals[i],copy=copies[i];if(copy.tagName==='script'){copy.remove();continue;}
   const style=getComputedStyle(original);for(const key of paint)copy.style.setProperty(key,style.getPropertyValue(key));
   for(const a of [...copy.attributes])if(a.name.startsWith('data-')||['role','tabindex','aria-label'].includes(a.name))copy.removeAttribute(a.name);
   copy.style.setProperty('pointer-events','none','important');pairs.push({original,copy});
  }
  clone.removeAttribute('transform');clone.style.opacity='1';clone.style.display='';clone.style.visibility='visible';layer.append(clone);
  const slot=document.createComment('map-label-source'),leaf=source.tagName==='text';
  let children;const hits=[];if(leaf)source.before(slot);else{
   children=[...source.childNodes];const hitTree=source.cloneNode(true),hitNodes=[hitTree,...hitTree.querySelectorAll('*')];
   for(let i=1;i<hitNodes.length;i++){
    const hit=hitNodes[i];if(['text','title','script','defs','image','foreignObject'].includes(hit.tagName)){hit.remove();continue;}
    hit.removeAttribute('id');hits.push({original:originals[i],copy:hit});
   }
   // Retain the real city/flag/banner hit geometry and its command attributes.
   // Only text leaves leave the world tree; an approximate bounding box would
   // either miss city symbols or cover neighbouring building click targets.
   const hit=document.createElementNS(ns,'g');hit.style.opacity='0';hit.setAttribute('aria-hidden','true');hit.append(...hitTree.childNodes);source.replaceChildren(hit);
  }
  if(leaf)source.remove();states.push({source,clone,pairs,hits,ancestry,chain:[...ancestry].reverse(),slot,leaf,children,place:source.closest('[data-city],[data-junction]'),geography:!!ancestry.find(a=>a.node.classList.contains('geography-labels'))});
 }
 let disposed=false;
 return {
  hover(place){for(const state of states)for(const {original,copy}of state.pairs)if(copy.matches('.national-place-name,.junction-name,.overview-place-name'))copy.style.visibility=place&&state.place===place?'visible':original.style.visibility;},
  refresh(){for(const state of states)for(const {original,copy}of [...state.pairs,...state.hits]){
   if(copy===state.clone)continue;
   for(const key of dynamic){const value=original.getAttribute(key);if(value!==copy.getAttribute(key)){if(value===null)copy.removeAttribute(key);else copy.setAttribute(key,value);}}
   for(const key of ['display','visibility','opacity']){const value=original.style[key];if(copy.style[key]!==value)copy.style[key]=value;}
  }},
  apply(view,bounds){
   if(disposed)return;const base=svg.viewBox.baseVal,unit=Math.min(bounds.width/base.width,bounds.height/base.height),scale=Math.min(bounds.width/view.width,bounds.height/view.height),left=(bounds.width-view.width*scale)/2-view.x*scale,top=(bounds.height-view.height*scale)/2-view.y*scale;
   layer.setAttribute('transform',`matrix(${1/unit},0,0,${1/unit},${base.x-(bounds.width-base.width*unit)/2/unit},${base.y-(bounds.height-base.height*unit)/2/unit})`);
   for(const state of states){
    let show=true,opacity=1;
    for(const {node,opacity:initialOpacity}of state.ancestry){
     if(node.style.display==='none'||node.style.visibility==='hidden'||node.classList.contains('is-marker-hidden')||node.classList.contains('is-label-hidden'))show=false;
     opacity*=node.style.opacity===''?initialOpacity:Number(node.style.opacity);
    }
    if(!state.leaf&&!state.source.isConnected)show=false;
    if(!show||opacity<=0){if(state.clone.style.display!=='none')state.clone.style.display='none';continue;}
    let m=new DOMMatrix();for(const {node}of state.chain)m=m.multiply(matrix(node));
    const p=new DOMMatrix([scale,0,0,scale,left,top]).multiply(m),visible=show&&opacity>0&&p.e>-200&&p.f>-200&&p.e<bounds.width+200&&p.f<bounds.height+200;
    if(state.clone.style.display!==(visible?'':'none'))state.clone.style.display=visible?'':'none';if(!visible)continue;
    state.clone.style.opacity=String(opacity*(state.geography&&svg.classList.contains('map-close')?.35:1));
    state.clone.setAttribute('transform',`matrix(${p.a},${p.b},${p.c},${p.d},${p.e},${p.f})`);
   }
  },
  destroy(){if(disposed)return;disposed=true;for(const state of states){if(state.leaf){state.slot.after(state.source);state.slot.remove();}else state.source.replaceChildren(...state.children);}layer.remove();}
 };
}
