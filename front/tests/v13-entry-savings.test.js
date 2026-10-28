import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seed} from '../js/data/seed.js';
import {reduceCommand} from '../js/domain/commands.js';
import {purchaseBreakdown,contribution,unspent} from '../js/domain/selectors.js';
import {entryPage,initialPage} from '../js/app/onboarding.js';
import {cartPricePreview,ghostScreen} from '../js/ui/screens/ghost-v8.js';
import {storyScreen,useAmountPreview,buyLessPreview} from '../js/ui/screens/story.js';
import {setLanguage} from '../js/i18n/index.js?v=13.0';
const path=new URL('../js/main.js',import.meta.url);
let seq=0;
function apply(s,type,payload={}){
 const result=reduceCommand(s,{type,payload,operationId:'v13-'+ ++seq,issuedAt:'2026-10-28T00:00:00.000Z'});
 return result.state;
}
function checkout({quantity='2',price='30.00',priceMeaning='total'}={}){
 let state=seed();
 state=apply(state,'cart_save',{rows:[{cartItemId:'cart-1',name:'Chips',quantity,price,priceMeaning}]});
 state=apply(state,'checkout');
 return {state,itemId:state.purchaseItems[0].id};
}
function finish(state,id,intention,reductionQuantity){
 state=apply(state,'outcome_update',{itemId:id,intention,...(reductionQuantity?{reductionQuantity}:{})});
 state.stories[0].status='completed';
 return state;
}
test('ENTRY: EVERY document open, including existing guest and all URL hashes, starts on Welcome',()=>{
 for(const page of ['home','food','ghost-home','story','history','savings-result','cart']){
  assert.equal(entryPage(page,false),'welcome');
  assert.equal(entryPage(page,'guest'),'welcome');
  assert.equal(entryPage(page,null),'welcome');
 }
 assert.equal(initialPage(),'welcome');
 assert.equal(entryPage('home',true),'home');
 const main=readFileSync(path,'utf8');
 assert.match(main,/async function boot\(\)[\s\S]*?guestEnteredThisLaunch=false;[\s\S]*?current=\{page:initialPage\(\),id:''\}/);
 assert.doesNotMatch(main,/localStorage\.setItem\(ONBOARDING_KEY,'guest'\)/);
});
test('PRICING: quantity 2 estimated TOTAL $30, Buy Less final 1, saves $15 and spends $15',()=>{
 let {state,itemId}=checkout();
 assert.equal(state.purchaseItems[0].estimateCents,3000);
 state=finish(state,itemId,'buy_less','1');
 const o=state.outcomes[0], it=state.purchaseItems[0];
 assert.deepEqual(purchaseBreakdown(o,it),{originalQuantity:'2',finalQuantity:'1',plannedTotalCents:3000,finalCostCents:1500,savedCents:1500});
 assert.equal(contribution(o,it),1500);
 assert.equal(unspent(state),1500);
 setLanguage('en');const html=ghostScreen({s:state,r:{page:'savings-result',id:itemId}});
 for(const text of ['AUD $15.00','Planned quantity','Final quantity','Original planned total','Final estimated cost','AUD $30.00'])assert.match(html,new RegExp(text.replaceAll('$','\\$')));
 assert.equal((html.match(/AUD \$15\.00/g)||[]).length>=2,true);
});
test('PRICING: unit $15 x 2 makes total $30; total $30 has same outcome',()=>{
 const {state,itemId}=checkout({price:'15.00',priceMeaning:'unit'});
 assert.equal(state.purchaseItems[0].estimateCents,3000);
 assert.match(cartPricePreview({quantity:'2',price:'15.00',priceMeaning:'unit'}),/AUD \$30\.00/);
 assert.match(cartPricePreview({quantity:'2',price:'30.00',priceMeaning:'total'}),/AUD \$30\.00/);
 assert.equal(contribution({intention:'buy_less',reductionQuantity:'1',estimateCents:3000},state.purchaseItems[0]),1500);
 assert.equal(itemId,state.purchaseItems[0].id);
});
test('PRICING: final 1 of 3 at total $30 saves $20; precise cents round once',()=>{
 let {state,itemId}=checkout({quantity:'3'});
 state=finish(state,itemId,'buy_less','2');
 assert.deepEqual(purchaseBreakdown(state.outcomes[0],state.purchaseItems[0]),{
  originalQuantity:'3',finalQuantity:'1',plannedTotalCents:3000,finalCostCents:1000,savedCents:2000
 });
 const small={purchaseItemId:itemId,intention:'buy_less',estimateCents:1000,reductionQuantity:'0.5'};
 assert.equal(purchaseBreakdown(small,{quantity:'2',id:itemId}).savedCents,250);
});
test('PRICING: Dont Buy saves full amount; planned purchase saves zero',()=>{
 let {state,itemId}=checkout();
 state=finish(state,itemId,'leave_for_now');
 assert.equal(purchaseBreakdown(state.outcomes[0],state.purchaseItems[0]).finalCostCents,0);
 assert.equal(unspent(state),3000);
 state=apply(state,'outcome_update',{itemId,intention:'still_want'});
 assert.equal(unspent(state),0);
 assert.equal(purchaseBreakdown(state.outcomes[0],state.purchaseItems[0]).finalQuantity,'2');
});
test('PRICING: editing final quantity replaces contribution instead of adding twice',()=>{
 let {state,itemId}=checkout();
 state=finish(state,itemId,'buy_less','1');
 assert.equal(unspent(state),1500);
 state=apply(state,'outcome_update',{itemId,reductionQuantity:'0.5'});
 assert.equal(unspent(state),750);
 state=apply(state,'outcome_update',{itemId,reductionQuantity:'1'});
 assert.equal(unspent(state),1500);
});
test('PRICE UI: new quantity defaults to total-price, but explicitly permits unit-price input',()=>{
 setLanguage('en');let {state}=checkout();
 const row={cartItemId:'new',name:'',quantity:'2',price:'30.00',priceMeaning:'total',note:''};
 const html=ghostScreen({s:state,r:{page:'ghost-add',id:'new'},e:{rows:[row]}});
 assert.match(html,/All items together \(total price\)/);
 assert.match(html,/One item \(unit price\)/);
 assert.match(html,/AUD \$30\.00/);
 const main=readFileSync(path,'utf8');assert.match(main,/priceMeaning:'total'/);
});
test('USAGE: user may enter 1.2 of 2 and preview shows 0.8 left for Ghosty; no invented fractions',()=>{
 setLanguage('en');
 const item={name:'Chips',quantity:'2',unit:'bags'};
 const preview=useAmountPreview(item,'1.2');
 assert.match(preview,/1\.2 bags/);assert.match(preview,/0\.8 bags/);
 assert.match(useAmountPreview(item,'3'),/cannot exceed/);
 assert.match(useAmountPreview(item,'-1'),/Enter a number/);
 assert.match(buyLessPreview({quantity:'2'},3000,'1'),/AUD \$15\.00/);
 assert.match(buyLessPreview({quantity:'2'},3000,'2'),/greater than 0/);
});
test('USAGE: Story screen contains a real input, preview and confirmation for each affected route',()=>{
 for(const route of ['amount','quantity']){
  let {state,itemId}=checkout();
  state=apply(state,'story_start',{itemId,source:'preset',template:route});
  const html=storyScreen({s:state,r:{page:'story',id:itemId},e:{fields:{useQuantity:'1.2'}}});
  assert.match(html,/data-form="story-use"/);
  assert.match(html,/id="usage-preview"/);
  assert.match(html,/0\.8/);
  assert.match(html,/Confirm my amount/);
  assert.doesNotMatch(html,/quarter|most of it/i);
 }
});
