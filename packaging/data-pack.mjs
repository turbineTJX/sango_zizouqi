import {decode} from '@msgpack/msgpack';
import {gunzipSync} from 'fflate';

export const DATA_PACK_VERSION=1;
export const DATA_MAGIC=new Uint8Array([83,65,78,71,79,68,65,84]); // SANGODAT
export const DATA_HEADER_SIZE=20;
export const MAX_DATA_BYTES=64*1024*1024;

export function decodeDataPack(bytes,expected={}){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<DATA_HEADER_SIZE)throw Error('游戏数据包不完整');
 const header=new DataView(bytes.buffer,bytes.byteOffset,DATA_HEADER_SIZE);
 if(!DATA_MAGIC.every((value,i)=>bytes[i]===value)||header.getUint32(8,true)!==DATA_PACK_VERSION)throw Error('游戏数据包格式不兼容');
 const decodedSize=header.getUint32(12,true),payloadSize=header.getUint32(16,true);
 if(!decodedSize||decodedSize>MAX_DATA_BYTES||payloadSize!==bytes.byteLength-DATA_HEADER_SIZE)throw Error('游戏数据包长度异常');
 const raw=gunzipSync(bytes.subarray(DATA_HEADER_SIZE),{out:new Uint8Array(decodedSize)});
 if(raw.byteLength!==decodedSize)throw Error('游戏数据包长度异常');
 const pack=decode(raw);
 if(pack.formatVersion!==DATA_PACK_VERSION||!pack.tables||typeof pack.tables!=='object')throw Error('游戏数据包格式不兼容');
 for(const key of ['gameVersion','rulesVersion','revision'])if(expected[key]!==undefined&&pack[key]!==expected[key])throw Error('程序与游戏数据包版本不一致');
 return pack;
}

export async function loadDataPack(url,expected){
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok)throw Error('未能读取游戏数据包');
 const bytes=new Uint8Array(await response.arrayBuffer());
 const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
 if(actual!==expected.sha256)throw Error('游戏数据包校验失败');
 return decodeDataPack(bytes,expected).tables;
}
