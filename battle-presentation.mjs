import {TACTIC_DESIGNS} from './data/design/tactics.mjs';
import {hidden} from './battle-status-rules.mjs';

const byName=new Map(Object.values(TACTIC_DESIGNS).map(s=>[s.name,s]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// All inputs are completed, observable engine events. No target prediction,
// random draws or writes to battle state belong in the presentation layer.
export function battleActionKind(e){
 const s=byName.get(e.label);
 if(e.healing>0)return 'heal';
 if((e.targetSide!==undefined&&e.targetSide===e.side)||e.from===e.to){
  if(/护盾|免伤|无敌/.test(e.text||'')||s?.effect==='protect')return 'shield';
  return 'support';
 }
 if(['charge','volley','fire'].includes(e.visual))return e.visual;
 if(e.resolution||s?.control||['undermine','harass','suppress','confuse','seal','taunt','status'].includes(s?.effect))return 'control';
 return 'strike';
}

export function battleOutcomeTags(events){
 const rows=events.find(e=>e.outcome)?.outcome||[];
 return new Map(rows.map(row=>[row.id,{...row,tags:[...new Set((row.changes||[])
  .filter(s=>!/^未?暴击|^冷却|^位移/.test(s)).map(s=>s.split(/[（：]/u)[0]))].slice(0,2)}]));
}

export function groupBattleActions(events){
 const groups=[],keys=new Map();
 for(const e of events){
  const key=[e.from,e.label,!!e.skill,e.abilityKind||'',!!e.ongoing,!!e.combo].join(':');
  let group=keys.get(key);
  if(!group){group={events:[],kind:battleActionKind(e)};keys.set(key,group);groups.push(group);}
  group.events.push(e);
 }
 // A genuine link accompanies its originating skill, including every hit.
 for(const group of [...groups])if(group.events[0].combo){
  const e=group.events[0],origin=groups.find(g=>g!==group&&g.events[0].from===e.from&&g.events[0].skill&&!g.events[0].ongoing&&!g.events[0].combo);
  if(origin){origin.events.push(...group.events);groups.splice(groups.indexOf(group),1);}
 }
 return groups;
}

export function scheduleBattleActions(events,{clock=0,speed=1,isMajor=()=>false}={}){
 let cursor=clock,end=clock;
 return groupBattleActions(events).map(group=>{
  const e=group.events[0],major=isMajor(group.events),important=major||e.skill&&!e.ongoing&&!e.enchantment;
  // Ordinary attacks overlap slightly in engine order. A skill gets a clean
  // source/trajectory/impact window; the next action cannot cover its result.
  if(important)cursor=Math.max(cursor,end);
  const duration=major?clamp(1900/Math.sqrt(speed),1400,2300):important?Math.max(560,820/Math.sqrt(speed)):Math.max(280,520/Math.sqrt(speed));
  const action={...group,major,important,start:cursor,duration,end:cursor+duration};
  end=Math.max(end,action.end);
  cursor=important?action.end:cursor+Math.max(22,48/Math.sqrt(speed));
  return action;
 });
}

export function observedUnitAction(b,u){
 const visible=b.sides.flatMap(s=>s.units).filter(t=>t.status==='active'&&(t.side===0||!hidden(b,t)));
 const events=(b.effects||[]).filter(e=>e.from===u.id&&!e.ongoing&&e.damageKind!=='dot'&&!e.intentOnly&&e.phase!=='cast');
 const event=events.find(e=>e.skill)||events.find(e=>e.damage>0||e.healing>0||e.shieldAbsorbed>0);
 const target=visible.find(t=>t.id===event?.to);
 if(event)return {text:event.skill?event.label:event.healing?'救治':'攻击',targetId:target?.id,targetName:target?.name};
 const moving=visible.find(t=>u.action===`接近${t.name}`);
 if(moving)return {text:'接近',targetId:moving.id,targetName:moving.name};
 return {text:({候命:'候命','重整攻势':'交战','调整阵线':'调整','策应队友':'策应','脱战准备':'脱战','迟滞行军':'行军','眩晕':'眩晕','混乱 · 阵位失序':'混乱','避战 · 无敌':'避战'})[u.action]||(u.withdrawing?'撤离':u.action?.startsWith('攻击')?'交战':'待机')};
}

// Place compact identity flags inside the board. Stable ID order and a small
// preference for the previous position prevent labels swapping on every hit.
export function placeBattleCaptions(entries,width,height,previous=new Map()){
 const placed=[],result=new Map(),padding=3;
 const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width+padding,b.x+b.width+padding)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height+padding,b.y+b.height+padding)-Math.max(a.y,b.y));
 for(const entry of [...entries].sort((a,b)=>a.id.localeCompare(b.id))){
  const {id,x,y}=entry,w=Math.min(entry.width,width-4),h=Math.min(entry.height,height-4);
  const offsets=[[0,0],[0,-h-12],[0,h+8],[-w*.65,-h*.6],[w*.65,-h*.6],[-w,0],[w,0],[0,-h*2-16],[0,h*2+16]];
  for(let radius=1;radius<=4;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===radius)offsets.push([dx*(w+padding),dy*(h+padding)]);
  const candidates=offsets.map(([dx,dy])=>({x:clamp(x-w/2+dx,2,width-w-2),y:clamp(y+dy,2,height-h-2),width:w,height:h}));
  const old=previous.get(id);
  const cost=p=>placed.reduce((n,q)=>n+overlap(p,q)*1000,0)+Math.hypot(p.x+w/2-x,p.y-y)+(old?Math.hypot(p.x-old.x,p.y-old.y)*.12:0);
  candidates.sort((a,b)=>cost(a)-cost(b));const best=candidates[0];placed.push(best);result.set(id,best);
 }
 return result;
}
