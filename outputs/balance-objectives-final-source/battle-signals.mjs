import {hexCenter} from './hex-grid.mjs';
import {inspectionStatuses} from './status-display.mjs';
import {STRATAGEMS} from './engine.mjs';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const THEMES={offense:['#ffdc80','#dc9a3f'],support:['#9cebcf','#45baaa'],control:['#e9b4ff','#ae69d3']};
const GLYPHS={formationAura:'协',stun:'晕',confuse:'乱',burn:'焚',scorch:'火',plague:'疫',seal:'禁',taunt:'嘲',slow:'缓',armorBreak:'破',blight:'衰',weaken:'弱',curse:'咒',shaken:'震',shield:'盾',resolve:'定',phalanx:'阵',ward:'御',illusion:'幻',regrowth:'愈',phase:'遁',pursuit:'追',bulwark:'壁',riposte:'反',camp:'垒',nexus:'枢',anchored:'锚',emplaced:'架',burningAttack:'焰',attackOrb:'刃',strategyAttack:'谋',haste:'速',valor:'攻',hunger:'粮',assaultUntil:'攻',fortifyUntil:'防',disruptUntil:'弱',hasteUntil:'速',rangeUntil:'射',recoveryUntil:'愈'};
const TONES={control:'#e5b2ff',damage:'#ffb078',debuff:'#ffa5ab',buff:'#a2ecd2'};
const rank=s=>s.priority??(s.tone==='debuff'?10:22);
export function battlefieldStatuses(b,u){
 return inspectionStatuses(b,u).filter(s=>s.tone!=='neutral'&&!['blockadeUntil','reliefUntil'].includes(s.key)&&(s.key!=='rangeUntil'||['archer','crossbow'].includes(u.type))).sort((a,b)=>rank(a)-rank(b));
}
// A separate presentation channel: military orders never enter the tactic queue.
export class BattleSignals {
 constructor(){this.id=null;this.units=[];this.orders=[];this.serials=[0,0];}
 update(b,clock){
  const fresh=this.id!==b.id;
  if(fresh){this.id=b.id;this.orders=[];this.serials=[b.commandSerial||0,b.enemyCommand?.commandSerial||0];}
  this.units=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active').map(u=>({id:u.id,x:u.x,y:u.y,side:u.side,type:u.type,statuses:battlefieldStatuses(b,u)}));
  for(const side of [0,1]){
   const resource=side?b.enemyCommand:b,last=resource?.lastCommand,serial=resource?.commandSerial||0;
   if(!fresh&&last&&serial!==this.serials[side]&&STRATAGEMS[last.key]){
    const definition=STRATAGEMS[last.key],targetSide=definition.side===0?side:1-side;
    const targets=this.units.filter(u=>u.side===targetSide&&(last.key!=='range'||['archer','crossbow'].includes(u.type))).map(u=>({id:u.id,x:u.x,y:u.y}));
    this.orders.push({key:last.key,side,targetSide,name:definition.name,group:definition.group,targets,start:clock,duration:1800,serial});
   }
   this.serials[side]=serial;
  }
  this.orders=this.orders.slice(-4);
 }
 draw(fx,cell){
  this.orders=this.orders.filter(e=>fx.clock-e.start<e.duration);
  const c=fx.ctx,t=fx.reduced?0:fx.clock/1000;
  for(const u of this.units){
   if(!u.statuses.length)continue;
   const visual=fx.unitPosition?.(u.id),point=visual?{x:visual.x*fx.width,y:visual.y*fx.height}:fx.point(u.x,u.y);
   this.drawUnit(fx,u,point,cell,t);
  }
  c.globalAlpha=1;
 }
 drawOrders(fx,cell){for(const order of this.orders)this.drawOrder(fx,order,cell);}
 drawUnit(fx,u,p,cell,t){
  const c=fx.ctx,keys=new Set(u.statuses.map(s=>s.key)),has=(...ids)=>ids.some(id=>keys.has(id));
  const x=p.x,y=p.y,top=Math.max(22,y-cell*.65),r=cell*.4;
  if(fx.mode==='clear'||fx.reduced){
   const urgent=u.statuses.find(s=>['stun','confuse','seal','burn','scorch'].includes(s.key));
   if(urgent){
    c.save();c.font='bold 11px "Microsoft YaHei",sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.fillStyle='#172321';c.fillRect(x-10,top-9,20,18);c.fillStyle=TONES[urgent.tone]||'#efd29e';c.fillText(GLYPHS[urgent.key],x,top);c.restore();
   }
   return;
  }
  c.save();c.lineWidth=2;
  // Protective shell stays on the body; damage and control remain visible above it.
  if(has('shield','ward','resolve','phalanx','bulwark','fortifyUntil','illusion','camp')){
   c.fillStyle='#72cfff16';c.strokeStyle='#a5e9ff';c.globalAlpha=.6+(fx.reduced?0:Math.sin(t*2)*.12);
   c.beginPath();c.ellipse(x,y-cell*.22,cell*.43,cell*.5,0,0,Math.PI*2);c.fill();c.stroke();
   for(const dir of [-1,1]){c.beginPath();c.moveTo(x+dir*r*.85,y-cell*.45);c.lineTo(x+dir*r*.85,y-cell*.05);c.stroke();}
  }
  if(has('burn','scorch')){
   c.globalAlpha=.85;
   for(let i=0;i<5;i++){
    const ox=(i-2)*cell*.16,h=cell*(.22+(Math.sin(t*7+i*2)+1)*.08);
    c.fillStyle=i%2?'#ffd47a':'#ff793f';c.beginPath();c.moveTo(x+ox-cell*.06,y+cell*.08);c.quadraticCurveTo(x+ox-cell*.1,y-h*.5,x+ox+Math.sin(t*5+i)*cell*.04,y-h);c.quadraticCurveTo(x+ox+cell*.13,y-h*.3,x+ox+cell*.06,y+cell*.08);c.fill();
   }
  }
  if(has('plague','blight','curse','weaken','disruptUntil','armorBreak','slow','shaken','hunger')){
   c.globalAlpha=.75;c.strokeStyle=has('plague','blight')?'#c2d16b':'#d991ce';
   c.setLineDash([4,4]);c.beginPath();c.ellipse(x,y+cell*.1,cell*.47,cell*.19,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
   for(let i=0;i<3;i++){const ox=(i-1)*cell*.26,yy=y+cell*.14+((t*.5+i*.3)%1)*cell*.16;c.beginPath();c.moveTo(x+ox-cell*.045,yy-cell*.08);c.lineTo(x+ox,yy);c.lineTo(x+ox+cell*.045,yy-cell*.08);c.stroke();}
  }
  if(has('regrowth','recoveryUntil')){
   c.strokeStyle='#8affb8';c.lineWidth=2.5;c.globalAlpha=.85;
   for(let i=0;i<3;i++){const yy=y-cell*((t*.5+i*.3)%1)*.7,xx=x+(i-1)*cell*.28;c.beginPath();c.moveTo(xx-4,yy);c.lineTo(xx+4,yy);c.moveTo(xx,yy-4);c.lineTo(xx,yy+4);c.stroke();}
  }
  if(has('valor','assaultUntil','haste','hasteUntil','pursuit','attackOrb','strategyAttack','burningAttack','rangeUntil','phase','nexus','riposte')){
   const color=has('valor','assaultUntil','attackOrb','burningAttack')?'#ffdc81':'#99eddd';c.strokeStyle=color;c.globalAlpha=.7;
   c.beginPath();c.ellipse(x,y+cell*.06,cell*.42,cell*.15,0,0,Math.PI*2);c.stroke();
   for(let i=0;i<2;i++){const xx=x+(i?1:-1)*cell*.43,yy=y-cell*.08-((t*.6+i*.5)%1)*cell*.26;c.beginPath();c.moveTo(xx-3,yy+4);c.lineTo(xx,yy);c.lineTo(xx+3,yy+4);c.stroke();}
  }
  if(has('stun')){
   c.strokeStyle='#ffe6a2';c.globalAlpha=.6;c.beginPath();c.ellipse(x,top,cell*.3,cell*.09,0,0,Math.PI*2);c.stroke();
   for(let i=0;i<3;i++){const a=t*3+i*Math.PI*2/3;star(c,x+Math.cos(a)*cell*.3,top+Math.sin(a)*cell*.09,clamp(cell*.07,4,8),'#ffe488');}
  }else if(has('confuse')){
   c.strokeStyle='#dfa7ff';c.globalAlpha=.95;c.lineWidth=2.5;c.beginPath();
   for(let i=0;i<=42;i++){const a=i*.25+t*2,rr=cell*.24*i/42,xx=x+Math.cos(a)*rr,yy=top+Math.sin(a)*rr*.45;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.stroke();
  }
  if(has('seal')){c.strokeStyle='#e7b5ff';c.globalAlpha=.9;c.lineWidth=2.5;c.strokeRect(x-cell*.13,top-cell*.12,cell*.26,cell*.25);c.beginPath();c.arc(x,top-cell*.12,cell*.09,Math.PI,0);c.stroke();}
  // Stable, high-contrast symbols for every positive/negative category. Full
  // names, timers and sources remain available on the existing unit inspection.
  const size=clamp(cell*.2,13,21),shown=u.statuses.slice(0,cell<60?2:3),extra=u.statuses.length-shown.length;
  const count=shown.length+(extra?1:0),left=clamp(x+cell*.4,1,fx.width-size-2);
  const badgeY=clamp(y-cell*.56,2,fx.height-count*(size+2)-2);
  for(let i=0;i<count;i++){
   const s=shown[i],xx=left,yy=badgeY+i*(size+2),color=s?(TONES[s.tone]||'#d3dfd9'):'#d3dfd9';c.globalAlpha=.97;c.fillStyle='#0b1824';c.strokeStyle=color;c.lineWidth=1.5;c.fillRect(xx,yy,size,size);c.strokeRect(xx,yy,size,size);
   c.font=`bold ${Math.max(10,size*.67)}px "Microsoft YaHei",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(s?(GLYPHS[s.key]||s.name?.[0]||'益'):'+'+extra,xx+size/2,yy+size/2);
  }
  c.restore();
 }
 drawOrder(fx,e,cell){
  const c=fx.ctx,p=clamp((fx.clock-e.start)/e.duration),fade=Math.min(1,(1-p)*4),[color,accent]=THEMES[e.group],stage=fx.canvas.parentElement?.parentElement;
  const width=Math.min(fx.width,stage?.clientWidth||fx.width),offset=stage?.scrollLeft||0;
  c.save();
  // Expanding polygonal military formation, rather than a character cut-in.
  const edge=e.side?fx.width-4:4,travel=fx.reduced?.5:p;
  if(!fx.reduced){
   const sweep=edge+(e.side?-1:1)*fx.width*travel;c.globalAlpha=fade*.2;c.fillStyle=accent;c.fillRect(sweep-25,0,50,fx.height);
   fx.line(sweep,0,sweep,fx.height,color,2,fade*.55);
  }
  for(const target of e.targets){
   const v=fx.unitPosition?.(target.id),pos=v?{x:v.x*fx.width,y:v.y*fx.height}:fx.point(target.x,target.y);
   const radius=cell*(.46+(fx.reduced?0:p*.45));c.globalAlpha=fade*.8;c.strokeStyle=color;c.lineWidth=2;c.beginPath();
   for(let i=0;i<6;i++){const a=Math.PI/3*i,xx=pos.x+Math.cos(a)*radius,yy=pos.y+Math.sin(a)*radius*.48;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.closePath();c.stroke();
   if(e.key==='firestorm')fx.glow(pos.x,pos.y,cell*.8,'#ff773f',fade*.3);
   else fx.glow(pos.x,pos.y,cell*.65,accent,fade*.16);
   if(!fx.reduced){for(let i=0;i<3;i++){const xx=pos.x+(i-1)*cell*.2,yy=pos.y-cell*.6*p;fx.line(xx,yy,xx,yy+cell*.18,color,2,fade*.65);}}
  }
  // A compact command flag remains visible even when issued during pause.
  const bandW=Math.min(width-16,420),bandH=58,left=offset+(width-bandW)/2,top=e.side?72:8;
  c.globalAlpha=fade;c.fillStyle=e.side?'#382333f5':'#132e34f5';c.beginPath();c.moveTo(left,top);c.lineTo(left+bandW,top);c.lineTo(left+bandW-12,top+bandH);c.lineTo(left,top+bandH);c.closePath();c.fill();
  c.strokeStyle=color;c.lineWidth=2;c.stroke();c.fillStyle=accent;c.fillRect(left,top,5,bandH);
  c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.font='bold 18px "Microsoft YaHei",sans-serif';c.fillText('令',left+28,top+29);
  c.textAlign='left';c.font='11px "Microsoft YaHei",sans-serif';c.fillText(`${e.side?'敌军':'我军'}军略 · ${e.group==='control'?'扰乱敌阵':e.group==='offense'?'全军进击':'军阵援护'}`,left+52,top+16);
  c.font=`bold ${Math.min(22,bandW*.062)}px "Microsoft YaHei",sans-serif`;c.fillStyle='#fff0c8';c.fillText(e.name,left+52,top+39);
  c.restore();
 }
}
function star(c,x,y,r,color){c.globalAlpha=1;c.fillStyle=color;c.strokeStyle='#523759';c.lineWidth=1;c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;i?c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fill();c.stroke();}
