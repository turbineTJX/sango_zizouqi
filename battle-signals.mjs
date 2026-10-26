import {hidden} from './battle-status-rules.mjs';
import {hexCenter} from './hex-grid.mjs';
import {inspectionStatuses} from './status-display.mjs';
import {isAreaStratagem,stratagemAreaContains} from './stratagem-area.mjs';
import {STRATAGEMS} from './engine.mjs';
import {drawTroopStatuses} from './battle-unit-motion.mjs';
import {drawFeaturedBanner,drawBattleAtmosphere,drawOrderField} from './battle-cinematic.mjs';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const THEMES={offense:['#ffdc80','#dc9a3f'],support:['#9cebcf','#45baaa'],control:['#e9b4ff','#ae69d3']};
const rank=s=>s.priority??(s.tone==='debuff'?10:22);
export function battlefieldStatuses(b,u){
 return inspectionStatuses(b,u).filter(s=>s.tone!=='neutral'&&!['blockadeUntil'].includes(s.key)).sort((a,b)=>rank(a)-rank(b));
}
// A separate presentation channel: military orders never enter the tactic queue.
export class BattleSignals {
 constructor(){this.id=null;this.units=[];this.orders=[];this.serials=[0,0];this.intentSignals=[];this.effectBatch=null;this.effectCount=0;}
 update(b,clock){
  const fresh=this.id!==b.id;
  if(fresh){this.id=b.id;this.orders=[];this.intentSignals=[];this.effectBatch=null;this.effectCount=0;this.serials=[b.commandSerial||0,b.enemyCommand?.commandSerial||0];}
  const batch=b.id+':'+b.tick;if(batch!==this.effectBatch){this.effectBatch=batch;this.effectCount=0;}
  for(const e of (b.effects||[]).slice(this.effectCount)){if(e.intentDrained>0||e.intentDenied>0){const u=b.sides.flatMap(s=>s.units).find(u=>u.id===e.to);if(!u||u.status==='active')this.intentSignals.push({id:e.to,x:e.x,y:e.y,denied:!!e.intentDenied,start:clock});}}
  this.effectCount=(b.effects||[]).length;this.intentSignals=this.intentSignals.slice(-24);
  this.units=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'&&(u.side===0||!hidden(b,u))).map(u=>({id:u.id,x:u.x,y:u.y,side:u.side,type:u.type,statuses:battlefieldStatuses(b,u)}));
  for(const side of [0,1]){
   const resource=side?b.enemyCommand:b,last=resource?.lastCommand,serial=resource?.commandSerial||0;
   if(!fresh&&last&&serial!==this.serials[side]&&STRATAGEMS[last.key]){
    const definition=STRATAGEMS[last.key],targetSide=definition.side===2?2:definition.side===0?side:1-side;
    const event=b.sides[side].stratagemEvents?.find(e=>e.key===last.key&&e.castTick===last.tick),ids=event?.key==='reinforce'?event.units:event?.key==='storm'?event.strikes.flatMap(s=>s.hits.map(h=>h.id)):null;
    const targets=this.units.filter(u=>(targetSide===2||u.side===targetSide)&&(!ids||ids.includes(u.id))&&(!isAreaStratagem(definition)||stratagemAreaContains(definition,last.target,u))).map(u=>({id:u.id,x:u.x,y:u.y}));
    const source=last.source&&b.sides[side].units.find(u=>u.id===last.source.id);
    const visibleSource=source&&(side===0||!hidden(b,source))?{id:last.source.id,name:last.source.name}:null;
    this.orders.push({key:last.key,side,targetSide,name:definition.name,group:definition.group,targets,
     source:visibleSource,scope:definition.scope?{...definition.scope}:null,point:last.target?{...last.target}:null,
     strikes:event?.key==='storm'?event.strikes.map(s=>({point:{...s.point}})):[],
     start:clock,duration:1800,serial});
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
  this.intentSignals=this.intentSignals.filter(e=>fx.clock-e.start<1100);
  if(!fx.paused)for(const e of this.intentSignals){const p=fx.point(e.x,e.y),age=(fx.clock-e.start)/1100,y=p.y+cell*.42+age*cell*.12;c.save();c.strokeStyle='#62b5ff';c.lineWidth=2;c.globalAlpha=1-age;
   for(const offset of [-5,2]){c.beginPath();c.moveTo(p.x-5,y+offset);c.lineTo(p.x,y+offset+4);c.lineTo(p.x+5,y+offset);c.stroke();}
   if(fx.focusedUnit===e.id)fx.label(e.denied?'战意获取受阻':'战意削减',p.x,y+14,'#80b2c7',1-age,10);c.restore();}
  c.globalAlpha=1;
 }
 drawOrders(fx,cell){for(const order of this.orders)this.drawOrder(fx,order,cell);}
 drawUnit(fx,u,p,cell,t){drawTroopStatuses(fx,u,p,cell,t);}

 drawOrder(fx,e,cell){
  if(fx.clock<e.start)return;
  const c=fx.ctx,p=clamp((fx.clock-e.start)/e.duration),fade=Math.min(1,(1-p)*4),[color,accent]=THEMES[e.group]||THEMES.support,stage=fx.canvas.parentElement?.parentElement;
  const width=Math.min(fx.width,stage?.clientWidth||fx.width),offset=stage?.scrollLeft||0;
  if(fx.mode==='full'&&!fx.reduced){
   drawBattleAtmosphere(fx,p,color);
   drawOrderField(fx,e,cell,p,color,accent);
   drawFeaturedBanner(fx,{id:e.source?.id,name:e.source?.name,title:e.name,side:e.side,kind:'军略',subtitle:'军 略 发 动',color,accent},p);
   if(p>=.51){
    c.save();c.globalAlpha=fade;c.fillStyle=e.side?'#382333ee':'#132e34ee';c.fillRect(offset,4,width,36);
    fx.label(`${e.side?'敌军':'我军'}军略 · ${e.source?.name?e.source.name+' · ':''}${e.name}`,offset+width/2,22,color,fade,Math.min(18,width*.044));c.restore();
   }
   return;
  }
  c.save();
  // A compact command flag remains visible even when issued during pause.
  const bandW=Math.min(width-16,320),bandH=44,left=offset+(width-bandW)/2,top=8;
  c.globalAlpha=fade;c.fillStyle=e.side?'#382333f5':'#132e34f5';c.beginPath();c.moveTo(left,top);c.lineTo(left+bandW,top);c.lineTo(left+bandW-12,top+bandH);c.lineTo(left,top+bandH);c.closePath();c.fill();
  c.strokeStyle=color;c.lineWidth=2;c.stroke();c.fillStyle=accent;c.fillRect(left,top,5,bandH);
  c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.font='14px "Microsoft YaHei",sans-serif';c.fillText('令',left+22,top+22);
  c.textAlign='left';c.font='10px "Microsoft YaHei",sans-serif';c.fillText(`${e.side?'敌军':'我军'}军略`,left+42,top+12);
  c.font='14px "Microsoft YaHei",sans-serif';c.fillStyle='#e3d4b5';c.fillText(e.name,left+42,top+30);
  c.restore();
 }
}
