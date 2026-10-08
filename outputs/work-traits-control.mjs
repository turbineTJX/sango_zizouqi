import {TRAIT_DESIGNS} from '../data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS} from '../data/design/assignments.mjs';
const ids=new Set(Object.keys(TRAIT_DESIGNS).filter(id=>TRAIT_DESIGNS[id].work));
for(const a of Object.values(OFFICER_ASSIGNMENTS))a.traits=a.traits.filter(id=>!ids.has(id));
for(const id of ids)delete TRAIT_DESIGNS[id];
