// Reading progress is a local preference, separate from simulation/save data.
export const BATTLE_ONBOARDING_KEY='sango-battle-onboarding-v1';
export const BATTLE_ONBOARDING_TOPICS=['basics','controls','tactics','statuses'];
export function createBattleOnboarding(storage){
 let progress={version:1,status:'new',battleKey:null,step:0};
 try{
  const saved=JSON.parse(storage?.getItem(BATTLE_ONBOARDING_KEY)||'null');
  if(saved?.version===1&&['new','active','waiting','complete','skipped'].includes(saved.status)&&Number.isInteger(saved.step)&&saved.step>=0&&saved.step<4&&(saved.battleKey===null||typeof saved.battleKey==='string'))progress={...saved};
 }catch{}
 const persist=()=>{try{storage?.setItem(BATTLE_ONBOARDING_KEY,JSON.stringify(progress));}catch{}};
 return {
  get step(){return progress.step;},
  get status(){return progress.status;},
  topicFor({key,locked=false,result=false}){
   if(['complete','skipped'].includes(progress.status))return null;
   if(result||progress.battleKey&&progress.battleKey!==key){progress.status='complete';persist();return null;}
   if(progress.status==='new'){progress={version:1,status:'active',battleKey:key,step:0};persist();}
   if(progress.status==='waiting'&&locked){progress.status='active';progress.step=2;persist();}
   return progress.status==='active'?BATTLE_ONBOARDING_TOPICS[progress.step]:null;
  },
  next(locked=false){
   if(progress.status!=='active')return;
   if(progress.step===3)progress.status='complete';
   else if(progress.step===1&&!locked)progress.status='waiting';
   else progress.step++;
   persist();
  },
  previous(){if(progress.status==='active'&&progress.step%2===1){progress.step--;persist();}},
  skip(){progress.status='skipped';persist();}
 };
}
