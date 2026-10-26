// Small, sample-free Web Audio instrument rack, shared by live play and WAV previews.
// All noise is local to this synthesizer; it never calls Math.random or the game RNG.
const noiseCache=new WeakMap(),waveCache=new WeakMap();
function noise(ctx){
 if(noiseCache.has(ctx))return noiseCache.get(ctx);
 const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);let seed=0x53414e47;
 for(let i=0;i<data.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=(seed>>>0)/2147483648-1;}
 noiseCache.set(ctx,buffer);return buffer;
}
function wave(ctx,kind){
 let waves=waveCache.get(ctx);if(!waves){waves={};waveCache.set(ctx,waves);}if(waves[kind])return waves[kind];
 const coefficients=kind==='pluck'?[0,1,.45,.28,.13,.09,.04,.02]:[0,1,.16,.06,.025];
 return waves[kind]=ctx.createPeriodicWave(new Float32Array(coefficients.length),Float32Array.from(coefficients));
}
export function createAudioGraph(ctx){
 const master=ctx.createGain(),music=ctx.createGain(),sfx=ctx.createGain(),limiter=ctx.createDynamicsCompressor();
 limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.004;limiter.release.value=.22;
 master.gain.value=.8;music.gain.value=.32;sfx.gain.value=.7;
 music.connect(master);sfx.connect(master);master.connect(limiter);limiter.connect(ctx.destination);
 const reverb=ctx.createConvolver(),impulse=ctx.createBuffer(2,Math.ceil(ctx.sampleRate*1.25),ctx.sampleRate);let seed=7949;
 for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/2147483648-1)*(1-i/data.length)**3*.42;}}
 reverb.buffer=impulse;const musicSend=ctx.createGain(),sfxSend=ctx.createGain();musicSend.gain.value=.18;sfxSend.gain.value=.08;
 music.connect(musicSend);sfx.connect(sfxSend);musicSend.connect(reverb);sfxSend.connect(reverb);reverb.connect(master);
 return {master,music,sfx,limiter,nodes:[master,music,sfx,limiter,reverb,musicSend,sfxSend]};
}
export function synthVoice(ctx,destination,voice,when=ctx.currentTime,onEnd=()=>{}){
 const {hz=440,length=.2,level=.3,pan=0}=voice,instrument=({violins:'strings',cello:'strings',lowBrass:'horn',choir:'strings',dizi:'flute',erhu:'strings',pipa:'pluck',taiko:'drum',timpani:'drum',cymbal:'swoosh'})[voice.instrument]||voice.instrument,start=Math.max(ctx.currentTime,when),duration=Math.max(.035,Math.min(12,length)),end=start+duration+.06;
 const nodes=[],sources=[],gain=ctx.createGain(),filter=ctx.createBiquadFilter();nodes.push(gain,filter);
 filter.type='lowpass';filter.frequency.value=instrument==='strings'?1500:instrument==='horn'?2200:6500;
 gain.connect(filter);
 if(ctx.createStereoPanner){const panner=ctx.createStereoPanner();panner.pan.value=Math.max(-.7,Math.min(.7,pan));nodes.push(panner);filter.connect(panner);panner.connect(destination);}else filter.connect(destination);
 const oscillator=(freq,amount=1,type='sine',detune=0)=>{
  const source=ctx.createOscillator(),amp=ctx.createGain();source.frequency.setValueAtTime(freq,start);source.detune.value=detune;
  if(type==='pluck'||type==='flute')source.setPeriodicWave(wave(ctx,type));else source.type=type;
  amp.gain.value=amount;source.connect(amp);amp.connect(gain);nodes.push(source,amp);sources.push(source);return source;
 };
 const air=(freq,amount,type='bandpass',q=.8)=>{
  const source=ctx.createBufferSource(),shape=ctx.createBiquadFilter(),amp=ctx.createGain();source.buffer=noise(ctx);source.loop=true;shape.type=type;shape.frequency.setValueAtTime(freq,start);shape.Q.value=q;amp.gain.value=amount;source.connect(shape);shape.connect(amp);amp.connect(gain);nodes.push(source,shape,amp);sources.push(source);return shape;
 };
 let attack=.008,release=.04,peak=level;
 if(instrument==='pluck'){
  oscillator(hz,.9,'pluck');oscillator(hz*2.003,.13);filter.frequency.setValueAtTime(Math.min(7000,hz*10),start);filter.frequency.exponentialRampToValueAtTime(Math.max(400,hz*2),start+duration);
 }else if(instrument==='flute'){
  const tone=oscillator(hz,.85,'flute');air(hz*3,.07);attack=.065;release=.12;
  const vibrato=ctx.createOscillator(),depth=ctx.createGain();vibrato.frequency.value=4.6;depth.gain.setValueAtTime(0,start);depth.gain.linearRampToValueAtTime(5,start+Math.min(.3,duration*.4));vibrato.connect(depth);depth.connect(tone.detune);nodes.push(vibrato,depth);sources.push(vibrato);
 }else if(instrument==='strings'){
  oscillator(hz,.45,'sawtooth',-5);oscillator(hz,.45,'sawtooth',5);attack=.35;release=.4;filter.frequency.value=850;
 }else if(instrument==='horn'){
  oscillator(hz,.55,'sawtooth',-3);oscillator(hz,.35,'triangle',3);oscillator(hz*2,.1);attack=.04;release=.12;filter.frequency.value=1600;
 }else if(instrument==='bass'){
  oscillator(hz,.85);oscillator(hz*2,.12,'triangle');attack=.035;release=.16;
 }else if(instrument==='drum'){
  const tone=oscillator(hz*1.8,.95);tone.frequency.exponentialRampToValueAtTime(Math.max(35,hz*.65),start+duration);air(850,.17,'lowpass');attack=.003;
 }else if(instrument==='wood'){
  oscillator(hz,.7);oscillator(hz*1.48,.24);air(hz*2,.18);attack=.002;peak*=.75;
 }else if(instrument==='metal'||instrument==='gong'||instrument==='bell'){
  const ratios=instrument==='bell'?[1,2.01,3.99]:instrument==='gong'?[1,1.48,2.13,2.67,3.8]:[1,1.43,2.19,3.14,4.7];
  ratios.forEach((ratio,i)=>oscillator(hz*ratio,.7/(1+i*1.6)));attack=instrument==='gong'?.012:.003;
 }else if(instrument==='swoosh'){
  const shape=air(hz,1,'bandpass',.6);shape.frequency.exponentialRampToValueAtTime(Math.max(100,hz*.22),start+duration);attack=Math.min(.04,duration*.25);peak*=.5;
 }else oscillator(hz);
 const sustained=['flute','horn','strings','bass'].includes(instrument);
 attack=Math.min(attack,duration*.3);release=Math.min(release,duration*.3);
 gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(peak,start+attack);
 if(sustained){gain.gain.linearRampToValueAtTime(peak*.72,start+duration-release);gain.gain.linearRampToValueAtTime(0,start+duration);}
 else {gain.gain.exponentialRampToValueAtTime(.0001,start+duration);gain.gain.linearRampToValueAtTime(0,end);}
 let cleaned=false;
 const cleanup=()=>{if(cleaned)return;cleaned=true;nodes.forEach(n=>n.disconnect());onEnd();};
 sources[0].onended=cleanup;for(const source of sources){source.start(start);source.stop(end);}
 return {start,end,cancel(at=ctx.currentTime,fade=.035){if(cleaned)return;gain.gain.cancelScheduledValues(at);gain.gain.setValueAtTime(at<start?0:Math.min(peak,gain.gain.value),at);gain.gain.linearRampToValueAtTime(0,at+fade);for(const source of sources){try{source.stop(at+fade+.01);}catch{}}},cleanup};
}
