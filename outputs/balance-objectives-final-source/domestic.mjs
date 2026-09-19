const isNationalCity=c=>!!c.kind;
import {makeOfficer,log,TROOPS,battleWounded} from './engine.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {domesticEffects} from './passives.mjs';
import {relationshipInfo} from './relationships.mjs';
import {domesticAbility,cooperationProfile,COOPERATION_MODES,growCooperationRelationship} from './domestic-cooperation.mjs';

export const DIRECTIONS=Object.freeze({commerce:'商业',agriculture:'农业',technology:'技术',military:'军事',talent:'人才'});
export const BUILDINGS=Object.freeze({
 commerce:{name:'市场',direction:'commerce',cost:500,days:10,description:'每级增加160金／旬'},
 farm:{name:'农田',direction:'agriculture',cost:500,days:10,description:'每级增加600粮／旬'},
 granary:{name:'粮仓',direction:'agriculture',cost:500,days:10,description:'库容+10000、每日发送能力+120'},
 workshop:{name:'工坊',direction:'technology',cost:700,days:20,description:'每级提高研发效率与试制把握'},
 barracks:{name:'兵营',direction:'military',cost:600,days:10,description:'预备兵收入+500／旬、征募额度+1000'},
 clinic:{name:'医馆',direction:'military',cost:500,days:10,description:'每级每队每日额外恢复6名真实伤兵'},
 drill:{name:'校场',direction:'military',cost:600,days:10,description:'每级守城首发战意+3，最高15'},
 walls:{name:'城防工事',direction:'military',cost:700,days:20,description:'耐久上限+3000、守城首发护盾比例+2%'},
 hall:{name:'招贤馆',direction:'talent',cost:600,days:10,description:'每级提高探索、登用成功把握'},
});
const spec=(name,direction,cost,days,kind,value,extra={})=>({name,direction,cost,days,kind,value,cooperation:COOPERATION_MODES[kind],...extra});
export const ACTIONS=Object.freeze({
 ...Object.fromEntries(Object.entries(BUILDINGS).map(([key,b])=>['build_'+key,spec('建设'+b.name,b.direction,b.cost,b.days,'build',key)])),
 fair:spec('举办集市','commerce',200,10,'cash',460),
 merchants:spec('招徕商旅','commerce',180,10,'effect','gold',{power:.25}),
 partnership:spec('招商合作','commerce',120,10,'discount','commerce'),
 sell:spec('出售余粮','commerce',30,10,'trade','sell'),
 tax:spec('整顿税务','commerce',100,10,'effect','gold',{power:.15}),
 cultivate:spec('督耕','agriculture',100,10,'grain',700),
 irrigate:spec('修整灌溉','agriculture',200,10,'effect','grain',{power:.3}),
 buy:spec('购粮','agriculture',330,10,'trade','buy'),
 harvest:spec('抢收保粮','agriculture',100,5,'rescue','disaster'),
 store:spec('整理仓储','agriculture',80,5,'rescue','mold'),
 research:spec('常规研制','technology',180,10,'research',24),
 breakthrough:spec('集中攻关','technology',400,10,'research',48,{risk:.15}),
 craftsmen:spec('寻访工匠','technology',100,10,'research',32,{risk:.2}),
 master:spec('聘请名匠','technology',450,10,'research',55,{opportunity:'master'}),
 imitate:spec('仿制改良','technology',120,10,'research',45,{opportunity:'capture'}),
 trial:spec('试制验证','technology',200,10,'trial',0),
 recruit:spec('常规征兵','military',60,10,'recruit',1400),
 urgent:spec('加急征兵','military',160,5,'recruit',1800,{risk:.15}),
 heal:spec('集中救治','military',160,5,'heal',300),
 recover:spec('精心疗养','military',80,10,'heal',450),
 repair:spec('常规修缮','military',160,10,'repair',3000),
 rush:spec('紧急抢修','military',320,5,'repair',3000,{risk:.12}),
 labor:spec('征集工匠','military',100,10,'discount','military'),
 inspect:spec('检查整固','military',60,5,'repair',1000),
 exercise:spec('守城操演','military',120,10,'prepare','intent',{power:12}),
 mobilize:spec('战前动员','military',220,5,'prepare','intent',{power:12,risk:.12}),
 fortify:spec('布置守备','military',180,10,'prepare','shield',{power:.1}),
 explore:spec('探索未知人才','talent',100,10,'explore',0),
 hire:spec('登用在野人才','talent',180,10,'hire',0,{risk:.15}),
 persuade:spec('劝说周边人才','talent',240,10,'persuade',0,{risk:.25}),
 reassure:spec('安抚本城人才','talent',120,10,'reassure',15),
});
export const TECHS=Object.freeze(Object.fromEntries(Object.entries(TROOPS).filter(([k])=>!['spear','archer'].includes(k)).map(([k,v])=>[k,{name:v.name+'技术',type:k}])));
export const actionName=(c,key)=>ACTIONS[key].kind==='build'?(c[ACTIONS[key].value]?'扩建':'新建')+BUILDINGS[ACTIONS[key].value].name:ACTIONS[key].name;
const town=(s,id)=>s.cities.find(c=>c.id===id);
const day=s=>s.campaign.day;
const turn=s=>Math.floor((day(s)-1)/10)+1;
export const besieged=(s,id)=>s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===id);
const engaged=(s,id)=>s.campaign.battles.some(r=>!r.settled&&r.armyIds.includes(id));
export const localArmies=(s,c)=>s.armies.filter(a=>a.location===c.id&&a.faction===c.owner&&!a.travel&&!a.route.length&&!engaged(s,a.id)&&!a.disbanded);
export const domesticOfficer=(s,id)=>s.campaign.idle.find(o=>o.unit.id===id&&!o.destination);
export const assignmentFor=(s,id)=>s.campaign.domestic.assignments.find(a=>a.officerId===id);
export const grainCapacity=c=>10000+c.granary*10000;
export const recruitmentLimit=c=>2000+c.barracks*1000;
export const reservedMen=c=>c.domestic.reserved;
export const effect=(c,key,t)=>c.domestic.effects.filter(e=>e.key===key&&e.untilTurn>=t).reduce((sum,e)=>sum+e.amount,0);
export const canTrain=(c,type)=>c.domestic.techs.includes(type)&&(type!=='ship'||(c.water===true||(!isNationalCity(c)&&['baima','guandu','chenliu','ye'].includes(c.id))));
export function cityMilitary(s,c){
 let troops=0,wounded=0,units=0;
 const battles=s.campaign.battles.filter(r=>!r.settled);
 for(const a of s.armies.filter(a=>a.location===c.id&&!a.travel&&a.faction===c.owner&&!a.disbanded)){
  const r=battles.find(r=>r.armyIds.includes(a.id));
  if(r&&!(r.kind==='siege'&&r.cityId===c.id&&r.battle.sides[1-r.attackSide].faction===a.faction))continue;
  for(const u of a.units){const live=r?.battle.sides.flatMap(x=>x.units).find(x=>x.armyId===a.id&&x.id===u.id);troops+=live?.hp??u.troops;wounded+=u.wounded+(live?battleWounded(live):0);units++;}
 }
 return {troops,wounded,units};
}
export function domesticRandom(s){const d=s.campaign.domestic;d.seed=(Math.imul(d.seed,1664525)+1013904223)>>>0;return d.seed/4294967296;}
export function initializeDomestic(s){
 s.campaign.domestic={version:2,seed:(s.seed^0x51a9c72d)>>>0,nextId:1,reserveGold:500,assignments:[],events:[],people:[],loyalty:{},personCooldowns:{},cooperation:{},cooperationGrowth:{},lastOpportunityTurn:0,lastFinishedDay:0};
 const occupied=new Set([...s.armies.flatMap(a=>a.units.map(u=>u.id)),...s.campaign.idle.map(o=>o.unit.id)]);
 const pool=Object.keys(OFFICER_BY_ID).filter(id=>!occupied.has(id)&&(s.campaign.scenarioId!=='guandu-200'||(!OFFICER_BY_ID[id].birthYear||OFFICER_BY_ID[id].birthYear<=184)&&(!OFFICER_BY_ID[id].deathYear||OFFICER_BY_ID[id].deathYear>=200)));let index=0;
 for(const c of s.cities){
  Object.assign(c,{workshop:0,clinic:0,drill:0,hall:0});
  c.domestic={owner:c.owner,techs:['spear','archer',...new Set(s.armies.filter(a=>a.location===c.id&&a.faction===c.owner).flatMap(a=>a.units.map(u=>u.type)))].filter((x,i,a)=>a.indexOf(x)===i),research:null,effects:[],opportunities:[],reserved:0,cooldowns:{},preparation:{intent:null,shield:null}};
  for(let i=0;i<3&&index<pool.length;i++)s.campaign.domestic.people.push({id:pool[index++],cityId:c.id,known:false,contact:0,cooldown:0,guardUntil:0});
 }
 for(const id of occupied)s.campaign.domestic.loyalty[id]=85;
}
function emit(s,a,phase,text,result={}){
 const d=s.campaign.domestic,e={id:d.nextId++,actionId:a?.action?.id??null,assignmentId:a?.id??null,cityId:a?.cityId??null,officerId:a?.officerId??null,day:day(s),phase,text,result};
 d.events.unshift(e);d.events=d.events.slice(0,240);log(s,`第${day(s)}天：${text}`,phase==='failure'?'event':'good');
}
const near=(s,c,id)=>id===c.id||s.roads.some(([a,b])=>a===c.id&&b===id||b===c.id&&a===id);
const accessible=(s,c)=>!besieged(s,c.id)&&s.roads.some(([a,b])=>{const n=a===c.id?b:b===c.id?a:null;return n&&town(s,n).owner===c.owner&&!s.armies.some(x=>x.faction!==c.owner&&x.travel&&[x.travel.from,x.travel.to].includes(c.id)&&[x.travel.from,x.travel.to].includes(n));});
const grainReserve=(s,c)=>Math.max(1500,Math.ceil(s.armies.filter(a=>a.faction===c.owner).reduce((n,a)=>n+a.units.reduce((m,u)=>m+u.troops/100+u.wounded/200,0),0)*10));
function stats(s,c){const units=localArmies(s,c).flatMap(a=>a.units);return {units,need:units.filter(u=>canTrain(c,u.type)).reduce((n,u)=>n+Math.max(0,troopCapacity(u)-u.troops-u.wounded),0),wounded:units.reduce((n,u)=>n+u.wounded,0)};}
function foreignTargets(s,c){return s.campaign.idle.filter(o=>o.faction!==c.owner&&o.faction!=='neutral'&&!o.destination&&near(s,c,o.location)&&!s.cities.some(t=>t.governor===o.unit.id));}
function ownTargets(s,c){return [...s.campaign.idle.filter(o=>o.faction===c.owner&&o.location===c.id&&!o.destination).map(o=>o.unit),...localArmies(s,c).flatMap(a=>a.units)];}
export function actionChance(s,c,u,def,target=null){
 const ability=domesticAbility(u,def.direction);
 let p=.48+ability*.004-(def.risk||0)+(def.kind==='trial'?c.workshop*.035:0)+(['explore','hire'].includes(def.kind)?c.hall*.025:0);
 if(def.kind==='hire')p+=Math.min(.15,(target?.contact||0)*.03);
 if(def.kind==='persuade')p-=((s.campaign.domestic.loyalty[target?.unit.id]??85)/100)*.25;
 if(['hire','persuade','reassure'].includes(def.kind)&&target){const id=target.unit?.id||target.id;if(id!==u.id)p+=(relationshipInfo(u.id,id,s.relationshipScores,s.relationshipTypes).score-50)*.003;}
 return Math.max(.12,Math.min(.94,p));
}
function buildCost(s,c,key){const g=domesticOfficer(s,c.governor),discount=(domesticEffects(g?.unit).projectDiscount||0)+effect(c,'discount:'+BUILDINGS[key].direction,turn(s));return Math.ceil(BUILDINGS[key].cost*(1-Math.min(.5,discount)));}
const pendingActions=s=>s.campaign.domestic.assignments.filter(a=>a.action);
const targetBusy=(s,id)=>pendingActions(s).some(a=>a.action.targetId===id&&['hire','persuade','reassure'].includes(ACTIONS[a.action.key].kind));
const reservedForUnit=(s,c,id)=>pendingActions(s).filter(a=>a.cityId===c.id&&ACTIONS[a.action.key].kind==='recruit').reduce((sum,a)=>sum+(a.action.recipients.find(r=>r.id===id)?.amount||0),0);
export function actionCandidates(s,assignment){
 const c=town(s,assignment.cityId),o=domesticOfficer(s,assignment.officerId);if(!c||!o||o.location!==c.id||o.faction!==c.owner||besieged(s,c.id))return [];
 const d=s.campaign.domestic,st=stats(s,c),cash=s.gold-d.reserveGold,wealth=s.gold>4000,threat=s.armies.some(a=>a.faction!==c.owner&&near(s,c,a.travel?.to||a.location));
 const candidates=[];
 for(const [key,def]of Object.entries(ACTIONS)){
  if(def.direction!==assignment.direction||(c.domestic.cooldowns[key]||0)>day(s))continue;
  const local=pendingActions(s).filter(a=>a.cityId===c.id);
  if(['research','trial'].includes(def.kind)&&local.some(a=>['research','trial'].includes(ACTIONS[a.action.key].kind)))continue;
  if(['effect','discount','prepare'].includes(def.kind)&&local.some(a=>ACTIONS[a.action.key].kind===def.kind&&ACTIONS[a.action.key].value===def.value))continue;
  if((def.opportunity||def.kind==='rescue')&&local.some(a=>{const other=ACTIONS[a.action.key];return (other.opportunity||other.kind==='rescue'&&other.value)===(def.opportunity||def.value);}))continue;
  let score=30,cost=def.cost,target=null,amount=0;
  if(def.opportunity&&!c.domestic.opportunities.some(e=>e.kind===def.opportunity&&e.expires>=day(s)))continue;
  switch(def.kind){
   case 'build':{const field=def.value;if(c.project||c[field]>=5)continue;cost=buildCost(s,c,field);score=(c[field]===0?62:wealth?46:12)-c[field]*3;
    if(field==='granary')score+=c.grain>grainCapacity(c)*.8?35:0;if(field==='farm')score+=c.grain<grainReserve(s,c)?30:0;
    if(field==='clinic')score+=st.wounded>300?30:-15;if(field==='barracks')score+=c.manpower<1500?25:0;
    if(['walls','drill'].includes(field))score+=threat?20:0;
    if(field==='workshop'&&Object.keys(TECHS).every(t=>c.domestic.techs.includes(t)))continue;if(field==='hall'&&!d.people.some(p=>near(s,c,p.cityId)))continue;break;}
   case 'cash':if(!c.commerce)continue;score=wealth?28:60;break;
   case 'effect':if(def.value==='gold'&&!c.commerce||def.value==='grain'&&!c.farm||c.domestic.effects.some(e=>e.key===def.value&&e.untilTurn>=turn(s)))continue;score=42;break;
   case 'discount':if(c.domestic.effects.some(e=>e.key==='discount:'+def.value&&e.untilTurn>=turn(s))||def.value==='commerce'&&c.commerce>=5)continue;score=wealth?28:38;break;
   case 'trade':if(!accessible(s,c))continue;if(def.value==='sell'){amount=Math.min(1200,Math.floor(c.grain-grainReserve(s,c)));if(amount<300)continue;score=wealth?20:55;}else {amount=Math.min(1200,grainCapacity(c)-c.grain);if(amount<300||c.grain>=grainReserve(s,c))continue;score=80;}break;
   case 'grain':if(!c.farm||c.grain>=grainCapacity(c)*.9)continue;score=c.grain<grainReserve(s,c)?75:26;break;
   case 'rescue':if(!c.domestic.opportunities.some(e=>e.kind===def.value&&e.expires>=day(s)))continue;score=90;break;
   case 'research':case 'trial':{
    const types=Object.keys(TECHS).filter(t=>!c.domestic.techs.includes(t)&&(t!=='ship'||(c.water===true||(!isNationalCity(c)&&['baima','guandu','chenliu','ye'].includes(c.id)))));
    target=c.domestic.research?.type||types.sort((a,b)=>Number(s.armies.some(x=>x.faction===c.owner&&x.units.some(u=>u.type===b)))-Number(s.armies.some(x=>x.faction===c.owner&&x.units.some(u=>u.type===a)))||a.localeCompare(b))[0];
    if(!target)continue;const progress=c.domestic.research?.progress||0;if(def.kind==='trial'?(progress<100):(progress>=100))continue;score=def.kind==='trial'?90:def.opportunity?75:key==='research'?45:35;break;}
   case 'recruit':{const need=st.units.filter(u=>canTrain(c,u.type)).reduce((n,u)=>n+Math.max(0,troopCapacity(u)-u.troops-u.wounded-reservedForUnit(s,c,u.id)),0);amount=Math.floor(Math.min(def.value,need,c.manpower-c.domestic.reserved,recruitmentLimit(c)-c.drafted-c.domestic.reserved));if(amount<=0||c.grain-c.domestic.reserved<amount)continue;cost+=Math.ceil(amount*(key==='urgent'?.4:.25));score=60+(threat?20:0);break;}
   case 'heal':if(!c.clinic||!st.wounded||c.grain<200)continue;score=65+Math.min(20,st.wounded/100);break;
   case 'repair':if(c.gateHp>=12000+c.walls*3000)continue;score=60+(threat?20:0);break;
   case 'prepare':if(def.value==='intent'&&!c.drill||!c.walls||c.domestic.preparation[def.value]?.until>=day(s))continue;score=threat?78:22;break;
   case 'explore':if(!d.people.some(p=>!p.known&&near(s,c,p.cityId)))continue;score=40;break;
   case 'hire':target=d.people.filter(p=>p.known&&p.cooldown<=day(s)&&near(s,c,p.cityId)&&!targetBusy(s,p.id)).sort((a,b)=>b.contact-a.contact||a.id.localeCompare(b.id))[0];if(!target)continue;score=65;break;
   case 'persuade':target=foreignTargets(s,c).filter(o=>(d.personCooldowns[o.unit.id]||0)<=day(s)&&!targetBusy(s,o.unit.id)).sort((a,b)=>(d.loyalty[a.unit.id]??85)-(d.loyalty[b.unit.id]??85)||a.unit.id.localeCompare(b.unit.id))[0];if(!target)continue;score=22+(100-(d.loyalty[target.unit.id]??85))*.5;break;
   case 'reassure':target=ownTargets(s,c).filter(u=>(d.loyalty[u.id]??85)<95&&!targetBusy(s,u.id)).sort((a,b)=>(d.loyalty[a.id]??85)-(d.loyalty[b.id]??85)||a.id.localeCompare(b.id))[0];if(!target)continue;score=(100-(d.loyalty[target.id]??85))*2;break;
  }
  if(cost>cash)continue;
  if(o.unit.personality===2)score+=(def.kind==='build'?10:0)-(def.risk||0)*30;
  if(o.unit.personality===4)score+=(def.risk||0)*30+(def.kind==='cash'?8:0);
  if(assignment.lastKey===key)score-=assignment.failures*12;
  candidates.push({key,cost,amount,targetId:typeof target==='string'?target:target?.unit?.id||target?.id||null,score,chance:actionChance(s,c,o.unit,def,target)});
 }
 return candidates.sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
}
function release(s,c,a){if(a.key&&ACTIONS[a.key].kind==='recruit')c.domestic.reserved=Math.max(0,c.domestic.reserved-a.amount);}
export function cancelDomestic(s,officerId,reason='接到新的命令'){
 const d=s.campaign.domestic,a=d.assignments.find(a=>a.officerId===officerId);if(!a)return;
 const c=town(s,a.cityId),x=a.action;
 if(x){release(s,c,x);if(ACTIONS[x.key].kind==='build'&&c.project?.actionId===x.id){c.domestic.suspended=structuredClone(x);c.project.actionId=null;}
  const refund=ACTIONS[x.key].kind==='recruit'?x.cost-ACTIONS[x.key].cost:x.key==='buy'?300:0;s.gold+=refund;
  emit(s,a,'cancel',`${domesticOfficer(s,officerId)?.unit.name||'执行人'}${reason}，${ACTIONS[x.key].name}中止${['build','research','trial'].includes(ACTIONS[x.key].kind)?'，保留已完成进度':''}${refund?'，退回未使用费用'+refund+'金':''}。`,{spent:x.cost-refund,refund});}
 d.assignments=d.assignments.filter(x=>x!==a);
}
export function assignDomestic(s,cityId,direction,officerId){
 const c=town(s,cityId);if(s.campaign.phase!=='planning'||s.finished||c?.owner!=='cao'||!DIRECTIONS[direction])return '须在筹划阶段委任己方城市';
 if(!officerId)return '请选择要加入该方向的武将';
 const o=domesticOfficer(s,officerId);if(!o||o.location!==cityId||o.faction!==c.owner)return '请选择本城待命武将';
 const existing=assignmentFor(s,officerId);if(existing?.cityId===cityId&&existing.direction===direction)return null;
 cancelDomestic(s,officerId);
 const a={id:s.campaign.domestic.nextId++,cityId,direction,officerId,action:null,lastTurn:0,lastKey:null,failures:0,waiting:'下一旬执行时自主选择行动'};
 s.campaign.domestic.assignments.push(a);emit(s,a,'assignment',`${o.unit.name}持续负责${c.name}${DIRECTIONS[direction]}，直到收到新的命令。`);return null;
}
export function dismissDomestic(s,officerId){
 const a=assignmentFor(s,officerId);if(s.campaign.phase!=='planning'||s.finished||!a||town(s,a.cityId)?.owner!=='cao')return '须在筹划阶段解除己方武将的委任';
 cancelDomestic(s,officerId,'解除委任');return null;
}
function start(s,a,c,pick){
 const def=ACTIONS[pick.key],o=domesticOfficer(s,a.officerId);
 const action={id:s.campaign.domestic.nextId++,key:pick.key,cost:pick.cost,amount:pick.amount,targetId:pick.targetId,chance:pick.chance,remaining:def.days,startedDay:day(s),recipients:[],paused:false};
 if(def.kind==='recruit'){let left=pick.amount;for(const u of stats(s,c).units.filter(u=>canTrain(c,u.type)).sort((a,b)=>a.troops-b.troops||a.id.localeCompare(b.id))){const n=Math.min(left,Math.max(0,troopCapacity(u)-u.troops-u.wounded-reservedForUnit(s,c,u.id)));if(n>0)action.recipients.push({id:u.id,amount:n});left-=n;if(!left)break;}c.domestic.reserved+=pick.amount;}
 if(def.kind==='heal')action.recipients=stats(s,c).units.filter(u=>u.wounded).map(u=>({id:u.id,amount:u.wounded}));
 if(['research','trial'].includes(def.kind)&&!c.domestic.research)c.domestic.research={type:pick.targetId,progress:0};
 if(def.kind==='build'){c.project={key:def.value,remaining:def.days/10,actionId:action.id,domestic:true};c.domestic.effects=c.domestic.effects.filter(e=>e.key!=='discount:'+def.direction);}
 s.gold-=pick.cost;a.action=action;a.waiting='';
 emit(s,a,'start',`${o.unit.name}开始在${c.name}${actionName(c,pick.key)}${pick.targetId?'（'+(TECHS[pick.targetId]?.name||OFFICER_BY_ID[pick.targetId]?.name||'')+'）':''}，预计${def.days}天，支出${pick.cost}金。`,{cost:pick.cost,chance:pick.chance});
}
export function beginDomesticTurn(s){
 reconcileDomestic(s);
 for(const a of [...s.campaign.domestic.assignments].sort((a,b)=>a.id-b.id)){
  const c=town(s,a.cityId);if(a.action||a.lastTurn===turn(s))continue;a.lastTurn=turn(s);
  if(besieged(s,c.id)){a.waiting='围城期间暂停';continue;}
  if(c.domestic.suspended&&ACTIONS[c.domestic.suspended.key].direction===a.direction){a.action=c.domestic.suspended;delete c.domestic.suspended;c.project.actionId=a.action.id;emit(s,a,'resume',`${c.name}${ACTIONS[a.action.key].name}接续，保留原进度且不重复收费。`);continue;}
  const options=actionCandidates(s,a);if(!options.length){a.waiting='资源、条件不足或暂无值得执行的行动';continue;}
 const good=options.filter(x=>x.score>=options[0].score-14),floor=options[0].score-15;let draw=domesticRandom(s)*good.reduce((sum,x)=>sum+x.score-floor,0),pick=good.at(-1);for(const candidate of good){draw-=candidate.score-floor;if(draw<0){pick=candidate;break;}}start(s,a,c,pick);
 }
}
function addEffect(c,key,amount,t){c.domestic.effects=c.domestic.effects.filter(e=>e.key!==key);c.domestic.effects.push({key,amount,untilTurn:t+2});}
function completionAvailable(s,c,x){
 const def=ACTIONS[x.key],d=s.campaign.domestic;
 if(def.opportunity&&!c.domestic.opportunities.some(e=>e.kind===def.opportunity&&e.expires>=day(s)))return false;
 switch(def.kind){
  case 'build':return c.project?.actionId===x.id&&c[def.value]<5;
  case 'research':return c.domestic.research?.type===x.targetId&&c.domestic.research.progress<100;
  case 'trial':return c.domestic.research?.type===x.targetId&&c.domestic.research.progress>=100&&!c.domestic.techs.includes(x.targetId);
  case 'hire':return d.people.some(p=>p.id===x.targetId&&p.known&&p.cooldown<=day(s)&&near(s,c,p.cityId));
  case 'persuade':return (d.personCooldowns[x.targetId]||0)<=day(s)&&foreignTargets(s,c).some(o=>o.unit.id===x.targetId);
  case 'reassure':return ownTargets(s,c).some(u=>u.id===x.targetId&&(d.loyalty[u.id]??85)<100);
  case 'explore':return d.people.some(p=>!p.known&&near(s,c,p.cityId));
  case 'rescue':return c.domestic.opportunities.some(e=>e.kind===def.value&&e.expires>=day(s));
  case 'trade':return accessible(s,c);
  default:return true;
 }
}
function planCooperation(s){
 const d=s.campaign.domestic,groups=new Map();
 for(const a of d.assignments){if(besieged(s,a.cityId))continue;const key=a.cityId+':'+a.direction;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);}
 for(const [key,group]of [...groups].sort(([a],[b])=>a.localeCompare(b))){
  if(group.length<2||d.cooperation[key]?.turn===turn(s))continue;
  group.sort((a,b)=>a.officerId.localeCompare(b.officerId));
  const actors=group.filter(a=>a.action&&(ACTIONS[a.action.key].kind==='build'||a.action.remaining<=1)&&completionAvailable(s,town(s,a.cityId),a.action));
  if(!actors.length)continue;
  // Each eligible ordered pair has the same weight without allocating N² pairs.
  const index=Math.floor(domesticRandom(s)*actors.length*(group.length-1)),a=actors[Math.floor(index/(group.length-1))],helper=group.filter(b=>b!==a)[index%(group.length-1)];
  const profile=cooperationProfile(s,domesticOfficer(s,a.officerId).unit,domesticOfficer(s,helper.officerId).unit,a.direction),def=ACTIONS[a.action.key];
  d.cooperation[key]={turn:turn(s),day:day(s),cityId:a.cityId,direction:a.direction,actionId:a.action.id,actionKey:a.action.key,officerId:a.officerId,helperId:helper.officerId,...profile,success:domesticRandom(s)<profile.chance,mode:def.cooperation,before:0,after:0,actual:0,relationGain:0,applied:false};
 }
}
function cooperationFor(s,a){const r=s.campaign.domestic.cooperation[a.cityId+':'+a.direction];return r?.actionId===a.action.id&&r.day===day(s)&&!r.applied?r:null;}
function settleCooperation(s,a,c,r,before,after,metric,productive=after>before){
 if(!r)return;
 r.applied=true;r.before=before;r.after=after;r.actual=Math.max(0,Math.round((after-before)*10000)/10000);
 const actor=domesticOfficer(s,r.officerId)?.unit,helper=domesticOfficer(s,r.helperId)?.unit;
 if(r.success&&r.actual>0&&productive&&actor&&helper)r.relationGain=growCooperationRelationship(s,actor,helper,turn(s));
 const names=`${actor?.name||OFFICER_BY_ID[r.officerId].name}与${helper?.name||OFFICER_BY_ID[r.helperId].name}`;
 const effect=!r.success?'本次未触发协作':r.actual>0?`${metric}额外提高${Number(r.actual.toFixed(3))}${r.mode==='chance'?'个百分点':''}${!productive?'，本次未增加实际成果':''}`:'本次协作未增加实际成果（行动结果或可用上限限制）';
 emit(s,a,'cooperation',`${c.name}${DIRECTIONS[a.direction]}：${names}协作判定，${effect}${r.relationGain?'，双方关系+'+r.relationGain:''}。`,structuredClone(r));
}
const outcome=(roll,chance)=>roll<chance*.15?1.2:roll<chance?1:roll<Math.min(.98,chance+.15)?.45:0;
function complete(s,a,c){
 const x=a.action,def=ACTIONS[x.key],o=domesticOfficer(s,a.officerId),coop=cooperationFor(s,a),valid=completionAvailable(s,c,x),roll=domesticRandom(s),baseFactor=valid?outcome(roll,x.chance):0;
 const chance=valid&&coop?.success&&coop.mode==='chance'&&x.chance>0?Math.min(.94,x.chance+coop.chanceGain):x.chance;
 // Preserve the proportions of unsuccessful outcomes when success probability rises.
 const adjustedRoll=chance>x.chance&&roll>=chance?x.chance+(roll-chance)*(1-x.chance)/(1-chance):roll;
 const factor=!valid?0:chance>x.chance&&roll>=chance?outcome(adjustedRoll,x.chance):outcome(roll,chance);
 let coopBefore=0,coopAfter=0,changed=false;
 const boost=(raw,cap=Infinity,round=Math.round)=>{const before=Math.max(0,Math.min(cap,round(raw))),after=Math.max(0,Math.min(cap,round(raw*(coop?.success&&coop.mode==='quantity'?1+coop.gain:1))));coopBefore+=before;coopAfter+=after;return after;};
 let result=factor>=1?'成功':factor>0?'部分达成':'失败',details='',actual=0,refund=0;
 if(!valid){details='目标或执行条件已失效，没有新增成果';if(def.kind==='recruit'){release(s,c,x);refund=x.cost-def.cost;}else if(x.key==='buy')refund=300;s.gold+=refund;}
 else switch(def.kind){
  case 'build':if(factor>=1){c[def.value]++;if(def.value==='walls')c.gateHp+=3000;c.project=null;if(factor>1){refund=Math.floor(x.cost*.15);s.gold+=refund;}details=`${BUILDINGS[def.value].name}${c[def.value]===1?'已建成，现为1级':'扩建至'+c[def.value]+'级'}，实际花费${x.cost-refund}金${refund?'，节省'+refund+'金':''}`;}
   else {x.remaining=5;c.project.remaining=.5;details='工程受阻，保留进度，延长5天，不追加费用';}break;
  case 'cash':{const raw=Math.round(def.value*factor*(.7+(o.unit.politics||50)/150));actual=raw>x.cost?boost(raw):raw;s.gold+=actual;details=`收入${actual}金，净${actual>=x.cost?'收益':'亏损'}${Math.abs(actual-x.cost)}金`;break;}
  case 'effect':if(factor)addEffect(c,def.value,boost(def.power*factor,1,n=>Math.round(n*10000)/10000),turn(s));details=factor?'未来三次旬末产出获得加成':'未获得额外产出加成';break;
  case 'discount':if(factor)addEffect(c,'discount:'+def.value,boost(.2*factor,.5,n=>Math.round(n*10000)/10000),turn(s));details=factor?'获得有期限的一次性建设优惠':'未达成合作';break;
  case 'grain':actual=boost(def.value*factor,grainCapacity(c)-c.grain);c.grain+=actual;details=`额外入仓${actual}粮`;break;
  case 'trade':if(factor&&accessible(s,c)){if(def.value==='sell'){actual=Math.max(0,Math.min(x.amount,Math.floor(c.grain-grainReserve(s,c))));c.grain-=actual;const gold=Math.floor(actual*.18*(factor>1?1.1:1));s.gold+=gold;details=`售粮${actual}，收入${gold}金`;}else{actual=Math.min(grainCapacity(c)-c.grain,Math.floor(x.amount*Math.min(1,factor)));c.grain+=actual;refund=Math.floor((x.cost-def.cost+300)*(1-actual/1200));s.gold+=refund;details=`购入${actual}粮，退还未成交货款${refund}金`;}}else {if(def.value==='buy'){refund=300;s.gold+=refund;}details='未成交，仅损失联络费用';}break;
  case 'rescue':{const e=c.domestic.opportunities.find(e=>e.kind===def.value);if(e&&factor){changed=Math.min(1,factor)>(e.saved||0);e.saved=Math.max(e.saved||0,Math.min(1,factor));details='减少本次灾情损失';}else details='未挽回额外损失';break;}
  case 'research':if(c.domestic.research?.type===x.targetId){actual=boost(def.value*factor*(1+c.workshop*.1),100-c.domestic.research.progress);c.domestic.research.progress+=actual;}details=`研究进度增加${actual}，达到100后须试制验证`;break;
  case 'trial':if(factor>=1&&c.domestic.research?.type===x.targetId&&c.domestic.research.progress>=100){c.domestic.techs.push(x.targetId);c.domestic.research=null;changed=true;details=`掌握${TECHS[x.targetId].name}`;}else details='试制未通过，保留研究进度';break;
  case 'recruit':{const units=stats(s,c).units,capacity=x.recipients.reduce((n,r)=>{const u=units.find(u=>u.id===r.id);return n+(!u||!canTrain(c,u.type)?0:Math.min(r.amount,Math.max(0,troopCapacity(u)-u.troops-u.wounded)));},0);
   let remaining=boost(x.amount*Math.min(1,factor),Math.min(x.amount,capacity,c.manpower,Math.max(0,recruitmentLimit(c)-c.drafted),Math.floor(c.grain)),Math.floor);
   for(const r of x.recipients){const u=units.find(u=>u.id===r.id);if(!u||!canTrain(c,u.type))continue;const n=Math.min(remaining,r.amount,Math.max(0,troopCapacity(u)-u.troops-u.wounded));u.troops+=n;actual+=n;remaining-=n;}
   c.manpower-=actual;c.grain-=actual;c.drafted+=actual;release(s,c,x);refund=Math.max(0,x.cost-def.cost-Math.ceil(actual*(x.key==='urgent'?.4:.25)));s.gold+=refund;details=`预备兵-${actual}，具体部队兵力+${actual}，粮-${actual}，退回未使用费用${refund}金`;break;}
  case 'heal':{const units=localArmies(s,c).filter(a=>a.hunger===0).flatMap(a=>a.units);if(c.grain>=200){c.grain-=200;for(const r of x.recipients){const u=units.find(u=>u.id===r.id);if(!u)continue;const n=boost(def.value*factor,Math.min(u.wounded,r.amount),Math.floor);u.wounded-=n;u.troops+=n;actual+=n;}}details=`实际恢复${actual}名伤兵，全部回到原部队`;break;}
  case 'repair':actual=boost(def.value*factor,12000+c.walls*3000-c.gateHp);c.gateHp+=actual;details=`恢复城防耐久${actual}`;break;
  case 'prepare':if(factor){const old=c.domestic.preparation[def.value],previous=old?.until>=day(s)?old.amount:0,raw=def.power*Math.min(1,factor),cap=Math.max(0,(def.value==='intent'?30-c.drill*3:.35-.13-c.walls*.02));const amount=boost(raw,Math.min(def.power*1.25,cap),n=>Math.round(n*10000)/10000);coopBefore=Math.max(previous,coopBefore);coopAfter=Math.max(previous,coopAfter);c.domestic.preparation[def.value]={amount:Math.max(previous,amount),until:day(s)+30,actionId:x.id};}details=factor?'取得30天内下一场本城守城战的一次准备加成':'准备未奏效';break;
  case 'explore':{const pool=s.campaign.domestic.people.filter(p=>!p.known&&near(s,c,p.cityId));if(factor&&pool.length){const p=pool[Math.floor(domesticRandom(s)*pool.length)];p.known=true;changed=true;details=`发现${OFFICER_BY_ID[p.id].name}，可进一步登用`;}else details='未发现新人';break;}
  case 'hire':{const p=s.campaign.domestic.people.find(p=>p.id===x.targetId);if(!p){details='目标已离开';break;}if(factor>=1){const distance=p.cityId===c.id?0:2;s.campaign.idle.push({unit:{...makeOfficer(p.id,0),homeCity:c.id},faction:c.owner,location:p.cityId,destination:distance?c.id:null,remainingDays:distance});s.campaign.domestic.loyalty[p.id]=80;s.campaign.domestic.people=s.campaign.domestic.people.filter(t=>t!==p);details=`${OFFICER_BY_ID[p.id].name}加入${c.name}${distance?'，正在前往到任':''}`;}else{p.contact+=factor?1:0;p.cooldown=day(s)+20;details=factor?'愿意继续接洽，20天后可再次登用':'拒绝加入，20天内不再打扰';}break;}
  case 'persuade':{const t=foreignTargets(s,c).find(o=>o.unit.id===x.targetId),d=s.campaign.domestic;if(!t||(d.personCooldowns[x.targetId]||0)>day(s)){details='目标已不符合接洽条件或处于防备期';break;}if(factor>=1){cancelDomestic(s,t.unit.id,'离开原势力');t.faction=c.owner;t.unit.homeCity=c.id;t.destination=c.id;t.remainingDays=t.location===c.id?0:2;if(!t.remainingDays)t.destination=null;d.loyalty[t.unit.id]=65;details=`${t.unit.name}同意投靠，不携带原势力军团或城池`;}else{if(factor)d.loyalty[t.unit.id]=Math.max(40,(d.loyalty[t.unit.id]??85)-8);details=factor?'目标忠诚有所动摇':'对方拒绝接触，进入防备期';}d.personCooldowns[x.targetId]=day(s)+30;break;}
  case 'reassure':{const u=ownTargets(s,c).find(u=>u.id===x.targetId);if(u){const d=s.campaign.domestic,bonus=domesticEffects(domesticOfficer(s,c.governor)?.unit).relief||0;actual=Math.min(100-(d.loyalty[u.id]??85),Math.floor((def.value+bonus)*factor));d.loyalty[u.id]=(d.loyalty[u.id]??85)+actual;}details=`忠诚提高${actual}`;break;}
 }
 if(coop){
  const metric=({cash:'金收入',grain:'入仓粮食',research:'研究进度',recruit:'征募人数',heal:'恢复人数',repair:'城防耐久',effect:'临时产出倍率',discount:'建设折扣',prepare:'守城准备'})[def.kind]||'成功把握';
  if(coop.mode==='chance'){changed||=actual>0||valid&&factor>=1&&['hire','persuade'].includes(def.kind);settleCooperation(s,a,c,coop,x.chance*100,chance*100,metric,changed&&factor>baseFactor);}
  else settleCooperation(s,a,c,coop,coopBefore,coopAfter,metric);
 }
 if(def.opportunity&&def.kind!=='build'){const i=c.domestic.opportunities.findIndex(e=>e.kind===def.opportunity);if(i>=0)c.domestic.opportunities.splice(i,1);}
 a.lastKey=x.key;a.failures=factor>=1?0:a.failures+1;
 emit(s,a,factor>=1?'complete':'failure',`${o.unit.name}在${c.name}${def.name}${result}：${details}。`,{result,spent:x.cost-refund,actual,factor});
 if(def.kind==='build'&&factor<1)return;
 c.domestic.cooldowns[x.key]=day(s)+(def.kind==='prepare'?10:def.kind==='persuade'?20:1);a.action=null;a.waiting='本次行动结束，下一旬重新评估';
}
export function reconcileDomestic(s){
 for(const c of s.cities)if(c.domestic.owner!==c.owner){
  for(const a of [...s.campaign.domestic.assignments].filter(a=>a.cityId===c.id))cancelDomestic(s,a.officerId,'因城池失守结束委任');
  c.domestic.owner=c.owner;c.domestic.preparation={intent:null,shield:null};c.domestic.reserved=0;c.domestic.effects=[];delete c.domestic.suspended;c.project=null;
 }
 for(const a of [...s.campaign.domestic.assignments]){const o=domesticOfficer(s,a.officerId),c=town(s,a.cityId);if(!o||o.location!==c.id||o.faction!==c.owner)cancelDomestic(s,a.officerId,'离开岗位');}
}
export function finishDomesticDay(s){
 if(s.campaign.domestic.lastFinishedDay===day(s))return;
 reconcileDomestic(s);
 planCooperation(s);
 for(const a of [...s.campaign.domestic.assignments]){if(!s.campaign.domestic.assignments.includes(a)||!a.action)continue;const c=town(s,a.cityId),x=a.action;
  if(besieged(s,c.id)){if(!x.paused){x.paused=true;emit(s,a,'pause',`${c.name}被围，${ACTIONS[x.key].name}暂停。`);}continue;}
  if(x.paused){x.paused=false;emit(s,a,'resume',`${c.name}围城解除，继续${ACTIONS[x.key].name}。`);}
  const coop=cooperationFor(s,a);
  if(ACTIONS[x.key].kind==='build'&&coop){const progress=Math.min(x.remaining,1+(coop.success?Math.min(10,x.remaining)*coop.gain:0));settleCooperation(s,a,c,coop,Math.min(1,x.remaining),progress,'施工进度（天）');x.remaining=Math.max(0,Math.round((x.remaining-progress)*10000)/10000);}else x.remaining=Math.max(0,x.remaining-1);
  if(ACTIONS[x.key].kind==='build'&&c.project)c.project.remaining=Math.max(.01,x.remaining/10);
  if(x.remaining<=0)complete(s,a,c);
 }
 for(const c of s.cities){
  for(const e of c.domestic.opportunities.filter(e=>e.expires===day(s))){if(['disaster','mold'].includes(e.kind)){const loss=Math.min(c.grain,Math.floor(e.amount*(1-(e.saved||0))));c.grain-=loss;emit(s,{cityId:c.id},'event',`${c.name}${e.kind==='mold'?'仓储霉变':'灾情'}结算，损失${loss}粮。`,{loss});}}
  c.domestic.opportunities=c.domestic.opportunities.filter(e=>e.expires>day(s));
 }
 for(const r of Object.values(s.campaign.domestic.cooperation))if(r.day===day(s)&&!r.applied)settleCooperation(s,{cityId:r.cityId,direction:r.direction,officerId:r.officerId,action:{id:r.actionId}},town(s,r.cityId),r,0,0,'行动成果');
 s.campaign.domestic.lastFinishedDay=day(s);
}
export function generateDomesticOpportunities(s){
 const d=s.campaign.domestic;if(d.lastOpportunityTurn===turn(s))return;d.lastOpportunityTurn=turn(s);
 for(const c of s.cities){c.domestic.effects=c.domestic.effects.filter(e=>e.untilTurn>=turn(s));if(besieged(s,c.id)||c.domestic.opportunities.length>=3)continue;
  const r=domesticRandom(s);if(r>.28)continue;const kind=r<.1?'master':r<.18?'disaster':'mold';if(c.domestic.opportunities.some(e=>e.kind===kind))continue;
  c.domestic.opportunities.push({kind,expires:day(s)+19,amount:kind==='master'?0:Math.min(600,Math.floor(c.grain*.08)),saved:0});
  emit(s,{cityId:c.id},'event',`${c.name}${kind==='master'?'有名匠来访，可考虑聘请':kind==='disaster'?'出现田间灾情，可抢收保粮':'出现仓储霉变隐患，可整理仓储'}。`);
 }
}
export function siegeOpening(c,currentDay){return {intent:Math.min(30,c.drill*3+(c.domestic.preparation.intent?.until>=currentDay?c.domestic.preparation.intent.amount:0)),shield:Math.min(.35,.13+c.walls*.02+(c.domestic.preparation.shield?.until>=currentDay?c.domestic.preparation.shield.amount:0)),intentId:c.domestic.preparation.intent?.until>=currentDay?c.domestic.preparation.intent.actionId:null,shieldId:c.domestic.preparation.shield?.until>=currentDay?c.domestic.preparation.shield.actionId:null};}

export function validateDomestic(s){
 const fail=(ok,msg='内政存档无效')=>{if(!ok)throw new Error(msg);},int=(v,max=1e9)=>Number.isSafeInteger(v)&&v>=0&&v<=max,num=(v,max=1e9)=>Number.isFinite(v)&&v>=0&&v<=max;
 const d=s.campaign.domestic;fail(d?.version===2,'内政存档版本不兼容，请重新开始');fail(int(d.seed,0xffffffff)&&int(d.nextId)&&int(d.reserveGold)&&int(d.lastOpportunityTurn,turn(s))&&d.lastFinishedDay===day(s)-1,'内政日期或随机状态无效');
 const map=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 fail(Array.isArray(d.assignments)&&d.assignments.length<=835&&Array.isArray(d.events)&&d.events.length<=240&&Array.isArray(d.people)&&d.people.length<=835&&map(d.loyalty)&&map(d.personCooldowns)&&map(d.cooperation)&&map(d.cooperationGrowth));
 const people=new Set([...s.armies.flatMap(a=>a.units.map(u=>u.id)),...s.campaign.idle.map(o=>o.unit.id)]),actors=new Set(),ids=new Set(),researchSlots=new Set(),targetSlots=new Set(),effectSlots=new Set(),opportunitySlots=new Set();
 for(const [id,v]of Object.entries(d.loyalty))fail(Object.hasOwn(OFFICER_BY_ID,id)&&int(v,100),'武将忠诚无效');
 for(const [id,v]of Object.entries(d.personCooldowns))fail(Object.hasOwn(OFFICER_BY_ID,id)&&int(v),'人物接洽冷却无效');
 for(const p of d.people){fail(OFFICER_BY_ID[p.id]&&!people.has(p.id)&&town(s,p.cityId)&&typeof p.known==='boolean'&&int(p.contact)&&int(p.cooldown)&&int(p.guardUntil),'候选人物重复或无效');people.add(p.id);}
 function checkAction(x){const def=ACTIONS[x?.key];fail(def&&int(x.id)&&!ids.has(x.id)&&x.id<d.nextId&&int(x.cost)&&int(x.amount)&&num(x.chance,1)&&num(x.remaining,30)&&x.remaining>0&&int(x.startedDay,day(s))&&typeof x.paused==='boolean'&&Array.isArray(x.recipients),'内政行动无效');ids.add(x.id);fail(x.targetId===null||typeof x.targetId==='string');const seen=new Set();for(const r of x.recipients){fail(OFFICER_BY_ID[r.id]&&!seen.has(r.id)&&int(r.amount));seen.add(r.id);}if(def.kind==='recruit')fail(x.amount===x.recipients.reduce((n,r)=>n+r.amount,0));}
 const claim=(set,key)=>{fail(!set.has(key),'内政行动重复占用目标或队列');set.add(key);};
 for(const a of d.assignments){const c=town(s,a.cityId),o=domesticOfficer(s,a.officerId);fail(c&&o&&o.location===c.id&&o.faction===c.owner&&DIRECTIONS[a.direction]&&!actors.has(a.officerId)&&int(a.id)&&!ids.has(a.id)&&a.id<d.nextId&&int(a.lastTurn,turn(s))&&int(a.failures)&&typeof a.waiting==='string'&&a.waiting.length<300);actors.add(a.officerId);ids.add(a.id);fail(a.lastKey===null||ACTIONS[a.lastKey]);if(a.action){const x=a.action,def=ACTIONS[x.key];checkAction(x);fail(def.direction===a.direction);if(def.kind==='build')fail(c.project?.actionId===x.id&&c.project.key===def.value);if(['research','trial'].includes(def.kind))claim(researchSlots,c.id);if(['hire','persuade','reassure'].includes(def.kind))claim(targetSlots,x.targetId);if(['effect','discount','prepare'].includes(def.kind))claim(effectSlots,c.id+':'+def.kind+':'+def.value);if(def.opportunity||def.kind==='rescue')claim(opportunitySlots,c.id+':'+(def.opportunity||def.value));}}
 fail(Object.keys(d.cooperation).length<=s.cities.length*5);
 for(const [key,r]of Object.entries(d.cooperation)){
  fail(r&&town(s,r.cityId)&&DIRECTIONS[r.direction]&&key===r.cityId+':'+r.direction&&int(r.turn,turn(s))&&r.turn>0&&int(r.day,day(s))&&r.day>0&&r.turn===Math.floor((r.day-1)/10)+1&&int(r.actionId)&&r.actionId<d.nextId&&ACTIONS[r.actionKey]?.direction===r.direction&&r.mode===ACTIONS[r.actionKey].cooperation,'协作记录无效');
  fail(OFFICER_BY_ID[r.officerId]&&OFFICER_BY_ID[r.helperId]&&r.officerId!==r.helperId&&num(r.chance,.65)&&r.chance>=.05&&num(r.gain,.25)&&r.gain>=.1&&num(r.chanceGain,.08)&&r.chanceGain>=.03&&int(r.relation,100)&&['未载','很合拍','合拍','一般','不太合拍','难合拍'].includes(r.affinity)&&typeof r.success==='boolean'&&typeof r.applied==='boolean'&&num(r.before)&&num(r.after)&&num(r.actual)&&Math.abs(r.actual-Math.max(0,r.after-r.before))<.00011&&int(r.relationGain,3),'协作数值无效');
  fail(r.success||r.actual===0&&r.relationGain===0);fail(!r.relationGain||r.applied&&r.actual>0);
 }
 for(const [key,t]of Object.entries(d.cooperationGrowth)){const pair=key.split('|');fail(pair.length===2&&pair[0]!==pair[1]&&pair.every(id=>OFFICER_BY_ID[id])&&[...pair].sort().join('|')===key&&int(t,turn(s))&&t>0,'协作关系成长记录无效');}
 for(const c of s.cities){const x=c.domestic;fail(x&&x.owner===c.owner&&Array.isArray(x.techs)&&new Set(x.techs).size===x.techs.length&&x.techs.every(t=>TROOPS[t])&&Array.isArray(x.effects)&&Array.isArray(x.opportunities)&&int(x.reserved)&&x.reserved<=c.manpower&&x.cooldowns&&x.preparation);for(const field of Object.keys(BUILDINGS))fail(int(c[field],5));
  fail(!x.research||TECHS[x.research.type]&&!x.techs.includes(x.research.type)&&int(x.research.progress,100));
  const reserved=d.assignments.filter(a=>a.cityId===c.id&&a.action&&ACTIONS[a.action.key].kind==='recruit').reduce((n,a)=>n+a.action.amount,0);fail(x.reserved===reserved,'预备兵预留不一致');
  for(const e of x.effects)fail(['gold','grain',...Object.keys(DIRECTIONS).map(k=>'discount:'+k)].includes(e.key)&&num(e.amount,1)&&int(e.untilTurn));
  for(const e of x.opportunities)fail(['master','capture','disaster','mold'].includes(e.kind)&&int(e.expires)&&int(e.amount)&&num(e.saved,1));
  for(const v of Object.values(x.cooldowns))fail(int(v));
  for(const key of ['intent','shield']){const p=x.preparation[key];fail(p===null||num(p.amount,key==='intent'?15:.125)&&int(p.until)&&int(p.actionId));}
  if(x.suspended){checkAction(x.suspended);fail(ACTIONS[x.suspended.key].kind==='build'&&c.project?.domestic&&c.project.actionId===null);}
  if(c.project?.domestic)fail(x.suspended||d.assignments.some(a=>a.cityId===c.id&&a.action?.id===c.project.actionId));
 }
 for(const e of d.events)fail(int(e.id)&&e.id<d.nextId&&int(e.day,day(s))&&typeof e.text==='string'&&e.text.length<1000&&['assignment','start','complete','failure','cancel','pause','resume','event','cooperation'].includes(e.phase));
}
