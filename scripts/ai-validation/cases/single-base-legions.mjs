import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
export async function exercise({source}){
 const {assessWarTempo}=await import(pathToFileURL(join(source,'ai-policy/force-scale.mjs')));
 const {jointFormations}=await import(pathToFileURL(join(source,'ai-policy/army-formations.mjs')));
 const city={id:'home',gold:60000,grain:120000,costs:{gold:1000,grain:8000},reserve:{gold:2000,grain:10000},shortages:{gold:0,grain:0},besieged:false};
 const context={day:1,turn:1,critical:false,ownCities:[city]},units=Array.from({length:11},(_,i)=>({id:'unit-'+i,troops:7000})),pool=new Map([['home',units]]),before=JSON.stringify([context,[...pool]]);
 const tempo=assessWarTempo(context,pool),columns=jointFormations([{c:city,units}],10,{compact:true});
 const poor={...context,ownCities:[{...city,shortages:{gold:100,grain:0}}]};
 return {singleBaseCooperation:tempo.phase==='joint',independentColumns:columns?.length===2&&columns.every(g=>g.units.length>=4&&g.units.length<=10&&g.units.reduce((n,u)=>n+u.troops,0)>=27000),sharedBudgetGate:assessWarTempo(poor,pool).phase!=='joint',calendarIndependent:JSON.stringify(assessWarTempo({...context,day:1001,turn:101},pool))===JSON.stringify(tempo),readOnly:JSON.stringify([context,[...pool]])===before};
}
