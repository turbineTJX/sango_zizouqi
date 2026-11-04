import {DIPLOMACY_RELATION_ACTIONS as ACTIONS,DIPLOMACY_RELATION_TIERS as TIERS} from './data/design/diplomacy-rules.mjs';

export const diplomaticRelation=(s,a,b)=>s.campaign.diplomacy.relations[[a,b].sort().join(':')]??0;
export function diplomaticTradeMultiplier(s,a,b){
 const relation=diplomaticRelation(s,a,b);
 return TIERS.findLast(t=>relation>=t.minimum).multiplier;
}
export const diplomaticActionUnlocked=(s,a,b,action)=>!!ACTIONS[action]&&diplomaticRelation(s,a,b)>=ACTIONS[action].minimum;
export function isPeaceCession(p){
 const cities=p.clauses.filter(c=>c.kind==='city');
 return p.goal==='peace'&&cities.length>0&&new Set(cities.map(c=>c.from)).size===1&&p.clauses.some(c=>c.kind==='peace');
}
export function diplomaticAccessError(s,p){
 const [a,b]=p.factions,actions=new Set(p.goal==='auto'?[]:[p.goal]);
 const has=kind=>p.clauses.some(c=>c.kind===kind);
 if(has('city')&&!isPeaceCession(p))actions.add('border');
 if(has('alliance'))actions.add('alliance');
 if(has('deploy'))actions.add('aid');
 if(has('trade'))actions.add('trade');
 if(has('intelligence'))actions.add('intelligence');
 if(has('manpower'))actions.add('manpower');
 if(p.clauses.some(c=>c.kind==='gold'&&c.deferred))actions.add('funding');
 if(has('grain')&&!has('deploy'))actions.add('buyGrain');
 if(has('prisoner')&&p.clauses.filter(c=>c.kind==='prisoner').some(c=>c.from===a)&&p.clauses.some(c=>c.kind==='prisoner'&&c.from===b))actions.add('exchange');
 const locked=[...actions].filter(k=>ACTIONS[k]&&!diplomaticActionUnlocked(s,a,b,k)).sort((x,y)=>ACTIONS[y].minimum-ACTIONS[x].minimum)[0];
 if(locked)return `${ACTIONS[locked].name}需交情${ACTIONS[locked].minimum}`;
 return null;
}
