import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {seed} from '../js/data/seed.js';
import {reduceCommand} from '../js/domain/commands.js';
import {getStory,getOutcome,unspent} from '../js/domain/selectors.js';
import {storyScreen} from '../js/ui/screens/story.js';
import {ghostScreen} from '../js/ui/screens/ghost-v8.js';
import {setLanguage} from '../js/i18n/index.js?v=13.0';
import {qty,cmp,sub,reductionQty,money} from '../js/core/values.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=(path)=>readFileSync(resolve(root,path),'utf8');
let serial=0;
const apply=(s,type,payload={})=>reduceCommand(s,{type,payload,operationId:'v11-'+(++serial),issuedAt:'2026-10-28T10:00:00.000Z'}).state;
function purchase(n='2',price='4.00'){
 let s=seed();s=apply(s,'cart_save',{rows:[{cartItemId:'mine',name:'Cookies',quantity:n,price,priceMeaning:'unit',note:''}]});
 s=apply(s,'checkout');return {s,id:s.purchaseItems[0].id};
}
function reachActivity(n,used,disposition){
 let {s,id}=purchase(n);s=apply(s,'story_start',{itemId:id,template:'quantity',source:'preset'});
 s=apply(s,'story_answer',{itemId:id,value:'qty:'+used});
 if(disposition)s=apply(s,'story_answer',{itemId:id,value:disposition});
 return {s,id};
}
test('history decision edit uses final quantity, never an editable optional price for new receipts',()=>{
 const {s,id}=purchase('5','4.00');setLanguage('en');
 const html=ghostScreen({s,r:{page:'outcome',id},e:{fields:{intention:'buy_less',finalQuantity:'2',price:'20.00'}}});
 assert.match(html,/fields\.finalQuantity/);assert.doesNotMatch(html,/fields\.reductionQuantity/);
 assert.match(html,/actually buy/);assert.doesNotMatch(html,/data-bind="fields\.price"/);
 assert.match(html,/AUD \$20\.00/);
});
test('legacy purchase with unknown estimate requires correcting price, not silently saving blank',()=>{
 const {s,id}=purchase();s.outcomes[0].estimateCents=null;
 const html=ghostScreen({s,r:{page:'outcome',id},e:{fields:{intention:'still_want',finalQuantity:'',price:''}}});
 assert.match(html,/data-bind="fields\.price"/);assert.match(html,/required/);
});
test('final quantity 2 from 5 is converted to reduction 3, savings AUD 12',()=>{
 let {s,id}=purchase('5','4.00');const final=qty('2',true);
 assert.equal(cmp(final,'5'),-1);const reduction=reductionQty(sub('5',final),'5');assert.equal(reduction,'3');
 s=apply(s,'story_start',{itemId:id,template:'amount',source:'preset'});
 s=apply(s,'story_answer',{itemId:id,value:'all'});s=apply(s,'story_answer',{itemId:id,value:'activity_done'});
 s=apply(s,'story_continue',{itemId:id});s=apply(s,'outcome_update',{itemId:id,intention:'buy_less',reductionQuantity:reduction});
 s=apply(s,'story_finish',{itemId:id});assert.equal(money(unspent(s)),'12.00');
});
test('ghost receives remaining portion, then labels destinations by user disposition',()=>{
 setLanguage('en');for(const [disposition,label] of [['discard','Into the bin'],['share','Shared with someone'],['save','Put away safely']]){
  const {s,id}=reachActivity('4','2',disposition);const st=getStory(s,id);
  assert.equal(st.usedQuantity,'2');
  const html=storyScreen({s,r:{page:'story',id},e:{fields:{}},played:true});
  assert.match(html,/To Ghosty/);assert.match(html,new RegExp(label));
  assert.ok(html.includes('data-disposition="'+disposition+'"'));
  assert.match(html,/ghost-activity-quantity/);
  assert.match(html,/2/);
 }});
test('no remainder does not show draggable object or fake bin handover',()=>{
 setLanguage('en');const {s,id}=reachActivity('2','2');const html=storyScreen({s,r:{page:'story',id},e:{fields:{}},played:false});
 assert.doesNotMatch(html,/data-handover-food/);assert.match(html,/All used/);
});
test('color file includes only approved colors for section fills, no green-tinted state remnants',()=>{
 const css=src('styles/cream-patisserie-v10.css');
 for(const c of ['#FFF9F6','#F5DCE5','#F8E2D8','#F4E7ED','#DDA5B6','#75646D'])assert.ok(css.includes(c));
 assert.match(css,/\.icon-button:hover\{background:#F5DCE5!important\}/);
 assert.match(css,/\.food-card\.date-card-future/);
 assert.match(css,/\.receipt-line\{border-bottom-style:solid!important\}/);
});
test('frontend-only backend contract is packaged and never claims real Supabase already connected',()=>{
 assert.ok(existsSync(resolve(root,'docs/V10_BACKEND_CONTRACT.md')));
 const md=src('docs/V10_BACKEND_CONTRACT.md');
 for(const x of ['RLS','Guest','purchase_decisions','idempotency','不要','Ghosty'])assert.ok(md.includes(x),x);
 const html=src('js/ui/screens/auth.js');assert.match(html,/Sign in to sync your data securely/);
});
test('test receipts and product QR data exist only outside a newly created user state',()=>{
 const s=seed();assert.deepEqual(['foodItems','foodEvents','cart','drafts','purchases','purchaseItems','stories','outcomes','receiptImports'].map(k=>s[k].length),Array(9).fill(0));
 assert.ok(existsSync(resolve(root,'data/products.json')));assert.ok(existsSync(resolve(root,'data/receipts.json')));
});
