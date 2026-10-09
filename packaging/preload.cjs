const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('sangoDesktop',Object.freeze({exportSave:(name,data)=>ipcRenderer.invoke('sango:export-save',{name,data})}));
