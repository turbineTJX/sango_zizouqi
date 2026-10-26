import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RULE_SOURCES} from '../data/design/rule-sources.mjs';
import {PENDING_DESIGN_TABLES} from '../data/design/pending-tables.mjs';
import {assertRuleSources,readRuntimeVersions} from '../scripts/rule-source-contract.mjs';
import {newCampaign} from '../strategic-campaign.mjs';
import {STRATEGIC_AI} from '../strategic-ai.mjs';
import {STRATEGIC_PLANNING_RULES} from '../data/design/strategic-planning-rules.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
test('every draft has existing actual owners and is isolated from the game import graph',()=>{
 assert.ok(assertRuleSources(PENDING_DESIGN_TABLES,RULE_SOURCES,root)>100);
 const missing=structuredClone(RULE_SOURCES);missing.events=['missing.mjs'];assert.throws(()=>assertRuleSources(PENDING_DESIGN_TABLES,missing,root),/实际来源无效/);
 const duplicate=structuredClone(RULE_SOURCES);duplicate.events.push(duplicate.events[0]);assert.throws(()=>assertRuleSources(PENDING_DESIGN_TABLES,duplicate,root),/唯一实际来源/);
});
test('a runtime bridge to a draft fails even when the file exists',t=>{
 const base=resolve(tmpdir()),dir=mkdtempSync(join(base,'sango-rule-sources-'));t.after(()=>{assert.equal(dirname(resolve(dir)),base);assert.ok(basename(dir).startsWith('sango-rule-sources-'));rmSync(dir,{recursive:true,force:true});});
 mkdirSync(join(dir,'data/design'),{recursive:true});writeFileSync(join(dir,'data/design/example.mjs'),'export default {};');writeFileSync(join(dir,'runtime.mjs'),"import './data/design/example.mjs';");
 const tables=[{id:'example',records:[{source:'runtime.mjs'}]}];assert.throws(()=>assertRuleSources(tables,{example:['runtime.mjs']},dir,{entry:'runtime.mjs'}),/运行时误导入/);
});
test('documentation versions read from actual runtime definitions match a current game',()=>{
 const s=newCampaign(7),v=readRuntimeVersions(root);
 assert.equal(v.rules,s.rulesVersion);assert.equal(v.campaign,s.campaign.version);assert.equal(v.ai,STRATEGIC_AI.version);assert.equal(v.strategy,STRATEGIC_PLANNING_RULES.version);assert.equal(v.domestic,s.campaign.domestic.version);
});
