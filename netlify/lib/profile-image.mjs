import sharp from 'sharp';

export async function encodeProfileImage(bytes){
 const image=sharp(bytes,{limitInputPixels:40000000,animated:false});const meta=await image.metadata();
 if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1)throw Object.assign(new Error('Use a static JPEG, PNG or WebP image.'),{status:400});
 return image.rotate().resize({width:512,height:512,fit:'cover',position:'centre',withoutEnlargement:true}).webp({quality:86}).toBuffer();
}
