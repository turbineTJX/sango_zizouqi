import assert from 'node:assert/strict';
import {activeBattles,chooseEncounter,needsSiegeDefense,prepareAutoSiegeDefense,relinquishSiegeDefense} from '../../strategic-campaign.mjs';
import {confirmReinforcementCouncil} from '../../engine.mjs';
import {pendingArmyAppointments,confirmPostbattleAppointments} from '../../postbattle-appointments.mjs';
import {recommendArmyAppointments} from '../../army-appointments.mjs';
// Simulations explicitly delegate each current player decision through its real API.
export function resolveCampaignDecisions(s){
 for(const p of [...pendingArmyAppointments(s)]){const a=s.armies.find(a=>a.id===p.armyId);assert.equal(confirmPostbattleAppointments(s,a.id,recommendArmyAppointments(a)),null);}
 for(const record of [...activeBattles(s)]){
  let r=record;
  if(needsSiegeDefense(r)){const result=prepareAutoSiegeDefense(s,r.id);if(result.error){assert.equal(relinquishSiegeDefense(s,r.id),null);continue;}Object.assign(s,result.state);r=s.campaign.battles.find(b=>b.id===r.id);}
  if(r.awaiting)assert.equal(chooseEncounter(s,r.id,false),null);
  if(r.battle.reinforcementCouncil)assert.equal(confirmReinforcementCouncil(r.battle),null);
 }
}
