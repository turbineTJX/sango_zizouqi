import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from '../strategic-campaign.mjs';
import {inheritMetropolitanTopology,metropolitanCenter,metropolitanMembers,constructionSiteAvailable} from '../metropolitan-areas.mjs';
import {withReadQueries} from '../read-query-scope.mjs';
import {localContact} from '../talent-core.mjs';
import {adjacentCityPath} from '../road-network.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';

test('roster previews reuse metropolitan geometry while keeping their own live city objects',()=>{
 const s=newCampaign(217,'guandu-200'),clone=()=>({...s,cities:s.cities.map(c=>({...c,owner:c.owner==='cao'?'yuan':c.owner,units:[]}))}),view=clone(),plain=clone();
 inheritMetropolitanTopology(s,view);
 for(const c of view.cities){
  const expected=plain.cities.find(n=>n.id===c.id);
  assert.equal(metropolitanCenter(view,c).id,metropolitanCenter(plain,expected).id);
  assert.deepEqual(metropolitanMembers(view,c).map(n=>[n.id,n.owner]),metropolitanMembers(plain,expected).map(n=>[n.id,n.owner]));
  for(const n of metropolitanMembers(view,c)){assert.equal(n,view.cities.find(v=>v.id===n.id)||view.junctions.find(v=>v.id===n.id));assert.equal(constructionSiteAvailable(view,c,n.id),constructionSiteAvailable(plain,expected,n.id));}
 }
});

test('a preview with changed center sizes falls back to its own metropolitan calculation',()=>{
 const s=newCampaign(217,'guandu-200'),center=s.cities.find(c=>c.citySize==='large'),clone=()=>({...s,cities:s.cities.map(c=>({...c,citySize:c.id===center.id?'small':c.citySize}))}),view=clone(),plain=clone();
 inheritMetropolitanTopology(s,view);
 for(const c of view.cities)assert.equal(metropolitanCenter(view,c).id,metropolitanCenter(plain,plain.cities.find(n=>n.id===c.id)).id);
});

test('contact queries separate worlds and expire before a new blockade or exception',()=>{
 const s=newCampaign(217,'guandu-200'),enemy=fieldFromCity(s,'ye'),path=adjacentCityPath(s,'xuchang','chenliu');assert.ok(path);
 assert.equal(withReadQueries(()=>localContact(s,'xuchang','chenliu')),true);
 enemy.travel={from:'xuchang',to:path[0],road:'main',progress:1};
 withReadQueries(()=>{assert.equal(localContact(s,'xuchang','chenliu'),false);assert.equal(localContact({...s,armies:[]},'xuchang','chenliu'),true);});
 assert.throws(()=>withReadQueries(()=>{localContact(s,'xuchang','chenliu');throw Error('closed');}),/closed/);
 enemy.travel=null;assert.equal(localContact(s,'xuchang','chenliu'),true);
});
