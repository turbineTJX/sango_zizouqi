export function waveBytes(buffer,{fade=true}={}){
 const frames=buffer.length,rate=buffer.sampleRate,bytes=new Uint8Array(44+frames*4),view=new DataView(bytes.buffer),channels=[buffer.getChannelData(0),buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1))];
 const str=(at,text)=>{for(let i=0;i<text.length;i++)view.setUint8(at+i,text.charCodeAt(i));};
 str(0,'RIFF');view.setUint32(4,bytes.length-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,frames*4,true);
 let peak=0,squares=0,clipped=0;
 for(let i=0;i<frames;i++)for(let ch=0;ch<2;ch++){
  const sample=channels[ch][i]*(fade?Math.min(1,i/(rate*.08),(frames-i-1)/(rate*.65)):1);
  if(!Number.isFinite(sample))throw Error('Nonfinite audio');peak=Math.max(peak,Math.abs(sample));squares+=sample*sample;if(Math.abs(sample)>=1)clipped++;
  view.setInt16(44+i*4+ch*2,Math.round(Math.max(-1,Math.min(1,sample))*32767),true);
 }
 return {bytes,seconds:frames/rate,peak,rms:Math.sqrt(squares/(frames*2)),clipped};
}
