import {DIPLOMACY_GOALS} from './data/design/diplomacy-rules.mjs';
// A proposal goal belongs to its initiator; resource terms are viewed by each recipient.
export function diplomaticProposalLabel(p,faction=p.factions[0]){
 if(['buyGrain','sellGrain'].includes(p.goal)){
  const net=p.clauses.filter(c=>c.kind==='grain').reduce((n,c)=>n+(c.to===faction?c.amount:0)-(c.from===faction?c.amount:0),0);
  return net>0?'购入粮食':net<0?'出售粮食':'粮食交易';
 }
 return DIPLOMACY_GOALS[p.goal]+(p.factions[0]!==faction?'（对方提议）':'');
}
