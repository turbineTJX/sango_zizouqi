import {fieldCampaign,approachDestination} from './field-campaign.mjs';
import {beginExecution,orderCampaignArmy,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter} from './auto-domestic-campaign.mjs';
import {pendingArmyAppointments,confirmPostbattleAppointments} from '../../postbattle-appointments.mjs';
import {recommendArmyAppointments} from '../../army-appointments.mjs';
export function recordedCampaign(){
 const s=fieldCampaign();for(const id of ['guandu','baima'])s.cities.find(c=>c.id===id).kind='gate';
 orderCampaignArmy(s,'a1','guandu');orderCampaignArmy(s,'a3','baima');beginExecution(s);
 for(const a of s.armies.filter(a=>a.route.length))approachDestination(s,a,2);
 for(let i=0;i<10&&activeBattles(s).length<2;i++){
  advanceCampaignDay(s);for(const r of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,r.id,false);
 }
 const r=activeBattles(s)[0];if(!r)throw Error('Expected two real encounters');return {s,r};
}
export function completedRecording(){
 const {s,r}=recordedCampaign();
 for(let i=0;i<1200&&!r.settled;i++){
  for(const p of pendingArmyAppointments(s))confirmPostbattleAppointments(s,p.armyId,recommendArmyAppointments(s.armies.find(a=>a.id===p.armyId)));
  if(s.campaign.phase==='planning')beginExecution(s);
  for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);
  advanceCampaignStep(s);
 }
 for(const p of pendingArmyAppointments(s))confirmPostbattleAppointments(s,p.armyId,recommendArmyAppointments(s.armies.find(a=>a.id===p.armyId)));
 if(!r.settled)throw Error('Real encounter did not settle');return {s,r};
}
