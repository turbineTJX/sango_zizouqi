import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function exercise({source}){
 const {exerciseLostReliefTarget}=await import(pathToFileURL(join(source,'tests/helpers/lost-relief-target.mjs')));
 return exerciseLostReliefTarget();
}
