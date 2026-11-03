import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// The archived ordinary national save authenticates the common runtime input.
// The explicitly constructed road-defense case isolates the known contradiction;
// it is not evidence of a naturally occurring sortie or a campaign victory.
export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign}=await load('strategic-campaign.mjs');
 assert.equal(validateCampaign(JSON.parse(await readFile(save,'utf8'))).campaign.allAI,true);
 const {exerciseMacroDefense}=await load('tests/helpers/macro-defense.mjs');
 return exerciseMacroDefense();
}
