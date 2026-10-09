import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {PAGE_GUIDES} from '../page-guides.mjs';
import {PLAYER_AI_DECISIONS,NON_DECISION_PAGES} from '../player-ai-decisions.mjs';

const covered=new Set(Object.keys(NON_DECISION_PAGES)),errors=[];
for(const [id,c]of Object.entries(PLAYER_AI_DECISIONS)){
 for(const p of c.pages){if(!PAGE_GUIDES[p]||NON_DECISION_PAGES[p])errors.push(id+': invalid page '+p);covered.add(p);}
 for(const [file,name]of [...c.shared,...c.ai])if(typeof (await import('../'+file))[name]!=='function')errors.push(id+': missing '+file+' / '+name);
}
for(const id of Object.keys(PAGE_GUIDES))if(!covered.has(id))errors.push('missing page '+id);
if(errors.length)throw Error(errors.join('\n'));
const report={date:'2026-10-09',pageCount:covered.size,decisionDomainCount:Object.keys(PLAYER_AI_DECISIONS).length,decisions:PLAYER_AI_DECISIONS,nonDecisionPages:NON_DECISION_PAGES};
const dir=fileURLToPath(new URL('../outputs/player-ai-decisions/',import.meta.url));mkdirSync(dir,{recursive:true});writeFileSync(dir+'coverage.json',JSON.stringify(report,null,2));
console.log(`${report.pageCount} pages, ${report.decisionDomainCount} gameplay decision domains: declarations and callable implementations verified.`);
console.log('Behavior and information equivalence are verified separately by npm run test:player-ai-decisions.');
