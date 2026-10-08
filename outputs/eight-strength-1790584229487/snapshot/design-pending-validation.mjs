import {existsSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';

// Design-only validation: pending rows must never be treated as runtime rules.
export function assertPendingDesignTables(tables,catalog,root){
 const seen=new Set();
 const fail=(path,message)=>{throw new Error(`待接入设计表 ${path}：${message}`);};
 const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const json=(v,path)=>{if(typeof v==='number'&&!Number.isFinite(v))fail(path,'数值必须有限');if(v===undefined||typeof v==='function'||typeof v==='symbol'||typeof v==='bigint')fail(path,'必须为可序列化设计值');if(v&&typeof v==='object')for(const [k,x] of Object.entries(v))json(x,path+'.'+k);};
 for(const t of tables){
  if(!t.id||seen.has(t.id))fail(t.id,'表ID缺失或重复');seen.add(t.id);
  if(t.schemaVersion!==1||t.integration!=='pending'||!t.name||!t.description)fail(t.id,'版本、接入状态或说明无效');
  if(!Array.isArray(t.records)||!t.records.length)fail(t.id,'条目不可为空');
  const ids=new Set();
  for(const r of t.records){
   const p=t.id+'.'+r.id;
   if(!r.id||ids.has(r.id)||!r.name||!plain(r.parameters)||typeof r.todo!=='string')fail(p,'条目字段缺失或ID重复');ids.add(r.id);json(r.parameters,p);
   if(typeof r.source!=='string')fail(p,'缺少追溯来源');
   const target=resolve(root,r.source),rel=relative(root,target);
   if(rel.startsWith('..')||isAbsolute(rel)||!existsSync(target))fail(p,'当前实现来源不存在或越出项目：'+r.source);
   if(t.id==='city-links'&&(!catalog.cities.some(c=>c.id===r.id)||(r.parameters.parentId&&!catalog.cities.some(c=>c.id===r.parameters.parentId))))fail(p,'据点引用不存在');
   if(t.id==='technologies'&&!catalog.troops[r.parameters.troopId])fail(p,'兵种引用不存在');
   if(t.id==='domestic-decision-rules'&&!catalog.domesticActions[r.parameters.actionId])fail(p,'动作引用不存在');
   if(t.id==='building-effects'&&!catalog.buildings[r.id])fail(p,'建筑引用不存在');
  }
 }
}
