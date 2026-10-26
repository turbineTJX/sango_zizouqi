// Model-space choreography. Sampling the same presentation time always returns
// the same pose; no wall-clock time, combat state or random source is involved.
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const easePose=n=>{const p=clamp(n);return p*p*(3-2*p);};
const TAU=Math.PI*2,fract=n=>n-Math.floor(n);
const window=(p,a,b)=>easePose((p-a)/(b-a));

export function solveLeg(z,lift=0,hipHeight=.73,{upper=.35,lower=.31,ankle=.07}={}){
 const down=hipHeight-ankle-lift,distance=clamp(Math.hypot(z,down),Math.abs(upper-lower)+.0001,upper+lower-.0001);
 const hip=Math.atan2(-z,down)-Math.acos(clamp((upper*upper+distance*distance-lower*lower)/(2*upper*distance),-1,1));
 const knee=Math.PI-Math.acos(clamp((upper*upper+lower*lower-distance*distance)/(2*upper*lower),-1,1));
 return {hip,knee,ankle:-hip-knee};
}

export function sampleFoot(cycle,{stride=.34,height=.12,stance=.62}={}){
 const p=fract(cycle),standing=p<stance,t=standing?p/stance:(p-stance)/(1-stance);
 return {z:standing?stride*(.5-t):stride*(easePose(t)-.5),lift:standing?0:Math.sin(Math.PI*t)*height,planted:standing};
}

export function sampleTroopPose({type='spear',family='spear',progress=1,time=0,index=0,moving=false,moveProgress=fract(time/1.2),state={},kind='strike',reaction=0,guardImpact=0,reduced=false,death=0}={}){
 const p=clamp(progress),mounted=family==='cavalry',ranged=family==='archer',magic=['heal','shield','support','control','fire'].includes(kind);
 const active=p<1&&!state.blocked&&!reduced&&death<=0,weight=active?window(p,0,.12)*(1-window(p,.78,1)):0;
 const ready=active?window(p,(index%2)*.012,.24)*(1-window(p,.58,1)):0;
 const strike=active?window(p,.24,.52)*(1-window(p,.57,1)):0;
 const draw=active&&!magic?window(p,0,.22)*(1-window(p,.24,.31)):0;
 const walk=moving&&!state.rooted&&!reduced&&death<=0?easePose(moveProgress/.1)*(1-window(moveProgress,.84,1)):0;
 const cycle=moveProgress*(mounted?1.5:1)+index*.067,phase=cycle*TAU,pace=clamp(state.gait??1,.45,1.4);
 const impact=reduced?0:clamp(reaction/ .17),guard=reduced?0:clamp(guardImpact);
 const pose={bodyX:state.lean||0,bodyY:0,bodyZ:0,bodyDrop:-(state.stance||0)*.45,bodyForward:0,headX:0,headZ:0,
  arms:[{x:Math.sin(phase+Math.PI)*.28*walk,y:0,z:0},{x:Math.sin(phase)*.28*walk,y:0,z:0}],
  forearms:[-.28,-.28],weaponTilt:0,legs:[],horseLegs:[],horseBob:0,neck:0,tail:0,bowDraw:0,arrowVisible:true,flag:0,fall:0};
 if(!reduced){
  pose.bodyDrop+=Math.sin(time*1.8+index)*.006-(.028+Math.abs(Math.sin(phase*2))*.012)*walk;
  pose.bodyX+=walk*.035*pace-impact*.14;pose.headX=impact*.12;pose.headZ=state.channels?.includes('stun')?pose.bodyX*.5:0;
  pose.bodyZ=Math.sin(phase)*.025*walk;
  pose.flag=Math.sin(time*3.1)*.018+Math.sin(phase)*walk*.08;
 }
 if(active){
  if(magic){
   pose.arms[0].x=-.75*weight;pose.arms[1].x=-1.1*weight;pose.arms[1].z=-.15*weight;pose.forearms[1]=-.28-.4*weight;
   pose.bodyY=-.1*ready;pose.headX=-.07*weight;pose.weaponTilt=.15*weight;
  }else if(ranged){
   const aim=window(p,0,.18)*(1-window(p,.58,1)),crossbow=type==='crossbow',release=window(p,.24,.28)*(1-window(p,.32,.45));
   pose.arms[0].x=-(crossbow?.8:1.2)*aim;pose.arms[0].y=-.16*aim;pose.arms[0].z=-.16*aim;
   pose.arms[1].x=-(crossbow?.9:1.1)*aim+.1*release;pose.arms[1].y=(crossbow?-.15:-.4)*draw;pose.arms[1].z=(crossbow?.1:-.35)*draw;
   pose.forearms[0]=-.28-(crossbow?.65:.05)*aim;pose.forearms[1]=-.28-(crossbow?.3:1.05)*draw;
   pose.bodyY=-.16*aim;pose.bodyX-=.035*draw;pose.headX=.035*aim;
   pose.bowDraw=draw;pose.arrowVisible=p<.24||p>.88;
  }else if(family==='halberd'){
   pose.arms[1].x=.5*ready-1.65*strike;pose.arms[1].y=-.5*ready+.9*strike;pose.arms[1].z=-.3*ready+.35*strike;
   pose.arms[0].x=-.2*weight;pose.forearms[1]=-.28-.5*ready+.16*strike;
   pose.bodyY=-.28*ready+.48*strike;pose.bodyX+=.08*strike;pose.bodyDrop-=.035*ready;
   pose.weaponTilt=1.1*strike+.15*ready;
  }else{
   pose.arms[1].x=.32*ready-1.45*strike;pose.arms[1].y=.08*ready;pose.arms[1].z=.12*strike;
   pose.arms[0].x=-.3*weight;pose.forearms[1]=-.28-.18*ready-.12*strike;
   pose.bodyX-=.04*ready;pose.bodyX+=.13*strike;pose.bodyY=-.1*ready+.18*strike;pose.bodyForward=.065*strike;
   pose.weaponTilt=1.35*strike-.12*ready;
  }
 }
 // A blocked impact braces the shield arm; only real troop damage bends the
 // body and head back. Existing receipt timing supplies both inputs.
 if(!ranged){pose.arms[0].x-=guard*.35+impact*.12;pose.forearms[0]-=guard*.28;}
 if(!mounted)pose.bodyDrop-=strike*.025;
 if(death>0&&!reduced)pose.bodyDrop-=easePose(death/.4)*.13;
 const hipHeight=.73+pose.bodyDrop;
 for(let j=0;j<2;j++){
  if(mounted)pose.legs.push({hip:-.15+walk*.035*Math.sin(phase),knee:.48,ankle:-.33});
  else{
   const foot=sampleFoot(cycle+j*.5,{stride:.34*pace}),lunge=!state.rooted&&!ranged&&!magic?(j===0?.13:-.035)*strike:0;
   pose.legs.push(solveLeg(foot.z*walk+lunge,foot.lift*walk,hipHeight));
  }
 }
 if(mounted){
  const gait=walk*Math.sin(phase),bob=walk*((1-Math.cos(phase*2))*.017-.045);
  pose.horseBob=bob;pose.bodyDrop+=bob;pose.bodyX-=gait*.045;
  pose.neck=gait*.07;pose.tail=Math.sin(phase+.6)*walk*.15;
  for(let j=0;j<4;j++){
   const foot=sampleFoot(cycle+[0,.5,.5,0][j],{stride:.42*pace,height:.14,stance:.57});
   pose.horseLegs.push(solveLeg(foot.z*walk,foot.lift*walk,.82+bob,{upper:.36,lower:.39,ankle:.07}));
  }
 }
 if(death>0&&!reduced){pose.fall=easePose(death)*1.35;pose.headX+=easePose(death)*.2;}
 return pose;
}

export function sampleFacing(turn,target,time,reduced=false){
 if(!turn||reduced||time<turn.start)return {from:target,to:target,start:time,value:target};
 const value=turn.from+(turn.to-turn.from)*easePose((time-turn.start)/.16);
 if(Math.abs(Math.atan2(Math.sin(target-turn.to),Math.cos(target-turn.to)))<.00001)return {...turn,value};
 const delta=Math.atan2(Math.sin(target-value),Math.cos(target-value));
 return {from:value,to:value+delta,start:time,value};
}
