import {mkdir,readdir,copyFile,cp,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundleAssetPack} from './asset-pack.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// A new directory on each run avoids carrying stale local assets into a build.
const release=resolve(root,'dist','release-'+Date.now()),out=resolve(release,'code');await mkdir(out,{recursive:true});
for(const file of await readdir(root))if(/\.(mjs|js|css|html|svg|webmanifest)$/.test(file))await copyFile(resolve(root,file),resolve(out,file));
await cp(resolve(root,'data'),resolve(out,'data'),{recursive:true});await cp(resolve(root,'vendor'),resolve(out,'vendor'),{recursive:true});
if(!process.argv.includes('--code-only')){
 await bundleAssetPack(resolve(release,'art'));
 await mkdir(resolve(out,'.local'),{recursive:true});
 await writeFile(resolve(out,'.local/assets.json'),JSON.stringify({root:'../art'},null,2)+'\n');
}
await writeFile(resolve(out,'package.json'),JSON.stringify({name:'sango-playtest',private:true,type:'module',scripts:{start:'node server.mjs'}}));
await writeFile(resolve(release,'README.txt'),'code 为主程序，art 为可独立替换的素材包。在 code 目录运行 npm start。仅代码发行可用 SANGO_ASSET_ROOT 指向另行交付的素材包。\n素材包只包含公开清单引用的城镇和已审阅武将图像，不含候选、生产队列、身份参考或外部试玩资源。\n该构建步骤不代表武将数据、列传或其他内容已完成发布授权审核。\n');
console.log(release);
