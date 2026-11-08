import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
await mkdir('vendor/pixi',{recursive:true});
const {version}=JSON.parse(await readFile('node_modules/pixi.js/package.json','utf8'));
if(version!=='8.22.0')throw Error('Unexpected PixiJS version');
await build({stdin:{contents:"import 'pixi.js/unsafe-eval'; export {WebGLRenderer,Container,Sprite,Texture,ImageSource,Rectangle,Graphics,RenderTexture,Matrix} from 'pixi.js';",resolveDir:process.cwd(),loader:'js'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'eof',outfile:'vendor/pixi/pixi.mjs'});
await copyFile('node_modules/pixi.js/LICENSE','vendor/pixi/LICENSE.txt');
await writeFile('vendor/pixi/README.md',`PixiJS ${version}, MIT. Rebuild with npm ci and node scripts/vendor-pixi.mjs.\nUpstream: https://github.com/pixijs/pixijs\n`);
