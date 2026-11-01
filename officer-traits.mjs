import {OFFICER_BY_ID} from './officer-catalog.mjs';

import {TRAIT_DESIGNS} from './data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS} from './data/design/assignments.mjs';
export const WORK_TRAITS=Object.fromEntries(Object.entries(TRAIT_DESIGNS).filter(([,t])=>t.scope&&t.domain!=='command').map(([id,t])=>[id,structuredClone(t)]));
export const COMMAND_TRAITS=Object.fromEntries(Object.entries(TRAIT_DESIGNS).filter(([,t])=>t.domain==='command').map(([id,t])=>[id,structuredClone(t)]));
export const COMMAND_TRAIT_HOLDERS=Object.freeze(Object.fromEntries(Object.entries(OFFICER_ASSIGNMENTS).map(([id,a])=>[id,a.traits.filter(t=>COMMAND_TRAITS[t])]).filter(([,ids])=>ids.length)));
export const roleTraits=(u,role)=>officerTraits(u).filter(id=>COMMAND_TRAITS[id]?.role===role);
export function activeCommandTraits(b,u){
 if(!b||!u.armyId)return [];
 const side=b.sides?.[u.side];
 return [...new Set((side?.commanders||[]).filter(c=>c.armyId===u.armyId).flatMap(c=>roleTraits(c,c.role)))];
}
export const COMMON_TRAITS={};
export const CIVIC_TRAITS={};
export function aptitudeKey(u){
 const p=OFFICER_BY_ID[u.id];if(!p)return u.skillRouteType||u.type||'spear';
 if(p.politics>=80&&p.politics>=p.intellect&&p.politics>=p.force+15)return 'domestic';
 if(p.intellect>=65&&p.intellect>=p.force+15)return 'strategist';
 return p.type;
}
export const OFFICER_TRAITS=Object.freeze(Object.fromEntries(Object.entries(OFFICER_ASSIGNMENTS).map(([id,a])=>[id,Object.freeze([...a.traits])])));
export const independentTrait=id=>!!TRAIT_DESIGNS[id]&&TRAIT_DESIGNS[id]?.domain!=='battle'||TRAIT_DESIGNS[id]?.mechanics?.some(m=>m.roles);
export const officerTraits=u=>(OFFICER_TRAITS[u.id]||[]).filter(independentTrait);
export const hasTrait=(u,id)=>!!u&&officerTraits(u).includes(id);
export const traitMatchesTask=(t,def)=>!!t&&(!t.work||t.work.actions.includes(def.id))&&!!t.kinds?.includes(def.kind)&&(!t.direction||t.direction===def.direction)&&(!t.value||t.value===def.value);
export const taskTraits=(u,def)=>officerTraits(u).filter(id=>traitMatchesTask(WORK_TRAITS[id],def));
// Appointments include command effects and real cooperation/discovery hooks.
// Military roles, transport and battle traits do not supply domestic effects.
const domesticTraitMatchesDirection=(t,defs)=>t?.domain==='domestic'&&(defs.some(def=>traitMatchesTask(t,def)||t.strategic?.effect==='treasureDiscovery'&&t.strategic.actions.includes(def.id))||defs.length>0&&(t.scope==='cooperation'||t.strategic?.effect==='crossCooperate'));
export const domesticDirectionTraitCatalog=defs=>Object.entries(WORK_TRAITS).filter(([,t])=>domesticTraitMatchesDirection(t,defs)).map(([id,t])=>({id,...t}));
export const domesticDirectionTraits=(u,defs)=>officerTraits(u).filter(id=>domesticTraitMatchesDirection(WORK_TRAITS[id],defs));
export const taskTraitBonus=(u,def,key)=>u?taskTraits(u,def).reduce((n,id)=>Math.max(n,WORK_TRAITS[id][key]||0),0):0;
