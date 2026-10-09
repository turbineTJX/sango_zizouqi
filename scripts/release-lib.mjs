import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {encode} from '@msgpack/msgpack';
import {RULES_VERSION} from '../combat-rules.mjs';
import {DATA_TABLES} from '../packaging/data-tables.mjs';
import {DATA_MAGIC,DATA_PACK_VERSION,DATA_HEADER_SIZE,MAX_DATA_BYTES,decodeDataPack} from '../packaging/data-pack.mjs';

export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const plain=(value,path)=>{
 if(value===null||['string','boolean'].includes(typeof value))return;
 if(typeof value==='number'&&Number.isFinite(value)&&!Object.is(value,-0))return;
 if(Array.isArray(value)){value.forEach((entry,i)=>plain(entry,path+'.'+i));return;}
 if(value&&Object.getPrototypeOf(value)===Object.prototype){for(const [key,entry] of Object.entries(value))plain(entry,path+'.'+key);return;}
 throw Error('Non-literal data must remain executable code: '+path);
};

export async function createGameData(){
 const {version:gameVersion}=JSON.parse(await readFile(resolve(ROOT,'package.json'),'utf8'));
 const tables={},sources={};
 for(const [id,path] of Object.entries(DATA_TABLES)){
  tables[id]={...await import(pathToFileURL(resolve(ROOT,path)).href)};
  plain(tables[id],id);sources[path]=sha256(await readFile(resolve(ROOT,path)));
 }
 const revision=sha256(encode({gameVersion,rulesVersion:RULES_VERSION,sources,tables}));
 const metadata={formatVersion:DATA_PACK_VERSION,gameVersion,rulesVersion:RULES_VERSION,revision};
 const raw=encode({...metadata,tables}),payload=gzipSync(raw,{level:9});
 if(raw.length>MAX_DATA_BYTES)throw Error('Game data exceeds the runtime limit');
 const bytes=Buffer.alloc(DATA_HEADER_SIZE+payload.length);bytes.set(DATA_MAGIC);
 bytes.writeUInt32LE(DATA_PACK_VERSION,8);bytes.writeUInt32LE(raw.length,12);bytes.writeUInt32LE(payload.length,16);bytes.set(payload,DATA_HEADER_SIZE);
 // Fail the build if encoding changed any table value.
 const {isDeepStrictEqual}=await import('node:util');
 if(!isDeepStrictEqual(decodeDataPack(bytes,metadata).tables,tables))throw Error('Binary data round trip changed game tables');
 return {bytes,tables,metadata:{...metadata,sha256:sha256(bytes),bytes:bytes.length,decodedBytes:raw.length},sources};
}

export function packedDataPlugin(pack){
 const byPath=new Map(Object.entries(DATA_TABLES).map(([id,path])=>[resolve(ROOT,path).toLowerCase(),id]));
 return {name:'sango-binary-tables',setup(builder){
  builder.onResolve({filter:/^sango:packed-root$/},()=>({path:'root',namespace:'packed-root'}));
  builder.onLoad({filter:/.*/,namespace:'packed-root'},()=>({
   contents:`import {loadDataPack} from ${JSON.stringify(resolve(ROOT,'packaging/data-pack.mjs'))}; export const tables=await loadDataPack(new URL('./game-data.bin',import.meta.url),${JSON.stringify(pack.metadata)});`,
   resolveDir:ROOT,loader:'js'
  }));
  builder.onResolve({filter:/\.mjs$/},args=>{
   const id=byPath.get(resolve(args.resolveDir,args.path).toLowerCase());
   return id?{path:id,namespace:'packed-table'}:null;
  });
  builder.onLoad({filter:/.*/,namespace:'packed-table'},args=>({
   contents:`import {tables} from 'sango:packed-root';\n`+Object.keys(pack.tables[args.path]).map(name=>`export const ${name}=tables[${JSON.stringify(args.path)}][${JSON.stringify(name)}];`).join('\n'),loader:'js'
  }));
 }};
}

export async function bundleBrowser(pack,options={}){
 return build({entryPoints:[resolve(ROOT,'app.js')],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,
  sourcemap:false,legalComments:'external',alias:{three:resolve(ROOT,'vendor/three/three.module.js')},
  plugins:[packedDataPlugin(pack)],...options});
}

export async function buildCodeRelease(out){
 await mkdir(out,{recursive:true});const pack=await createGameData();
 await writeFile(resolve(out,'game-data.bin'),pack.bytes);
 await bundleBrowser(pack,{outfile:resolve(out,'app.js'),metafile:true});
 const original=await readFile(resolve(ROOT,'index.html'),'utf8');
 const styles=[...original.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map(match=>match[1]);
 await build({stdin:{contents:styles.map(path=>`@import ${JSON.stringify(path)};`).join('\n'),resolveDir:ROOT,loader:'css'},
  bundle:true,minify:true,outfile:resolve(out,'app.css'),loader:{'.svg':'file'},assetNames:'[name]',legalComments:'external'});
 let html=original.replace(/\s*<link[^>]*rel="stylesheet"[^>]*>/g,'').replace(/\s*<script type="importmap">.*?<\/script>/s,'');
 html=html.replace('</head>','<link rel="stylesheet" href="./app.css">\n</head>').replace('src="./app.js"','src="./bootstrap.js"');
 html=html.replace('<div id="app"></div>','<div id="app" role="status">正在载入游戏…</div>');
 await writeFile(resolve(out,'index.html'),html);
 await writeFile(resolve(out,'bootstrap.js'),`import('./app.js').catch(error=>{console.error(error);const root=document.getElementById('app');root.textContent='游戏文件缺失、损坏或版本不一致，请重新安装。已有存档仍保留。';const button=document.createElement('button');button.textContent='重试';button.onclick=()=>location.reload();root.append(document.createElement('br'),button);});\n`);
 for(const path of ['icon.svg','landscape-scroll.svg','manifest.webmanifest'])await copyFile(resolve(ROOT,path),resolve(out,path));
 await build({entryPoints:[resolve(ROOT,'server.mjs')],bundle:true,platform:'node',format:'esm',target:'node20',minify:true,
  outfile:resolve(out,'server.mjs'),legalComments:'external'});
 const serverPackage={name:'sango-playtest',version:pack.metadata.gameVersion,private:true,type:'module',scripts:{start:'node server.mjs --open'}};
 await writeFile(resolve(out,'package.json'),JSON.stringify(serverPackage,null,2)+'\n');
 await copyFile(resolve(ROOT,'start-game.cmd'),resolve(out,'start-game.cmd'));
 await mkdir(resolve(out,'licenses'),{recursive:true});
 for(const [name,path] of Object.entries({three:'vendor/three/LICENSE.txt',messagepack:'node_modules/@msgpack/msgpack/LICENSE',fflate:'node_modules/fflate/LICENSE',
  capacitor:'node_modules/@capacitor/core/LICENSE',capacitorAndroid:'node_modules/@capacitor/android/LICENSE',
  capacitorApp:'node_modules/@capacitor/app/LICENSE',capacitorFilesystem:'node_modules/@capacitor/filesystem/LICENSE',capacitorShare:'node_modules/@capacitor/share/LICENSE'}))await copyFile(resolve(ROOT,path),resolve(out,'licenses',name+'.txt'));
 try{await copyFile(resolve(out,'app.js.LEGAL.txt'),resolve(out,'licenses','bundled-code.txt'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const {readdir}=await import('node:fs/promises');
 const files={};for(const file of (await readdir(out)).sort())if(!['release.json','package.json','sw.js','start-game.cmd'].includes(file)&&!file.startsWith('.')&&!file.includes('server')&&!file.endsWith('.LEGAL.txt')&&!file.includes('licenses')){
  const bytes=await readFile(resolve(out,file));files[file]={bytes:bytes.length,sha256:sha256(bytes)};
 }
 const revision=sha256(JSON.stringify(files));
 const sw=`const CACHE='sango-release-${revision}';const FILES=${JSON.stringify(['./',...Object.keys(files).map(file=>'./'+file),'./release.json'])};self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('sango-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin||/\\/(?:assets|local-art)\\//.test(new URL(event.request.url).pathname))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});\n`;
 await writeFile(resolve(out,'sw.js'),sw);
 const manifest={formatVersion:1,gameVersion:pack.metadata.gameVersion,rulesVersion:RULES_VERSION,revision,codeOnly:true,data:pack.metadata,files};
 await writeFile(resolve(out,'release.json'),JSON.stringify(manifest,null,2)+'\n');
 return {pack,manifest};
}
