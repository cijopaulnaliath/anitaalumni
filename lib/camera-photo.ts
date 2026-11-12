export function stopCamera(stream:MediaStream|null){stream?.getTracks().forEach(track=>track.stop())}
export async function captureCameraPhoto(video:HTMLVideoElement):Promise<File>{
 if(!video.videoWidth||!video.videoHeight)throw Error('The camera is still getting ready. Try again in a moment.');
 const canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);const context=canvas.getContext('2d');if(!context)throw Error('This browser cannot capture a photo. Upload from device instead.');context.drawImage(video,0,0,canvas.width,canvas.height);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Unable to capture a photo. Please try again.')),'image/jpeg',.9));return new File([blob],'profile-camera.jpg',{type:'image/jpeg'});
}
