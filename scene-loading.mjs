// Presentation only: the caller keeps the world paused while preparing a view.
const paint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
export class SceneLoading {
 busy=false;
 async run(label,prepare){
  if(this.busy)return;
  this.busy=true;
  const dialog=document.createElement('dialog');dialog.className='modal scene-loading';
  dialog.setAttribute('aria-labelledby','scene-loading-title');dialog.setAttribute('aria-describedby','scene-loading-status');
  dialog.innerHTML='<header class="modal-header"><h2 id="scene-loading-title"></h2></header><div class="modal-body"><p id="scene-loading-status" role="status" aria-live="polite">正在准备画面…</p><progress aria-label="画面加载进度"></progress></div>';
  dialog.querySelector('h2').textContent=label;
  dialog.addEventListener('cancel',event=>event.preventDefault());
  document.body.append(dialog);dialog.showModal();
  const report=(text,done,total)=>{
   dialog.querySelector('p').textContent=total>0?`${text}（${done}/${total}）`:text;
   const bar=dialog.querySelector('progress');
   if(total>0){bar.max=total;bar.value=done;}else bar.removeAttribute('value');
  };
  try{
   await paint();
   // A failed or stalled optional asset must not trap the player in this dialog.
   let timer;
   try{await Promise.race([prepare(report),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('画面素材加载超时，已保留可用画面')),15000);})]);}
   finally{clearTimeout(timer);}
   report('准备完成',1,1);await paint();
  }finally{dialog.close();dialog.remove();this.busy=false;}
 }
}
export async function waitForSceneImages(root,report){
 const images=[...root.querySelectorAll('img')].filter(img=>img.loading!=='lazy'&&!img.complete);
 let done=0;report('正在加载画面素材…',0,images.length);
 await Promise.all(images.map(img=>new Promise(resolve=>{
  const finish=()=>{img.removeEventListener('load',finish);img.removeEventListener('error',finish);report('正在加载画面素材…',++done,images.length);resolve();};
  img.addEventListener('load',finish,{once:true});img.addEventListener('error',finish,{once:true});
  if(img.complete)finish();
 })));
}
