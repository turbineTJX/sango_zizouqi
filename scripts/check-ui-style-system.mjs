import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
const [tokens,theme,html,guide]=await Promise.all(['ui-tokens.css','ui-theme.css','index.html','docs/ui-style-guide.html'].map(read));
const definitions=new Set([...tokens.matchAll(/(--ui-[\w-]+)\s*:/g)].map(m=>m[1]));
for(const [name,source]of [['tokens',tokens],['theme',theme],['guide',guide]]){
 for(const [,variable]of source.matchAll(/var\((--ui-[\w-]+)/g))assert.ok(definitions.has(variable),`${name}: undefined token ${variable}`);
}
assert.doesNotMatch(theme,/#[\da-f]{3,8}\b/i,'Shared component colors belong in ui-tokens.css.');
assert.doesNotMatch(theme,/!important/,'Resolve component ownership instead of adding !important.');
const sheets=[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(m=>m[1].replace(/^\.\//,''));
assert.equal(sheets[0],'ui-tokens.css','Tokens must be the first stylesheet.');
assert.equal(sheets.at(-1),'ui-theme.css','The shared theme must be the final stylesheet.');
assert.ok(guide.includes('../ui-tokens.css')&&guide.includes('../ui-theme.css'),'Gallery must use the runtime sources.');
const root=await read('source-offline-files.js');
assert.ok(root.includes('ui-tokens.css')&&root.includes('ui-theme.css'),'Regenerate the offline dependency manifest.');
assert.ok(root.includes('ui-materials/ink-grain.svg'),'The shared material must be available offline.');
for(const file of ['ui-materials/cloud-jade-frame.png','ui-materials/ink-silk-panel.png'])assert.ok(root.includes(file),`${file} must be available offline.`);
for(const file of ['ui-fonts/font-face.css','ui-fonts/noto-serif-sc.woff2'])assert.ok(root.includes(file),`${file} must be available offline.`);
console.log(`UI design contract passed: ${definitions.size} shared tokens, no independent component palette, shared live gallery, runtime and offline dependencies.`);
