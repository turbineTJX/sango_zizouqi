import {drawArmorProtection,troopBodyAnchors} from './battle-unit-motion.mjs';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const TAU=Math.PI*2;
const colorFor=s=>({control:'#dbb3ff',damage:'#ffab70',debuff:'#f59fae',buff:'#95efc9'}[s?.tone]||'#d9e7dc');
const amount=s=>s?.state?.amount||0;
const statusCopy=s=>({...s,state:structuredClone(s.state||{}),sources:[...(s.sources||[])]});

export function impactProfile(hit){
 if(!(hit.damage>0))return {force:0,recoil:0,flash:0,duration:0};
 if(hit.ongoing||hit.damageKind==='dot')return {force:.18,recoil:.025,flash:.22,duration:180};
 const fraction=hit.damage/Math.max(1,hit.targetInitial||hit.damage*50);
 const force=clamp(.3+Math.sqrt(fraction)*1.8+(hit.critical?.25:0)+(hit.defeated?.65:0),.3,1.5);
 return {force,recoil:.035+force*.15,flash:.3+force*.4,duration:180+force*75};
}

// One receipt per actual action/target, including fully absorbed hits. Numeric
// outcomes supplement event packets only when no packet carried that value.
export function actionImpacts(actions){
 return actions.flatMap(action=>{
  const targets=new Map();
  for(const e of action.events){
   if(e.combo||!e.to)continue;
   const old=targets.get(e.to)||{...e,damage:0,healing:0,absorbed:0};
   old.damage+=e.damage||0;old.healing+=e.healing||0;old.absorbed+=e.shieldAbsorbed||0;old.critical||=e.critical;old.defeated||=e.defeated;
   targets.set(e.to,old);
  }
  for(const row of action.events.find(e=>e.outcome)?.outcome||[]){
   const hit=targets.get(row.id);if(!hit)continue;
   if(!hit.absorbed)hit.absorbed=row.absorbed||0;
  }
  return [...targets.values()].filter(e=>e.damage>0||e.healing>0||e.absorbed>0).map(e=>({...e,start:action.start+action.duration*.52,end:action.start+action.duration*.52+950}));
 });
}
export function feedbackReaction(hits,id,clock){
 const hit=hits.filter(e=>e.to===id&&e.damage>0&&clock>=e.start&&clock<e.start+impactProfile(e).duration).sort((a,b)=>b.start-a.start||impactProfile(b).force-impactProfile(a).force)[0];
 if(!hit)return null;
 const age=clock-hit.start,profile=impactProfile(hit),recover=clamp((age-55)/(profile.duration-55));
 return {hit,flash:clamp(1-age/150)*profile.flash,recoil:Math.sin(clamp(age/80)*Math.PI/2)*(1-recover*recover*(3-2*recover))*profile.recoil};
}
export class BattleFeedback{
 constructor(){this.reset();}
 reset(){this.units=null;this.hits=[];this.changes=[];this.seen=new WeakSet();}
 update(units,actions,orders,clock,{silent=false,tick=0}={}){
  const next=new Map(units.map(u=>[u.id,{...u,statuses:u.statuses.map(statusCopy)}]));
  const fresh=actions.filter(a=>!this.seen.has(a));for(const a of actions)this.seen.add(a);
  if(silent){this.hits=[];this.changes=[];}
  else{
   for(const hit of actionImpacts(fresh)){
    const occupied=new Set(this.hits.filter(h=>h.to===hit.to&&h.end>hit.start&&h.start<hit.end).map(h=>h.lane));
    hit.lane=0;while(occupied.has(hit.lane))hit.lane++;
    this.hits.push(hit);
   }
   if(this.units)for(const [id,u]of next){
    const previous=this.units.get(id);if(!previous)continue;
    const before=new Map(previous.statuses.map(s=>[s.key,s])),after=new Map(u.statuses.map(s=>[s.key,s]));
    for(const key of new Set([...before.keys(),...after.keys()])){
     const old=before.get(key),current=after.get(key);
     const refreshed=old&&current&&(key==='shield'?amount(current)>amount(old)||(current.state.until||0)>(old.state.until||0):(current.state.until||0)>(old.state.until||0)||(current.state.stacks||0)>(old.state.stacks||0));
     if(!!old===!!current&&!refreshed)continue;
     const status=current||old;
     const reported=fresh.filter(a=>a.events.some(e=>(e.outcome||[]).some(row=>row.id===id&&row.changes?.some(text=>text.includes(status.name)))));
     const candidates=fresh.filter(a=>a.events.some(e=>e.to===id&&(!current||!status.state.sourceId||e.from===status.state.sourceId)));
     const absorption=key==='shield'&&!current?fresh.filter(a=>a.events.some(e=>e.to===id&&e.shieldAbsorbed>0)):[];
     const spent=!current&&['attackOrb','heavyAttack','riposte'].includes(key)?fresh.filter(a=>a.events.some(e=>e.from===id&&(e.attackOrb||e.damage>0&&!e.skill))):[];
     const action=absorption.at(-1)||spent.at(-1)||reported.at(-1)||candidates.filter(a=>a.important).at(-1)||candidates.at(-1),order=orders.filter(o=>o.targets.some(t=>t.id===id)).at(-1);
     const expired=!current&&(old.state.until??Infinity)<=tick;
     const start=expired?clock:action?action.start+action.duration*.52:order?order.start+order.duration*.52:clock;
     const broken=key==='shield'&&!current&&!expired&&this.hits.some(h=>h.to===id&&h.absorbed>0&&Math.abs(h.start-start)<1);
     const target=action?.events.find(e=>e.to===id);
     this.changes.push({id,x:u.x??target?.x??0,y:u.y??target?.y??0,key,before:old,after:current,refresh:!!refreshed,broken,expired,start,end:start+850});
    }
   }
  }
  this.units=next;
  this.hits=this.hits.filter(e=>e.end>clock).slice(-160);this.changes=this.changes.filter(e=>e.end>clock).slice(-160);
 }
 statusesFor(id,clock){
  const statuses=new Map((this.units?.get(id)?.statuses||[]).map(s=>[s.key,s]));
  for(const change of [...this.changes].reverse())if(change.id===id&&clock<change.start){if(change.before)statuses.set(change.key,change.before);else statuses.delete(change.key);}
  return [...statuses.values()];
 }
 reaction(id,clock){return feedbackReaction(this.hits,id,clock);}
 draw(fx,cell){
  const c=fx.ctx,point=e=>{const v=fx.unitPosition?.(e.id||e.to);return v?{x:v.x*fx.width,y:v.y*fx.height}:fx.point(e.x,e.y);};
  const hits=this.hits.filter(e=>fx.clock>=e.start&&fx.clock<e.end).sort((a,b)=>Number(b.to===fx.focusedUnit)-Number(a.to===fx.focusedUnit)||Number(!!b.critical)-Number(!!a.critical)||b.start-a.start).slice(0,6),changes=this.changes.filter(e=>fx.clock>=e.start&&fx.clock<e.end);
  for(const hit of hits){
   if(fx.focusedUnit&&!fx.relatedUnitIds().has(hit.from)&&!fx.relatedUnitIds().has(hit.to))continue;
   const p=point(hit),age=fx.clock-hit.start,q=clamp(age/950),fade=Math.min(1,(1-q)*3),kick=fx.reduced?1:1+Math.sin(clamp(age/200)*Math.PI)*.08;
   const lane=hit.lane||0,x=p.x+(fx.reduced?0:Math.sin(lane+1)*cell*.08),y=p.y-cell*(.85+(fx.reduced?0:q*.48))-lane*cell*.42;
   c.save();
   if(hit.absorbed>0){
    const flash=clamp(1-age/320);if(flash>0)drawArmorProtection(fx,p,cell,{id:hit.to,alpha:flash,pulse:flash});
    fx.label('吸收 '+hit.absorbed,x,y-(hit.damage?cell*.24:0),'#92c4d3',fade,clamp(cell*.17,10,12)*kick);
   }
   if(hit.damage>0){
    const color=hit.critical?'#ffda70':hit.damageKind==='dot'?'#ffae8d':hit.damageKind==='intellect'?'#aee7ff':'#fff0d9';
    const tag=[fx.focusedUnit?hit.name:'',hit.critical?'暴击':''].filter(Boolean).join(' · ');
    if(tag)fx.label(tag,x,y-cell*.23,color,fade,clamp(cell*.14,9,10));
    fx.label('−'+hit.damage,x,y,color,fade,clamp(cell*(hit.critical?.22:.18),11,hit.critical?15:13)*kick);
    if(age<240&&!fx.reduced&&!hit.ongoing&&hit.damageKind!=='dot'){
     const profile=impactProfile(hit),q=age/240,flash=(1-q)*(1-q),origin=fx.point(hit.fromX??hit.x,hit.fromY??hit.y),angle=Math.atan2(p.y-origin.y,p.x-origin.x);
     for(const b of troopBodyAnchors(fx,hit.to,p,cell).slice(0,profile.force>1?3:2)){
      const x=b.x,y=b.y-b.size*.4;fx.glow(x,y,b.size*.15,color,flash*profile.flash);
      for(let i=0;i<(profile.force>1?4:2);i++){
       const a=angle+(i-1.5)*.5,r=b.size*(.05+q*.65)*profile.force;
       fx.line(x+Math.cos(a)*r,y+Math.sin(a)*r*.7,x+Math.cos(a)*(r+b.size*.13),y+Math.sin(a)*(r+b.size*.13)*.7,color,profile.force>1?2.2:1.4,flash);
      }
      if(profile.force>.8){c.globalAlpha=flash*.25;c.fillStyle='#c4ad83';c.beginPath();c.ellipse(b.x+Math.cos(angle)*q*b.size*.3,b.y,b.size*(.12+q*.3),b.size*.09,0,0,TAU);c.fill();}
     }
    }
   }
   if(hit.healing>0)fx.label('+'+hit.healing,x,y,'#a9d3ae',fade,clamp(cell*.18,11,13)*kick);
   c.restore();
  }
  const groups=new Map();
  for(const change of changes){const key=change.id+':'+change.start,list=groups.get(key)||[];list.push(change);groups.set(key,list);}
  for(const unsorted of groups.values()){
   const group=[...unsorted].sort((a,b)=>(a.key==='shield'?0:(a.after||a.before).tone==='control'?1:2)-(b.key==='shield'?0:(b.after||b.before).tone==='control'?1:2));
   const change=group[0],p=point(change),q=clamp((fx.clock-change.start)/850),fade=Math.min(1,(1-q)*2.5),status=change.after||change.before;
   const color=group.every(s=>!s.after)&&status.tone!=='buff'?'#a4f5df':colorFor(status);
   if(fx.focusedUnit&&!fx.relatedUnitIds().has(change.id))continue;
   c.save();
   for(const s of group.filter(s=>s.key==='shield')){
    if(s.after)drawArmorProtection(fx,p,cell,{id:change.id,alpha:fade,pulse:1-q});
    else if(!s.broken)drawArmorProtection(fx,p,cell,{id:change.id,alpha:fade*.35});
    else if(!fx.reduced)for(const b of troopBodyAnchors(fx,change.id,p,cell)){
     const x=b.x+b.size*.18,y=b.y-b.size*.4+q*b.size*.2;
     fx.line(x,y,x+b.size*.12,y+b.size*.08,'#9bbfcb',1.5,fade);
    }
   }
   const ordinary=group.filter(s=>s.key!=='shield');
   if(ordinary.length&&!fx.reduced)for(const b of troopBodyAnchors(fx,change.id,p,cell))fx.line(b.x-b.size*.12,b.y-b.size*(.28+q*.2),b.x+b.size*.06,b.y-b.size*(.36+q*.2),color,1.4,fade*.45);
   const labels=group.slice(0,2).map(s=>{
    const name=s.key==='attackOrb'?'强化普攻':(s.after||s.before).name;
    return s.key==='shield'?(s.after?(s.refresh?'护盾强化':'获得护盾'):(s.broken?'破盾':'护盾结束')):s.after?(name+(s.refresh?'刷新':'')):['attackOrb','heavyAttack','illusion','riposte'].includes(s.key)?name+'耗尽':s.expired?name+'结束':'解除'+name;
   });
   const critical=group.some(s=>s.broken||s.after&&!s.refresh&&['stun','confuse','seal','root','disarm'].includes(s.key));
   if(critical||fx.focusedUnit===change.id)fx.label(labels.slice(0,1).join(''),p.x,p.y-cell*(.95+(fx.reduced?0:q*.12)),group.some(s=>s.key==='shield')?'#a1c4cf':color,fade,clamp(cell*.15,9,10));
   c.restore();
  }
 }
}
