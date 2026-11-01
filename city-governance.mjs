import {residentOfficer} from './city-personnel.mjs';

// Delegation belongs to a particular resident governor, never to a successor.
export function governorApprover(s,c){
 const id=c?.domestic?.approvalGovernor;
 if(!id||id!==c.governor||c.domestic.owner!==c.owner)return null;
 const o=residentOfficer(s,id);
 return o?.location===c.id&&o.faction===c.owner&&!o.unit.mission&&!o.unit.scouting?id:null;
}
