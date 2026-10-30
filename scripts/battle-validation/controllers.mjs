import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Laboratory-only controller routing. One engine/data graph is shared by both
// sides; no source rewriting or separate combat resolver is used.
export async function installPolicyRouter({baselineRoot,candidateRoot}){
  const base=pathToFileURL(resolve(baselineRoot)+'/').href;
  const candidate=pathToFileURL(resolve(candidateRoot)+'/').href;
  const routerURL='sango-battle:controllers';
  const baselinePolicy=base+'battle-ai.mjs?controller=baseline';
  const candidatePolicy=candidate+'battle-ai.mjs?controller=candidate';
  const source=[
    'import * as base from '+JSON.stringify(baselinePolicy)+';',
    'import * as candidate from '+JSON.stringify(candidatePolicy)+';',
    'const controllers=[base,base], counts={baseline:0,candidate:0};',
    'export const COMMAND_TRIGGER_ORDER=base.COMMAND_TRIGGER_ORDER;',
    'export function select(candidateSide){controllers[0]=candidateSide===0?candidate:base;controllers[1]=candidateSide===1?candidate:base;counts.baseline=0;counts.candidate=0;}',
    'function pick(side){const c=controllers[side];counts[c===base?"baseline":"candidate"]++;return c;}',
    'export const planEnemyArmy=(b,side=1)=>pick(side).planEnemyArmy(b,side);',
    'export const rankEnemyReserves=(b,units,side=1)=>pick(side).rankEnemyReserves(b,units,side);',
    'export const chooseEnemyCommand=(b,available,definitions,side=1)=>pick(side).chooseEnemyCommand(b,available,definitions,side);',
    'export const diagnostics=()=>({...counts});',
    'export const fixedCommands=()=>JSON.stringify(base.COMMAND_TRIGGER_ORDER)===JSON.stringify(candidate.COMMAND_TRIGGER_ORDER)&&base.chooseEnemyCommand.toString()===candidate.chooseEnemyCommand.toString();',
  ].join('\n');
  const hooks=registerHooks({
    resolve(specifier,context,next){
      if(specifier===routerURL)return {url:routerURL,shortCircuit:true};
      let result=next(specifier,context);
      const url=new URL(result.url);
      if(!url.href.startsWith(base)&&!url.href.startsWith(candidate))return result;
      if(url.pathname.endsWith('/battle-ai.mjs')&&url.searchParams.has('controller'))return result;
      if(url.href.startsWith(candidate)&&candidate!==base)result={...result,url:base+url.href.slice(candidate.length)};
      if(new URL(result.url).pathname.endsWith('/battle-ai.mjs'))return {url:routerURL,shortCircuit:true};
      return result;
    },
    load(url,context,next){return url===routerURL?{format:'module',source,shortCircuit:true}:next(url,context);},
  });
  const router=await import(routerURL);
  assert.ok(router.fixedCommands(),'Fixed command conditions/order changed');
  return {...router,close:()=>hooks.deregister(),load:file=>import(base+file)};
}

