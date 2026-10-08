import {art} from './art-assets.mjs';
import {hexCenter} from './hex-grid.mjs';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=t=>t*t*(3-2*t);
const ranged=type=>['archer','crossbow','siege','ship'].includes(type);
// All animation state lives here; positions, hits and casualties remain engine-owned.
export function attackPose(progress,type){
 const p=clamp(progress),strike=Math.sin(clamp((p-.2)/.36)*Math.PI);
 return {reach:ranged(type)?-Math.sin(p*Math.PI)*.045:(p<.2?-.06*Math.sin(p/.2*Math.PI):strike*(type==='cavalry'?.3:.18)),recoil:Math.sin(clamp((p-.48)/.32)*Math.PI)*.08};
}
export function facingRow(dx,dy,side=0){
 if(Math.abs(dx)+Math.abs(dy)<.0001)return side?1:3;
 // The source atlas has NW, SW, SE, NE views, in that order.
 return dx<0?(dy<0?0:1):(dy>0?2:3);
}
export class BattleArt {
 constructor(board,fx=null){
  this.board=board;this.fx=fx;this.canvas=document.createElement('canvas');this.canvas.className='art-sprites';this.canvas.setAttribute('aria-hidden','true');board.prepend(this.canvas);this.ctx=this.canvas.getContext('2d');
  this.units=new Map();this.clock=0;this.last=0;this.paused=true;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  this.resize=new ResizeObserver(()=>this.measure());this.resize.observe(board);this.measure();
  if(art.active)import('./art-models.mjs').then(({ModelLayer})=>{if(!this.dead){try{this.models=new ModelLayer(board,art.pack);this.models.update(this.snapshot);}catch{board.dataset.modelStatus='fallback';}}}).catch(()=>{board.dataset.modelStatus='fallback';});
  this.frame=requestAnimationFrame(t=>this.draw(t));
 }
 measure(){const r=this.board.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);this.width=r.width;this.height=r.height;this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);this.ctx.setTransform(d,0,0,d,0,0);}
 update(b,{paused,speed}){
  this.paused=paused;this.speed=speed;
  if(this.battleId!==b.id){this.units.clear();this.batch=null;this.battleId=b.id;this.consumed=0;}
  const batch=b.id+':'+b.tick,first=this.batch===null,changed=this.batch!==batch;
  if(changed)this.consumed=0;
  const events=!first&&!paused?(b.effects||[]).slice(this.consumed):[];
  this.batch=batch;this.consumed=(b.effects||[]).length;
  const localEvents=events.filter(e=>!e.enchantment&&(!e.skill||!this.fx?.cinematics.some(c=>c.events.some(hit=>hit.from===e.from&&hit.label===e.label))));
  const live=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
  for(const [id,u]of this.units)if(!live.some(v=>v.id===id)&&u.deadAt===undefined){if(paused)this.units.delete(id);else u.deadAt=this.clock;}
  for(const u of live){
   const old=this.units.get(u.id),pos=hexCenter(u.x,u.y),moved=old&&(old.x!==u.x||old.y!==u.y);
   const next={...old,id:u.id,type:u.type,side:u.side,x:u.x,y:u.y,pos,hp:u.hp,maxHp:u.maxHp};
   if(moved){next.from=paused?undefined:this.position(old);next.moveAt=paused?undefined:this.clock;next.facing=facingRow(pos.x-old.pos.x,pos.y-old.pos.y,u.side);}
   const hit=localEvents.find(e=>e.from===u.id&&!e.ongoing&&e.damage>0);
   if(hit){next.attackAt=this.clock;next.target=hexCenter(hit.x,hit.y);next.facing=facingRow(next.target.x-pos.x,next.target.y-pos.y,u.side);}
   const received=localEvents.find(e=>e.to===u.id&&e.damage>0);
   if(received){next.hitAt=this.clock;next.hitFrom=hexCenter(received.fromX??u.x,received.fromY??u.y);}
   this.units.set(u.id,next);
  }
  this.snapshot={terrain:b.terrain,gate:b.siege?.gate?{...b.siege.gate}:null,units:[...this.units.values()].filter(u=>u.deadAt===undefined).map(u=>({...u}))};
  this.models?.update(this.snapshot);
  // Preload while deployed so the first cast never waits on an image request.
  art.image(art.pack.criticals?.default);
  for(const u of live)art.image(art.pack.portraits[u.id]);
 }
 position(u){
  const t=this.reduced.matches?1:smooth(clamp((this.clock-(u.moveAt??-10))/.48));
  return u.from?{x:u.from.x+(u.pos.x-u.from.x)*t,y:u.from.y+(u.pos.y-u.from.y)*t}:u.pos;
 }
 draw(time){
  if(this.dead)return;
  const dt=Math.min((time-(this.last||time))/1000,.08);this.last=time;
  const cast=this.fx?.cinematics[0],cinematic=!!cast;
  if(!this.paused&&!document.hidden&&!cinematic)this.clock+=dt*(this.speed||1);
  const c=this.ctx,w=this.width,h=this.height,cell=w/14.5;
  c.clearRect(0,0,w,h);c.imageSmoothingEnabled=false;
  const elements=new Map([...this.board.querySelectorAll('[data-unit]')].map(el=>[el.dataset.unit,el]));
  const units=[...this.units.values()].sort((a,b)=>a.pos.y-b.pos.y);
  const castP=cast?clamp((this.fx.clock-cast.start)/cast.duration):0;
  for(const u of units){
   const dying=u.deadAt!==undefined,death=dying?clamp((this.clock-u.deadAt)/.6):0;
   if(death>=1){this.units.delete(u.id);continue;}
   const actor=cast?.events.find(e=>e.from===u.id),victim=cast?.events.find(e=>e.to===u.id&&e.damage);
   const moving=!cinematic&&u.moveAt!==undefined&&this.clock-u.moveAt<.48;
   let ap=cinematic?(actor?clamp((castP-.32)/.5):1):clamp((this.clock-(u.attackAt??-10))/.65);
   const attacking=ap<1&&(!cinematic||castP>=.32),target=actor?hexCenter(actor.x,actor.y):u.target;
   const clips=art.pack.troops[u.type==='logistics'?'spear':u.type],key=attacking?'attack':moving?'move':'idle',clip=clips?.[key]||clips?.idle;
   const img=art.image(clip?.url),el=elements.get(u.id),model=this.models?.hasUnit(u.id);
   el?.classList.toggle('has-unit-art',!!img||!!model);
   if(!img||model)continue;
   let p=this.position(u),dx=target?target.x-p.x:(u.side?-1:1),dy=target?target.y-p.y:0;
   const len=Math.hypot(dx*w,dy*h)||1,nx=dx*w/len,ny=dy*h/len,pose=attackPose(ap,u.type);
   const recoilP=cinematic?(victim?clamp((castP-.56)/.22):0):clamp((this.clock-(u.hitAt??-10)-.3)/.24);
   const recoil=this.reduced.matches?0:Math.sin(recoilP*Math.PI)*cell*.09;
   let x=p.x*w+(this.reduced.matches?0:nx*pose.reach*cell)-nx*recoil,y=p.y*h+(this.reduced.matches?0:ny*pose.reach*cell)-ny*recoil;
   const row=Math.min(clip.rows-1,actor?facingRow(dx,dy,u.side):(u.facing??facingRow(0,0,u.side)));
   const size=cell*(u.type==='cavalry'?.57:.5),sw=img.width/clip.columns,sh=img.height/clip.rows;
   const formation=u.type==='cavalry'?[[-.23,-.12],[.22,-.12],[0,.08]]:[[-.27,-.16],[0,-.16],[.27,-.16],[-.27,.08],[0,.08],[.27,.08]];
   c.save();c.globalAlpha=1-death;
   // Ground footprint and pennant make allegiance visible even with shared source sprites.
   c.fillStyle=u.side?'#ae584a44':'#50b99d44';c.strokeStyle=u.side?'#eeb09a99':'#9fe2c599';c.lineWidth=1;
   c.beginPath();c.ellipse(x,y-cell*.01,cell*.43,cell*.21,0,0,Math.PI*2);c.fill();c.stroke();
   if(!this.reduced.matches&&moving){c.fillStyle='#cdbb8750';for(let j=0;j<4;j++){c.beginPath();c.ellipse(x-nx*cell*.3-j*3,y+cell*.05+Math.sin(this.clock*11+j)*3,4+j*2,2+j,0,0,Math.PI*2);c.fill();}}
   for(let i=0;i<formation.length;i++){
    const [ox,oy]=formation[i],phase=i*.47,elapsed=moving?(this.clock-(u.moveAt??0))*2.4:this.clock;
    const frame=this.reduced.matches?0:attacking?Math.min(clip.frames-1,Math.floor(ap*clip.frames)):Math.floor((elapsed+phase)%clip.duration/clip.duration*clip.frames);
    const bob=this.reduced.matches||!moving?0:Math.sin(elapsed*18+phase)*size*.035;
    c.save();c.translate(x+ox*cell,y+oy*cell+cell*.03+bob);if(dying&&!this.reduced.matches)c.rotate((u.side?-1:1)*death*1.1);
    c.drawImage(img,frame*sw,row*sh,sw,sh,-size/2,-size*.88,size,size);c.restore();
   }
   c.imageSmoothingEnabled=true;c.strokeStyle='#d9c39a';c.lineWidth=1.3;c.beginPath();c.moveTo(x-cell*.35,y-cell*.12);c.lineTo(x-cell*.35,y-cell*.62);c.stroke();
   c.fillStyle=u.side?'#ad493c':'#287763';c.beginPath();c.moveTo(x-cell*.35,y-cell*.62);c.lineTo(x-cell*.08,y-cell*.57);c.lineTo(x-cell*.35,y-cell*.43);c.fill();if(u.type==='logistics'){c.fillStyle='#fff0cd';c.font='bold '+Math.max(9,cell*.18)+'px serif';c.fillText('辅',x-cell*.33,y-cell*.47);}c.imageSmoothingEnabled=false;
   if(recoil>.4){c.globalAlpha=(1-death)*.6;c.strokeStyle='#fff1c0';c.lineWidth=2;c.beginPath();c.arc(x,y-cell*.25,cell*.24,-.8,1.2);c.stroke();}
   c.restore();
  }
  this.models?.draw(this.clock);this.frame=requestAnimationFrame(t=>this.draw(t));
 }
 destroy(){this.dead=true;cancelAnimationFrame(this.frame);this.resize.disconnect();this.models?.destroy();this.canvas.remove();}
}
