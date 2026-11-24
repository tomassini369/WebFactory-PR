import crypto from 'node:crypto';
import sharp from 'sharp';
import {createFile,MP4BoxBuffer} from 'mp4box';
import {adFail} from './marketplace-ads.mjs';

export const maxMedia=4*1024*1024;
export const draftKey=(actor,slot)=>'promotion-drafts/'+crypto.createHash('sha256').update(actor).digest('hex')+'/'+slot;
export const assetKey=(id,index)=>'promotion-media/'+id+'/'+index;
export async function prepareMedia(bytes){
 if(bytes.length>=12&&bytes.toString('ascii',4,8)==='ftyp'){
  const file=createFile();const data=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(data,0),true);
  const info=file.getInfo();
  if(!info.videoTracks?.length||!info.videoTracks.every(track=>/^avc[13]\./.test(track.codec))||!Number.isFinite(info.duration/info.timescale)||info.duration/info.timescale<=0||info.duration/info.timescale>60)throw adFail('Use an H.264 MP4 clip up to 60 seconds.');
  return {bytes,type:'video/mp4'};
 }
 try{
  const image=sharp(bytes,{limitInputPixels:40000000});
  const info=await image.metadata();
  if(!['jpeg','png','webp'].includes(info.format)||info.pages>1)throw Error();
  return {bytes:await image.rotate().resize({width:1440,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toBuffer(),type:'image/webp'};
 }catch{throw adFail('Use a JPG, PNG, WebP or H.264 MP4 file.')}
}
export async function attachDrafts(store,actor,row,files){
 if(!Array.isArray(files)||files.length>4)throw adFail('Select up to four files.');
 const media=[];
 for(const [index,file] of files.entries()){
  if(!Number.isInteger(file?.slot)||file.slot<0||file.slot>3||typeof file.id!=='string')throw adFail('Invalid file.');
  const draft=await store.getWithMetadata(draftKey(actor,file.slot),{type:'arrayBuffer'});
  if(!draft?.metadata?.type||draft.metadata.id!==file.id||draft.metadata.expires<Date.now())throw adFail('Upload is incomplete or expired.',409);
  await store.set(assetKey(row.id,index),draft.data,{onlyIfNew:true});
  const coverTime=Number(file.coverTime);
  media.push({type:draft.metadata.type,...(draft.metadata.type==='video/mp4'&&Number.isFinite(coverTime)&&coverTime>0&&coverTime<=60?{coverTime}:{})});
 }
 return media;
}
