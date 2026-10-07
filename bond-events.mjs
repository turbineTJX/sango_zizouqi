import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {bondLevels} from './bonds.mjs';
const cooldowns={swiftReady:'bondSwift',doubtReady:'bondDoubt',linkReady:'bondChain',fireSpreadReady:'bondFire',escortReady:'bondEscort'};
// Cooldowns and a beneficiary's once-per-battle reward survive replacement and saves.
export function validBondState(u,tick=0){
 const s=u.bondState;if(!s||typeof s!=='object'||Array.isArray(s))return false;
 return Object.entries(s).every(([key,n])=>key==='escortInvincibleUsed'?n===true:cooldowns[key]&&(bondLevels(u)[cooldowns[key]]||0)>0&&Number.isSafeInteger(n)&&n>=0&&n<=tick+BOND_DESIGNS[cooldowns[key]].period);
}
