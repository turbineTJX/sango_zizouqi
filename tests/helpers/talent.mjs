import {willingness} from '../../talent-core.mjs';
import {discoverTalent} from '../../talent-lifecycle.mjs';
import {setRelationshipType} from '../../relationships.mjs';
// A scenario with an explicitly willing, known candidate. It still uses normal
// paid scheduling, all four outcome tiers, and the production project resolver.
export function readyTalent(s,cityId='xuchang',faction='cao'){
 const pool=s.campaign.domestic.people.filter(p=>p.status==='FREE'&&!p.travel);
 pool.sort((a,b)=>willingness(s,b.id,faction).W-willingness(s,a.id,faction).W||a.id.localeCompare(b.id));
 const p=pool[0];p.cityId=cityId;
 if(willingness(s,p.id,faction).W<60){setRelationshipType(s,p.id,faction==='cao'?'cao':'shao','sworn',100);const friend=s.campaign.idle.find(o=>o.faction===faction);if(friend)setRelationshipType(s,p.id,friend.unit.id,'sworn',100);}
 const r=s.campaign.talent.records[p.id];r.phase='SEEK';r.phaseUntilDay=s.campaign.day+1000;r.hardWaitUntilDay=0;
 discoverTalent(s,p.id,faction);
 if(willingness(s,p.id,faction).W<60)throw new Error('Fixture has no willing talent');
 return p;
}
