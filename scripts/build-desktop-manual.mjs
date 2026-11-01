import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';

// Only the Windows stage calls this: screenshots never enter the APK/web bundle.
export async function buildDesktopManual(root,out){
 const source=(await readFile(join(root,'docs/玩家行动交互图册.html'),'utf8')).replace(/\r\n/g,'\n');
 const match=source.match(/const manual=(.*);\n/);assert.ok(match,'Generate the player manual before packaging');
 const manual=JSON.parse(match[1]),scripts=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1,'Expected one self-contained manual script');
 const files=[...new Set(Object.values(manual.captures).map(shot=>shot.file))];
 for(const file of files){
  assert.match(file,/^images\/player-actions\/[\w-]+\.webp$/,'Invalid manual screenshot path');
  const target=join(out,file);await mkdir(dirname(target),{recursive:true});await copyFile(join(root,'docs',file),target);
 }
 // Keep the desktop protocol's script policy strict; no inline-script exception.
 const html=source.replace(scripts[0][0],'<script src="./manual.js"></script>');
 await writeFile(join(out,'index.html'),html);
 await writeFile(join(out,'manual.js'),scripts[0][1]+`
// Desktop reading window: source-maintenance links belong to the source manual.
document.querySelector('.about p:has(a)')?.remove();
document.querySelector('#maintenance').hidden=true;
document.querySelector('#sync-banner a')?.remove();
const back=document.createElement('button');back.textContent='返回游戏';back.className='small-button';back.style.color='inherit';back.addEventListener('click',()=>window.close());document.querySelector('.top').append(back);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('lightbox').open){event.preventDefault();window.close();}});
`);
 return {workflows:manual.chapters.reduce((sum,chapter)=>sum+chapter.actions.length,0),screenshots:files.length};
}
