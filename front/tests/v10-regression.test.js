import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seed} from '../js/data/seed.js';
import {reduceCommand,normalizeState} from '../js/domain/commands.js';
import {getOutcome,getStory,unspent} from '../js/domain/selectors.js';
import {storyScreen} from '../js/ui/screens/story.js';
import {foodScreen} from '../js/ui/screens/food.js';
import {ghostScreen} from '../js/ui/screens/ghost-v8.js';
import {setLanguage} from '../js/i18n/index.js?v=13.0';
let serial=0;
const run=(s,type,payload={})=>reduceCommand(s,{type,payload,operationId:'cream-'+(++serial),issuedAt:'2026-10-28T09:00:00.000Z'});
function cart(q='2',price='4.00'){
 let s=seed();s=run(s,'cart_save',{rows:[{cartItemId:'my-item',name:'Cookies',quantity:q,price,priceMeaning:'unit',note:'My note',asset:'bag'}]}).state;
 const result=run(s,'checkout');return {s:result.state,id:result.result.itemIds[0]};
}
const answer=(s,id,value)=>run(s,'story_answer',{itemId:id,value}).state;
const start=(s,id,template)=>run(s,'story_start',{itemId:id,source:'preset',template}).state;
const view=(s,id)=>({s,r:{page:'story',id},e:{fields:{finalQuantity:''}},played:false});
test('v10 approved palette has the exact six chosen colors and is loaded last',()=>{
 const css=readFileSync(new URL('../styles/cream-patisserie-v10.css',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const hex of ['#FFF9F6','#F5DCE5','#F8E2D8','#F4E7ED','#DDA5B6','#75646D'])assert.ok(css.includes(hex),hex);
 assert.ok(html.indexOf('refinement-v9.css')<html.indexOf('cream-patisserie-v10.css'));
 assert.match(css,/\.food-card\.colored-food\.dairy/);
});
test('legacy explicit samples are omitted without deleting real user-added food',()=>{
 const s=seed();s.foodItems=[{id:'old-test',name:'Oat milk',source:'sample'},
 {id:'genuine',name:'Oat milk',source:'manual',isStarred:false}];
 const result=normalizeState(s);assert.deepEqual(result.foodItems.map(x=>x.id),['genuine']);
});
test('source route back returns safely and removes obsolete answer branches',()=>{
 let {s,id}=cart();s=start(s,id,'amount');s=answer(s,id,'half');s=answer(s,id,'discard');
 assert.equal(getStory(s,id).currentStep,'ghost_activity');
 assert.equal(getStory(s,id).remainingQuantity,'1');
 let html=storyScreen(view(s,id));
 assert.match(html,/data-handover-food/);assert.match(html,/1/);assert.match(html,/data-handover-target/);
 assert.match(html,/data-action="story-back"/);
 s=run(s,'story_back',{itemId:id}).state;
 assert.equal(getStory(s,id).currentStep,'leftover_question');
 assert.equal(getStory(s,id).disposition,null);
 s=answer(s,id,'share');s=answer(s,id,'activity_done');
 assert.equal(getStory(s,id).recap.shared,'1');
 assert.equal(getStory(s,id).recap.discarded,'0');
 s=run(s,'story_back',{itemId:id}).state;
 assert.equal(getStory(s,id).currentStep,'ghost_activity');
 assert.equal(getStory(s,id).recap,null);
 assert.equal(getStory(s,id).activityDone,false);
});
test('amount story all-used shows no leftover draggable object',()=>{
 let {s,id}=cart();s=start(s,id,'amount');s=answer(s,id,'all');
 const html=storyScreen(view(s,id));assert.doesNotMatch(html,/data-handover-food/);
 assert.match(html,/data-value="activity_done"/);
});
test('share remaining portion does not transfer original quantity',()=>{
 let {s,id}=cart('4','2.00');s=start(s,id,'amount');s=answer(s,id,'half');s=answer(s,id,'share');
 const html=storyScreen(view(s,id));assert.match(html,/To Ghosty/);assert.match(html,/\b2\b/);
 assert.equal(getStory(s,id).usedQuantity,'2');assert.equal(getStory(s,id).sharedQuantity,'2');
});
test('each preset route retains separate question sequence and previous-step ability',()=>{
 const cases=[['amount','amount_question','half','leftover_question'],['quantity','quantity_question','qty:1','quantity_remainder'],['time','storage_place','fridge','storage_when']];
 for(const [route,initial,value,next] of cases){let {s,id}=cart();s=start(s,id,route);assert.equal(getStory(s,id).currentStep,initial);
  s=answer(s,id,value);assert.equal(getStory(s,id).currentStep,next);
  s=run(s,'story_back',{itemId:id}).state;assert.equal(getStory(s,id).currentStep,initial);
  assert.equal(getStory(s,id).answers.length,0);
 }
});
test('story result and final decision backtracking invalidates edited outcome',()=>{
 let {s,id}=cart();s=start(s,id,'time');for(const v of ['fridge','soon','save','activity_done'])s=answer(s,id,v);
 assert.equal(getStory(s,id).currentStep,'recap');s=run(s,'story_continue',{itemId:id}).state;
 assert.equal(getStory(s,id).currentStep,'intention');
 s=run(s,'outcome_update',{itemId:id,intention:'buy_less',reductionQuantity:'1'}).state;
 s=run(s,'story_back',{itemId:id}).state;
 assert.equal(getStory(s,id).currentStep,'recap');assert.equal(getOutcome(s,id).intention,null);
 assert.equal(getOutcome(s,id).reductionQuantity,null);
});
test('no duplicate savings; actual unit price and purchase quantities are consistent',()=>{
 let {s,id}=cart('5','4.00');s=start(s,id,'amount');s=answer(s,id,'all');s=answer(s,id,'activity_done');
 s=run(s,'story_continue',{itemId:id}).state;
 s=run(s,'outcome_update',{itemId:id,intention:'buy_less',reductionQuantity:'3'}).state;
 s=run(s,'story_finish',{itemId:id}).state;
 assert.equal(s.purchaseItems[0].estimateCents,2000);
 assert.equal(unspent(s),1200);
 s=run(s,'outcome_update',{itemId:id,intention:'still_want'}).state;
 assert.equal(unspent(s),0);
 s=run(s,'outcome_update',{itemId:id,intention:'leave_for_now'}).state;
 assert.equal(unspent(s),2000);
});
test('new food, receipt and cart do not have default data, and language/date UI is explicit',()=>{
 const s=seed();setLanguage('en');
 const food=foodScreen({s,r:{page:'food'},filters:{search:'',category:'',status:'available'}});
 assert.match(food,/No food added yet/);assert.doesNotMatch(food,/Oat milk/);
 const cartHTML=ghostScreen({s,r:{page:'cart'},e:{rows:[]}});
 assert.match(cartHTML,/Your cart is empty/);assert.doesNotMatch(cartHTML,/GB-P0[1-8]/);
 const dateForm=foodScreen({s,r:{page:'food-new'},e:{fields:{name:'',quantity:'1',unit:'',category:'other',recordedDate:''}}});
 assert.match(dateForm,/placeholder="YYYY-MM-DD"/);
 assert.doesNotMatch(dateForm,/年\/月\/日/);
});
