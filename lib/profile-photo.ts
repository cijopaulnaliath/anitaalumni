import sharp from 'sharp';
import {photoFormat} from './photo-format';
export async function validatePhoto(photo:File){
 if(!photo.size||photo.size>3*1024*1024)throw Error('Please choose a photo up to 3 MB.');
 const data=await photo.arrayBuffer(),type=photoFormat(data);
 if(photo.type&&photo.type!==type)throw Error('The photo contents do not match its format. Export a new JPG, PNG, or WebP image.');
 try{const image=sharp(new Uint8Array(data),{failOn:'warning',limitInputPixels:20000000});const meta=await image.metadata();if(!meta.width||!meta.height||(meta.pages||1)>1)throw Error('Invalid or animated image');const output=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:88}).toBuffer();return{data:Uint8Array.from(output).buffer,type:'image/jpeg'};}catch{throw Error('This photo is damaged, too large in resolution, animated, or incompatible. Export a new, still JPG, PNG, or WebP photo (up to 20 megapixels and 3 MB) and try again.');}
}
