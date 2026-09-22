import {initializeTalent} from '../talent-lifecycle.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {makeOfficer} from '../engine.mjs';
// Controlled economic stress test: real autonomous work and city income;
// representative upkeep/replacement demand is a ledger, not fabricated battles.
import {mkdir,writeFile} from 'node:fs/promises';
import {newCampaign,cityIncome} from '../strategic-campaign.mjs';
import {beginDomesticTurn,finishDomesticDay,ACTIONS,grainCapacity} from '../domestic.mjs';
const results=[],lineMen=14500,days=360;
for(const seed of [417,643])for(const tier of ['weak','ordinary','strong'])for(const lines of [0,1,2,3]){
 const s=newCampaign(seed,'heroes-251'),c=s.cities.find(c=>c.id==='ye'),pool=Object.values(OFFICER_BY_ID).sort((a,b)=>a.politics-b.politics||a.id.localeCompare(b.id));
 const count={weak:4,ordinary:12,strong:20}[tier],chosen=tier==='weak'?pool.filter(u=>Math.max(u.politics,u.leadership,u.intellect,u.force,u.charm)<=50).slice(0,count):tier==='strong'?pool.slice(-count):pool.filter(u=>u.politics>=45&&u.politics<=65).slice(-count),units=chosen.map(u=>makeOfficer(u.id,0,0,1));
 s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];s.campaign.domestic.orders=[];
 for(const town of s.cities){town.units=[];town.governor=null;if(town!==c){town.owner='neutral';town.domestic.owner='neutral';}}
 for(const unit of units){unit.troops=0;unit.wounded=0;delete unit.mission;s.campaign.idle.push({unit,faction:'yuan',location:c.id,destination:null,remainingDays:0});}
 initializeTalent(s);
 // No incoming hires; idle officers may still resign under normal rules.
 for(const [key,action] of Object.entries(ACTIONS))if(action.direction==='talent'||action.kind==='explore')c.domestic.cooldowns[key]=100000;
 c.grain=16000;c.manpower=9000;s.campaign.ai.treasuries.yuan=6000;
 const deficits={gold:0,grain:0,manpower:0},paid={gold:0,grain:0,manpower:0},overflow={gold:0,grain:0,manpower:0};let start;
 for(let day=1;day<=days;day++){
  s.campaign.day=day;s.turn=Math.floor((day-1)/10)+1;if(day%10===1)beginDomesticTurn(s);
  finishDomesticDay(s);
  if(day%10!==0)continue;
  const income=cityIncome(s,c);if(day>120){overflow.grain+=Math.max(0,c.grain+income.grain-grainCapacity(c));overflow.manpower+=Math.max(0,c.manpower+income.manpower-30000);}s.campaign.ai.treasuries.yuan+=income.gold;c.grain=Math.min(grainCapacity(c),c.grain+income.grain);c.manpower=Math.min(30000,c.manpower+income.manpower);c.drafted=0;
  const activeLines=day>120?lines:0,replacements=Math.round(lineMen*(.02+activeLines*.05)),demand={grain:lineMen/10*(1+activeLines)+replacements,gold:Math.ceil(replacements*.4),manpower:replacements};
  for(const key of ['gold','grain','manpower']){const balance=key==='gold'?s.campaign.ai.treasuries.yuan:c[key],used=Math.min(balance,demand[key]);if(day>120){deficits[key]+=demand[key]-used;paid[key]+=used;}if(key==='gold')s.campaign.ai.treasuries.yuan-=used;else c[key]-=used;}
  if(day===120)start={gold:s.campaign.ai.treasuries.yuan,grain:c.grain,manpower:c.manpower};
 }
 const end={gold:s.campaign.ai.treasuries.yuan,grain:c.grain,manpower:c.manpower},net=Object.fromEntries(Object.keys(end).map(k=>[k,Math.round(end[k]-start[k]+overflow[k])])),row={seed,tier,lines,officers:units.length,officerIds:units.map(u=>u.id),politics:units.map(u=>u.politics),start,end,net,deficits,paid,farm:c.farm,commerce:c.commerce,barracks:c.barracks,assignments:s.campaign.domestic.assignments.filter(a=>a.cityId===c.id).map(a=>a.direction)};
 results.push(row);console.log(JSON.stringify(row));
}
await mkdir('outputs/economy-capacity',{recursive:true});await writeFile('outputs/economy-capacity/results.json',JSON.stringify({lineMen,days,warmupDays:120,assumptions:{frontReplacementPerTurn:.05,garrisonReplacementPerTurn:.02,goldPerReplacement:.4},results},null,2));

const targets={weak:0,ordinary:2,strong:3};
if(results.some(r=>r.lines===targets[r.tier]&&(Object.values(r.deficits).some(n=>n>0)||Object.values(r.net).some(n=>n<0))))process.exitCode=1;
