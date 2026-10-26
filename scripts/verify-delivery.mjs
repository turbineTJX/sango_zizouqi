import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {readRuntimeVersions} from './rule-source-contract.mjs';

const root=process.cwd(),out=resolve('work','delivery-'+Date.now());await mkdir(out,{recursive:true});
async function fingerprint(){
 const files=[];
 async function scan(dir){for(const e of await readdir(join(root,dir),{withFileTypes:true})){const path=dir?dir+'/'+e.name:e.name;if(e.isDirectory()){if(['data','packaging','scripts','tests','docs'].includes(path)||dir)await scan(path);}else if(/\.(?:mjs|cjs|js|css|html|json|md|java|xml|webmanifest|cmd|ps1|gradle|properties)$/.test(path))files.push(path);}}
 await scan('');const hashes={};for(const file of files.sort())hashes[file]=createHash('sha256').update(await readFile(join(root,file))).digest('hex');
 return {sourceHash:createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),hashes};
}
const snapshot=await fingerprint(),result={startedAt:new Date().toISOString(),versions:readRuntimeVersions(root),sourceHash:snapshot.sourceHash,passed:false,complete:false,steps:[]};
await writeFile(join(out,'manifest.json'),JSON.stringify(snapshot,null,2));
const record=()=>writeFile(join(out,'result.json'),JSON.stringify(result,null,2));await record();
async function run(name,args){
 if((await fingerprint()).sourceHash!==snapshot.sourceHash)throw Error('验证输入已变化，请用新源码重新运行发布检查');
 const step={name,args,startedAt:new Date().toISOString(),passed:false};result.steps.push(step);await record();console.log('Checking: '+name);
 const output=[];const start=Date.now();
 const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});for(const stream of [child.stdout,child.stderr])stream.on('data',data=>output.push(data));child.on('error',reject);child.on('exit',resolve);});
 const log=Buffer.concat(output);await writeFile(join(out,name+'.log'),log);step.seconds=(Date.now()-start)/1000;step.exitCode=code;step.passed=code===0;await record();
 if(code!==0){console.error(log.toString().slice(-7000));throw Error(name+'未通过，记录已保留：'+out);}
 if((await fingerprint()).sourceHash!==snapshot.sourceHash)throw Error('验证期间源码变化，不能把这些结果用于当前发行');
 console.log('Passed: '+name+' ('+step.seconds.toFixed(1)+'s)');return log.toString();
}
try{
 await run('docs',['scripts/check-current-docs.mjs']);
 await run('design',['scripts/design-tables.mjs','check']);
 await run('design-sync',['scripts/design-tables.mjs','verify']);
 await run('module-syntax',['scripts/check-module-syntax.mjs']);
 await run('source-offline-manifest',['scripts/source-offline-manifest.mjs','--check']);
 await run('unit-tests',['--test','--test-concurrency=4','tests/*.test.mjs']);
 await run('source-first-offline',['scripts/verify-source-offline-ui.mjs']);
 await run('campaign-ending',['scripts/verify-campaign-ending-ui.mjs']);
 await run('release-browser',['scripts/verify-release-ui.mjs']);
 await run('natural-large-save',['scripts/verify-save-storage-ui.mjs']);
 await run('archive-interface',['scripts/verify-save-archives-ui.mjs']);
 const completion=process.argv.find(a=>a.startsWith('--completion='))?.slice(13);
 if(completion)await run('natural-completion',['scripts/verify-completion-evidence.mjs',...completion.split(',')]);
 const android=process.argv.find(a=>a.startsWith('--android-apk='))?.slice(14),androidSave=process.argv.find(a=>a.startsWith('--android-save='))?.slice(15);
 if(android){if(!androidSave)throw Error('Android acceptance requires --android-save=<natural current save>');await run('android-device',['scripts/verify-android-device.mjs','--apk='+android,'--save='+androidSave,'--install=true']);}
 if(process.argv.includes('--desktop')){
  const log=await run('desktop-build',['scripts/build-native.mjs','windows','--code-only']),directory=log.match(/Native release: (.+)/)?.[1]?.trim();
  if(!directory)throw Error('未找到本次桌面发行目录');
  const manifest=JSON.parse(await readFile(join(directory,'native-release.json'),'utf8'));
  await run('desktop-container',['scripts/verify-desktop-release.mjs',join(directory,'win-unpacked','SangoSovereign.exe')]);
  await run('desktop-portable',['scripts/verify-portable-release.mjs',join(directory,manifest.artifacts.windows.file)]);
  result.desktopDirectory=directory;
 }
 result.passed=true;result.complete=true;result.finishedAt=new Date().toISOString();await record();console.log('Delivery verification passed: '+out);
}catch(error){result.error=error.message;result.finishedAt=new Date().toISOString();await record();console.error(error.message);process.exitCode=1;}
