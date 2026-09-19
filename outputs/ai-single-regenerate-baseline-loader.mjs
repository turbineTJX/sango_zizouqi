// Diagnostic only: restore the former single-recipient rejection in memory.
// All other current movement, tactics and command code remains unchanged.
export async function load(url,context,nextLoad){
 const result=await nextLoad(url,context);
 if(url.endsWith('/battle-ai.mjs')){
  const text=String(result.source),line=text.split('\n').find(s=>s.trim().startsWith('regenerate:recovering.length'));
  if(!line)throw new Error('Expected current regeneration scoring');
  return {...result,source:text.replace(line,'    regenerate:recovering.length>=2?65+recovering.length*4:0,')};
 }
 return result;
}
