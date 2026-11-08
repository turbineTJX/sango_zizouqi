// Decode bounded image jobs away from camera input and DOM layout.
const jobs=new Map();
self.onmessage=async({data:m})=>{
 if(m.cancel){jobs.get(m.id)?.abort();return;}
 const controller=new AbortController();jobs.set(m.id,controller);
 try{
  const response=await fetch(m.url,{signal:controller.signal});if(!response.ok)throw Error('Map texture HTTP '+response.status);
  const blob=await response.blob();
  if(m.sha256&&crypto.subtle){const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()),hash=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==m.sha256)throw Error('Map texture checksum mismatch');}
  const bitmap=await createImageBitmap(blob,{premultiplyAlpha:'premultiply',colorSpaceConversion:'default'});
  if(controller.signal.aborted){bitmap.close();return;}
  self.postMessage({id:m.id,bitmap},[bitmap]);
 }catch(error){self.postMessage({id:m.id,error:error.message});}finally{jobs.delete(m.id);}
};
