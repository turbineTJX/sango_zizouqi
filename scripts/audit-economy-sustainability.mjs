import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const out='outputs/economy-sustainability-20261011';
const manifest=JSON.parse(await readFile('work/economy-sustainability-20261011-fixed/runtime/runtime-manifest.json','utf8'));
const root=resolve(manifest.runtimeDirectory);
const from=async file=>import(pathToFileURL(resolve(root,file)));
const {newCampaign,appointGovernor,recruitLocalUnits,settleCityEconomy,dailySupply,serializeCampaign}=await from('strategic-campaign.mjs');
const {makeOfficer}=await from('engine.mjs');
const {initializeTalent}=await from('talent-lifecycle.mjs');
const {ACTIONS,assignDomestic,beginDomesticTurn,finishDomesticDay,setDomesticAutoApprove}=await from('domestic.mjs');
const {cityIncomeBreakdown}=await from('economy.mjs');
const {cityPayroll}=await from('officer-salaries.mjs');
const {cityGoldCommitment}=await from('city-budget.mjs');
const {constructionSites,canExpandBuilding,localBuildingLevel}=await from('metropolitan-areas.mjs');
const {buildingUnitHp}=await from('building-durability.mjs');
const {cityForce}=await from('city-units.mjs');
const {roadDistance}=await from('strategic-movement.mjs');
const digest=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
for(const [file,hash]of Object.entries(manifest.sources))assert.equal(await digest(resolve(root,file)),hash,file);

// Explicit mature physical facilities are a controlled initial condition. No
// stocks, staff or troops are added after initialization; all formation, food,
// work outcomes, wages and affordable replacements use shared runtime functions.
function setLevel(c,key,level,site=c.id){
 const old=site===c.id?c[key]-c.domestic.buildingSites[key].length:c.domestic.buildingSites[key].filter(id=>id===site).length;
 c[key]+=level-old;
 if(site!==c.id)c.domestic.buildingSites[key]=[...c.domestic.buildingSites[key].filter(id=>id!==site),...Array(level).fill(site)];
 const maxHp=level*buildingUnitHp(key);c.buildings[key][site]={hp:maxHp,maxHp};
}
function fixture(seed,profile){
 const s=newCampaign(seed,'guandu-200','cao'),c=s.cities.find(c=>c.id===profile.city);
 s.armies=[];s.campaign.battles=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];s.campaign.domestic.orders=[];
 for(const town of s.cities){town.units=[];town.governor=null;}
 c.owner='cao';c.domestic.owner='cao';
 s.campaign.domestic.incidents.enabled=false;setDomesticAutoApprove(s,true);
 if(profile.metro){for(const site of constructionSites(s,c))if(site.kind==='city'){site.owner='cao';site.domestic.owner='cao';}}
 for(const key of ['commerce','farm','barracks']){
  if(profile.metro){for(const site of constructionSites(s,c))while(canExpandBuilding(s,c,key,site.id))setLevel(c,key,localBuildingLevel(c,key,site.id)+1,site.id);}
  else setLevel(c,key,profile.facilities);
 }
 setLevel(c,'granary',5);c.gold=10000;c.grain=18000;c.manpower=18000;c.drafted=0;c.payroll.arrears=0;
 const workers=Array.from({length:4},(_,i)=>{
  const u=makeOfficer('person-'+(715+i),0,0,profile.level);u.politics=90;u.leadership=90;u.force=90;u.intellect=90;u.charm=90;u.troops=0;u.wounded=0;u.homeCity=c.id;
  s.campaign.idle.push({unit:u,faction:'cao',location:c.id,destination:null,remainingDays:0});return u;
 });
 const units=Array.from({length:profile.fronts+1},(_,i)=>{
  const u=makeOfficer('person-'+(719+i),0,0,profile.level);u.type=['spear','archer','cavalry'][i%3];u.troops=0;u.wounded=0;u.homeCity=c.id;c.units.push(u);return u;
 });
 initializeTalent(s);assert.equal(appointGovernor(s,c.id,workers[0].id),null);
 for(const [i,direction]of [[1,'commerce'],[2,'commerce'],[3,'agriculture']])assert.equal(assignDomestic(s,c.id,direction,workers[i].id),null);
 const allowed=new Set(['fair','merchants','tax','sell','cultivate','irrigate']);
 for(const [key,def]of Object.entries(ACTIONS))if(!allowed.has(key))c.domestic.cooldowns[key]=10000;
 return {s,c,units,workers};
}
function trial(seed,profile,loss,{days=240,warmDays=60,returnState=false}={}){
 const {s,c,units,workers}=fixture(seed,profile),opening={gold:c.gold,grain:c.grain,manpower:c.manpower};
 const target=2500+profile.fronts*profile.troops;
 const bills=[],samples=[],losses=[],recruitment=[];let firstShortfall=null,firstArrears=null,hungerDays=0,measuredFood=0,warmStateSha256=null;
 const stocks=()=>({gold:c.gold,grain:c.grain,manpower:c.manpower});
 const ledger={formation:{gold:0,grain:0,manpower:0},work:{gold:0,grain:0,manpower:0},food:{gold:0,grain:0,manpower:0},settlement:{gold:0,grain:0,manpower:0}};
 const record=(key,before)=>{for(const k of ['gold','grain','manpower'])ledger[key][k]+=c[k]-before[k];};
 for(let day=1;day<=days;day++){
  s.campaign.day=day;s.turn=Math.ceil(day/10);
  if(day%10===1){
   c.drafted=0;
   if(day>warmDays)for(const u of units.slice(1)){const removed=Math.min(u.troops,Math.round(profile.troops*loss));u.troops-=removed;losses.push({day,id:u.id,removed});}
   const before=stocks(),goldReserve=cityGoldCommitment(s,c).total;
   if(units[0].troops<2500)recruitLocalUnits(s,c,[units[0].id],{faction:'cao',cap:2500,goldReserve});
   if(units.slice(1).some(u=>u.troops<profile.troops))recruitLocalUnits(s,c,units.slice(1).map(u=>u.id),{faction:'cao',cap:profile.troops,goldReserve});
   const after=stocks(),gap=target-units.reduce((n,u)=>n+u.troops,0);
   record('formation',before);
   recruitment.push({day,gold:before.gold-after.gold,manpower:before.manpower-after.manpower,gap,goldReserve});
   if(day>warmDays&&gap>0&&firstShortfall===null)firstShortfall=day;
   const beforeWork=stocks();beginDomesticTurn(s);record('work',beforeWork);
  }
  const beforeSupply=stocks(),beforeFood=c.grain;dailySupply(s);record('food',beforeSupply);if(day>warmDays)measuredFood+=beforeFood-c.grain;if(c.hunger)hungerDays++;
  const beforeWork=stocks();finishDomesticDay(s);record('work',beforeWork);
  if(day%10===0){
   const before=stocks(),settlement=settleCityEconomy(s,c);
   record('settlement',before);
   bills.push({day,before,after:stocks(),...settlement});
   if(settlement.salaryArrears&&firstArrears===null)firstArrears=day;
   const payroll=cityPayroll(s,c);assert.equal(payroll.officers.length,workers.length+units.length,'Full paid roster must remain present');
   samples.push({day,...stocks(),troops:units.reduce((n,u)=>n+u.troops,0),payroll:payroll.gold,levels:[...workers,...units].map(u=>u.level),hunger:c.hunger,income:cityIncomeBreakdown(s,c)});
   if(day===warmDays)warmStateSha256=createHash('sha256').update(serializeCampaign(s)).digest('hex');
  }
  for(const key of ['gold','grain','manpower'])assert.ok(Number.isSafeInteger(c[key])&&c[key]>=0,key);
 }
 const atStart=samples.find(r=>r.day===warmDays),last=samples.at(-1),operating=bills.filter(r=>r.day>warmDays),refills=recruitment.filter(r=>r.day>warmDays),turns=(days-warmDays)/10;
 for(const k of ['gold','grain','manpower'])assert.equal(c[k]-opening[k],Object.values(ledger).reduce((n,r)=>n+r[k],0),'Every stock change must reconcile: '+k);
 const sum=(rows,key)=>rows.reduce((n,r)=>n+(r[key]||0),0),tail=samples.filter(r=>r.day>days-60);
 const result={ledger,warmStateSha256,seed,profile:profile.id,city:c.id,name:c.name,initialLevel:profile.level,facilities:{commerce:c.commerce,farm:c.farm,barracks:c.barracks},fullRoster:workers.length+units.length,fronts:profile.fronts,frontTroops:profile.troops,targetTroops:target,lossPerTurn:loss,warmDays,measuredDays:days-warmDays,opening,atStart,final:last,assembled:atStart.troops===target,firstShortfall,firstArrears,hungerDays,paidSalary:sum(operating,'paidSalary'),meanPerTurn:{salary:sum(operating,'paidSalary')/turns,replacementGold:sum(refills,'gold')/turns,replacementMen:sum(refills,'manpower')/turns,food:measuredFood/turns,stockGoldChange:(last.gold-atStart.gold)/turns},tail:{minGold:Math.min(...tail.map(r=>r.gold)),minGrain:Math.min(...tail.map(r=>r.grain)),minManpower:Math.min(...tail.map(r=>r.manpower)),minTroops:Math.min(...tail.map(r=>r.troops)),goldChange:last.gold-samples.find(r=>r.day===days-60).gold},samples,bills,losses,recruitment,events:s.campaign.domestic.events.filter(e=>e.officerId&&e.result?.factor!==undefined)};
 return returnState?{result,s,c,units,workers}:result;
}
async function logisticsTrials(){
 const logistics=[];
 for(const columns of [1,3]){
  const profile={id:'logistics',city:'town-31',metro:true,level:10,fronts:15,troops:3500};
  const {s,c,units,result}=trial(9001,profile,0,{days:150,returnState:true});
  assert.ok(result.final.troops>50000,'The experiment needs enough actually paid troops to overload a shared road');
  for(const town of s.cities)if(town!==c)town.grain=0;
  const next=s.roads.find(edge=>edge.includes(c.id)).find(id=>id!==c.id),length=roadDistance(s,c.id,next);
  const deployed=units.slice(1,1+columns*5),actualFrontTroops=deployed.reduce((n,u)=>n+u.troops,0),armies=[];
  for(let i=0;i<columns;i++){
   const group=deployed.slice(i*5,(i+1)*5),a={...cityForce(c),id:`logistics-${i}`,name:`运输测量军${i}`,units:group,leader:group[0].id,advisor:group[0].id,stationary:false};delete a.cityForce;
   a.supplyCapacity=group.length*900;a.supply=Math.min(c.grain,a.supplyCapacity);c.grain-=a.supply;
   a.route=[];a.location=c.id;a.travel={from:c.id,to:next,progress:Math.min(10,length/2),road:'main'};
   armies.push(a);s.armies.push(a);
  }
  c.units=c.units.filter(u=>!deployed.includes(u));
  const samples=[];let firstHunger=null;
  for(let i=1;i<=120;i++){
   s.campaign.day=150+i;s.turn=Math.ceil(s.campaign.day/10);
   if(i%10===1){c.drafted=0;beginDomesticTurn(s);}
   dailySupply(s);finishDomesticDay(s);if(i%10===0)settleCityEconomy(s,c);
   const row={day:i,warehouse:c.grain,armies:armies.map(a=>({id:a.id,supply:a.supply,in:a.supplyIn,hunger:a.hunger,troops:a.units.reduce((n,u)=>n+u.troops,0)}))};samples.push(row);
   if(firstHunger===null&&row.armies.some(a=>a.hunger>0))firstHunger=i;
  }
  logistics.push({columns,nominalFrontTroops:17500*columns,actualFrontTroops,formationTarget:55000,initialPaidFormation:result.final.troops,road:[c.id,next],roadDailyCap:360,sourceGranary:c.granary,firstHunger,samples});
  console.log(JSON.stringify({columns,firstHunger,last:samples.at(-1)}));
 }
 await writeFile(`${out}/logistics-pressure.json`,JSON.stringify({logistics,scope:'Controlled supply throughput experiment after 150 days of real paid formation and wages. Already formed units are moved into one or three measured columns on an existing road, and carried grain is actually removed from the depot. Position is held fixed to isolate shared real routing and daily food settlement; no marching, siege or battle outcome is claimed. Other depots start the road phase with no grain and receive no production. Selected source continues actual work, production and salary. No stock replenishment after the road phase begins.'},null,2));
}
const profiles=[
 {id:'ordinary-rank3',city:'town-4',facilities:3,level:3,fronts:3,troops:3000},
 {id:'rich-rank3',city:'xuchang',facilities:6,level:3,fronts:3,troops:3000},
 {id:'rich-rank10',city:'xuchang',facilities:6,level:10,fronts:5,troops:3500},
 {id:'metropolis-rank10',city:'town-31',metro:true,level:10,fronts:10,troops:3500}
];
await mkdir(out,{recursive:true});const runs=[];
for(const profile of profiles)for(const seed of [9001,9138,9275])for(const loss of [.05,.18]){
 const result=trial(seed,profile,loss);runs.push(result);
 console.log(JSON.stringify({profile:result.profile,seed,loss,assembled:result.assembled,firstShortfall:result.firstShortfall,firstArrears:result.firstArrears,final:result.final&&{gold:result.final.gold,grain:result.final.grain,manpower:result.final.manpower,troops:result.final.troops,payroll:result.final.payroll},mean:result.meanPerTurn}));
}
await logisticsTrials();
for(const [file,hash]of Object.entries(manifest.sources))assert.equal(await digest(resolve(root,file)),hash,file);
await writeFile(`${out}/operating-pressure.json`,JSON.stringify({createdAt:new Date().toISOString(),auditScriptSha256:await digest(new URL(import.meta.url)),sourceHashes:manifest.sources,runs,scope:{initial:'Controlled mature city with physically completed facilities (their construction cost/time excluded), four civilian officials including governor, one guard officer and the stated field teams. All start at the stated rank; all civilian relevant abilities are 90; ordinary work may subsequently change rank. 10000 gold / 18000 food / 18000 reserves are initial stocks, not periodically replenished.',execution:'60 days of actual paid formation and work, followed by 180 measured days. Shared actual selection/completion, daily rations, salary settlement and affordable recruitment. One guard target 2500. No subsequent grants, culling, free troops, outcome overrides, incidence gifts or trade/aid from other cities. Existing base and completed temporary effects are real income; future work is never credited.',pressure:'5% / 18% of nominal field strength is removed once per ten days as a prescribed permanent attrition input. These losses are not AI battles. Affordable replacement shortfalls reduce actual formed strength and are reported rather than hidden.',limits:'Resident teams isolate fiscal production and replacement. No live army travel, enemy siege, wounded recovery, road throughput or frontline disruption. This establishes local operating capacity under the given staffing and demand, not perpetual campaign victory or all-army support.'}},null,2));
