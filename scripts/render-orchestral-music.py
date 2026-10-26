"""Render the project's original score with sampled orchestral instruments."""
from pathlib import Path
import sys,json,math,subprocess,hashlib
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'.local/music-tools/python'))
import mido
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfiltfilt

PROGRAMS={'strings':48,'violins':48,'cello':42,'bass':43,'horn':60,'lowBrass':57,'choir':52,'flute':73,'dizi':77,'erhu':110,'pipa':107,'taiko':116,'timpani':47,'bell':14,'wood':115}
PERCUSSION={'cymbal':49,'gong':52}
TRIM={'strings':.85,'violins':.72,'cello':1.0,'bass':1.15,'horn':.92,'lowBrass':.85,'choir':.8,'dizi':.85,'erhu':.95,'pipa':.85,'taiko':1.05,'timpani':.85,'bell':.6,'wood':.8,'cymbal':.8,'gong':.78}
tasks=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'));out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
exe=next((ROOT/'.local/music-tools/fluidsynth').rglob('fluidsynth.exe'));font=ROOT/'.local/music-tools/GeneralUser-GS.sf2';report=[];RATE=44100
def write_audio(path,samples,**options):
    with sf.SoundFile(path,'w',samplerate=RATE,channels=2,**options) as target:
        for at in range(0,len(samples),32768):target.write(samples[at:at+32768])
for spec in tasks:
    tempo=round(60000000/spec['bpm']);pulses=spec['bars']*8;seconds=pulses*.5*tempo/1e6
    instruments=list(dict.fromkeys(e['instrument'] for e in spec['events'] if e['instrument'] not in PERCUSSION));channels={name:ch for name,ch in zip(instruments,[i for i in range(16) if i!=9])}
    if len(channels)!=len(instruments):raise ValueError('Too many simultaneous instrument channels')
    midi=mido.MidiFile(ticks_per_beat=960);track=mido.MidiTrack();midi.tracks.append(track);track.append(mido.MetaMessage('set_tempo',tempo=tempo,time=0));messages=[]
    for name,ch in channels.items():
        messages.append((0,0,mido.Message('program_change',channel=ch,program=PROGRAMS[name])))
        pan=next(e['pan'] for e in spec['events'] if e['instrument']==name)
        for control,value in [(7,100),(10,round(64+pan*54)),(11,112),(91,48),(93,18)]:messages.append((0,0,mido.Message('control_change',channel=ch,control=control,value=value)))
    for cycle in range(2):
        for i,e in enumerate(spec['events']):
            name=e['instrument'];ch=9 if name in PERCUSSION else channels[name];note=PERCUSSION.get(name,round(69+12*math.log2(e['hz']/440)))
            # Human timing and touch are deterministic and belong only to the score.
            timing=0 if name in ['bass','taiko','timpani'] else ((i*17+cycle*3)%7-3)*.004
            at=max(0,cycle*pulses+e['pulse']+e.get('offset',0)+timing);velocity=round(max(24,min(118,41+e['level']*146*TRIM.get(name,1)+(i%5-2))))
            duration=e['length'];start=round(at*480);end=round((at+duration)*480)
            messages.append((start,2,mido.Message('note_on',channel=ch,note=max(0,min(127,note)),velocity=velocity)))
            messages.append((end,1,mido.Message('note_off',channel=ch,note=max(0,min(127,note)),velocity=0)))
    previous=0
    for at,_,message in sorted(messages,key=lambda v:(v[0],v[1])):message.time=at-previous;track.append(message);previous=at
    track.append(mido.MetaMessage('end_of_track',time=max(0,round(2*pulses*480)-previous)))
    path=out/(spec['id']+'.mid');midi.save(path);raw=out/(spec['id']+'-raw.wav')
    result=subprocess.run([str(exe),'-ni','-q','-g','0.38','-r',str(RATE),'-T','wav','-O','float','-F',str(raw),str(font),str(path)],capture_output=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    if result.returncode:raise RuntimeError(result.stderr.decode(errors='replace'))
    samples,rate=sf.read(raw,dtype='float32',always_2d=True);count=round(seconds*RATE);start=count;samples=samples[start:start+count]
    if len(samples)!=count:raise ValueError('Incomplete render: '+spec['id'])
    samples=sosfiltfilt(butter(2,32,fs=RATE,btype='highpass',output='sos'),samples,axis=0).astype(np.float32)
    rms=float(np.sqrt(np.mean(samples**2)));samples=.92*np.tanh(samples*(.155/max(rms,1e-6))/.92)
    # Sub-millisecond seam protection; the reverberation comes from the prior cycle.
    seam=44;samples[:seam]*=np.linspace(0,1,seam)[:,None];samples[-seam:]*=np.linspace(1,0,seam)[:,None]
    write_audio(out/(spec['id']+'.ogg'),samples,format='OGG',subtype='VORBIS')
    preview=samples.copy();fade=round(.65*RATE);preview[:round(.08*RATE)]*=np.linspace(0,1,round(.08*RATE))[:,None];preview[-fade:]*=np.linspace(1,0,fade)[:,None]
    write_audio(out/(spec['id']+'.wav'),preview,subtype='PCM_16')
    decoded,sample_rate=sf.read(out/(spec['id']+'.ogg'),dtype='float32',always_2d=True)
    peak=float(np.max(np.abs(decoded)));rms=float(np.sqrt(np.mean(decoded**2)))
    if not np.isfinite(decoded).all() or peak>=.99 or rms<.03:raise ValueError('Invalid master: '+spec['id'])
    entry={'id':spec['id'],'name':spec['name'],'scene':spec['scene'],'seconds':count/RATE,'bpm':spec['bpm'],'peak':peak,'rms':rms,'bytes':(out/(spec['id']+'.ogg')).stat().st_size,'scoreSha256':hashlib.sha256(json.dumps(spec,sort_keys=True).encode()).hexdigest()};report.append(entry);print(json.dumps(entry,ensure_ascii=True),flush=True);raw.unlink()
(out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
