import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CatalogService} from '../js/services/catalog-service.js';
import {decodeQRPhoto,QRScanError} from '../js/scanners/qr-scanner.js';
import {foodScreen} from '../js/ui/screens/food.js';
import {seed} from '../js/data/seed.js';
import {setLanguage} from '../js/i18n/index.js';

const catalogData=JSON.parse(readFileSync(new URL('../data/receipts.json',import.meta.url),'utf8'));
const source=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
const scannerSource=readFileSync(new URL('../js/scanners/qr-scanner.js',import.meta.url),'utf8');
const foodSource=readFileSync(new URL('../js/ui/screens/food.js',import.meta.url),'utf8');
const catalog=new CatalogService();catalog.receipts=catalogData.receipts;

function mockScanner(callback){
 const before={jsQR:globalThis.jsQR,BarcodeDetector:globalThis.BarcodeDetector,createImageBitmap:globalThis.createImageBitmap,document:globalThis.document};
 let passes=0,closed=0;
 globalThis.jsQR=(pixels,w,h)=>callback({pixels,w,h,pass:++passes});
 delete globalThis.BarcodeDetector;
 globalThis.createImageBitmap=async()=>({width:1200,height:1600,close:()=>{closed++;}});
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');return {
  width:0,height:0,getContext(){return {translate(){},rotate(){},drawImage(){},getImageData(_,__,w,h){return {data:new Uint8ClampedArray(4),width:w,height:h};}};}}
 }};
 return {get passes(){return passes;},get closed(){return closed;},restore(){for(const [key,value] of Object.entries(before)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}};
}

test('the actual eight classroom receipt IDs resolve to receipt item arrays (no seeded user food)',()=>{
 assert.equal(catalog.receipts.length,8);
 for(const receipt of catalog.receipts){
  assert.ok(receipt.qr_payload.startsWith('foodwise:receipt:v1:'));
  assert.equal(catalog.receipt(receipt.qr_payload),receipt);
  const rows=catalog.receiptRows(receipt,()=> 'id');
  assert.equal(rows.length,receipt.items.length);
  assert.ok(rows.every(row=>row.name&&row.quantity));
 }
 assert.equal(seed().foodItems.length,0);
 assert.equal(catalog.receipt('Unknown QR Code'),null);
});

test('CLOES FW-R01 QR yields five review rows, not a blank Add Missing Item screen',()=>{
 const receipt=catalog.receipt('foodwise:receipt:v1:FW-R01');
 assert.equal(receipt.store,'CLOES');
 const rows=catalog.receiptRows(receipt,()=> 'test');
 assert.equal(rows.length,5);
 assert.deepEqual(rows.map(r=>r.name),['Full Cream Milk 1L','Wholemeal Bread','Free Range Eggs 6pk','Bananas 1kg','Greek Yoghurt 700g']);
 setLanguage('en');
 const html=foodScreen({s:seed(),r:{page:'receipt'},e:{type:'receipt',rows,imageUrl:'blob:real-photo',photoStatus:'ready',photoIssue:'',reviewStep:'review',storeName:receipt.store,receiptId:receipt.receipt_id,receiptTotal:receipt.total},filters:{}});
 assert.match(html,/Items from this receipt/);
 assert.match(html,/Full Cream Milk/);
 assert.match(html,/Greek Yoghurt/);
 assert.match(html,/data-action="receipt-review-next"/);
 assert.match(html,/data-action="receipt-add"/);
});

test('scanning screen waits for QR results before offering missing-item fallback',()=>{
 const html=foodScreen({s:seed(),r:{page:'receipt'},e:{type:'receipt',rows:[],imageUrl:'blob:captured',photoStatus:'scanning',photoIssue:''},filters:{}});
 assert.match(html,/Scanning receipt/);
 assert.doesNotMatch(html,/data-action="receipt-add"/);
});

test('QR scanner reads a fixture ID from photograph pixels using the iPhone-compatible jsQR path',async()=>{
 const mock=mockScanner(({pass})=>pass===2?{data:'foodwise:receipt:v1:FW-R01'}:null);
 try{
  const codes=await decodeQRPhoto({type:'image/jpeg',size:1234,name:'receipt.jpg'});
  assert.deepEqual(codes,['foodwise:receipt:v1:FW-R01']);
  assert.equal(mock.passes,2);
  assert.equal(mock.closed,1);
 }finally{mock.restore();}
});

test('QR decoder handles invalid inputs explicitly and does not claim recognition',async()=>{
 await assert.rejects(decodeQRPhoto({type:'text/plain',size:50,name:'receipt.txt'}),error=>error instanceof QRScanError&&error.code==='scanImageType');
 await assert.rejects(decodeQRPhoto({type:'image/png',size:19*1024*1024,name:'too-big.png'}),error=>error.code==='scanImageSize');
});

test('QR recognition tries receipt-bottom crops and bounds library loads',()=>{
 assert.match(scannerSource,/\[0,\.38,1,\.62,1700,0\]/);
 assert.match(scannerSource,/Promise\.any/);
 assert.match(scannerSource,/5500/);
 assert.match(scannerSource,/scanUnsupported/);
 assert.match(source,/catalog\.receipt\(code\)/);
 assert.match(source,/rows:catalog\.receiptRows\(match,uid\)/);
 assert.match(foodSource,/data-action="receipt-add"/);
 assert.match(source,/scanConfirmedReceipt/);
});
