import {combatType,combatFamily} from './troop-equipment.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {hidden} from './battle-status-rules.mjs';
import {art} from './art-assets.mjs';
import {hexCenter} from './hex-grid.mjs';
import {unitSpriteClips,unitModelKey} from './unit-appearance.mjs';
import {castFrame,castPose,unitCastAction,actorCastProgress} from './battle-cast-animation.mjs';
import {unitStatusMotion,troopFormation,troopAttackFrame,casualtyFrame} from './battle-unit-motion.mjs';
import {presentationStyle} from './presentation-style.mjs';
import {transitionFrame} from './battle-transitions.mjs';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=t=>t*t*(3-2*t);
const ranged=type=>TROOP_DESIGNS[type]?.range>1;
// All animation state lives here; positions, hits and casualties remain engine-owned.
export function attackPose(progress,type){
 const p=clamp(progress),pose=castPose(p,type==='cavalry'?'charge':'strike');
 return {reach:ranged(type)?-Math.sin(p*Math.PI)*.045:pose.reach,recoil:Math.sin(clamp((p-.52)/.32)*Math.PI)*.08};
}
export function facingRow(dx,dy,side=0){
 if(Math.abs(dx)+Math.abs(dy)<.0001)return side?1:3;
 // The source atlas has NW, SW, SE, NE views, in that order.
 return dx<0?(dy<0?0:1):(dy>0?2:3);
}
export class BattleArt {
 constructor(board,fx=null){
  this.board=board;this.fx=fx;this.canvas=document.createElement('canvas');this.canvas.className='art-sprites';this.canvas.setAttribute('aria-hidden','true');board.prepend(this.canvas);this.ctx=this.canvas.getContext('2d');
  this.units=new Map();this.bodies=new Map();this.clock=0;this.last=0;this.paused=true;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  this.onAssetReady=()=>{this.invalidate();this.fx?.invalidate?.();};this.modelPack=art.pack;this.modelGeneration=0;
  this.resize=new ResizeObserver(()=>this.measure());this.resize.observe(board);this.measure();
  this.onVisibility=()=>{this.last=0;this.invalidate();};document.addEventListener?.('visibilitychange',this.onVisibility);this.invalidate();
 }
 measure(){const r=this.board.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);this.width=r.width;this.height=r.height;this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);this.ctx.setTransform(d,0,0,d,0,0);this.invalidate();}
 invalidate(){if(!this.dead&&!this.frame&&!document.hidden)this.frame=requestAnimationFrame(t=>{this.frame=0;if(this.resetClock){this.last=t;this.resetClock=false;}this.draw(t);});}
 update(b,{paused,speed}){
  if(this.modelPack!==art.pack){this.modelPack=art.pack;this.modelGeneration++;this.models?.destroy();this.models=null;this.modelLoading=false;}
  if(this.paused!==paused)this.resetClock=true;this.paused=paused;this.speed=speed;this.invalidate();
  if(this.battleId!==b.id){this.units.clear();this.batch=null;this.battleId=b.id;this.consumed=0;}
  const batch=b.id+':'+b.tick,first=this.batch===null,changed=this.batch!==batch;
  if(changed)this.consumed=0;
  const events=!first&&!paused?(b.effects||[]).slice(this.consumed):[];
  this.batch=batch;this.consumed=(b.effects||[]).length;
  const localEvents=events.filter(e=>!e.enchantment&&(!e.skill||!this.fx?.cinematics.some(c=>c.events.some(hit=>hit.from===e.from&&hit.label===e.label))));
  const live=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'&&(!b.deploymentLocked||u.side===0||!hidden(b,u)));
  for(const [id,u]of this.units)if(!live.some(v=>v.id===id)&&u.deadAt===undefined){
   const actual=b.sides.flatMap(s=>s.units).find(v=>v.id===id);
   if(actual?.status==='active'&&actual.side===1&&hidden(b,actual)){this.units.delete(id);continue;}
   if(paused)this.units.delete(id);else{
    u.defeated=actual?.status==='defeated'&&actual.hp<=0;
    u.deadAt=this.clock;
    const transition=this.fx?.transitions?.items.findLast(e=>e.id===id&&['rout','exit'].includes(e.kind));
    const fatal=this.fx?.actions.find(a=>a.events.some(e=>e.to===id&&e.defeated));
    u.deathFxAt=transition?.start??(fatal?fatal.start+fatal.duration*.52:this.fx?.clock);
    u.deathDuration=transition?.duration??600;
    if(transition?.kind==='exit'){u.x=actual.x;u.y=actual.y;u.pos=hexCenter(actual.x,actual.y);u.from=undefined;}
   }
  }
  for(const u of live){
   const old=this.units.get(u.id),pos=hexCenter(u.x,u.y),moved=old&&(old.x!==u.x||old.y!==u.y);
   const next={...old,id:u.id,type:combatType(u),baseType:u.type,side:u.side,x:u.x,y:u.y,pos,hp:u.hp,maxHp:u.maxHp};
   if(moved){next.from=paused?undefined:this.position(old);next.moveAt=paused?undefined:this.clock;next.facing=facingRow(pos.x-old.pos.x,pos.y-old.pos.y,u.side);}
   const hit=localEvents.find(e=>e.from===u.id&&!e.ongoing&&e.damageKind!=='dot'&&!e.enchantment&&(e.skill||e.damage>0||e.shieldAbsorbed>0||e.skill===false&&!e.abilityKind));
   if(hit){next.attackAt=this.clock;next.target=hexCenter(hit.x,hit.y);next.facing=facingRow(next.target.x-pos.x,next.target.y-pos.y,u.side);}
   const received=localEvents.find(e=>e.to===u.id&&e.damage>0);
   if(received){next.hitAt=this.clock;next.hitFrom=hexCenter(received.fromX??u.x,received.fromY??u.y);}
   this.units.set(u.id,next);
  }
  this.snapshot={terrain:b.terrain,mapId:b.mapId,...(b.mapData?{mapData:b.mapData}:{}),gate:b.siege?.gate?{...b.siege.gate}:null,units:[...this.units.values()].map(u=>({...u}))};
  if(this.board&&!this.models&&!this.modelLoading&&(Object.keys(art.pack.models||{}).length||this.snapshot.units.some(u=>unitModelKey(art.pack,u)))){
   this.modelLoading=true;
   const generation=this.modelGeneration;
   import('./art-models.mjs').then(({ModelLayer})=>{if(!this.dead&&generation===this.modelGeneration){try{this.models=new ModelLayer(this.board,art.pack);this.models.onChange=()=>this.invalidate();this.models.update(this.snapshot);this.invalidate();}catch{this.board.dataset.modelStatus='fallback';}}}).catch(()=>{if(!this.dead&&generation===this.modelGeneration)this.board.dataset.modelStatus='fallback';});
  }
  this.models?.update(this.snapshot);
  // Preload while deployed so the first cast never waits on an image request.
  art.image(art.pack.criticals?.default,this.onAssetReady);
  for(const u of live){art.image(art.portraitURL(u.id),this.onAssetReady);art.image(art.portraitURL(u.id,'battle'),this.onAssetReady);}
 }
 position(u){
  const transition=this.fx?.transitions?.forUnit(u.id,this.fx.clock);
  if(transition&&['entry','exit'].includes(transition.kind)){
   const frame=transitionFrame(transition,this.fx.clock,{reduced:this.reduced.matches});
   return {x:u.pos.x+frame.offsetX/14.5,y:u.pos.y};
  }
  const charge=this.fx?.actions.find(a=>a.events.some(e=>e.from===u.id&&e.visual==='charge'&&(e.damage>0||e.shieldAbsorbed>0))&&a.end>this.fx.clock);
  if(charge){
   const e=charge.events.find(e=>e.from===u.id),from=hexCenter(e.fromX,e.fromY),t=this.reduced.matches?1:smooth(castFrame((this.fx.clock-charge.start)/charge.duration).flight);
   if(from.x!==u.pos.x||from.y!==u.pos.y)return {x:from.x+(u.pos.x-from.x)*t,y:from.y+(u.pos.y-from.y)*t};
  }
  const t=this.reduced.matches?1:smooth(clamp((this.clock-(u.moveAt??-10))/.48));
  return u.from?{x:u.from.x+(u.pos.x-u.from.x)*t,y:u.from.y+(u.pos.y-u.from.y)*t}:u.pos;
 }
 draw(time){
  if(this.dead)return;
  const dt=Math.min((time-(this.last||time))/1000,.08);this.last=time;
  const cast=this.fx?.currentCinematic(),cinematic=!!cast;
  if(!this.paused&&!document.hidden&&!cinematic)this.clock+=dt*(this.speed||1);
  const c=this.ctx,w=this.width,h=this.height,cell=w/14.5;
  this.bodies.clear();
  c.clearRect(0,0,w,h);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  const elements=new Map([...this.board.querySelectorAll('[data-unit]')].map(el=>[el.dataset.unit,el]));
  const units=[...this.units.values()].sort((a,b)=>a.pos.y-b.pos.y);
  const actions=this.fx?.currentActions()||[];
  for(const u of units){
   const dying=u.deadAt!==undefined,death=dying?u.deathFxAt!==undefined?clamp((this.fx.clock-u.deathFxAt)/(u.deathDuration||600)):clamp((this.clock-u.deadAt)/.6):0;
   const transition=this.fx?.transitions?.forUnit(u.id,this.fx.clock),arrival=transition?transitionFrame(transition,this.fx.clock,{reduced:this.reduced.matches}):null;
   const casualty=casualtyFrame(death,{reduced:this.reduced.matches,defeated:u.defeated!==false});
   if(arrival&&transition.kind!=='rout')casualty.opacity=arrival.opacity;
   if(death>=1){this.units.delete(u.id);continue;}
   const casting=unitCastAction(actions,u.id),attack=casting?.action,actor=casting?.event;
   const reaction=this.fx?.feedback?.reaction(u.id,this.fx.clock);
   const hit=actions.find(a=>a.events.some(e=>e.to===u.id&&e.damage>0)),victim=reaction?.hit||hit?.events.find(e=>e.to===u.id&&e.damage>0);
   const statuses=this.fx?.feedback?.statusesFor(u.id,this.fx.clock)||[],bodyTime=this.fx?this.fx.clock/1000:this.clock;
   const state=unitStatusMotion(statuses,bodyTime,0,this.reduced.matches);
   const moving=!!arrival?.walking||!cinematic&&!state.rooted&&u.moveAt!==undefined&&this.clock-u.moveAt<.48;
   let ap=this.fx?(attack?actorCastProgress((this.fx.clock-attack.start)/attack.duration,actor):1):clamp((this.clock-(u.attackAt??-10))/.65);
   const attacking=ap<1&&!!actor&&!state.blocked,target=actor?hexCenter(actor.x,actor.y):u.target;
   const clips=unitSpriteClips(art.pack,u),key=attacking?'attack':moving?'move':'idle',clip=clips?.[key]||clips?.idle;
   const img=art.image(clip?.url,this.onAssetReady),el=elements.get(u.id),model=this.models?.hasUnit(u.id);
   const visualPosition=this.position(u);
   presentationStyle(el,'translate',`${(visualPosition.x-u.pos.x)*w}px ${(visualPosition.y-u.pos.y)*h}px`);
   el?.classList.toggle('has-unit-art',!!img||!!model);
   // These CSS channels animate only the vector/portrait fallback. Models and
   // sprites already apply the same motion in their own renderers.
   if(el&&!img&&!model){
    const gesture=actor?.skill?castPose(ap,actor.presentationKind):null;
    presentationStyle(el,'--cast-lift',this.reduced.matches?'0px':`${-(gesture?.lift||0)*cell+state.stance*cell}px`);
    presentationStyle(el,'--cast-lean',this.reduced.matches?'0rad':`${((gesture?.lean||0)+state.lean)*(u.side?-1:1)}rad`);
    presentationStyle(el,'--hit-flash',this.reduced.matches?0:reaction?.flash||0);
   }
   if(!img||model){this.bodies.set(u.id,this.models?.bodyAnchors(u.id)||[{x:visualPosition.x*w,y:visualPosition.y*h,size:cell*.72,facing:u.side?-1:1}]);continue;}
   let p=visualPosition,dx=target?target.x-p.x:(u.side?-1:1),dy=target?target.y-p.y:0;
   const len=Math.hypot(dx*w,dy*h)||1,nx=dx*w/len,ny=dy*h/len;
   const recoilP=this.fx?.feedback?0:this.fx?(victim&&hit?clamp(((this.fx.clock-hit.start)/hit.duration-.52)/.25):0):clamp((this.clock-(u.hitAt??-10)-.3)/.24);
   const recoil=this.reduced.matches?0:this.fx?.feedback?(reaction?.recoil||0)*cell:Math.sin(recoilP*Math.PI)*cell*.09;
   const hitFrom=victim?hexCenter(victim.fromX,victim.fromY):null,hitDx=hitFrom?(hitFrom.x-p.x)*w:nx,hitDy=hitFrom?(hitFrom.y-p.y)*h:ny,hitLength=Math.hypot(hitDx,hitDy)||1;
   let x=p.x*w-hitDx/hitLength*recoil,y=p.y*h-hitDy/hitLength*recoil;
   const row=Math.min(clip.rows-1,arrival?facingRow(arrival.facing,0,u.side):actor?facingRow(dx,dy,u.side):(u.facing??facingRow(0,0,u.side)));
   const size=cell*(combatFamily(u)==='cavalry'?.57:.5),sw=img.width/clip.columns,sh=img.height/clip.rows;
   const formation=troopFormation(combatFamily(u)),anchors=[];
   c.save();c.globalAlpha=casualty.opacity*state.opacity;
   if(!this.reduced.matches&&moving){c.fillStyle='#cdbb8750';for(let j=0;j<4;j++){c.beginPath();c.ellipse(x-nx*cell*.3-j*3,y+cell*.05+Math.sin(this.clock*11+j)*3,4+j*2,2+j,0,0,Math.PI*2);c.fill();}}
   for(let i=0;i<formation.length;i++){
    const [ox,oy]=formation[i],phase=i*.47,body=unitStatusMotion(statuses,bodyTime,i,this.reduced.matches);
    const elapsed=bodyTime*body.gait,sp=troopAttackFrame(ap,i),gesture=attacking?(actor?.skill?castPose(ap,actor.presentationKind):attackPose(ap,u.type)):null;
    const frame=this.reduced.matches||body.blocked?0:attacking?Math.min(clip.frames-1,Math.floor(sp*clip.frames)):Math.floor((elapsed+phase)%clip.duration/clip.duration*clip.frames);
    const bob=this.reduced.matches||!moving?0:Math.sin(elapsed*18+phase)*size*.045;
    const reach=this.reduced.matches?0:(gesture?.reach||0)*cell,lift=this.reduced.matches?0:(gesture?.lift||0)*cell;
    const bx=x+ox*cell*body.spread+body.x*size+nx*reach,by=y+oy*cell*body.spread+cell*.03+bob+body.y*size+body.stance*size+ny*reach-lift;
    anchors.push({x:bx,y:by,size,facing:nx>=0?1:-1});
    const soldierRow=(row+body.turn)%clip.rows;
    c.save();c.translate(bx,by);
    if(!this.reduced.matches){c.rotate(((gesture?.lean||0)+body.lean)*(u.side?-1:1));c.scale(1+(gesture?.squash||0),1-(gesture?.squash||0));if(dying)c.rotate((u.side?-1:1)*casualty.fall*1.35);}
    if(body.tint){c.shadowColor=body.tint;c.shadowBlur=Math.min(3,size*.08);}
    c.drawImage(img,frame*sw,soldierRow*sh,sw,sh,-size/2,-size*.88,size,size);c.shadowBlur=0;
    if(reaction?.flash>0&&!this.reduced.matches){
     c.filter='brightness(0) invert(1)';c.globalAlpha=casualty.opacity*reaction.flash*.85;
     c.drawImage(img,frame*sw,soldierRow*sh,sw,sh,-size/2,-size*.88,size,size);
    }
    c.restore();
   }
   this.bodies.set(u.id,anchors);
   c.save();c.translate(x-cell*.35,y);c.rotate(-casualty.fall*1.35);c.translate(-x+cell*.35,-y);
   c.imageSmoothingEnabled=true;c.strokeStyle='#d9c39a';c.lineWidth=1.3;c.beginPath();c.moveTo(x-cell*.35,y-cell*.12);c.lineTo(x-cell*.35,y-cell*.62);c.stroke();
   c.fillStyle=u.side?'#ad493c':'#287763';c.beginPath();c.moveTo(x-cell*.35,y-cell*.62);c.lineTo(x-cell*.08,y-cell*.57);c.lineTo(x-cell*.35,y-cell*.43);c.fill();
   c.restore();
   c.restore();
  }
  this.models?.draw(this.clock,{position:u=>this.position(u),actions,hits:this.fx?.feedback?.hits,statuses:id=>this.fx?.feedback?.statusesFor(id,this.fx.clock)||[],transition:id=>this.fx?.transitions?.forUnit(id,this.fx.clock),clock:this.fx?.clock});if(!this.paused)this.invalidate();
 }
 destroy(){this.dead=true;art.releaseImageListener(this.onAssetReady);document.removeEventListener?.('visibilitychange',this.onVisibility);cancelAnimationFrame(this.frame);this.resize.disconnect();this.models?.destroy();this.canvas.remove();}
}
