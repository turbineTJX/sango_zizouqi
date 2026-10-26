import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
export async function audioBrowser(port){
 const root=fileURLToPath(new URL('../',import.meta.url)),server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Audio test server exited: '+code)));});
  browser=await chromium.launch({channel:'msedge',headless:true});
  return {browser,url:`http://127.0.0.1:${port}`,async close(){await browser.close();server.kill();}};
 }catch(error){await browser?.close();server.kill();throw error;}
}
