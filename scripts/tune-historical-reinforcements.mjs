import {mkdirSync,writeFileSync} from 'node:fs';
import {historicalBattleDraft} from '../historical-battle-library.mjs';
import {simulateHistory} from './audit-historical-reinforcements.mjs';
import {DEV_SEEDS} from './xiapi-player-lab.mjs';
const rows=[],seeds=DEV_SEEDS.slice(0,4);mkdirSync('outputs/historical-reinforcements',{recursive:true});
for(const id of ['guandu','chibi','hefei']){
 const draft=historicalBattleDraft(id),cases=[];
 for(const seed of seeds)for(const swapped of [false,true])cases.push(simulateHistory(draft,{seed,swapped}));
 const row={id,wins:cases.filter(c=>c.originalWinner===0).length,draws:cases.filter(c=>c.originalWinner===null).length,n:cases.length,cases};rows.push(row);console.log(id,row.wins,row.draws,row.n);
 writeFileSync('outputs/historical-reinforcements/tuning.json',JSON.stringify(rows,null,2));
}
for(const core of [4800,5000,5200,5400,5600]){
 const draft=historicalBattleDraft('wuzhang'),tail=Math.floor((42000-core*4)/6/100)*100;
 draft.enemyTeam.forEach((u,i)=>u.troops=i<4?core:tail);
 draft.enemyTeam.at(-1).troops+=42000-draft.enemyTeam.reduce((n,u)=>n+u.troops,0);
 const cases=[];for(const seed of seeds)for(const swapped of [false,true])cases.push(simulateHistory(draft,{seed,swapped}));
 const row={id:'wuzhang',core,tail,wins:cases.filter(c=>c.originalWinner===0).length,draws:cases.filter(c=>c.originalWinner===null).length,n:cases.length,cases};rows.push(row);console.log('wuzhang',core,row.wins,row.draws,row.n);
 writeFileSync('outputs/historical-reinforcements/tuning.json',JSON.stringify(rows,null,2));
}
