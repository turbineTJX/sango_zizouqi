import {BASE_TROOPS} from './troop-equipment.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {troopAptitude} from './tactic-learning.mjs';

export const APTITUDE_COLUMNS=BASE_TROOPS.map(id=>[id,TROOP_DESIGNS[id].name]);
export const aptitudeGrade=rank=>['C','B','A','S'][rank]??'—';
export function aptitudesMarkup(u){
 return `<div class="catalog-aptitudes" aria-label="兵种适性">${APTITUDE_COLUMNS.map(([id,label])=>`<span data-aptitude-family="${id}">${label}<b>${aptitudeGrade(troopAptitude(u,id))}</b></span>`).join('')}</div>`;
}
