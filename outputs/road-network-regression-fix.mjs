import fs from 'node:fs';
let p='tests/campaign-info.test.mjs',s=fs.readFileSync(p,'utf8');const at=s.indexOf("test('current status follows");s=s.slice(0,at)+s.slice(at).replace("target:'chenliu',policy:'auto'","target:'luoyang',policy:'auto'");fs.writeFileSync(p,s);
p='app.js';s=fs.readFileSync(p,'utf8').replace('event.target.dataset.city||event.target.dataset.commandCity','event.target.dataset.junction||event.target.dataset.city||event.target.dataset.commandCity');fs.writeFileSync(p,s);
p='campaign-info-status.mjs';s=fs.readFileSync(p,'utf8').replace("a.travel?'沿道路行军':a.route.length?'待出发'", "a.travel||a.route.length&&mapNode(s,a.location)?.kind==='junction'?'沿道路行军':a.route.length?'待出发'");fs.writeFileSync(p,s);
