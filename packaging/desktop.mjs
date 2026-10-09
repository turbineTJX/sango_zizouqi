import {app,BrowserWindow,protocol,Menu,screen,ipcMain,dialog} from 'electron';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {serveAssets} from '../asset-server.mjs';

protocol.registerSchemesAsPrivileged([{scheme:'sango',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
app.setName('三国 · 君临');
app.setAppUserModelId('com.sango.sovereign');
app.setPath('userData',process.env.SANGO_USER_DATA||join(app.getPath('appData'),'SangoSovereign'));
const locked=app.requestSingleInstanceLock();
if(!locked)app.quit();
else{
 let window;
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
 app.whenReady().then(()=>{
  const code=join(__dirname,'code'),art=app.isPackaged?join(process.resourcesPath,'art'):join(__dirname,'art');
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.bin':'application/octet-stream','.webmanifest':'application/manifest+json'};
  protocol.handle('sango',async request=>{
   try{
    const url=new URL(request.url);if(url.hostname!=='game'||request.method!=='GET')return new Response('Forbidden',{status:403});
    const pathname=decodeURIComponent(url.pathname);
    if(pathname==='/local-art/manifest.json')return Response.json({version:1,id:'builtin',label:'默认图形'});
    if(pathname.startsWith('/assets/')){
     let status=404,headers={},bytes='Not found';
     await serveAssets(pathname,{writeHead(code,values){status=code;headers=values;},end(value){bytes=value;}},art);
     return new Response(bytes,{status,headers});
    }
    const path=resolve(code,'.'+(pathname==='/'?'/index.html':pathname)),tail=path.slice(code.length+1);
    if(!path.startsWith(code+sep)||tail.split(/[\\/]/).some(part=>part.startsWith('.'))||!mime[extname(path)])return new Response('Forbidden',{status:403});
    return new Response(await readFile(path),{headers:{'Content-Type':mime[extname(path)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-store',
     'Content-Security-Policy':"default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'"}});
   }catch{return new Response('Not found',{status:404});}
  });
  Menu.setApplicationMenu(null);
  ipcMain.handle('sango:export-save',async(event,payload)=>{
   if(!event.senderFrame?.url.startsWith('sango://game/')||typeof payload?.name!=='string'||typeof payload.data!=='string'||
    !/^[^\\/:*?"<>|\x00-\x1f]+\.json$/.test(payload.name)||Buffer.byteLength(payload.data)>64*1024*1024)throw Error('Invalid save export');
   JSON.parse(payload.data);let path;
   if(process.env.SANGO_VERIFY==='1'){const out=join(app.getPath('userData'),'exports');await mkdir(out,{recursive:true});path=join(out,payload.name);}
   else{const result=await dialog.showSaveDialog(window,{title:'导出君临存档',defaultPath:join(app.getPath('documents'),payload.name),filters:[{name:'JSON 存档',extensions:['json']}]});if(result.canceled)return false;path=result.filePath;}
   await writeFile(path,payload.data,'utf8');return true;
  });
  const area=screen.getPrimaryDisplay().workAreaSize;
  window=new BrowserWindow({width:Math.min(1440,area.width),height:Math.min(960,area.height),minWidth:Math.min(900,area.width),minHeight:Math.min(650,area.height),title:'三国 · 君临',backgroundColor:'#eee5cf',
   show:process.env.SANGO_VERIFY!=='1',icon:join(__dirname,'icon.png'),autoHideMenuBar:true,
   webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,spellcheck:false,preload:join(__dirname,'preload.cjs')}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('sango://game/'))event.preventDefault();});
  window.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='F11'){window.setFullScreen(!window.isFullScreen());event.preventDefault();}});
  window.loadURL('sango://game/');
 });
 app.on('window-all-closed',()=>app.quit());
}
