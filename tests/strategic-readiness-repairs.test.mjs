import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {planStrategicAI} from '../strategic-ai.mjs';
import {updateVision} from '../strategic-vision.mjs';
import {planningFront} from './helpers/strategic-planning.mjs';

const source=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// These are mechanism regressions. Natural windows and local conquests remain
// separate, frozen experiment evidence; no .local save is required by tests.
for(const [name,file] of [
 ['resource-only deficits reach preparation without free resources','recovery-preparation'],
 ['siege equipment must repay its real marching cost','siege-march-cost'],
 ['optional rear staffing retains the real frontline army','frontline-staffing'],
 ['real carriers reach depots and deliver real grain','depot-transport'],
 ['late roster capacity and depot targets preserve real costs','front-capacity'],
 ['rejected prefixes do not hide a later affordable composition','composition-search']
])test(name,async t=>{
 const save=join(tmpdir(),`sango-readiness-${process.pid}-${randomUUID()}.json`);
 await writeFile(save,serializeCampaign(newCampaign(91,'guandu-200','cao',{allAI:true})),{flag:'wx'});
 t.after(()=>unlink(save));
 const {exercise}=await import(`../scripts/ai-validation/cases/${file}.mjs`);
 const checks=await exercise({source,save});
 assert.ok(Object.keys(checks).length>0);
 for(const [check,passed] of Object.entries(checks))assert.equal(passed,true,check);
});

test('launched combat margin stays committed while new opposition still cancels',()=>{
 const {s,target}=planningFront();planStrategicAI(s);
 const plan=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.equal(plan.phase,'attack');
 plan.military.requiredAdvantage=1.1;s.campaign.day++;updateVision(s);
 const revision=s.campaign.ai.factions.yuan.strategy.revision,copy=JSON.parse(serializeCampaign(s));
 planStrategicAI(s);planStrategicAI(copy);
 assert.ok(plan.military.requiredAdvantage<=1.1);
 assert.equal(plan.phase,'attack');
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
 target.units.forEach(u=>u.troops=100000);s.campaign.day++;updateVision(s);planStrategicAI(s);
 assert.equal(plan.phase,'cancelled');assert.match(plan.reason,/优势/);
 assert.equal(s.campaign.ai.factions.yuan.strategy.revision,revision);
});
