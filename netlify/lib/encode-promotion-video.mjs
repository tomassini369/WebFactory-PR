import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareMedia,maxMedia} from './promotion-media.mjs';

export async function encodePromotionVideo(original){
 const ffmpeg=createRequire(import.meta.url).resolve('@ffmpeg-installer/linux-x64/ffmpeg');
 const dir=await mkdtemp(join(tmpdir(),'wf-promo-'));
 try{
  const input=join(dir,'input'),output=join(dir,'output.mp4');
  await writeFile(input,new Uint8Array(original));
  // Limit work on long inputs; the validator rejects output exceeding 60 seconds.
  await promisify(execFile)(ffmpeg,['-nostdin','-v','error','-protocol_whitelist','file',
   '-format_whitelist','mov,matroska,webm,avi,mpeg,mpegts,ogg,flv,asf','-threads','2','-i',input,
   '-map','0:v:0','-map','0:a:0?','-map_metadata','-1','-map_chapters','-1','-t','61',
   '-vf',"fps=30,scale=w='min(960,iw)':h='min(960,ih)':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2,setsar=1",
   '-threads','2','-c:v','libx264','-pix_fmt','yuv420p','-preset','veryfast','-crf','23','-maxrate','425k','-bufsize','500k',
   '-c:a','aac','-ac','2','-b:a','64k','-movflags','+faststart',output],{timeout:240000,killSignal:'SIGKILL',maxBuffer:131072});
  const bytes=await readFile(output);if(bytes.length>maxMedia)throw Error('size');
  return await prepareMedia(bytes);
 }finally{await rm(dir,{recursive:true,force:true})}
}
