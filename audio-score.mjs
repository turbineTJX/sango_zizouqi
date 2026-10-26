// Original long-form orchestration. All timing is independent of game speed.
import {MUSIC_THEMES} from './music-themes.mjs';
export {AUDIO_TRACKS} from './music-themes.mjs';
const hz=n=>440*2**((n-69)/12);
const WAR=new Set(['encounter','battle','advantage','disadvantage','decisive','march']);
export function scorePulse(scene,pulse){
 const t=MUSIC_THEMES[scene];if(!t)return [];
 const p=((pulse%(t.bars*8))+t.bars*8)%(t.bars*8),bar=Math.floor(p/8),beat=p%8,phrase=t.phrases[bar%16],chord=t.harmony[bar%8],root=t.root;
 const section=Math.floor(bar/8)%4,energy=[.68,.88,.62,1.05][section],war=WAR.has(scene),full=section===1||section===3,w=t.weight*energy,events=[];
 const add=(instrument,note,length,level,pan=0,offset=0)=>events.push({instrument,hz:hz(note),length,level:Math.min(.8,level),pan,offset});
 // Long melodic breaths, with octave and brass answers only in the climax.
 for(const [at,note,length]of phrase)if(at===beat){
  add(t.lead,root+note,length*.94,.35*energy,.08);
  if(section===3&&['lobby','battle','advantage','decisive'].includes(scene))add('violins',root+note+12,length*.92,.105,.38,.035);
  if(war&&full&&t.lead!=='horn')add('horn',root+note,length*.92,.10,-.25,.02);
 }
 if(beat===0){
  add('bass',root+chord[0]-24,7.6,.22*w,-.12);
  // Root/fifth/open suspended voicings leave space around the Chinese melody.
  for(let i=0;i<3;i++)add('strings',root+chord[i],7.7,.105*w,[-.55,-.1,.55][i]);
  if(full&&war){add('lowBrass',root+chord[0]-12,3.5,.17*w,-.35);add('horn',root+chord[2],3.5,.10*w,.3);}
  if(section===3&&['lobby','decisive','advantage'].includes(scene)){add('choir',root+chord[0],7.6,.07,-.25);add('choir',root+chord[2],7.6,.055,.25);}
 }
 if([0,4].includes(beat)&&scene!=='winter')add('cello',root+chord[beat===0?0:2]-12,3.6,.13*w,-.4);
 const plucks=scene==='winter'?[0,5]:war?[0,2,3,4,6,7]:[0,3,5,6];
 if(plucks.includes(beat))add('pipa',root+chord[(plucks.indexOf(beat)+bar)%3]+12,war?1.5:3.0,(war?.17:.21)*energy,-.28);
 if(beat===4&&bar%2===1&&full)add(t.lead==='dizi'?'erhu':'dizi',root+[19,17,15,12][Math.floor(bar/2)%4],3.5,.11,.35);
 if(war){
  // Alternating duple and 3+3+2 figures; the last bar of a phrase gets a roll.
  const pattern=bar%2?[0,3,4,6]:[0,2,4,7];
  if(pattern.includes(beat))add('taiko',beat===0?46:51,.85,(beat===0?.52:.34)*w,beat%3===0?-.15:.15);
  if([0,4].includes(beat))add('timpani',root+chord[0]-12,2.7,.27*w,0);
  if(full&&[1,3,5,7].includes(beat))add('wood',74,.45,.19*w,.3);
  if(full&&scene!=='disadvantage'){
   add('violins',root+chord[(beat+bar)%3]+12,.70,.095*w,-.3);
   if(section===3)add('violins',root+chord[(beat+1+bar)%3]+12,.65,.075*w,.3,.5);
  }
  if(bar%8===7&&beat>=5){add('taiko',54,.45,.21*w,-.2,.5);if(beat===7)add('timpani',root-5,.6,.22*w,.2,.5);}
  if(beat===0&&bar%8===0){add('gong',root-12,6,.20*w);add('cymbal',49,5,.18*w,.1);}
 }else{
  if(beat===0&&bar%4===0)add('bell',root+24,7,.10*w,.35);
  if(beat===0&&['lobby','summer','council'].includes(scene))add('timpani',root-12,3.5,.22*w,0);
  if(scene==='lobby'&&[0,4,6].includes(beat))add('taiko',beat===0?46:51,1.1,.34*w,-.1);
  if(scene==='summer'&&[0,4].includes(beat))add('taiko',50,1.2,.22*w,.12);
  if(scene==='council'&&beat===6)add('wood',70,.55,.15*w,.3);
  if(scene==='lobby'&&beat===0&&bar%8===0){add('gong',root-12,7,.14);add('cymbal',49,5,.10);}
 }
 return events;
}

// Individual voices use seconds; these short gestures are composed separately
// from the background themes so UI feedback stays immediate at every game speed.
const v=(instrument,hz,length,level=.4,offset=0,pan=0)=>({instrument,hz,length,level,offset,pan});
export const SOUND_CUES={
 tap:[v('wood',720,.055,.28),v('pluck',587,.12,.19,.008)],
 select:[v('pluck',440,.17,.32),v('bell',880,.14,.12,.025)],
 back:[v('pluck',440,.12,.24),v('pluck',330,.16,.25,.055)],
 confirm:[v('wood',530,.08,.34),v('pluck',587,.25,.42,.015),v('bell',880,.32,.22,.07)],
 error:[v('wood',190,.11,.28),v('pluck',196,.18,.30,.04),v('pluck',185,.16,.23,.11)],
 order:[v('drum',78,.30,.55),v('wood',520,.1,.25,.065),v('pluck',294,.35,.42,.08),v('pluck',440,.4,.35,.15)],
 start:[v('drum',62,.5,.58),v('drum',70,.32,.43,.18),v('gong',147,1.35,.24,.25),v('horn',294,.7,.28,.3)],
 melee:[v('swoosh',650,.10,.22),v('metal',820,.16,.29,.025),v('drum',110,.13,.22,.025)],
 arrow:[v('swoosh',1600,.15,.30),v('wood',280,.09,.3,.10)],
 impact:[v('drum',58,.36,.48),v('metal',270,.27,.26,.02)],
 critical:[v('swoosh',950,.12,.3),v('metal',660,.34,.46,.035),v('drum',65,.26,.4,.035)],
 tactic:[v('swoosh',950,.30,.26),v('drum',72,.42,.40,.07),v('bell',587,.65,.26,.05),v('bell',880,.60,.22,.14)],
 fire:[v('swoosh',260,.65,.43),v('drum',52,.6,.48,.07),v('metal',190,.45,.17,.12)],
 heal:[v('bell',587,.75,.29),v('bell',740,.7,.23,.1),v('bell',880,.7,.20,.2)],
 rout:[v('drum',55,.5,.36),v('horn',196,.38,.23),v('horn',147,.45,.24,.28)],
 notify:[v('bell',659,.5,.24),v('pluck',880,.4,.27,.1)],
 victory:[v('gong',147,2.2,.23),v('drum',62,.5,.40),v('horn',294,.65,.32,.08),v('horn',370,.55,.30,.5),v('horn',440,1.0,.32,.9),v('bell',1175,1.4,.25,1.05)],
 defeat:[v('gong',110,2.2,.18),v('flute',294,.6,.32,.05),v('flute',261.6,.65,.28,.5),v('flute',220,1.3,.28,.98)],
 draw:[v('pluck',294,.8,.34),v('pluck',330,.75,.30,.22),v('bell',440,1.3,.22,.5)],
};
