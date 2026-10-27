const FONT='"Microsoft YaHei",sans-serif',LIMIT=96;
export class BattleTextCache{
 constructor(){this.entries=new Map();}
 get(text,size,color,ratio){
  const key=JSON.stringify([text,size,color,ratio]);let entry=this.entries.get(key);
  if(entry){this.entries.delete(key);this.entries.set(key,entry);return entry;}
  const canvas=globalThis.document?.createElement('canvas'),context=canvas?.getContext?.('2d');if(!context)return null;
  context.font=`500 ${size}px ${FONT}`;
  const width=Math.ceil(context.measureText(text).width+10),height=Math.ceil(size*2+8);
  if(width>4096)return null;
  canvas.width=Math.ceil(width*ratio);canvas.height=Math.ceil(height*ratio);context.setTransform(ratio,0,0,ratio,0,0);
  context.font=`500 ${size}px ${FONT}`;context.textAlign='center';context.textBaseline='middle';context.lineWidth=2.5;context.strokeStyle='#101c22';context.strokeText(text,width/2,height/2);context.fillStyle=color;context.fillText(text,width/2,height/2);
  entry={canvas,width,height};this.entries.set(key,entry);
  while(this.entries.size>LIMIT){const [old,item]=this.entries.entries().next().value;item.canvas.width=item.canvas.height=0;this.entries.delete(old);}
  return entry;
 }
 clear(){for(const entry of this.entries.values())entry.canvas.width=entry.canvas.height=0;this.entries.clear();}
}
