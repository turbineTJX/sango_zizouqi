import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
p.scripts['verify:stratagems-ui']+=' && node scripts/verify-stratagem-extreme-ui.mjs';
p.scripts.check+=' && node --check stratagem-events.mjs && node --check scripts/verify-stratagem-extreme-ui.mjs';
fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');
