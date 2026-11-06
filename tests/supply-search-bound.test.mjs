import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,supplyConnection,CAMPAIGN} from '../strategic-campaign.mjs';
import {roadCost} from '../strategic-movement.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';

test('bounded depot search matches an independent all-pairs distance oracle across mixed warehouses',()=>{
 const s=newCampaign(217,'guandu-200'),a=fieldFromCity(s,'xuchang'),template=s.cities[0];
 s.armies=[a];s.junctions=[];s.campaign.battles=[];a.location='depot-0';a.travel=null;
 for(let seed=1;seed<=64;seed++){
  let state=seed;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
  s.cities=Array.from({length:8},(_,i)=>({...template,id:'depot-'+i,owner:'cao',grain:random()%4?10000:0,granary:random()%7,units:[]}));
  s.roads=[];s.roadSegments={};const edges=new Set(),add=(i,j)=>{const ids=['depot-'+i,'depot-'+j],key=[...ids].sort().join(':');if(edges.has(key))return;edges.add(key);s.roads.push(ids);s.roadSegments[key]={distance:1+random()%250,terrain:'land'};};
  for(let i=0;i<8;i++)add(i,(i+1)%8);for(let i=0;i<8;i++)for(let j=i+2;j<8;j++)if(random()%4===0)add(i,j);
  const distance=Array.from({length:8},(_,i)=>Array.from({length:8},(_,j)=>i===j?0:Infinity));
  for(const [from,to]of s.roads){const i=Number(from.slice(6)),j=Number(to.slice(6));distance[i][j]=distance[j][i]=roadCost(s,from,to,'auto');}
  for(let k=0;k<8;k++)for(let i=0;i<8;i++)for(let j=0;j<8;j++)distance[i][j]=Math.min(distance[i][j],distance[i][k]+distance[k][j]);
  const expected=s.cities.map((c,i)=>({source:c.id,distance:distance[i][0],rate:Math.max(30,Math.floor((240+c.granary*120)/(1+distance[i][0]/90))),grain:c.grain})).filter(c=>c.grain>0&&c.distance<=CAMPAIGN.supplyRange).sort((a,b)=>b.rate-a.rate||a.source.localeCompare(b.source))[0];
  const actual=supplyConnection(s,a);
  if(!expected)assert.equal(actual,null,'seed '+seed);else assert.deepEqual({source:actual.source,distance:actual.distance,rate:actual.rate},{source:expected.source,distance:expected.distance,rate:expected.rate},'seed '+seed);
 }
});
