import fs from 'node:fs';const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('data/design/building-effects.mjs',s=>s.replace('增加160金','增加320金').replace('增加600粮','增加1400粮').replace('收入+500','收入+800'));
edit('docs/design-tables/README.md',s=>s.replace('新增19张可编辑设计底稿已建好','可编辑设计底稿目录已建立').replace('现有配置已填入','经济收入、容量及自动内政用人数值现已接入 `economy-rules.mjs`，见[经济规则一览表](经济规则一览表.md)。现有配置已填入'));
