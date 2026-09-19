import {mkdirSync,writeFileSync} from 'node:fs';
import {createScenario,SCENARIOS} from '../scenarios.mjs';
import {stepBattle,issueCommand,battleStratagems,STRATAGEMS,validateSave} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {newCampaign,beginExecution,advanceCampaignDay,chooseEncounter,activeBattles,orderCampaignArmy,validateCampaign,serializeCampaign} from '../strategic-campaign.mjs';
const scenarioRows=[];
for(const config of SCENARIOS)for(const seed of [1,17,521200]){
  const state=createScenario(config.id,seed),b=state.battle;
  let casts=0,independent=0,enchants=0,procs=0,peak=0;
  while(!b.result){
    if(b.commandProgress>=12000){const key=chooseEnemyCommand(b,battleStratagems(b,0),STRATAGEMS,0);if(key)issueCommand(b,key);}
    stepBattle(b);
    const events=b.effects.filter(e=>e.skill&&!e.ongoing&&!e.combo);
    const all=new Set(events.map(e=>e.from+':'+e.label));
    const active=new Set(events.filter(e=>!e.enchantment).map(e=>e.from+':'+e.label));
    casts+=all.size;independent+=active.size;enchants+=new Set(events.filter(e=>e.enchantment).map(e=>e.from+':'+e.label)).size;
    procs+=b.effects.filter(e=>e.attackOrb).length;peak=Math.max(peak,active.size);
  }
  validateSave(JSON.parse(JSON.stringify(state)));
  scenarioRows.push({id:config.id,seed,ticks:b.tick,winner:b.result.winner,reason:b.result.reason,casts,independent,enchants,procs,peak});
}
const campaigns=[];
for(const seed of [1,17,521200])for(const plan of ['驻守','双路出征']){
  const s=newCampaign(seed);
  if(plan==='双路出征'){orderCampaignArmy(s,'a1','guandu');orderCampaignArmy(s,'a3','baima');}
  for(let guard=0;s.campaign.day<41&&!s.finished&&guard<100;guard++){
    if(s.campaign.phase==='planning')beginExecution(s);
    const result=advanceCampaignDay(s);
    if(result.encounter)for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);
  }
  validateCampaign(JSON.parse(serializeCampaign(s)));
  campaigns.push({seed,plan,battles:s.campaign.battles.map(r=>({name:r.name,days:r.endedDay===null?null:r.endedDay-r.startedDay+1,ticks:r.battle.tick,winner:r.battle.result?.winner}))});
}
mkdirSync('outputs',{recursive:true});const path=process.argv[2]||'outputs/orbs-after.json';writeFileSync(path,JSON.stringify({scenarioRows,campaigns},null,2));
console.log(path,JSON.stringify({battles:scenarioRows.length,independent:scenarioRows.reduce((n,r)=>n+r.independent,0),enchants:scenarioRows.reduce((n,r)=>n+r.enchants,0),procs:scenarioRows.reduce((n,r)=>n+r.procs,0),campaigns}));
