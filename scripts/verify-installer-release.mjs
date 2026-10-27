import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {getPath7za} from 'app-builder-lib/out/toolsets/7zip.js';
import {listPackage} from '@electron/asar';
import {ROOT,sha256} from './release-lib.mjs';

if(!process.argv[2])throw Error('Pass the native release directory');
const directory=resolve(process.argv[2]),manifest=JSON.parse(await readFile(join(directory,'native-release.json'),'utf8')),artifact=manifest.artifacts.windowsInstaller;
assert.ok(artifact,'Windows installer is present in the release manifest');
const installer=join(directory,artifact.file),bytes=await readFile(installer);
assert.equal(bytes.subarray(0,2).toString(),'MZ');assert.equal(bytes.length,artifact.bytes);assert.equal(sha256(bytes),artifact.sha256);
const archive=await getPath7za(),out=join(process.env.SANGO_BUILD_ROOT?resolve(process.env.SANGO_BUILD_ROOT):ROOT,'.local','verify-installer-'+Date.now());await mkdir(out,{recursive:true});
const run=args=>execFileSync(archive,args,{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
const paths=run(['l','-slt',installer]).split(/\r?\n/).filter(line=>line.startsWith('Path = ')).map(line=>line.slice(7).replaceAll('\\','/'));
assert.ok(paths.includes('SangoSovereign.exe')&&paths.includes('resources/app.asar'),'installer contains the desktop application payload');
const unpacked=join(out,'application');run(['x',installer,'-o'+unpacked,'-y']);
for(const file of ['SangoSovereign.exe','resources/app.asar'])assert.equal(sha256(await readFile(join(unpacked,file))),sha256(await readFile(join(directory,'win-unpacked',file))),file+' matches the tested desktop build');
if(!manifest.codeOnly){
 assert.equal(manifest.art?.format,'directory');assert.ok(manifest.art.playtestFiles>0);
 for(const [file,entry]of Object.entries(manifest.art.files)){
  const packed=await readFile(join(unpacked,'resources/art',file));assert.equal(packed.length,entry.bytes);assert.equal(sha256(packed),entry.sha256,file);
  assert.equal(sha256(await readFile(join(directory,'win-unpacked/resources/art',file))),entry.sha256,file+' matches tested artwork');
 }
}
const names=listPackage(join(unpacked,'resources/app.asar')).map(path=>path.replaceAll('\\','/'));
assert.ok(names.includes('/code/game-data.bin'));assert.ok(!names.some(path=>/\/(?:data|assets|art|scripts|tests|\.local)\//.test(path)||path.endsWith('.map')));
await writeFile(join(directory,'installer-verification.json'),JSON.stringify({passed:true,file:artifact.file,sha256:artifact.sha256,artFiles:manifest.art?.files?Object.keys(manifest.art.files).length:0,checks:['installer hash and executable header','x64 application payload','same runtime and ASAR as tested desktop build','all declared artwork hashes and playtest source records','no source tables or production work directory']},null,2)+'\n');
console.log('Windows installer payload verified: '+installer);
