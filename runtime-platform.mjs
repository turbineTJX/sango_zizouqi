export const isNativeApplication=()=>globalThis.location?.protocol==='sango:'||!!globalThis.Capacitor?.isNativePlatform?.();
export const saveLocationText=()=>isNativeApplication()?'存档保存在本机应用中。':'存档保存在当前浏览器。';

export async function exportSaveFile(name,data){
 name=name.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_');
 if(globalThis.sangoDesktop?.exportSave)return globalThis.sangoDesktop.exportSave(name,data);
 if(globalThis.Capacitor?.isNativePlatform?.()){
  const [{Filesystem,Directory,Encoding},{Share}]=await Promise.all([import('@capacitor/filesystem'),import('@capacitor/share')]);
  const result=await Filesystem.writeFile({path:'saves/'+name,data,directory:Directory.Cache,encoding:Encoding.UTF8,recursive:true});
  await Share.share({title:'君临存档',files:[result.uri],dialogTitle:'保存或分享存档'});return;
 }
 const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export async function installNativeLifecycle({pauseAndSave,back}){
 if(!globalThis.Capacitor?.isNativePlatform?.())return;
 const {App}=await import('@capacitor/app');
 await App.addListener('appStateChange',({isActive})=>{if(!isActive)pauseAndSave();});
 await App.addListener('backButton',async()=>{
  if(back())return;
  pauseAndSave();if(confirm('进度已保存，退出游戏？'))await App.exitApp();
 });
}
