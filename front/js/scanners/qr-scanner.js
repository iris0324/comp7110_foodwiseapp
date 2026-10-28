/** Receipt/photo QR decoding. Try pixel-based jsQR, then ZXing-JS, then native BarcodeDetector.
 * The two JavaScript libraries are lazily loaded from local vendors first;
 * if not provisioned, a hosted source is attempted with a visible failure state.
 */
export class QRScanError extends Error {constructor(code){super(code);this.code=code;}}
let jsQRReady, zxingReady;
function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.async=true;script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('library unavailable'));};document.head.append(script);});}
async function ensureJsQR(){if(typeof globalThis.jsQR==='function')return globalThis.jsQR;
 if(!jsQRReady)jsQRReady=(async()=>{for(const src of ['js/vendor/jsQR.js','https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js']){try{await loadScript(src);if(typeof globalThis.jsQR==='function')return globalThis.jsQR;}catch{}}return null;})();return jsQRReady;}
async function ensureZXing(){if(globalThis.ZXing?.BrowserQRCodeReader)return globalThis.ZXing;
 if(!zxingReady)zxingReady=(async()=>{for(const src of ['js/vendor/zxing.min.js','https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js']){try{await loadScript(src);if(globalThis.ZXing?.BrowserQRCodeReader)return globalThis.ZXing;}catch{}}return null;})();return zxingReady;}
function transformedCanvas(bitmap,angle=0,scale=1){const portrait=angle%180!==0;const w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale));const can=document.createElement('canvas');can.width=portrait?h:w;can.height=portrait?w:h;const ctx=can.getContext('2d',{willReadFrequently:true});ctx.translate(can.width/2,can.height/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(bitmap,-w/2,-h/2,w,h);return can;}
export async function decodeQRPhoto(file){
 if(!file||!(file.type.startsWith('image/')||/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)))throw new QRScanError('scanImageType');
 if(file.size>18*1024*1024)throw new QRScanError('scanImageSize');
 let bitmap;try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw new QRScanError('scanUnreadable');}
 try{
  const fast=await ensureJsQR();const pixelFallback=await ensureZXing();
  let native=null;if(typeof globalThis.BarcodeDetector==='function'){try{native=new BarcodeDetector({formats:['qr_code']});}catch{}}
  if(!fast&&!pixelFallback&&!native)throw new QRScanError('scanUnsupported');
  const max=Math.max(bitmap.width,bitmap.height);let codes=[];
  for(const angle of [0,90,180,270]){for(const side of [Math.min(1600,max),Math.min(2400,max)]){
   const canvas=transformedCanvas(bitmap,angle,side/max);
   if(fast){try{const ctx=canvas.getContext('2d',{willReadFrequently:true});const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);const qr=fast(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'});if(qr?.data)codes.push(qr.data.trim());}catch{}}
   if(!codes.length&&pixelFallback){try{const reader=new pixelFallback.BrowserQRCodeReader();const result=await reader.decodeFromImageUrl(canvas.toDataURL('image/png'));if(result?.getText())codes.push(result.getText().trim());}catch{}}
   if(!codes.length&&native){try{const results=await native.detect(canvas);codes=results.map(r=>(r.rawValue||'').trim()).filter(Boolean);}catch{}}
   if(codes.length)return [...new Set(codes)].filter(Boolean);
  }}
  throw new QRScanError('scanNotFound');
 }finally{bitmap.close?.();}
}
