import {watch} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readManualState,renderManual,formatManualStatus} from './player-manual-sync.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
let timer,running=false,queued=false;
async function refresh(){
 if(running){queued=true;return;}running=true;
 try{
  const state=await readManualState(root),result=await renderManual(state);
  for(const path of Object.keys(state.sources))if(path.includes('/'))watchSourceDirectory(path.split('/')[0]);
  if(result.outdated.length)console.log('手册已刷新，浏览器重新加载即可查看。');
  console.log(formatManualStatus(state.status));
 }catch(error){console.error('手册更新失败：'+error.message);}
 finally{running=false;if(queued){queued=false;schedule();}}
}
function schedule(){clearTimeout(timer);timer=setTimeout(refresh,350);}
const watchers=[];
const sourceDirectories=new Set();
function listen(dir,recursive,accept){
 watchers.push(watch(resolve(root,dir),{recursive},(_event,name)=>{if(!name||accept(String(name).replaceAll('\\','/')))schedule();}));
}
// Directory watches also see atomic editor replacements and newly added files.
// Generated outputs never trigger rebuild loops.
function watchSourceDirectory(dir){if(!sourceDirectories.has(dir)){listen(dir,true,()=>true);sourceDirectories.add(dir);}}
listen('.',false,name=>/\.(mjs|js|css|html|json|webmanifest|svg|png|webp|woff2)$/.test(name)&&name!=='source-offline-files.js');
watchSourceDirectory('data');watchSourceDirectory('vendor');
listen('docs',false,name=>name==='玩家行动交互流程.md');
listen('docs/manual',false,name=>['template.html','code-links.json','reviewed-code.json'].includes(name));
listen('docs/images/player-actions',false,()=>true);
listen('scripts',false,name=>{if(/^(?:player-manual-|build-player-manual)/.test(name))console.warn('生成器代码已变化，请重启 docs:manual:watch。');return false;});
console.log('正在监听代码、步骤和截图；Ctrl+C 停止。待核对提醒需人工处理，不会自动消除。');
await refresh();
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearTimeout(timer);watchers.forEach(w=>w.close());process.exit(0);});
