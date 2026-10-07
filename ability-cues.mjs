import {outcomeLines} from './tactic-outcomes.mjs';
import {art,assetURL} from './art-assets.mjs';
import {TRAIT_DESIGNS} from './data/design/traits.mjs';
import {TACTIC_DESIGNS} from './data/design/tactics.mjs';

export function isHighlightedAbility(e){
 if(!e||e.traitEffective===false)return false;
 if(e.abilityKind==='trait')return TRAIT_DESIGNS[e.traitId]?.tier==='专属';
 if(e.ongoing||!e.skill)return false;
 const tactic=Object.values(TACTIC_DESIGNS).find(t=>t.name===e.label);
 return !!(tactic&&(tactic.special||tactic.learningTier==='high')||e.combo||e.comboLevel>=2);
}

// Presentation clock only: never consumes RNG, changes initiative, or pauses combat.
export class AbilityCues {
 constructor(root=null){this.root=root;this.reset();}
 reset(){this.active=[null,null];this.waiting=[[],[]];this.serial=0;this.renderKey='';if(this.root)this.root.replaceChildren();}
 push(events,clock){
  const e=events[0];if(!isHighlightedAbility(e))return;
  const side=e.side||0,key=`${side}:${e.from}:${e.label}`,trait=e.abilityKind==='trait';
  const cue={key,events,side,trait,name:e.name,label:e.label,from:e.from,tick:e.tick,count:1,occurred:clock,start:clock,duration:3000,serial:++this.serial};
  const existing=[this.active[side],...this.waiting[side]].find(c=>c?.key===key);
  if(existing){existing.count++;existing.events=events;existing.tick=e.tick;existing.occurred=clock;existing.serial=++this.serial;return;}
  if(!this.active[side])this.active[side]=cue;
  else{this.waiting[side].push(cue);this.waiting[side]=this.waiting[side].slice(-4);}
 }
 advance(clock){
  for(const side of [0,1])if(this.active[side]&&clock-this.active[side].start>=this.active[side].duration){
   this.waiting[side]=this.waiting[side].filter(c=>clock-c.occurred<6000);
   this.active[side]=this.waiting[side].shift()||null;
   if(this.active[side])this.active[side].start=clock;
  }
  this.render();
 }
 render(){
  if(!this.root)return;
  const key=this.active.map(c=>c?.serial||0).join(':')+':'+this.waiting.map(q=>q.length).join(':');if(key===this.renderKey)return;this.renderKey=key;
  this.root.replaceChildren();
  for(const side of [0,1]){
   const cue=this.active[side],card=document.createElement('button');card.type='button';card.className=`ability-cue side-${side}${cue?' active':''}${cue?.count===1?' reveal':''}`;
   card.dataset.action='battle-panel';card.dataset.panel='events';
   if(!cue){card.disabled=true;card.textContent=(side?'敌军':'我军')+' · 等待发动';this.root.append(card);continue;}
   const portrait=document.createElement('span');portrait.className='ability-portrait';portrait.textContent=cue.name?.slice(0,1)||'将';
   const url=art.portraitURL(cue.from,'battle');
   if(url){const entry=art.resolvePortrait(cue.from,'battle');if(entry?.width>entry?.height*1.15)portrait.dataset.artShape='wide';const img=document.createElement('img');img.src=url;img.alt='';img.onload=()=>portrait.classList.add('loaded');img.onerror=()=>img.remove();portrait.append(img);}
   const body=document.createElement('span');body.className='ability-body';
   const owner=document.createElement('span');owner.className='ability-owner';owner.textContent=`${side?'敌军':'我军'} · ${cue.name}`;
   const title=document.createElement('strong');title.textContent=cue.label;
   const kind=document.createElement('span');kind.className='ability-kind';kind.textContent=(cue.trait?'特性':'战法')+(cue.count>1?' ×'+cue.count:'');
   const detail=document.createElement('span');detail.className='ability-detail';detail.textContent=outcomeLines(cue.events).join(' / ');
   const hint=document.createElement('span');hint.className='ability-hint';hint.textContent=`点击暂停查看${this.waiting[side].length?' · 另有'+this.waiting[side].length+'项':''}`;
   body.append(owner,title,kind,detail,hint);card.append(portrait,body);card.title=`${owner.textContent}「${cue.label}」\n${detail.textContent}`;card.setAttribute('aria-label',card.title+' · 暂停查看');this.root.append(card);
  }
 }
 draw(fx,cell){
  for(const cue of this.active.filter(Boolean)){
   if(fx.clock-cue.occurred>1500)continue;
   const source=cue.events[0],from=fx.point(source.fromX,source.fromY),color=cue.side?'#f1ac95':'#a5e6cf';
   fx.ring(from.x,from.y,cell*.48,color,2,.85);
   fx.label(`${cue.name} · ${cue.label}`,from.x,from.y+cell*.65,color,1,Math.max(10,Math.min(14,cell*.24)));
   for(const e of cue.events){if(e.to===e.from)continue;const to=fx.point(e.x,e.y);fx.ring(to.x,to.y,cell*.43,color,2,.8);if(!fx.reduced)fx.line(from.x,from.y,to.x,to.y,color,1,.35);}
  }
 }
}
