// Read-only body choreography, shared by soldier atlases and native models.
// Offsets are fractions of a soldier's body, never new battlefield positions.
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function casualtyFrame(progress,{reduced=false,defeated=true}={}){
 const p=clamp(progress),ease=n=>{const q=clamp(n);return q*q*(3-2*q);};
 return {opacity:defeated?1-ease((p-.62)/.38):1-p,fall:reduced||!defeated?0:ease(p/.7)};
}
const groups={
 protection:['shield','commandInvincible','guardInvincible','peachInvincible','magicImmune','ward','resolve','guard'],
 brace:['phalanx','bulwark','camp','anchored','emplaced'],
 swift:['swiftRush','rapidAdvance','haste','attackHaste','phase','pursuit'],
 force:['valor','peachFury','heavyAttack','riposte'],
 weapon:['attackOrb','burningAttack','strategyAttack','longRange','nexus','insight'],
 weakened:['powerDown','hunger','weaken','despair','intentSuppression','attackSlow','shortRange'],spent:['stasisLock'],
 stagger:['disrupted','armorBreak','link'],
 stun:['stun'],confuse:['confuse'],burn:['burn'],plague:['plague'],seal:['seal'],
 root:['root'],disarm:['disarm'],slow:['slow'],taunt:['taunt'],recovery:['regrowth'],
 concealed:['stealth','decoy','stasis'],
};
export const STATUS_BODY_CHANNELS=Object.freeze(Object.fromEntries(Object.entries(groups).flatMap(([channel,keys])=>keys.map(key=>[key,channel]))));
export function unitStatusMotion(statuses=[],time=0,index=0,reduced=false){
 const keys=new Set(statuses.map(s=>s.key)),channels=new Set([...keys].map(k=>STATUS_BODY_CHANNELS[k]).filter(Boolean));
 const has=k=>channels.has(k),phase=index*1.73,t=reduced?0:time;
 const body={x:0,y:0,lean:0,turn:0,spread:1,stance:0,gait:1,opacity:1,tint:null,tintAmount:0,
  blocked:has('stun')||has('confuse')||keys.has('stasis'),rooted:has('root')||has('stun')||has('brace')||keys.has('stasis'),channels:[...channels]};
 const tint=(color,amount)=>{body.tint=color;body.tintAmount=amount;};
 if(has('protection')){body.stance=.055;tint('#9bc6d2',.12);}
 if(has('brace')){body.spread=.83;body.stance=.09;body.lean=-.035;tint('#adbba8',.09);}
 if(has('swift')){body.gait=1.35;body.lean=.035;tint('#d6c99a',.08);}
 if(has('force')){body.stance=-.025;body.lean=.045;tint('#deb875',.1);}
 if(has('weapon'))tint(keys.has('burningAttack')?'#eea164':'#bbc7d5',.1);
 if(has('weakened')||has('slow')){body.stance=.07;body.lean=.1;body.gait=.65;tint('#a89a88',.18);}
 if(has('stagger')){body.spread=1.14;body.x=Math.sin(phase)*.045;body.y=Math.cos(phase)*.025;tint('#ba9686',.13);}
 if(has('seal')){body.stance=.03;tint('#b39fb7',.12);}
 if(has('disarm'))body.lean=-.085;
 if(has('root'))body.stance=.065;
 if(has('taunt')){body.lean=.08;body.stance=-.02;tint('#d6a18c',.1);}
 if(has('recovery'))tint('#aecba3',.12);
 if(has('concealed')){body.opacity=keys.has('stasis')?.55:keys.has('decoy')?.62:.75;tint('#a6b9b0',.14);}
 if(has('burn')){body.lean+=Math.sin(t*9+phase)*.018;tint('#e7a06d',.15);}
 if(has('plague')){body.stance=.1;body.lean=.12+Math.sin(t*2+phase)*.025;body.gait=.65;tint('#a2ad78',.2);}
 if(has('stun')){body.stance=.09;body.lean=Math.sin(t*3+phase)*.075;body.gait=0;}
 if(has('confuse')){body.spread=1.12;body.turn=Math.floor(t*.9+index*.7)%4;body.x+=Math.sin(t*2+phase)*.055;body.y+=Math.cos(t*1.6+phase)*.025;body.lean=Math.sin(t*2+phase)*.065;}
 if(reduced){body.x=0;body.y=0;body.lean=0;body.turn=0;body.stance=0;body.spread=1;body.gait=0;}
 return body;
}
export const troopFormation=type=>type==='cavalry'?[[-.23,-.12],[.22,-.12],[0,.08]]:[[-.27,-.16],[0,-.16],[.27,-.16],[-.27,.08],[0,.08],[.27,.08]];
export function troopAttackFrame(progress,index=0){
 // Each rank readies separately and reaches the striking frame at .52.
 const delay=(index%3)*.018,p=clamp(progress);
 return p<.52?clamp((p-delay)/(.52-delay))*.65:.65+(p-.52)/.48*.35;
}
export function troopBodyAnchors(fx,id,p,cell,type){
 const anchors=id&&fx.bodyAnchors?.(id);
 return anchors?.length?anchors:troopFormation(type).map(([x,y])=>({x:p.x+x*cell,y:p.y+(y+.03)*cell,size:cell*.5,facing:0}));
}
function mark(c,x,y,x2,y2,color,alpha,width=1.4){
 c.globalAlpha=clamp(alpha);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();
}
export function drawArmorProtection(fx,p,cell,{id,alpha=.6,color='#9bcbd7',pulse=0}={}){
 const c=fx.ctx;c.save();
 for(const b of troopBodyAnchors(fx,id,p,cell)){
  const s=b.size,x=b.x+s*.17*(b.facing||1),y=b.y-s*.37;
  c.globalAlpha=alpha*(.45+pulse*.4);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.2+pulse;
  c.beginPath();c.moveTo(x-s*.11,y-s*.14);c.lineTo(x+s*.11,y-s*.14);c.lineTo(x+s*.095,y+s*.04);c.lineTo(x,y+s*.14);c.lineTo(x-s*.095,y+s*.04);c.closePath();c.stroke();
  c.globalAlpha=alpha*.1;c.fill();
 }
 c.restore();
}
export function drawTroopStatuses(fx,u,p,cell,time){
 const c=fx.ctx,keys=new Set(u.statuses.map(s=>s.key)),channels=new Set(u.statuses.map(s=>STATUS_BODY_CHANNELS[s.key]));
 const has=k=>channels.has(k),t=fx.reduced?0:time,anchors=troopBodyAnchors(fx,u.id,p,cell,u.type);
 c.save();
 if(has('protection'))drawArmorProtection(fx,p,cell,{id:u.id,color:keys.has('commandInvincible')||keys.has('peachInvincible')?'#cdbd86':'#94b9c6',alpha:.48});
 for(const [i,b]of anchors.entries()){
  const s=b.size,x=b.x,y=b.y,phase=i*1.7;
  if(has('burn'))for(let j=0;j<2;j++){
   const xx=x+(j-.5)*s*.27,top=y-s*(.28+(Math.sin(t*8+phase+j)+1)*.1);
   c.globalAlpha=.7;c.fillStyle=j?'#d4773b':'#e8ba70';c.beginPath();c.moveTo(xx-s*.07,y-s*.08);c.quadraticCurveTo(xx-s*.12,top,xx+s*.015,top-s*.12);c.quadraticCurveTo(xx+s*.1,top+s*.1,xx+s*.06,y-s*.08);c.fill();
  }
  if(has('plague')){
   const q=(t*.4+i*.2)%1;c.globalAlpha=(1-q)*.45;c.fillStyle='#a7b080';c.fillRect(x+s*.2,y-s*(.28+q*.35),Math.max(1,s*.04),Math.max(1,s*.05));
  }
  if(has('stun')||has('confuse')){
   const xx=x+Math.sin(t*2+phase)*s*.12,yy=y-s*.8;
   mark(c,xx-s*.055,yy,xx+s*.055,yy,has('stun')?'#c9b882':'#b6a3be',.75);
   mark(c,xx,yy-s*.055,xx,yy+s*.055,has('stun')?'#c9b882':'#b6a3be',.75);
  }
  if(has('root')||has('brace')){
   const color=has('root')?'#9b8264':'#abb6ac';
   mark(c,x-s*.2,y-s*.05,x+s*.18,y-s*.08,color,.6);
   if(has('root'))mark(c,x-s*.06,y-s*.18,x+s*.08,y+s*.02,color,.6);
  }
  if(has('seal')){
   c.globalAlpha=.65;c.fillStyle='#c4b38f';c.fillRect(x-s*.07,y-s*.48,s*.13,s*.2);
   mark(c,x-s*.03,y-s*.46,x+s*.03,y-s*.32,'#955b55',.8,1);
  }
  if(has('stagger')){
   mark(c,x-s*.09,y-s*.47,x+s*.03,y-s*.34,'#9b7770',.7);
   mark(c,x+s*.03,y-s*.34,x-s*.04,y-s*.25,'#9b7770',.7);
  }
  if(has('weakened')||has('slow')||has('disarm'))mark(c,x+s*.2,y-s*.17,x+s*.12,y-s*.03,'#ad9a83',.45);
  if(has('recovery')){
   const q=(t*.55+i*.18)%1;mark(c,x-s*.12,y-s*(.2+q*.45),x+s*.03,y-s*(.25+q*.45),'#a6c6a1',(1-q)*.7);
  }
  if(has('force')||has('weapon')||has('taunt')){
   const color=keys.has('burningAttack')?'#dc9a61':has('taunt')?'#c3927c':'#c9b888';
   mark(c,x+s*.18,y-s*.35,x+s*.26,y-s*.6,color,.45+(Math.sin(t*3+phase)+1)*.1);
  }
  if(has('swift'))mark(c,x-s*.27,y-s*.13,x-s*.12,y-s*.18,'#c8bf9d',.38);
  if(has('concealed'))mark(c,x-s*.15,y-s*.38,x+s*.08,y-s*.41,'#aabeb6',.25);
  if(has('spent'))mark(c,x-s*.08,y-s*.32,x+s*.05,y-s*.3,'#b0aaa0',.3);
 }
 c.restore();
}
