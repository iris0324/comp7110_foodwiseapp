import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {seed} from '../js/data/seed.js';
import {foodScreen} from '../js/ui/screens/food.js?v=13.1';
import {ghostScreen} from '../js/ui/screens/ghost-v8.js?v=13.1';
import {setLanguage} from '../js/i18n/index.js';

const source=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles/photo-v13-1.css',import.meta.url),'utf8');
const photoHandlers=source.slice(source.indexOf('function photoStillCurrent('),source.indexOf('function applyCatalogProduct(id){'));
function harness(kind,scan){
 const reference=kind==='receipt'?{type:'receipt',id:'receipt-1',rows:[],imageUrl:null,blob:null}:{type:'cart',rows:[{cartItemId:'cart-1',name:'',quantity:'1',price:'',note:''}],productPhotoUrl:null};
 const events=[];
 const context={
  editor:reference,current:{page:kind==='receipt'?'receipt-camera':'product-camera',id:kind==='receipt'?'':'cart-1'},previewToken:0,message:'',
  receiptServices:{decode:async()=> 'blob:photo-preview'},decodeQRPhoto:scan,
  catalog:{receipt:(code)=>code==='KNOWN'?{qr_payload:'KNOWN',receipt_id:'id',store:'test',total:4}:null,receiptRows:()=>[{name:'Apples',quantity:'1',category:'produce'}],product:(code)=>code==='KNOWN'?{id:'GB-P01'}:null,cartRow:()=>({cartItemId:'cart-1',name:'Known',quantity:'1',price:'4'})},
  store:{state:{receiptImports:[]},pending:false},
  uid:()=> 'photo-123',stopCamera:()=>events.push('stopCamera'),
  render:()=>events.push({render:context.current.page,photo:context.editor?.imageUrl||context.editor?.productPhotoUrl,status:context.editor?.photoStatus}),
  saveDraft:async()=>events.push('saved-draft'),
  history:{pushState:()=>events.push('pushState')},path:(page,id)=>`#${page}/${id}`,
  window:{scrollTo:()=>{}},
  URL:{revokeObjectURL:()=>events.push('revoke'),createObjectURL:()=> 'blob:product'},
  receiptServicesError:Error,
  photoHandlers
 };
 vm.runInNewContext(photoHandlers,context,{filename:'main-photo-functions.js'});
 return {context,events,reference};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('Food Management: immediately displays captured receipt before QR recognition finishes',async()=>{
 let resolveScan;const {context,events,reference}=harness('receipt',()=>new Promise(resolve=>{resolveScan=resolve;}));
 const task=context.chooseImage({type:'image/png',name:'receipt.png'});
 await tick();
 assert.equal(context.current.page,'receipt');
 assert.equal(reference.imageUrl,'blob:photo-preview');
 assert.equal(reference.photoStatus,'scanning');
 assert.ok(events.some(x=>x.render==='receipt'&&x.photo==='blob:photo-preview'));
 resolveScan([]);await task;
 assert.equal(reference.imageUrl,'blob:photo-preview','an unrecognised QR cannot discard a successful photo');
 assert.equal(reference.photoIssue,'no_match');
 assert.equal(events.includes('saved-draft'),true,'receipt image auto-saved locally');
});
test('Food Management: QR exception preserves the receipt photo and allows a manual review',async()=>{
 const {context,reference}=harness('receipt',async()=>{throw Object.assign(new Error('scanNotFound'),{code:'scanNotFound'});});
 await context.chooseImage({type:'image/jpeg',name:'photo.jpg'});
 assert.equal(reference.photoIssue,'no_match');
 assert.equal(reference.imageUrl,'blob:photo-preview');
 setLanguage('en');
 const html=foodScreen({s:seed(),r:{page:'receipt'},e:reference,filters:{}});
 assert.match(html,/Your receipt photo/);
 assert.match(html,/Retake Photo/);
 assert.match(html,/data-action="receipt-add"/);
 assert.doesNotMatch(html,/data-action="receipt-confirm"/);
});
test('Food Management: recognised receipt retains the photo and exposes review and confirm',async()=>{
 const {context,reference}=harness('receipt',async()=>['KNOWN']);
 await context.chooseImage({type:'image/jpeg',name:'receipt.jpg'});
 assert.equal(reference.rows.length,1);
 assert.equal(reference.imageUrl,'blob:photo-preview');
 assert.equal(reference.qrPayload,'KNOWN');
 const html=foodScreen({s:seed(),r:{page:'receipt'},e:reference,filters:{}});
 assert.match(html,/data-action="receipt-confirm"/);
});
test('Ghost Buy: unrecognised product keeps photo, opens review after camera, no silent reset',async()=>{
 const {context,events,reference}=harness('product',async()=>[]);
 await context.chooseProductImage({type:'image/jpeg',name:'chips.jpg'});
 assert.equal(context.current.page,'product-review');
 assert.equal(reference.productPhotoUrl,'blob:photo-preview');
 assert.equal(reference.rows[0].photoId,'photo-123');
 assert.equal(reference.photoIssue,'no_match');
 assert.ok(!events.includes('revoke'));
 setLanguage('en');
 const html=ghostScreen({s:seed(),r:{page:'product-review',id:'cart-1'},e:reference});
 assert.match(html,/Your product photo/);
 assert.match(html,/Retake Photo/);
 assert.match(html,/data-form="ghost-add"/);
 assert.match(html,/Estimated Price/);
});
test('Both camera inputs support genuine native capture and independent album selection',()=>{
 setLanguage('en');
 const r=foodScreen({s:seed(),r:{page:'receipt-camera'},e:{},filters:{}});
 const p=ghostScreen({s:seed(),r:{page:'product-camera',id:'cart-1'},e:{rows:[]}});
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(r,/for="receipt-camera"/);
 assert.match(r,/for="receipt-image"/);
 assert.match(p,/for="product-camera"/);
 assert.match(p,/for="product-image"/);
 assert.match(html,/id="receipt-camera"[^>]*capture="environment"/);
 assert.match(html,/id="receipt-image"[^>]*type="file"/);
 assert.match(html,/id="product-camera"[^>]*capture="environment"/);
 assert.match(html,/id="product-image"[^>]*type="file"/);
 assert.match(css,/\.camera-bar\.native-capture \.native-shutter/);
});
test('Only Add Food modal primary button receives the new single-outline style',()=>{
 assert.match(source,/class="\$\{m\.type==='add-food'\?'add-food-dialog'/);
 assert.match(css,/\.add-food-choices \.button\.coral/);
 assert.match(css,/box-shadow:none!important/);
 assert.ok(source.includes("if(m.type==='add-food')"));
});
test('Ghost Buy locally persists accepted camera photo together with cart rows',()=>{
 assert.match(source,/photoMedia=e\.productBlob&&e\.productImageId/);
 assert.match(source,/store\.commit\('cart_save',\{rows:e\.rows\},photoMedia,success\)/);
 assert.match(source,/restoreCartPhotos\(editor\)/);
});
