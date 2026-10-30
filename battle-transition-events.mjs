import {hidden} from './battle-status-rules.mjs';

// Observe real state changes once. Baselines include hidden units so revealing
// an existing soldier never masquerades as an arrival or an old defeat.
export class BattleTransitionReader {
 constructor(){this.reset();}
 reset(){this.battle=null;this.previous=null;this.tick=0;}
 read(b,{silent=false}={}){
  if(!b){this.reset();return [];}
  const units=b.sides.flatMap(s=>s.units),next=new Map(units.map(u=>[u.id,{
   id:u.id,name:u.name,side:u.side,type:u.type,x:u.x,y:u.y,hp:u.hp,status:u.status,isDecoy:!!u.isDecoy,
   retreat:!!u.withdrawing||!!b.sides[u.side].retreat,visible:u.side===0||!hidden(b,u)
  }]));
  const previous=this.battle===b&&b.tick>=this.tick?this.previous:null;
  this.battle=b;this.previous=next;this.tick=b.tick;
  if(!previous||silent||!b.deploymentLocked)return [];
  const events=[];
  for(const [id,u]of next){
   const old=previous.get(id);
   if(u.isDecoy||!u.visible)continue;
   let kind;
   if(old?.status==='active'&&old.hp>0&&old.visible){
    if(u.status==='defeated'&&u.hp===0)kind='rout';
    else if(u.status==='withdrawn'&&u.hp>0)kind='exit';
    else if(u.status==='active'&&u.hp>0&&u.retreat&&!old.retreat)kind='retreat';
   }else if(u.status==='active'&&u.hp>0&&(!old||old.status==='reserve'))kind='entry';
   if(kind)events.push({...u,kind,tick:b.tick});
  }
  return events;
 }
}
