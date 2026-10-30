import {BattleTransitionReader} from './battle-transition-events.mjs';

const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const p=clamp(n);return p*p*(3-2*p);};
export const TRANSITION_DURATION=Object.freeze({rout:1150,retreat:1000,exit:850,entry:1100});

export function transitionFrame(e,clock,{reduced=false}={}){
 const p=clamp((clock-e.start)/e.duration),direction=e.side?1:-1;
 return {p,active:clock>=e.start&&clock<e.end,walking:!reduced&&['entry','exit'].includes(e.kind),
  offsetX:(reduced?0:e.kind==='entry'?direction*.95*(1-smooth(p)):e.kind==='exit'?direction*.9*smooth(p):0)||0,
  opacity:e.kind==='exit'?1-smooth((p-.55)/.45):e.kind==='entry'?.35+.65*smooth(p/.35):1,
  facing:['retreat','exit'].includes(e.kind)?direction:-direction};
}

export class BattleTransitions {
 constructor(){this.reader=new BattleTransitionReader();this.items=[];}
 reset(){this.reader.reset();this.items=[];}
 update(b,actions,clock,{silent=false,speed=1}={}){
  const freshBattle=this.reader.battle!==b||b.tick<this.reader.tick;
  const events=this.reader.read(b,{silent});
  if(silent||freshBattle)this.items=[];
  this.items=this.items.filter(e=>e.end>clock);
  for(const event of events){
   const fatal=event.kind==='rout'?actions.find(a=>a.events.some(e=>e.to===event.id&&e.defeated)):null;
   // The soldier falls at the crossing hit, even if another action ends later.
   const start=fatal?fatal.start+fatal.duration*.52:clock;
   const duration=TRANSITION_DURATION[event.kind]/Math.max(1,Math.sqrt(speed));
   this.items.push({...event,start,duration,end:start+duration});
  }
 }
 forUnit(id,clock){return this.items.findLast(e=>e.id===id&&clock>=e.start&&clock<e.end);}
 isPlaying(clock){return this.items.some(e=>e.end>clock);}
 draw(fx,cell){
  const c=fx.ctx;
  for(const e of this.items){
   const frame=transitionFrame(e,fx.clock,{reduced:fx.reduced});if(!frame.active)continue;
   const {p}=frame,fade=Math.min(1,(1-p)*4),direction=e.side?1:-1;
   const position=fx.unitPosition?.(e.id),point=position?{x:position.x*fx.width,y:position.y*fx.height}:fx.point(e.x,e.y);
   const x=point.x,y=point.y,color=e.kind==='rout'?'#efb08a':e.kind==='retreat'||e.kind==='exit'?'#e5cc92':e.side?'#e5ae96':'#abd7bc';
   c.save();
   if(!fx.reduced){
    // Ground dust breaks outward on defeat; marching dust trails moving feet.
    const count=e.kind==='rout'?10:6;
    for(let i=0;i<count;i++){
     const q=clamp((p-i*.025)/.8),spread=e.kind==='rout'?(i-count/2)*cell*.09*q:-frame.facing*cell*(.1+q*.48);
     c.globalAlpha=(1-q)*fade*.32;c.fillStyle=e.kind==='rout'?'#c1a083':'#c5b692';
     c.beginPath();c.ellipse(x+spread,y+cell*(.09+(i%3-1)*.065),cell*(.025+q*.08),cell*(.018+q*.035),0,0,Math.PI*2);c.fill();
    }
   }
   // A physical banner topples on defeat and points toward the actual exit.
   const flagX=x-cell*.32,flagY=y-cell*.08;
   c.save();c.translate(flagX,flagY);if(e.kind==='rout'&&!fx.reduced)c.rotate(direction*smooth(p/.7)*1.45);
   c.globalAlpha=fade;c.strokeStyle='#d8c7a1';c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo(0,-cell*.64);c.stroke();
   c.fillStyle=e.side?'#a35443':'#367d67';c.beginPath();c.moveTo(0,-cell*.64);c.lineTo(cell*.3,-cell*.57);c.lineTo(cell*.24,-cell*.4);c.lineTo(0,-cell*.44);c.closePath();c.fill();
   c.restore();
   if(e.kind!=='rout')for(let i=0;i<2;i++){
    const dx=e.kind==='entry'?-direction:direction,xx=x+dx*cell*(.3+i*.17),yy=y-cell*.3;
    fx.line(xx-dx*cell*.08,yy-cell*.08,xx,yy,color,2,fade);
    fx.line(xx,yy,xx-dx*cell*.08,yy+cell*.08,color,2,fade);
   }
   fx.label(e.kind==='rout'?'溃灭':e.kind==='entry'?'支援入场':e.kind==='exit'?'撤离':'撤退',x,y-cell*.86,color,fade,11);
   c.restore();
  }
 }
}
