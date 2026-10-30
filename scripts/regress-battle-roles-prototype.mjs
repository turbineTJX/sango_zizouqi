import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join,dirname,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const repo=process.cwd(),runtime=resolve(process.argv[2]||'work/battle-roles-prototype/window-v3/runtime'),out=resolve(process.argv[3]||'work/battle-roles-prototype/regression');
const selected=['ai-bond-blind.test.mjs','engine-command-phase.test.mjs','tactic-uses.test.mjs','combos.test.mjs','historical-synergy.test.mjs'];
const copied=new Set();
function copy(file){if(copied.has(file))return;copied.add(file);let src=readFileSync(file,'utf8');
 // Preserve the actual pre-threshold support scenario after changing Zhou Yu's
 // threshold. The live test and game sources remain untouched.
 if(file.endsWith('historical-synergy.test.mjs'))src=src.replaceAll('zhou.intent=80','zhou.intent=unitTactics(zhou)[0].threshold-20').replace('assert.ok(zhou.intent>=100)','assert.ok(zhou.intent>=unitTactics(zhou)[0].threshold)');
 // Opening preparation moves the first natural command before tick 20. Save
 // at tick 1 instead, retaining the original phase and continuation assertions.
 if(file.endsWith('engine-command-phase.test.mjs')&&readFileSync(join(runtime,'engine.mjs'),'utf8').includes('initial:4500'))src=src.replace('b.tick===20','b.tick===1');
 src=src.replace(/((?:from\s*|import\s*\(\s*|import\s*)['"])(\.[^'"]+)(['"])/g,(all,pre,p,post)=>{
  const absolute=resolve(dirname(file),p);if(absolute.startsWith(resolve(repo,'tests')+'\\')||absolute.startsWith(resolve(repo,'tests')+'/')){copy(absolute);return all;}
  return pre+pathToFileURL(join(runtime,relative(repo,absolute))).href+post;
 });
 const dest=join(out,relative(join(repo,'tests'),file));mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,src);
}
for(const f of selected)copy(join(repo,'tests',f));
const result=spawnSync(process.execPath,['--test','--test-reporter=tap',...selected.map(p=>join(out,p))],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
writeFileSync(join(out,'result.tap'),result.stdout+result.stderr);console.log(result.stdout.slice(-4500));console.error(result.stderr);process.exitCode=result.status??1;
