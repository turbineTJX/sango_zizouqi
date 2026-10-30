import {fileURLToPath} from 'node:url';
import {readManualState,renderManual,formatManualStatus} from './player-manual-sync.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),check=process.argv.includes('--check');
try{
 const state=await readManualState(root),result=await renderManual(state,{check});
 console.log(formatManualStatus(state.status));
 if(check&&result.outdated.length)console.error('生成物需刷新：'+result.outdated.join('、')+'\n运行 npm run docs:manual（不会清除待核对提醒）。');
 else console.log(`${check?'已检查':'已生成'} HTML：${state.content.actions.length} 项操作、${state.content.used.length} 张截图。`);
 if(!result.valid)process.exitCode=1;
}catch(error){console.error('手册检查失败：'+error.message);process.exitCode=1;}
