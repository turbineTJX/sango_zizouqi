import test from 'node:test';
import assert from 'node:assert/strict';
import {openSaveStorage} from '../save-storage.mjs';
function legacy(){const data=new Map([['sango-sovereign-v2','original bytes'],['sango-audio-v1','preferences']]);return {data,get length(){return data.size;},key:i=>[...data.keys()][i],getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
test('unavailable durable storage keeps the existing source and never reports a write as saved',async()=>{
 const source=legacy(),store=await openSaveStorage({indexedDB:{open(){throw new Error('disabled');}},legacy:source});
 assert.equal(store.available,false);assert.equal(store.peek('sango-sovereign-v2'),'original bytes');assert.equal(await store.getItem('sango-sovereign-v2'),'original bytes');
 await assert.rejects(store.setItem('sango-sovereign-v2','unsaved bytes'),/disabled/);assert.equal(store.peek('sango-sovereign-v2'),'original bytes');assert.equal(source.getItem('sango-sovereign-v2'),'original bytes');
 await assert.rejects(store.removeItem('sango-sovereign-v2'));assert.equal(source.getItem('sango-sovereign-v2'),'original bytes');assert.deepEqual(await store.keys(),['sango-sovereign-v2']);
});
test('the save boundary cannot write or delete unrelated browser preferences',async()=>{
 const source=legacy(),store=await openSaveStorage({indexedDB:{open(){throw new Error('disabled');}},legacy:source});
 await assert.rejects(store.setItem('sango-audio-v1','changed'),/无效存档/);await assert.rejects(store.removeItem('sango-audio-v1'),/无效存档/);assert.equal(source.getItem('sango-audio-v1'),'preferences');
});
