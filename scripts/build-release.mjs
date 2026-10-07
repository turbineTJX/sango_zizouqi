import {mkdir,readdir,copyFile,cp,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {readFile} from 'node:fs/promises';
import {assetURL} from '../art-assets.mjs';
import {fileURLToPath} from 'node:url';
import {TOWN_ART,TOWN_TERRAINS,TOWN_FOUNDATIONS} from '../town-art.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// A new directory on each run avoids carrying stale local assets into a build.
const out=resolve(root,'dist','release-'+Date.now());await mkdir(out,{recursive:true});
for(const file of await readdir(root))if(/\.(mjs|js|css|html|svg|webmanifest)$/.test(file))await copyFile(resolve(root,file),resolve(out,file));
await cp(resolve(root,'data'),resolve(out,'data'),{recursive:true});await cp(resolve(root,'vendor'),resolve(out,'vendor'),{recursive:true});
await mkdir(resolve(out,'assets','town'),{recursive:true});
for(const path of [...Object.values(TOWN_ART),...Object.values(TOWN_TERRAINS),...Object.values(TOWN_FOUNDATIONS)])await copyFile(resolve(root,path),resolve(out,path));
const officerManifest=JSON.parse(await readFile(resolve(root,'assets/officers/manifest.json'),'utf8'));
for(const scenes of Object.values(officerManifest.officers||{}))for(const entry of Object.values(scenes)){
 if(!assetURL(entry.url)||!entry.url.startsWith('./assets/officers/generated/'))throw Error('Invalid officer art path in release manifest');
 const target=resolve(out,entry.url);await mkdir(dirname(target),{recursive:true});await copyFile(resolve(root,entry.url),target);
}
await copyFile(resolve(root,'assets/officers/manifest.json'),resolve(out,'assets/officers/manifest.json'));
await writeFile(resolve(out,'package.json'),JSON.stringify({name:'sango-playtest',private:true,type:'module',scripts:{start:'node server.mjs'}}));
await writeFile(resolve(out,'README.txt'),'本包包含原创城镇和武将场景图像与运行时清单；不含外部试玩美术、私有资源索引、用户目录或工具输出。运行 npm start。\n该构建步骤仅隔离外部试玩美术，不代表武将数据、列传或其他内容已完成发布授权审核。\n');
console.log(out);
