import sharp from 'sharp';
import {kioskFail} from './kiosk.mjs';
export const kioskBackgroundMaxBytes=4*1024*1024;
export async function optimizeKioskBackground(bytes,type){
 if(!['image/jpeg','image/png','image/webp'].includes(type)||!bytes.length||bytes.length>kioskBackgroundMaxBytes)throw kioskFail('Use JPG, PNG or WebP up to 4 MB / Usa JPG, PNG o WebP hasta 4 MB.');
 try{
  const image=sharp(bytes,{limitInputPixels:24000000,animated:false,failOn:'warning'}),info=await image.metadata();
  if(info.format!==({'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'}[type])||info.pages>1)throw new Error('Unsupported image');
  const data=await image.rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
  if(data.length>1024*1024)throw new Error('Image too complex');return data;
 }catch{throw kioskFail('Image cannot be processed. Choose another photo / No se pudo procesar la imagen. Escoge otra foto.');}
}
