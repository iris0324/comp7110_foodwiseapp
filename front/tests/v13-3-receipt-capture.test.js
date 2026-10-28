import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {CatalogService} from '../js/services/catalog-service.js';
import {decodeReceipt} from '../js/domain/receipt.js';

const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const html=read('index.html'),main=read('js/main.js'),food=read('js/ui/screens/food.js');
const ghost=read('js/ui/screens/ghost-v8.js'),scanner=read('js/scanners/qr-scanner.js');
const worker=read('js/scanners/qr-worker.js');
const deploy=read('.github/workflows/deploy-pages.yml');

test('photograph becomes visible immediately: preview creation never waits for QR decode',async()=>{
 const old=globalThis.URL;
 globalThis.URL={createObjectURL:f=>'blob:test-'+f.name};
 try{
  const preview=await decodeReceipt({name:'receipt.jpg',type:'image/jpeg',size:1200});
  assert.equal(preview,'blob:test-receipt.jpg');
  assert.match(main,/url=await receiptServices\.decode\(file\)/);
  const previewIndex=main.indexOf('url=await receiptServices.decode(file)');
  const scanIndex=main.indexOf('const codes=await decodeQRPhoto(file)',previewIndex);
  assert.ok(previewIndex>0 && scanIndex>previewIndex);
  assert.match(main,/photoStatus:'scanning'/);
  assert.match(main,/photoStatus='ready';ref\.photoIssue=photoMessage\(error\)/);
 }finally{globalThis.URL=old;}
});

test('iPhone photo input is persistent and not destroyed during app rerenders',()=>{
 const inputs=['receipt-camera','receipt-image','product-camera','product-image'];
 for(const id of inputs){
  assert.match(html,new RegExp('id="'+id+'"[^>]*type="file"'));
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 }
 assert.match(html,/<!-- Persistent file inputs/);
 assert.match(food,/for="receipt-camera"/);
 assert.match(food,/for="receipt-image"/);
 assert.match(ghost,/for="product-camera"/);
 assert.match(ghost,/for="product-image"/);
 assert.match(main,/event\.target\.value=''/);
 assert.match(read('styles/receipt-v13-3.css'),/persistent-photo-input/);
});

test('scanner uses on-device worker and cannot wait indefinitely for a scan',()=>{
 assert.match(scanner,/new Worker\(new URL\('\.\/qr-worker\.js',import\.meta\.url\)/);
 assert.match(worker,/importScripts\('\.\.\/vendor\/jsQR\.js'\)/);
 assert.match(scanner,/Date\.now\(\)\+17000/);
 assert.match(scanner,/worker\.postMessage\(/);
 assert.match(scanner,/worker\?\.terminate\(\)/);
 assert.match(scanner,/scanUnsupported/);
 assert.match(scanner,/scanNotFound/);
 assert.match(main,/function photoMessage\(error\)/);
});

test('published GitHub Pages includes a real local QR decoder, not only README',()=>{
 assert.match(deploy,/Bundle QR decoder for iPhone and Android/);
 assert.match(deploy,/jsqr@1\.4\.0\/dist\/jsQR\.js/);
 assert.match(deploy,/front\/js\/vendor\/jsQR\.js/);
 assert.match(deploy,/test -s front\/js\/vendor\/jsQR\.js/);
 assert.match(deploy,/path: \.\/front/);
 assert.match(html,/js\/main\.js\?v=13\.3/);
});

test('eight genuine QR fixture image files match the eight receipt IDs in catalog',()=>{
 const fixture=JSON.parse(read('data/receipts.json')).receipts;
 assert.equal(fixture.length,8);
 const catalog=new CatalogService();catalog.receipts=fixture;
 fixture.forEach(receipt=>{
  const file='tests/receipt-qr-images/qr_'+receipt.receipt_id+'.png';
  assert.ok(existsSync(new URL(file,root)));
  const bytes=readFileSync(new URL(file,root));
  assert.equal(bytes[0],137);assert.equal(bytes[1],80); // PNG signature
  assert.equal(catalog.receipt(receipt.qr_payload)?.receipt_id,receipt.receipt_id);
  assert.ok(catalog.receiptRows(receipt,()=> 'id').length>0);
 });
});
