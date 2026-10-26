import {art} from './art-assets.mjs';
import {troopBodyAnchors} from './battle-unit-motion.mjs';

const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>1-(1-clamp(n))**3;
const TAU=Math.PI*2;
const FONT='"STKaiti","KaiTi","Noto Serif SC",serif';

// The portrait clears before the shared .52 impact. All movement uses the
// presentation clock, so pausing or changing speed cannot skip the reveal.
export function cinematicFrame(progress){
 const p=clamp(progress);
 return {p,enter:ease(p/.12),leave:ease((p-.34)/.16),
  banner:clamp(p/.055)*clamp((.51-p)/.12),
  shade:clamp(p/.08)*clamp((.55-p)/.2),
  impact:clamp((p-.52)/.48)};
}
export function cinematicViewport(fx){
 const stage=fx.canvas.parentElement?.parentElement;
 return {width:Math.min(fx.width,stage?.clientWidth||fx.width),left:stage?.scrollLeft||0,height:fx.height};
}
export function orderVisualKind(key){
 return ({fortify:'shield',invincible:'shield',ward:'shield','cao-wuchao':'shield',
  heal:'heal',cleanse:'cleanse','zhou-redcliffs':'fire',storm:'storm','zhuge-eight':'formation',
  disrupt:'control',blockade:'control',ambush:'stealth',swift:'haste',reinforce:'rally',refresh:'rally'})[key]||'rally';
}

export function drawBattleAtmosphere(fx,p,color){
 if(fx.reduced||fx.mode==='clear')return;
 const c=fx.ctx,f=cinematicFrame(p),v=cinematicViewport(fx);
 c.save();
 const shade=c.createLinearGradient(0,0,0,v.height);
 shade.addColorStop(0,'#030b13');shade.addColorStop(.5,'#061218');shade.addColorStop(1,'#030a12');
 c.globalAlpha=f.shade*.42;c.fillStyle=shade;c.fillRect(v.left,0,v.width,v.height);
 // Brief, soft light at the actual impact; no full-screen white flash.
 const pulse=Math.max(0,1-Math.abs(p-.54)/.055);
 c.globalAlpha=pulse*.08;c.fillStyle=color;c.fillRect(v.left,0,v.width,v.height);
 c.restore();
}

export function drawFeaturedBanner(fx,{id,name,title,side=0,kind='战法',subtitle='',color='#ffe0a0',accent='#c59a55'},progress){
 if(fx.reduced||fx.mode==='clear')return;
 const f=cinematicFrame(progress);if(f.banner<=0)return;
 const c=fx.ctx,v=cinematicViewport(fx),w=v.width,h=Math.min(v.height*.3,w<500?112:144);
 const top=v.height*.17-f.leave*v.height*.1,shift=(1-f.enter)*w*.14-f.leave*w*.04;
 const entry=art.resolvePortrait(id,'battle'),portrait=art.image(entry?.url),view=entry?.view;
 const artW=w*.43,cut=w*.49;
 c.save();c.translate(v.left+shift,top);c.globalAlpha=f.banner;
 const bg=c.createLinearGradient(0,0,w,0);
 bg.addColorStop(0,side?'#491c27':'#153b41');bg.addColorStop(.53,'#0a1b25');bg.addColorStop(1,'#08151aee');
 c.fillStyle=bg;c.beginPath();
 c.moveTo(0,h*.08);c.lineTo(w*.29,0);c.lineTo(w,h*.05);c.lineTo(w,h*.88);c.lineTo(w*.67,h);c.lineTo(0,h*.94);c.closePath();c.fill();
 // Irregular ink edges and fine gold strokes use deterministic geometry.
 for(let i=0;i<17;i++){
  c.globalAlpha=f.banner*(i%3===0?.35:.14);c.strokeStyle=i%3===0?accent:color;c.lineWidth=i%3===0?2:1;
  const y=h*(.08+i*.052),dx=fx.reduced?0:f.enter*16;
  c.beginPath();c.moveTo(w*.37+Math.sin(i*3)*17,y);c.lineTo(w-dx,y-h*.09);c.stroke();
 }
 c.globalAlpha=f.banner;c.save();c.beginPath();
 c.moveTo(0,0);c.lineTo(cut,0);c.lineTo(artW,h);c.lineTo(0,h);c.closePath();c.clip();
 if(portrait&&view){
  const [x,y,cw,ch]=view.crop,sw=portrait.width*cw,sh=portrait.height*ch;
  const wide=view.width>view.height*1.15;
  const scale=(wide?Math.min:Math.max)(cut/sw,h/sh)*(1+(1-f.enter)*.08),iw=sw*scale,ih=sh*scale;
  c.drawImage(portrait,portrait.width*x,portrait.height*y,sw,sh,(cut-iw)/2,(h-ih)/2,iw,ih);
 }else{
  c.fillStyle=side?'#622b32':'#29585a';c.fillRect(0,0,cut,h);
  c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font=`bold ${h*.56}px ${FONT}`;
  c.fillText((name||'军令').slice(0,1),artW*.5,h*.5);
 }
 c.restore();
 const shade=c.createLinearGradient(artW*.65,0,cut+20,0);
 shade.addColorStop(0,'#08182000');shade.addColorStop(1,'#081820');c.fillStyle=shade;c.fillRect(artW*.65,0,cut+20-artW*.65,h);
 c.strokeStyle=accent;c.lineWidth=1.5;
 c.beginPath();c.moveTo(0,h*.08);c.lineTo(w*.29,0);c.lineTo(w,h*.05);c.moveTo(0,h*.94);c.lineTo(w*.67,h);c.lineTo(w,h*.88);c.stroke();
 const textX=w*.7,textW=w*.52;
 c.textAlign='center';c.textBaseline='middle';
 c.font=`${Math.max(10,Math.min(12,w*.023))}px "Microsoft YaHei",sans-serif`;c.fillStyle='#ded4b9';
 c.fillText(`${side?'敌军':'我军'} · ${name||'军令'}`,textX,h*.22,textW);
 c.font=`bold ${Math.min(w<500?22:30,textW/Math.max(1,title.length))}px ${FONT}`;
 c.fillStyle=color;c.shadowColor='#000';c.shadowBlur=8;c.shadowOffsetY=3;
 c.fillText(title,textX,h*.52,textW);c.shadowBlur=0;c.shadowOffsetY=0;
 c.font=`${Math.max(9,Math.min(11,w*.025))}px ${FONT}`;c.fillStyle='#cbb88a';
 c.fillText(subtitle||kind,textX,h*.79,textW);
 // Vermilion seal distinguishes a military order from an officer's tactic.
 const seal=Math.min(23,h*.2),sx=w-seal-11,sy=h*.13;
 c.fillStyle='#903f31';c.fillRect(sx,sy,seal,seal);c.strokeStyle='#d79a6b';c.lineWidth=1;c.strokeRect(sx+3,sy+3,seal-6,seal-6);
 c.fillStyle='#ffe6bb';c.font=`${seal*.52}px ${FONT}`;c.fillText(kind[0],sx+seal/2,sy+seal*.53);
 c.restore();
}

// Only recorded areas, strike points and visible recipients are passed here.
// These are announcing effects, not an alternative simulation of the order.
export function drawOrderField(fx,e,cell,p,color,accent){
 if(p<.52)return;
 const c=fx.ctx,q=clamp((p-.52)/.48),fade=Math.min(1,(1-p)*5);
 c.save();
 // Formation ground marks belong to the recorded emplacement, not every troop.
 if(e.key==='zhuge-eight'&&e.point){
  const pos=fx.point(e.point.x,e.point.y),r=cell*(e.scope?.radius||2);
  for(let i=0;i<8;i++){const a=i*TAU/8;fx.line(pos.x+Math.cos(a)*r*.78,pos.y+Math.sin(a)*r*.78,pos.x+Math.cos(a)*r*.92,pos.y+Math.sin(a)*r*.92,'#b7a989',2,fade*.3);}
 }
 for(const [i,strike]of (e.strikes||[]).entries()){
  const t=clamp((q-i*.025)/.68);if(t<=0||t>=1)continue;
  const pos=fx.point(strike.point.x,strike.point.y),a=Math.sin(t*Math.PI);
  c.globalAlpha=a*.7;c.strokeStyle='#d4dce0';c.lineWidth=2;
  c.beginPath();c.moveTo(pos.x-cell*.15,pos.y-cell*1.9);c.lineTo(pos.x+cell*.12,pos.y-cell*1.1);c.lineTo(pos.x-cell*.17,pos.y-cell*.65);c.lineTo(pos.x,pos.y);c.stroke();
  if(t<.5)fx.glow(pos.x,pos.y-cell*.15,cell*.28,'#d8b084',a*.2);
 }
 if(e.key==='heal')for(const target of e.targets.filter(t=>t.healing>0)){
  const pos=fx.point(target.x,target.y);
  for(const b of troopBodyAnchors(fx,target.id,pos,cell))fx.line(b.x-b.size*.08,b.y-b.size*(.2+q*.4),b.x+b.size*.02,b.y-b.size*(.3+q*.4),'#b8cfa8',1.5,fade*.6);
 }
 // Persistent protection, fire and control come from each body's actual state.
 c.restore();
}
