import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
p.scripts['test:stratagems']=p.scripts['test:stratagems'].replace('node --test ','node --test tests/stratagem-ai.test.mjs ');
p.scripts['test:stratagem-ai']='node --test tests/stratagem-ai.test.mjs tests/stratagem-placement-ai.test.mjs tests/proactive-command-ai.test.mjs tests/ai-target-command.test.mjs tests/cleanse-ai.test.mjs';
p.scripts['audit:stratagem-ai']='node scripts/audit-stratagem-ai.mjs';
p.scripts.check+=' && node --check scripts/audit-stratagem-ai.mjs';
fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');
let tables=fs.readFileSync('scripts/design-tables.mjs','utf8');tables=tables.replace("['ID','名称','基准持续步数','基准效果','持有武将','群雄集结开局分布','参数','内部设计备注']","['ID','名称','AI触发类型','基准持续步数','基准效果','持有武将','群雄集结开局分布','参数','内部设计备注']").replace('[id,t.name,t.duration,t.description,holders(\'stratagems\',id)', '[id,t.name,t.ai,t.duration,t.description,holders(\'stratagems\',id)');fs.writeFileSync('scripts/design-tables.mjs',tables);
