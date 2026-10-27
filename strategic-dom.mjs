const keys=['id','data-city','data-junction','data-metropolis-focus','data-campaign-army','data-campaign-battle','data-map-battle-anchor','data-map-building','data-model-building','data-vision-region'];
function key(node){
 if(node.nodeType!==1)return null;
 for(const name of keys)if(node.getAttribute(name))return node.tagName+':'+name+':'+node.getAttribute(name);
 return null;
}
const compatible=(a,b)=>a.nodeType===b.nodeType&&(a.nodeType!==1||a.tagName===b.tagName&&key(a)===key(b));
// Keep only the latest input tree per live root. Comparing input trees skips
// unchanged subtrees without erasing camera, portrait or animation DOM state.
const previousTrees=new WeakMap();
const sourceTargets=new WeakMap();
function rememberNodes(target,source){
 sourceTargets.set(source,target);
 const children=[...target.childNodes];[...source.childNodes].forEach((node,i)=>rememberNodes(children[i],node));
}
function retainEqualChildren(source,previous){
 let incoming=source.firstChild,prior=previous.firstChild;
 while(incoming&&prior){const target=sourceTargets.get(prior);if(target)sourceTargets.set(incoming,target);retainEqualChildren(incoming,prior);incoming=incoming.nextSibling;prior=prior.nextSibling;}
}
function syncControl(target,source){
 if(target.value!==source.value)target.value=source.value;
 if(target.tagName==='INPUT')target.checked=source.checked;
}
function syncControls(target,source){
 if(['INPUT','SELECT','TEXTAREA'].includes(source.tagName))syncControl(target,source);
 const incoming=source.querySelectorAll?.('input,select,textarea');
 if(!incoming?.length)return;
 const existing=target.querySelectorAll('input,select,textarea');
 for(let i=0;i<incoming.length;i++)if(existing[i]&&compatible(existing[i],incoming[i]))syncControl(existing[i],incoming[i]);
}
function patch(target,source,preserveScene=false,previous=null){
 const sameTarget=previous&&sourceTargets.get(previous)===target;sourceTargets.set(source,target);
 const scene=source.nodeType===1&&source.hasAttribute('data-city-scene');
 if(sameTarget&&source.isEqualNode(previous)&&(!scene||preserveScene)){retainEqualChildren(source,previous);syncControls(target,source);return;}
 const element=source.nodeType===1;
 if(!element&&source.nodeType!==11){if(target.nodeValue!==source.nodeValue)target.nodeValue=source.nodeValue;return;}
 // The terrain is immutable within a season. Retain its decoded image layers.
 if(element&&source.hasAttribute('data-preserve-terrain'))return;
 if(element&&source.hasAttribute('data-city-scene')&&preserveScene)return;
 const model=element&&source.matches('.node-city,.node-metropolitan-site')?source.querySelector(':scope>script[data-city-model]'):null;
 const keepScene=!!model&&model.textContent===target.querySelector(':scope>script[data-city-model]')?.textContent;
 if(element){
  for(const {name}of [...target.attributes])if(!source.hasAttribute(name))target.removeAttribute(name);
  for(const {name,value}of source.attributes)if(target.getAttribute(name)!==value)target.setAttribute(name,value);
 }
 const old=[...target.childNodes],used=new Set(),keyed=new Map(old.map(n=>[key(n),n]).filter(([k])=>k));
 let cursor=target.firstChild;
 const prior=[...(previous?.childNodes||[])],priorKeys=new Map(prior.map(n=>[key(n),n]).filter(([k])=>k));let index=0;
 for(const incoming of source.childNodes){
  const id=key(incoming);
  const last=id?priorKeys.get(id):prior[index];index++;
  let existing=id?keyed.get(id):cursor&&!used.has(cursor)&&compatible(cursor,incoming)?cursor:old.find(n=>!used.has(n)&&!key(n)&&compatible(n,incoming));
  if(existing&&!compatible(existing,incoming))existing=null;
  if(existing){used.add(existing);if(existing!==cursor)target.insertBefore(existing,cursor);patch(existing,incoming,keepScene,last&&compatible(last,incoming)?last:null);}
  else {existing=incoming.cloneNode(true);rememberNodes(existing,incoming);target.insertBefore(existing,cursor);}
  cursor=existing.nextSibling;
 }
 for(const node of old)if(!used.has(node))node.remove();
 if(['INPUT','SELECT','TEXTAREA'].includes(target.tagName))syncControl(target,source);
}
export function patchStrategicDOM(root,markup){
 const current=root.firstElementChild;
 if(!current?.classList.contains('strategy-map-first'))return false;
 const template=document.createElement('template');template.innerHTML=markup;
 const next=template.content.firstElementChild;
 if(!next?.classList.contains('strategy-map-first'))return false;
 patch(current,next,false,previousTrees.get(root));previousTrees.set(root,next);return true;
}
export function rememberStrategicDOM(root){const node=root.firstElementChild,source=node?.cloneNode(true);previousTrees.set(root,source);if(node)rememberNodes(node,source);}
export function forgetMarkup(root){previousTrees.delete(root);}
export function patchMarkup(root,markup){
 if(!root)return false;
 const template=document.createElement('template');template.innerHTML=markup;
 const before=previousTrees.get(root);if(before?.isEqualNode(template.content)){syncControls(root,template.content);return false;}
 patch(root,template.content,false,before);previousTrees.set(root,template.content);return true;
}
export function patchElement(root,markup){
 if(!root)return;
 const template=document.createElement('template');template.innerHTML=markup;
 const next=template.content.firstElementChild;
 if(compatible(root,next)){patch(root,next,false,previousTrees.get(root));previousTrees.set(root,next);}
}
