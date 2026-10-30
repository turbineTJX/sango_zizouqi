// Extend the verified role prototype without editing the live workspace.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const variant=args.variant||'combined',versions={control:9233,cues:9234,sustain:9235,combined:9236,initiative:9237,opening:9238};
assert.ok(versions[variant]);
const base=resolve('work/battle-roles-prototype/window-v3'),out=resolve(args.out||'work/common-roster-trial/'+variant),runtime=join(out,'runtime');
assert.ok(!existsSync(out),'Use a new immutable experiment directory');
const sha=b=>createHash('sha256').update(b).digest('hex'),manifest=JSON.parse(readFileSync(join(base,'manifest.json')));
for(const [p,h]of Object.entries(manifest.hashes)){const bytes=readFileSync(join(base,'runtime',p));assert.equal(sha(bytes),h,p);mkdirSync(dirname(join(runtime,p)),{recursive:true});writeFileSync(join(runtime,p),bytes);}
function patch(file,from,to){const p=join(runtime,file),s=readFileSync(p,'utf8');assert.equal(s.split(from).length,2,file+' anchor');writeFileSync(p,s.replace(from,to));}
patch('combat-rules.mjs','RULES_VERSION = 9133','RULES_VERSION = '+versions[variant]);
const changes=[];
if(['initiative','opening'].includes(variant)){
 patch('engine.mjs','export const COMMAND_RESOURCE = { capacity:9000 };','export const COMMAND_RESOURCE = { capacity:9000, initial:4500 };');
 patch('engine.mjs','comboCounts:[0,0], commandProgress:0,','comboCounts:[0,0], commandProgress:COMMAND_RESOURCE.initial,');
 patch('engine.mjs','enemyCommand:{commandProgress:0,','enemyCommand:{commandProgress:COMMAND_RESOURCE.initial,');
 changes.push('双方首次开战指挥条4500/9000；后续充能、费用、提供者存活要求不变；任命、援军和读档不补条');
}
if(['sustain','combined','initiative'].includes(variant)){
 patch('unit-stats.mjs',"import {combatType,combatFamily} from './troop-equipment.mjs';","import {combatType,combatFamily} from './troop-equipment.mjs';\nimport {offensiveSoldiers} from './offensive-soldiers.mjs';");
 patch('unit-stats.mjs','if(troopAttributes.has(key)){base=base/3000*soldiers;officer=officer/3000*soldiers;source+=`（现役 ${soldiers} 人）`;}','if(troopAttributes.has(key)){const power=key===\'supportPower\'?soldiers:offensiveSoldiers(u);base=base/3000*power;officer=officer/3000*power;source+=`（现役 ${soldiers} 人${key===\'supportPower\'?\'\':\'，按战损曲线折算攻击\'}）`;}');
 writeFileSync(join(runtime,'offensive-soldiers.mjs'),`// Derived offensive power only: never inventory, casualties, healing or supply.\nexport const ATTRITION_EXPONENT=.7;\nexport function offensiveSoldiers(u){\n const alive=Math.max(0,u.hp??u.troops??0);\n const initial=u.initial;\n if(!Number.isFinite(initial)||initial<=0||alive>=initial)return alive;\n return initial*(alive/initial)**ATTRITION_EXPONENT;\n}\n`);
 changes.push('攻击、武技、谋略按初始兵力×剩余比例^0.7；满兵及非战场不变，营务/治疗仍按现役线性计算');
}
if(['cues','combined'].includes(variant)){
 const file='data/design/tactics.mjs',mod=await import(pathToFileURL(join(runtime,file))),exports=structuredClone({...mod}),d=exports.TACTIC_DESIGNS;
 for(const s of Object.values(d))if(s.geometry)s.geometry.delay=Math.max(2,s.geometry.delay);
 d['unique-person-99'].geometry={kind:'line',reach:1,maxTargets:1,secondaryScale:1,delay:2};
 d['unique-person-246'].geometry={kind:'burst',reach:4,radius:1,maxTargets:3,secondaryScale:1,delay:2};
 for(const s of Object.values(d))if(s.geometry)s.description+='；蓄势2回合锁定当前区域，期间可被控制打断，敌军离开可落空，次数已消耗';
 writeFileSync(join(runtime,file),Object.entries(exports).map(([k,v])=>'export const '+k+' = '+JSON.stringify(v,null,2)+';\n').join(''));
 changes.push('现有几何战法至少蓄势2步；青龙偃月与神火燎原加入真实锁区蓄势，次数、冷却、威力不变');
}
const hashes={};function walk(dir=''){for(const e of readdirSync(join(runtime,dir),{withFileTypes:true})){const p=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(p);else hashes[p]=sha(readFileSync(join(runtime,p)));}}walk();
const result={variant,createdAt:new Date().toISOString(),rulesVersion:versions[variant],baselineHash:manifest.sourceHash,sourceHash:sha(JSON.stringify(hashes)),builderHash:sha(readFileSync(fileURLToPath(import.meta.url))),changes,hashes};
writeFileSync(join(out,'manifest.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,hashes:undefined}));
