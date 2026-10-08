const fs=require('fs');const edit=(p,f)=>{let s=fs.readFileSync(p,'utf8');fs.writeFileSync(p,f(s));};
const cut=(s,start,end,replacement)=>{let a=s.indexOf(start),b=s.indexOf(end,a);if(a<0||b<0)throw new Error('Missing boundary '+start);return s.slice(0,a)+replacement+s.slice(b);};
edit('unit-stats.mjs',s=>cut(s,'export const TROOPS = {','export const isRear',"import {TROOP_DESIGNS} from './data/design/troops.mjs';\nexport const TROOPS = structuredClone(TROOP_DESIGNS);\n"));
edit('officer-traits.mjs',s=>{
 s=cut(s,'// Fixed identity data.','export const roleTraits=',`import {TRAIT_DESIGNS} from './data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS} from './data/design/assignments.mjs';
export const WORK_TRAITS=Object.fromEntries(Object.entries(TRAIT_DESIGNS).filter(([,t])=>t.scope&&t.domain!=='command').map(([id,t])=>[id,structuredClone(t)]));
export const COMMAND_TRAITS=Object.fromEntries(Object.entries(TRAIT_DESIGNS).filter(([,t])=>t.domain==='command').map(([id,t])=>[id,structuredClone(t)]));
export const COMMAND_TRAIT_HOLDERS=Object.freeze(Object.fromEntries(Object.entries(OFFICER_ASSIGNMENTS).map(([id,a])=>[id,a.traits.filter(t=>COMMAND_TRAITS[t])]).filter(([,ids])=>ids.length)));
`);
 s=cut(s,'function assign(p){','export const officerTraits=',"export const OFFICER_TRAITS=Object.freeze(Object.fromEntries(Object.entries(OFFICER_ASSIGNMENTS).map(([id,a])=>[id,Object.freeze([...a.traits])])));\n");return s;
});
edit('passives.mjs',s=>{
 s=cut(s,'export const PASSIVES = {','export const SKILL_ROUTES',"import {TRAIT_DESIGNS} from './data/design/traits.mjs';\nexport const PASSIVES=structuredClone(TRAIT_DESIGNS);\n");
 s=s.replace("  PASSIVES[key]=skill(p.ultimate.name,'专属',ultimateDescription(p.ultimate));",'');
 s=s.replace("FAMOUS_OFFICERS[key.slice(5)]?.ultimate",'PASSIVES[key]?.personal').replace("FAMOUS_OFFICERS[id.slice(5)].ultimate",'PASSIVES[id].personal');return s;
});
edit('tactics.mjs',s=>{
 s=cut(s,'// Data and deterministic targeting','for(const [id,s] of Object.entries(TACTICS_BOOK))',`// Design table stores final combat parameters; no hidden second tuning pass.
import {TACTIC_DESIGNS} from './data/design/tactics.mjs';
import {TROOP_TACTIC_POOLS,INTELLECT_TACTIC_POOLS,OFFICER_ASSIGNMENTS} from './data/design/assignments.mjs';
export const TACTICS_BOOK=structuredClone(TACTIC_DESIGNS);
for(const s of Object.values(TACTICS_BOOK)){s.tempoDescription=describeTacticTempo(s);s.description+='；'+s.tempoDescription;}
`);
 s=s.replace('applyTacticTempo,tacticUsesLeft','describeTacticTempo,tacticUsesLeft');
 s=cut(s,'export const TROOP_TACTICS =','export const CATEGORY_NAMES',`export const TROOP_TACTICS=structuredClone(TROOP_TACTIC_POOLS);
export const INTELLECT_TACTICS=structuredClone(INTELLECT_TACTIC_POOLS);
export const SPECIAL_TACTICS=Object.fromEntries(Object.entries(OFFICER_ASSIGNMENTS).filter(([,a])=>a.specialTactic).map(([id,a])=>[id,a.specialTactic]));
`);
 s=cut(s,'const TOOL_NOTES = {','export function availableTactics','');return s;
});
edit('tactic-tempo.mjs',s=>{const start=s.indexOf('  for (const s of Object.values(book)) {\n    s.tempoDescription');const end=s.indexOf('\n}\nexport const tacticUseLimit',start);if(start<0||end<0)throw Error('tempo boundaries');const block=s.slice(start,end);let body=block.slice(block.indexOf('    s.tempoDescription'),block.lastIndexOf('\n  }')).replace("    s.description += '；' + s.tempoDescription;",'    return s.tempoDescription;');s=s.slice(0,start)+"  for(const s of Object.values(book)){s.tempoDescription=describeTacticTempo(s);s.description+='；'+s.tempoDescription;}"+s.slice(end);return s.replace('export const tacticUseLimit',`export function describeTacticTempo(skill){\n const s={...skill};\n${body}\n}\nexport const tacticUseLimit`);});
edit('stratagems.mjs',s=>{
 s=cut(s,'export const STRATAGEMS = {','export const ORDINARY_STRATAGEM_POOL',`import {STRATAGEM_DESIGNS} from './data/design/stratagems.mjs';
import {OFFICER_ASSIGNMENTS} from './data/design/assignments.mjs';
export const STRATAGEMS=structuredClone(STRATAGEM_DESIGNS);
export const EXCLUSIVE_STRATAGEMS=Object.freeze(Object.fromEntries(Object.entries(STRATAGEMS).filter(([,s])=>s.pool==='exclusive').map(([id,s])=>[id,s.owner])));
`);
 s=cut(s,'const authored={','export const officerStratagems=',"export const OFFICER_STRATAGEMS=Object.freeze(Object.fromEntries(Object.entries(OFFICER_ASSIGNMENTS).map(([id,a])=>[id,Object.freeze([...a.stratagems])])));\n");return s;
});
edit('officer-catalog.mjs',s=>cut(s,'export const OFFICER_CATALOG=profileRows.map','export const OFFICER_BY_ID=',`import {OFFICER_DESIGNS} from './data/design/officers.mjs';
const sourceRowsById=Object.fromEntries(profileRows.map(row=>[sourceKey(row.kind,row.source.Id),row]));
export const OFFICER_CATALOG=Object.values(OFFICER_DESIGNS).map(u=>({...structuredClone(u),source:sourceRowsById[u.id]?.source,profileSource:sourceRowsById[u.id]?.profileSource}));
`));
edit('national-scenarios.mjs',s=>s.replace("import {NATIONAL_MAP} from './data/national-map.mjs';","import {NATIONAL_MAP as MAP_SOURCE} from './data/national-map.mjs';\nimport {CITY_DESIGNS} from './data/design/cities.mjs';\nconst NATIONAL_MAP={...MAP_SOURCE,cities:CITY_DESIGNS};"));
edit('engine.mjs',s=>{s="import {DEMO_CITY_DESIGNS} from './data/design/cities.mjs';\n"+s;return cut(s,'  const cities = [','  const state = {','  const cities=structuredClone(DEMO_CITY_DESIGNS);\n');});
