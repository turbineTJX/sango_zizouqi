import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {extractFile,listPackage} from '@electron/asar';
import {unzipSync} from 'fflate';
import {sha256} from './release-lib.mjs';

if(!process.argv[2])throw Error('Pass the native release directory');
const root=resolve(process.argv[2]),manifest=JSON.parse(await readFile(join(root,'native-release.json'),'utf8')),
 codeManifest=JSON.parse(await readFile(join(root,'code/release.json'),'utf8'));
assert.equal(manifest.codeOnly,true);assert.equal(Object.keys(manifest.artifacts).length,2);
for(const artifact of Object.values(manifest.artifacts))assert.equal(sha256(await readFile(join(root,artifact.file))),artifact.sha256);
const asar=join(root,'win-unpacked/resources/app.asar'),names=listPackage(asar).map(path=>path.replaceAll('\\','/'));
assert.ok(names.includes('/preload.cjs'));assert.ok(names.includes('/code/game-data.bin'));
assert.ok(!names.some(path=>/\/(?:data|assets|art|scripts|tests|\.local)\//.test(path)||path.endsWith('.map')));
const apk=await readFile(join(root,manifest.artifacts.android.file)),apkNames=[];
unzipSync(apk,{filter:file=>{apkNames.push(file.name);return false;}});
assert.ok(apkNames.includes('assets/public/game-data.bin'));
assert.ok(!apkNames.some(path=>/^assets\/public\/(?:data|assets|art|\.local)\//.test(path)||path.endsWith('.map')||/signing|\.p12$|\.keystore$/.test(path)));
const selected=unzipSync(apk,{filter:file=>['assets/public/game-data.bin','assets/public/app.js'].includes(file.name)});
const desktopData=extractFile(asar,'code/game-data.bin');
assert.equal(sha256(desktopData),codeManifest.data.sha256);assert.equal(sha256(selected['assets/public/game-data.bin']),codeManifest.data.sha256);
assert.equal(sha256(extractFile(asar,'code/app.js')),sha256(selected['assets/public/app.js']));
const result={passed:true,gameVersion:manifest.gameVersion,rulesVersion:manifest.rulesVersion,revision:manifest.revision,
 dataSha256:codeManifest.data.sha256,checks:['outer artifact hashes','Windows ASAR','Android APK binary data','identical program and tables on both platforms','no source tables, art or signing secrets']};
await writeFile(join(root,'contents-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
