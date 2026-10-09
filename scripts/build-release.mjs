import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildArtArchive} from './build-art-pack.mjs';
import {buildCodeRelease} from './release-lib.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// A new directory on each run avoids carrying stale local assets into a build.
const release=resolve(root,'dist','release-'+Date.now()),out=resolve(release,'code');await mkdir(out,{recursive:true});
const {manifest}=await buildCodeRelease(out);
if(!process.argv.includes('--code-only')){
 const art=await buildArtArchive(resolve(release,'art','art.pack'));
 await mkdir(resolve(out,'.local'),{recursive:true});
 await writeFile(resolve(out,'.local/assets.json'),JSON.stringify({root:'../art'},null,2)+'\n');
 manifest.codeOnly=false;manifest.art={formatVersion:art.formatVersion,id:art.id,revision:art.revision,bytes:art.bytes,sha256:art.sha256};
 await writeFile(resolve(out,'release.json'),JSON.stringify(manifest,null,2)+'\n');
}
await writeFile(resolve(release,'README.txt'),'三国 · 君临 '+manifest.gameVersion+'，规则 '+manifest.rulesVersion+'\ncode 为合并后的主程序；game-data.bin 是版本化 MessagePack 二进制数据包，程序启动时校验版本和 SHA-256。\n在 code 目录双击 start-game.cmd 或运行 npm start；此代码包入口需要 Node.js 20 以上，EXE/APK 使用独立原生打包入口。\nart/art.pack 为可独立替换的资源封包，仅代码发行可用 SANGO_ASSET_ROOT 指向另行交付的 art 目录。素材包只包含公开清单引用的文件，不含候选、生产队列、身份参考或外部试玩资源。\n');
console.log(release);
