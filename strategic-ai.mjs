import {armyTroops,issueCommand} from './engine.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {canTrain,reservedMen} from './domestic.mjs';
import {nationalScenario} from './national-scenarios.mjs';

export const STRATEGIC_AI={version:1,attackRatio:1.3,foodDays:5};
export function initializeStrategicAI(s){
 const factions=[...new Set(s.cities.map(c=>c.owner))].filter(f=>!['cao','neutral'].includes(f));
 s.campaign.ai={version:STRATEGIC_AI.version,treasuries:Object.fromEntries(factions.map(f=>[f,s.gold])),lastPlanDay:0,lastEconomyTurn:0,decisions:[]};
}
const town=(s,id)=>s.cities.find(c=>c.id===id);
const fighting=(s,id)=>s.campaign.battles.find(b=>!b.settled&&b.armyIds.includes(id));
const besieged=(s,id)=>s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===id);
const enemy=a=>!['cao','neutral'].includes(a.faction)&&!a.disbanded;
const foodUse=a=>a.units.reduce((n,u)=>n+u.troops/100+u.wounded/200,0);
export function strategicPower(s,a){
 const b=fighting(s,a.id),units=b?b.battle.sides.flatMap(x=>x.units).filter(u=>u.armyId===a.id):a.units;
 return units.reduce((n,u)=>n+(u.hp??u.troops)*(.7+u.leadership/200+u.force/500+u.intellect/800),0)*(.7+a.morale/250)*(1-Math.min(.4,a.hunger*.1));
}
function record(s,a,kind,target,reason){
 const previous=s.campaign.ai.decisions.find(d=>d.armyId===a.id);
 if(previous?.kind===kind&&previous.target===target&&previous.reason===reason)return;
 s.campaign.ai.decisions.unshift({day:s.campaign.day,armyId:a.id,kind,target,reason});s.campaign.ai.decisions=s.campaign.ai.decisions.slice(0,80);
}
// One city quota shared by all armies, with the same manpower, grain and gold
// costs as player recruitment. No off-map soldiers or free resources.
export function manageStrategicEconomy(s){
 const ai=s.campaign.ai;if(ai.lastEconomyTurn===s.turn)return;ai.lastEconomyTurn=s.turn;
 for(const c of s.cities.filter(c=>Object.hasOwn(ai.treasuries,c.owner))){
  if(besieged(s,c.id))continue;
  let a=s.armies.find(a=>a.faction===c.owner&&a.location===c.id&&!a.travel&&!a.route.length&&!fighting(s,a.id)&&!a.detached);
  const idle=s.campaign.idle.filter(o=>o.faction===c.owner&&o.location===c.id&&!o.destination&&o.unit.id!==c.governor&&canTrain(c,o.unit.type));
  if(idle.length&&c.kind==='city'&&(!a||a.units.length<6)&&ai.treasuries[c.owner]>=500&&c.manpower>1000&&c.grain>2500){
   const selected=idle.slice(0,Math.max(0,6-(a?.units.length||0)));
   if(!a&&s.armies.length<200){const units=selected.map((o,i)=>({...o.unit,troops:0,first:i<6,homeCity:c.id}));a={id:`a${s.nextId++}`,name:`${c.name}大军团`,faction:c.owner,location:c.id,homeCity:c.id,route:[],target:null,travel:null,task:'整军',morale:75,tactic:'balanced',leader:units[0].id,advisor:[...units].sort((a,b)=>b.intellect-a.intellect)[0].id,deputy:units[1]?.id||null,units,supply:0,supplyCapacity:units.length*900,hunger:0,supplyIn:0,supplyLine:null,cooldownDay:0,stationary:false,detached:false};s.armies.push(a);}
   else if(a){a.units.push(...selected.map(o=>({...o.unit,troops:0,first:false,homeCity:c.id})));a.supplyCapacity+=selected.length*900;}
   if(a)s.campaign.idle=s.campaign.idle.filter(o=>!selected.includes(o));
  }
  const local=s.armies.filter(a=>a.faction===c.owner&&a.location===c.id&&!a.travel&&!a.route.length&&!fighting(s,a.id));
  let quota=Math.max(0,Math.floor(Math.min(c.manpower-reservedMen(c),2000+c.barracks*1000-c.drafted-reservedMen(c),ai.treasuries[c.owner]*4,Math.max(0,c.grain-2500))));
  let spent=0;
  for(const u of local.flatMap(a=>a.units).filter(u=>canTrain(c,u.type)).sort((a,b)=>a.troops-b.troops||a.id.localeCompare(b.id))){const n=Math.min(quota,Math.max(0,Math.min(troopCapacity(u),4500)-u.troops-u.wounded));u.troops+=n;spent+=n;quota-=n;if(!quota)break;}
  c.manpower-=spent;c.grain-=spent;c.drafted+=spent;ai.treasuries[c.owner]-=Math.ceil(spent/4);
  // Production must complete through the normal project queue at the turn boundary.
  if(!c.project&&c.kind==='city'&&ai.treasuries[c.owner]>2000){const key=c.grain<7000?'farm':c.barracks<2?'barracks':c.commerce<3?'commerce':null,cost=key==='barracks'?600:500;
   if(key&&c[key]<5){c.project={key,remaining:1};ai.treasuries[c.owner]-=cost;}
  }
 }
}
function routeTree(s,start,faction,length){
 const distance=new Map([[start,0]]),paths=new Map([[start,[]]]),todo=new Set(s.cities.map(c=>c.id));
 const adjacency=new Map(s.cities.map(c=>[c.id,[]]));for(const [a,b]of s.roads){adjacency.get(a).push(b);adjacency.get(b).push(a);}
 while(todo.size){const at=[...todo].sort((a,b)=>(distance.get(a)??Infinity)-(distance.get(b)??Infinity)||a.localeCompare(b))[0];if(!distance.has(at))break;todo.delete(at);if(at!==start&&town(s,at).owner!==faction)continue;
  for(const next of adjacency.get(at)){if(!todo.has(next))continue;const d=distance.get(at)+length(s,at,next);if(d<(distance.get(next)??Infinity)){distance.set(next,d);paths.set(next,[...paths.get(at),next]);}}
 }return {distance,paths};
}
function expeditionUnits(a){
 const active=a.units.filter(u=>u.troops>0).sort((x,y)=>Number([a.leader,a.advisor].includes(y.id))-Number([a.leader,a.advisor].includes(x.id))||y.leadership-x.leadership||x.id.localeCompare(y.id));
 return active.length<3?active:active.slice(0,Math.min(9,active.length-1));
}
function detach(s,a){
 const units=expeditionUnits(a),guards=a.units.filter(u=>!units.includes(u));
 if(!guards.length||s.armies.length>=200)return a;
 const ratio=guards.length/a.units.length,capacity=Math.floor(a.supplyCapacity*ratio),supply=Math.floor(a.supply*ratio);
 const reserve={...structuredClone(a),id:`a${s.nextId++}`,name:`${town(s,a.location).name}留守军`,units:guards,leader:guards[0].id,advisor:[...guards].sort((a,b)=>b.intellect-a.intellect)[0].id,deputy:guards[1]?.id||null,supply,supplyCapacity:capacity,stationary:true,route:[],target:null,detached:false};guards.forEach((u,i)=>u.first=i<6);
 a.units=units;a.supply-=supply;a.supplyCapacity-=capacity;for(const k of ['leader','advisor','deputy'])if(!units.some(u=>u.id===a[k]))a[k]=k==='deputy'?null:units[0].id;
 units.forEach((u,i)=>u.first=i<6);s.armies.push(reserve);return a;
}
export function planStrategicAI(s,{roadLength,supplyConnection}){
 const ai=s.campaign.ai;if(ai.lastPlanDay===s.campaign.day)return;ai.lastPlanDay=s.campaign.day;
 const cache=new Map(),tree=(from,f)=>{const k=from+':'+f;if(!cache.has(k))cache.set(k,routeTree(s,from,f,roadLength));return cache.get(k);};
 const neighbors=id=>s.roads.flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]);
 const strength=a=>strategicPower(s,a),local=(id,f)=>s.armies.filter(a=>!a.disbanded&&!a.travel&&a.location===id&&a.faction===f);
 const incoming=(id,f)=>s.armies.filter(a=>a.faction!==f&&!a.disbanded&&(a.target===id||a.travel?.to===id||fighting(s,a.id)?.cityId===id)).reduce((n,a)=>n+strength(a),0);
 const nearby=(id,f)=>s.armies.filter(a=>a.faction!==f&&!a.disbanded&&!a.travel&&neighbors(id).includes(a.location)).reduce((n,a)=>n+strength(a),0);
 const defense=c=>local(c.id,c.owner).reduce((n,a)=>n+strength(a),0)+c.gateHp/6;
 // Paths are cached for every army at this origin. Marching consumes route
 // entries, so each army needs its own array, including before a save/reload.
 const march=(a,target,path,kind,reason)=>{a.route=[...path];a.target=path.length?target:null;a.task=({attack:'择敌出征',reinforce:'增援守城',stage:'前线集结',retreat:'回城补给'})[kind];a.stationary=false;a.detached=false;record(s,a,kind,target,reason);};
 for(const a of [...s.armies].filter(enemy).sort((a,b)=>strength(b)-strength(a)||a.id.localeCompare(b.id))){
  const battle=fighting(s,a.id);
  if(battle){const side=battle.battle.sides.findIndex(x=>x.faction===a.faction),own=battle.battle.sides[side],foe=battle.battle.sides[1-side],hp=x=>x.units.reduce((n,u)=>n+u.hp,0);
   if(battle.battle.deploymentLocked&&!own.retreat&&(a.hunger>=2||hp(own)<own.units.reduce((n,u)=>n+u.initial,0)*.32&&hp(foe)>hp(own)*1.8)){issueCommand(battle.battle,'retreat',null,side);record(s,a,'retreat',a.homeCity,'战损过重或断粮，保存残部');}continue;
  }
  if(a.cooldownDay>s.campaign.day)continue;
  const c=town(s,a.location),consume=foodUse(a),link=supplyConnection(s,a),days=consume?a.supply/consume:99;
  if(a.hunger>=1||days<2&&!link||c.owner!==a.faction&&!a.route.length){
   if(a.task==='回城补给'&&a.route.length&&town(s,a.target)?.owner===a.faction)continue;
   const from=a.travel?.from||a.location,paths=tree(from,a.faction),homes=s.cities.filter(c=>c.owner===a.faction&&c.grain>=Math.max(1000,consume*5)&&!besieged(s,c.id)&&paths.paths.has(c.id)).sort((a,b)=>paths.distance.get(a.id)-paths.distance.get(b.id)||a.id.localeCompare(b.id));
   if(homes[0]){if(a.units.length>10){if(s.armies.length>=200){a.task='就地整编';continue;}detach(s,a);}const target=homes[0].id;if(a.travel){const t=a.travel;a.location=t.to;a.travel={from:t.to,to:t.from,progress:Math.max(0,roadLength(s,t.from,t.to)-t.progress)};march(a,target,[t.from,...paths.paths.get(target)],'retreat','粮草告急，沿现有道路退回粮仓');}else if(target!==a.location)march(a,target,paths.paths.get(target),'retreat','前线失去补给，回城恢复');else {a.route=[];a.target=null;a.task='就地补给';record(s,a,'recover',c.id,'本城粮仓补給，暂缓出征');}}continue;
  }
  if(a.travel||a.route.length)continue;
  if(!armyTroops(a)||a.morale<45||a.hunger>0){a.task='休整待补';record(s,a,'recover',c.id,'兵力或士气不足，留城整补');continue;}
  const paths=tree(c.id,a.faction),ownPower=strength(a),threat=incoming(c.id,a.faction),others=local(c.id,a.faction).filter(x=>x!==a).reduce((n,a)=>n+strength(a),0);
  if(threat>others+c.gateHp/6){a.task='守城待援';record(s,a,'hold',c.id,'敌军正在逼近，保留守军');continue;}
  const help=s.cities.filter(c=>c.owner===a.faction&&c.id!==a.location&&paths.paths.has(c.id)).map(c=>({c,need:incoming(c.id,a.faction)-local(c.id,a.faction).reduce((n,a)=>n+strength(a),0)-c.gateHp/6,d:paths.distance.get(c.id)})).filter(x=>x.need>0&&x.d<=220).sort((a,b)=>b.need-a.need||a.d-b.d||a.c.id.localeCompare(b.c.id));
  if(help.length&&a.units.length>1&&days>=2&&s.armies.length<200){detach(s,a);march(a,help[0].c.id,paths.paths.get(help[0].c.id),'reinforce','友城守备不足，优先增援');continue;}
  if(a.stationary||ownPower<2500){record(s,a,'hold',c.id,'维持关津与城池驻防');continue;}
  const targets=s.cities.filter(c=>c.owner!==a.faction&&paths.paths.has(c.id)&&!besieged(s,c.id)).map(c=>{const distance=paths.distance.get(c.id),targetDefense=defense(c),support=s.armies.filter(x=>x!==a&&x.faction===a.faction&&x.target===c.id).reduce((n,a)=>n+strength(a),0);return {c,distance,defense:targetDefense,support,score:({city:110,gate:75,port:55}[c.kind]||50)+c.commerce*6+(c.grain>6000?15:0)-distance*.3-targetDefense/500};}).filter(x=>x.distance<=240&&days>=Math.max(STRATEGIC_AI.foodDays,Math.ceil(x.distance/24)+2)&&c.grain>=consume*3).sort((a,b)=>b.score-a.score||a.c.id.localeCompare(b.c.id));
  const available=strategicPower(s,{...a,units:expeditionUnits(a)}),reserve=ownPower-available;
  const target=targets.find(x=>available+x.support>x.defense*STRATEGIC_AI.attackRatio&&x.support<x.defense*2&&nearby(c.id,a.faction)*.55<others+reserve+c.gateHp/6);
  if(target&&s.armies.length<200){detach(s,a);march(a,target.c.id,paths.paths.get(target.c.id),'attack','兵力占优且粮草充足，集中攻取'+target.c.name);continue;}
  // Rear armies join a frontier garrison before attacking a superior enemy.
  const fronts=s.cities.filter(x=>x.owner===a.faction&&x.id!==c.id&&paths.paths.has(x.id)&&!besieged(s,x.id)&&neighbors(x.id).some(id=>town(s,id).owner!==a.faction)).map(x=>({c:x,d:paths.distance.get(x.id),power:local(x.id,a.faction).reduce((n,a)=>n+strength(a),0)+s.armies.filter(a=>a.faction===x.owner&&a.target===x.id).reduce((n,a)=>n+strength(a),0)})).filter(x=>x.d<=240&&x.power<ownPower*2.5).sort((a,b)=>a.d-b.d||a.c.id.localeCompare(b.c.id));
  if(s.armies.length<200&&!neighbors(c.id).some(id=>town(s,id).owner!==a.faction)&&fronts.length&&days>=5&&a.units.length>=3){detach(s,a);march(a,fronts[0].c.id,paths.paths.get(fronts[0].c.id),'stage','从后方调兵，在前线集结后再战');}
  else {a.task=days<5?'整粮待发':'守势集结';record(s,a,'hold',c.id,days<5?'携粮不足五日，等待运输':'目标防守较强，守住据点等待援军');}
 }
}
export function validateStrategicAI(s){
 const ai=s.campaign.ai,fail=(ok,msg)=>{if(!ok)throw new Error(msg||'战略AI存档无效');},int=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 const factions=nationalScenario(s.campaign.scenarioId).factions.filter(f=>f!=='cao');
 fail(ai?.version===STRATEGIC_AI.version&&ai.treasuries&&Object.keys(ai.treasuries).length===factions.length&&factions.every(f=>int(ai.treasuries[f])));
 fail(int(ai.lastPlanDay,s.campaign.day)&&int(ai.lastEconomyTurn,s.turn)&&Array.isArray(ai.decisions)&&ai.decisions.length<=80);
 fail(ai.decisions.every(d=>int(d.day,s.campaign.day)&&d.day>0&&typeof d.armyId==='string'&&/^a\d+$/.test(d.armyId)&&['attack','reinforce','stage','hold','retreat','recover'].includes(d.kind)&&(d.target===null||town(s,d.target))&&typeof d.reason==='string'&&d.reason.length<=120&&!/[<>]/.test(d.reason)));
}
