import {initializeStrategicAI,manageStrategicEconomy,planStrategicAI,validateStrategicAI} from './strategic-ai.mjs';
import {nationalScenario,nationalWorld,nationalRoster} from './national-scenarios.mjs';
import {FACTIONS} from './engine.mjs';
import {newGame, makeOfficer, startBattle, combatUnit, stepBattle, lockDeployment, issueCommand, battleStratagems, STRATAGEMS, armyCommanders, armyTroops, validateSave, battleWounded, log} from './engine.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {chooseEnemyCommand,planEnemyArmy} from './battle-ai.mjs';
import {gainExperience, PROGRESSION} from './progression.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {setStatus, defaultTacticIds} from './tactics.mjs';
import {CAMPAIGN_TIME} from './combat-rules.mjs';
import {domesticEffects,passiveList} from './passives.mjs';
import {BUILDINGS,initializeDomestic,beginDomesticTurn,finishDomesticDay,generateDomesticOpportunities,reconcileDomestic,cancelDomestic,canTrain,reservedMen,effect,siegeOpening,validateDomestic} from './domestic.mjs';
export {assignDomestic,assignmentFor,cityMilitary} from './domestic.mjs';

// A day consists of a fixed number of real combat steps, never wall-clock time.
export const CAMPAIGN = Object.freeze({version:6, daysPerTurn:10, ...CAMPAIGN_TIME, maxUnits:10, maxArmies:200, supplyRange:180});
export const PROJECTS = Object.freeze({
  farm:{name:'开垦农田',cost:500,turns:1,field:'farm',description:'每级增加 600 粮／旬'},
  commerce:{name:'发展商业',cost:500,turns:1,field:'commerce',description:'每级增加 160 金／旬'},
  barracks:{name:'修建兵营',cost:600,turns:1,field:'barracks',description:'每级增加 500 兵源／旬，提高整补额度'},
  walls:{name:'加固城防',cost:700,turns:2,field:'walls',description:'每级增加 3,000 城门耐久上限'},
  granary:{name:'扩建粮仓',cost:500,turns:1,field:'granary',description:'每级增加 10,000 库容及 120 日运输量'},
  ...Object.fromEntries(['workshop','clinic','drill','hall'].map(key=>[key,{name:'建设'+BUILDINGS[key].name,cost:BUILDINGS[key].cost,turns:BUILDINGS[key].days/10,field:key,description:BUILDINGS[key].description}])),
});
const copy=x=>structuredClone(x);
const city=(s,id)=>s.cities.find(c=>c.id===id);
const army=(s,id)=>s.armies.find(a=>a.id===id);
const round=n=>Math.round(n*1000)/1000;
export const calendar=s=>({day:s.campaign.day,turn:Math.floor((s.campaign.day-1)/10)+1,dayInTurn:(s.campaign.day-1)%10+1});
export const battleRecord=(s,id)=>s.campaign.battles.find(r=>r.id===id);
export const activeBattles=s=>s.campaign.battles.filter(r=>!r.settled);
export const isPlanning=s=>s.campaign.phase==='planning'&&!s.finished;
export const armyBattle=(s,id)=>activeBattles(s).find(r=>r.armyIds.includes(id));
export const canEditArmy=(s,a)=>!!a&&isPlanning(s)&&!a.travel&&!a.route.length&&!armyBattle(s,a.id)&&!activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===a.location)&&city(s,a.location)?.owner===a.faction;
export const roadLength=(s,a,b)=>Math.max(30,Math.round(Math.hypot(city(s,a).x-city(s,b).x,city(s,a).y-city(s,b).y)/2));
const sameEdge=(t,a,b)=>t&&(t.from===a&&t.to===b||t.from===b&&t.to===a);
export function armyPosition(s,a){
  const t=a.travel;if(!t)return {x:city(s,a.location).x,y:city(s,a.location).y};
  const from=city(s,t.from),to=city(s,t.to),p=t.progress/roadLength(s,t.from,t.to);
  return {x:from.x+(to.x-from.x)*p,y:from.y+(to.y-from.y)*p};
}
export function liveSoldiers(s,a){
  const r=armyBattle(s,a.id);
  return r?r.battle.sides.flatMap(x=>x.units).filter(u=>u.armyId===a.id).reduce((n,u)=>n+u.hp,0):armyTroops(a);
}
export const hungerPenalty=a=>a.hunger>=3?.35:a.hunger>=1?.2:a.hunger>0?.1:0;
export function armySpeed(a){
  return round(Math.min(...a.units.map(u=>({cavalry:42,siege:16,ship:24,halberd:24}[u.type]||28)))*(1-(a.hunger>=3?.3:a.hunger>=1?.2:a.hunger>0?.1:0)));
}
export function dailyConsumption(s,a){
  const r=armyBattle(s,a.id),units=r?r.battle.sides.flatMap(x=>x.units).filter(u=>u.armyId===a.id):null;
  const wounded=a.units.reduce((n,u)=>n+u.wounded,0)+(units?units.reduce((n,u)=>n+battleWounded(u),0):0);
  return round(liveSoldiers(s,a)/100+wounded/200);
}
export function newCampaign(seed=521200,scenarioId=null){
  const s=newGame(seed);
  s.campaign={version:CAMPAIGN.version,day:1,phase:'planning',dayPrepared:false,stepInDay:0,battles:[],focusId:null,resumeId:null,idle:[],turnReports:[],lastNotice:'请先处理内政、整军和出征命令，再点击进行。'};
  if(scenarioId)return initializeNationalCampaign(s,scenarioId);
  s.cities.forEach(c=>Object.assign(c,{grain:8000,manpower:6500,order:80,farm:1,commerce:1,barracks:1,walls:1,granary:1,gateHp:15000,governor:null,project:null,reliefTurn:0,drafted:0}));
  s.armies.forEach(a=>{
    Object.assign(a,{supply:1800,supplyCapacity:2400,hunger:0,travel:null,supplyLine:null,supplyIn:0,cooldownDay:0,homeCity:a.location});
    a.units.forEach(u=>u.homeCity=a.location);
  });
  // Two columns on each side make marching, meeting and supporting observable.
  splitCampaignArmy(s,'a1',['yuanxia','jin']);
  const own=s.armies.at(-1);own.name='陈留援军';own.location='chenliu';own.homeCity='chenliu';own.units.forEach(u=>u.homeCity='chenliu');
  const enemy=s.armies.find(a=>a.id==='a2');
  const reserves=enemy.units.splice(4);const eid=`a${s.nextId++}`;
  s.armies.push({...copy(enemy),id:eid,name:'河北后军',location:'baima',homeCity:'baima',units:reserves,leader:reserves[0].id,advisor:reserves[1].id,deputy:reserves[2]?.id||null,supply:600,supplyCapacity:800});
  enemy.supply=1200;enemy.supplyCapacity=1600;normalize(enemy);
  for(const [name,home,faction] of [['荀彧','xuchang','cao'],['程昱','xuchang','cao'],['满宠','chenliu','cao'],['陈群','chenliu','cao'],['审配','ye','yuan']]){
    const source=Object.values(OFFICER_BY_ID).find(u=>u.name===name);if(!source)continue;
    if(s.armies.some(a=>a.units.some(u=>u.id===source.id)))continue;
    s.campaign.idle.push({unit:{...makeOfficer(source.id,0),homeCity:home},faction,location:home,destination:null,remainingDays:0});
  }
  s.armies.forEach(a=>a.detached=false);materializeGarrisons(s);initializeDomestic(s);consolidateCityArmies(s);
  s.logs=[];log(s,'五方向持续委任；城内归并大军团，出征最多十队，战场同时上阵六队。','event');syncResources(s);return s;
}
function initializeNationalCampaign(s,scenarioId){
  const spec=nationalScenario(scenarioId);Object.assign(s,nationalWorld(scenarioId));
  s.campaign.scenarioId=scenarioId;s.campaign.archive=[];s.armies=[];s.nextId=3;s.gold=scenarioId==='guandu-200'?9000:6000;
  for(const c of s.cities)Object.assign(c,{grain:c.kind==='city'?16000:7000,manpower:c.kind==='city'?9000:3000,order:80,farm:1,commerce:1,barracks:1,walls:c.kind==='gate'?2:1,granary:1,gateHp:c.kind==='gate'?18000:15000,governor:null,project:null,reliefTurn:0,drafted:0});
  const roster=nationalRoster(scenarioId,s.cities),assigned=new Map(s.cities.map(c=>[c.id,[]]));
  // Every force staffs its towns before using its remaining officers as reserves.
  for(const faction of new Set(roster.map(o=>o.faction))){
    const pool=roster.filter(o=>o.faction===faction).sort((a,b)=>Number(OFFICER_BY_ID[b.id].sourceId===FACTIONS[faction]?.leaderSourceId)-Number(OFFICER_BY_ID[a.id].sourceId===FACTIONS[faction]?.leaderSourceId)),towns=s.cities.filter(c=>c.owner===faction).sort((a,b)=>Number(b.id===spec.capital)-Number(a.id===spec.capital)||Number(b.kind==='city')-Number(a.kind==='city')||a.sourceId-b.sourceId);
    for(const c of towns){const count=c.kind==='city'?3:1;for(let i=0;i<count&&pool.length;i++){let at=pool.findIndex(o=>o.cityId===c.id);if(at<0)at=0;assigned.get(c.id).push(pool.splice(at,1)[0]);}}
    for(const o of pool)assigned.get(o.cityId).push(o);
  }
  for(const c of s.cities){
    const entries=assigned.get(c.id).sort((a,b)=>Number(OFFICER_BY_ID[b.id].sourceId===FACTIONS[c.owner]?.leaderSourceId)-Number(OFFICER_BY_ID[a.id].sourceId===FACTIONS[c.owner]?.leaderSourceId)),admin=entries.length>=3?[...entries].sort((a,b)=>OFFICER_BY_ID[b.id].politics-OFFICER_BY_ID[a.id].politics).find(o=>o.id!=='cao'&&OFFICER_BY_ID[o.id].sourceId!==FACTIONS[c.owner]?.leaderSourceId):null;
    const combat=entries.filter(o=>o!==admin).slice(0,c.kind==='city'?6:2),combatIds=new Set(combat.map(o=>o.id));
    for(const o of entries.filter(o=>!combatIds.has(o.id)))s.campaign.idle.push({unit:{...makeOfficer(o.id,0,0,3),homeCity:c.id},faction:c.owner,location:c.id,destination:null,remainingDays:0});
    if(admin)c.governor=admin.id;
    if(!combat.length)continue;
    const units=combat.map((o,i)=>({...makeOfficer(o.id,c.kind==='city'?2500:1800,i,3),homeCity:c.id}));
    const leader=units.find(u=>u.id==='cao'||OFFICER_BY_ID[u.id].sourceId===FACTIONS[c.owner]?.leaderSourceId)||units[0];
    s.armies.push({id:`a${s.nextId++}`,name:`${c.name}大军团`,faction:c.owner,location:c.id,homeCity:c.id,route:[],target:null,travel:null,task:'驻守',morale:80,tactic:'balanced',leader:leader.id,advisor:[...units].sort((a,b)=>b.intellect-a.intellect)[0].id,deputy:units.find(u=>u!==leader)?.id||null,units,supply:units.length*600,supplyCapacity:units.length*900,hunger:0,supplyIn:0,supplyLine:null,cooldownDay:0,stationary:c.kind!=='city',detached:false});
  }
  initializeDomestic(s);initializeStrategicAI(s);s.logs=[];s.campaign.lastNotice=`${spec.name} · ${spec.hint}`;log(s,`${spec.era}，${spec.name}。统一全部 87 处据点，成就霸业。`,'event');syncResources(s);return s;
}
function materializeGarrisons(s){
  const used=new Set([...s.armies.flatMap(a=>a.units.map(u=>u.id)),...s.campaign.idle.map(o=>o.unit.id)]),pool=Object.keys(OFFICER_BY_ID).filter(id=>!used.has(id));let index=0;
  for(const c of s.cities){let remaining=c.garrison;if(!remaining)continue;const units=[];
    while(remaining>0){const u={...makeOfficer(pool[index++],0),homeCity:c.id,type:'spear',first:units.length<6,cityGuard:true};u.tactics=defaultTacticIds(u);u.troops=Math.min(remaining,troopCapacity(u));remaining-=u.troops;units.push(u);}
    s.armies.push({id:`a${s.nextId++}`,name:`${c.name}守备军`,faction:c.owner,location:c.id,homeCity:c.id,route:[],target:null,travel:null,task:'驻守',morale:70,tactic:'defensive',leader:units[0].id,advisor:units[0].id,deputy:null,units,supply:units.length*300,supplyCapacity:units.length*600,hunger:0,supplyIn:0,supplyLine:null,cooldownDay:0,stationary:true});c.garrison=0;
  }
}
function mergeLocal(s,a,b){b.units.forEach(u=>u.first=false);a.units.push(...b.units);a.supply=round(a.supply+b.supply);a.supplyCapacity+=b.supplyCapacity;a.hunger=Math.max(a.hunger,b.hunger);a.stationary=!!a.stationary&&!!b.stationary;s.armies=s.armies.filter(x=>x!==b);normalize(a);}
export function consolidateCityArmies(s){
  for(const c of s.cities){const locals=s.armies.filter(a=>a.location===c.id&&a.faction===c.owner&&!a.travel&&!a.route.length&&!armyBattle(s,a.id)&&!a.disbanded&&!a.detached&&a.cooldownDay<=s.campaign.day);const a=locals[0];if(!a)continue;for(const b of locals.slice(1))mergeLocal(s,a,b);a.name=`${c.name}大军团`;}
}
function syncResources(s){s.grain=Math.floor(s.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0));s.turn=calendar(s).turn;}
export function findCampaignRoute(s,from,to,faction=null){
  const dist=new Map([[from,0]]),paths=new Map([[from,[]]]),todo=new Set(s.cities.map(c=>c.id));
  while(todo.size){const current=[...todo].sort((a,b)=>(dist.get(a)??Infinity)-(dist.get(b)??Infinity)||a.localeCompare(b))[0];
    if(!dist.has(current))return null;todo.delete(current);if(current===to)return paths.get(current);
    if(current!==from&&faction&&city(s,current).owner!==faction)continue;
    for(const [a,b] of s.roads){const next=a===current?b:b===current?a:null;if(!next||!todo.has(next))continue;
      const d=dist.get(current)+roadLength(s,current,next);if(d<(dist.get(next)??Infinity)){dist.set(next,d);paths.set(next,[...paths.get(current),next]);}}
  }return null;
}
export function orderCampaignArmy(s,id,target){
  const a=army(s,id);if(!isPlanning(s)||!a||a.faction!=='cao'||!city(s,target))return '只能在战略筹划阶段下达军令';
  if(armyBattle(s,id))return '军团正在交战，请在战场下达撤退或派遣其他军团支援';
  if(target!==a.location&&a.units.length>CAMPAIGN.maxUnits)return '出征军团最多10队，请先从城内大军团拆分出征部队';
  if(!armyTroops(a))return '请先征募兵员';
  const from=a.travel?.to||a.location,route=findCampaignRoute(s,from,target);
  if(!route)return '道路不通';
  a.route=a.travel?[a.travel.to,...route]:route;a.target=a.route.length?target:null;a.task=a.route.length?'行军':'驻守';if(a.route.length){a.detached=false;a.stationary=false;}return null;
}
export function splitCampaignArmy(s,id,ids){
  const a=army(s,id);if(!canEditArmy(s,a)||a.faction!=='cao')return '须在筹划阶段于友城拆分驻守军团';
  if(s.armies.length>=CAMPAIGN.maxArmies)return '军团数量已达上限';
  const chosen=a.units.filter(u=>ids.includes(u.id));
  if(chosen.length>CAMPAIGN.maxUnits)return '出征军团最多10队，请减少所选部队';
  if(!chosen.length||chosen.length===a.units.length||!chosen.some(u=>u.troops)||!a.units.some(u=>!ids.includes(u.id)&&u.troops))return '两支军团都需保留有兵力的部队';
  const ratio=chosen.length/a.units.length,capacity=Math.floor(a.supplyCapacity*ratio),supply=round(a.supply*ratio);
  const b={...copy(a),id:`a${s.nextId++}`,name:`${chosen[0].name}军`,units:chosen,leader:chosen[0].id,advisor:[...chosen].sort((x,y)=>y.intellect-x.intellect)[0].id,deputy:chosen[1]?.id||null,supplyCapacity:capacity,supply,route:[],target:null,detached:true,stationary:false};
  a.units=a.units.filter(u=>!ids.includes(u.id));a.supplyCapacity-=capacity;a.supply=round(a.supply-supply);normalize(a);normalize(b);s.armies.push(b);return null;
}
function normalize(a){for(const key of ['leader','advisor','deputy'])if(!a.units.some(u=>u.id===a[key]))a[key]=key==='deputy'?null:a.units[0].id;let n=0;for(const u of a.units)if(u.first)u.first=++n<=6;if(!a.units.some(u=>u.first))a.units.slice(0,6).forEach(u=>u.first=true);}
export function mergeCampaignArmies(s,into,from){
  const a=army(s,into),b=army(s,from);if(!canEditArmy(s,a)||!canEditArmy(s,b)||a===b||a.location!==b.location||a.faction!=='cao'||b.faction!=='cao')return '须选择同城驻守的己方军团';
  if(b.units.some(u=>a.units.some(x=>x.id===u.id)))return '不能合并重复武将';
  mergeLocal(s,a,b);a.detached=false;return null;
}
export function createCampaignArmy(s,cityId,ids){
  const c=city(s,cityId);if(!isPlanning(s)||c?.owner!=='cao')return '须在己方城池筹划';
  if(activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===cityId))return '围城期间无法编制新军团';
  const officers=s.campaign.idle.filter(o=>o.location===cityId&&!o.destination&&o.faction==='cao'&&ids.includes(o.unit.id));
  const local=s.armies.find(a=>canEditArmy(s,a)&&a.location===cityId&&a.faction==='cao'&&!a.detached);
  if(!officers.length||(!local&&s.armies.length>=CAMPAIGN.maxArmies))return '请选择本城待命武将，或军团数量已满';
  if(officers.some(o=>s.cities.some(x=>x.governor===o.unit.id)))return '请先解除太守任命';
  if(officers.some(o=>!canTrain(c,o.unit.type)))return '本城尚未掌握该武将当前兵种技术，请先研发';
  officers.forEach(o=>cancelDomestic(s,o.unit.id,'编入部队'));
  const units=officers.map((o,i)=>({...o.unit,first:!local&&i<6}));
  if(local){local.units.push(...units);local.supplyCapacity+=units.length*300;normalize(local);s.campaign.idle=s.campaign.idle.filter(o=>!officers.includes(o));return null;}
  s.armies.push({id:`a${s.nextId++}`,name:`${units[0].name}军`,faction:'cao',location:cityId,homeCity:cityId,route:[],target:null,travel:null,task:'驻守',morale:80,tactic:'balanced',leader:units[0].id,advisor:[...units].sort((a,b)=>b.intellect-a.intellect)[0].id,deputy:units[1]?.id||null,units,supply:0,supplyCapacity:units.length*300,hunger:0,supplyIn:0,supplyLine:null,cooldownDay:0});
  s.campaign.idle=s.campaign.idle.filter(o=>!officers.includes(o));return null;
}
export function transferOfficer(s,id,destination){
  const o=s.campaign.idle.find(o=>o.unit.id===id),c=city(s,destination);
  if(!isPlanning(s)||!o||o.faction!=='cao'||o.destination||c?.owner!=='cao')return '只能调任在城待命武将到友城';
  if(s.cities.some(c=>c.governor===id))return '请先解除太守任命';
  const route=findCampaignRoute(s,o.location,destination,'cao');if(!route)return '调任道路不通';
  let at=o.location,distance=0;for(const next of route){distance+=roadLength(s,at,next);at=next;}
  if(!distance)return null;cancelDomestic(s,id,'调任其他城池');o.destination=destination;o.remainingDays=Math.ceil(distance/35);o.unit.homeCity=destination;return null;
}
export function recruitCampaign(s,id){
  const a=army(s,id);if(!canEditArmy(s,a)||a.faction!=='cao')return '只能在筹划阶段于友城整补';
  const c=city(s,a.location),eligible=a.units.filter(u=>canTrain(c,u.type)),need=eligible.reduce((n,u)=>n+Math.max(0,troopCapacity(u)-u.troops-u.wounded),0);
  const amount=Math.floor(Math.min(need,c.manpower-reservedMen(c),2000+c.barracks*1000-c.drafted-reservedMen(c),s.gold*4,c.grain));
  if(amount<=0)return '兵员已足，或本旬征募额度、府库、兵源、粮草不足';
  let left=amount;for(const u of [...eligible].sort((a,b)=>a.troops-b.troops)){const n=Math.min(left,troopCapacity(u)-u.troops-u.wounded);u.troops+=n;left-=n;}
  c.manpower-=amount;c.drafted+=amount;c.grain-=amount;s.gold-=Math.ceil(amount/4);syncResources(s);return null;
}
export function commissionProject(s,cityId,key){
  const c=city(s,cityId),p=PROJECTS[key];if(!isPlanning(s)||c?.owner!=='cao'||!p)return '只能在筹划阶段安排己方内政';
  const cost=projectCost(s,c,key);
  if(c.project)return '该城已有建设任务';if(c[p.field]>=5)return '设施已达五级';if(s.gold<cost)return '府库不足';
  if(activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===cityId))return '围城期间无法开工';
  s.gold-=cost;c.project={key,remaining:p.turns};return null;
}
export function relieveCity(s,cityId){
  return '城市民心已停用，请通过人才委任安抚本城武将';
}
export function changeCampaignTroop(s,armyId,unitId,type){const a=army(s,armyId),u=a?.units.find(u=>u.id===unitId);if(!u||!canEditArmy(s,a)||a.faction!=='cao')return '只能在己方城池筹划时改编';if(!canTrain(city(s,a.location),type))return '本城未掌握该兵种技术或不具备水域条件';u.type=type;u.tactics=defaultTacticIds(u);return null;}
export function appointGovernor(s,cityId,id){
  const c=city(s,cityId);if(!isPlanning(s)||c?.owner!=='cao')return '只能在筹划阶段任命';
  if(id&&!s.campaign.idle.some(o=>o.unit.id===id&&o.location===cityId&&!o.destination&&o.faction==='cao'))return '太守必须在本城待命';
  c.governor=id||null;return null;
}
export const cityGovernor=(s,c)=>s.campaign.idle.find(o=>o.unit.id===c.governor&&!o.destination&&o.location===c.id&&o.faction===c.owner);
export const governorSkillList=(s,c)=>{const governor=cityGovernor(s,c);return governor?passiveList(governor.unit).filter(p=>p.domain==='domestic'&&p.unlocked):[];};
export const projectCost=(s,c,key)=>Math.ceil(PROJECTS[key].cost*(1-(domesticEffects(cityGovernor(s,c)?.unit).projectDiscount||0)));
export const reliefAmount=(s,c)=>15+(domesticEffects(cityGovernor(s,c)?.unit).relief||0);
export function cityIncome(s,c){
  const governor=cityGovernor(s,c),effects=domesticEffects(governor?.unit);
  const factor=1+(governor?.unit.politics||0)/500;
  return {gold:Math.floor((160+c.commerce*160)*factor*(1+(effects.gold||0)+effect(c,'gold',s.turn))),grain:Math.floor((600+c.farm*600)*factor*(1+(effects.grain||0)+effect(c,'grain',s.turn))),manpower:Math.floor((500+c.barracks*500)*factor*(1+(effects.manpower||0)))};
}
function finishTurn(s){
  const summary=[];
  for(const c of s.cities){
    const besieged=activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===c.id);
    if(!besieged&&c.project&&!c.project.domestic){c.project.remaining--;if(c.project.remaining<=0){const p=PROJECTS[c.project.key];c[p.field]++;if(p.field==='walls')c.gateHp+=3000;summary.push(`${c.name}完成${p.name}`);c.project=null;}}
    c.drafted=0;if(besieged)continue;
    const income=cityIncome(s,c);if(c.owner==='cao')s.gold+=income.gold;else if(s.campaign.ai&&Object.hasOwn(s.campaign.ai.treasuries,c.owner))s.campaign.ai.treasuries[c.owner]+=income.gold;
    c.grain=Math.min(10000+c.granary*10000,c.grain+income.grain);c.manpower=Math.min(30000,c.manpower+income.manpower);c.gateHp=Math.min(12000+c.walls*3000,c.gateHp+1500);
    if(c.owner==='cao')summary.push(`${c.name}：金 +${income.gold}，粮 +${income.grain}，预备兵 +${income.manpower}`);
    const governor=cityGovernor(s,c);
    if(governor){const growth=gainExperience(governor.unit,100);if(c.owner==='cao'&&growth.gained)summary.push(`${governor.unit.name}治政经验 +100${growth.unlocked.length?'，习得 '+growth.unlocked.join('、'):''}`);}
  }
  s.campaign.turnReports.unshift({turn:s.turn,items:summary});s.campaign.turnReports=s.campaign.turnReports.slice(0,12);
}
function blocked(s,from,to,faction){return s.armies.some(a=>a.faction!==faction&&liveSoldiers(s,a)>0&&sameEdge(a.travel,from,to));}
export function supplyConnection(s,a){
  let best=null;
  for(const source of s.cities.filter(c=>c.owner===a.faction&&c.grain>0)){
    // Dijkstra over controlled depots; hostile road occupation cuts the connection.
    const queue=[{id:source.id,distance:0,path:[source.id]}],seen=new Set();
    while(queue.length){queue.sort((x,y)=>x.distance-y.distance||x.id.localeCompare(y.id));const p=queue.shift();if(seen.has(p.id))continue;seen.add(p.id);
      if(p.distance>CAMPAIGN.supplyRange)continue;
      if(p.id===a.location){const distance=p.distance+(a.travel?a.travel.progress:0);if(distance<=CAMPAIGN.supplyRange){const rate=Math.max(30,Math.floor((240+source.granary*120)/(1+distance/90)));if(!best||rate>best.rate||rate===best.rate&&source.id<best.source)best={source:source.id,path:p.path,distance:round(distance),rate};}break;}
      for(const [x,y] of s.roads){const next=x===p.id?y:y===p.id?x:null;if(!next||seen.has(next)||city(s,next).owner!==a.faction||blocked(s,p.id,next,a.faction))continue;queue.push({id:next,distance:p.distance+roadLength(s,p.id,next),path:[...p.path,next]});}
    }
  }
  if(a.travel){const t=a.travel;
    if(s.armies.some(e=>e.faction!==a.faction&&sameEdge(e.travel,t.from,t.to)&&liveSoldiers(s,e)>0&&((e.travel.from===t.from?e.travel.progress:roadLength(s,t.from,t.to)-e.travel.progress)<t.progress-.01)))return null;
  }
  return best;
}
function desert(u,amount){u.hp-=amount;u.battleDamage+=amount;u.battleDeserted=(u.battleDeserted||0)+amount;if(!u.hp){u.status='defeated';u.action='断粮解散';}}
function disband(s,a){
  const r=armyBattle(s,a.id);
  const returning=[];
  if(r)for(const u of r.battle.sides.flatMap(x=>x.units).filter(u=>u.armyId===a.id))desert(u,u.hp);
  for(const unit of a.units){const home=s.cities.find(c=>c.id===unit.homeCity&&c.owner===a.faction)||s.cities.find(c=>c.owner===a.faction);if(home)returning.push({unit:{...copy(unit),troops:0,wounded:0,homeCity:home.id},faction:a.faction,location:a.location,destination:home.id,remainingDays:Math.max(1,Math.ceil(Math.hypot(city(s,a.location).x-home.x,city(s,a.location).y-home.y)/70))});}
  if(r){a.disbanded=true;a.returningOfficers=returning;a.units.forEach(u=>{u.troops=0;u.wounded=0;});}else {s.campaign.idle.push(...returning);s.armies=s.armies.filter(x=>x!==a);}
  log(s,`第 ${s.campaign.day} 天：${a.name}缺粮五日，部队解散，武将返城。`,'war');
}
function dailySupply(s){
  const budgets=new Map(s.cities.map(c=>[c.id,240+c.granary*120])),edges=new Map();
  for(const a of [...s.armies].filter(a=>!a.disbanded).sort((a,b)=>a.supply/Math.max(1,dailyConsumption(s,a))-b.supply/Math.max(1,dailyConsumption(s,b))||a.id.localeCompare(b.id))){
    const need=dailyConsumption(s,a),link=supplyConnection(s,a);a.supplyLine=link;a.supplyIn=0;
    if(link){const source=city(s,link.source),legs=link.path.slice(1).map((id,i)=>[link.path[i],id].sort().join(':'));if(a.travel)legs.push([a.travel.from,a.travel.to].sort().join(':'));
      const amount=Math.max(0,Math.min(a.supplyCapacity-a.supply,source.grain,budgets.get(source.id),link.rate,...legs.map(k=>360-(edges.get(k)||0))));
      a.supply=round(a.supply+amount);source.grain=round(source.grain-amount);budgets.set(source.id,budgets.get(source.id)-amount);legs.forEach(k=>edges.set(k,(edges.get(k)||0)+amount));a.supplyIn=round(amount);
    }
    const paid=Math.min(need,a.supply);a.supply=round(a.supply-paid);a.hunger=round(Math.max(0,Math.min(5,a.hunger+(need&&paid<need?1-paid/need:-1))));
    if(a.hunger>=5){disband(s,a);continue;}
    const r=armyBattle(s,a.id);if(r){for(const u of r.battle.sides.flatMap(x=>x.units).filter(u=>u.armyId===a.id)){u.supplyPenalty=hungerPenalty(a);if(a.hunger>=3)desert(u,Math.ceil(u.hp*.1));}}
    else if(a.hunger>=3){for(const u of a.units)u.troops=Math.floor(u.troops*.9);}
    if(!r&&!a.travel&&!a.route.length&&city(s,a.location).owner===a.faction&&a.hunger===0){if(s.campaign.scenarioId)a.morale=Math.min(80,a.morale+2);for(const u of a.units){const n=Math.min(u.wounded,18+city(s,a.location).barracks*6+city(s,a.location).clinic*6);u.wounded-=n;u.troops+=n;}}
  }
  syncResources(s);
}
function enemyOrders(s){
  if(s.campaign.scenarioId){manageStrategicEconomy(s);planStrategicAI(s,{roadLength,supplyConnection});return;}
  for(const a of s.armies.filter(a=>a.faction!=='cao'&&a.faction!=='neutral'&&!a.disbanded)){
    if(a.stationary||a.cooldownDay>s.campaign.day||a.units.length>10||a.route.length||armyBattle(s,a.id)||!armyTroops(a))continue;
    const targets=s.cities.filter(c=>s.campaign.scenarioId?c.owner!==a.faction:c.owner==='cao').map(c=>({c,route:findCampaignRoute(s,a.travel?.to||a.location,c.id,a.faction)})).filter(x=>x.route);
    targets.sort((x,y)=>x.route.length-y.route.length||x.c.id.localeCompare(y.c.id));
    if(targets[0]){a.route=a.travel?[a.travel.to,...targets[0].route]:targets[0].route;a.target=targets[0].c.id;a.task='出征';}
  }
}
export function beginExecution(s){
  if(!isPlanning(s))return '当前不在战略筹划阶段';
  for(const a of s.armies)if(a.detached&&!a.route.length)a.detached=false;
  consolidateCityArmies(s);generateDomesticOpportunities(s);beginDomesticTurn(s);enemyOrders(s);s.campaign.phase='executing';
  const resume=battleRecord(s,s.campaign.resumeId);if(resume&&!resume.settled){s.campaign.focusId=resume.id;s.battle=resume.battle;resume.control='manual';}
  s.campaign.lastNotice=`第 ${s.campaign.day} 天：诸军奉令，开始执行本旬命令。`;return null;
}
function terrainFor(s,from,to){if(s.campaign.scenarioId){const places=[city(s,from),city(s,to)];if(places.some(c=>c?.kind==='port'))return 'river';if(places.some(c=>c?.kind==='gate'))return 'hill';if(places.some(c=>['南中','巴蜀'].includes(c?.province)))return 'forest';return 'land';}if([from,to].includes('baima'))return 'river';if([from,to].includes('jinyang'))return 'hill';if([from,to].includes('wan'))return 'forest';if([from,to].includes('runan'))return 'marsh';return 'land';}
function makeEncounter(s,attacker,defenders,cityId,kind,point){
  const previous=armyBattle(s,attacker.id);if(previous)return previous;
  // An encounter has exactly two factions. Third parties retain their own army
  // and wait outside an existing siege instead of becoming allied defenders.
  const defendingFaction=kind==='siege'?city(s,cityId).owner:defenders[0]?.faction;
  defenders=defenders.filter(a=>a.faction===defendingFaction);
  const proxy=newGame(s.seed+s.nextId*997);if(s.campaign.scenarioId)Object.assign(proxy,nationalWorld(s.campaign.scenarioId));proxy.relationshipScores=copy(s.relationshipScores);proxy.relationshipTypes=copy(s.relationshipTypes);
  const members=[attacker,...defenders];proxy.armies=members.map(a=>({...copy(a),location:cityId,route:[],target:null}));
  const c=city(proxy,cityId),real=city(s,cityId);c.owner=kind==='siege'?real.owner:attacker.faction;c.garrison=kind==='siege'?real.garrison:0;
  proxy.pending={attackerId:attacker.id,defenderIds:defenders.map(a=>a.id),cityId,origin:attacker.location,defenderFaction:defenders[0]?.faction||real.owner};
  startBattle(proxy);const b=proxy.battle,id=`campaign-battle-${s.nextId++}`;b.id=id;
  b.maxTicks=CAMPAIGN.stepsPerDay*CAMPAIGN.maxBattleDays;
  if(!b.sides[0].units.length&&attacker.faction!=='cao'&&real.owner!=='cao'&&kind==='siege'){
    // Engine's garrison side defaults to enemy for non-player factions.
    const guards=b.sides[1].units.filter(u=>u.armyId.startsWith('city:'));b.sides[1].units=b.sides[1].units.filter(u=>!guards.includes(u));
    b.sides[0].units=guards.map(u=>({...u,side:0,status:'reserve',x:-1,y:-1}));
  }
  const attackSide=attacker.faction==='cao'?0:1;
  b.sides[attackSide].faction=attacker.faction;b.sides[1-attackSide].faction=defenders[0]?.faction||real.owner;
  b.terrain=members.some(a=>a.units.some(u=>u.type==='ship'))?'river':terrainFor(s,attacker.travel?.from||attacker.location,attacker.travel?.to||cityId);
  // Rebuild legal positions after selecting the map-derived terrain.
  for(const side of b.sides)for(const u of side.units){u.status='reserve';u.x=-1;u.y=-1;u.supplyPenalty=hungerPenalty(members.find(a=>a.id===u.armyId)||{hunger:0});}
  if(kind==='siege'){
    const side=1-attackSide;b.siege={attackerSide:attackSide,gate:{id:'siege-gate',name:'城门',type:'gate',side,x:side===0?1:12,y:4,hp:Math.max(1,real.gateHp),maxHp:12000+real.walls*3000}};
  }
  initializeBattleSlots(b);
  if(kind==='siege')b.domesticOpening={...siegeOpening(real,s.campaign.day),applied:false,side:1-attackSide};
  const r={id,name:kind==='siege'?`${real.name}攻守战`:`${city(s,attacker.travel?.from||attacker.location).name}道遭遇战`,cityId,kind,point:copy(point),attackSide,armyIds:members.map(a=>a.id),armies:copy(members),startedDay:s.campaign.day,endedDay:null,control:'auto',awaiting:members.some(a=>a.faction==='cao')||real.owner==='cao'&&kind==='siege',settled:false,battle:b,templates:{},snapshots:[],report:null};
  members.forEach(a=>{a.task='交战';a.route=[];a.target=null;});
  s.campaign.battles.push(r);captureDay(s,r);if(!r.awaiting)lockDeployment(b);
  log(s,`第 ${s.campaign.day} 天：${r.name}爆发。`,'war');return r;
}
// Reuse the engine's legal terrain/slot placement without advancing time or intent.
import {fillSlots} from './engine.mjs';
function initializeBattleSlots(b){fillSlots(b,0);fillSlots(b,1);planEnemyArmy(b);}
function joinBattle(s,r,a){
  if(r.armyIds.includes(a.id)||r.settled)return;
  const side=r.battle.sides.findIndex(x=>x.faction===a.faction);if(side<0)return;
  const leader=a.units.find(u=>u.id===a.leader),deputy=a.units.find(u=>u.id===a.deputy),advisor=a.units.find(u=>u.id===a.advisor);
  r.armies.push(copy(a));r.armyIds.push(a.id);r.battle.context[side===r.attackSide?'attackingIds':'defenderIds'].push(a.id);
  r.battle.sides[side].commanders.push(...armyCommanders(a));
  for(const source of a.units.filter(u=>u.troops>0))r.battle.sides[side].units.push({...combatUnit(source,a.id,side,a.morale),commandBonus:(leader?.leadership||60)/1000,deputyBonus:(deputy?.force||0)/2000,advisorBonus:(advisor?.intellect||0)/1000,supplyPenalty:hungerPenalty(a),arrivalTick:r.battle.tick,wave:r.armyIds.length});
  a.route=[];a.target=null;a.task='交战';log(s,`第 ${s.campaign.day} 天：${a.name}抵达${r.name}，进入预备序列。`,'war');
}
function moveArmies(s){
  const movements=[];
  for(const a of s.armies){if(a.disbanded||armyBattle(s,a.id)||!a.route.length||a.cooldownDay>s.campaign.day||!armyTroops(a))continue;
    if(!a.travel)a.travel={from:a.location,to:a.route[0],progress:0};
    const t=a.travel,length=roadLength(s,t.from,t.to),before=t.progress;t.progress=Math.min(length,round(t.progress+armySpeed(a)));movements.push({a,before,after:t.progress,length});
  }
  // Swept intervals catch head-on crossings even if neither ends at a city.
  for(let i=0;i<movements.length;i++)for(let j=i+1;j<movements.length;j++){
    const x=movements[i],y=movements[j];if(x.a.faction===y.a.faction||armyBattle(s,x.a.id)||armyBattle(s,y.a.id)||!sameEdge(y.a.travel,x.a.travel.from,x.a.travel.to))continue;
    const same=x.a.travel.from===y.a.travel.from,y0=same?y.before:x.length-y.before,y1=same?y.after:x.length-y.after;
    if((x.before-y0)*(x.after-y1)>0)continue;
    const denom=(x.after-x.before)-(y1-y0),time=denom?Math.max(0,Math.min(1,(y0-x.before)/denom)):0;
    const p=round(x.before+(x.after-x.before)*time);x.a.travel.progress=p;y.a.travel.progress=same?p:x.length-p;
    makeEncounter(s,x.a,[y.a],x.a.travel.to,'field',armyPosition(s,x.a));
  }
  for(const m of movements){const a=m.a;if(armyBattle(s,a.id))continue;
    // An army reaches an ongoing battle along the same road, rather than joining remotely.
    const r=activeBattles(s).find(r=>r.armyIds.some(id=>{const target=army(s,id);if(!target?.travel||!sameEdge(target.travel,a.travel.from,a.travel.to))return false;const p=target.travel.from===a.travel.from?target.travel.progress:m.length-target.travel.progress;return p>=m.before-.01&&p<=m.after+.01;}));
    if(r&&r.battle.sides.some(x=>x.faction===a.faction)){const target=r.armyIds.map(id=>army(s,id)).find(x=>sameEdge(x?.travel,a.travel.from,a.travel.to));a.travel.progress=target.travel.from===a.travel.from?target.travel.progress:m.length-target.travel.progress;joinBattle(s,r,a);continue;}
    // Stationary armies may be waiting in the middle of a road after combat.
    const defender=s.armies.find(e=>e.faction!==a.faction&&!e.disbanded&&!armyBattle(s,e.id)&&e.cooldownDay<=s.campaign.day&&sameEdge(e.travel,a.travel.from,a.travel.to)&&liveSoldiers(s,e)>0&&(()=>{const p=e.travel.from===a.travel.from?e.travel.progress:m.length-e.travel.progress;return p>=m.before-.01&&p<=m.after+.01;})());
    if(defender){a.travel.progress=defender.travel.from===a.travel.from?defender.travel.progress:m.length-defender.travel.progress;makeEncounter(s,a,[defender],a.travel.to,'field',armyPosition(s,a));continue;}
    if(a.travel.progress<m.length)continue;
    const destination=a.travel.to,existing=activeBattles(s).find(r=>r.kind==='siege'&&r.cityId===destination);
    if(existing&&!existing.battle.sides.some(x=>x.faction===a.faction)){a.travel.progress=Math.max(0,m.length-.01);a.task='围城外待命';continue;}
    a.location=destination;a.travel=null;a.route.shift();
    if(existing&&existing.battle.sides.some(x=>x.faction===a.faction)){joinBattle(s,existing,a);continue;}
    const defenders=s.armies.filter(e=>e!==a&&!e.travel&&e.location===destination&&e.faction!==a.faction&&!armyBattle(s,e.id)&&armyTroops(e)>0);
    const c=city(s,destination);
    if(defenders.length||c.owner!==a.faction&&(c.garrison>0||c.gateHp>0)){makeEncounter(s,a,defenders,destination,c.owner!==a.faction?'siege':'field',armyPosition(s,a));continue;}
    if(c.owner!==a.faction){c.owner=a.faction;c.project=null;c.governor=null;reconcileDomestic(s);}
    if(!a.route.length){a.target=null;a.task='驻守';}
  }
}
function autoCommand(b){
  // Score the player side using the same deterministic command policy as its opponent.
  const key=chooseEnemyCommand(b,battleStratagems(b,0),STRATAGEMS,0);if(key)issueCommand(b,key);
}
function returnArmy(s,a,r,lost){
  a.cooldownDay=s.campaign.day+2;a.route=[];a.target=null;a.task=lost?'撤退':'整队';
  if(!lost)return;
  // Reverse the actual road position; survivors must march home rather than teleport.
  if(a.travel){const t=a.travel;a.location=t.to;a.travel={from:t.to,to:t.from,progress:round(roadLength(s,t.from,t.to)-t.progress)};}
  const from=a.travel?.to||a.location,targets=s.cities.filter(c=>c.owner===a.faction).map(c=>({c,route:findCampaignRoute(s,from,c.id)})).filter(x=>x.route);
  targets.sort((x,y)=>x.route.length-y.route.length||x.c.id.localeCompare(y.c.id));
  if(targets[0]){a.route=a.travel?[a.travel.to,...targets[0].route]:targets[0].route;a.target=a.route.length?targets[0].c.id:null;}
}
function splitRetreatingArmy(s,a){
  if(a.units.length<=10||!a.route.length&&!a.travel)return;
  const groups=[];for(let i=0;i<a.units.length;i+=10)groups.push(a.units.slice(i,i+10));
  const total=a.units.length,capacity=a.supplyCapacity,supply=a.supply;let usedCapacity=0,usedSupply=0;
  groups.forEach((units,i)=>{const last=i===groups.length-1,partCapacity=last?capacity-usedCapacity:Math.floor(capacity*units.length/total),partSupply=last?round(supply-usedSupply):round(supply*units.length/total),group=i?{...copy(a),id:`a${s.nextId++}`,name:`${units[0].name}撤退军`}:a;
    group.units=units;group.supplyCapacity=partCapacity;group.supply=partSupply;usedCapacity+=partCapacity;usedSupply=round(usedSupply+partSupply);normalize(group);if(i)s.armies.push(group);
  });
}
function settleEncounter(s,r){
  if(r.settled||!r.battle.result)return;
  const b=r.battle,stats=b.sides.map(side=>({faction:side.faction,initial:0,remaining:0,wounded:0,killed:0,escaped:0})),growth=[];
  for(let side=0;side<2;side++)for(const u of b.sides[side].units){const st=stats[side],wounded=battleWounded(u),escaped=u.battleDeserted||0;st.initial+=u.initial;st.remaining+=u.hp;st.wounded+=wounded;st.escaped+=escaped;st.killed+=u.initial-u.hp-wounded-escaped;
    const a=army(s,u.armyId),source=a?.units.find(x=>x.id===u.id);if(!source||a.disbanded)continue;
    source.troops=u.hp;source.wounded+=wounded;
    if(u.participated){const g=gainExperience(source,PROGRESSION.participation+(b.result.winner===side?PROGRESSION.victory:0));growth.push({name:u.name,...g});}
  }
  if(r.kind==='siege'){
    const c=city(s,r.cityId);c.gateHp=b.siege.gate.hp;
    c.garrison=b.sides.flatMap(x=>x.units).filter(u=>u.armyId===`city:${c.id}`).reduce((n,u)=>n+u.hp,0);
    if(b.result.winner===r.attackSide){c.owner=b.sides[r.attackSide].faction;c.garrison=0;c.governor=null;c.project=null;reconcileDomestic(s);}
  }
  for(const id of r.armyIds){const a=army(s,id);if(!a||a.disbanded)continue;const side=b.sides.findIndex(x=>x.faction===a.faction);const lost=b.result.winner!==side&&(b.result.winner!==null||side===r.attackSide);a.morale=Math.max(25,Math.min(100,a.morale+(lost?-18:8)));returnArmy(s,a,r,lost);}
  r.settled=true;r.awaiting=false;r.endedDay=s.campaign.day;r.report={winner:b.result.winner,reason:b.result.reason,stats,growth};
  for(const a of [...s.armies].filter(a=>r.armyIds.includes(a.id)&&!a.disbanded))splitRetreatingArmy(s,a);
  for(const a of s.armies.filter(a=>a.disbanded&&r.armyIds.includes(a.id)))s.campaign.idle.push(...(a.returningOfficers||[]));
  s.armies=s.armies.filter(a=>!a.disbanded||!r.armyIds.includes(a.id));if(b.result.winner!==null&&b.sides[b.result.winner].faction==='cao'){s.victories++;s.fame+=30;}
  if(s.campaign.focusId===r.id){s.campaign.focusId=null;s.battle=null;}
  s.campaign.lastNotice=`${r.name}结束：${b.result.reason}。战果已回写，军团就地整队或沿路撤退。`;
  log(s,`第 ${s.campaign.day} 天：${s.campaign.lastNotice}`,'war');
  if(b.result.winner!==null&&b.sides[b.result.winner].faction==='cao'){const c=city(s,r.cityId);if(c.owner==='cao'&&b.sides[1-b.result.winner].units.some(u=>['siege','crossbow'].includes(u.type)))c.domestic.opportunities.push({kind:'capture',expires:s.campaign.day+30,amount:0,saved:0});}
  syncResources(s);
}
function captureDay(s,r){
  for(const u of r.battle.sides.flatMap(x=>x.units))if(!r.templates[u.id])r.templates[u.id]=copy(u);
  const data=copy(r.battle);
  data.sides.forEach(side=>side.units=side.units.map(u=>Object.fromEntries(Object.entries(u).filter(([key,value])=>key==='id'||JSON.stringify(value)!==JSON.stringify(r.templates[u.id][key])))));
  const snapshot={day:s.campaign.day,tick:r.battle.tick,data};
  const index=r.snapshots.findIndex(x=>x.day===snapshot.day);if(index>=0)r.snapshots[index]=snapshot;else r.snapshots.push(snapshot);
}
function archiveCampaignBattles(s){
  if(!s.campaign.scenarioId)return;
  const c=s.campaign,completed=c.battles.filter(r=>r.settled).sort((a,b)=>b.endedDay-a.endedDay||b.startedDay-a.startedDay),old=completed.slice(20);
  if(!old.length)return;
  const ids=new Set(old.map(r=>r.id));
  c.archive.push(...old.map(r=>({id:r.id,name:r.name,startedDay:r.startedDay,endedDay:r.endedDay,reason:r.report.reason,winner:r.report.winner===null?null:r.battle.sides[r.report.winner].faction})));
  c.archive.sort((a,b)=>b.endedDay-a.endedDay||a.id.localeCompare(b.id));c.archive=c.archive.slice(0,100);
  c.battles=c.battles.filter(r=>!ids.has(r.id));if(ids.has(c.resumeId))c.resumeId=null;
}
export function readDailySnapshot(r,day){const snapshot=r.snapshots.find(x=>x.day===day);if(!snapshot)return null;const b=copy(snapshot.data);b.sides.forEach(side=>side.units=side.units.map(u=>({...copy(r.templates[u.id]),...u})));return b;}
export function chooseEncounter(s,id,manual){
  const r=battleRecord(s,id);if(!r||r.settled||!r.awaiting)return '该遭遇已处理';
  r.awaiting=false;r.control=manual?'manual':'auto';
  if(manual){delegateCurrent(s);s.campaign.focusId=id;s.campaign.resumeId=id;s.battle=r.battle;}
  else lockDeployment(r.battle);
  return null;
}
function delegateCurrent(s){const r=battleRecord(s,s.campaign.focusId);if(r&&!r.settled){r.control='auto';lockDeployment(r.battle);}s.campaign.focusId=null;s.battle=null;}
export function viewCampaignMap(s){delegateCurrent(s);s.campaign.resumeId=null;}
export function takeOverBattle(s,id){
  const r=battleRecord(s,id);if(!r||r.settled)return '战役已经结束，只能查看快照';
  if(isPlanning(s))return '请先完成本旬战略操作并点击进行';
  if(r.awaiting)return chooseEncounter(s,id,true);
  delegateCurrent(s);r.control='manual';s.campaign.focusId=id;s.campaign.resumeId=id;s.battle=r.battle;return null;
}
function prepareDay(s){
  const c=s.campaign;if(c.dayPrepared)return;
  for(const o of c.idle)if(o.destination){o.remainingDays--;if(o.remainingDays<=0){const dest=city(s,o.destination);if(dest.owner===o.faction){o.location=o.destination;o.destination=null;o.remainingDays=0;}else{const home=s.cities.find(x=>x.owner===o.faction);o.destination=home?.id||null;o.remainingDays=home?2:0;}}}
  dailySupply(s);if(c.scenarioId)planStrategicAI(s,{roadLength,supplyConnection});moveArmies(s);consolidateCityArmies(s);reconcileDomestic(s);syncResources(s);c.dayPrepared=true;
  for(const r of activeBattles(s))captureDay(s,r);
}
export function advanceCampaignStep(s){
  const c=s.campaign;if(c.phase!=='executing'||s.finished)return {paused:true};
  prepareDay(s);
  if(activeBattles(s).some(r=>r.awaiting))return {encounter:true};
  if(activeBattles(s).some(r=>r.control==='manual'&&!r.battle.deploymentLocked))return {deployment:true};
  for(const r of activeBattles(s)){
    if(r.battle.domesticOpening?.applied&&!r.openingConsumed){const c=city(s,r.cityId);for(const key of ['intent','shield'])if(c.domestic.preparation[key]?.actionId===r.battle.domesticOpening[key+'Id'])c.domestic.preparation[key]=null;r.openingConsumed=true;}
    if(r.control==='auto')autoCommand(r.battle);
    stepBattle(r.battle);if(r.battle.result)settleEncounter(s,r);
  }
  c.stepInDay++;
  if(c.stepInDay<CAMPAIGN.stepsPerDay)return {stepped:true};
  c.stepInDay=0;c.dayPrepared=false;
  finishDomesticDay(s);const boundary=c.day%10===0;if(boundary)finishTurn(s);
  c.day++;syncResources(s);
  for(const r of c.battles.filter(r=>!r.settled||r.endedDay===c.day-1))captureDay(s,r);
  archiveCampaignBattles(s);
  if(s.cities.every(c=>c.owner==='cao'))s.finished='victory';else if(!s.cities.some(c=>c.owner==='cao'))s.finished='defeat';
  if(boundary){c.phase='planning';c.resumeId=c.focusId;c.focusId=null;s.battle=null;c.lastNotice=`第 ${c.day} 天：新旬筹划。所有战场暂停，请处理内政与军令后点击进行。`;}
  return {dayEnded:true,planning:boundary,finished:s.finished};
}
export function advanceCampaignDay(s){const day=s.campaign.day;for(let i=0;i<CAMPAIGN.stepsPerDay+1&&s.campaign.day===day;i++){const result=advanceCampaignStep(s);if(result.paused||result.encounter||result.deployment)return result;}return {dayEnded:true};}
export function serializeCampaign(s){return JSON.stringify({...s,battle:null});}

export function validateCampaign(value){
  const fail=(ok,message='战略存档数据无效')=>{if(!ok)throw new Error(message);};
  const num=(x,max=Number.MAX_SAFE_INTEGER)=>Number.isFinite(x)&&x>=0&&x<=max;
  const integer=(x,max)=>Number.isSafeInteger(x)&&num(x,max);
  const c=value?.campaign;fail(c?.scenarioId===undefined||!!nationalScenario(c.scenarioId),'天下剧本无效');fail(c?.version===CAMPAIGN.version,'战略存档版本不兼容，请重新开始');
  fail(value.testScenario===undefined&&value.pending===null&&value.report===null,'战略存档状态不一致');
  if(c.scenarioId){const allowed=new Set([...nationalScenario(c.scenarioId).factions,'neutral']);fail(value.cities?.every(x=>allowed.has(x.owner))&&value.armies?.every(a=>allowed.has(a.faction))&&c.idle?.every(o=>allowed.has(o.faction)),'剧本势力不匹配');}
  fail(integer(c.day)&&c.day>=1&&['planning','executing'].includes(c.phase)&&typeof c.dayPrepared==='boolean'&&integer(c.stepInDay,CAMPAIGN.stepsPerDay-1));
  fail(c.phase!=='planning'||(c.day-1)%10===0&&!c.dayPrepared&&c.stepInDay===0,'战略筹划日期无效');
  fail(c.dayPrepared||c.stepInDay===0);fail(value.turn===Math.floor((c.day-1)/10)+1,'旬与日期不一致');
  fail(Array.isArray(c.battles)&&c.battles.length<=1000&&Array.isArray(c.idle)&&c.idle.length<=835&&Array.isArray(c.turnReports)&&c.turnReports.length<=12);
  if(c.scenarioId)fail(Array.isArray(c.archive)&&c.archive.length<=100&&new Set(c.archive.map(r=>r.id)).size===c.archive.length&&c.archive.every(r=>typeof r.id==='string'&&typeof r.name==='string'&&r.name.length<100&&!/[<>]/.test(r.name)&&integer(r.startedDay,c.day)&&r.startedDay>0&&integer(r.endedDay,c.day)&&r.endedDay>=r.startedDay&&['撤退','击溃','久战收兵','城门失守'].includes(r.reason)&&(r.winner===null||Object.hasOwn(FACTIONS,r.winner))&&!c.battles.some(b=>b.id===r.id)),'归档战报无效');
  fail(typeof c.lastNotice==='string'&&c.lastNotice.length<1000&&c.turnReports.every(r=>integer(r.turn)&&Array.isArray(r.items)&&r.items.length<=value.cities.length*3&&r.items.every(x=>typeof x==='string'&&x.length<1000)));
  // Core officer, map and combat validation remains shared with the real engine.
  const envelope={...value,battle:null,pending:null,report:null,armies:value.armies?.map(a=>({...a,supply:Math.ceil(a.supply)}))};validateSave(envelope,{strategic:true});
  const officerIds=new Set(),ids=new Set(value.armies.map(a=>a.id));
  const checkOfficer=u=>{fail(city(value,u.homeCity),'武将归属地无效');fail(!officerIds.has(u.id),'武将重复');officerIds.add(u.id);};
  for(const a of value.armies){fail((!a.travel&&!a.route.length||a.units.length<=10)&&a.units.filter(u=>u.first).length<=6&&num(a.supply)&&integer(a.supplyCapacity)&&a.supply<=a.supplyCapacity&&num(a.hunger,5)&&num(a.supplyIn)&&integer(a.cooldownDay)&&city(value,a.homeCity),'军团编制或粮草无效');a.units.forEach(checkOfficer);
    if(a.travel){const t=a.travel;fail(value.roads.some(([x,y])=>sameEdge(t,x,y))&&t.from===a.location&&num(t.progress,roadLength(value,t.from,t.to)),'行军位置无效');}
    if(a.route.length){let from=a.location;for(const to of a.route){fail(value.roads.some(([x,y])=>x===from&&y===to||x===to&&y===from),'军令路线无效');from=to;}fail(!a.travel||a.route[0]===a.travel.to,'行军路线与位置不一致');}
    if(a.supplyLine)fail(city(value,a.supplyLine.source)&&Array.isArray(a.supplyLine.path)&&a.supplyLine.path.every(id=>city(value,id))&&num(a.supplyLine.distance)&&num(a.supplyLine.rate),'粮道无效');
  }
  for(const o of c.idle){checkOfficer(o.unit);fail(Object.hasOwn(FACTIONS,o.faction)&&city(value,o.location)&&integer(o.remainingDays)&&(!o.destination?o.remainingDays===0:city(value,o.destination)&&o.remainingDays>0),'武将调任状态无效');
    const proxy=newGame();proxy.armies=[{...proxy.armies[0],units:[o.unit],leader:o.unit.id,advisor:o.unit.id,deputy:null}];validateSave(proxy);
  }
  for(const town of value.cities){for(const key of ['grain','manpower','order','gateHp'])fail(num(town[key]),'城池资源无效');fail(town.order<=100&&town.grain<=10000+town.granary*10000&&town.gateHp<=12000+town.walls*3000);
    for(const key of ['farm','commerce','barracks','walls','granary'])fail(integer(town[key],5)&&town[key]>=1,'设施等级无效');
    fail(integer(town.drafted)&&integer(town.reliefTurn));
    fail(!town.project||Object.hasOwn(PROJECTS,town.project.key)&&num(town.project.remaining,PROJECTS[town.project.key].turns)&&town.project.remaining>0,'建设队列无效');
    fail(town.governor===null||c.idle.some(o=>o.unit.id===town.governor&&!o.destination&&o.location===town.id&&o.faction===town.owner),'太守任命无效');
  }
  const battleIds=new Set(),engaged=new Set();
  function checkBattle(r,b){const base=newGame();if(c.scenarioId){Object.assign(base,nationalWorld(c.scenarioId));base.campaign={scenarioId:c.scenarioId};}base.armies=copy(r.armies).map(a=>({...a,supply:Math.ceil(a.supply),route:[],target:null}));base.relationshipScores=copy(b.relationshipScores);base.relationshipTypes=copy(b.relationshipTypes);base.battle=copy(b);validateSave(base,{strategic:true});for(const u of b.sides.flatMap(x=>x.units))fail(u.supplyPenalty===undefined||[0,.1,.2,.35].includes(u.supplyPenalty),'缺粮效果无效');}
  for(const r of c.battles){fail(r&&typeof r.id==='string'&&!battleIds.has(r.id)&&typeof r.name==='string'&&r.name.length<100&&['field','siege'].includes(r.kind)&&city(value,r.cityId)&&num(r.point?.x,1024)&&num(r.point?.y,1024));battleIds.add(r.id);
    fail(integer(r.startedDay,c.day)&&r.startedDay>=1&&typeof r.settled==='boolean'&&typeof r.awaiting==='boolean'&&['auto','manual'].includes(r.control)&&[0,1].includes(r.attackSide));
    fail(Array.isArray(r.armyIds)&&new Set(r.armyIds).size===r.armyIds.length&&Array.isArray(r.armies)&&r.armies.length===r.armyIds.length&&r.armies.every(a=>r.armyIds.includes(a.id)));
    fail(r.settled?integer(r.endedDay,c.day)&&r.endedDay>=r.startedDay&&!!r.battle.result:r.endedDay===null);
    fail(r.settled||r.battle.tick===(c.day-r.startedDay)*CAMPAIGN.stepsPerDay+c.stepInDay,'战场日期与世界日期不一致');
    fail(r.control!=='manual'||r.settled||c.focusId===r.id||c.phase==='planning'&&c.resumeId===r.id,'亲自指挥状态不一致');
    if(r.settled)fail(r.report&&r.report.winner===r.battle.result.winner&&r.report.reason===r.battle.result.reason&&Array.isArray(r.report.stats)&&r.report.stats.length===2&&r.report.stats.every(x=>Object.hasOwn(FACTIONS,x.faction)&&['initial','remaining','wounded','killed','escaped'].every(k=>integer(x[k]))&&x.initial===x.remaining+x.wounded+x.killed+x.escaped)&&Array.isArray(r.report.growth),'战果记录无效');
    if(!r.settled)for(const id of r.armyIds){fail(ids.has(id)&&!engaged.has(id),'军团重复参战或丢失');engaged.add(id);}
    fail(r.battle.id===r.id&&r.battle.cityId===r.cityId&&Array.isArray(r.snapshots)&&r.snapshots.length<=c.day+1&&r.templates&&typeof r.templates==='object');checkBattle(r,r.battle);
    let day=0;for(const snap of r.snapshots){fail(integer(snap.day,c.day)&&snap.day>day&&snap.day>=r.startedDay&&snap.tick===snap.data?.tick,'每日快照日期无效');day=snap.day;checkBattle(r,readDailySnapshot(r,snap.day));}
    fail(!r.awaiting||r.battle.tick===0&&!r.battle.deploymentLocked,'已开战不能重新配置');
  }
  fail(c.focusId===null||battleIds.has(c.focusId)&&!battleRecord(value,c.focusId).settled&&battleRecord(value,c.focusId).control==='manual'&&c.phase==='executing','接管状态无效');
  fail(c.resumeId===null||battleIds.has(c.resumeId));
  fail(value.grain===Math.floor(value.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0)),'粮仓汇总不一致');
  validateDomestic(value);if(c.scenarioId)validateStrategicAI(value);value.battle=c.focusId?battleRecord(value,c.focusId).battle:null;value.pending=null;value.report=null;return value;
}
