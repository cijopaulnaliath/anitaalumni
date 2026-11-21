import {photoFormat} from './photo-format';
export async function validatePhotoSelection(file:File){
 if(file.type&&!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('This photo format is not supported. Upload a JPG, PNG, or WebP image (up to 3 MB). Convert HEIC/HEIF photos to JPG first.');
 if(!file.size||file.size>3*1024*1024)throw Error('Please choose a photo up to 3 MB.');const type=photoFormat(await file.arrayBuffer());
 if(file.type&&file.type!==type)throw Error('The file contents do not match its photo format. Export it again as JPG, PNG, or WebP.');
 const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();if(image.naturalWidth*image.naturalHeight>20000000)throw Error('Photo resolution too large');if(!image.naturalWidth||!image.naturalHeight)throw Error('Invalid image');}catch{throw Error('This photo cannot be opened. It may be damaged, incompatible, or exceed 20 megapixels. Export a new JPG, PNG, or WebP image and try again.');}finally{URL.revokeObjectURL(url)}
}
