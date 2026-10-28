import {CONFIG} from '../config.js?v=13.0';
import {sampleRows} from '../data/seed.js?v=13.0';
export async function decodeReceipt(file){
 if(!file||!file.type.startsWith('image/'))throw Error('imageTypeError');
 if(file.size>18*1024*1024)throw Error('imageSizeError');
 const url=URL.createObjectURL(file);
 try{const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth)throw Error();return url;}
 catch{
  URL.revokeObjectURL(url);
  // HEIC/HEIF support depends on the phone and browser. Convert only if the
  // browser can actually decode the original pixels; never fake a preview.
  try{const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});const canvas=document.createElement('canvas');const ratio=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));if(!blob)throw Error();return URL.createObjectURL(blob);}catch{throw Error('previewError');}
 }
}
export async function generateReceipt(generator=sampleRows){try{return await generator();}catch{throw Error('generationError');}}
// Injectable only from the isolated test harness; the ordinary product has no fault switches.
export const receiptServices={decode:decodeReceipt,generate:generateReceipt};
