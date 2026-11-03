import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign}=await load('strategic-campaign.mjs');assert.equal(validateCampaign(JSON.parse(await readFile(save,'utf8'))).campaign.allAI,true);
 // These are explicitly controlled staffing and food-crisis branches. The
 // independent ordinary nationwide windows assess actual unmodified play.
 const {exerciseSameTurnCoherence}=await load('tests/helpers/same-turn-coherence.mjs');
 return exerciseSameTurnCoherence();
}
