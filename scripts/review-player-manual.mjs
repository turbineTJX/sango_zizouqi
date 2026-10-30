import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readManualState,reviewManual,renderManual,formatManualStatus} from './player-manual-sync.mjs';

const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];
const root=fileURLToPath(new URL('../',import.meta.url));
try{
 const allowed=new Set(['--all','--actions','--note','--screenshots']);
 for(let i=0;i<args.length;i++){assert.ok(allowed.has(args[i]),'Unknown option: '+args[i]);if(args[i]!=='--all'){assert.ok(args[i+1]&&!args[i+1].startsWith('--'),'Missing value: '+args[i]);i++;}}
 assert.ok(args.includes('--note')&&args.includes('--screenshots'),'需要 --note 与 --screenshots，核对不会自动完成。');
 assert.ok(args.includes('--all')!==args.includes('--actions'),'请指定 --actions action-19,... 或 --all，两者不可同时使用。');
 const state=await readManualState(root);
 const ids=args.includes('--all')?state.binding.actions.map(a=>a.id):value('--actions').split(',');
 const note=value('--note'),screenshots=value('--screenshots');
 const fresh=await readManualState(root);
 assert.deepEqual([state.sources,state.contentHashes,state.binding.hash],[fresh.sources,fresh.contentHashes,fresh.binding.hash],'核对期间文件已变化，请重新检查。');
 await reviewManual(fresh,{ids,note,screenshots});
 const reviewed=await readManualState(root);await renderManual(reviewed);
 console.log(`已记录 ${ids.length} 项人工核对：${note}`);
 console.log(formatManualStatus(reviewed.status));
 if(reviewed.status.pending)process.exitCode=1;
}catch(error){console.error('无法记录手册核对：'+error.message);process.exitCode=1;}
