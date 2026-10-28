import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {seed} from '../js/data/seed.js';
import {foodScreen} from '../js/ui/screens/food.js';
import {ghostScreen} from '../js/ui/screens/ghost-v8.js';
import {CatalogService} from '../js/services/catalog-service.js';
import {cartFields,foodFields,reduceCommand} from '../js/domain/commands.js';
import {route,path} from '../js/app/router.js';
import {setLanguage} from '../js/i18n/index.js?v=13.0';
const catalog=new CatalogService();
catalog.receipts=JSON.parse(readFileSync(new URL('../data/receipts.json',import.meta.url),'utf8')).receipts;
catalog.products=JSON.parse(readFileSync(new URL('../data/products.json',import.meta.url),'utf8')).products;
const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
const file=readFileSync(new URL('../js/ui/screens/food.js',import.meta.url),'utf8');
const ghostSource=readFileSync(new URL('../js/ui/screens/ghost-v8.js',import.meta.url),'utf8');
const data={food:seed(),cart:seed()};
function receiptE(step,language='en'){
 setLanguage(language);const receipt=catalog.receipt('foodwise:receipt:v1:FW-R01');
 return {type:'receipt',id:'capture-1',imageUrl:'blob:receipt',photoStatus:'ready',photoIssue:'',reviewStep:step,rows:catalog.receiptRows(receipt,()=> 'i'),qrPayload:receipt.qr_payload,receiptId:receipt.receipt_id,storeName:receipt.store,receiptTotal:receipt.total};
}
const foodHtml=(e,page='receipt',s=data.food)=>foodScreen({s,r:{page,id:'capture-1'},e,filters:{search:'',category:'',status:'available'}});
function productE(step,language='en'){
 setLanguage(language);const p=catalog.getProduct('GB-P01');
 return {type:'cart',productStep:step,photoStatus:'ready',photoIssue:'',productPhotoUrl:'blob:choco',rows:[catalog.cartRow(p,()=> 'cart-1')]};
}
const productHtml=e=>ghostScreen({s:data.cart,r:{page:'product-review',id:'cart-1'},e});

test('receipt preview requires an explicit Confirm Photo click and contains no automatic products',()=>{
 const e=receiptE('photo');const html=foodHtml(e);
 assert.match(html,/Your receipt photo/);
 assert.match(html,/data-action="receipt-photo-confirm"/);
 assert.match(html,/Retake Photo/);
 assert.doesNotMatch(html,/Items from this receipt|data-action="receipt-review-next"/);
 assert.doesNotMatch(html,/Photo → Scan|Review Items|FW-R01|receipt:v1/);
});
test('receipt review auto-lists 5 recognized rows and only then offers edit, remove and add missing',()=>{
 const html=foodHtml(receiptE('review'));
 assert.equal((html.match(/class="flow-item-compact"/g)||[]).length,5);
 for(const n of ['Full Cream Milk 1L','Wholemeal Bread','Free Range Eggs 6pk','Bananas 1kg','Greek Yoghurt 700g'])assert.ok(html.includes(n));
 for(const a of ['receipt-add','receipt-remove','receipt-review-next'])assert.ok(html.includes(`data-action="${a}"`));
 assert.ok(html.includes('data-action="receipt-edit-row"'));
 assert.ok(html.includes('data-action="receipt-qty-up"'));
 assert.ok(html.includes('data-action="receipt-qty-down"'));
 const expanded=receiptE('review'); expanded.expandedRow=expanded.rows[0].id;
 const details=foodHtml(expanded);
 assert.ok(details.includes('data-bind="rows.0.name"'));
 assert.ok(details.includes('data-bind="rows.0.quantity"'));
 assert.doesNotMatch(html,/FW-R01|data-action="receipt-confirm"|Photo \/ Scan Receipt/);
});
test('receipt final confirmation is a distinct step; final Add to My Food is not exposed on review',()=>{
 const html=foodHtml(receiptE('confirm'));
 assert.match(html,/Confirm and Add to My Food/);
 assert.match(html,/data-action="receipt-confirm"/);
 assert.match(html,/data-action="receipt-edit-items"/);
 assert.doesNotMatch(html,/data-action="receipt-add"|data-bind="rows/);
});
test('successful receipt import is the only step that shows the success screen, with no receipt ID',()=>{
 const state=seed(), e=receiptE('confirm');
 const op=reduceCommand(state,{type:'receipt_confirm',payload:{id:e.id,rows:e.rows,imageId:'img',qrPayload:e.qrPayload,receiptId:e.receiptId,storeName:e.storeName,receiptTotal:e.receiptTotal},operationId:'confirmed-example',issuedAt:'2026-10-28T02:30:00Z'});
 assert.equal(op.result.foodIds.length,5);
 assert.equal(op.state.foodItems.length,5);
 const html=foodHtml(null,'receipt-success',op.state);
 assert.match(html,/Added to My Food!/);
 assert.match(html,/5 item\(s\)/);
 assert.match(html,/View My Food/);
 assert.match(html,/Add Another Receipt/);
 assert.doesNotMatch(html,/FW-R01/);
});
test('Ghost Buy photo requires confirmation before any QR scan or editable details',()=>{
 const html=productHtml(productE('photo'));
 assert.match(html,/Your product photo/);
 assert.match(html,/Confirm Photo/);
 assert.match(html,/Retake Photo/);
 assert.doesNotMatch(html,/Estimated Price|data-form="product-review-next"|data-action="product-confirm-add"/);
});
test('Ghost Buy details can be edited but must validate price before confirming',()=>{
 const e=productE('details');const html=productHtml(e);
 assert.match(html,/data-form="product-review-next"/);
 assert.match(html,/Estimated Price \(AUD\)/);
 assert.match(html,/data-bind="rows.0.name"/);
 assert.match(html,/data-bind="rows.0.unit"/);
 assert.match(html,/data-bind="rows.0.price"/);
 assert.match(html,/Confirm Item/);
 assert.doesNotMatch(html,/data-action="product-confirm-add"/);
 assert.throws(()=>cartFields({...e.rows[0],price:''}),/moneyError/);
});
test('Ghost Buy final confirmation summarizes exactly the checked product before cart save',()=>{
 const e=productE('confirm');const html=productHtml(e);
 assert.match(html,/Confirm Item for Your Cart/);
 assert.match(html,/ChocoPop/);
 assert.match(html,/AUD \$4\.50/);
 assert.match(html,/data-action="product-confirm-add"/);
 assert.match(html,/data-action="product-edit-items"/);
 assert.doesNotMatch(html,/Start Story|Checkout/);
 const clean=cartFields(e.rows[0]);assert.equal(clean.unit,'bar');assert.equal(clean.estimateCents,450);
});
test('new flow preserves English-only and Chinese-only button labels',()=>{
 for(const step of ['photo','review','confirm']){
  let en=foodHtml(receiptE(step,'en'));let zh=foodHtml(receiptE(step,'zh'));
  assert.doesNotMatch(en,/確認照片|補上遺漏商品|下一步：確認商品|加入我的食物/);
  assert.doesNotMatch(zh,/Confirm Photo|Add Missing Item|Next: Confirm Items|Add to My Food/);
 }
 for(const step of ['photo','details','confirm']){
  let en=productHtml(productE(step,'en'));let zh=productHtml(productE(step,'zh'));
  assert.doesNotMatch(en,/重新拍照|確認照片|確認商品|加入購物車/);
  assert.doesNotMatch(zh,/Retake Photo|Confirm Photo|Confirm Item|Add to Cart/);
 }
});
test('photo recognition failure stays at photo, keeps image and cannot add guessed food',()=>{
 const e=receiptE('photo');e.rows=[];e.photoIssue='no_match';
 const html=foodHtml(e);
 assert.match(html,/blob:receipt/);assert.match(html,/matching receipt QR code/);
 assert.doesNotMatch(html,/data-action="receipt-confirm"|data-action="receipt-review-next"/);
});
test('new routes and actions are wired without altering story or guest rules',()=>{
 assert.equal(route('#receipt-success/capture-1').page,'receipt-success');
 for(const action of ['receipt-photo-confirm','receipt-review-next','receipt-edit-items','receipt-another','product-photo-confirm','product-edit-items','product-confirm-add'])assert.ok(main.includes(`name==='${action}'`));
 assert.match(main,/async function scanConfirmedReceipt/);
 assert.match(main,/async function scanConfirmedProduct/);
 assert.match(main,/if\(editor.reviewStep!=='confirm'\)return/);
 assert.match(main,/if\(editor\?\.productStep!=='confirm'\)return/);
 assert.match(main,/navigateNow\('receipt-success',id\)/);
 assert.match(main,/navigateNow\('cart'\)/);
 assert.match(main,/guestEnteredThisLaunch=false/);
});
test('unmodified manual entry and separate Cart / Checkout / Story remain available',()=>{
 setLanguage('en');
 const manual=ghostScreen({s:seed(),r:{page:'ghost-add',id:'m'},e:{rows:[{cartItemId:'m',name:'',quantity:'1',price:'',note:'',priceMeaning:'total'}]}});
 assert.match(manual,/data-form="ghost-add"/);
 const cart=ghostScreen({s:seed(),r:{page:'cart'},e:{rows:[]}});
 assert.match(cart,/data-action="open-product-scan"/);
 assert.match(cart,/data-action="new-ghost"/);
});

test('receipt commit is forbidden before final confirmation; exactly one confirmation commits',async()=>{
 const actionSource=main.slice(main.indexOf('async function action(name,value){'),main.indexOf('async function submit(kind){'));
 let commits=[],navigations=[];
 const e=receiptE('review');
 const ctx={
  editor:e,store:{pending:false,status:'idle',state:{receiptImports:[],cart:[],purchaseItems:[],stories:[]},error:null,
   commit(type,payload,media,onDone){commits.push({type,payload,media});onDone?.({foodIds:['food1']});}},
  current:{page:'receipt',id:e.id},previewToken:0,
  navigateNow(...args){navigations.push(args);},
  render(){},foodFields,uid:()=> 'next',closeModal(){},message:'',
  scanConfirmedReceipt:async()=>{},scanConfirmedProduct:async()=>{},
  saveDraft:()=>{},localStorage:{removeItem(){}},
  clone:x=>structuredClone(x)
 };
 vm.runInNewContext(actionSource,ctx,{filename:'main-actions-approved.js'});
 await ctx.action('receipt-confirm');assert.equal(commits.length,0);
 ctx.editor.reviewStep='confirm';
 await ctx.action('receipt-confirm');
 assert.equal(commits.length,1);
 assert.equal(commits[0].type,'receipt_confirm');
 assert.equal(commits[0].payload.rows.length,5);
 assert.deepEqual(navigations[0],['receipt-success',e.id]);
});

test('Ghost Buy only saves after final Confirm to Cart and routes to existing cart',async()=>{
 const actionSource=main.slice(main.indexOf('async function action(name,value){'),main.indexOf('async function submit(kind){'));
 const e=productE('details');
 let saves=0,nav=[];
 const ctx={editor:e,store:{pending:false,status:'idle',state:{cart:[],receiptImports:[],purchaseItems:[],stories:[]},error:null},current:{page:'product-review',id:'cart-1'},previewToken:0,
  cartFields,render(){},navigateNow(...args){nav.push(args);},saveDraft(done){saves++;done?.();},localStorage:{removeItem(){}},message:''};
 vm.runInNewContext(actionSource,ctx,{filename:'main-actions-approved.js'});
 await ctx.action('product-confirm-add');assert.equal(saves,0);
 e.productStep='confirm';await ctx.action('product-confirm-add');assert.equal(saves,1);
 assert.deepEqual(nav[0],['cart']);
});
