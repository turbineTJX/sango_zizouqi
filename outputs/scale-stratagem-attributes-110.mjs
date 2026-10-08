import {readFileSync,writeFileSync} from 'node:fs';
import {STRATAGEM_DESIGNS as designs} from '../data/design/stratagems.mjs';
for(const s of Object.values(designs)){
 s.weights=['shield','invincible','magicImmunity'].includes(s.effect)?{leadership:.7,intellect:.3}:{leadership:.3,intellect:.7};
 s.scaling=['shield','heal','firestorm'].includes(s.effect)?'strength':s.effect==='cleanse'?'resolve':s.disciplineDuration?'disciplineDuration':'duration';
 if(s.disciplineDuration)s.description=s.description.replace('持续回合＝4＋⌊施放时自身军纪÷25⌋，最多12回合','基准持续4＋⌊施放时自身军纪÷25⌋、最多12回合，再按施放者统率与智力折算');
 else if(s.scaling==='duration'){
  s.description=s.description.replace('持续'+s.duration+'回合','基准持续'+s.duration+'回合，持续时间按施放者统率与智力折算');
  if(!s.description.includes('施放者'))s.description=s.description.replace(s.duration+'回合','基准'+s.duration+'回合，持续时间按施放者统率与智力折算');
 }else if(!s.description.includes('折算'))s.description+='；强度按施放者统率与智力折算';
}
const path='data/design/stratagems.mjs',original=readFileSync(path,'utf8');
writeFileSync(path,original.split(/\r?\n/)[0]+'\nexport const STRATAGEM_DESIGNS = '+JSON.stringify(designs,null,2)+';\n');
