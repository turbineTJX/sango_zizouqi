import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignLobby,modeLobby} from '../campaign-lobby.mjs';
import {SCENARIOS,createScenario} from '../scenarios.mjs';
import {BATTLE_PRESETS} from '../data/design/battles.mjs';
test('standalone catalogue contains only the editor, with resume and return navigation',()=>{
 assert.deepEqual(BATTLE_PRESETS,[]);assert.deepEqual(SCENARIOS.map(s=>s.id),['custom-battle']);
 const html=campaignLobby(null,{name:'自由对战'});assert.match(html,/data-action="launch-custom"/);assert.match(html,/data-action="continue-history"/);assert.doesNotMatch(html,/historical-card|launch-history|返回战役列表/);assert.doesNotMatch(modeLobby(),/九场|历史名战/);
 assert.throws(()=>createScenario('history-guandu'),/预设已移除/);
 assert.equal((html.match(/data-action="historical-template"/g)||[]).length,6);
});
