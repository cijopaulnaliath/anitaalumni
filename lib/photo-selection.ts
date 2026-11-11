import {validatePhoto} from './profile-photo';
export async function validatePhotoSelection(file:File){
 if(file.type&&!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('This photo format is not supported. Upload a JPG, PNG, or WebP image (up to 3 MB). Convert HEIC/HEIF photos to JPG first.');
 const {type}=await validatePhoto(file);
 if(file.type&&file.type!==type)throw Error('The file contents do not match its photo format. Export it again as JPG, PNG, or WebP.');
 const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw Error('Invalid image');}catch{throw Error('This photo cannot be opened. It may be damaged or incompatible. Export a new JPG, PNG, or WebP image and try again.');}finally{URL.revokeObjectURL(url)}
}
