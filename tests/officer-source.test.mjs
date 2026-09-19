import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProfileOverrides} from '../scripts/officer-source-lib.mjs';
import {OFFICER_BY_ID,OFFICER_CATALOG,searchOfficers} from '../officer-catalog.mjs';
import {relationshipInfo} from '../relationships.mjs';
import {makeOfficer} from '../engine.mjs';
import {GAME_RECORDS} from '../scripts/game-officer-table.mjs';

test('scenario profiles correct the public-library traits in runtime and exported rows',()=>{
 for(const [id,personality,righteousness] of [[99,3,5],[433,4,5],[636,3,5],[661,4,1],[290,2,5],[246,2,5]]){
  const u=makeOfficer('person-'+id),row=GAME_RECORDS.find(row=>row.id===u.id);
  assert.equal(u.personality,personality);assert.equal(u.righteousness,righteousness);
  assert.equal(row.personalityCode,personality);assert.equal(row.righteousnessCode,righteousness);
 }
 const guan=OFFICER_BY_ID['person-99'];
 assert.equal(guan.source.personality,4);assert.equal(guan.source.argumentation,1);
 assert.equal(guan.courtesy,'云长');
 assert.equal(GAME_RECORDS.find(row=>row.id===guan.id).righteousness,'不会背叛');
});

test('scenario relation IDs replace truncated library IDs without inventing genealogy officers',()=>{
 const huang=OFFICER_CATALOG.find(u=>u.name==='黄月英');
 assert.deepEqual(huang.source.SpouseList,[29]);assert.deepEqual(huang.relations.spouseIds,['person-290']);
 assert.equal(relationshipInfo(huang.id,'person-290').type,'spouse');
 const le=OFFICER_CATALOG.find(u=>u.source.Name==='乐綝');
 assert.equal(le.source.Father,7);assert.equal(le.relations.fatherId,'person-70');
 assert.equal(OFFICER_BY_ID.cao.profileSource.Father,2029);assert.equal(OFFICER_BY_ID.cao.relations.fatherId,null);
 assert.ok(searchOfficers({query:'乐綝'}).some(u=>u.id===le.id));
 assert.equal(OFFICER_CATALOG.filter(u=>u.profileSource.sex===-1).length,67);
 assert.ok(OFFICER_CATALOG.filter(u=>u.profileSource.sex===-1).every(u=>u.sex===null));
});

test('profile import uses array base values and never adopts live scenario state or colliding custom IDs',()=>{
 const library={1:{Id:1,Name:'甲',personality:4,argumentation:1,command:50,loyalty:100,BelongForce:2,Level:0}};
 const before=structuredClone(library);
 const {overrides}=buildProfileOverrides(library,{1:{Id:1,Name:'甲',personality:3,argumentation:5,command:[80,2],loyalty:12,BelongForce:9,Level:7},2:{Id:2,Name:'额外占位'}});
 assert.deepEqual(overrides,{'1':{personality:3,argumentation:5,command:80}});
 assert.deepEqual(library,before);
 const custom=OFFICER_BY_ID['custom-1'];assert.deepEqual(custom.profileSource,custom.source);assert.equal(custom.righteousness,0);
 assert.throws(()=>buildProfileOverrides(library,{}),/同编号/);
 assert.throws(()=>buildProfileOverrides(library,{1:{Id:1,personality:5}}),/性格编号/);
});
