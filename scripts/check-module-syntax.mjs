import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const files=[];
function collect(dir){for(const e of readdirSync(dir||'.',{withFileTypes:true})){const path=dir?join(dir,e.name):e.name;if(e.isDirectory()){if(dir||['scripts','packaging'].includes(e.name))collect(path);}else if(/\.(?:mjs|cjs|js)$/.test(path))files.push(path);}}
collect('');for(const path of files)execFileSync(process.execPath,['--check',path],{stdio:'pipe',windowsHide:true});console.log('Module syntax passed: '+files.length+' files');
