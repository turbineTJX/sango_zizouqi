import {battleActionKind} from './battle-presentation.mjs';
import {troopBodyAnchors} from './battle-unit-motion.mjs';

const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const TAU=Math.PI*2;
const PALETTES={
 fire:['#ff9859','#ffe9aa'],control:['#c99bff','#f4dcff'],
 heal:['#65e9af','#e0ffe5'],support:['#73dfca','#efffd5'],shield:['#78d7f3','#e6fbff'],
 charge:['#e9ad56','#fff0b5'],volley:['#a6e8ca','#fff4d6'],strike:['#a4d8ef','#f4fbff'],
};

// Shared by sprite/model gestures and canvas effects. Impact remains at .52,
// the point used by health, status, casualty and sound presentation.
export function castFrame(progress){
 const p=clamp(progress);
 return {p,phase:p<.24?'windup':p<.52?'release':p<.8?'impact':'recover',
  windup:smooth(p/.24),flight:clamp((p-.24)/.28),impact:clamp((p-.52)/.48),
  fade:Math.min(1,p/.07,(1-p)/.2)};
}
export function castPose(progress,kind='strike'){
 const {p,windup}=castFrame(progress),release=smooth((p-.24)/.28),settle=1-smooth((p-.6)/.4);
 const magic=['heal','shield','support','control','fire'].includes(kind);
 return {reach:magic?-.045*windup*settle:(p<.24?-.09*windup:((kind==='charge'?.34:.23)*release-.09*(1-release))*settle),
  lift:magic?(.08*windup+.07*release)*settle:release*.025*settle,
  lean:magic?-.11*windup*settle:(p<.24?-.06*windup:(.17*release-.06*(1-release))*settle),
  squash:magic?0:Math.sin(windup*Math.PI)*.045};
}
export function actorCastProgress(progress,event){
 const p=clamp(progress),delay=event?.partnerIndex===undefined?0:Math.min(3,event.partnerIndex)*.045;
 return p<.52?clamp((p-delay)/(.52-delay))*.52:p;
}
export function castProjectile(from,to,flight,cell,kind='strike',lane=0){
 const t=smooth(flight),arc=kind==='volley'?.95:['heal','shield','support'].includes(kind)?.55:.32;
 const offset=Math.sin(t*Math.PI)*lane*cell*.11;
 return {x:from.x+(to.x-from.x)*t+offset,y:from.y+(to.y-from.y)*t-Math.sin(t*Math.PI)*cell*arc,
  angle:Math.atan2(to.y-from.y-Math.cos(t*Math.PI)*Math.PI*cell*arc,to.x-from.x+Math.cos(t*Math.PI)*lane*cell*.11),
  // A projectile carries a short tail. Never draw its travelled path.
  tail:cell*(kind==='volley'?.27:.2)};
}
export function castVisualEvents(events){
 const targets=new Map();
 for(const e of events){
  if(e.combo){targets.set('combo:'+e.from+':'+e.to,e);continue;}
  const key=[e.from,e.to,e.label,e.start].join(':');
  const old=targets.get(key);
  targets.set(key,old?{...old,damage:(old.damage||0)+(e.damage||0),healing:(old.healing||0)+(e.healing||0),critical:old.critical||e.critical,text:[old.text,e.text].filter(Boolean).join(' · '),outcome:old.outcome||e.outcome}:e);
 }
 return [...targets.values()];
}
export function castPalette(e){return PALETTES[e.presentationKind||battleActionKind(e)]||PALETTES.strike;}
export function unitCastAction(actions,id){
 for(const action of actions){
  const event=action.events.find(e=>e.from===id&&(e.militaryOrder||!e.ongoing&&e.damageKind!=='dot'&&!e.enchantment)&&(e.skill||e.damage>0||e.shieldAbsorbed>0||e.skill===false&&!e.abilityKind));
  if(event)return {action,event};
  const combo=action.events.find(e=>e.combo?.actors?.some(a=>a.id===id));
  if(combo)return {action,event:{...combo,from:id,skill:true,presentationKind:'support',partnerIndex:combo.combo.actors.findIndex(a=>a.id===id)}};
 }
 return null;
}

function ellipse(c,x,y,rx,ry,color,alpha,width=2,rotation=0,start=0,end=TAU,fill=false){
 c.globalAlpha=Math.max(0,alpha);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=width;
 c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rotation,start,end);fill?c.fill():c.stroke();
}
function streak(c,x,y,angle,length,color,alpha,width=2){
 c.globalAlpha=Math.max(0,alpha);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';
 c.beginPath();c.moveTo(x-Math.cos(angle)*length,y-Math.sin(angle)*length);c.lineTo(x,y);c.stroke();
}
function diamond(c,x,y,size,color,alpha,rotation=0){
 c.save();c.translate(x,y);c.rotate(rotation);c.globalAlpha=Math.max(0,alpha);c.fillStyle=color;
 c.beginPath();c.moveTo(0,-size);c.lineTo(size*.55,0);c.lineTo(0,size);c.lineTo(-size*.55,0);c.closePath();c.fill();c.restore();
}
export function drawProjectile(fx,point,kind,cell,color,light,phase=0){
 const c=fx.ctx,p=point;c.save();c.shadowColor=color;c.shadowBlur=cell*.14;
 streak(c,p.x,p.y,p.angle,p.tail,color,.75,kind==='volley'?4:7);
 streak(c,p.x,p.y,p.angle,p.tail*.8,light,1,kind==='volley'?1.8:2.5);
 if(kind==='volley'){
  streak(c,p.x,p.y,p.angle-.5,cell*.12,light,1,2);streak(c,p.x,p.y,p.angle+.5,cell*.12,light,1,2);
 }else{
  fx.glow(p.x,p.y,cell*.27,color,.7);
  if(kind==='control'){
   diamond(c,p.x,p.y,cell*.16,light,1,phase*9);ellipse(c,p.x,p.y,cell*.22,cell*.12,color,.8,1.5,phase*5);
  }else if(kind==='fire'){
   ellipse(c,p.x,p.y,cell*.15,cell*.105,color,1,1,p.angle,0,TAU,true);ellipse(c,p.x,p.y,cell*.085,cell*.065,light,1,1,p.angle,0,TAU,true);
  }else if(['heal','support','shield'].includes(kind))diamond(c,p.x,p.y,cell*.14,light,1,p.angle);
  else ellipse(c,p.x,p.y,cell*.19,cell*.07,light,1,3,p.angle);
 }
 c.restore();
}

export function drawCastSource(fx,e,progress,from,cell){
 const f=castFrame(progress);if(f.p>=.52||fx.reduced)return;
 const [color]=castPalette(e),anchors=troopBodyAnchors(fx,e.from,from,cell,e.troop);
 // A small glint stays on the weapon; the soldier supplies the movement.
 for(const b of anchors.slice(0,3)){
  const x=b.x+b.size*.2,y=b.y-b.size*.5;
  streak(fx.ctx,x,y,-1.1,b.size*.12,color,f.fade*f.windup*.35,1.2);
 }
}
export function drawCastTarget(fx,e,progress,from,to,cell){
 const c=fx.ctx,f=castFrame(progress),kind=e.presentationKind||battleActionKind(e),[color,light]=castPalette(e);
 const hit={x:to.x,y:to.y-cell*.12},remote=Math.hypot(to.x-from.x,to.y-from.y)>cell*.85;
 c.save();
 if(f.phase==='release'&&!fx.reduced&&e.from!==e.to&&['volley','fire','strike'].includes(kind)&&(remote||kind!=='strike')){
  const count=kind==='volley'?3:1;
  for(let i=0;i<count;i++){
   const q=clamp(f.flight-i*.05*(1-f.flight));if(q<=0||q>=1)continue;
   drawProjectile(fx,castProjectile({x:from.x,y:from.y-cell*.25},hit,q,cell,kind,i-(count-1)/2),kind,cell,color,light,f.p);
  }
 }
 if(kind==='charge'&&f.phase==='release'&&!fx.reduced){
  const t=smooth(f.flight),x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t,angle=Math.atan2(to.y-from.y,to.x-from.x);
  for(let i=0;i<3;i++)streak(c,x-Math.cos(angle)*cell*.08*i,y-Math.sin(angle)*cell*.08*i+cell*.06,angle,cell*.14,'#ae9c79',.3,2.5);
 }
 if(f.p<.52){c.restore();return;}
 const q=f.impact,fade=f.fade*(1-q),failed=e.resolution&&!e.resolution.success||/免疫|未命中|未生效|无效|未触发|未成功/.test(e.text||'');
 const anchors=troopBodyAnchors(fx,e.to,to,cell);
 if(failed){for(const b of anchors.slice(0,2))streak(c,b.x,b.y-b.size*.4,-.7,b.size*.12,color,fade*.35,1);c.restore();return;}
 if(['heal','support','shield','control'].includes(kind)){
  for(const b of anchors){
   const x=b.x+b.size*.12,y=b.y-b.size*(.3+(fx.reduced?0:q*.2));
   streak(c,x,y,kind==='control'?.6:-1.15,b.size*.13,color,fade*.45,1.4);
  }
 }else if(kind==='fire'){
  for(const b of anchors.slice(0,4)){
   const x=b.x,y=b.y,h=b.size*.4*Math.sin(q*Math.PI);
   c.globalAlpha=fade*.55;c.fillStyle=color;c.beginPath();c.moveTo(x-b.size*.08,y);c.quadraticCurveTo(x-b.size*.14,y-h*.5,x,y-h);c.quadraticCurveTo(x+b.size*.16,y-h*.3,x+b.size*.08,y);c.fill();
  }
 }else{
  if(kind==='volley')for(const b of anchors.slice(0,3))streak(c,b.x,b.y,-1.1,b.size*.25,'#c8bea2',fade,1.5);
  else{
   const x=hit.x,y=hit.y;c.globalAlpha=fade;c.strokeStyle=light;c.lineWidth=2;
   c.beginPath();c.moveTo(x-cell*.15,y-cell*.15);c.quadraticCurveTo(x+cell*.02,y-cell*.04,x+cell*.17,y+cell*.1);c.stroke();
  }
  if(q<.32&&!fx.reduced)fx.particles(hit.x,hit.y,clamp(q*3),light,(e.x||0)+(e.y||0),e.cinematic?4:2,cell*.24);
 }
 c.restore();
}
