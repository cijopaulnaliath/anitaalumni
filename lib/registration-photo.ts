import {validatePhotoSelection} from './photo-selection';
// Materialize a compact, browser-owned file instead of uploading a phone photo-library handle.
export async function prepareRegistrationPhoto(file:File):Promise<File>{
 await validatePhotoSelection(file);
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  const scale=Math.min(1,1200/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('This browser could not prepare the photo. Try another photo or add one later in My account.');
  context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('This photo could not be prepared. Choose another photo or continue without one.')),'image/jpeg',.82));
  if(!blob.size||blob.size>3*1024*1024)throw Error('This photo is too large. Choose a smaller picture or add one later in My account.');
  return new File([blob],'profile-photo.jpg',{type:'image/jpeg'});
 }finally{URL.revokeObjectURL(url)}
}
