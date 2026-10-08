import fs from 'node:fs';
let p='national-map-view.mjs',s=fs.readFileSync(p,'utf8');s=s.replace('35 港 · 23 路口','35 港 · ${s.junctions?.length||0} 路口').replace('renderJunctions(s)','renderJunctions(s,ui.city)');fs.writeFileSync(p,s);
p='strategic.css';s=fs.readFileSync(p,'utf8').replace('.strategy-junction:hover circle,','.strategy-junction.selected circle,.strategy-junction:hover circle,');fs.writeFileSync(p,s);
p='strategic-campaign.mjs';s=fs.readFileSync(p,'utf8').replace("r=>r.kind==='siege'&&r.cityId===destination","r=>r.cityId===destination&&(r.kind==='siege'||isJunction(s,destination)&&r.kind==='field'&&r.armies.every(a=>!a.travel))").replace("a.task='围城外待命'","a.task=isJunction(s,destination)?'路口交战，外围待命':'围城外待命'");fs.writeFileSync(p,s);
