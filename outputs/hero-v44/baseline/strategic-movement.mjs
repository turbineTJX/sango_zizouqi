// Road variants are deterministic map data, shared by both factions.
const node=(s,id)=>s.cities.find(c=>c.id===id);
export const roadDistance=(s,a,b)=>Math.max(30,Math.round(Math.hypot(node(s,a).x-node(s,b).x,node(s,a).y-node(s,b).y)/2));
export function campaignRoads(s,a,b){
  if(!s.roads.some(([x,y])=>x===a&&y===b||x===b&&y===a))return [];
  const x=node(s,a),y=node(s,b),distance=roadDistance(s,a,b);
  const water=x.kind==='port'&&y.kind==='port',mountain=x.kind==='gate'||y.kind==='gate';
  const terrain=water?'水路':mountain?'山道':'官道';
  return [{id:'main',name:terrain,cost:Math.ceil(distance*(water?1.15:mountain?1.5:1)),offset:-9},
    {id:'side',name:water?'沿岸水路':mountain?'盘山支路':'乡野支路',cost:Math.ceil(distance*(water?1.55:mountain?2:1.35)),offset:18}];
}
export function movementPoints(a){
  const units=a.units.filter(u=>u.troops>0);
  if(!units.length)return 0;
  const base=Math.min(...units.map(u=>({cavalry:42,siege:16,ship:24,halberd:24}[u.type]||28)));
  const leader=units.find(u=>u.id===a.leader)||units[0];
  const command=.85+Math.max(0,Math.min(100,leader.leadership||0))*.003;
  const morale=.75+Math.max(0,Math.min(100,a.morale))*.003125;
  const hunger=1-(a.hunger>=3?.3:a.hunger>=1?.2:a.hunger>0?.1:0);
  return Math.round(base*command*morale*hunger*1000)/1000;
}
export function chosenRoad(s,a,b,policy='auto'){
  const roads=campaignRoads(s,a,b);
  return policy==='auto'?roads.reduce((best,r)=>!best||r.cost<best.cost?r:best,null):roads.find(r=>r.id===policy);
}
export const roadCost=(s,a,b,policy='auto')=>chosenRoad(s,a,b,policy)?.cost??Infinity;
export function roadPoint(from,to,p,road='main'){
  // Canonical orientation keeps both directions on the same physical curve.
  const sign=from.id<to.id?1:-1,dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy)||1;
  const bend=2*p*(1-p)*(road==='side'?18:-9)*sign;
  return {x:from.x+dx*p-dy/length*bend,y:from.y+dy*p+dx/length*bend};
}
export function roadPath(from,to,road='main',start=0){
  return Array.from({length:17},(_,i)=>{const p=roadPoint(from,to,start+(1-start)*i/16,road);return `${i?'L':'M'}${p.x} ${p.y}`;}).join('');
}
export function renderRoads(s,anchors=null){
  const at=id=>({...node(s,id),...(anchors?.[id]||{})});
  return s.roads.flatMap(([a,b])=>campaignRoads(s,a,b).map(r=>`<path d="${roadPath(at(a),at(b),r.id)}" class="strategy-road ${r.id==='side'?'strategy-side-road':''}" ><title>${node(s,a).name}—${node(s,b).name} · ${r.name} · 消耗 ${r.cost} 行动力</title></path>`)).join('');
}
export function renderMarchRoute(s,a,anchors=null){
  if(!a?.route.length)return '';
  const at=id=>({...node(s,id),...(anchors?.[id]||{})});let from=a.location;
  return a.route.map((to,i)=>{const road=i===0&&a.travel?(a.travel.road||'main'):chosenRoad(s,from,to,a.roadPolicy)?.id;
    const start=i===0&&a.travel?a.travel.progress/roadDistance(s,from,to):0;
    const path=`<path class="strategy-order-path" d="${roadPath(at(from),at(to),road,start)}"/>`;from=to;return path;}).join('');
}
export function renderSupplyRoute(s,a,link,anchors=null){
  if(!link)return '';
  const at=id=>({...node(s,id),...(anchors?.[id]||{})});
  let result=link.path.slice(1).map((to,i)=>`<path class="strategy-supply-path" d="${roadPath(at(link.path[i]),at(to),link.roads[i])}"/>`).join('');
  if(a.travel){const t=a.travel,p=t.progress/roadDistance(s,t.from,t.to);
    const points=Array.from({length:17},(_,i)=>{const v=roadPoint(at(t.from),at(t.to),p*i/16,t.road||'main');return `${i?'L':'M'}${v.x} ${v.y}`;}).join('');
    result+=`<path class="strategy-supply-path" d="${points}"/>`;
  }
  return result;
}
