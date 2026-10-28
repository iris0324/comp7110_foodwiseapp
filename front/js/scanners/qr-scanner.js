/** Decode QR codes directly from the user's photo, on-device.
 * No OCR or inferred store/items: only a genuinely decoded QR can populate a receipt.
 * jsQR is primary on iOS; native BarcodeDetector and ZXing are independent fallbacks.
 */
export class QRScanError extends Error { constructor(code) { super(code); this.code=code; } }

let jsQRReady=null, zxingReady=null;
function loadScript(src,timeout=4500){
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');let settled=false;
  const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=null;script.onerror=null;if(error){script.remove();reject(error);}else resolve();};
  const timer=setTimeout(()=>finish(Error('QR library load timed out')),timeout);
  script.src=src;script.async=true;script.onload=()=>finish();script.onerror=()=>finish(Error('QR library unavailable'));
  document.head.append(script);
 });
}
async function ensureJsQR(){
 if(typeof globalThis.jsQR==='function')return globalThis.jsQR;
 if(!jsQRReady)jsQRReady=(async()=>{
  try{await loadScript('js/vendor/jsQR.js',1200);}catch{}
  if(typeof globalThis.jsQR==='function')return globalThis.jsQR;
  // Independent hosts: an iPhone may be unable to reach one CDN.
  await Promise.any([
   loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',5500).then(()=>{if(typeof globalThis.jsQR!=='function')throw Error('jsQR not loaded');return globalThis.jsQR;}),
   loadScript('https://unpkg.com/jsqr@1.4.0/dist/jsQR.js',5500).then(()=>{if(typeof globalThis.jsQR!=='function')throw Error('jsQR not loaded');return globalThis.jsQR;})
  ]).catch(()=>null);
  return typeof globalThis.jsQR==='function'?globalThis.jsQR:null;
 })();
 const result=await jsQRReady;
 if(!result)jsQRReady=null; // retry a temporary network failure next time
 return result;
}
async function ensureZXing(){
 if(globalThis.ZXing?.BrowserQRCodeReader)return globalThis.ZXing;
 if(!zxingReady)zxingReady=(async()=>{
  for(const src of ['js/vendor/zxing.min.js','https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js']){
   try{await loadScript(src,src.startsWith('js/')?1200:5000);if(globalThis.ZXing?.BrowserQRCodeReader)return globalThis.ZXing;}catch{}
  }
  return null;
 })();
 const result=await zxingReady;if(!result)zxingReady=null;return result;
}
async function openImage(file){
 try{const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});return {image:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()};}
 catch{
  // Some iPhones can display HEIC/JPEG in an <img> but do not support createImageBitmap.
  const url=URL.createObjectURL(file),img=new Image();
  try{img.src=url;await img.decode();if(!img.naturalWidth)throw Error('image');return {image:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>URL.revokeObjectURL(url)};}
  catch{URL.revokeObjectURL(url);throw new QRScanError('scanUnreadable');}
 }
}
function makeCanvas(bitmap,region,maxSide=1400,rotation=0){
 const [rx,ry,rw,rh]=region;
 const sx=Math.round(rx*bitmap.width),sy=Math.round(ry*bitmap.height);
 const sw=Math.max(1,Math.min(bitmap.width-sx,Math.round(rw*bitmap.width)));
 const sh=Math.max(1,Math.min(bitmap.height-sy,Math.round(rh*bitmap.height)));
 const scale=Math.min(1,maxSide/Math.max(sw,sh));
 const w=Math.max(1,Math.round(sw*scale)),h=Math.max(1,Math.round(sh*scale));
 const rotated=rotation%180!==0;
 const canvas=document.createElement('canvas');canvas.width=rotated?h:w;canvas.height=rotated?w:h;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new QRScanError('scanUnreadable');
 ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);
 ctx.drawImage(bitmap.image,sx,sy,sw,sh,-w/2,-h/2,w,h);
 return canvas;
}
function scanJsQR(canvas,decoder){
 if(!decoder)return [];
 try{const ctx=canvas.getContext('2d',{willReadFrequently:true});const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  const result=decoder(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'});
  return result?.data?[String(result.data).trim()]:[];
 }catch{return [];}
}
async function scanNative(canvas,detector){
 if(!detector)return [];
 try{return (await detector.detect(canvas)).map(x=>String(x.rawValue||'').trim()).filter(Boolean);}catch{return [];}
}
async function scanZXing(canvas,zxing){
 if(!zxing)return [];
 try{const reader=new zxing.BrowserQRCodeReader();const result=await Promise.race([
   reader.decodeFromImageUrl(canvas.toDataURL('image/png')),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('ZXing timeout')),2400))
  ]);return result?.getText?.()?[String(result.getText()).trim()]:[];
 }catch{return [];}
}
const delayFrame=()=>new Promise(resolve=>{if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>resolve());else setTimeout(resolve,0);});
export async function decodeQRPhoto(file){
 if(!file||!(file.type?.startsWith('image/')||/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name||'')))throw new QRScanError('scanImageType');
 if(file.size>18*1024*1024)throw new QRScanError('scanImageSize');
 const image=await openImage(file);
 try{
  let native=null;
  if(typeof globalThis.BarcodeDetector==='function'){try{native=new BarcodeDetector({formats:['qr_code']});}catch{}}
  // Start loading jsQR in parallel. Native detection need not wait for a CDN.
  const fastPromise=ensureJsQR();
  const viewports=[
   [0,0,1,1,1350,0],
   [0,.38,1,.62,1700,0], // receipt QR codes are usually near the bottom
   [0,.35,.62,.65,1600,0],
   [.38,.35,.62,.65,1600,0],
   [0,0,1,1,1550,90],
   [0,0,1,1,1550,270]
  ];
  if(native){for(const [x,y,w,h,max,rotation] of viewports.slice(0,2)){
   const codes=await scanNative(makeCanvas(image,[x,y,w,h],max,rotation),native);
   if(codes.length)return [...new Set(codes)];
  }}
  const fast=await fastPromise;
  if(fast){
   for(const [x,y,w,h,max,rotation] of viewports){
    const canvas=makeCanvas(image,[x,y,w,h],max,rotation);
    const codes=scanJsQR(canvas,fast).filter(Boolean);
    if(codes.length)return [...new Set(codes)];
    await delayFrame(); // keep the phone UI responsive between image scans
   }
  }
  // ZXing fallback is bounded, not retried eight times on huge screenshots.
  const zxing=await ensureZXing();
  if(zxing){for(const [x,y,w,h,max] of viewports.slice(0,3)){
   const codes=await scanZXing(makeCanvas(image,[x,y,w,h],max),zxing);
   if(codes.length)return [...new Set(codes)];
   await delayFrame();
  }}
  if(!fast&&!native&&!zxing)throw new QRScanError('scanUnsupported');
  throw new QRScanError('scanNotFound');
 }finally{image.close();}
}
