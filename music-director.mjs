export const musicSeason=day=>['spring','summer','autumn','winter'][Math.floor((Math.max(1,day||1)-1)%360/90)];
function musicMode(state,ui){
 if(ui.mode==='lobby'||(!state.battle&&state.testScenario))return 'lobby';
 if(state.battle&&!state.battle.result)return !state.battle.deploymentLocked||state.battle.reinforcementCouncil==='pending'?'council':'battle';
 if(/^diplomacy|^faction-diplomacy/.test(ui.modal||''))return 'diplomacy';
 return ['encounter','campaign-encounters'].includes(ui.modal)?'council':'strategy';
}
function routedCount(units,enemy=false){
 let count=0;
 // Treat any retained enemy stealth marker conservatively. Music needs no
 // visibility detection, range queries or access to hidden unit numbers.
 for(const u of units)if(u.status==='defeated'&&!u.isDecoy&&(!enemy||!u.statuses?.stealth))count++;
 return count;
}
export function musicSituation(state,ui,mode=musicMode(state,ui)){
 if(mode==='lobby')return {scene:'lobby',mode};
 const b=state.battle;
 if(mode==='council'||mode==='diplomacy')return {scene:mode,mode};
 if(mode==='battle'){
  if(b.tick<8)return {scene:'encounter',mode};
  if(b.tick>=Math.max(48,(b.maxTicks||240)*.75))return {scene:'decisive',mode};
  const lead=routedCount(b.sides[1].units,true)-routedCount(b.sides[0].units);
  return {scene:lead>=2?'advantage':lead<=-2?'disadvantage':'battle',mode};
 }
 const faction=state.campaign?.playerFaction||state.playerFaction||'cao';
 if(state.armies?.some(a=>a.faction===faction&&a.travel&&!a.disbanded))return {scene:'march',mode};
 return {scene:musicSeason(state.campaign?.day),mode};
}

export class MusicDirector{
 constructor(){this.current=null;this.state=null;this.battle=null;this.mode=null;this.day=null;this.nextCheck=0;}
 update(state,ui,now){
  const mode=musicMode(state,ui),battle=mode==='battle'||mode==='council'?state.battle:null,day=mode==='strategy'?state.campaign?.day:null;
  // UI redraws only read this small cache key. Recount at most once per ten
  // seconds; a new day, scene, battle or loaded game is checked immediately.
  if(this.current&&state===this.state&&battle===this.battle&&mode===this.mode&&day===this.day&&now<this.nextCheck)return this.current;
  this.state=state;this.battle=battle;this.mode=mode;this.day=day;this.nextCheck=now+10;
  this.current=musicSituation(state,ui,mode).scene;
  return this.current;
 }
}
