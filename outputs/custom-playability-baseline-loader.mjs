import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({load(url,context,nextLoad){if(url.endsWith('/battle-ai.mjs'))return {format:'module',shortCircuit:true,source:readFileSync('docs/custom-playability/baseline/source/battle-ai.mjs','utf8')};return nextLoad(url,context);}});
