import {PROGRESSION} from './progression.mjs';
import {settleOfficerMerit} from './campaign-merit.mjs';
import {residentOfficer} from './city-personnel.mjs';

export function initializeWorkMerit(project,{budget,required,progress=0}){
 project.merit??={budget,required,progress,credits:{},penalty:0};
}
export function creditWorkMerit(s,a,c,project,progress,cooperation=null){
 const m=project?.merit;if(!m)return;
 const next=Math.min(m.required,Math.max(m.progress,progress)),delta=next-m.progress;if(delta<=0)return;
 m.progress=next;
 const helper=cooperation?.success&&cooperation.actual>0&&cooperation.day===s.campaign.day?residentOfficer(s,cooperation.helperId):null;
 const share=helper?.faction===c.owner?Math.min(.25,cooperation.actual/Math.max(cooperation.after,cooperation.actual)):0;
 const actors=[[a.officerId,1-share],...(share?[[helper.unit.id,share]]:[])];
 for(const [id,fraction]of actors){
  const o=residentOfficer(s,id);if(!o||o.faction!==c.owner)continue;
  const credit=m.credits[id]??={exact:0,paid:0};credit.exact+=m.budget*delta/m.required*fraction;
  const amount=Math.floor(credit.exact+1e-8)-credit.paid;if(amount<=0)continue;credit.paid+=amount;
  settleOfficerMerit(s,o.unit,{sourceId:`work-progress:${a.action.id}:${next}`,amount,faction:c.owner,cityId:c.id,category:'domestic',reason:'完成实际工程进度'});
 }
}
export function ordinaryWorkMerit(def,x,{actual,factor,productive,netCost,scale=1}){
 const base=PROGRESSION.domestic*(x.meritDays||def.days)/PROGRESSION.workDays;
 let ratio=Math.min(1.5,factor);
 if(def.kind==='cash')ratio=Math.max(0,actual-netCost)/Math.max(1,def.value*scale-netCost);
 if(['grain','heal'].includes(def.kind))ratio=actual/Math.max(1,def.value*scale);
 if(def.kind==='recruit')ratio=actual/Math.max(1,x.recruitMode==='reserve'?def.reserveValue*scale:x.amount);
 if(def.kind==='trade')ratio=actual/1200;
 if(['hire','persuade'].includes(def.kind))ratio=actual/12;
 return productive?Math.max(0,Math.round(base*Math.min(1.5,ratio))):0;
}
export function validWorkMerit(project){
 const m=project?.merit;if(!m)return false;
 const positive=x=>Number.isFinite(x)&&x>=0;
 return positive(m.budget)&&positive(m.required)&&m.required>0&&positive(m.progress)&&m.progress<=m.required&&Number.isSafeInteger(m.penalty)&&m.penalty>=0&&m.penalty<=PROGRESSION.failures.constructionMaximum&&m.credits&&Object.values(m.credits).every(c=>positive(c.exact)&&Number.isSafeInteger(c.paid)&&c.paid>=0&&c.paid<=c.exact+1e-8)&&Object.values(m.credits).reduce((n,c)=>n+c.exact,0)<=m.budget*m.progress/m.required+1e-6;
}
