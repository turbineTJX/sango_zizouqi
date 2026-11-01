const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('sangoDesktop',Object.freeze({exportSave:(name,data)=>ipcRenderer.invoke('sango:export-save',{name,data}),openManual:()=>ipcRenderer.invoke('sango:open-manual'),exitGame:()=>ipcRenderer.invoke('sango:exit-game')}));
