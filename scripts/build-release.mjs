import {mkdir,readdir,copyFile,cp,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// A new directory on each run avoids carrying stale local assets into a build.
const out=resolve(root,'dist','release-'+Date.now());await mkdir(out,{recursive:true});
for(const file of await readdir(root))if(/\.(mjs|js|css|html|svg|webmanifest)$/.test(file))await copyFile(resolve(root,file),resolve(out,file));
await cp(resolve(root,'data'),resolve(out,'data'),{recursive:true});await cp(resolve(root,'vendor'),resolve(out,'vendor'),{recursive:true});
await writeFile(resolve(out,'package.json'),JSON.stringify({name:'sango-playtest',private:true,type:'module',scripts:{start:'node server.mjs'}}));
await writeFile(resolve(out,'README.txt'),'本包不含本地试玩美术、资源索引、用户目录或工具输出。运行 npm start。\n该构建步骤仅隔离本地美术，不代表武将数据、列传或其他内容已完成发布授权审核。\n');
console.log(out);
