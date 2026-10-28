import {CONFIG} from '../config.js?v=13.0';
import {sampleRows} from '../data/seed.js?v=13.0';
export async function decodeReceipt(file){
 // Produce a preview *immediately* after the camera returns a File. Never
 // block the UI on iOS image.decode(), QR scanning, or a missing CDN module.
 if(!file||!(file.type?.startsWith('image/')||/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name||'')))throw Error('imageTypeError');
 if(file.size>18*1024*1024)throw Error('imageSizeError');
 return URL.createObjectURL(file);
}
export async function generateReceipt(generator=sampleRows){try{return await generator();}catch{throw Error('generationError');}}
// Injectable only from the isolated test harness; the ordinary product has no fault switches.
export const receiptServices={decode:decodeReceipt,generate:generateReceipt};
