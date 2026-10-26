import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';

export function assertRuleSources(tables,sources,root,{entry='app.js'}={}){
 const fail=message=>{throw Error('规则来源校验：'+message);};
 if(Object.keys(sources).sort().join(',')!==tables.map(t=>t.id).sort().join(','))fail('底稿与实际来源目录不一致');
 const drafts=new Set(tables.map(t=>'data/design/'+t.id+'.mjs'));
 for(const t of tables){
  const paths=sources[t.id];if(!Array.isArray(paths)||!paths.length||new Set(paths).size!==paths.length)fail(t.id+'缺少唯一实际来源');
  for(const path of paths){const absolute=resolve(root,path),rel=relative(root,absolute);if(rel.startsWith('..')||drafts.has(path)||!existsSync(absolute))fail(t.id+'实际来源无效：'+path);}
  for(const record of t.records)if(!paths.includes(record.source))fail(t.id+'条目追溯来源未登记：'+record.source);
 }
 const visited=new Set();
 function visit(file){
  const path=relative(root,file).replaceAll('\\','/');if(visited.has(path))return;visited.add(path);
  if(drafts.has(path)||path==='data/design/pending-tables.mjs')fail('运行时误导入未接入底稿：'+path);
  const source=readFileSync(file,'utf8');
  for(const m of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)){
   if(!m[1].startsWith('.')||! /\.(?:mjs|js)$/.test(m[1]))continue;
   visit(resolve(dirname(file),m[1]));
  }
 }
 visit(resolve(root,entry));return visited.size;
}

export function readRuntimeVersions(root){
 const number=(file,pattern)=>{const m=readFileSync(resolve(root,file),'utf8').match(pattern);if(!m)throw Error('无法读取版本来源：'+file);return Number(m[1]);};
 return {
  rules:number('combat-rules.mjs',/RULES_VERSION\s*=\s*(\d+)/),
  campaign:number('strategic-campaign.mjs',/CAMPAIGN\s*=\s*Object\.freeze\(\{version:(\d+)/),
  ai:number('strategic-ai.mjs',/STRATEGIC_AI\s*=\s*Object\.freeze\(\{version:(\d+)/),
  strategy:number('data/design/strategic-planning-rules.mjs',/version:\s*(\d+)/),
  domestic:number('domestic.mjs',/s\.campaign\.domestic=\{version:(\d+)/),
 };
}
