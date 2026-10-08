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
export const BATTLE_TRAITS={
 cao:['discipline','steady','hero-cao'],dun:['spear','desperate','defiant'],liao:['rider','interdict','isolated'],chu:['shelter','steady','guard'],
 jia:['suppress','stifle','foresight'],yu:['shield','calm','rescue'],yuanxia:['bow','joint','swift'],jin:['discipline','spear','steady','fortress'],
 shao:['discipline','joint','veteran'],yan:['rider','valor'],wen:['rider','desperate','veteran'],he:['joint','prepared','adapt'],ju:['shield','calm','aid'],tian:['combo','wisdom'],gao:['cavalryGeneral','desperate','fortress'],
};
export const COMMON_TRAITS={
 spear:['spear','spearGeneral'],cavalry:['rider','cavalryGeneral'],archer:['bow','rapid'],crossbow:['crossbow','rapid'],
 halberd:['halberdDrill','halberdGeneral'],siege:['siegeDrill','steady'],ship:['shipDrill','joint'],
 strategist:['combo','calm'],support:['shield','aid'],domestic:['administration','farming'],
};
export const CIVIC_TRAITS={
 'person-443':['rice','physician','benevolence'], 'person-533':['wealth','merchant','transporter'],
 'person-255':['administration','insight','mediator'], 'person-420':['administration','benevolence'],
 'person-449':['fame','insight','administration'], 'person-567':['builder','benevolence','steady'],
 'person-212':['administration','merchant'], 'person-634':['merchant','administration'],
 'person-123':['persuader','mediator'], 'person-487':['persuader','traveler'], 'person-283':['persuader','mediator'],
 'person-705':['physician','traveler'], 'person-107':['farming','recruiter'], 'person-501':['farming','benevolence'],
 'person-263':['administration','transporter'], 'person-529':['mediator','administration'],
};
export function aptitudeKey(u){
 const p=OFFICER_BY_ID[u.id];if(!p)return u.skillRouteType||u.type||'spear';
 if(p.politics>=80&&p.politics>=p.intellect&&p.politics>=p.force+15)return 'domestic';
 if(p.intellect>=65&&p.intellect>=p.force+15)return 'strategist';
 return p.type;
}
export const OFFICER_TRAITS=Object.freeze(Object.fromEntries(Object.entries(OFFICER_ASSIGNMENTS).map(([id,a])=>[id,Object.freeze([...a.traits])])));
export const officerTraits=u=>OFFICER_TRAITS[u.id]||COMMON_TRAITS[aptitudeKey(u)]||COMMON_TRAITS.spear;
export const hasTrait=(u,id)=>!!u&&officerTraits(u).includes(id);
export const taskTraits=(u,def)=>officerTraits(u).filter(id=>{const t=WORK_TRAITS[id];return t?.kinds?.includes(def.kind)&&(!t.direction||t.direction===def.direction)&&(!t.value||t.value===def.value);});
export const taskTraitBonus=(u,def,key)=>u?taskTraits(u,def).reduce((n,id)=>Math.max(n,WORK_TRAITS[id][key]||0),0):0;
