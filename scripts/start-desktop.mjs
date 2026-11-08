import {spawn} from 'node:child_process';
import {access,copyFile,mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import sharp from 'sharp';
import {ROOT,buildCodeRelease} from './release-lib.mjs';
import {ASSET_ROOT} from '../asset-workspace.mjs';
import {buildDesktopManual} from './build-desktop-manual.mjs';
import {buildMapAssets} from './build-map-assets.mjs';

const previewRoot=join(ROOT,'.local','desktop-preview');

export async function prepareDesktopPreview(){
 try{await access(join(ASSET_ROOT,'manifest.json'));await buildMapAssets();}catch(error){if(error.code!=='ENOENT')throw error;}
 const executablePath=join(ROOT,'node_modules','electron','dist',process.platform==='win32'?'electron.exe':'electron');
 try{await access(executablePath);}catch{throw Error('缺少桌面运行组件，请先在项目目录运行 npm ci。');}
 await mkdir(previewRoot,{recursive:true});
 // Each launch owns its code snapshot, including while another window is open.
 const stage=await mkdtemp(join(previewRoot,'run-'));
 const {manifest}=await buildCodeRelease(join(stage,'code'));
 await build({entryPoints:[join(ROOT,'packaging/desktop.mjs')],outfile:join(stage,'main.cjs'),bundle:true,platform:'node',format:'cjs',external:['electron'],target:'node22',logLevel:'silent'});
 await copyFile(join(ROOT,'packaging/preload.cjs'),join(stage,'preload.cjs'));
 const icon=await sharp(await readFile(join(ROOT,'icon.svg'))).resize(256,256).png().toBuffer();
 await writeFile(join(stage,'icon.png'),icon);
 const ico=Buffer.alloc(22+icon.length);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(icon.length,14);ico.writeUInt32LE(22,18);ico.set(icon,22);
 await writeFile(join(previewRoot,'launcher.ico'),ico);
 await buildDesktopManual(ROOT,join(stage,'code/manual'));
 await writeFile(join(stage,'package.json'),JSON.stringify({name:'sango-project-preview',version:manifest.gameVersion,main:'main.cjs'}));
 const env={...process.env,SANGO_PROJECT_PREVIEW:'1',SANGO_PREVIEW_STAGE_ROOT:previewRoot,SANGO_PREVIEW_ASSET_ROOT:ASSET_ROOT,SANGO_PREVIEW_PLAYTEST_ROOT:join(ROOT,'art/playtest'),
  SANGO_USER_DATA:process.env.SANGO_USER_DATA||join(process.env.APPDATA||join(homedir(),'.config'),'SangoSovereignPreview')};
 delete env.ELECTRON_RUN_AS_NODE;
 return {stage,executablePath,env,rulesVersion:manifest.rulesVersion,revision:manifest.revision};
}

export async function startDesktopPreview(){
 const prepared=await prepareDesktopPreview();
 const child=spawn(prepared.executablePath,[prepared.stage],{cwd:ROOT,env:prepared.env,detached:true,stdio:'ignore',windowsHide:false});
 await new Promise((ok,no)=>{child.once('spawn',ok);child.once('error',no);});
 child.unref();
 console.log('已打开项目最新版桌面窗口，规则 '+prepared.rulesVersion+'。关闭窗口后重新启动即可载入后续修改。');
 return prepared;
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{await startDesktopPreview();}
 catch(error){
  console.error('桌面版启动失败：'+error.message);
  await mkdir(previewRoot,{recursive:true});
  await writeFile(join(previewRoot,'launcher-error.log'),new Date().toISOString()+'\n'+(error.stack||error.message)+'\n');
  process.exitCode=1;
 }
}
