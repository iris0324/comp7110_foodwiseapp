/** FoodWise receipt QR scanner.
 * Reads the pixels of a user-selected photo locally. The eight classroom QR
 * payloads are decoded from actual images; catalog matching happens afterward.
 * Does not claim to OCR arbitrary supermarket receipts.
 */
export class QRScanError extends Error {
 constructor(code){super(code);this.code=code;}
}

let jsQRReady=null;
function loadScript(src,timeout=4500){
 return new Promise((resolve,reject)=>{
  if(typeof document==='undefined'){reject(Error('No document'));return;}
  const script=document.createElement('script');let settled=false;
  const timer=setTimeout(()=>finish(Error('QR decoder load timed out')),timeout);
  function finish(error){
   if(settled)return;
   settled=true;clearTimeout(timer);script.onload=null;script.onerror=null;
   if(error){script.remove();reject(error);}else resolve();
  }
  script.src=src;script.async=true;
  script.onload=()=>finish();script.onerror=()=>finish(Error('QR decoder unavailable'));
  document.head.append(script);
 });
}
async function ensureJsQR(){
 if(typeof globalThis.jsQR==='function')return globalThis.jsQR;
 if(!jsQRReady)jsQRReady=(async()=>{
  try { await loadScript('js/vendor/jsQR.js',2500); }catch{}
  if(typeof globalThis.jsQR==='function')return globalThis.jsQR;
  // Local Live Server fallback only. The GitHub deployment ships jsQR locally.
  await Promise.any([
   loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',5500),
   loadScript('https://unpkg.com/jsqr@1.4.0/dist/jsQR.js',5500)
  ]).catch(()=>null);
  return typeof globalThis.jsQR==='function'?globalThis.jsQR:null;
 })();
 const result=await jsQRReady;
 if(!result)jsQRReady=null;
 return result;
}
async function openImage(file){
 try {
  if(typeof createImageBitmap==='function'){
   const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
   return {image:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()};
  }
 }catch{}
 const url=URL.createObjectURL(file),img=new Image();
 try {
  img.src=url;
  // Safari sometimes does not implement decode(), but onload still works.
  if(typeof img.decode==='function') await img.decode();
  else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
  if(!img.naturalWidth||!img.naturalHeight)throw Error('invalid dimensions');
  return {image:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>URL.revokeObjectURL(url)};
 }catch{
  URL.revokeObjectURL(url);throw new QRScanError('scanUnreadable');
 }
}
function makeCanvas(image,region,maxSide=1400,rotation=0){
 const [rx,ry,rw,rh]=region;
 const sx=Math.round(rx*image.width),sy=Math.round(ry*image.height);
 const sw=Math.max(1,Math.min(image.width-sx,Math.round(rw*image.width)));
 const sh=Math.max(1,Math.min(image.height-sy,Math.round(rh*image.height)));
 const scale=Math.min(1,maxSide/Math.max(sw,sh));
 const w=Math.max(1,Math.round(sw*scale)),h=Math.max(1,Math.round(sh*scale));
 const rotated=rotation%180!==0;
 const canvas=document.createElement('canvas');
 canvas.width=rotated?h:w;canvas.height=rotated?w:h;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw new QRScanError('scanUnreadable');
 ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);
 ctx.drawImage(image.image,sx,sy,sw,sh,-w/2,-h/2,w,h);
 return canvas;
}
function pixelData(canvas){
 return canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height);
}
function scanJsQR(canvas,decoder){
 if(!decoder)return [];
 try {
  const pixels=pixelData(canvas);
  const result=decoder(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'});
  return result?.data?[String(result.data).trim()]:[];
 }catch{return [];}
}
async function scanNative(canvas,detector){
 if(!detector)return [];
 try {
  const values=await detector.detect(canvas);
  return values.map(x=>String(x.rawValue||'').trim()).filter(Boolean);
 }catch{return [];}
}
function makeWorker(){
 if(typeof Worker==='undefined')return null;
 try {return new Worker(new URL('./qr-worker.js',import.meta.url),{type:'classic'});}
 catch{return null;}
}
let workerId=0;
function scanWorker(worker,canvas){
 return new Promise(resolve=>{
  let done=false;
  const id=++workerId;
  const finish=value=>{
   if(done)return;done=true;clearTimeout(timer);
   worker.removeEventListener('message',onMessage);worker.removeEventListener('error',onError);
   resolve(value);
  };
  const onMessage=e=>{
   if(e.data?.id!==id)return;
   finish(e.data.status==='found'?[String(e.data.value).trim()]:['unavailable','error'].includes(e.data.status)?null:[]);
  };
  const onError=()=>finish(null);
  const timer=setTimeout(()=>finish(null),4200);
  worker.addEventListener('message',onMessage);
  worker.addEventListener('error',onError);
  try {
   const pixels=pixelData(canvas);
   worker.postMessage({id,width:pixels.width,height:pixels.height,pixels:pixels.data},[pixels.data.buffer]);
  }catch{finish(null);}
 });
}
const delayFrame=()=>new Promise(resolve=>{
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>resolve());
 else setTimeout(resolve,0);
});

/** Scan a photo for QR payloads. Errors never destroy the calling page's photo. */
export async function decodeQRPhoto(file){
 if(!file||!(file.type?.startsWith('image/')||/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name||'')))throw new QRScanError('scanImageType');
 if(file.size>18*1024*1024)throw new QRScanError('scanImageSize');
 const image=await openImage(file);
 const deadline=Date.now()+17000; // never spin indefinitely on a mobile device
 const worker=makeWorker();
 try {
  let native=null;
  if(typeof globalThis.BarcodeDetector==='function'){
   try{native=new globalThis.BarcodeDetector({formats:['qr_code']});}catch{}
  }
  // Order is important: prioritize the lower part of a full receipt photo.
  const viewports=[
   [0,0,1,1,1350,0],
   [0,.38,1,.62,1700,0],
   [0,.35,.62,.65,1600,0],
   [.38,.35,.62,.65,1600,0],
   [0,.52,1,.48,1850,0],
   [0,0,1,1,1550,90],
   [0,0,1,1,1550,270]
  ];
  if(native){
   for(const [x,y,w,h,max,rotation] of viewports.slice(0,3)){
    const canvas=makeCanvas(image,[x,y,w,h],max,rotation);
    const codes=await scanNative(canvas,native);canvas.width=canvas.height=0;
    if(codes.length)return [...new Set(codes)];
   }
  }
  let workerAvailable=!!worker;
  if(worker){
   for(const [x,y,w,h,max,rotation] of viewports){
    if(Date.now()>deadline)throw new QRScanError('scanNotFound');
    const canvas=makeCanvas(image,[x,y,w,h],max,rotation);
    const codes=await scanWorker(worker,canvas);canvas.width=canvas.height=0;
    if(codes===null){workerAvailable=false;break;}
    if(codes.length)return [...new Set(codes)];
    await delayFrame();
   }
  }
  if(workerAvailable)throw new QRScanError('scanNotFound');
  // Browser/Live Server fallback. GitHub Pages normally uses the bundled worker.
  const decoder=await ensureJsQR();
  if(!decoder){
   if(native)throw new QRScanError('scanNotFound');
   throw new QRScanError('scanUnsupported');
  }
  for(const [x,y,w,h,max,rotation] of viewports){
   if(Date.now()>deadline)throw new QRScanError('scanNotFound');
   const canvas=makeCanvas(image,[x,y,w,h],max,rotation);
   const codes=scanJsQR(canvas,decoder);canvas.width=canvas.height=0;
   if(codes.length)return [...new Set(codes)];
   await delayFrame();
  }
  throw new QRScanError('scanNotFound');
 }finally{worker?.terminate();image.close();}
}
