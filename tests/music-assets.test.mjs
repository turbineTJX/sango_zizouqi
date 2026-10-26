import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {publicMusicURL,sanitizeMusicCatalog} from '../asset-catalog.mjs';
import {validateAssetPack,bundleAssetPack} from '../scripts/asset-pack.mjs';
import {buildArtArchive} from '../scripts/build-art-pack.mjs';
import {readAssetArchive} from '../asset-archive.mjs';
import {serveAssets} from '../asset-server.mjs';

test('music URLs and loop metadata reject traversal, external audio and invalid intervals',()=>{
 for(const url of ['https://x/track.ogg','./assets/../track.ogg','./assets/.hidden/track.ogg','./assets/music/x.ogg?x','./assets/music/x.sf2'])assert.equal(publicMusicURL(url),null);
 const entry={url:'./assets/music/war.ogg',loopStart:0,loopEnd:80};assert.deepEqual(sanitizeMusicCatalog({battle:entry}),{battle:entry});
 for(const patch of [{loopStart:-1},{loopEnd:0},{loopStart:81},{loopEnd:NaN}])assert.deepEqual(sanitizeMusicCatalog({battle:{...entry,...patch}}),{});
});
test('music, loop metadata and credits survive an independent asset archive; production SoundFonts stay private',async t=>{
 const base=resolve(tmpdir()),dir=await mkdtemp(join(base,'sango-music-'));t.after(()=>{assert.equal(dirname(resolve(dir)),base);assert.ok(basename(dir).startsWith('sango-music-'));return rm(dir,{recursive:true,force:true});});
 const source=join(dir,'source'),target=join(dir,'pack'),clip=Buffer.from('OggS-test-audio'),sha256=createHash('sha256').update(clip).digest('hex');
 await mkdir(join(source,'music'),{recursive:true});await writeFile(join(source,'music/war.ogg'),clip);await writeFile(join(source,'music/credits.json'),'{}');await writeFile(join(source,'music/private.sf2'),'private');
 const raw={version:1,id:'music-fixture',revision:'1',musicCredits:'./assets/music/credits.json',music:{battle:{url:'./assets/music/war.ogg',loopStart:0,loopEnd:80,sha256}},town:{}};
 await writeFile(join(source,'manifest.json'),JSON.stringify(raw));const bundle=await bundleAssetPack(join(dir,'loose'),source);assert.equal(bundle.files.size,2);
 await buildArtArchive(join(target,'art.pack'),source);const packed=await readAssetArchive(target);assert.deepEqual([...packed.files.keys()].sort(),['manifest.json','music/credits.json','music/war.ogg']);
 assert.deepEqual(JSON.parse(Buffer.from(packed.files.get('manifest.json')).toString()).music,raw.music);
 let status,headers,body;await serveAssets('/assets/music/war.ogg',{writeHead(s,h){status=s;headers=h;},end(b){body=b;}},target);
 assert.equal(status,200);assert.equal(headers['Content-Type'],'audio/ogg');assert.deepEqual(Buffer.from(body),clip);
 await writeFile(join(source,'music/war.ogg'),'tampered');await assert.rejects(validateAssetPack(source),/hash mismatch/);
});
