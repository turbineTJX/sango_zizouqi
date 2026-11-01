import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
export async function exercise({source}){
 const {exerciseMacroDefense}=await import(pathToFileURL(join(source,'tests/helpers/macro-defense.mjs')));
 return exerciseMacroDefense();
}
