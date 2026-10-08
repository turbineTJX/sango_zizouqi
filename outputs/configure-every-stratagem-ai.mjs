import fs from 'node:fs';
import {STRATAGEM_DESIGNS} from '../data/design/stratagems.mjs';
for(const s of Object.values(STRATAGEM_DESIGNS))s.ai=s.effect;
fs.writeFileSync('data/design/stratagems.mjs','// Authoritative military strategies: explicit holder lists and simple AI triggers.\nexport const STRATAGEM_DESIGNS = '+JSON.stringify(STRATAGEM_DESIGNS,null,2)+';\n');
