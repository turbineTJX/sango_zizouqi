import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {playerFaction} from './player-faction.mjs';
import {nationalScenario,NATIONAL_FACTIONS as FACTIONS} from './national-scenarios.mjs';

// Battle facts and compact merit totals supply the ending. A defeated player
// sees only their own faction's results, without retaining civil replay history.
export function campaignEnding(s){
 if(!s.campaign||!s.finished)return null;
 const observer=!!s.campaign.allAI,winner=s.finished==='victory'?(observer?s.cities[0]?.owner:playerFaction(s)):null;
 const faction=observer?winner:playerFaction(s),nodes=s.campaign.activity.nodes;
 const battles=new Map(),officers=new Map(),events=[],sources=new Set();
 const casualty={initial:0,remaining:0,wounded:0,killed:0,escaped:0};
 const officer=id=>{if(!officers.has(id))officers.set(id,{id,name:OFFICER_BY_ID[id]?.name||id,merit:0,battleMerit:0,domesticMerit:0,otherMerit:0,battles:new Set()});return officers.get(id);};
 for(const [id,total]of Object.entries(s.campaign.activity.meritTotals?.[faction]||{})){const row=officer(id);row.battleMerit=total.battle;row.domesticMerit=total.domestic;row.otherMerit=total.other;row.merit=total.battle+total.domestic+total.other;}
 let captured=0,lost=0;
 for(const node of nodes){
  if(node.faction!==faction||sources.has(node.sourceId))continue;
  sources.add(node.sourceId);
  if(node.phase==='merit'&&node.officerId){
   const row=officer(node.officerId),gain=node.result?.growth?.gained||0;
   row.merit+=gain;row[node.category==='battle'?'battleMerit':node.category==='domestic'?'domesticMerit':'otherMerit']+=gain;
  }
  if(node.category==='battle'&&node.phase==='settled'&&!battles.has(node.result.battleId)){
   const id=node.result.battleId;battles.set(id,node);
   for(const key of Object.keys(casualty))casualty[key]+=node.result.stats?.[key]||0;
   for(const id of node.officerIds||[])officer(id).battles.add(node.result.battleId);
   events.push({day:node.day,sequence:node.sequence,kind:'battle',text:node.text});
  }
  if(node.category==='occupation'&&['captured','lost'].includes(node.phase)){
   if(node.phase==='captured')captured++;else lost++;
   events.push({day:node.day,sequence:node.sequence,kind:'territory',text:node.text});
  }
 }
 const controlled=s.cities.filter(c=>c.owner===faction).length;
 let initial=controlled;
 // Reverse all actual transfers, including recaptures of the same city.
 initial+=lost-captured;
 const wins=[...battles.values()].filter(n=>n.result.winner===faction).length;
 const draws=[...battles.values()].filter(n=>!n.result.winner).length;
 return {outcome:s.finished,observer,winner,faction,factionName:FACTIONS[faction]?.name||faction,
  title:observer?`${FACTIONS[winner]?.name||winner}统一天下`:s.finished==='victory'?'天下一统':'征途落幕',
  scenario:nationalScenario(s.campaign.scenarioId)?.name||s.campaign.scenarioId,
  days:Math.max(0,s.campaign.day-1),territory:{initial,controlled,captured,lost},
  battles:{total:battles.size,wins,draws,losses:battles.size-wins-draws},casualty,
  officers:[...officers.values()].map(o=>({...o,battles:o.battles.size})).sort((a,b)=>b.merit-a.merit||b.battles-a.battles||a.id.localeCompare(b.id)),
  events:events.sort((a,b)=>b.day-a.day||b.sequence-a.sequence)};
}
