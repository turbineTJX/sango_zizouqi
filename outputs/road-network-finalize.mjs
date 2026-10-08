import fs from 'node:fs';
const list={'strategic-orders.mjs':'mapNode','strategic-command.mjs':'mapNode,mapNodes','personnel-movement.mjs':'mapNode,mapNodes,isJunction','officer-fates.mjs':'mapNode,mapNodes','officer-missions.mjs':'mapNode,mapNodes'};
for(const [p,names]of Object.entries(list)){const s=fs.readFileSync(p,'utf8').replace('mapNode,mapNodes,isJunction,junctionBlocked',names);fs.writeFileSync(p,s);}
let p='AGENTS.md',s=fs.readFileSync(p,'utf8');s+='\n## 大地图岔路（用户确认方向）\n\n- 道路不应只有据点到据点；增加可实际转向、停驻的野外路口和横向小路，为绕后与截断粮道提供空间。\n- 野外路口不作为城市，不提供城防或资源；军团、运输队与补给共用实际路网和拦截规则。\n- 当前全国路网设计与验证见 `docs/野外路口与横向小路-2026-09-22.md`，设计源为 `data/design/road-network.mjs`。\n';fs.writeFileSync(p,s);
p='tests/design-strategy.test.mjs';s=fs.readFileSync(p,'utf8').replace("  [d=>d.roads.push", "  [d=>d.roadNetwork.trailCost=0,'小路代价'],\n  [d=>d.roadNetwork.bypasses.push([...d.roadNetwork.bypasses[0]]),'重复小路'],\n  [d=>d.roadNetwork.bypasses[0][1]='missing-city','引用的官道不存在'],\n  [d=>d.roads.push");fs.writeFileSync(p,s);
p='tests/road-network.test.mjs';s=fs.readFileSync(p,'utf8').replace("import {advancePersonnel}","import {advancePersonnel,transportEnemy}");s+=`
test('convoys meet enemies arriving from another branch only after their arrival time',()=>{
 const s=world(),next=mid('xuchang','chenliu'),other=mid('xuchang','runan'),o={location:'xuchang',faction:'cao'};
 const traffic=[{faction:'yuan',location:other,edge:{from:other,to:next,road:'main',p0:0,p1:1,until:.2}}];
 assert.equal(transportEnemy(s,o,next,0,1,0,.15,traffic),undefined);
 assert.equal(transportEnemy(s,o,next,0,1,0,.4,traffic)?.faction,'yuan');
});
`;fs.writeFileSync(p,s);
