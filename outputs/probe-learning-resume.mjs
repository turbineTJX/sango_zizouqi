import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,validateCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {writeFileSync} from 'node:fs';
function toDay(s,day){for(let guard=0;s.campaign.day<day&&guard<300&&!s.finished;guard++){if(s.campaign.phase==='planning')beginExecution(s);const r=advanceCampaignDay(s);if(r.encounter)for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);}return s;}
const s=newCampaign(417,'heroes-251');toDay(s,31);
writeFileSync('outputs/tactic-learning-day31.json',serializeCampaign(s));
for(let i=0;i<s.armies.length;i++)for(let j=i+1;j<s.armies.length;j++)if(s.armies[i].route===s.armies[j].route)console.log('Shared route',s.armies[i].id,s.armies[j].id,s.armies[i].route);
const copy=validateCampaign(JSON.parse(serializeCampaign(s)));
const diffs=[];function diff(a,b,path=''){if(Object.is(a,b))return;if(!a||!b||typeof a!=='object'||typeof b!=='object'){diffs.push({path,a,b});return;}for(const key of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[key],b[key],path+'.'+key);}
diff(s,copy);console.log('Before',diffs.slice(0,20));diffs.length=0;
beginExecution(copy);beginExecution(s);diff(s,copy);console.log('After planning',diffs.slice(0,3));diffs.length=0;
toDay(copy,32);toDay(s,32);diff(s,copy);console.log('After',diffs.slice(0,20));writeFileSync('outputs/tactic-learning-resume-diff.json',JSON.stringify(diffs,null,2));
