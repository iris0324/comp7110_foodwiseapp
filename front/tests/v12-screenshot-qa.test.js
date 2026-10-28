import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {seed} from '../js/data/seed.js';
import {reduceCommand} from '../js/domain/commands.js';
import {getStory,getOutcome,unspent} from '../js/domain/selectors.js';
import {storyScreen} from '../js/ui/screens/story.js';
import {foodScreen} from '../js/ui/screens/food.js';
import {ghostScreen} from '../js/ui/screens/ghost-v8.js';
import {authScreen} from '../js/ui/screens/auth.js';
import {setLanguage} from '../js/i18n/index.js?v=13.0';
import {cmp} from '../js/core/values.js';
const source=x=>readFileSync(resolve(import.meta.dirname,'..',x),'utf8');
let serial=0;
const act=(s,type,payload={})=>reduceCommand(s,{type,payload,operationId:'v12-'+ ++serial,issuedAt:'2026-10-28T10:00:00.000Z'}).state;
const checkout=(number='1')=>{
 let s=seed();s=act(s,'cart_save',{rows:[{cartItemId:'one',name:'chips',quantity:number,price:'4.00',priceMeaning:'unit',asset:'bag'}]});
 s=act(s,'checkout');return {s,id:s.purchaseItems[0].id};
};
const render=(s,id,played=false)=>storyScreen({s,r:{page:'story',id},e:{fields:{useQuantity:''}},played});

test('FE-106: deleting exactly one user-created food is permanent within state, without Past Records',()=>{
 let s=seed();s=act(s,'food_add',{fields:{name:'my chips',quantity:'1',category:'other'}});
 s=act(s,'food_add',{fields:{name:'my milk',quantity:'2',category:'dairy'}});
 const id=s.foodItems[0].id;s=act(s,'food_delete',{id});
 assert.equal(s.foodItems.length,1);assert.equal(s.foodItems[0].name,'my milk');
 assert.equal(s.foodEvents.length,0);assert.equal(s.foodItems.some(f=>f.id===id),false);
 assert.match(source('js/main.js'),/confirm-food-delete/);
 assert.match(source('js/ui/screens/food.js'),/data-action="food-delete"/);
});
test('FE-106: past-item deletion is separate from used-up/discarded history',()=>{
 let s=seed();s=act(s,'food_add',{fields:{name:'past test',quantity:'1',category:'other'}});
 let id=s.foodItems[0].id;s=act(s,'food_end',{id,status:'discarded'});
 assert.equal(s.foodEvents.length,1);
 s=act(s,'food_delete',{id});
 assert.equal(s.foodItems.length,0);assert.equal(s.foodEvents.length,0);
});
test('FE-113: quantity route exposes none, half and all for single item plus free input',()=>{
 let {s,id}=checkout('1');s=act(s,'story_start',{itemId:id,template:'quantity',source:'preset'});
 setLanguage('en');const html=render(s,id);
 assert.match(html,/data-value="qty:0"/);assert.match(html,/data-value="qty:0.5"/);
 assert.match(html,/data-value="qty:1"/);assert.match(html,/data-form="story-use"/);
 s=act(s,'story_answer',{itemId:id,value:'qty:0.5'});
 assert.equal(getStory(s,id).remainingQuantity,'0.5');
 assert.equal(getStory(s,id).usedQuantity,'0.5');
});
test('FE-113: amount story supports existing half and arbitrary user entered fractions without preset quarter choices',()=>{
 let {s,id}=checkout('1');s=act(s,'story_start',{itemId:id,template:'amount',source:'preset'});
 const html=render(s,id);assert.match(html,/data-value="half"/);assert.match(html,/data-form="story-use"/);
 assert.doesNotMatch(html,/data-value="quarter"/);
 s=act(s,'story_answer',{itemId:id,value:'amount:0.3'});
 assert.equal(getStory(s,id).usedQuantity,'0.3');assert.equal(getStory(s,id).remainingQuantity,'0.7');
 assert.throws(()=>act(s,'story_answer',{itemId:id,value:'amount:1.2'}));
});
test('FE-110: handover uses left portion, only one large Ghosty and no duplicate stage',()=>{
 let {s,id}=checkout('1');s=act(s,'story_start',{itemId:id,template:'amount',source:'preset'});
 s=act(s,'story_answer',{itemId:id,value:'half'});s=act(s,'story_answer',{itemId:id,value:'discard'});
 const html=render(s,id);assert.match(html,/To Ghosty/);assert.match(html,/0\.5/);
 assert.equal((html.match(/class="handover-ghost"/g)||[]).length,1);
 assert.doesNotMatch(html,/class="ghost-dialogue/);
 assert.match(html,/data-handover-target/);assert.match(html,/data-handover-food/);
 const after=render(s,id,true);assert.match(after,/Into the bin/);
 assert.match(after,/data-animated-result disabled/);
 assert.match(after,/ghosty-carry/);
});
test('FE-114: share shows the transferred half only and distinct destination',()=>{
 let {s,id}=checkout('1');s=act(s,'story_start',{itemId:id,template:'amount',source:'preset'});
 s=act(s,'story_answer',{itemId:id,value:'half'});s=act(s,'story_answer',{itemId:id,value:'share'});
 assert.equal(getStory(s,id).sharedQuantity,'0.5');
 const html=render(s,id,true);
 assert.match(html,/To Ghosty/);assert.match(html,/0\.5/);assert.match(html,/Shared with someone/);
 assert.match(html,/data-disposition="share"/);
 s=act(s,'story_answer',{itemId:id,value:'activity_done'});
 assert.equal(getStory(s,id).recap.shared,'0.5');
 assert.equal(getStory(s,id).recap.discarded,'0');
});
test('FE-110: if all was used, Ghosty does not receive the original quantity',()=>{
 let {s,id}=checkout('1');s=act(s,'story_start',{itemId:id,template:'amount',source:'preset'});
 s=act(s,'story_answer',{itemId:id,value:'all'});
 assert.equal(getStory(s,id).remainingQuantity,'0');
 const html=render(s,id);
 assert.doesNotMatch(html,/data-handover-food/);assert.match(html,/Nothing left to hand over/);
});
test('FE-113: previous step clears a stale handover branch and re-computes',()=>{
 let {s,id}=checkout('1');s=act(s,'story_start',{itemId:id,template:'quantity',source:'preset'});
 s=act(s,'story_answer',{itemId:id,value:'qty:0.5'});s=act(s,'story_answer',{itemId:id,value:'discard'});
 s=act(s,'story_back',{itemId:id});assert.equal(getStory(s,id).currentStep,'quantity_remainder');
 s=act(s,'story_back',{itemId:id});assert.equal(getStory(s,id).currentStep,'quantity_question');
 s=act(s,'story_answer',{itemId:id,value:'qty:1'});
 assert.equal(getStory(s,id).remainingQuantity,'0');assert.doesNotMatch(render(s,id),/data-handover-food/);
});
test('FE-111: result keeps a larger item strip and Ghosty result art',()=>{
 let {s,id}=checkout('1');s=act(s,'story_start',{itemId:id,template:'amount',source:'preset'});
 s=act(s,'story_answer',{itemId:id,value:'half'});s=act(s,'story_answer',{itemId:id,value:'discard'});s=act(s,'story_answer',{itemId:id,value:'activity_done'});
 const html=render(s,id);assert.match(html,/ghost-result-visual/);assert.match(html,/Ghosty put the remaining/);assert.match(html,/Previous Step/);
 assert.match(html,/chips/);
});
test('FE-105/107/108/109: UI patches exist, image exists, no green decoration in final stylesheet',()=>{
 setLanguage('en');assert.match(authScreen('create-account'),/auth-subnav-label/);
 assert.match(ghostScreen({s:seed(),r:{page:'ghost-home'}}),/hero-icon/);
 assert.ok(existsSync(resolve(import.meta.dirname,'../assets/icons/bag.svg')));
 const css=source('styles/cream-v12-qa.css');for(const x of ['.chips{display:grid','.field select{appearance:none','.hero-icon{display:grid','.ghost-home-footer h2','.ghost-result-visual','.auth-subnav'])assert.ok(css.includes(x),x);
 for(const old of ['#438c64','#45684b','#537358','#37684e','#59aa74','#eefaf3'])assert.ok(!css.toLowerCase().includes(old),old);
});
test('FE-112: seed empty and no bulk-clear button created in v12',()=>{
 const s=seed();for(const key of ['foodItems','foodEvents','receiptImports','cart','drafts','purchases','stories','outcomes'])assert.deepEqual(s[key],[]);
 assert.doesNotMatch(source('js/ui/screens/food.js'),/clear-test-data/i);
 assert.doesNotMatch(source('styles/cream-v12-qa.css'),/clear-test-data/i);
});
