export async function validatePhoto(photo:File){
 if(!photo.size||photo.size>3*1024*1024)throw Error('Please choose a photo under 3 MB.');
 const data=await photo.arrayBuffer(),b=new Uint8Array(data);let type='';
 if(b[0]===255&&b[1]===216&&b[2]===255)type='image/jpeg';
 else if(b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10)type='image/png';
 else if(String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')type='image/webp';
 if(!type)throw Error('Please upload a JPG, PNG, or WebP photo.');
 return {data,type};
}
