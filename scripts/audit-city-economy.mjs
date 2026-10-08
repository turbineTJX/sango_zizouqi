import {initializeTalent} from '../talent-lifecycle.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {makeOfficer} from '../engine.mjs';
// Controlled economic stress test: real autonomous work and city income;
// representative upkeep/replacement demand is a ledger, not fabricated battles.
import {mkdir,writeFile} from 'node:fs/promises';
import {newCampaign,cityIncome,settleCityEconomy} from './automatic-domestic-campaign.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {compareEconomicWork} from './economy-balance-lib.mjs';
import {beginDomesticTurn,finishDomesticDay,ACTIONS,grainCapacity} from '../domestic.mjs';
const stress=process.argv.includes('--stress'),pilot=process.argv.includes('--pilot'),results=[],lineMen=14500,days=720,seeds=pilot?[1709]:stress?[1709,2027,2503,2909]:[417,643,911,1201,1709,2027,2503,2909];
for(const seed of seeds)for(const tier of stress?['strong']:['weak','ordinary','strong'])for(const lines of stress?[3]:pilot?[{weak:0,ordinary:2,strong:3}[tier]]:[0,1,2,3,4])for(const profile of stress?['attrition','equipment','supply']:['standard']){
 const s=newCampaign(seed,'heroes-251'),c=s.cities.find(c=>c.id==='ye'),pool=Object.values(OFFICER_BY_ID).sort((a,b)=>a.politics-b.politics||a.id.localeCompare(b.id));
 const count={weak:4,ordinary:12,strong:20}[tier],chosen=tier==='weak'?pool.filter(u=>Math.max(u.politics,u.leadership,u.intellect,u.force,u.charm)<=50).slice(0,count):tier==='strong'?pool.slice(-count):pool.filter(u=>u.politics>=45&&u.politics<=65).slice(-count),units=chosen.map(u=>makeOfficer(u.id,0,0,1));
 s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];s.campaign.domestic.orders=[];
 for(const town of s.cities){town.units=[];town.governor=null;if(town!==c){town.owner='neutral';town.domestic.owner='neutral';}}
 for(const unit of units){unit.troops=0;unit.wounded=0;delete unit.mission;s.campaign.idle.push({unit,faction:'yuan',location:c.id,destination:null,remainingDays:0});}
 initializeTalent(s);
 // No incoming hires; idle officers may still resign under normal rules.
 for(const [key,action] of Object.entries(ACTIONS))if(action.direction==='talent'||action.kind==='explore')c.domestic.cooldowns[key]=100000;
 c.grain=16000;c.manpower=9000;c.gold=6000;
 const deficits={gold:0,grain:0,manpower:0},paid={gold:0,grain:0,manpower:0},overflow={gold:0,grain:0,manpower:0},shortageDays={gold:[],grain:[],manpower:[]};let start;
 for(let day=1;day<=days;day++){
  s.campaign.day=day;s.turn=Math.floor((day-1)/10)+1;if(day%10===1)beginDomesticTurn(s);
  finishDomesticDay(s);
  if(day%10!==0)continue;
  const income=cityIncome(s,c),before={grain:c.grain,manpower:c.manpower},settled=settleCityEconomy(s,c);c.drafted=0;
  if(day>120){overflow.grain+=Math.max(0,before.grain+income.grain-grainCapacity(c));overflow.manpower+=Math.max(0,before.manpower+income.manpower-ECONOMY_RULES.capacity.manpowerMax);}
  const activeLines=day>120?lines:0,frontLoss=profile==='attrition'?.18:profile==='equipment'?.08:.05,replacements=Math.round(lineMen*(.02+activeLines*frontLoss)),demand={grain:lineMen/10*(1+activeLines)*(profile==='supply'?4:1),gold:Math.ceil(replacements*(profile==='equipment'?.7:.4)+lineMen*(1+activeLines)*ECONOMY_RULES.maintenance.goldPerThousandTroops/1000),manpower:replacements};
  for(const key of ['gold','grain','manpower']){const balance=key==='gold'?c.gold:c[key],used=Math.min(balance,demand[key]);if(day>120){deficits[key]+=demand[key]-used;paid[key]+=used;if(used<demand[key])shortageDays[key].push(day);}if(key==='gold')c.gold-=used;else c[key]-=used;}
  if(day===120)start={gold:c.gold,grain:c.grain,manpower:c.manpower};
 }
 const end={gold:c.gold,grain:c.grain,manpower:c.manpower},net=Object.fromEntries(Object.keys(end).map(k=>[k,Math.round(end[k]-start[k]+overflow[k])])),row={seed,tier,lines,profile,officers:units.length,officerIds:units.map(u=>u.id),politics:units.map(u=>u.politics),start,end,net,deficits,paid,shortageDays,farm:c.farm,commerce:c.commerce,barracks:c.barracks,assignments:s.campaign.domestic.assignments.filter(a=>a.cityId===c.id).map(a=>a.direction)};
 results.push(row);console.log(JSON.stringify(row));
}
const work=compareEconomicWork(Array.from({length:32},(_,i)=>1709+i*97));
await mkdir('outputs/economy-capacity',{recursive:true});await writeFile(`outputs/economy-capacity/${pilot?'pilot-results':stress?'stress-results':'results'}.json`,JSON.stringify({lineMen,days,warmupDays:120,developmentSeeds:stress?[]:seeds.slice(0,4),validationSeeds:stress?seeds:seeds.slice(4),assumptions:{frontReplacementPerTurn:.05,garrisonReplacementPerTurn:.02,goldPerReplacement:.4,stressProfiles:{attrition:'18% front replacements per turn',equipment:'8% front replacements, 0.7 gold per soldier',supply:'fourfold grain demand as a convoy-loss stress ledger'},scope:'real autonomous domestic work and income; formation spends gold and reserves, only formed troops eat; ledger demand, not simulated combat or deliveries'},work,results},null,2));

const targets={weak:0,ordinary:2,strong:3};
// Reserves converge to a working stock under rotation; early construction also
// consumes cash. Stock growth itself is not the definition of ongoing solvency.
const sustained=r=>Object.keys(r.deficits).every(key=>r.deficits[key]/Math.max(1,r.deficits[key]+r.paid[key])<=.02&&!r.shortageDays[key].some(day=>day>days-200)&&r.end[key]>0);
if(stress?['gold','grain','manpower'].some(key=>!results.some(r=>r.deficits[key]>0)):results.some(r=>r.lines===targets[r.tier]&&!sustained(r)))process.exitCode=1;
