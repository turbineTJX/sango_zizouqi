import {writeFileSync} from 'node:fs';
import {historicalBattleDraft} from '../historical-battle-library.mjs';
import {simulateHistory} from './audit-historical-reinforcements.mjs';
import {DEV_SEEDS} from './xiapi-player-lab.mjs';
const rows=[];
for(const troops of [[9000,6000,6000]]){
 const draft=historicalBattleDraft('chibi');
 for(const [i,id] of ['person-246','person-119','person-164'].entries())draft.ownTeam.find(u=>u.id===id).troops=troops[i];
 const cases=[];
 for(const seed of DEV_SEEDS.slice(0,4))for(const swapped of [false,true])cases.push(simulateHistory(draft,{seed,swapped}));
 const row={troops,wins:cases.filter(r=>r.originalWinner===0).length,losses:cases.filter(r=>r.originalWinner===1).length,draws:cases.filter(r=>r.originalWinner===null).length,draft,cases};
 rows.push(row);console.log(troops,row.wins,row.losses,row.draws);
 writeFileSync('outputs/historical-reinforcements/chibi-core-tuning.json',JSON.stringify(rows,null,2));
}
