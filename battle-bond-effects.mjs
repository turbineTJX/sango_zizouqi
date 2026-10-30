import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {activeBonds,bondOnField} from './bonds.mjs';
import {hidden} from './battle-status-rules.mjs';
import {BOND_VISUALS,drawBondGlyph} from './bond-icons.mjs';

const byName=new Map(Object.entries(BOND_DESIGNS).map(([id,d])=>[d.name,id]));
const clamp=n=>Math.max(0,Math.min(1,n));
const visible=(b,u)=>u&&bondOnField(u)&&(u.side===0||!hidden(b,u));
const stamp=(id,bond)=>`${id}:${bond}`;

// A read-only channel. Tier activation and actual procs have separate receipts;
// loading a running battle establishes a baseline instead of replaying history.
export class BattleBondEffects{
 constructor(){this.reset();}
 reset(){this.id=null;this.sawDeployment=false;this.opened=false;this.previous=new Map();this.items=[];this.visible=new Set();}
 update(b,events,actions,clock,{paused=false,speed=1,silent=false}={}){
  const fresh=this.id!==b.id;
  if(fresh){this.reset();this.id=b.id;this.sawDeployment=!b.deploymentLocked;}
  if(!b.deploymentLocked)this.sawDeployment=true;
  const units=b.sides.flatMap(s=>s.units),lookup=new Map(units.map(u=>[u.id,u])),next=new Map();
  this.visible=new Set(units.filter(u=>visible(b,u)).map(u=>u.id));
  for(const u of units.filter(u=>visible(b,u))){
   for(const d of activeBonds(b,u))if(d.special!=='openingFormation')next.set(stamp(u.id,d.id),{unit:u.id,id:d.id,tier:d.tier,side:u.side,x:u.x,y:u.y,low:d.id==='bondLastStand'&&u.hp<=u.maxHp*d.hpThreshold});
   for(const e of u.bondOpeningFormations||[])next.set(stamp(u.id,e.id),{unit:u.id,id:e.id,tier:e.tier,side:u.side,x:u.x,y:u.y,low:false});
  }
  this.items=this.items.filter(e=>e.end>clock&&this.visible.has(e.unit));
  if(silent)this.items=[];
  const opening=b.deploymentLocked&&this.sawDeployment&&!this.opened;
  if(b.deploymentLocked&&!paused&&(opening||!fresh&&!silent)){
   const added=new Map();
   for(const [key,s]of next){
    const prior=this.previous.get(key);
    if(opening||!prior||s.tier>prior.tier){
     const group=added.get(s.unit)||[];group.push(s);added.set(s.unit,group);
    }
    if(!opening&&s.low&&prior&&!prior.low){
     const hit=events.find(e=>e.to===s.unit&&e.damage>0);
     this.push({...s,kind:'proc'},hit?hit.start+hit.duration*.52:clock,clock,speed);
    }
   }
   for(const group of added.values()){
    group.sort((a,c)=>Number(BOND_DESIGNS[c.id].grade==='advanced')-Number(BOND_DESIGNS[a.id].grade==='advanced')||a.id.localeCompare(c.id));
    group.forEach((s,slot)=>this.push({...s,kind:opening?'opening':'activation',slot,count:group.length},clock+slot*110/Math.sqrt(speed),clock,speed));
   }
   if(opening)this.opened=true;
  }
  if(!fresh&&!paused&&!silent&&b.deploymentLocked){
   const seen=new Set();
   for(const e of events){
    let id=e.ongoing?byName.get(e.label):null,unit=e.from;
    if(e.label==='破军乘胜')id='bondRaid';
    if(e.bondCritical)id=e.bondCritical;
    if(e.intentDenied>0&&e.intentBlock==='截气')id='bondSuppress';
    if(e.label==='勇武'||/^勇武 · .*免疫/.test(e.text||'')){id='bondValor';unit=e.to;}
    const u=lookup.get(unit);
    if(!id||!visible(b,u))continue;
    const state=next.get(stamp(unit,id));
    // Stored Peach fury can remain after its contributing allies have fallen.
    const peachTier=id==='bondPeach'&&u.statuses?.peachFury?.until>b.tick?(b.sides[u.side].bondPeach?.triple?3:2):0;
    const tier=state?.tier||peachTier;
    if(!tier)continue;
    const key=stamp(unit,id);if(seen.has(key))continue;seen.add(key);
    const own=actions.find(a=>a.events.includes(e));
    const origin=actions.find(a=>a.events.some(v=>v.from===e.from&&!v.ongoing&&!v.combo)&&a.start<=e.start&&a.end>=e.start)||own;
    const start=origin?origin.start+origin.duration*.52:e.start+e.duration*.52;
    const matching=v=>id==='bondFinisher'?v.bondCritical===id:id==='bondSuppress'?v.intentDenied>0&&v.intentBlock==='截气':v.ongoing&&v.label===e.label;
    const targets=id==='bondValor'?[]:events.filter(v=>v.from===e.from&&matching(v)).map(v=>v.to).filter(id=>id!==unit&&this.visible.has(id));
    this.push({unit,id,tier,side:u.side,x:u.x,y:u.y,kind:'proc',targets:[...new Set(targets)]},start,clock,speed);
   }
   // Reserve rewards are recorded on the real entry, including non-holders.
   for(const [side,army]of b.sides.entries())for(const a of army.bondReserve?.awarded||[]){
    const u=lookup.get(a.id),key=stamp(a.id,'reserveAward');next.set(key,{tick:a.tick});
    if(!this.previous.has(key)&&a.tick===b.tick&&visible(b,u))this.push({unit:u.id,id:'bondReserve',tier:army.bondReserve.tier,side,x:u.x,y:u.y,kind:'proc'},clock,clock,speed);
   }
  }else for(const army of b.sides)for(const a of army.bondReserve?.awarded||[])next.set(stamp(a.id,'reserveAward'),{tick:a.tick});
  this.previous=next;
 }
 push(receipt,start,clock,speed){
  if(!BOND_VISUALS[receipt.id])return;
  // Coalesce a multi-target or repeated receipt within the same exchange.
  const prior=this.items.find(e=>e.unit===receipt.unit&&e.id===receipt.id&&e.kind===receipt.kind&&Math.abs(e.start-start)<180);
  if(prior){prior.targets=[...new Set([...(prior.targets||[]),...(receipt.targets||[])])];return;}
  const duration=receipt.kind==='proc'?Math.max(560,850/Math.sqrt(speed)):Math.max(950,1350/Math.sqrt(speed));
  this.items.push({...receipt,start:Math.max(clock,start),end:Math.max(clock,start)+duration});
 }
 isOpening(clock){return this.items.some(e=>e.kind==='opening'&&e.end>clock);}
 draw(fx,cell){
  this.items=this.items.filter(e=>e.end>fx.clock&&this.visible.has(e.unit));
  const lit=new Set(this.items.filter(e=>fx.clock>=e.start).map(e=>`${e.side}:${e.id}`));
  for(const row of fx.root?.querySelectorAll('.bond-row')||[]){
   const side=row.closest('#enemy-battle-bonds')?1:0;
   row.classList.toggle('bond-flashing',lit.has(`${side}:${row.dataset.bond}`));
  }
  const c=fx.ctx;
  for(const e of this.items){
   if(fx.clock<e.start)continue;
   if(fx.focusedUnit&&fx.focusedUnit!==e.unit&&!e.targets?.includes(fx.focusedUnit))continue;
   const p=clamp((fx.clock-e.start)/(e.end-e.start)),g=BOND_VISUALS[e.id],v=fx.unitPosition?.(e.unit),at=v?{x:v.x*fx.width,y:v.y*fx.height}:fx.point(e.x,e.y);
   const fade=clamp(p*9)*clamp((1-p)*5),reduced=fx.reduced,size=Math.max(22,Math.min(30,cell*.38)),rise=reduced?0:Math.min(1,p*5)*5;
   const x=at.x+((e.slot||0)-((e.count||1)-1)/2)*(size+3),y=at.y-cell*.55-rise;
   c.save();c.globalAlpha=fade;c.strokeStyle=g.color;c.fillStyle='#102524f2';c.lineWidth=e.tier===3?2:1.25;
   if(!reduced){c.shadowColor=g.color;c.shadowBlur=(e.kind==='proc'?10:7)*(1-p);}
   const r=size*.66;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.85,y-r*.5);c.lineTo(x+r*.85,y+r*.5);c.lineTo(x,y+r);c.lineTo(x-r*.85,y+r*.5);c.lineTo(x-r*.85,y-r*.5);c.closePath();c.fill();c.stroke();
   c.strokeStyle=g.color;drawBondGlyph(c,e.id,x,y-1,size*.8);c.shadowBlur=0;c.fillStyle=g.color;
   for(let i=0;i<e.tier;i++)c.fillRect(x+(i-(e.tier-1)/2)*5-1.5,y+size*.4,3,3);
   c.restore();
   if(!reduced){
    this.drawBody(fx,e.unit,at,cell,p,g,fade);
    for(const id of e.targets||[]){if(!this.visible.has(id))continue;const v=fx.unitPosition?.(id);if(v)this.drawBody(fx,id,{x:v.x*fx.width,y:v.y*fx.height},cell,p,g,fade*.7);}
   }
  }
 }
 drawBody(fx,id,at,cell,p,g,fade){
  const c=fx.ctx,anchors=fx.bodyAnchors?.(id)||[{...at,size:cell*.65}],count=fx.mode==='clear'?3:5;
  c.save();c.strokeStyle=g.color;c.lineWidth=1.5;c.globalAlpha=fade*(1-p)*.9;
  for(const [i,a]of anchors.slice(0,count).entries()){
   const s=a.size||cell*.4,phase=(p+i*.12)%1,x=a.x,y=a.y-s*.1;
   c.beginPath();
   if(g.motif==='strike'){c.moveTo(x-s*.2,y+s*.1);c.lineTo(x+s*.14,y-s*(.2+phase*.4));c.moveTo(x+s*.1,y);c.lineTo(x+s*.26,y-s*.2);}
   else if(g.motif==='guard'){c.moveTo(x-s*.23,y-s*.32);c.lineTo(x-s*.23,y+s*.1);c.lineTo(x-s*.1,y+s*.23);c.moveTo(x+s*.23,y-s*.32);c.lineTo(x+s*.23,y+s*.1);}
   else if(g.motif==='swift'){for(let j=0;j<2;j++){c.moveTo(x-s*(.4+j*.12),y+s*(.15+j*.14));c.lineTo(x+s*.12,y-s*(.1-j*.14));}}
   else{c.moveTo(x,y+s*(.2-phase*.65));c.lineTo(x,y+s*(.06-phase*.65));c.moveTo(x-s*.1,y-s*phase*.4);c.lineTo(x+s*.1,y-s*phase*.4);}
   c.stroke();
  }c.restore();
 }
}
