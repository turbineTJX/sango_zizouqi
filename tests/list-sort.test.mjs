import test from 'node:test';
import assert from 'node:assert/strict';
import {sortRows} from '../list-sort.mjs';
import {searchOfficers} from '../officer-catalog.mjs';
test('display sorting is numeric, stable, missing-last and never changes source order',()=>{
 const rows=[{id:'a',n:1000},{id:'b',n:20},{id:'c',n:null},{id:'d',n:20}];
 const before=JSON.stringify(rows),value=(row,key)=>row[key];
 assert.deepEqual(sortRows(rows,'n','asc',value).map(r=>r.id),['b','d','a','c']);
 assert.deepEqual(sortRows(rows,'n','desc',value).map(r=>r.id),['a','b','d','c']);
 assert.equal(JSON.stringify(rows),before);
});
test('catalog sorts the entire filtered set before pagination in either direction',()=>{
 for(const direction of ['asc','desc']){
  const rows=searchOfficers({sort:'leadership',direction});
  for(let i=1;i<rows.length;i++)assert.ok((rows[i].leadership-rows[i-1].leadership)*(direction==='asc'?1:-1)>=0);
 }
});
