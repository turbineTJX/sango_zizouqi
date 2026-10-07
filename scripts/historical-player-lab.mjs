import {customSideEntries,swapCustomBattle} from '../custom-battle.mjs';
import assert from 'node:assert/strict';
import {historicalBattleDraft,HISTORICAL_BATTLES} from '../historical-battle-library.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {deployUnit,reserveDeploymentUnit,lockDeployment,stepBattle,configureBattleIntent,validateSave,issueCommand,battleStratagems,STRATAGEMS,COMMAND_RESOURCE} from '../engine.mjs';
import {frontlineCapacity} from '../army-trait-rules.mjs';
import {canOccupy} from '../battlefield.mjs';
import {hexDistance} from '../hex-grid.mjs';
import {sideBonds} from '../bonds.mjs';
import {formationCells} from '../bond-battlefield.mjs';
import {needsRemedy,statusOn} from '../battle-status-rules.mjs';
import {isTargetable,isMelee} from '../engagement.mjs';
import {chooseStratagemPoint,isAreaStratagem} from '../stratagem-area.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {makeOfficer} from '../engine.mjs';
import {fixedOwnAI} from './xiapi-player-lab.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';

export const HIST_DEV_SEEDS=Array.from({length:4},(_,i)=>310013+i*1009);
export const HIST_VALIDATION_SEEDS=Array.from({length:24},(_,i)=>5100011+i*15485863);
export const PLAYER_CASES=[
 {id:'guandu',side:1,name:'袁军',pressure:.9},
 {id:'chibi',side:1,name:'曹军水师',pressure:.9},
 {id:'yiling',side:1,name:'刘备军',pressure:.9},
 {id:'wuzhang',side:0,name:'蜀军',pressure:.9},
 {id:'hefei',side:0,name:'合肥守军',pressure:.75},
];
const ids={guandu:{he:'he',yan:'person-256',wen:'person-72',gao:'gao',ju:'ju',tian:'person-306',shao:'shao',shen:'person-304'},
 chibi:{cao:'cao',ren:'person-342',liao:'liao',xu:'person-291',he:'he',yu:'yu',jin:'jin',hong:'person-337',dian:'person-610',man:'person-568'},
 yiling:{liu:'person-636',feng:'person-537',nan:'person-430',sha:'person-237',chen:'person-453',fu:'person-542',liao:'person-646',wu:'person-210',ma:'person-520'},
 wuzhang:{zhu:'person-290',wei:'person-125',jiang:'person-137',wang:'person-46',yang:'person-576',dai:'person-513',yi:'person-439',ni:'person-408',wu:'person-163',liao:'person-646'},
 hefei:{liao:'liao',dian:'person-610',jin:'person-70'}};
const selected=(battle,keys)=>keys.map(k=>ids[battle][k]);
const types=(battle,values)=>Object.fromEntries(Object.entries(values).map(([k,v])=>[ids[battle][k],v]));
const make=(battle,id,keys,extra={})=>({id,name:id,starters:selected(battle,keys),formation:'center',policy:'control',queueStrategy:'synergy',...extra});
const focused=(battle,id,keys,extra={})=>make(battle,id,keys,{weights:Object.fromEntries(selected(battle,keys).map((id,i)=>[id,[9,8,6,5,4,2,1][i]])),...extra});
export const CANDIDATES={
 guandu:[
  make('guandu','先发双骑',['he','yan','wen','gao','ju','tian']),
  make('guandu','散阵谋士',['he','yan','ju','tian','shen','shao'],{formation:'spread'}),
  focused('guandu','骑兵双核',['he','yan','wen','gao','ju','tian'],{types:types('guandu',{he:'cavalry',gao:'cavalry',ju:'archer',tian:'spear'}),formation:'north',policy:'attack'}),
  focused('guandu','骑兵中路',['he','yan','wen','gao','ju','tian'],{types:types('guandu',{he:'cavalry',gao:'cavalry',ju:'archer',tian:'spear'}),policy:'attack'}),
  focused('guandu','军阵散阵',['he','yan','ju','tian','shen','shao'],{types:types('guandu',{he:'cavalry',ju:'archer',tian:'spear',shen:'halberd'}),formation:'formation',policy:'sustain'}),
  focused('guandu','军阵南路',['he','yan','ju','tian','shen','shao'],{types:types('guandu',{he:'cavalry',ju:'archer',tian:'spear',shen:'halberd'}),formation:'south',policy:'attack'}),
 ],
 chibi:[
  make('chibi','水军换首发',['cao','liao','xu','he','jin','hong','yu'],{formation:'naval'}),
  focused('chibi','水军集中',['cao','liao','xu','he','jin','hong','yu'],{formation:'naval',policy:'sustain'}),
  focused('chibi','水军军阵',['cao','ren','liao','jin','man','dian','yu'],{formation:'formation',policy:'sustain'}),
  focused('chibi','岸上混编',['cao','liao','ren','he','xu','jin','yu'],{types:types('chibi',{cao:'spear',liao:'halberd',ren:'halberd',he:'cavalry',xu:'halberd',jin:'spear',yu:'archer',hong:'spear',dian:'archer',man:'halberd'}),formation:'north',policy:'sustain'}),
  focused('chibi','岸上中路',['cao','liao','ren','he','xu','jin','yu'],{types:types('chibi',{cao:'spear',liao:'halberd',ren:'halberd',he:'cavalry',xu:'halberd',jin:'spear',yu:'archer',hong:'spear',dian:'archer',man:'halberd'}),policy:'control'}),
 ],
 yiling:[
  make('yiling','前军首发',['liu','feng','nan','sha','wu','ma']),
  focused('yiling','前军双核',['liu','feng','nan','sha','wu','ma'],{types:types('yiling',{sha:'halberd',wu:'spear',ma:'archer'}),policy:'sustain'}),
  focused('yiling','前军北路',['liu','feng','nan','sha','wu','ma'],{types:types('yiling',{sha:'halberd',wu:'spear',ma:'archer'}),formation:'north',policy:'sustain'}),
  focused('yiling','后备换阵',['liu','fu','nan','liao','wu','ma'],{types:types('yiling',{nan:'spear',wu:'spear',ma:'archer'}),formation:'formation',policy:'sustain'}),
  focused('yiling','开阔阵线',['liu','sha','feng','chen','nan','liao'],{types:types('yiling',{feng:'spear',sha:'halberd',nan:'archer'}),formation:'south',policy:'attack'}),
 ],
 wuzhang:[
  make('wuzhang','吴懿首发',['zhu','wei','jiang','wang','dai','wu']),
  focused('wuzhang','弓阵双核',['zhu','wei','jiang','wang','wu','dai'],{types:types('wuzhang',{wei:'halberd',jiang:'spear',wang:'archer'}),policy:'control'}),
  focused('wuzhang','弓阵北路',['zhu','wei','jiang','wang','wu','dai'],{types:types('wuzhang',{wei:'halberd',jiang:'spear',wang:'archer'}),formation:'north',policy:'control'}),
  focused('wuzhang','军阵克骑',['zhu','wei','jiang','wang','ni','yi'],{types:types('wuzhang',{wei:'halberd',jiang:'spear',wang:'archer',yi:'archer'}),formation:'formation',policy:'control'}),
  focused('wuzhang','聚势轮替',['zhu','wei','jiang','yi','liao','dai'],{types:types('wuzhang',{wei:'halberd',jiang:'spear',yi:'archer'}),policy:'sustain'}),
 ],
 hefei:[
  make('hefei','三将中路',['liao','jin','dian'],{intent:'hold',policy:'sustain'}),
  focused('hefei','张辽主核',['liao','jin','dian'],{types:types('hefei',{liao:'halberd',dian:'archer'}),intent:'hold',policy:'sustain'}),
  focused('hefei','三将军阵',['jin','liao','dian'],{types:types('hefei',{liao:'halberd',dian:'archer'}),formation:'formation',intent:'hold',policy:'sustain'}),
  focused('hefei','北岸牵制',['liao','jin','dian'],{types:types('hefei',{dian:'archer'}),formation:'north',intent:'hold',policy:'sustain'}),
  make('hefei','分散守备',['liao','jin','dian'],{formation:'spread',intent:'hold',policy:'sustain'}),
 ],
};

export function playerDraft(id,seed,{historicalSide=true}={}){
 const c=PLAYER_CASES.find(c=>c.id===id);assert.ok(c);
 const draft=historicalBattleDraft(id);draft.seed=seed;
 return historicalSide&&c.side?swapCustomBattle(draft):draft;
}
export function allocateTroops(draft,plan,ratio){
 const budget=Math.round(customSideEntries(draft,0).reduce((n,u)=>n+u.troops,0)*ratio/100)*100;
 const units=customSideEntries(draft,0),weights=plan.weights;
 assert.ok(budget>=units.length*1000);
 const caps=Object.fromEntries(units.map(u=>[u.id,troopCapacity(makeOfficer(u.id,1000,0,u.level,draft.seed))]));
 const front=weights?units.filter(u=>weights[u.id]>0):[],weight=front.reduce((n,u)=>n+weights[u.id],0);
 const fieldBudget=budget-(units.length-front.length)*1000;
 const targets=Object.fromEntries(units.map(u=>[u.id,weights?(weights[u.id]>0?fieldBudget*weights[u.id]/weight:1000):u.troops*ratio]));
 for(const u of units)u.troops=1000;
 for(let remaining=budget-units.length*1000;remaining>0;remaining-=100){
  const eligible=units.filter(u=>u.troops+100<=caps[u.id]).sort((a,b)=>targets[b.id]-b.troops-(targets[a.id]-a.troops)||a.id.localeCompare(b.id));
  assert.ok(eligible.length,'allocated budget exceeds real troop capacities');eligible[0].troops+=100;
 }
 assert.equal(units.reduce((n,u)=>n+u.troops,0),budget);return budget;
}

function setupFormation(b,plan){
 const ids=plan.starters||b.sides[0].units.filter(u=>u.status==='active').map(u=>u.id);
 assert.equal(new Set(ids).size,ids.length);assert.ok(ids.length<=frontlineCapacity(b,0));
 const original=new Map(b.sides[0].units.filter(u=>u.status==='active').map(u=>[u.id,{x:u.x,y:u.y}]));
 const freed=[...original].filter(([id])=>!ids.includes(id)).map(([,p])=>p);
 for(const u of b.sides[0].units.filter(u=>u.status==='active'))assert.equal(reserveDeploymentUnit(b,u.id),null);
 const units=ids.map(id=>b.sides[0].units.find(u=>u.id===id));assert.ok(units.every(Boolean));
 const occupied=new Set(),marks=formationCells(b,0);
 const sorted=plan.formation==='formation'?[...units].sort((a,c)=>(c.bondGrowth.levels.bondGuard||0)-(a.bondGrowth.levels.bondGuard||0)||ids.indexOf(a.id)-ids.indexOf(c.id)):units;
 let front=0,rear=0,ship=0;
 for(const [i,u]of sorted.entries()){
  const ranged=!isMelee(u)&&u.type!=='ship';
  let x=ranged?2:4,y=ranged?[3,4,0,7][rear++%4]:[3,4,2,5,0,7][front++%6];
  if(plan.formation==='north'){x=ranged?2:4;y=ranged?[0,2,3][(rear-1)%3]:[0,1,2,3,4,5][(front-1)%6];}
  if(plan.formation==='south'){x=ranged?2:4;y=ranged?[7,5,4][(rear-1)%3]:[7,6,5,4,3,2][(front-1)%6];}
  if(plan.formation==='spread'){x=i%2?2:4;y=[0,3,7,5,1,4,6][i];}
  if(u.type==='ship'){x=ship<4?4:3;y=[2,3,4,5][ship++%4];}
  if(plan.formation==='original'){const p=original.get(u.id)||freed.shift();assert.ok(p);x=p.x;y=p.y;}
  if(plan.formation==='formation'&&i<3){x=marks[i].x;y=marks[i].y;}
  const cells=[];
  for(let cx=0;cx<5;cx++)for(let cy=0;cy<8;cy++)if(canOccupy(b,u,cx,cy)&&!occupied.has(cx+','+cy))cells.push({x:cx,y:cy,score:4*Math.abs(cx-x)+2*Math.abs(cy-y)});
  cells.sort((a,c)=>a.score-c.score||c.x-a.x||a.y-c.y);assert.ok(cells.length);const p=cells[0];
  assert.equal(deployUnit(b,u.id,p.x,p.y),null);occupied.add(p.x+','+p.y);
 }
 const reserves=b.sides[0].units.filter(u=>u.status==='reserve').map(u=>u.id);
 const priorities={guandu:['shen','tian','ju','gao','wen','yan','shao'],chibi:['ren','man','jin','dian','hong','he','xu','yu','liao','cao'],yiling:['fu','liao','chen','wu','ma','sha','feng','nan','liu'],wuzhang:['yi','liao','dai','ni','wu','yang','zhu','wei','jiang','wang'],hefei:[]};
 const preferred=plan.queueStrategy==='synergy'?selected(b.mapId,priorities[b.mapId]).filter(id=>reserves.includes(id)):[];
 const queue=plan.queue?[...plan.queue]:[...preferred,...reserves.filter(id=>!preferred.includes(id))];
 if(plan.reverseQueue)queue.reverse();
 assert.deepEqual([...queue].sort(),[...reserves].sort());
 for(const id of queue)assert.equal(reserveDeploymentUnit(b,id),null);
}

export function historicalPlayerState(id,plan,seed,{ratio=1,lock=true,historicalSide=true}={}){
 const draft=playerDraft(id,seed,{historicalSide});allocateTroops(draft,plan,ratio);
 for(const u of draft.ownTeam)if(plan.types?.[u.id])u.type=plan.types[u.id];
 const state=generateBattle(draft),b=state.battle;
 if(plan.controller==='ai')fixedOwnAI(b);
 else if(plan.starters||plan.formation)setupFormation(b,plan);
 assert.equal(configureBattleIntent(b,plan.intent||(draft.battleKind==='defense'?'hold':'annihilate')),null);
 if(lock)assert.equal(lockDeployment(b),null);validateSave(structuredClone(state));return state;
}

export function humanOrder(b,plan){
 if(b.result||b.commandProgress<COMMAND_RESOURCE.capacity||plan.policy==='none')return null;
 if(plan.policy==='fixed'){const key=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);return key?{key,point:chooseStratagemPoint(b,STRATAGEMS[key],0)}:null;}
 const own=b.sides[0].units.filter(u=>u.status==='active'&&u.hp>0),foes=b.sides[1].units.filter(u=>u.status==='active'&&u.hp>0&&isTargetable(b,u));
 const contact=own.some(u=>foes.some(e=>hexDistance(u,e)<=3)),near=own.some(u=>foes.some(e=>hexDistance(u,e)<=5));
 const hurt=own.filter(u=>u.hp<u.initial*.8&&Math.floor((u.battleDamage-(u.battleDeserted||0))*.35)>u.healed);
 const afflicted=own.filter(u=>needsRemedy(b,u,'calm')),cores=(plan.starters||[]).slice(0,2);
 const checks={cleanse:()=>afflicted.length>=2||afflicted.some(u=>cores.includes(u.id)),
  magicImmunity:()=>near&&(foes.some(u=>u.intent>=30)||own.some(u=>statusOn(b,u,'burn'))),
  heal:()=>hurt.length>=2||hurt.some(u=>cores.includes(u.id)&&u.hp<u.initial*.5),
  regenerate:()=>hurt.length>=2,fortify:()=>contact,
  eightFormation:()=>contact&&foes.some(u=>u.intent>=20),firestorm:()=>contact,
  assault:()=>contact,disrupt:()=>contact,inspire:()=>contact&&own.filter(u=>u.intent<65).length>=2,
  cycle:()=>contact&&own.some(u=>u.intent<75||Object.values(u.skillReady).some(t=>t>b.tick)),haste:()=>near,
  demoralize:()=>contact&&foes.some(u=>u.intent>=50),range:()=>contact,
  rapidAdvance:()=>near,blockade:()=>contact,relief:()=>hurt.length>=2};
 const priorities=plan.policy==='sustain'?['magicImmunity','cleanse','heal','regenerate','fortify','eightFormation','disrupt','inspire','assault','cycle','haste']:
  plan.policy==='attack'?['cleanse','heal','magicImmunity','eightFormation','firestorm','assault','inspire','disrupt','fortify','cycle','regenerate','haste']:
  ['cleanse','magicImmunity','eightFormation','disrupt','heal','inspire','fortify','firestorm','assault','cycle','regenerate','haste'];
 const available=battleStratagems(b);
 for(const effect of priorities)for(const key of available){
  const s=STRATAGEMS[key];if((s.effect||key)!==effect||!checks[effect]?.()||(b.commandReady[key]||0)>b.tick)continue;
  if(s.field&&(b.sides[s.side][s.field]||0)>b.tick||s.maxUses&&(b.sides[0].stratagemUses[key]||0)>=s.maxUses)continue;
  const point=chooseStratagemPoint(b,s,0);if(isAreaStratagem(s)&&!point)continue;return {key,point};
 }
 return null;
}

const openingView=b=>({bonds:b.sides.map((_,side)=>sideBonds(b,side)),commanders:b.sides.map(s=>s.commanders),commands:battleStratagems(b),units:b.sides.map(s=>s.units.map(u=>({id:u.id,name:u.name,type:u.type,troops:u.initial,status:u.status,x:u.x,y:u.y,tactics:[...u.tactics],bonds:{...u.bondGrowth.levels}})))});
export function fightHistorical(id,plan,seed,{ratio=1,replay=false,historicalSide=true,trace=false}={}){
 const state=historicalPlayerState(id,plan,seed,{ratio,historicalSide}),b=state.battle,opening=openingView(b),orders=[],changes=[],bondSignals={},sourceNames=new Set(Object.values(BOND_DESIGNS).map(d=>d.name));
 let copy,last=JSON.stringify(opening.bonds),field=b.sides[0].units.filter(u=>u.status==='active').map(u=>u.id);
 while(!b.result){
  const controllers=plan.controller==='ai'?{aiSides:[0,1]}:{pauseForReinforcements:false};stepBattle(b,controllers);if(copy)stepBattle(copy.battle,controllers);
  if(plan.controller!=='ai'){const order=humanOrder(b,plan);if(order){assert.equal(issueCommand(b,order.key,order.point),null);if(copy)assert.equal(issueCommand(copy.battle,order.key,order.point),null);orders.push({tick:b.tick,...order});}}
  const bonds=b.sides.map((_,side)=>sideBonds(b,side)),signature=JSON.stringify(bonds),now=b.sides[0].units.filter(u=>u.status==='active').map(u=>u.id);
  if(signature!==last||now.join()!==field.join()){changes.push({tick:b.tick,bonds,entered:now.filter(id=>!field.includes(id)),exited:field.filter(id=>!now.includes(id))});last=signature;field=now;}
  for(const e of b.effects){const name=sourceNames.has(e.label)?e.label:e.text?.includes('勇武')?'勇武':null;if(name)bondSignals[name]=(bondSignals[name]||0)+1;}
  if(replay&&b.tick===12)copy=validateSave(structuredClone(state));
 }
 if(copy)assert.deepEqual(copy.battle,b);validateSave(structuredClone(state));
 return {battle:id,plan:plan.id,seed,ratio,controller:plan.controller||'human',winner:b.result.winner,reason:b.result.reason,ticks:b.tick,
  budgets:b.sides.map(s=>s.units.reduce((n,u)=>n+u.initial,0)),remaining:b.sides.map(s=>s.units.filter(u=>['active','reserve'].includes(u.status)).reduce((n,u)=>n+u.hp,0)),gate:b.siege?.gate.hp,
  opening,orders,changes,bondSignals,units:b.sides.map(s=>s.units.map(u=>({id:u.id,name:u.name,initial:u.initial,hp:u.hp,status:u.status,contribution:u.contribution,casts:u.tacticCasts}))),...(trace?{state}: {})};
}
export function summarizeHistorical(rows){const wins=rows.filter(r=>r.winner===0).length;return {n:rows.length,wins,draws:rows.filter(r=>r.winner===null).length,losses:rows.filter(r=>r.winner===1).length,winRate:wins/rows.length,
 remaining:rows.reduce((n,r)=>n+r.remaining[0]-r.remaining[1],0)/rows.length,reasons:Object.fromEntries([...new Set(rows.map(r=>r.reason))].map(reason=>[reason,rows.filter(r=>r.reason===reason).length]))};}
export const BASE_AI={id:'固定AI',controller:'ai'};
export const BASE_PLAYER={id:'原阵手动军略',policy:'control'};
export const historyName=id=>HISTORICAL_BATTLES.find(h=>h.id===id).name;
