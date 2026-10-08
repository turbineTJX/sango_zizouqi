import fs from 'node:fs';
for(const p of ['app.js','campaign-info.mjs','officer-recommendation.mjs']){let s=fs.readFileSync(p,'utf8');s=s.replaceAll('指定名单内、基础智力≥70，任军团长或军师时提供','按明确人物名单持有，任军团长或军师时提供').replaceAll('仅基础智力≥70者拥有军略，任军团长或军师时提供。','军略按明确人物名单分配，任军团长或军师时提供。').replaceAll('基础智力不足70，不提供军略','未列入军略持有人名单');fs.writeFileSync(p,s);}
