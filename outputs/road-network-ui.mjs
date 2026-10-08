import fs from 'node:fs';
const edit=(f,fn)=>{const s=fs.readFileSync(f,'utf8').replaceAll('\r\n','\n');fs.writeFileSync(f,fn(s))};
const rep=(s,a,b)=>{if(!s.includes(a))throw Error('missing '+a);return s.replace(a,b)};
edit('officer-fates.mjs',s=>rep(s,'new Map(s.cities.map(c=>[c.id,[]]))','new Map(mapNodes(s).map(c=>[c.id,[]]))'));
for(const f of ['strategic-view.mjs','strategic-army-markers.mjs','strategic-roster.mjs','campaign-info-status.mjs'])edit(f,s=>"import {mapNode} from './road-network.mjs';\n"+s.replaceAll('s.cities.find(c=>c.id===id)','mapNode(s,id)').replaceAll('s.cities.find(c=>c.id===a.travel.from)','mapNode(s,a.travel.from)').replaceAll('s.cities.find(c=>c.id===a.travel.to)','mapNode(s,a.travel.to)').replaceAll('s.cities.find(c=>c.id===a.location)','mapNode(s,a.location)'));
edit('national-map-view.mjs',s=>"import {renderJunctions} from './road-network.mjs';\n"+rep(s,'${renderRoads(s)}','${renderRoads(s)}${renderJunctions(s)}'));
edit('strategic-command.mjs',s=>{
 s=rep(s,'eligible=s.cities.filter','eligible=(p.task===\'transfer\'?s.cities:mapNodes(s)).filter');
 s=rep(s,".replaceAll('data-city=',", ".replaceAll('data-junction=','data-command-city=').replaceAll('data-city=',");
 s=rep(s,'请选择据点</option>','请选择据点或路口</option>');
 s=rep(s,'${FACTIONS[x.owner].name}</option>','${x.kind===\'junction\'?\'野外路口\':FACTIONS[x.owner].name}</option>');
 s=rep(s,'${destination?`<h3>','${destination?.kind===\'junction\'?`<h3>${esc(destination.name)}</h3><p>野外路口 · 可停驻、转向。驻军可拦截经过的运输队并截断此处粮道；没有城防与本地产出。</p>`:destination?`<h3>');
 s=rep(s,'点选城池后查看路线与当地情报。','点选据点或路口查看路线；可先到路口，再沿横向小路迂回。');
 return s;
});
edit('app.js',s=>{
 s="import {mapNode} from './road-network.mjs';\n"+s;
 s=rep(s,"c=state.cities.find(c=>c.id===id);if(p.task==='transfer'", "c=mapNode(state,id);if(p.task==='transfer'");
 const marker="  const target=event.target.closest('[data-command-city]');";
 s=rep(s,marker,`  const junction=event.target.closest('[data-junction]');
  if(junction){const n=mapNode(state,junction.dataset.junction);toast(n.name+'：在调动军团的目的地步骤点选此路口，可驻守或绕行。');return;}
`+marker);
 return s;
});
edit('strategic.css',s=>s+'\n.strategy-junction{cursor:pointer;pointer-events:all}.strategy-junction circle{fill:#f2dfac;stroke:#665036;stroke-width:2}.strategy-junction:hover circle,.strategy-junction:focus circle{fill:#fff;stroke:#ba742d;stroke-width:3}\n');
